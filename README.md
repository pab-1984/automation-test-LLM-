# 🧪 LLM Testing Automation

> Sistema de testing automatizado universal que combina LLMs con MCP (Model Context Protocol) para crear, ejecutar y mantener tests web y móviles en lenguaje natural.

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/pab-1984/automation-test-LLM)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## ✨ Características Principales

- 🤖 **Agnóstico de LLM**: Soporta Gemini, Ollama, OpenAI, Claude - cambia sin modificar tests
- 💬 **Tests en Lenguaje Natural**: Escribe tests sin YAML, sin CSS selectors, solo español
- 🌐 **Interfaz Web Completa**: Dashboard con IA integrada, ejecución en tiempo real y reportes visuales
- 🔌 **Protocolo MCP**: Integración con Chrome DevTools y mobile-mcp para web y móvil
- 📱 **Testing Móvil Completo**: ✅ Soporte para Android e iOS con detección automática de dispositivos
- 🔌 **Testing de APIs REST**: ✅ Cliente HTTP completo con autenticación, validaciones avanzadas y chaining
- 🎯 **Multi-Interface**: CLI interactiva, CLI natural, API REST, Interfaz Web
- 📊 **Reportes Ricos**: Logs de consola, network requests, performance metrics, screenshots
- 🔄 **Compilación Inteligente**: Sistema de caché para tests 35x más rápidos
- 🗂️ **Gestión Completa**: Proyectos, suites, tests y dispositivos móviles desde la web

---

## 🚀 Quick Start

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar LLM (primera vez)
npm run setup

# 3. Ejecutar tests

# Opción A: Tests en lenguaje natural (⭐ Recomendado)
npm run test-natural "Navega a google.com y busca 'automation'"

# Opción B: Crear test con wizard
npm run create-test

# Opción C: Interfaz web
npm run web
# Abre http://localhost:3001

# Opción D: CLI interactiva
npm run cli-test

# Opción E: Ejecutar YAML directamente
npm test tests/suites/mi-test.yml
```

---

## 🎯 4 Formas de Crear y Ejecutar Tests

### 1️⃣ Tests en Lenguaje Natural (Sin YAML) ⭐ **NUEVO**

**La forma más simple**: Describe qué quieres probar en español, el LLM lo ejecuta.

```bash
# Ejecutar directo
npm run test-natural "Ve a wikipedia.org y busca 'Model Context Protocol'"

# Desde archivo de texto
npm run test-natural tests/natural/mi-test.txt

# Desde CLI interactiva
npm run cli-test
# → 💬 Tests en Lenguaje Natural
```

**Características**:
- ✅ SIN YAML, SIN selectores CSS
- ✅ El LLM identifica elementos por contexto usando MCP
- ✅ **Soporte WEB y MÓVIL** - Crea tests para apps Android/iOS en lenguaje natural
- ✅ Opciones avanzadas: screenshots automáticos, logs de consola, network requests, performance
- ✅ Wizard interactivo paso a paso
- ✅ Selector de dispositivo integrado para tests móviles

**Ejemplo - Test Móvil en Lenguaje Natural**:
```
TEST: Calculadora Android
Plataforma: 📱 Móvil (mobile)
Dispositivo: DEVICE_ID_123

Pasos:
Abre la calculadora

Presiona el botón "5"
Presiona el botón "+"
Presiona el botón "3"
Presiona el botón "="

