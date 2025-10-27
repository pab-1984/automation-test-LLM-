# 🧪 Testing Automatizado con LLM + Chrome DevTools MCP

Sistema de testing automatizado que permite ejecutar pruebas web en lenguaje natural.


# 🏗️ Estructura Universal de Testing Automatizado

Esta arquitectura te permite **cambiar de LLM sin modificar tus tests**.

---

## 📁 Estructura de Carpetas

```
testing-automation/
├── config/
│   ├── llm.config.json          # Configuración del LLM activo
│   ├── providers/
│   │   ├── gemini.json          # Config específica de Gemini
│   │   ├── ollama.json          # Config específica de Ollama
│   │   ├── openai.json          # Config específica de OpenAI
│   │   └── anthropic.json       # Config específica de Claude
│   └── testing.config.json      # Config general de testing
│
├── prompts/
│   ├── system.md                # Prompt universal del agente
│   ├── test-executor.md         # Instrucciones de ejecución
│   └── report-generator.md      # Instrucciones de reportes
│
├── tests/
│   ├── suites/                  # Tus tests en YAML
│   ├── results/                 # Reportes generados
│   └── screenshots/             # Capturas de pantalla
│
├── runners/
│   ├── universal-runner.js      # Runner principal
│   ├── core/
│   │   ├── runner-core.js       # Núcleo del runner
│   │   ├── test-executor.js     # Ejecución de tests
│   │   └── report-generator.js  # Generación de reportes
│   ├── adapters/
│   │   ├── gemini.adapter.js    # Adaptador para Gemini
│   │   ├── ollama.adapter.js    # Adaptador para Ollama
│   │   └── openai.adapter.js    # Adaptador para OpenAI
│   ├── actions/
│   │   ├── browser-actions.js   # Acciones del navegador
│   │   ├── element-finder.js    # Localización de elementos
│   │   └── variable-replacer.js # Reemplazo de variables
│   └── llm/
│       └── llm-processor.js     # Procesamiento y compilación LLM
│
├── scripts/
│   ├── setup.js                 # Script de configuración
│   ├── switch-llm.js            # Cambiar entre LLMs
│   └── test.js                  # Comando simplificado
│
├── package.json
└── README.md
```

---

## 🎯 Filosofía de Diseño

### Separación de Concerns:
1. **Tests** (`tests/suites/*.yml`) - Independientes del LLM
2. **Prompts** (`prompts/*.md`) - Instrucciones genéricas
3. **Config** (`config/`) - Específico por proveedor
4. **Adapters** (`runners/adapters/`) - Traducen entre LLM y runner

### Ventajas:
✅ Cambiar de LLM sin tocar tests  
✅ Comparar diferentes LLMs con los mismos tests  
✅ Migración gradual entre proveedores  
✅ Tests portables entre proyectos  

---

## 🔧 Archivos de Configuración

### `config/llm.config.json` (Principal)
```json
{
  "activeProvider": "ollama",
  "fallbackProvider": "gemini",
  "timeout": 30000,
  "retries": 3
}
```

### `config/providers/ollama.json`
```json
{
  "provider": "ollama",
  "baseUrl": "http://localhost:11434",
  "model": "llama3.2:3b",
  "temperature": 0.1,
  "maxTokens": 4096,
  "streaming": false
}
```

### `config/providers/gemini.json`
```json
{
  "provider": "gemini",
  "apiKey": "env:GEMINI_API_KEY",
  "model": "gemini-2.0-flash-exp",
  "temperature": 0.1,
  "maxTokens": 4096
}
```

### `config/testing.config.json`
```json
{
  "browser": "chromium",
  "headless": false,
  "viewport": { "width": 1920, "height": 1080 },
  "timeout": 30000,
  "screenshotOnError": true,
  "videoOnFailure": false,
  "retryFailedTests": 1,
  "parallel": false
}
```

---

## 📝 Prompts Universales

