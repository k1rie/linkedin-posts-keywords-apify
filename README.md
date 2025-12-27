# LinkedIn Posts Extractor por Keywords con Apify

Sistema de extracción de posts de LinkedIn usando keywords con Apify, integrado con ClickUp para obtener keywords y guardar posts. **Solo busca posts de México.**

## Características

- 🔍 Búsqueda de posts de LinkedIn usando keywords con Apify Actor
- 🇲🇽 Filtro de ubicación: Solo posts de México
- 🔄 Integración con ClickUp (obtener keywords desde lista y guardar posts)
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

# ClickUp Configuration
CLICKUP_API_TOKEN=tu_token_de_clickup
CLICKUP_KEYWORDS_LIST_ID=901708915302
CLICKUP_POSTS_LIST_ID=901708915350

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

#### ClickUp
- `CLICKUP_API_TOKEN`: Token de API de ClickUp (requerido)
- `CLICKUP_KEYWORDS_LIST_ID`: ID de la lista de ClickUp donde están las keywords (por defecto: `901708915302`)
- `CLICKUP_POSTS_LIST_ID`: ID de la lista de ClickUp donde se guardarán los posts (por defecto: `901708915350`)

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
3. **Buscar posts con Apify**: Se usa el Actor de Apify para buscar posts con cada keyword
4. **Crear tareas en ClickUp**: Para cada post encontrado, se crea una tarea en ClickUp (si no es duplicado)
5. **Actualizar rate limit**: Se incrementa el contador de keywords procesadas

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