Verifica que el resultado sea "8"
Toma un screenshot
```

**Ver documentación completa**: [TESTS_LENGUAJE_NATURAL.md](TESTS_LENGUAJE_NATURAL.md)

---

### 2️⃣ Wizard de Creación (Genera YAML con IA)

**Semi-asistido**: El LLM te ayuda a generar YAML optimizado.

```bash
npm run create-test
```

**Flujo**:
1. Describes qué quieres probar en lenguaje natural
2. El LLM genera YAML compilado (35x más rápido)
3. Opcionalmente ejecuta y refina con feedback

**Ver documentación**: [GUIA_RAPIDA.md](GUIA_RAPIDA.md)

---

### 3️⃣ Interfaz Web con IA 🌐

**Visual y completa**: Dashboard con todo integrado.

```bash
npm run web
# Abre http://localhost:3000
```

**5 Tabs**:
- 📊 **Dashboard**: Estado del sistema, tests activos, métricas
- 🧪 **Explorador**: Gestión completa de proyectos, suites y tests con detección automática de plataforma
- 💬 **Crear Test**: Tests en lenguaje natural (WEB y MÓVIL) con selector de dispositivos
- ▶️ **Ejecutar**: Seleccionar y ejecutar tests con logs en tiempo real
- 📈 **Resultados**: Reportes visuales con screenshots, logs y evidencias

**Características**:
- ✅ **Tests naturales móviles**: Crear tests para Android/iOS en lenguaje natural
- ✅ **Detección automática**: El explorador detecta si un test es web o móvil y selecciona dispositivo
- ✅ **Selector de plataforma**: Alterna entre WEB (🌐) y MÓVIL (📱) desde el header
- ✅ **Gestión de dispositivos**: Lista automática de dispositivos Android e iOS conectados
- ✅ **Reportes enriquecidos**: Ver resultados con evidencias visuales, logs y métricas
- ✅ **Badges visuales**: Identificación clara de plataforma en todos los tests
- ✅ Ejecución con visualización de logs en streaming
- ✅ API REST completa

---

### 4️⃣ YAML Manual (Control Total)

**Para usuarios técnicos**: Escribe YAML directamente.

```yaml
# tests/suites/login.yml
suite: "Test de Login"
baseUrl: "https://mi-app.com"
timeout: 30000

tests:
  - name: "Login exitoso"
    steps:
      - action: navigate
        url: "/login"

      - action: fill
        selector: "input[name='email']"
        value: "test@example.com"

      - action: click
        selector: "button[type='submit']"

      - action: verify
        selector: ".welcome-message"
```

**Ejecutar**:
```bash
npm test tests/suites/login.yml
```

---

## 🏗️ Arquitectura

### Componentes Principales

```
automation-test-LLM/
├── config/                      # Configuración por LLM
│   ├── llm.config.json         # LLM activo
│   └── providers/              # Gemini, Ollama, OpenAI, Claude
│
├── prompts/                    # Prompts del sistema
│   ├── system.md              # Prompt universal
│   └── system-simple.md       # Prompt optimizado
│
├── runners/
│   ├── core/
│   │   ├── runner-core.js     # ⭐ Núcleo principal (LLM + MCP)
│   │   ├── mcp-client.js      # Cliente MCP para Chrome DevTools
│   │   └── api-client.js      # ⭐ Cliente HTTP para APIs REST
│   ├── adapters/              # Adapters por LLM
│   │   ├── gemini.adapter.js
│   │   ├── ollama.adapter.js
│   │   ├── openai.adapter.js
│   │   └── anthropic.adapter.js
│   ├── actions/
│   │   ├── browser-actions.js # Acciones web via MCP
│   │   ├── mobile-actions.js  # Acciones móviles via mobile-mcp
│   │   └── api-actions.js     # ⭐ Acciones API REST
│   ├── utils/
│   │   └── element-finder.js  # Búsqueda híbrida (local + LLM)
│   └── test-generator.js      # Generación de tests con IA
│
├── server/                     # 🌐 Backend (Arquitectura modular)
│   ├── controllers/           # Lógica de negocio
│   │   ├── systemController.js
│   │   ├── testController.js
│   │   ├── naturalController.js
│   │   └── resultsController.js
│   ├── routes/                # Endpoints API REST
│   │   ├── index.js
│   │   ├── api.js
│   │   ├── tests.js
│   │   ├── natural.js
│   │   └── results.js
│   ├── middleware/            # Middleware Express
│   │   └── errorHandler.js
│   └── app.js                 # Servidor Express principal
│
├── public/                    # 🎨 Frontend (Assets estáticos)
│   ├── index.html            # Interfaz principal
│   ├── css/
│   │   └── styles.css        # Estilos modulares
│   └── js/
│       └── main.js           # Lógica de UI
│
├── scripts/
│   ├── cli.js                 # CLI interactiva
│   ├── create-test.js         # Wizard de creación
│   ├── test-natural.js        # ⭐ Tests lenguaje natural
│   ├── web-server.js          # 🌐 Wrapper del servidor web
│   └── test.js                # Ejecutor de YAML
│
├── tests/
│   ├── suites/                # Tests YAML
│   │   ├── web/              # Tests web
│   │   ├── mobile/           # Tests móviles (Android/iOS)
│   │   └── api/              # ⭐ Tests de APIs REST
│   ├── natural/               # ⭐ Tests en lenguaje natural
│   ├── results/               # Reportes generados
│   └── screenshots/           # Capturas
│
└── test-mobile-mcp.js         # 📱 Prueba mobile-mcp (Fase 1)
```

### Flujo de Ejecución

```
┌─────────────┐
│ Test Input  │  (YAML, Natural Language, o Web Form)
└──────┬──────┘
       │
       v
