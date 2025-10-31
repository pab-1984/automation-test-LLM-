# Sistema de Base de Datos - Testing Automation Framework

## Resumen de la Implementación

Se ha implementado un sistema completo de base de datos SQLite para gestionar proyectos, test suites, tests, ejecuciones y evidencias.

---

## Estructura de la Base de Datos

### Tablas Implementadas

#### 1. **projects**
Almacena los proyectos de testing.
```sql
- id (INTEGER PRIMARY KEY)
- name (TEXT UNIQUE)
- description (TEXT)
- created_at (DATETIME)
- updated_at (DATETIME)
```

#### 2. **test_suites**
Suites de tests asociadas a proyectos.
```sql
- id (INTEGER PRIMARY KEY)
- project_id (INTEGER FK -> projects)
- name (TEXT)
- description (TEXT)
- created_at (DATETIME)
- updated_at (DATETIME)
```

#### 3. **tests**
Tests individuales (natural o YAML) asociados a suites.
```sql
- id (INTEGER PRIMARY KEY)
- suite_id (INTEGER FK -> test_suites)
- name (TEXT)
- type (TEXT: 'natural' | 'yaml')
- file_path (TEXT)
- description (TEXT)
- url (TEXT)
- created_at (DATETIME)
- updated_at (DATETIME)
```

#### 4. **executions**
Registro de todas las ejecuciones de tests.
```sql
- id (INTEGER PRIMARY KEY)
- test_id (INTEGER FK -> tests)
- status (TEXT: 'running' | 'success' | 'failed' | 'error')
- mode (TEXT: 'auto' | 'llm' | 'direct')
- started_at (DATETIME)
- finished_at (DATETIME)
- duration (INTEGER)
- logs (TEXT)
- error_message (TEXT)
```

#### 5. **evidences**
Evidencias generadas durante las ejecuciones.
```sql
- id (INTEGER PRIMARY KEY)
- execution_id (INTEGER FK -> executions)
- type (TEXT: 'screenshot' | 'log' | 'network' | 'performance' | 'report')
- file_path (TEXT)
- metadata (TEXT JSON)
- created_at (DATETIME)
```

---

## Servicios Implementados

### DatabaseService (`database/db.js`)

Servicio singleton que provee todos los métodos CRUD:

#### Proyectos
- `getAllProjects()`
- `getProjectById(id)`
- `createProject(name, description)`
- `updateProject(id, name, description)`
- `deleteProject(id)`

#### Test Suites
- `getAllSuites()`
- `getSuitesByProject(projectId)`
- `getSuiteById(id)`
- `createSuite(projectId, name, description)`
- `updateSuite(id, name, description)`
- `deleteSuite(id)`

#### Tests
- `getAllTests()`
- `getTestsBySuite(suiteId)`
- `getTestById(id)`
- `createTest(suiteId, name, type, filePath, description, url)`
- `updateTest(id, name, description, url)`
- `deleteTest(id)`

#### Ejecuciones
- `getAllExecutions()`
- `getExecutionsByTest(testId)`
- `getExecutionById(id)`
- `createExecution(testId, mode)`
- `updateExecution(id, status, duration, logs, errorMessage)`
- `updateExecutionLogs(id, logs)`

#### Evidencias
- `getEvidencesByExecution(executionId)`
- `createEvidence(executionId, type, filePath, metadata)`

#### Estadísticas
- `getStatistics()` - Estadísticas globales
- `getProjectStatistics(projectId)` - Estadísticas por proyecto

---

## API REST Endpoints

### Proyectos (`/api/projects`)
```
GET    /api/projects           - Listar todos los proyectos
GET    /api/projects/:id       - Obtener proyecto específico
POST   /api/projects           - Crear nuevo proyecto
PUT    /api/projects/:id       - Actualizar proyecto
DELETE /api/projects/:id       - Eliminar proyecto
```

### Test Suites (`/api/suites`)
```
GET    /api/suites                    - Listar todas las suites
GET    /api/suites/project/:projectId - Listar suites de un proyecto
GET    /api/suites/:id                - Obtener suite específica
POST   /api/suites                    - Crear nueva suite
PUT    /api/suites/:id                - Actualizar suite
DELETE /api/suites/:id                - Eliminar suite
```

### Tests (`/api/test-items`)
```
GET    /api/test-items                - Listar todos los tests
GET    /api/test-items/suite/:suiteId - Listar tests de una suite
GET    /api/test-items/:id            - Obtener test específico
POST   /api/test-items                - Agregar test a suite
PUT    /api/test-items/:id            - Actualizar test
DELETE /api/test-items/:id            - Eliminar test de suite
POST   /api/test-items/:id/execute    - Ejecutar test
```

---

## Interfaz de Usuario

### Cambios en el Dashboard

#### 1. **Sidebar Lateral (Panel Izquierdo)**
- **Sección de Proyectos**:
  - Lista todos los proyectos disponibles
  - Botón "+ Nuevo Proyecto" para crear proyectos
  - Proyecto activo marcado visualmente

- **Sección de Test Suites**:
  - Lista las suites del proyecto seleccionado
  - Muestra contador de tests por suite
  - Botón "+ Nueva Suite" para crear suites
  - Suite activa marcada visualmente