### `prompts/system.md`
```markdown
# Testing Automation Agent

Eres un agente de testing automatizado. Tu trabajo es ejecutar pruebas web usando herramientas de browser automation.

## Comportamiento
- Ejecuta pruebas secuencialmente
- Reporta errores con evidencia
- Continúa después de fallos
- Genera reportes estructurados

## Herramientas Disponibles
- navigate(url): Navegar a una URL
- click(selector): Click en elemento
- fill(selector, value): Llenar campo
- screenshot(name): Capturar pantalla
- verify(selector): Verificar elemento existe
- wait(selector): Esperar elemento

## Output
Responde SIEMPRE en JSON:
{
  "action": "nombre_accion",
  "params": {},
  "reasoning": "explicación breve"
}
```

---

## 🔌 Sistema de Adapters

Cada LLM tiene su propio adapter que implementa la misma interfaz:

```javascript
class LLMAdapter {
  async initialize() { }
  async sendMessage(prompt, context) { }
  async executeTest(testStep) { }
  async generateReport(results) { }
}
```

Esto permite que el runner principal sea **agnóstico del LLM**.

---

## 🚀 Comandos Simplificados

```bash
# Configurar el proyecto (primera vez)
npm run setup

# Cambiar de LLM
npm run switch-llm ollama
npm run switch-llm gemini

# Ejecutar tests (usa el LLM activo)
npm test tests/suites/login.yml

# Comparar LLMs (ejecuta con ambos)
npm run compare tests/suites/login.yml

# Ver configuración actual
npm run config
```

---

## 🖥️ Interfaces Disponibles

El sistema ofrece **3 interfaces independientes** según tu necesidad:

### 1️⃣ CLI Interactiva (Para usuarios técnicos)

**Comando**: `npm run cli-test`

**Características**:
- ✅ Menú interactivo con opciones
- ✅ Ejecutar tests existentes
- ✅ Configurar LLM activo
- ✅ Ver estado del sistema
- ✅ Crear tests básicos manualmente
- ✅ Ver reportes y screenshots

**Cuándo usarla**:
- Cuando quieres control total del proceso
- Para ejecutar y gestionar tests existentes
- Para configurar el sistema
- Cuando tienes conocimientos técnicos

**Ejemplo**:
```bash
npm run cli-test

# Menú interactivo:
# 🚀 Ejecutar tests
# ⚙️  Configurar LLM
# 📊 Ver estado del sistema
# 📋 Crear nuevo test
# 🔍 Escanear proyecto
```

---

### 2️⃣ CLI Lenguaje Natural (Para usuarios no técnicos) ⭐

**Comando**: `npm run create-test`

**Características**:
- ✅ Convierte lenguaje natural a tests YAML
- ✅ NO requiere conocimientos técnicos
- ✅ NO necesitas especificar selectores CSS
- ✅ Usa IA para entender tus instrucciones
- ✅ Genera tests optimizados
- ✅ Integrado con compilación (35x más rápido)

**Cuándo usarla**:
- Cuando no sabes programar
- Para crear tests rápidamente
- Cuando no conoces selectores CSS
- Para prototipar tests nuevos

**Ejemplo**:
```bash
npm run create-test

# Guiado paso a paso:
# 📝 Nombre del test: Test de Login
# 🌐 URL: http://localhost:3000
# 📖 Describe qué quieres probar:
#    "Abre la aplicación.
#     Haz click en el botón 'Login'.
#     Ingresa 'test@example.com' en el email.
#     Ingresa 'password123' en la contraseña.
#     Verifica que aparezca el mensaje de bienvenida."
```

**Ver documentación completa**: [GUIA_RAPIDA.md](GUIA_RAPIDA.md)

---

### 3️⃣ Interfaz Web (Para acceso desde navegador) ✨ **MEJORADA**

**Comando**: `npm run web`

**URL**: `http://localhost:3001`