┌─────────────────┐
│ Universal Runner│
│  runner-core.js │
└──────┬──────────┘
       │
       ├──> LLM Adapter (Gemini/Ollama/OpenAI/Claude)
       │         │
       │         v
       │    ┌──────────────┐
       │    │ Interpreta   │
       │    │ Instrucciones│
       │    └──────────────┘
       │
       └──> MCP Client
                │
                v
         ┌──────────────────┐
         │ chrome-devtools  │  (Web)
         │ mobile-mcp       │  (Mobile - en desarrollo)
         └──────────────────┘
                │
                v
         ┌──────────────────┐
         │ Browser/Device   │
         └──────────────────┘
```

---

## 📱 Testing Móvil Completo ✅

**Estado**: ✅ **Completamente funcional** - Android e iOS listos para producción

### 🎯 Características Implementadas

#### ✅ CLI para Testing Móvil
```bash
# Verificar configuración
npm run check:mobile

# Listar dispositivos conectados
npm run mobile-devices

# Ejecutar tests móviles
npm run test-mobile tests/suites/mobile/android/calculator-tests.yml

# Ejecutar test específico por plataforma
npm run test:mobile:android    # Solo Android
npm run test:mobile:ios        # Solo iOS
npm run test:mobile:all        # Todos los tests
```

#### ✅ Interfaz Web para Testing Móvil
- 📱 **Selector de plataforma** (Web/Mobile) en el dashboard
- 🔍 **Detección automática** de dispositivos Android e iOS conectados
- 📋 **Gestión de test suites** con soporte para tests móviles
- ▶️ **Ejecución desde la web** de tests en dispositivos físicos
- 📸 **Screenshots automáticos** de dispositivos móviles
- 💬 **Tests naturales móviles**: Crear tests en lenguaje natural con selector de dispositivo integrado
- 🎯 **Detección automática de plataforma**: El explorador identifica tests web/móvil y ejecuta en el dispositivo correcto
- 📊 **Reportes enriquecidos**: Visualización completa con evidencias, logs y métricas de mobile

#### ✅ API REST Completa
- `GET /api/mobile/devices` - Listar dispositivos conectados
- `GET /api/mobile/devices/:id` - Info detallada del dispositivo
- `POST /api/mobile/devices/:id/screenshot` - Capturar screenshot
- `POST /api/tests/run` - Ejecutar tests con `platform=mobile` y `deviceId`

### 🚀 Quick Start - Testing Móvil

#### 1. Verificar Setup
```bash
npm run check:mobile
```
Este comando verifica:
- ✅ ADB instalado y en PATH
- ✅ Android SDK configurado
- ✅ Dispositivos conectados con USB debugging habilitado

#### 2. Conectar Dispositivo
- **Android**: Habilita USB Debugging en opciones de desarrollador
- **iOS**: Conecta via Xcode o simulador

#### 3. Ejecutar Tests
```bash
# Desde CLI
npm run test-mobile tests/suites/mobile/android/calculator-tests.yml --device=<DEVICE_ID>

