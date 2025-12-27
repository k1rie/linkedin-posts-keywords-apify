require('dotenv').config();
const hubspotService = require('../services/hubspotService');
const loggerService = require('../services/loggerService');

/**
 * Script de prueba para verificar creación de deals en HubSpot
 */
const testHubSpotDeal = async () => {
  try {
    loggerService.info('=== TEST DE CREACIÓN DE DEAL EN HUBSPOT ===\n');

    // Verificar configuración
    if (!process.env.HUBSPOT_TOKEN) {
      loggerService.error('HUBSPOT_TOKEN no está configurado en .env');
      process.exit(1);
    }

    loggerService.info('✓ HUBSPOT_TOKEN configurado');
    loggerService.info(`✓ HUBSPOT_DEAL_STAGE: ${process.env.HUBSPOT_DEAL_STAGE || 'appointmentscheduled'}`);
    loggerService.info(`✓ HUBSPOT_PIPELINE: ${process.env.HUBSPOT_PIPELINE || 'default'}\n`);

    // Crear datos de prueba simulando un post de Apify
    const testPostData = {
      url: 'https://www.linkedin.com/posts/test-post-123456',
      text: 'Este es un post de prueba para verificar que se crea correctamente el deal en HubSpot. Contiene información relevante sobre b2b sales.',
      author: 'Juan Pérez',
      profileUrl: 'https://www.linkedin.com/in/juan-perez',
      createdAt: new Date().toISOString(),
      reactions: null,
      comments: null,
      keyword: 'b2b sales',
      rawData: {
        author: {
          name: 'Juan Pérez',
          linkedinUrl: 'https://www.linkedin.com/in/juan-perez',
          location: 'Ciudad de México, México'
        }
      }
    };

    const testKeyword = 'b2b sales';

    loggerService.info('📋 Datos de prueba:');
    loggerService.info(`  Keyword: ${testKeyword}`);
    loggerService.info(`  URL del post: ${testPostData.url}`);
    loggerService.info(`  Autor: ${testPostData.author}`);
    loggerService.info(`  URL del perfil: ${testPostData.profileUrl}`);
    loggerService.info(`  Contenido: ${testPostData.text.substring(0, 50)}...\n`);

    // Intentar crear el deal
    loggerService.info('→ Creando deal en HubSpot...\n');
    const hubspotResult = await hubspotService.createDealForPost(testPostData, testKeyword);

    if (hubspotResult) {
      if (hubspotResult.duplicate) {
        loggerService.warn('⚠️  El deal ya existe (duplicado detectado)');
        loggerService.info('Esto significa que la detección de duplicados está funcionando correctamente.');
      } else {
        loggerService.success('✓ Deal creado exitosamente en HubSpot!\n');
        
        loggerService.info('📊 Información del Deal creado:');
        loggerService.info(`  Deal ID: ${hubspotResult.id}`);
        loggerService.info(`  Nombre: ${hubspotResult.properties?.dealname || 'N/A'}`);
        loggerService.info(`  Etapa: ${hubspotResult.properties?.dealstage || 'N/A'}`);
        loggerService.info(`  Pipeline: ${hubspotResult.properties?.pipeline || 'N/A'}`);
        loggerService.info(`  Monto: ${hubspotResult.properties?.amount || '0'} ${hubspotResult.properties?.deal_currency_code || 'MXN'}`);
        
        if (hubspotResult.properties?.description) {
          loggerService.info(`\n  Descripción (primeros 200 caracteres):`);
          loggerService.info(`  ${hubspotResult.properties.description.substring(0, 200)}...`);
        }

        // Mostrar propiedades personalizadas si existen
        loggerService.info(`\n  Propiedades personalizadas:`);
        loggerService.info(`  - linkedin_post_url: ${hubspotResult.properties?.linkedin_post_url || 'N/A'}`);
        loggerService.info(`  - linkedin_profile_url: ${hubspotResult.properties?.linkedin_profile_url || 'N/A'}`);
        loggerService.info(`  - linkedin_author: ${hubspotResult.properties?.linkedin_author || 'N/A'}`);
        loggerService.info(`  - linkedin_keyword: ${hubspotResult.properties?.linkedin_keyword || 'N/A'}`);

        loggerService.info(`\n  Estructura completa del deal:`);
        loggerService.info(JSON.stringify(hubspotResult, null, 2));

        loggerService.info(`\n🔗 Ver deal en HubSpot:`);
        loggerService.info(`  https://app.hubspot.com/deals/${hubspotResult.id}`);
      }
    } else {
      loggerService.error('✗ No se pudo crear el deal en HubSpot');
      loggerService.error('Revisa los logs anteriores para ver el error específico.');
    }

    loggerService.info('\n=== TEST COMPLETADO ===');
    
  } catch (error) {
    loggerService.error('Error en test:', error);
    if (error.response) {
      loggerService.error(`Status: ${error.response.status}`);
      loggerService.error(`Respuesta: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    console.error('Stack trace:', error.stack);
  }
};

// Ejecutar test
testHubSpotDeal().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});