**Características**:
- ✅ **Crear tests desde lenguaje natural** (integrado con IA)
- ✅ **Ejecutar tests** con visualización en tiempo real
- ✅ **Ver logs de ejecución** con streaming
- ✅ **Visualizar resultados y reportes** generados
- ✅ Dashboard con métricas en tiempo real
- ✅ Diseño moderno con gradientes y animaciones
- ✅ 4 tabs: Dashboard, Crear, Ejecutar, Resultados
- ✅ Auto-refresh cada 30 segundos

**Cuándo usarla**:
- Para crear tests sin CLI (desde el navegador)
- Para ejecutar y monitorear tests visualmente
- Para ver reportes de forma amigable
- Para usuarios que prefieren interfaces gráficas
- Para dashboards y visualización de equipo

**API REST completa**:
```bash
# Estado y configuración
GET  /api/status                    # Estado del sistema
GET  /api/tests                     # Lista de tests

# Crear tests
POST /api/tests/create              # Crear test desde lenguaje natural
     Body: { name, baseUrl, instructions }

# Ejecutar tests
POST /api/tests/run                 # Ejecutar test en background
     Body: { testPath, mode }
GET  /api/tests/status/:testId      # Estado de ejecución (polling)

# Resultados
GET  /api/results                   # Lista de reportes
GET  /api/results/:filename         # Ver reporte específico
```

**Interfaz con 4 tabs**:
1. **📊 Dashboard**: Estado del sistema, tests disponibles, tests activos
2. **➕ Crear Test**: Formulario para lenguaje natural → genera YAML con IA
3. **▶️ Ejecutar Test**: Seleccionar test, configurar modo, ver logs en tiempo real
4. **📈 Resultados**: Ver reportes generados, ordenados por fecha

---

## 📌 ¿Cuál Interface Usar?

| Necesitas... | Usa... |
|--------------|---------|
| Crear test SIN conocimientos técnicos | `npm run create-test` ⭐ o `npm run web` 🌐 |
| Ejecutar tests existentes | `npm run cli-test`, `npm test`, o `npm run web` 🌐 |
| Configurar LLM | `npm run cli-test` o `npm run switch-llm` |
| Ver estado del sistema | `npm run web` 🌐 o `npm run cli-test` |
| Crear test técnico manualmente | Editar `.yml` directamente |
| Monitorear tests en tiempo real | `npm run web` 🌐 |
| Interfaz gráfica completa | `npm run web` 🌐 ✨ |
| Ver reportes de forma visual | `npm run web` 🌐 |

---

## 🎨 Ejemplo de Uso

### 1. Primera configuración:
```bash
npm run setup
# ? ¿Qué LLM quieres usar? 
#   > Ollama (local, gratis)
#     Gemini (API, cuota limitada)
#     OpenAI (API, de pago)
```

### 2. Ejecutar tests:
```bash
npm test tests/suites/ecommerce-suite.yml
```

### 3. Cambiar de LLM:
```bash
npm run switch-llm gemini
npm test tests/suites/ecommerce-suite.yml
```

---


## 📊 Comparación de Proveedores

| Característica | Gemini | Ollama | OpenAI | Claude |
|----------------|--------|--------|---------|---------|
| Costo | Gratis* | Gratis | $$ | $$ |
| Setup | Fácil | Medio | Fácil | Fácil |
| Velocidad | Rápido | Medio | Rápido | Rápido |
| Calidad | Alta | Media | Alta | Muy Alta |
| Privacidad | ⚠️ Cloud | ✅ Local | ⚠️ Cloud | ⚠️ Cloud |
| Cuotas | ⚠️ Sí | ✅ No | ⚠️ Sí | ⚠️ Sí |

---

## 🎯 Roadmap

Esta arquitectura permite agregar fácilmente:
- ✅ Nuevos LLMs (solo crear adapter)
- ✅ Nuevas herramientas de browser
- ✅ Integración con CI/CD
- ✅ Testing paralelo
- ✅ Reportes avanzados
- ✅ Comparación A/B de LLMs


### Crear Nuevas Pruebas

Edita los archivos `.yml` en `tests/suites/` o pide a tu LLM que lo haga:



