# Actualizaciones de Integración - Testing Automation Framework

## 📅 Fecha: 2025-10-31

---

## 🎯 Resumen de Cambios Implementados

Se han implementado las siguientes mejoras al sistema:

### 1. ✅ **Integración Completa del Runner con Base de Datos**

#### Antes:
- ❌ Las ejecuciones se registraban en BD pero no se actualizaban con resultados
- ❌ Los logs solo se guardaban en memoria (se perdían al reiniciar)
- ❌ No se guardaban evidencias en la BD

#### Ahora:
- ✅ Las ejecuciones se registran, ejecutan y actualizan automáticamente
- ✅ Los resultados se guardan en la tabla `executions`
- ✅ Los logs se guardan como JSON en la BD
- ✅ Las evidencias (screenshots, logs, network, performance) se vinculan a ejecuciones
- ✅ El historial completo se mantiene en la BD

**Archivos modificados:**
- `server/controllers/testItemController.js` - Métodos `executeTest()`, `executeTestAsync()`, `saveEvidences()`

---

### 2. 🗑️ **Sistema de Eliminación con Protección de Archivos**

#### Implementado:
- **Eliminar Proyectos**: Elimina el proyecto y sus suites de la BD, pero NO los archivos de tests
- **Eliminar Suites**: Elimina la suite de la BD, los tests quedan sin suite asignada (suite_id = NULL)
- **Eliminar Tests**: Elimina solo la referencia en la BD, el archivo .txt NO se elimina

#### Características:
- ✅ Botones 🗑️ en cada nivel del árbol (proyectos, suites, tests)
- ✅ Confirmación antes de eliminar
- ✅ Notificaciones de éxito/error
- ✅ Actualización automática de la UI

**Archivos modificados:**
- `database/schema.sql` - `suite_id` ahora permite NULL, ON DELETE SET NULL
- `public/js/main.js` - Funciones `deleteProjectConfirm()`, `deleteSuiteConfirm()`, `deleteTestConfirm()`

---

### 3. 📊 **Evidencias Automáticas**

Ahora se guardan automáticamente en la BD:

| Tipo | Descripción | Archivo Generado |
|------|-------------|------------------|
| **screenshot** | Capturas de pantalla durante la ejecución | Ruta del screenshot en test-results/ |
| **log** | Logs de consola del navegador | `test-results/logs-{executionId}.json` |
| **network** | Requests de red capturados | `test-results/network-{executionId}.json` |
| **performance** | Métricas de rendimiento | `test-results/performance-{executionId}.json` |

---

## 🔄 Flujo Actualizado de Ejecución

### Cuando ejecutas un test desde la suite:

```
1. Usuario hace clic en ▶️ en un test
2. Frontend llama a POST /api/test-items/:id/execute
3. Backend:
   ✅ Crea registro en tabla `executions` (status: 'running')
   ✅ Responde con executionId
   ✅ Ejecuta test en background con el runner
   ✅ Captura logs en tiempo real
   ✅ Guarda screenshots, logs, network, performance
   ✅ Actualiza `executions` con resultado final
   ✅ Crea registros en tabla `evidences`
4. Frontend:
   ✅ Muestra consola de ejecución en dashboard
   ✅ Hace polling cada 2s para obtener logs
   ✅ Muestra resumen final
   ✅ Actualiza estadísticas
```

---

## 📁 Estructura de la Base de Datos Actualizada

### Tabla: `tests`
```sql
suite_id INTEGER,  -- Ahora permite NULL
-- ON DELETE SET NULL (antes era CASCADE)
```

**Comportamiento:**
- Eliminar suite → tests.suite_id = NULL (tests quedan huérfanos)
- Eliminar proyecto → elimina suites → tests.suite_id = NULL

### Tabla: `executions`
```sql
id INTEGER PRIMARY KEY
test_id INTEGER
status TEXT ('running', 'success', 'failed', 'error')
mode TEXT ('auto', 'llm', 'direct')
started_at DATETIME
finished_at DATETIME
duration INTEGER (en milisegundos)
logs TEXT (JSON array de logs)
error_message TEXT
```

