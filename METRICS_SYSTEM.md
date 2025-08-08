# Sistema de Eventos y Métricas - Nobilerde

Este sistema implementa un tracking completo de eventos de usuario y generación de métricas agregadas para análisis de negocio, respetando principios de privacidad y k-anonimato.

## 📁 Estructura del Sistema

```
backend/
├── config/
│   └── eventModel.js          # Modelo de eventos
├── services/
│   └── metricsAggregator.js   # Servicio de agregación de métricas
├── jobs/
│   └── scheduleMetrics.js     # Programador de tareas cron
├── routes/
│   └── metricsRoutes.js       # API endpoints para métricas
├── middleware/
│   └── eventTracker.js        # Middleware de tracking automático
└── scripts/
    └── testEventSystem.js     # Script de testing
```

## 🎯 Eventos Tracked

### Tipos de Eventos
- **view_yerba**: Usuario ve detalles de una yerba
- **search**: Usuario realiza búsqueda
- **filter_applied**: Usuario aplica filtros
- **add_shelf**: Usuario agrega yerba a estantería
- **update_shelf**: Usuario actualiza status/score en estantería
- **remove_shelf**: Usuario remueve yerba de estantería
- **rate**: Usuario califica una yerba
- **comment**: Usuario comenta sobre una yerba
- **ai_request**: Usuario usa funcionalidad de IA
- **recommendation_view**: Usuario ve recomendaciones
- **profile_update**: Usuario actualiza perfil
- **login**: Usuario inicia sesión
- **signup**: Usuario se registra

### Estructura de Evento
```javascript
{
  user: ObjectId,              // Referencia al usuario
  yerba: ObjectId,             // Referencia a yerba (opcional)
  type: String,                // Tipo de evento
  filters: [String],           // Filtros aplicados
  searchQuery: String,         // Query de búsqueda
  score: Number,               // Puntuación (1-5)
  notes: [String],             // Notas de sabor/características
  previousValue: String,       // Valor anterior (para updates)
  newValue: String,            // Nuevo valor (para updates)
  sessionId: String,           // ID de sesión
  userAgent: String,           // Info del cliente (sanitizada)
  ipAddress: String,           // IP hasheada
  timestamp: Date              // Timestamp del evento
}
```

## 📊 Métricas Generadas

### 1. Top Yerbas (metrics_top_yerbas)
Yerbas más populares por país y mes, incluyendo:
- Total de interacciones
- Usuarios únicos
- Puntuación promedio
- Conteos por tipo de evento (view, add_shelf, rate)

### 2. Notas de Sabor (metrics_flavor_notes)
Notas más frecuentes por región y demografía:
- Por país, grupo de edad, género
- Frecuencia de cada nota
- Segmentación demográfica

### 3. Tendencias (metrics_trends)
Evolución temporal de puntuaciones:
- Por tipo de yerba
- Por características (con/sin palo, secado)
- Tendencias semanales

### 4. Comportamiento de Usuario (metrics_user_behavior)
Patrones de uso diarios:
- Eventos por tipo y país
- Usuarios únicos por evento
- Patrones temporales

### 5. Descubrimiento vs Fidelidad (metrics_discovery)
Análisis de exploración de usuarios:
- Rangos de yerbas probadas
- Patrones de descubrimiento por país
- Segmentación por nivel de exploración

## 🔒 Privacidad y K-Anonimato

### Protecciones Implementadas
- **K-Anonimato**: Umbral mínimo de 50 usuarios para incluir métricas
- **Hasheado de IPs**: IPs hasheadas para análisis de patrones sin exposición
- **Sanitización de User-Agent**: Solo información básica del dispositivo
- **No exposición de listas de usuarios**: Solo conteos agregados
- **Limpieza automática**: Datos antiguos eliminados periódicamente

### Campos Protegidos
- ❌ No se guardan: nombres, emails, datos de contacto
- ✅ Se guardan: referencias ObjectId, datos agregables, timestamps

## ⏰ Programación de Tareas

### Agregación Diaria (2:00 AM)
- Genera todas las métricas agregadas
- Procesa eventos de los últimos 90 días
- Actualiza colecciones de métricas

### Agregación Semanal (Domingos 3:00 AM)
- Ejecuta análisis más intensivos
- Genera reportes semanales
- Análisis de tendencias estacionales

### Limpieza Mensual (1er día del mes, 4:00 AM)
- Elimina eventos > 1 año
- Elimina métricas > 6 meses
- Optimiza índices de base de datos

## 🚀 API Endpoints

### GET /api/metrics/top-yerbas
```
Query params: country, month, limit
Ejemplo: /api/metrics/top-yerbas?country=AR&month=2025-08&limit=20
```

### GET /api/metrics/flavor-notes
```
Query params: country, ageBucket, gender, limit
Ejemplo: /api/metrics/flavor-notes?country=AR&ageBucket=25-34&limit=50
```