# Desde Interfaz Web
npm run web
# Abre http://localhost:3001
# Selecciona plataforma "Mobile"
# Elige tu dispositivo
# Ejecuta tests desde el dashboard
```

### 📦 86 Test Cases Incluidos
- 🤖 **Android**: 68 tests (Calculator, System, UI, E-commerce)
- 🍎 **iOS**: 18 tests (Calculator, Native apps)

Ver documentación completa: [tests/suites/mobile/README.md](tests/suites/mobile/README.md)

### Roadmap Mobile - COMPLETADO ✅
```
Fase 1: Setup y Configuración        ████████████ 100% ✅
Fase 2: Infraestructura Core          ████████████ 100% ✅
Fase 3: Element Finder Avanzado       ████████████ 100% ✅
Fase 4: Test Generator Mobile         ████████████ 100% ✅
Fase 5: Testing Nativo (86 tests)     ████████████ 100% ✅
Fase 6: Interfaz Web Integrada        ████████████ 100% ✅
```

### 🔧 Tecnologías Mobile
- **mobile-mcp**: Protocolo MCP para control de dispositivos móviles
- **ADB (Android Debug Bridge)**: Comunicación con dispositivos Android
- **Xcode simctl** (macOS): Control de simuladores iOS
- **Detección automática**: Find ADB en rutas estándar del Android SDK

---

## 🔌 Testing de APIs REST Completo ✅

**Estado**: ✅ **Completamente funcional** - Sistema completo para testing de APIs REST/GraphQL

### 🎯 Características Implementadas

#### ✅ Cliente HTTP Completo
- 🌐 **Todos los métodos HTTP**: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
- 🔐 **Autenticación múltiple**: Bearer Token, Basic Auth, API Key, OAuth2
- 🔄 **Retry automático**: Reintentos configurables en errores 5xx
- ⏱️ **Rate limiting**: Control de requests por segundo
- 📝 **Variables y chaining**: Extraer valores y usarlos en requests posteriores
- 📊 **Validaciones avanzadas**: Status, schema, headers, response time, JSON path

#### ✅ Acciones API Disponibles

**Requests HTTP**:
```yaml
- action: api.get         # GET request
- action: api.post        # POST request con body
- action: api.put         # PUT request (actualización completa)
- action: api.patch       # PATCH request (actualización parcial)
- action: api.delete      # DELETE request
- action: api.head        # HEAD request
- action: api.options     # OPTIONS request
```

**Validaciones**:
```yaml
- action: api.validateStatus       # Validar código HTTP (200, 404, etc.)
- action: api.validateResponse     # Validar estructura (array, object, contains)
- action: api.validateSchema       # Validar JSON schema completo
- action: api.validateHeaders      # Validar headers de respuesta
- action: api.validateResponseTime # Validar tiempo de respuesta
- action: api.validateBody         # Validar valores con JSON path
```

**Variables y Chaining**:
```yaml
- action: api.extractValue         # Extraer valor de respuesta y guardarlo
- action: api.setVariable          # Establecer variable manual
- action: api.getVariable          # Obtener variable guardada
```

**Autenticación**:
```yaml
- action: api.setAuth             # Configurar autenticación
- action: api.clearAuth           # Limpiar autenticación
```

**Configuración**:
```yaml
- action: api.setBaseURL          # Cambiar baseURL dinámicamente
- action: api.setTimeout          # Configurar timeout
```

**Utilidades**:
```yaml
- action: api.wait                # Esperar N milisegundos
- action: api.log                 # Log en consola con variables
```

### 📝 Ejemplo Completo - API Testing

#### Test Básico - CRUD de Usuarios
```yaml
suite: "API Tests - Users CRUD"
description: "Tests de API REST para gestión de usuarios"
baseUrl: "https://jsonplaceholder.typicode.com"
platform: "api"
timeout: 10000

tests:
  - name: "GET - Listar usuarios"
    steps:
      - action: api.get
        url: "/users"
        description: "Obtener todos los usuarios"

      - action: api.validateStatus
        expected: 200

      - action: api.validateResponse
        isArray: true
        contains:
          - id
          - name
          - email

  - name: "POST - Crear usuario"
    steps:
      - action: api.post
        url: "/users"
        headers:
          Content-Type: "application/json"
        body:
          name: "Test User"
          email: "test@example.com"

      - action: api.validateStatus
        expected: 201

      - action: api.extractValue
        path: "id"
        saveTo: "userId"

      - action: api.log
        message: "Usuario creado con ID"
        value: "{{userId}}"
```

#### Test Avanzado - Schema Validation y Chaining
```yaml
suite: "API Tests - Products (Advanced)"
baseUrl: "https://fakestoreapi.com"
platform: "api"

# Configuración de retry
retry:
  enabled: true
  maxRetries: 2
  retryDelay: 1000

# Rate limiting
rateLimit:
  enabled: false
  requestsPerSecond: 5

tests:
  - name: "GET - Producto con schema validation"
    steps:
      - action: api.get
        url: "/products/1"

      - action: api.validateStatus
        expected: 200

      - action: api.validateSchema
        schema:
          type: "object"
          required:
            - id
            - title
            - price
          properties:
            id:
              type: "number"
            title:
              type: "string"
            price:
              type: "number"

      - action: api.validateBody
        path: "price"
        greaterThan: 0

  - name: "POST - Crear y usar en siguiente request"
    steps:
      - action: api.post
        url: "/products"
        body:
          title: "Test Product"
          price: 99.99
          category: "electronics"

      - action: api.extractValue
        path: "id"
        saveTo: "productId"

      - action: api.wait
        ms: 500

      - action: api.get
        url: "/products/{{productId}}"
        description: "Usar ID del producto creado"

      - action: api.validateStatus
        expected: 200
```

#### Test de Autenticación
```yaml
suite: "API Tests - Authentication"
baseUrl: "https://reqres.in/api"
platform: "api"

tests:
  - name: "POST - Login y usar token"
    steps:
      - action: api.post
        url: "/login"
        body:
          email: "eve.holt@reqres.in"
          password: "cityslicka"

      - action: api.validateStatus
        expected: 200

      - action: api.extractValue
        path: "token"
        saveTo: "authToken"

      - action: api.setAuth
        type: "bearer"
        token: "{{authToken}}"

      - action: api.get
        url: "/users/2"
        description: "Request con Bearer token automático"

      - action: api.validateStatus
        expected: 200

      - action: api.clearAuth
```

### 🚀 Quick Start - Testing de APIs

#### 1. Crear Test API
```bash
# Opción 1: Crear archivo YAML manualmente
# En tests/suites/api/mi-api.yml

# Opción 2: Desde interfaz web
npm run web
# Abre http://localhost:3001
# Selecciona plataforma "API"
# Crea tu test
```

#### 2. Ejecutar Tests API
```bash
# Ejecutar test específico
npm test tests/suites/api/users-api.yml

# Desde interfaz web
npm run web
# Selecciona plataforma "API"
# Ejecuta desde el dashboard
```

### 📦 Tests de Ejemplo Incluidos

El framework incluye **3 suites completas** de ejemplo en `tests/suites/api/`:

1. **users-api.yml** (7 tests) - CRUD básico
   - GET lista de usuarios
   - GET usuario específico
   - POST crear usuario
   - PUT actualizar completo
   - PATCH actualización parcial
   - DELETE eliminar usuario
   - Manejo de 404

2. **auth-api.yml** (7 tests) - Autenticación
   - Login exitoso con extracción de token
   - Login fallido (validación de errores)
   - Registro de usuarios
   - Bearer token authentication
   - API Key authentication
   - Basic authentication
   - Requests sin autenticación

3. **products-api.yml** (9 tests) - Características avanzadas
   - Paginación de resultados
   - Schema validation completo
   - Request chaining con variables
   - Validación de response time
   - Validación de headers personalizados
   - Filtrado por categoría
   - Múltiples requests en secuencia
   - JSON path con arrays

### ✨ Características Destacadas

#### 🔗 Request Chaining
Extrae valores de una respuesta y úsalos en requests posteriores:
```yaml
- action: api.post
  url: "/users"
  body: { name: "John" }

- action: api.extractValue
  path: "id"
  saveTo: "userId"

- action: api.get
  url: "/users/{{userId}}"  # Usa el ID extraído
```

#### 📋 JSON Path Avanzado
Accede a valores anidados y arrays:
```yaml
- action: api.validateBody
  path: "data.items[0].price"
  greaterThan: 0

- action: api.extractValue
  path: "results[2].name"
  saveTo: "thirdItemName"
```

#### 🔐 Múltiples Tipos de Autenticación
```yaml
# Bearer Token
- action: api.setAuth
  type: "bearer"
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Basic Auth
- action: api.setAuth
  type: "basic"
  username: "admin"
  password: "secret"

