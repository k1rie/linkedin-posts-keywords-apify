const axios = require('axios');
const loggerService = require('./loggerService');

const HUBSPOT_TOKEN = process.env.HUBSPOT_TOKEN;
const HUBSPOT_BASE_URL = 'https://api.hubapi.com';

/**
 * Obtener pipelines y stages disponibles de HubSpot
 */
const getPipelinesAndStages = async () => {
  if (!HUBSPOT_TOKEN) {
    return null;
  }

  try {
    const response = await axios.get(
      `${HUBSPOT_BASE_URL}/crm/v3/pipelines/deals`,
      {
        headers: {
          'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.results || [];
  } catch (error) {
    loggerService.warn('Error obteniendo pipelines de HubSpot:', error.message);
    return null;
  }
};

/**
 * Obtener el stage ID válido para un pipeline
 */
const getValidStageId = async (pipelineId = null) => {
  const pipelines = await getPipelinesAndStages();
  
  if (!pipelines || pipelines.length === 0) {
    loggerService.warn('No se pudieron obtener pipelines, usando stage por defecto');
    return null;
  }

  // Si se especifica un pipeline ID, buscar ese pipeline
  let targetPipeline = null;
  if (pipelineId) {
    targetPipeline = pipelines.find(p => p.id === pipelineId);
  }
  
  // Si no se encontró o no se especificó, usar el primer pipeline
  if (!targetPipeline) {
    targetPipeline = pipelines[0];
  }

  // Obtener el primer stage del pipeline
  if (targetPipeline.stages && targetPipeline.stages.length > 0) {
    const firstStage = targetPipeline.stages[0];
    loggerService.debug(`Usando pipeline: ${targetPipeline.id} (${targetPipeline.label}), stage: ${firstStage.id} (${firstStage.label})`);
    return {
      pipelineId: targetPipeline.id,
      stageId: firstStage.id
    };
  }

  return null;
};

/**
 * Verificar si un post ya existe como deal en HubSpot
 */
const checkDuplicateDeal = async (postLink) => {
  if (!HUBSPOT_TOKEN) {
    return false;
  }

  try {
    // Buscar deals que contengan el link del post en la descripción
    // Usamos búsqueda por descripción ya que es más confiable
    const response = await axios.post(
      `${HUBSPOT_BASE_URL}/crm/v3/objects/deals/search`,
      {
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'description',
                operator: 'CONTAINS_TOKEN',
                value: postLink
              }
            ]
          }
        ],
        limit: 10,
        properties: ['id', 'dealname', 'description']
      },
      {
        headers: {
          'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const deals = response.data.results || [];
    
    // Verificar si alguno contiene el link exacto
    for (const deal of deals) {
      const description = deal.properties?.description || '';
      if (description.includes(postLink)) {
        loggerService.debug(`Deal duplicado encontrado: ${deal.id}`);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    // Si hay error (propiedad no existe, etc.), continuar de todas formas
    loggerService.debug('Error verificando duplicados en HubSpot, continuando...', error.message);
    return false;
  }
};

/**
 * Crear un deal en HubSpot para un post de LinkedIn
 */
const createDealForPost = async (postData, keyword) => {
  if (!HUBSPOT_TOKEN) {
    loggerService.warn('HUBSPOT_TOKEN no está configurado, saltando guardado en HubSpot');
    return null;
  }

  if (!postData || !postData.url) {
    loggerService.warn('No hay datos de post para guardar');
    return null;
  }

  const postLink = postData.url;

  try {
    // Verificar duplicados
    loggerService.debug(`Verificando duplicados para: ${postLink}`);
    const isDuplicate = await checkDuplicateDeal(postLink);
    
    if (isDuplicate) {
      loggerService.warn(`Post duplicado encontrado, saltando: ${postLink}`);
      return { duplicate: true, id: null };
    }

    // Extraer información del autor/perfil
    let authorName = 'No disponible';
    let profileUrl = 'No disponible';
    
    if (postData.author) {
      if (typeof postData.author === 'string') {
        authorName = postData.author;
      } else if (typeof postData.author === 'object' && postData.author !== null) {
        authorName = postData.author.name || postData.author.authorName || 'No disponible';
        profileUrl = postData.author.linkedinUrl || postData.author.url || 'No disponible';
      }
    }

    // Construir descripción con información del post
    let description = `Post de LinkedIn encontrado por keyword: ${keyword}\n\n`;
    description += `Autor/Perfil: ${authorName}\n`;
    description += `URL del perfil: ${profileUrl}\n`;
    description += `URL del post: ${postLink}\n\n`;
    
    if (postData.text) {
      description += `Contenido:\n${postData.text.substring(0, 1000)}${postData.text.length > 1000 ? '...' : ''}\n\n`;
    }
    
    if (postData.createdAt) {
      description += `Fecha del post: ${postData.createdAt}\n`;
    }

    // Preparar propiedades del deal (solo propiedades estándar de HubSpot)
    const dealProperties = {
      dealname: `Post Keywords: ${authorName} - Post LinkedIn (${keyword})`,
      description: description,
      amount: '0', // Sin monto inicial
      deal_currency_code: 'MXN',
      link_original_de_la_noticia: profileUrl // Guardar el link del perfil de LinkedIn
    };

    // Log de datos que se van a guardar
    loggerService.info('=== GUARDANDO DEAL EN HUBSPOT ===');
    loggerService.info(`Programa: Post Keywords`);
    loggerService.info(`Deal Name: ${dealProperties.dealname}`);
    loggerService.info(`Author: ${authorName}`);
    loggerService.info(`Keyword: ${keyword}`);
    loggerService.info(`Post URL: ${postLink}`);
    loggerService.info(`Profile URL (guardado): ${profileUrl}`);
    loggerService.info('================================');

    // Obtener pipeline y stage desde .env o usar valores por defecto
    const envPipelineId = process.env.HUBSPOT_PIPELINE_ID || '654720623'; // Default: proyectos
    const envStageId = process.env.HUBSPOT_DEAL_STAGE_ID || '1169433784'; // Default: stage para posts keywords

    // Si se especifica un stage ID en el env, usarlo directamente
    if (envStageId && /^\d+$/.test(envStageId)) {
      dealProperties.pipeline = envPipelineId;
      dealProperties.dealstage = envStageId;
      loggerService.debug(`Usando pipeline/stage desde .env: pipeline=${envPipelineId}, stage=${envStageId}`);
    } else {
      // Si no se especifica stage, obtener el primer stage del pipeline configurado
      const pipelineConfig = await getValidStageId(envPipelineId);
      
      if (pipelineConfig) {
        dealProperties.pipeline = pipelineConfig.pipelineId;
        dealProperties.dealstage = pipelineConfig.stageId;
        loggerService.debug(`Usando pipeline/stage automático: pipeline=${pipelineConfig.pipelineId}, stage=${pipelineConfig.stageId}`);
      } else {
        // Fallback: usar valores del env si son válidos
        if (/^\d+$/.test(envPipelineId)) {
          dealProperties.pipeline = envPipelineId;
        }
        
        if (envStageId && /^\d+$/.test(envStageId)) {
          dealProperties.dealstage = envStageId;
        } else {
          loggerService.warn('No se pudo obtener pipeline/stage válido');
          loggerService.warn('El deal se creará sin pipeline/stage específico');
        }
      }
    }

    // Crear el deal
    const dealData = {
      properties: dealProperties
    };

    loggerService.debug(`Creando deal en HubSpot: ${dealProperties.dealname}`);

    const response = await axios.post(
      `${HUBSPOT_BASE_URL}/crm/v3/objects/deals`,
      dealData,
      {
        headers: {
          'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    loggerService.success(`Deal creado en HubSpot: ${response.data.id}`);
    loggerService.info(`=== DEAL CREADO EXITOSAMENTE ===`);
    loggerService.info(`Deal ID: ${response.data.id}`);
    loggerService.info(`Deal Name: ${dealProperties.dealname}`);
    loggerService.info(`Profile URL: ${profileUrl}`);
    loggerService.info(`Pipeline: ${dealProperties.pipeline || 'N/A'}`);
    loggerService.info(`Stage: ${dealProperties.dealstage || 'N/A'}`);
    loggerService.info('================================');
    return response.data;
  } catch (error) {
    loggerService.error('Error guardando en HubSpot', error);
    if (error.response) {
      loggerService.error(`Status: ${error.response.status}`);
      loggerService.error(`Respuesta: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return null;
  }
};

module.exports = {
  createDealForPost
};

