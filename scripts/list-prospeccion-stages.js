require('dotenv').config();
const axios = require('axios');

const HUBSPOT_TOKEN = process.env.HUBSPOT_TOKEN;
const HUBSPOT_BASE_URL = 'https://api.hubapi.com';

/**
 * Script para listar los stages del pipeline "Prospección"
 */
const listProspeccionStages = async () => {
  if (!HUBSPOT_TOKEN) {
    console.error('HUBSPOT_TOKEN no está configurado en .env');
    process.exit(1);
  }

  try {
    console.log('🔍 Obteniendo stages del pipeline "Prospección"...\n');

    const response = await axios.get(
      `${HUBSPOT_BASE_URL}/crm/v3/pipelines/deals`,
      {
        headers: {
          'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const pipelines = response.data.results || [];
    const prospeccionPipelineId = '811215668';

    // Buscar el pipeline "Prospección"
    const prospeccionPipeline = pipelines.find(p => p.id === prospeccionPipelineId);

    if (!prospeccionPipeline) {
      console.error(`❌ Pipeline "Prospección" (ID: ${prospeccionPipelineId}) no encontrado`);
      process.exit(1);
    }

    console.log('='.repeat(60));
    console.log('📋 PIPELINE: PROSPECCIÓN');
    console.log('='.repeat(60));
    console.log(`   Nombre: ${prospeccionPipeline.label}`);
    console.log(`   ID: ${prospeccionPipeline.id}`);
    console.log(`   Display Order: ${prospeccionPipeline.displayOrder}`);
    console.log(`   Total Stages: ${prospeccionPipeline.stages?.length || 0}\n`);

    if (!prospeccionPipeline.stages || prospeccionPipeline.stages.length === 0) {
      console.log('⚠️  No hay stages disponibles en este pipeline');
      return;
    }

    console.log('📊 STAGES DISPONIBLES:\n');
    console.log('┌─────┬──────────────────────────────┬──────────────┬─────────────┐');
    console.log('│ #   │ Nombre                       │ ID           │ Probabilidad│');
    console.log('├─────┼──────────────────────────────┼──────────────┼─────────────┤');

    prospeccionPipeline.stages.forEach((stage, index) => {
      const num = String(index + 1).padStart(3);
      const name = stage.label.padEnd(28);
      const id = stage.id.padEnd(12);
      const probability = stage.metadata?.probability || 0;
      const prob = (typeof probability === 'number' ? probability : parseFloat(probability) || 0).toFixed(1).padStart(11);
      console.log(`│ ${num} │ ${name} │ ${id} │ ${prob} │`);
    });

    console.log('└─────┴──────────────────────────────┴──────────────┴─────────────┘\n');

    console.log('💡 Para usar un stage específico, agrega en tu .env:');
    console.log(`   HUBSPOT_PIPELINE_ID=${prospeccionPipeline.id}`);
    console.log(`   HUBSPOT_DEAL_STAGE_ID=<ID_DEL_STAGE>\n`);

    console.log('📝 Ejemplo (usar el primer stage):');
    console.log(`   HUBSPOT_PIPELINE_ID=${prospeccionPipeline.id}`);
    console.log(`   HUBSPOT_DEAL_STAGE_ID=${prospeccionPipeline.stages[0].id}\n`);

    console.log('='.repeat(60));
    console.log('✅ Listado completado');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error obteniendo stages:', error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Respuesta:`, JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
};

// Ejecutar
listProspeccionStages().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});