# API Key en Header
- action: api.setAuth
  type: "apikey"
  key: "X-API-Key"
  value: "my-secret-key"
  in: "header"

# API Key en Query
- action: api.setAuth
  type: "apikey"
  key: "api_key"
  value: "my-secret-key"
  in: "query"
```

#### ⏱️ Validación de Performance
```yaml
- action: api.validateResponseTime
  maxMs: 2000  # Falla si tarda más de 2 segundos
```

#### 📊 JSON Schema Validation
```yaml
- action: api.validateSchema
  schema:
    type: "object"
    required: ["id", "name", "email"]
    properties:
      id:
        type: "number"
      name:
        type: "string"
        minLength: 1
      email:
        type: "string"
        pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
```

### 🔧 Tecnologías API Testing
- **axios**: Cliente HTTP con interceptors para autenticación
- **JSON Schema Validation**: Validación recursiva de estructuras
- **Variable Replacement**: Sistema de plantillas {{variable}}
- **Retry Logic**: Reintentos automáticos con backoff exponencial
- **Rate Limiting**: Cola de requests con throttling
- **Request History**: Últimas 50 requests para debugging

---

## ⚙️ Configuración

### LLMs Soportados

| LLM | Costo | Privacidad | Velocidad | Setup |
|-----|-------|------------|-----------|--------|
| **Gemini** | Gratis* | ⚠️ Cloud | 🚀 Rápido | Fácil |
| **Ollama** | Gratis | ✅ Local | 🐢 Medio | Medio |
| **OpenAI** | 💰 Pago | ⚠️ Cloud | 🚀 Rápido | Fácil |
| **Claude** | 💰 Pago | ⚠️ Cloud | 🚀 Muy Rápido | Fácil |

\* Gemini tiene cuota gratuita limitada

### Cambiar de LLM

```bash
# Ver LLM actual
npm run config

# Cambiar LLM
npm run switch-llm
# Opciones: gemini, ollama, openai, claude

# Cambiar directo
npm run switch-llm gemini
```

### Variables de Entorno

```bash
# .env (crear en root)
GEMINI_API_KEY=tu_key_aqui
OPENAI_API_KEY=tu_key_aqui
ANTHROPIC_API_KEY=tu_key_aqui
```

**Obtener API Keys**:
- Gemini: https://makersuite.google.com/app/apikey
- OpenAI: https://platform.openai.com/api-keys
- Claude: https://console.anthropic.com/

---

## 📝 Comandos Disponibles

### Ejecución de Tests

```bash
npm test [test-path]              # Ejecutar test YAML
npm run test-natural [instrucción] # Test en lenguaje natural
npm run test-direct [test-path]   # Ejecutar sin LLM (directo)
npm run test-llm [test-path]      # Ejecutar con LLM
npm run test-auto [test-path]     # Auto-detectar modo
```

### Creación de Tests

```bash
npm run create-test               # Wizard con IA (genera YAML)
npm run cli-test                  # CLI interactiva (menú completo)
npm run web                       # Interfaz web (puerto 3001)
```

### Configuración

```bash
npm run setup                     # Setup inicial
npm run config                    # Ver configuración actual
npm run switch-llm [provider]     # Cambiar LLM
npm run status                    # Estado del sistema
```

### Comparación

```bash
npm run compare [test-path]       # Ejecutar con múltiples LLMs
```

---

## 📊 API REST (Interfaz Web)

### Endpoints Disponibles

```bash
# Sistema
GET  /api/status                 # Estado del sistema

# Tests YAML
GET  /api/tests                  # Lista de tests YAML
POST /api/tests/create           # Crear test desde lenguaje natural
POST /api/tests/run              # Ejecutar test
GET  /api/tests/status/:testId   # Estado de ejecución (polling)

# Tests Naturales
GET  /api/tests/natural          # Lista tests naturales
POST /api/tests/natural/create   # Crear test natural
POST /api/tests/natural/run      # Ejecutar test natural

