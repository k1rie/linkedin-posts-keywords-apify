const axios = require('axios');
const loggerService = require('./loggerService');

/**
 * Obtener keywords desde ClickUp
 */
const getKeywordsFromClickUp = async () => {
  const clickupToken = process.env.CLICKUP_API_TOKEN;
  const keywordsListId = process.env.CLICKUP_KEYWORDS_LIST_ID || '901708915302';

  if (!clickupToken) {
    throw new Error('CLICKUP_API_TOKEN no está configurado en .env');
  }

  try {
    loggerService.info(`\n=== OBTENIENDO KEYWORDS DESDE CLICKUP ===`);
    loggerService.info(`List ID: ${keywordsListId}`);

    const keywords = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await axios.get(
        `https://api.clickup.com/api/v2/list/${keywordsListId}/task?archived=false`,
        {
          headers: {
            'Authorization': clickupToken,
            'Content-Type': 'application/json'
          },
          params: {
            page: page,
            order_by: 'created',
            reverse: false,
            subtasks: false,
            statuses: [],
            include_closed: false
          }
        }
      );

      const tasks = response.data.tasks || [];
      
      for (const task of tasks) {
        // Extraer keyword del nombre de la tarea
        const keyword = task.name?.trim();
        if (keyword) {
          keywords.push({
            taskId: task.id,
            keyword: keyword,
            taskName: task.name,
            description: task.description || ''
          });
        }
      }

      hasMore = tasks.length === 100; // ClickUp devuelve 100 por página
      page++;
    }

    loggerService.info(`Total keywords obtenidas: ${keywords.length}`);
    
    return keywords;
  } catch (error) {
    loggerService.error('Error obteniendo keywords de ClickUp:', error);
    if (error.response) {
      loggerService.error(`Status: ${error.response.status}`);
      loggerService.error(`Respuesta: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    throw new Error(`Error obteniendo keywords de ClickUp: ${error.message}`);
  }
};

/**
 * Verificar si un post ya existe en ClickUp
 */
const checkDuplicate = async (postLink, clickupToken, clickupListId) => {
  try {
    const response = await axios.get(
      `https://api.clickup.com/api/v2/list/${clickupListId}/task?archived=false`,
      {
        headers: {
          'Authorization': clickupToken,
          'Content-Type': 'application/json'
        },
        params: {
          page: 0,
          order_by: 'created',
          reverse: true,
          subtasks: false,
          statuses: [],
          include_closed: false
        }
      }
    );

    const tasks = response.data.tasks || [];
    
    // Buscar si ya existe una tarea con el mismo link de post
    for (const task of tasks) {
      if (task.description && task.description.includes(postLink)) {
        loggerService.debug(`Post duplicado encontrado: ${task.id}`);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    loggerService.warn('Error verificando duplicados, continuando de todas formas', error);
    return false;
  }
};

/**
 * Guardar post en ClickUp
 */
const savePostToClickUp = async (postData, keyword) => {
  const clickupToken = process.env.CLICKUP_API_TOKEN;
  const clickupListId = process.env.CLICKUP_POSTS_LIST_ID || '901708915350';

  if (!clickupToken) {
    loggerService.warn('CLICKUP_API_TOKEN no está configurado, saltando guardado en ClickUp');
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
    const isDuplicate = await checkDuplicate(postLink, clickupToken, clickupListId);
    
    if (isDuplicate) {
      loggerService.warn(`Post duplicado encontrado, saltando: ${postLink}`);
      return { duplicate: true, id: null };
    }

    // Obtener los status disponibles de la lista
    let validStatus = null;
    try {
      const listResponse = await axios.get(
        `https://api.clickup.com/api/v2/list/${clickupListId}`,
        {
          headers: {
            'Authorization': clickupToken,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const statuses = listResponse.data.statuses || [];
      if (statuses.length > 0) {
        validStatus = statuses[0].status;
        loggerService.debug(`Status válido encontrado: ${validStatus}`);
      }
    } catch (statusError) {
      loggerService.debug('No se pudo obtener status de la lista, creando sin status específico');
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
    let description = `**Post de LinkedIn**\n\n`;
    description += `**Keyword:** ${keyword}\n`;
    description += `**Autor/Perfil:** ${authorName}\n`;
    description += `**URL del perfil:** ${profileUrl}\n`;
    description += `**URL del post:** ${postLink}\n\n`;
    
    if (postData.text) {
      description += `**Contenido:**\n${postData.text.substring(0, 500)}${postData.text.length > 500 ? '...' : ''}\n\n`;
    }
    
    if (postData.createdAt) {
      description += `**Fecha:** ${postData.createdAt}\n`;
    }

    const taskData = {
      name: `${authorName} - Post de LinkedIn (${keyword})`,
      description: description,
      priority: 3
    };

    if (validStatus) {
      taskData.status = validStatus;
    }

    loggerService.debug(`Creando tarea en ClickUp: ${taskData.name}`);

    const response = await axios.post(
      `https://api.clickup.com/api/v2/list/${clickupListId}/task`,
      taskData,
      {
        headers: {
          'Authorization': clickupToken,
          'Content-Type': 'application/json'
        }
      }
    );

    loggerService.success(`Tarea creada en ClickUp: ${response.data.id}`);
    return response.data;
  } catch (error) {
    loggerService.error('Error guardando en ClickUp', error);
    if (error.response) {
      loggerService.error(`Status: ${error.response.status}`);
      loggerService.error(`Respuesta: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return null;
  }
};

module.exports = {
  getKeywordsFromClickUp,
  savePostToClickUp
};

