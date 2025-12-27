# Prompt Simple para Replicar Guardado de Deals en HubSpot

## Prompt para Copiar y Pegar

```
Crea un servicio de Node.js para guardar información como deals en HubSpot usando la API v3.

FUNCIONALIDAD REQUERIDA:

1. Crear un archivo `hubspotService.js` con estas funciones:

   a) `getPipelinesAndStages()`: Obtiene todos los pipelines y stages disponibles de HubSpot usando GET /crm/v3/pipelines/deals

   b) `getValidStageId(pipelineId)`: Obtiene el primer stage válido de un pipeline específico. Si no se especifica pipeline, usa el primero disponible.

   c) `checkDuplicateDeal(postLink)`: Verifica si ya existe un deal con ese link del post buscando en la descripción usando POST /crm/v3/objects/deals/search con filtro en propertyName: 'description', operator: 'CONTAINS_TOKEN'

   d) `createDealForPost(postData, keyword)`: Función principal que:
      - Recibe: postData {url, text, author, profileUrl, createdAt} y keyword (string)
      - Verifica duplicados primero
      - Construye descripción con formato:
        "Post de LinkedIn encontrado por keyword: {keyword}\n\nAutor/Perfil: {author}\nURL del perfil: {profileUrl}\nURL del post: {url}\n\nContenido:\n{text (max 1000 chars)}\n\nFecha del post: {createdAt}\n"
      - Crea deal con propiedades:
        * dealname: "{author} - Post LinkedIn ({keyword})"
        * description: (la descripción construida)
        * amount: "0"
        * deal_currency_code: "MXN"
        * pipeline: (ID desde HUBSPOT_PIPELINE_ID o default "811215668")
        * dealstage: (ID desde HUBSPOT_DEAL_STAGE_ID o primer stage del pipeline)
      - Retorna el deal creado o {duplicate: true} si es duplicado

2. Variables de entorno (.env):
   - HUBSPOT_TOKEN (requerido)
   - HUBSPOT_PIPELINE_ID (opcional, default: "811215668")
   - HUBSPOT_DEAL_STAGE_ID (opcional, si no existe usa primer stage del pipeline)

3. Lógica de pipeline/stage:
   - Si HUBSPOT_DEAL_STAGE_ID está configurado → usar ese stage directamente
   - Si no → obtener primer stage del pipeline configurado (o default)
   - Validar que IDs sean numéricos con regex /^\d+$/

4. Detalles técnicos:
   - Usar axios para HTTP requests
   - Base URL: https://api.hubapi.com
   - Headers: Authorization: Bearer {HUBSPOT_TOKEN}, Content-Type: application/json
   - Manejar errores con try/catch y logging
   - Retornar null en caso de error

5. Ejemplo de uso:
   const result = await createDealForPost({
     url: 'https://linkedin.com/posts/...',
     text: 'Contenido...',
     author: 'Nombre',
     profileUrl: 'https://linkedin.com/in/...',
     createdAt: new Date().toISOString()
   }, 'keyword');

IMPORTANTE: Solo usar propiedades estándar de HubSpot. No crear propiedades personalizadas que no existan.
```

