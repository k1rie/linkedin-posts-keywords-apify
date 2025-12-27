const apifyService = require('../services/apifyService');
const clickupService = require('../services/clickupService');
const rateLimitService = require('../services/rateLimitService');
const loggerService = require('../services/loggerService');

/**
 * Ejecutar scraping programado
 */
const runScheduledScrape = async () => {
  try {
    // Verificar rate limit
    const canProcess = await rateLimitService.canProcessMore();
    if (!canProcess) {
      loggerService.warn('Límite diario alcanzado. No se procesarán más keywords hoy.');
      return {
        success: false,
        error: 'Daily limit reached',
        stats: await rateLimitService.getStats()
      };
    }

    // Obtener keywords desde ClickUp
    loggerService.info('Obteniendo keywords desde ClickUp...');
    const keywords = await clickupService.getKeywordsFromClickUp();
    
    if (keywords.length === 0) {
      loggerService.warn('No se encontraron keywords en ClickUp');
      return {
        success: false,
        error: 'No keywords found in ClickUp'
      };
    }

    // Obtener límite restante
    const stats = await rateLimitService.getStats();
    const keywordsToProcess = keywords.slice(0, stats.remaining);
    
    loggerService.info(`Procesando ${keywordsToProcess.length} keywords (${stats.remaining} restantes del límite diario)`);

    // Procesar cada keyword secuencialmente: Apify -> ClickUp
    const results = [];
    let processedCount = 0;
    let keywordsProcessed = 0;

    for (let i = 0; i < keywordsToProcess.length; i++) {
      const keywordData = keywordsToProcess[i];
      const keyword = keywordData.keyword;

      try {
        loggerService.info(`\n[${i + 1}/${keywordsToProcess.length}] Procesando keyword: "${keyword}"`);
        
        // 1. Llamar a Apify para buscar posts con esta keyword
        loggerService.info(`  → Buscando posts con Apify...`);
        const apifyResult = await apifyService.searchPostsByKeyword(keyword);
        
        if (!apifyResult || !apifyResult.posts || apifyResult.posts.length === 0) {
          loggerService.warn(`  ⚠️  No se encontraron posts para "${keyword}"`);
          results.push({
            keyword: keyword,
            success: false,
            error: 'No posts found',
            postsProcessed: 0
          });
          continue;
        }

        loggerService.info(`  ✓ Apify retornó ${apifyResult.posts.length} post(s)`);

        // 2. Guardar cada post en ClickUp secuencialmente
        let postsSaved = 0;
        let postsDuplicated = 0;
        let postsFailed = 0;

        for (const post of apifyResult.posts) {
          try {
            loggerService.info(`  → Guardando post en ClickUp: ${post.url.substring(0, 50)}...`);
            const clickupResult = await clickupService.savePostToClickUp(post, keyword);

            if (clickupResult && !clickupResult.duplicate) {
              postsSaved++;
              loggerService.success(`  ✓ Post guardado en ClickUp (Task ID: ${clickupResult.id})`);
            } else if (clickupResult && clickupResult.duplicate) {
              postsDuplicated++;
              loggerService.warn(`  ⏭️  Post duplicado, saltado`);
            }

            results.push({
              keyword: keyword,
              postUrl: post.url,
              author: post.author,
              profileUrl: post.profileUrl,
              success: clickupResult && !clickupResult.duplicate,
              clickupTaskId: clickupResult?.id || null,
              duplicate: clickupResult?.duplicate || false
            });
          } catch (error) {
            postsFailed++;
            loggerService.error(`  ✗ Error guardando post en ClickUp: ${error.message}`);
            results.push({
              keyword: keyword,
              postUrl: post.url,
              success: false,
              error: error.message
            });
          }
        }

        processedCount += postsSaved;
        keywordsProcessed++;

        loggerService.info(`  Resumen keyword: ${postsSaved} guardados, ${postsDuplicated} duplicados, ${postsFailed} fallidos`);

      } catch (error) {
        loggerService.error(`  ✗ Error procesando keyword "${keyword}":`, error);
        results.push({
          keyword: keyword,
          success: false,
          error: error.message,
          postsProcessed: 0
        });
      }

      // Pequeño delay entre keywords para no sobrecargar las APIs
      if (i < keywordsToProcess.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Incrementar contador de rate limit
    await rateLimitService.incrementCount(keywordsProcessed);

    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      duplicates: results.filter(r => r.duplicate).length,
      keywordsProcessed: keywordsProcessed
    };

    loggerService.info('\n=== RESUMEN ===');
    loggerService.info(`Total posts procesados: ${summary.total}`);
    loggerService.info(`Exitosos: ${summary.successful}`);
    loggerService.info(`Fallidos: ${summary.failed}`);
    loggerService.info(`Duplicados: ${summary.duplicates}`);
    loggerService.info(`Keywords procesadas: ${summary.keywordsProcessed}`);

    return {
      success: true,
      results,
      summary,
      stats: await rateLimitService.getStats()
    };
  } catch (error) {
    loggerService.error('Error en runScheduledScrape:', error);
    throw error;
  }
};

/**
 * Buscar posts por keywords (endpoint API)
 */
const searchPosts = async (req, res) => {
  try {
    const { keywords, useClickUp } = req.body;

    let keywordsToSearch = [];

    // Si useClickUp está habilitado, obtener keywords desde ClickUp
    if (useClickUp && process.env.CLICKUP_API_TOKEN) {
      loggerService.info('Obteniendo keywords desde ClickUp...');
      try {
        const clickupKeywords = await clickupService.getKeywordsFromClickUp();
        keywordsToSearch = clickupKeywords.map(k => k.keyword);
        loggerService.info(`Keywords obtenidas desde ClickUp: ${keywordsToSearch.length}`);
      } catch (error) {
        loggerService.error('Error obteniendo keywords desde ClickUp', error);
        return res.status(500).json({ 
          error: `Error obteniendo keywords desde ClickUp: ${error.message}` 
        });
      }
    } else {
      // Usar keywords del request
      if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
        return res.status(400).json({ 
          error: 'keywords debe ser un array no vacío o useClickUp debe estar habilitado' 
        });
      }
      keywordsToSearch = keywords;
    }

    // Verificar rate limit
    const canProcess = await rateLimitService.canProcessMore();
    if (!canProcess) {
      const stats = await rateLimitService.getStats();
      return res.status(429).json({ 
        error: 'Daily limit reached',
        stats 
      });
    }

    // Limitar keywords según rate limit
    const stats = await rateLimitService.getStats();
    const keywordsToProcess = keywordsToSearch.slice(0, stats.remaining);
    
    if (keywordsToProcess.length === 0) {
      return res.status(429).json({ 
        error: 'No remaining keywords for today',
        stats 
      });
    }

    loggerService.info(`Procesando ${keywordsToProcess.length} keywords`);

    // Buscar posts usando Apify
    const apifyResults = await apifyService.searchPostsByKeywords(keywordsToProcess);

    // Procesar resultados y crear tareas en ClickUp
    const results = [];
    let keywordsProcessed = 0;

    for (const post of apifyResults.posts) {
      const keyword = post.keyword || keywordsToProcess[0];
      
      try {
        loggerService.info(`  → Guardando post en ClickUp: ${post.url.substring(0, 50)}...`);
        const clickupResult = await clickupService.savePostToClickUp(post, keyword);

        results.push({
          keyword: keyword,
          postUrl: post.url,
          author: post.author,
          profileUrl: post.profileUrl,
          success: clickupResult && !clickupResult.duplicate,
          clickupTaskId: clickupResult?.id || null,
          duplicate: clickupResult?.duplicate || false
        });

        if (clickupResult && !clickupResult.duplicate) {
          loggerService.success(`  ✓ Post guardado en ClickUp (Task ID: ${clickupResult.id})`);
        } else if (clickupResult && clickupResult.duplicate) {
          loggerService.warn(`  ⏭️  Post duplicado, saltado`);
        }
      } catch (error) {
        loggerService.error(`  ✗ Error guardando post en ClickUp: ${error.message}`);
        results.push({
          keyword: keyword,
          postUrl: post.url,
          success: false,
          error: error.message
        });
      }
    }

    // Incrementar contador de rate limit
    await rateLimitService.incrementCount(keywordsToProcess.length);

    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      duplicates: results.filter(r => r.duplicate).length,
      keywordsProcessed: keywordsToProcess.length
    };

    res.json({ 
      success: true,
      results,
      summary,
      stats: await rateLimitService.getStats()
    });
  } catch (error) {
    loggerService.error('Error in searchPosts', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
};

module.exports = {
  searchPosts,
  runScheduledScrape
};

