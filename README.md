# LinkedIn Posts Extractor por Keywords con Apify

Sistema de extracción de posts de LinkedIn usando keywords con Apify, integrado con ClickUp para obtener keywords y HubSpot para crear deals. **Solo busca posts de México.**

## Características

- 🔍 Búsqueda de posts de LinkedIn usando keywords con Apify Actor
- 🇲🇽 Filtro de ubicación: Solo posts de México
- 🔄 Integración con ClickUp (obtener keywords desde lista)
- 💼 Integración con HubSpot (crear deals para cada post encontrado)
- ✅ Detección de duplicados
- 📊 Rate limiting configurable (máximo de keywords por día)
- ⏰ Scheduler configurable (ejecución automática periódica)
- 📝 Logging completo

## Instalación

```bash
# Ir a la carpeta backend
cd backend

# Instalar dependencias
npm install
```

## Configuración

Crea un archivo `.env` en la carpeta `backend` basándote en `.env.example`:

```env
# Apify Configuration
APIFY_API_TOKEN=tu_token_de_apify
APIFY_ACTOR_ID=buIWk2uOUzTmcLsuB

# ClickUp Configuration (solo para obtener keywords)
CLICKUP_API_TOKEN=tu_token_de_clickup
CLICKUP_KEYWORDS_LIST_ID=901708915302

# HubSpot Configuration (para crear deals)
HUBSPOT_TOKEN=tu_token_de_hubspot
HUBSPOT_DEAL_STAGE=appointmentscheduled
HUBSPOT_PIPELINE=default

# Server Configuration
PORT=3004
NODE_ENV=development

# Rate Limiting
MAX_KEYWORDS_PER_DAY=10

# Posts Configuration
MAX_POSTS_PER_KEYWORD=20

# Scheduling Configuration (in minutes)
SCRAPE_INTERVAL_MINUTES=60

# Apify Actor Input Configuration
PROFILE_SCRAPER_MODE=short
START_PAGE=1
SCRAPE_REACTIONS=false
MAX_REACTIONS=5
SCRAPE_COMMENTS=false

# Location Filter (solo posts de México)
AUTHOR_LOCATION=Mexico

# Logging
LOG_LEVEL=INFO
```

### Variables de Entorno

#### Apify
- `APIFY_API_TOKEN`: Token de API de Apify (requerido)
- `APIFY_ACTOR_ID`: ID del Actor de Apify (por defecto: `buIWk2uOUzTmcLsuB`)

#### ClickUp (solo para obtener keywords)
- `CLICKUP_API_TOKEN`: Token de API de ClickUp (requerido)
- `CLICKUP_KEYWORDS_LIST_ID`: ID de la lista de ClickUp donde están las keywords (por defecto: `901708915302`)

#### HubSpot (para crear deals)
- `HUBSPOT_TOKEN`: Token de API de HubSpot (requerido)
- `HUBSPOT_PIPELINE_ID`: ID numérico del pipeline (opcional, por defecto: `811215668` - Pipeline "Prospección")
- `HUBSPOT_DEAL_STAGE_ID`: ID numérico del stage (opcional, si no se especifica usa el primer stage del pipeline configurado)
  
  **Ejemplo de configuración:**
  ```env
  HUBSPOT_PIPELINE_ID=811215668
  HUBSPOT_DEAL_STAGE_ID=1194313030  # "Hipótesis OK" - primer stage del pipeline Prospección
  ```
  
  **Stages disponibles en pipeline "Prospección" (811215668):**
  - `1194313030` - Hipótesis OK
  - `1195189302` - Apollo OK
  - `1195771750` - Invitando LI
  - `1194326274` - Email 1 OK
  - `1194326275` - Evento LI Creado
  - `1194326276` - Email 2 OK
  - `1194326277` - WhatsApp OK
  - `1194962947` - Llamada OK
  - `1194962948` - Email 3 OK
  - `1195344731` - Invitar en Zoom
  - `1195978305` - Descartado
  
  Para ver todos los stages disponibles, ejecuta: `npm run check-pipeline`

#### Rate Limiting
- `MAX_KEYWORDS_PER_DAY`: Máximo número de keywords a procesar por día (por defecto: `10`)

#### Posts Configuration
- `MAX_POSTS_PER_KEYWORD`: Máximo número de posts a extraer por keyword (por defecto: `20`)

#### Scheduling
- `SCRAPE_INTERVAL_MINUTES`: Intervalo en minutos entre ejecuciones automáticas (por defecto: `60`)
  - `0` o no configurado: Deshabilita el scheduler

