const { ApifyClient } = require('apify-client');
const loggerService = require('./loggerService');

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_ACTOR_ID = process.env.APIFY_ACTOR_ID || 'buIWk2uOUzTmcLsuB';

// Initialize the ApifyClient with API token
let client = null;

const getClient = () => {
  if (!client) {
    if (!APIFY_API_TOKEN) {
      throw new Error('APIFY_API_TOKEN no está configurado en .env');
    }
    client = new ApifyClient({
      token: APIFY_API_TOKEN,
    });
  }
  return client;
};

/**
 * Busca posts de LinkedIn usando keywords con Apify
 * @param {string[]} keywords - Array de keywords para buscar
 * @returns {Promise<Object>} - Resultados de la búsqueda
 */
const searchPostsByKeywords = async (keywords) => {
  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    throw new Error('keywords debe ser un array no vacío');
  }

  try {
    loggerService.info(`\n=== INICIANDO BÚSQUEDA CON APIFY ===`);
    loggerService.info(`Actor ID: ${APIFY_ACTOR_ID}`);
    loggerService.info(`Keywords a buscar: ${keywords.length}`);
    loggerService.info(`Keywords: ${keywords.join(', ')}`);
    
    const apifyClient = getClient();

    // Preparar input del Actor
    const input = {
      searchQueries: keywords,
      maxPosts: parseInt(process.env.MAX_POSTS_PER_KEYWORD || '20'),
      profileScraperMode: process.env.PROFILE_SCRAPER_MODE || 'short',
      startPage: parseInt(process.env.START_PAGE || '1'),
      scrapeReactions: process.env.SCRAPE_REACTIONS === 'true',
      maxReactions: parseInt(process.env.MAX_REACTIONS || '5'),
      scrapeComments: process.env.SCRAPE_COMMENTS === 'true',
      includeReposts: process.env.INCLUDE_REPOSTS === 'true', // Excluir reposts por defecto
      // Filtrar solo posts de México
      author_location: process.env.AUTHOR_LOCATION || 'Mexico'
    };

    loggerService.debug('Input del Actor:', JSON.stringify(input, null, 2));

    // Ejecutar el Actor y esperar a que termine
    loggerService.info('Ejecutando Actor de Apify...');
    const run = await apifyClient.actor(APIFY_ACTOR_ID).call(input);

    loggerService.info(`Actor ejecutado. Run ID: ${run.id}`);
    loggerService.info(`Estado: ${run.status}`);

    // Obtener resultados del dataset
    loggerService.info('Obteniendo resultados del dataset...');
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

    loggerService.success(`Resultados obtenidos: ${items.length} items`);
    
    // Procesar resultados - Filtrar solo posts de México
    const posts = [];
    let mexicoPosts = 0;
    let filteredPosts = 0;
    
    for (const item of items) {
      // Verificar si el post es de México
      let isFromMexico = false;
      
      // Verificar ubicación del autor en diferentes campos
      if (item.author) {
        if (typeof item.author === 'object' && item.author !== null) {
          const location = item.author.location || item.author.country || item.author.info || '';
          const locationStr = typeof location === 'string' ? location.toLowerCase() : '';
          isFromMexico = locationStr.includes('méxico') || locationStr.includes('mexico') || 
                        locationStr.includes('mex') || locationStr.includes('cdmx');
        }
      }
      
      // También verificar en rawData
      if (!isFromMexico && item.rawData && item.rawData.author) {
        const location = item.rawData.author.location || item.rawData.author.country || item.rawData.author.info || '';
        const locationStr = typeof location === 'string' ? location.toLowerCase() : '';
        isFromMexico = locationStr.includes('méxico') || locationStr.includes('mexico') || 
                      locationStr.includes('mex') || locationStr.includes('cdmx');
      }
      
      // Si no se puede determinar la ubicación, incluir el post (el filtro de Apify debería haberlo filtrado)
      // Pero si hay información de ubicación y NO es México, filtrarlo
      if (item.author && typeof item.author === 'object' && item.author !== null) {
        const location = item.author.location || item.author.country || item.author.info || '';
        if (location && typeof location === 'string') {
          const locationStr = location.toLowerCase();
          const isNotMexico = locationStr && !locationStr.includes('méxico') && 
                             !locationStr.includes('mexico') && !locationStr.includes('mex') && 
                             !locationStr.includes('cdmx');
          if (isNotMexico) {
            filteredPosts++;
            continue; // Saltar este post
          }
        }
      }
      
      // Extraer información del autor
      let authorName = null;
      let profileUrl = null;
      
      if (item.author) {
        if (typeof item.author === 'string') {
          authorName = item.author;
        } else if (typeof item.author === 'object' && item.author !== null) {
          authorName = item.author.name || item.author.authorName || null;
          profileUrl = item.author.linkedinUrl || item.author.url || null;
        }
      }

      // Extraer URL del post
      const postUrl = item.url || item.postUrl || item.linkedinUrl || null;
      
      if (postUrl) {
        if (isFromMexico) {
          mexicoPosts++;
        }
        posts.push({
          url: postUrl,
          text: item.text || item.content || item.description || '',
          author: authorName,
          profileUrl: profileUrl,
          createdAt: item.createdAt || item.date || item.publishedAt || null,
          reactions: item.reactions || item.likes || null,
          comments: item.comments || null,
          keyword: item.searchQuery || item.keyword || keywords[0], // Asociar keyword
          location: isFromMexico ? 'Mexico' : 'Unknown',
          rawData: item
        });
      }
    }
    
    loggerService.info(`Posts filtrados (no México): ${filteredPosts}`);
    loggerService.info(`Posts confirmados de México: ${mexicoPosts}`);

    loggerService.info(`\n=== RESUMEN DE BÚSQUEDA ===`);
    loggerService.info(`Total posts encontrados: ${posts.length}`);
    
    return {
      success: true,
      runId: run.id,
      status: run.status,
      totalItems: items.length,
      posts: posts
    };
  } catch (error) {
    loggerService.error('Error en búsqueda con Apify:', error);
    throw new Error(`Error en búsqueda con Apify: ${error.message}`);
  }
};

/**
 * Busca posts para una sola keyword
 * @param {string} keyword - Keyword para buscar
 * @returns {Promise<Object>} - Resultados de la búsqueda
 */
const searchPostsByKeyword = async (keyword) => {
  const results = await searchPostsByKeywords([keyword]);
  return results;
};

module.exports = {
  searchPostsByKeywords,
  searchPostsByKeyword
};