### Tabla: `evidences`
```sql
id INTEGER PRIMARY KEY
execution_id INTEGER
type TEXT ('screenshot', 'log', 'network', 'performance', 'report')
file_path TEXT
metadata TEXT (JSON)
created_at DATETIME
```

---

## 🚀 Cómo Aplicar los Cambios

### Opción 1: Script de Migración (Recomendado)

```bash
# Detener el servidor (Ctrl+C)
node scripts/migrate-database.js
npm run web
```

### Opción 2: Manual

```bash
# 1. Detener el servidor
# 2. Eliminar base de datos
rm database/testing_automation.db

# 3. Reiniciar servidor (recreará la BD automáticamente)
npm run web
```

---

## 🎨 Nuevas Características de UI

### Botones de Eliminación

Cada elemento del árbol ahora tiene un botón 🗑️:

- **Proyectos**: 🗑️ (rojo) - Elimina proyecto y suites
- **Suites**: 🗑️ (rojo) - Elimina suite, tests quedan sin suite
- **Tests**: 🗑️ (rojo) - Elimina test de la suite

### Consola de Ejecución en Dashboard

Ahora al ejecutar tests desde el dashboard:
- ✅ Se muestra consola en tiempo real
- ✅ Logs con colores (verde=éxito, rojo=error, azul=info)
- ✅ Auto-scroll
- ✅ Resumen final con duración
- ✅ Botón "Limpiar" para resetear la consola

---

## 📋 Endpoints Actualizados

### Ejecución de Tests
```
POST /api/test-items/:id/execute
Body: { mode: 'auto' | 'llm' | 'direct' }
Response: {
  success: true,
  executionId: 123,
  testId: "execution-123",
  message: "Test iniciado"
}
```

### Polling de Estado
```
GET /api/tests/status/:testId
Response: {
  status: 'running' | 'success' | 'failed' | 'error',
  logs: [...],
  duration: 1234,
  results: { ... }
}
```

### Eliminación
```
DELETE /api/projects/:id
DELETE /api/suites/:id
DELETE /api/test-items/:id
```

---

## ⚠️ Notas Importantes

### Archivos de Tests
- Los archivos `.txt` en `tests/natural/` NUNCA se eliminan automáticamente
- Solo se eliminan las referencias en la base de datos
- Para eliminar archivos físicos, hazlo manualmente

### Tests Sin Suite
- Los tests pueden existir sin estar asignados a una suite (suite_id = NULL)
- Estos "tests huérfanos" aún están en la BD pero no se muestran en el árbol
- Puedes reasignarlos a una suite usando el modal "Agregar Test a Suite"

### Evidencias
- Los archivos de evidencias se guardan en `test-results/`
- Los screenshots siguen la convención del runner
- Los logs, network y performance se guardan como JSON

---

## 🔮 Próximas Mejoras Sugeridas

1. **Vista de Tests Huérfanos**
   - Agregar una sección para ver tests sin suite
   - Permitir reasignar a suites desde esa vista

2. **Modal de Detalles de Test**
   - Mostrar historial completo de ejecuciones
   - Gráfico de tendencia de éxito/fallo
   - Ver evidencias de cada ejecución

3. **Visor de Evidencias**
   - Ver screenshots directamente en la UI
   - Explorar logs de consola
   - Analizar requests de red

4. **Exportación de Reportes**
   - Generar PDF/HTML con resultados
   - Estadísticas por suite/proyecto
   - Comparación de ejecuciones

---

## ✅ Checklist de Verificación

Después de aplicar los cambios, verifica:

- [ ] El servidor inicia correctamente
- [ ] Puedes crear proyectos y suites
- [ ] Puedes agregar tests a suites
- [ ] Los tests se ejecutan y muestran logs en el dashboard
- [ ] Los botones 🗑️ aparecen en el árbol
- [ ] Puedes eliminar tests sin eliminar archivos
- [ ] Las estadísticas se actualizan después de ejecutar tests
- [ ] Las evidencias se guardan en `test-results/`

---

**Versión**: 1.1.0
**Última actualización**: 2025-10-31
