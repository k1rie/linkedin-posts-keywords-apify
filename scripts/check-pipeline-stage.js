require('dotenv').config();
const axios = require('axios');

const HUBSPOT_TOKEN = process.env.HUBSPOT_TOKEN;
const HUBSPOT_BASE_URL = 'https://api.hubapi.com';

/**
 * Script para verificar qué pipeline y stage corresponden a los IDs
 */
const checkPipelineAndStage = async () => {
  if (!HUBSPOT_TOKEN) {
    console.error('HUBSPOT_TOKEN no está configurado en .env');
    process.exit(1);
  }

  try {
    console.log('🔍 Obteniendo pipelines y stages de HubSpot...\n');

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

    if (pipelines.length === 0) {
      console.log('⚠️  No se encontraron pipelines');
      return;
    }

    console.log(`📊 Total de pipelines encontrados: ${pipelines.length}\n`);

    // Buscar el pipeline específico que se está usando
    const targetPipelineId = '654720623';
    const targetStageId = '1169433784';

    let foundPipeline = null;
    let foundStage = null;

    for (const pipeline of pipelines) {
      console.log(`\n📋 Pipeline: ${pipeline.label}`);
      console.log(`   ID: ${pipeline.id}`);
      console.log(`   Display Order: ${pipeline.displayOrder}`);
      console.log(`   Stages (${pipeline.stages?.length || 0}):`);

      if (pipeline.stages && pipeline.stages.length > 0) {
        pipeline.stages.forEach((stage, index) => {
          const isTarget = pipeline.id === targetPipelineId && stage.id === targetStageId;
          const marker = isTarget ? ' ⭐ (EN USO)' : '';
          console.log(`     ${index + 1}. ${stage.label}${marker}`);
          console.log(`        ID: ${stage.id}`);
          console.log(`        Display Order: ${stage.displayOrder}`);
          console.log(`        Probability: ${stage.metadata?.probability || 'N/A'}`);

          if (isTarget) {
            foundPipeline = pipeline;
            foundStage = stage;
          }
        });
      }

      if (pipeline.id === targetPipelineId) {
        foundPipeline = pipeline;
      }
    }

    // Mostrar resumen del pipeline y stage en uso
    console.log('\n' + '='.repeat(60));
    console.log('🎯 PIPELINE Y STAGE EN USO:');
    console.log('='.repeat(60));

    if (foundPipeline) {
      console.log(`\n📋 Pipeline:`);
      console.log(`   Nombre: ${foundPipeline.label}`);
      console.log(`   ID: ${foundPipeline.id}`);
    } else {
      console.log(`\n⚠️  Pipeline ID ${targetPipelineId} no encontrado`);
    }

    if (foundStage) {
      console.log(`\n📊 Stage:`);
      console.log(`   Nombre: ${foundStage.label}`);
      console.log(`   ID: ${foundStage.id}`);
      console.log(`   Probabilidad: ${foundStage.metadata?.probability || 'N/A'}`);
    } else {
      console.log(`\n⚠️  Stage ID ${targetStageId} no encontrado en el pipeline ${targetPipelineId}`);
      
      // Buscar el stage en todos los pipelines
      for (const pipeline of pipelines) {
        if (pipeline.stages) {
          const stage = pipeline.stages.find(s => s.id === targetStageId);
          if (stage) {
            console.log(`\n   ✅ Stage encontrado en otro pipeline:`);
            console.log(`      Pipeline: ${pipeline.label} (ID: ${pipeline.id})`);
            console.log(`      Stage: ${stage.label} (ID: ${stage.id})`);
            break;
          }
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Verificación completada');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error obteniendo pipelines:', error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Respuesta:`, JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
};

// Ejecutar
checkPipelineAndStage().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});