#### Apify Actor Input
- `PROFILE_SCRAPER_MODE`: Modo del scraper de perfiles (por defecto: `short`)
- `START_PAGE`: Página inicial (por defecto: `1`)
- `SCRAPE_REACTIONS`: Extraer reacciones (por defecto: `false`)
- `MAX_REACTIONS`: Máximo número de reacciones (por defecto: `5`)
- `SCRAPE_COMMENTS`: Extraer comentarios (por defecto: `false`)
- `AUTHOR_LOCATION`: Ubicación del autor para filtrar (por defecto: `Mexico`) - Solo busca posts de México

## Uso

### Opción 1: Servidor con Scheduler Automático

```bash
# Ir a la carpeta backend
cd backend

# Iniciar servidor (el scheduler se iniciará automáticamente si está configurado)
npm start
```

### Opción 2: API REST

```bash
# Ir a la carpeta backend
cd backend

# Iniciar servidor
npm start

# Ejecutar scraping manualmente
curl -X POST http://localhost:3004/api/scraper/run-now

# Obtener estadísticas
curl http://localhost:3004/api/scraper/stats

# Buscar posts por keywords específicas
curl -X POST http://localhost:3004/api/scraper/search-posts \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["b2b sales", "marketing automation"]
  }'

# Buscar posts usando keywords de ClickUp
curl -X POST http://localhost:3004/api/scraper/search-posts \
  -H "Content-Type: application/json" \
  -d '{
    "useClickUp": true
  }'
```

### Opción 3: Script de Prueba

```bash
# Ir a la carpeta backend
cd backend

# Ver estructura de datos (procesa 1 keyword)
npm run test-structure
```

## API Endpoints

### GET /health
Health check del servidor.

### POST /api/scraper/search-posts
Buscar posts por keywords.

**Request (con keywords):**
```json
{
  "keywords": ["b2b sales", "marketing automation"]
}
```

**Request (desde ClickUp):**
```json
{
  "useClickUp": true
}
```

### POST /api/scraper/run-now
Ejecutar scraping manualmente (usa keywords de ClickUp).

### GET /api/scraper/stats
Obtener estadísticas de rate limit y estado del scheduler.

## Flujo de Trabajo

1. **Obtener keywords desde ClickUp**: El sistema obtiene keywords desde una lista de ClickUp
2. **Verificar rate limit**: Se verifica si se puede procesar más keywords hoy
3. **Buscar posts con Apify**: Se usa el Actor de Apify para buscar posts con cada keyword (solo de México)
4. **Crear deals en HubSpot**: Para cada post encontrado, se crea un deal en HubSpot (si no es duplicado)
5. **Actualizar rate limit**: Se incrementa el contador de keywords procesadas

### Información guardada en cada Deal de HubSpot

Cada deal incluye:
- **Nombre del deal**: `{Autor} - Post LinkedIn ({keyword})`
- **Descripción**: Contiene toda la información del post:
  - Keyword usada para encontrar el post
  - Autor/Perfil del post
  - URL del perfil de LinkedIn
  - URL del post
  - Contenido del post (primeros 1000 caracteres)
  - Fecha del post (si está disponible)
- **Pipeline y Stage**: Se obtienen automáticamente del primer pipeline disponible (o el configurado en `.env`)
- **Monto**: 0 MXN (sin monto inicial)

**Nota**: Toda la información se guarda en la descripción del deal. Las propiedades personalizadas de LinkedIn no se crean automáticamente, pero toda la información está disponible en la descripción.

## Estructura del Proyecto

```
linkedin-posts-keywords-apify/
└── backend/
    ├── controllers/
    │   └── scraperController.js
    ├── routes/
    │   └── scraperRoutes.js
    ├── services/
    │   ├── apifyService.js
    │   ├── clickupService.js
    │   ├── loggerService.js
    │   ├── rateLimitService.js
    │   └── schedulerService.js
    ├── scripts/
    │   ├── scrape.js
    │   └── test-structure.js
    ├── data/
    │   ├── logs/
    │   └── rate-limit.json
    ├── .env.example
    ├── package.json
    ├── server.js
    └── README.md
```

## Tecnologías

- **Node.js**: Runtime de JavaScript
- **Express**: Framework web
- **Apify Client**: Cliente para Apify Actors
- **Axios**: Cliente HTTP
- **node-cron**: Scheduler de tareas
- **dotenv**: Gestión de variables de entorno

## Licencia

ISC

# linkedin-posts-keywords-apify
# linkedin-posts-keywords-apify
