require('dotenv').config();
const axios = require('axios');

const HUBSPOT_TOKEN = process.env.HUBSPOT_TOKEN;
const HUBSPOT_BASE_URL = 'https://api.hubapi.com';

/**
 * Script para obtener información de un deal específico
 */
const getDealInfo = async (dealId) => {
  if (!HUBSPOT_TOKEN) {
    console.error('HUBSPOT_TOKEN no está configurado en .env');
    process.exit(1);
  }

  if (!dealId) {
    console.error('Por favor proporciona un Deal ID');
    console.error('Uso: node scripts/get-deal-info.js <DEAL_ID>');
    process.exit(1);
  }

  try {
    console.log(`🔍 Obteniendo información del deal: ${dealId}\n`);

    // Obtener todas las propiedades necesarias
    const propertiesList = [
      'dealname',
      'description',
      'amount',
      'deal_currency_code',
      'dealstage',
      'pipeline',
      'createdate',
      'hs_createdate',
      'hs_lastmodifieddate',
      'closedate'
    ].join(',');

    const response = await axios.get(
      `${HUBSPOT_BASE_URL}/crm/v3/objects/deals/${dealId}`,
      {
        headers: {
          'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params: {
          properties: propertiesList
        }
      }
    );

    const deal = response.data;
    const props = deal.properties || {};

    // Obtener nombres del pipeline y stage
    let pipelineName = 'N/A';
    let stageName = 'N/A';

    try {
      const pipelinesResponse = await axios.get(
        `${HUBSPOT_BASE_URL}/crm/v3/pipelines/deals`,
        {
          headers: {
            'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const pipelines = pipelinesResponse.data.results || [];
      
      for (const pipeline of pipelines) {
        if (pipeline.id === props.pipeline) {
          pipelineName = pipeline.label;
          
          if (pipeline.stages) {
            const stage = pipeline.stages.find(s => s.id === props.dealstage);
            if (stage) {
              stageName = stage.label;
            }
          }
          break;
        }
      }
    } catch (error) {
      console.log('⚠️  No se pudieron obtener nombres de pipeline/stage');
    }

    console.log('='.repeat(70));
    console.log('📊 INFORMACIÓN DEL DEAL');
    console.log('='.repeat(70));
    
    console.log(`\n🆔 Deal ID: ${deal.id}`);
    console.log(`📝 Nombre: ${props.dealname || 'N/A'}`);
    console.log(`💰 Monto: ${props.amount || '0'} ${props.deal_currency_code || 'MXN'}`);
    console.log(`📋 Pipeline: ${pipelineName} (ID: ${props.pipeline || 'N/A'})`);
    console.log(`📊 Stage: ${stageName} (ID: ${props.dealstage || 'N/A'})`);
    console.log(`📅 Creado: ${props.createdate || props.hs_createdate || 'N/A'}`);
    console.log(`🔄 Última modificación: ${props.hs_lastmodifieddate || 'N/A'}`);
    if (props.closedate) {
      console.log(`✅ Cerrado: ${props.closedate}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('📄 DESCRIPCIÓN:');
    console.log('='.repeat(70));
    if (props.description) {
      console.log(props.description);
    } else {
      console.log('Sin descripción');
    }

    console.log('\n' + '='.repeat(70));
    console.log('🔗 ENLACES:');
    console.log('='.repeat(70));
    console.log(`   HubSpot: ${deal.url || `https://app.hubspot.com/deals/${deal.id}`}`);

    console.log('\n' + '='.repeat(70));
    console.log('📋 ESTRUCTURA COMPLETA:');
    console.log('='.repeat(70));
    console.log(JSON.stringify(deal, null, 2));

    console.log('\n' + '='.repeat(70));
    console.log('✅ Información obtenida exitosamente');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('❌ Error obteniendo información del deal:', error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Respuesta:`, JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
};

// Obtener Deal ID del argumento de línea de comandos
const dealId = process.argv[2] || '52688453993';

// Ejecutar
getDealInfo(dealId).then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});

