const axios = require('axios');
const loggerService = require('./loggerService');

const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN;
const CLICKUP_KEYWORDS_LIST_ID = process.env.CLICKUP_KEYWORDS_LIST_ID;
const CLICKUP_BASE_URL = 'https://api.clickup.com/api/v2';

/**
 * Obtener keywords desde ClickUp
 * Busca tareas en una lista de ClickUp y extrae keywords del nombre de las tareas
 * @returns {Promise<Array>} Array de objetos con { keyword: string, id: string, status: string }
 */
const getKeywordsFromClickUp = async () => {
  if (!CLICKUP_API_TOKEN) {
    loggerService.warn('CLICKUP_API_TOKEN no está configurado, no se pueden obtener keywords desde ClickUp');
    return [];
  }

  if (!CLICKUP_KEYWORDS_LIST_ID) {
    loggerService.warn('CLICKUP_KEYWORDS_LIST_ID no está configurado, no se pueden obtener keywords desde ClickUp');
    return [];
  }

  try {
    loggerService.debug(`Obteniendo keywords desde ClickUp (List ID: ${CLICKUP_KEYWORDS_LIST_ID})...`);
    
    const response = await axios.get(
      `${CLICKUP_BASE_URL}/list/${CLICKUP_KEYWORDS_LIST_ID}/task`,
      {
        headers: {
          'Authorization': CLICKUP_API_TOKEN,
          'Content-Type': 'application/json'
        },
        params: {
          archived: false,
          include_closed: false
        }
      }
    );

    const tasks = response.data.tasks || [];
    
    // Extraer keywords del nombre de las tareas
    const keywords = tasks
      .filter(task => task.name && task.name.trim().length > 0)
      .map(task => ({
        id: task.id,
        keyword: task.name.trim(),
        status: task.status?.status || 'unknown',
        listId: task.list?.id || CLICKUP_KEYWORDS_LIST_ID
      }));

    loggerService.info(`Keywords obtenidas desde ClickUp: ${keywords.length}`);
    
    if (keywords.length > 0) {
      loggerService.debug(`Primeras keywords: ${keywords.slice(0, 5).map(k => k.keyword).join(', ')}`);
    }

    return keywords;
  } catch (error) {
    loggerService.error('Error obteniendo keywords desde ClickUp:', error);
    
    if (error.response) {
      loggerService.error(`Status: ${error.response.status}`);
      loggerService.error(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
      
      if (error.response.status === 401) {
        throw new Error('Token de ClickUp inválido o expirado');
      }
      if (error.response.status === 404) {
        throw new Error(`Lista de ClickUp no encontrada (List ID: ${CLICKUP_KEYWORDS_LIST_ID})`);
      }
    }
    
    throw new Error(`Error obteniendo keywords desde ClickUp: ${error.message}`);
  }
};

/**
 * Verificar si ClickUp está configurado
 * @returns {boolean}
 */
const isClickUpConfigured = () => {
  return !!(CLICKUP_API_TOKEN && CLICKUP_KEYWORDS_LIST_ID);
};

module.exports = {
  getKeywordsFromClickUp,
  isClickUpConfigured
};

