# Prompt para Replicar Sistema de Guardado de Deals en HubSpot

## Prompt Completo

```
Necesito crear un sistema para guardar información como deals en HubSpot usando Node.js y la API de HubSpot v3.

REQUISITOS:

1. **Servicio de HubSpot** (`hubspotService.js`):
   - Función para obtener pipelines y stages disponibles de HubSpot dinámicamente
   - Función para obtener un stage válido de un pipeline específico
   - Función para verificar duplicados buscando en la descripción del deal
   - Función `createDealForPost(postData, keyword)` que:
     * Recibe un objeto `postData` con: `url`, `text`, `author`, `profileUrl`, `createdAt`
     * Recibe un `keyword` (string)
     * Verifica duplicados antes de crear
     * Construye una descripción con toda la información del post
     * Crea un deal con estas propiedades estándar:
       - `dealname`: "{author} - Post LinkedIn ({keyword})"
       - `description`: Descripción completa con keyword, autor, URLs, contenido
       - `amount`: "0"
       - `deal_currency_code`: "MXN"
       - `pipeline`: ID numérico del pipeline
       - `dealstage`: ID numérico del stage
     * Usa pipeline/stage desde variables de entorno o valores por defecto
     * Maneja errores y logging completo

2. **Configuración de Variables de Entorno**:
   - `HUBSPOT_TOKEN`: Token de API de HubSpot (requerido)
   - `HUBSPOT_PIPELINE_ID`: ID numérico del pipeline (opcional, default: "811215668")
   - `HUBSPOT_DEAL_STAGE_ID`: ID numérico del stage (opcional, si no se especifica usa el primer stage del pipeline)

3. **Lógica de Pipeline/Stage**:
   - Si `HUBSPOT_DEAL_STAGE_ID` está configurado, usar ese stage directamente
   - Si no está configurado, obtener automáticamente el primer stage del pipeline configurado
   - Si no hay pipeline configurado, usar el pipeline por defecto "811215668"
   - Obtener nombres de pipeline y stage dinámicamente desde la API

4. **Detección de Duplicados**:
   - Buscar deals que contengan el URL del post en la descripción
   - Usar búsqueda POST a `/crm/v3/objects/deals/search` con filtro en `description`
   - Retornar `{ duplicate: true, id: null }` si es duplicado

5. **Estructura del Código**:
   - Usar `axios` para las peticiones HTTP
   - Usar un servicio de logging (`loggerService`)
   - Manejar errores con try/catch
   - Retornar el objeto del deal creado o null en caso de error

6. **Ejemplo de uso**:
   ```javascript
   const hubspotService = require('./services/hubspotService');
   
   const postData = {
     url: 'https://www.linkedin.com/posts/...',
     text: 'Contenido del post...',
     author: 'Nombre Autor',
     profileUrl: 'https://www.linkedin.com/in/...',
     createdAt: new Date().toISOString()
   };
   
   const result = await hubspotService.createDealForPost(postData, 'keyword');
   ```

7. **Formato de la Descripción**:
   ```
   Post de LinkedIn encontrado por keyword: {keyword}

   Autor/Perfil: {author}
   URL del perfil: {profileUrl}
   URL del post: {url}

   Contenido:
   {text (primeros 1000 caracteres)}

   Fecha del post: {createdAt}
   ```

IMPORTANTE:
- Solo usar propiedades estándar de HubSpot (no propiedades personalizadas que no existan)
- Los IDs de pipeline y stage deben ser numéricos (strings de números)
- La API de HubSpot v3 usa Bearer token en el header Authorization
- Base URL: https://api.hubapi.com
- Endpoint para crear deals: POST /crm/v3/objects/deals
- Endpoint para obtener pipelines: GET /crm/v3/pipelines/deals
- Endpoint para buscar deals: POST /crm/v3/objects/deals/search
```

## Estructura del Archivo `hubspotService.js`

```javascript
const axios = require('axios');
const loggerService = require('./loggerService');

const HUBSPOT_TOKEN = process.env.HUBSPOT_TOKEN;
const HUBSPOT_BASE_URL = 'https://api.hubapi.com';

// 1. Función para obtener pipelines y stages
const getPipelinesAndStages = async () => { ... }

// 2. Función para obtener stage válido de un pipeline
const getValidStageId = async (pipelineId = null) => { ... }

// 3. Función para verificar duplicados
const checkDuplicateDeal = async (postLink) => { ... }

// 4. Función principal para crear deal
const createDealForPost = async (postData, keyword) => { ... }

module.exports = {
  createDealForPost
};
```

## Variables de Entorno Necesarias

```env
HUBSPOT_TOKEN=pat-na1-xxxxx-xxxxx-xxxxx-xxxxx
HUBSPOT_PIPELINE_ID=811215668
HUBSPOT_DEAL_STAGE_ID=1194313030
```

## Ejemplo de Respuesta de la API de HubSpot

**Crear Deal (POST /crm/v3/objects/deals)**:
```json
{
  "properties": {
    "dealname": "Autor - Post LinkedIn (keyword)",
    "description": "Descripción completa...",
    "amount": "0",
    "deal_currency_code": "MXN",
    "pipeline": "811215668",
    "dealstage": "1194313030"
  }
}
```

**Obtener Pipelines (GET /crm/v3/pipelines/deals)**:
```json
{
  "results": [
    {
      "id": "811215668",
      "label": "Prospección",
      "stages": [
        {
          "id": "1194313030",
          "label": "Hipótesis OK",
          "metadata": { "probability": 0.2 }
        }
      ]
    }
  ]
}
```

## Puntos Clave a Implementar

1. ✅ Obtener pipelines dinámicamente desde la API
2. ✅ Validar que pipeline y stage sean IDs numéricos
3. ✅ Usar valores por defecto si no están configurados
4. ✅ Verificar duplicados antes de crear
5. ✅ Construir descripción completa con toda la información
6. ✅ Manejar errores de API (400, 401, etc.)
7. ✅ Logging detallado de cada paso
8. ✅ Retornar objeto del deal creado o null en caso de error