#### 2. **Header Compacto**
- Título de la aplicación a la izquierda
- Selector de modelo LLM (dropdown) a la derecha
- Diseño minimalista y profesional

#### 3. **Dashboard Principal**
- **Card de Suite Actual**:
  - Información de la suite seleccionada
  - Botón "Agregar Test a Suite"

- **Lista de Tests**:
  - Muestra todos los tests de la suite actual
  - Icono diferenciador (💬 natural / 📄 YAML)
  - Estadísticas de ejecución por test
  - Botón "Ejecutar" individual

#### 4. **Modal de Agregar Tests**
- Selector de tipo de test (Natural / YAML)
- Lista de tests disponibles
- Vista previa del test seleccionado
- Confirmación de agregado a la suite

---

## Flujo de Trabajo

### 1. Crear Proyecto
1. Click en "+ Nuevo Proyecto" en el sidebar
2. Ingresar nombre y descripción
3. El proyecto se agrega a la base de datos

### 2. Crear Test Suite
1. Seleccionar un proyecto
2. Click en "+ Nueva Suite"
3. Ingresar nombre y descripción
4. La suite se asocia al proyecto

### 3. Agregar Tests a Suite
1. Seleccionar una suite
2. Click en "Agregar Test a Suite"
3. Seleccionar tipo (Natural o YAML)
4. Elegir test de la lista disponible
5. Confirmar agregado

### 4. Ejecutar Tests
1. Seleccionar suite con tests
2. Click en "Ejecutar" en un test específico
3. El sistema registra la ejecución en la BD
4. Se pueden ver estadísticas históricas

---

## Características Principales

✅ **Gestión Completa de Proyectos**
- Crear, editar y eliminar proyectos
- Organización jerárquica de tests

✅ **Test Suites Organizadas**
- Agrupar tests por funcionalidad
- Contador automático de tests por suite

✅ **Integración con Tests Existentes**
- Los tests naturales y YAML se pueden agregar a suites
- No se duplican archivos, solo referencias

✅ **Historial de Ejecuciones**
- Cada ejecución se registra con timestamp
- Métricas de éxito/fallo por test
- Logs completos almacenados

✅ **Estadísticas en Tiempo Real**
- Tasa de éxito por test
- Total de ejecuciones
- Estadísticas por proyecto

✅ **Interfaz Mejorada**
- Sidebar oscuro profesional
- Header compacto
- Navegación intuitiva
- Sistema de notificaciones

---

## Datos Iniciales

La base de datos se crea con:
- 1 proyecto por defecto: "Proyecto Principal"
- 2 suites por defecto:
  - "Regression Tests"
  - "Smoke Tests"

---

## Archivos Creados/Modificados

### Backend
```
database/
  ├── schema.sql              # Esquema de la BD
  ├── db.js                   # Servicio de BD
  └── testing_automation.db   # Base de datos SQLite (auto-generada)

server/
  ├── controllers/
  │   ├── projectController.js    # CRUD proyectos
  │   ├── suiteController.js      # CRUD suites
  │   └── testItemController.js   # CRUD tests
  ├── routes/
  │   ├── projects.js            # Rutas proyectos
  │   ├── suites.js              # Rutas suites
  │   ├── test-items.js          # Rutas tests
  │   └── index.js               # ✏️ Actualizado
  └── app.js                     # ✏️ Inicializa BD
```

### Frontend
```
public/
  ├── index.html       # ✏️ Sidebar + Modal
  ├── css/
  │   └── styles.css   # ✏️ Estilos sidebar + modal
  └── js/
      └── main.js      # ✏️ Lógica completa de BD
```

---

## Uso

### Iniciar el Servidor
```bash
npm run web
```

### Acceder a la Aplicación
```
http://localhost:3001
```

### Endpoints de Prueba

**Obtener todos los proyectos:**
```bash
curl http://localhost:3001/api/projects
```

**Crear un proyecto:**
```bash
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "Mi Proyecto", "description": "Descripción"}'
```

**Obtener suites de un proyecto:**
```bash
curl http://localhost:3001/api/suites/project/1
```

---

## Próximos Pasos (Recomendados)

1. **Integración con Runner Existente**
   - Conectar `executeTestItem()` con el runner de tests
   - Actualizar BD automáticamente después de ejecutar

2. **Modal de Detalles de Test**
   - Mostrar historial completo de ejecuciones
   - Gráficos de tendencia de éxito/fallo

3. **Gestión de Evidencias**
   - Guardar screenshots automáticamente
   - Asociar evidencias a ejecuciones

4. **Exportación de Reportes**
   - Generar reportes por suite
   - Exportar estadísticas en PDF/HTML

5. **Filtros y Búsqueda**
   - Filtrar tests por tipo
   - Buscar tests en suites
   - Ordenar por fecha, nombre, éxito

---

## Notas Técnicas

- **Base de Datos**: SQLite (archivo local, no requiere servidor)
- **ORM**: better-sqlite3 (síncrono, más rápido)
- **Cascada**: Eliminar proyecto → elimina suites → elimina tests → elimina ejecuciones
- **Índices**: Creados en FK para mejorar performance
- **Transacciones**: Automáticas en better-sqlite3

---

**Última actualización**: 2025-10-30
**Versión**: 1.0.0