### GET /api/metrics/trends
```
Query params: type, weeks, containsPalo, secado, limit
Ejemplo: /api/metrics/trends?type=tradicional&weeks=8&containsPalo=true
```

### GET /api/metrics/user-behavior
```
Query params: eventType, country, days, limit
Ejemplo: /api/metrics/user-behavior?eventType=search&country=AR&days=30
```

### GET /api/metrics/discovery
```
Query params: country, yerbaRange, limit
Ejemplo: /api/metrics/discovery?country=AR&yerbaRange=4-7
```

### GET /api/metrics/status
```
Estado del sistema de métricas y programador
```

### POST /api/metrics/trigger-aggregation
```
Ejecuta agregación manual (solo admins)
```

### GET /api/metrics/summary
```
Resumen general de todas las métricas
Query params: country
```

## 💻 Uso del Sistema

### 1. Tracking Automático
```javascript
import EventTracker from './middleware/eventTracker.js';

// Aplicar middleware para tracking automático
app.use('/api', EventTracker.autoTrack());
```

### 2. Tracking Manual
```javascript
// Trackear evento específico
await EventTracker.trackEvent(userId, 'search', {
  searchQuery: 'yerba suave',
  filters: ['tipo:tradicional'],
  resultsCount: 15
});

// Trackear rating
await EventTracker.trackRating(userId, yerbaId, 4, ['suave', 'herbal']);

// Trackear interacción con IA
await EventTracker.trackAIInteraction(userId, prompt, interpretation, 5);
```

### 3. Obtener Métricas
```javascript
import metricsAggregator from './services/metricsAggregator.js';

// Obtener métricas específicas
const topYerbas = await metricsAggregator.getMetrics('metrics_top_yerbas', {
  '_id.country': 'AR',
  '_id.month': '2025-08'
}, 20);
```

### 4. Programación Manual
```javascript
import metricsScheduler from './jobs/scheduleMetrics.js';

// Ejecutar agregación manual
await metricsScheduler.runManual();

// Obtener estado del programador
const status = metricsScheduler.getStatus();
```

## 🧪 Testing

```bash
# Ejecutar tests completos del sistema
node scripts/testEventSystem.js
```

Los tests incluyen:
1. Creación de eventos de muestra
2. Generación de métricas
3. Validación de tracking automático
4. Verificación de k-anonimato

## 📋 Configuración

### Variables de Entorno
```env
NODE_ENV=production          # Entorno de ejecución
MONGODB_URI=...             # URI de MongoDB
K_ANONYMITY_THRESHOLD=50    # Umbral de k-anonimato (opcional)
```

### Índices de Base de Datos
El sistema crea automáticamente los índices necesarios:
- `{ type: 1, timestamp: -1 }`
- `{ user: 1, timestamp: -1 }`
- `{ yerba: 1, timestamp: -1 }`
- `{ timestamp: -1, type: 1 }`

## 🚨 Monitoreo y Alertas

### Logs Estructurados
- Todas las operaciones importantes son loggeadas
- Errores incluyen contexto completo
- Métricas de rendimiento registradas

### Notificaciones (Configurables)
- Éxito de agregaciones diarias/semanales
- Errores en procesamiento
- Alertas de umbral de k-anonimato

## 🔧 Mantenimiento

### Limpieza Manual
```javascript
// Limpiar eventos antiguos
await Event.deleteMany({
  timestamp: { $lt: new Date('2024-01-01') }
});

// Limpiar métricas específicas
const collection = metricsConn.db.collection('metrics_top_yerbas');
await collection.deleteMany({
  createdAt: { $lt: sixMonthsAgo }
});
```

### Optimización de Rendimiento
- Índices optimizados para queries de agregación
- Procesamiento en batch para grandes volúmenes
- Limpieza automática de datos antiguos
- Ejecución en horarios de bajo tráfico

## 📈 Dashboards Sugeridos

### Dashboard B2B
1. **Yerbas Trending**: Top yerbas por región y tiempo
2. **Análisis de Sabor**: Preferencias por demografía
3. **Comportamiento de Usuario**: Patrones de engagement
4. **Métricas de Descubrimiento**: Análisis de exploración

### Dashboard Operacional
1. **Estado del Sistema**: Uptime, rendimiento, errores
2. **Volumen de Eventos**: Trends de actividad
3. **Calidad de Datos**: Completitud, validez
4. **Métricas de Privacidad**: Cumplimiento de k-anonimato

---

## ⚠️ Consideraciones Importantes

1. **Rendimiento**: Las agregaciones pueden ser intensivas, ejecutar en horarios de bajo tráfico
2. **Privacidad**: Siempre verificar que se cumple k-anonimato antes de exponer métricas
3. **Escalabilidad**: Para grandes volúmenes, considerar particionado de datos por fecha
4. **Backup**: Implementar backup regular de métricas críticas
5. **Auditoria**: Mantener logs de acceso a métricas para compliance
