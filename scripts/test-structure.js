require('dotenv').config();
const clickupService = require('../services/clickupService');
const apifyService = require('../services/apifyService');
const hubspotService = require('../services/hubspotService');
const loggerService = require('../services/loggerService');

/**
 * Script de prueba para ver la estructura real de los datos
 * Procesa solo 1 keyword para debugging
 */
const testStructure = async () => {
  try {
    loggerService.info('=== TEST DE ESTRUCTURA DE DATOS ===\n');

    // 1. Obtener keywords de ClickUp (solo 1 para prueba)
    loggerService.info('1. Obteniendo keywords de ClickUp...');
    const keywords = await clickupService.getKeywordsFromClickUp();
    
    if (keywords.length === 0) {
      loggerService.error('No se encontraron keywords en ClickUp');
      return;
    }

    // Limitar a solo 1 keyword para prueba
    const testKeyword = keywords[0];
    loggerService.info(`\n📋 Keyword a procesar: "${testKeyword.keyword}"`);
    
    // Mostrar estructura de ClickUp
    loggerService.info('\n=== ESTRUCTURA DE KEYWORD DESDE CLICKUP ===');
    loggerService.info(`Tipo: ${typeof testKeyword}`);
    loggerService.info(`Estructura completa:`, JSON.stringify(testKeyword, null, 2));
    loggerService.info(`Keyword: ${testKeyword.keyword} (tipo: ${typeof testKeyword.keyword})`);
    loggerService.info(`Task ID: ${testKeyword.taskId} (tipo: ${typeof testKeyword.taskId})`);

    // 2. Llamar a Apify con la keyword
    loggerService.info(`\n=== LLAMANDO A APIFY CON KEYWORD: "${testKeyword.keyword}" ===`);
    
    const apifyResults = await apifyService.searchPostsByKeyword(testKeyword.keyword);
    
    // Mostrar estructura de Apify
    loggerService.info('\n=== ESTRUCTURA DE APIFY ===');
    loggerService.info(`Total items: ${apifyResults.totalItems}`);
    loggerService.info(`Posts encontrados: ${apifyResults.posts.length}`);
    
    if (apifyResults.posts.length > 0) {
      loggerService.info(`\n--- Primer Post de Apify ---`);
      const firstPost = apifyResults.posts[0];
      loggerService.info(`Tipo: ${typeof firstPost}`);
      loggerService.info(`Estructura completa:`, JSON.stringify(firstPost, null, 2));
      loggerService.info(`URL: ${firstPost.url} (tipo: ${typeof firstPost.url})`);
      loggerService.info(`Author: ${firstPost.author} (tipo: ${typeof firstPost.author})`);
      loggerService.info(`Profile URL: ${firstPost.profileUrl} (tipo: ${typeof firstPost.profileUrl})`);
      loggerService.info(`Text: ${firstPost.text ? firstPost.text.substring(0, 100) + '...' : 'N/A'}`);
      
      // Mostrar rawData si existe
      if (firstPost.rawData) {
        loggerService.info(`\n--- Raw Data del Post ---`);
        loggerService.info(`Estructura:`, JSON.stringify(firstPost.rawData, null, 2));
        
        // Extraer información del autor del rawData
        if (firstPost.rawData.author) {
          loggerService.info(`\n--- Autor del Raw Data ---`);
          loggerService.info(`Tipo: ${typeof firstPost.rawData.author}`);
          loggerService.info(`Estructura:`, JSON.stringify(firstPost.rawData.author, null, 2));
        }
      }
    }

    // 3. Probar guardado en HubSpot (solo el primer post)
    if (apifyResults.posts.length > 0) {
      const firstPost = apifyResults.posts[0];
      
      loggerService.info('\n=== PRUEBA DE GUARDADO EN HUBSPOT ===');
      loggerService.info(`Keyword: ${testKeyword.keyword}`);
      loggerService.info(`URL del post: ${firstPost.url}`);
      loggerService.info(`Author: ${firstPost.author || 'N/A'}`);
      loggerService.info(`Profile URL: ${firstPost.profileUrl || 'N/A'}`);
      
      // Intentar guardar en HubSpot
      loggerService.info('\n→ Guardando en HubSpot...');
      const hubspotResult = await hubspotService.createDealForPost(firstPost, testKeyword.keyword);
      
      if (hubspotResult) {
        loggerService.success(`✓ Deal creado en HubSpot: ${hubspotResult.id}`);
        loggerService.info(`Resultado:`, JSON.stringify(hubspotResult, null, 2));
      } else {
        loggerService.warn('No se pudo crear el deal en HubSpot');
      }
    }

    loggerService.info('\n=== TEST COMPLETADO ===');
    
  } catch (error) {
    loggerService.error('Error en test:', error);
    console.error('Stack trace:', error.stack);
  }
};

// Ejecutar test
testStructure().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});