# Resultados
GET  /api/results                # Lista de reportes
GET  /api/results/:filename      # Ver reporte específico
```

---

## 🎓 Ejemplos

### Ejemplo 1: Test Natural Simple

```bash
npm run test-natural "Navega a wikipedia.org, busca 'testing' y verifica resultados"
```

### Ejemplo 2: Test Natural con Opciones

```javascript
// tests/natural/mi-test.txt
TEST: Búsqueda en Wikipedia

Navega a https://wikipedia.org
Busca el cuadro de búsqueda principal
Escribe "Model Context Protocol"
Haz click en buscar
Verifica que aparezcan resultados

# Opciones
{
  "screenshotPerStep": true,
  "captureLogs": true,
  "performanceMetrics": true
}
```

```bash
npm run test-natural tests/natural/mi-test.txt
```

### Ejemplo 3: Crear Test con IA (Web)

1. Abre `http://localhost:3001`
2. Tab "💬 Tests Naturales"
3. Completa el formulario:
   - Nombre: "Test de búsqueda"
   - URL: "https://google.com"
   - Instrucciones: "Busca 'automation testing' y verifica resultados"
4. Click "▶️ Guardar y Ejecutar"

---

## 🔧 Tecnologías

- **Node.js** - Runtime
- **MCP SDK** - Model Context Protocol para automation
- **chrome-devtools-mcp** - Control de Chrome via MCP
- **mobile-mcp** - Control de dispositivos móviles via MCP
- **LLM APIs** - Gemini, OpenAI, Claude, Ollama
- **js-yaml** - Parsing de tests YAML
- **inquirer** - CLIs interactivas

---

## 📚 Documentación Adicional

- [GUIA_RAPIDA.md](GUIA_RAPIDA.md) - Guía rápida de uso con wizard
- [TESTS_LENGUAJE_NATURAL.md](TESTS_LENGUAJE_NATURAL.md) - Tests sin YAML
- [ESTRUCTURA.md](ESTRUCTURA.md) - Arquitectura detallada
- [CHECKPOINT_MOBILE_INTEGRATION.md](CHECKPOINT_MOBILE_INTEGRATION.md) - Estado integración mobile

---

## 🗺️ Roadmap

### ✅ Completado

- [x] Sistema agnóstico de LLM (Gemini, Ollama, OpenAI, Claude)
- [x] Tests en lenguaje natural sin YAML
- [x] Interfaz web completa con IA integrada
- [x] Wizard de creación de tests con IA
- [x] Compilación inteligente (35x más rápido)
- [x] Búsqueda híbrida de elementos (local + LLM)
- [x] Reportes ricos (logs, network, performance)
- [x] API REST completa para la interfaz web
- [x] Integración MCP con Chrome DevTools
- [x] **Testing móvil completo (Android/iOS)**
  - [x] Fase 1: Setup y configuración
  - [x] Fase 2: Infraestructura core
  - [x] Fase 3-6: Implementación completa (86 tests)
  - [x] Interfaz web integrada
- [x] **Testing de APIs REST**
  - [x] Cliente HTTP con axios
  - [x] Todos los métodos HTTP (GET, POST, PUT, PATCH, DELETE)
  - [x] Autenticación múltiple (Bearer, Basic, API Key, OAuth2)
  - [x] Validaciones avanzadas (status, schema, headers, response time)
  - [x] Request chaining y variables
  - [x] Retry logic y rate limiting
  - [x] 23 tests de ejemplo en 3 suites

### 🔮 Futuro

- [ ] Tests paralelos
- [ ] Integración CI/CD (GitHub Actions, GitLab CI)
- [ ] Dashboard de métricas avanzadas
- [ ] Recorder web interactivo
- [ ] Soporte multi-idioma
- [ ] Visual regression testing
- [ ] Tests de accesibilidad (a11y)
- [ ] Testing GraphQL (extensión del módulo API)
- [ ] Contract testing (Pact)

---

## 🤝 Contribuir

Contribuciones son bienvenidas! Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles.

---

## 👤 Autor

**Pablo Flores**

- GitHub: [@pab-1984](https://github.com/pab-1984)

---

## 🌟 Show your support

Si este proyecto te ayudó, dale una ⭐️!

---

**Última actualización**: 2025-11-04 | **Versión**: 1.1.0 - API Testing Release
