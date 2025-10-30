# 🏗️ Estructura del Sistema de Testing Automatizado

Sistema de testing universal que combina LLMs con MCP (Model Context Protocol) para crear y ejecutar tests web y móviles en lenguaje natural.

---

## 📁 Estructura de Carpetas

```
automation-test-LLM/
├── config/
│   ├── llm.config.json          # Configuración del LLM activo
│   └── providers/
│       ├── gemini.json          # Config específica de Gemini
│       ├── ollama.json          # Config específica de Ollama
│       ├── openai.json          # Config específica de OpenAI
│       └── anthropic.json       # Config específica de Claude
│
├── prompts/
│   ├── system.md                # Prompt universal del sistema
│   └── system-simple.md         # Prompt optimizado para compilación
│
├── runners/
│   ├── core/
│   │   ├── runner-core.js       # ⭐ Núcleo principal (LLM + MCP)
│   │   └── mcp-client.js        # Cliente MCP para Chrome DevTools
│   ├── adapters/                # Adapters por LLM
│   │   ├── gemini.adapter.js
│   │   ├── ollama.adapter.js
│   │   ├── openai.adapter.js
│   │   └── anthropic.adapter.js
│   ├── actions/
│   │   └── browser-actions.js   # Acciones web via MCP
│   ├── utils/
│   │   └── element-finder.js    # Búsqueda híbrida (local + LLM)
│   └── test-generator.js        # Generación de tests con IA
│
├── scripts/
│   ├── cli.js                   # CLI interactiva
│   ├── create-test.js           # Wizard de creación de tests
│   ├── test-natural.js          # ⭐ Tests en lenguaje natural
│   ├── web-server.js            # 🌐 Interfaz web + API REST
│   ├── test.js                  # Ejecutor de YAML
│   └── setup.js                 # Configuración inicial
│
├── tests/
│   ├── suites/                  # Tests YAML
│   ├── natural/                 # ⭐ Tests en lenguaje natural (.txt)
│   ├── compiled/                # Tests compilados (35x más rápidos)
│   ├── results/                 # Reportes generados
│   └── screenshots/             # Capturas de pantalla
│
├── .local-docs/                 # Documentación interna (no en repo)
│   └── planning/                # Planes y hallazgos
│       ├── PLAN_INTEGRACION_MOBILE_MCP.md
│       ├── FASE1_HALLAZGOS_MOBILE_MCP.md
│       └── CHECKPOINT_MOBILE_INTEGRATION.md
│
├── test-mobile-mcp.js           # 📱 Script de prueba mobile-mcp
├── package.json
└── README.md
```

---

## 🎯 Filosofía de Diseño

### 3 Pilares Principales:

1. **Agnóstico de LLM**
   - Soporta Gemini, Ollama, OpenAI, Claude
   - Cambio de proveedor sin modificar tests
   - Misma interfaz para todos los LLMs

2. **Protocolo MCP (Model Context Protocol)**
   - chrome-devtools-mcp para testing web
   - mobile-mcp para testing móvil (Android/iOS)
   - Comunicación estandarizada entre LLM y herramientas

3. **Lenguaje Natural**
   - Tests sin YAML, sin selectores CSS
   - Descripción en español de qué probar
   - LLM interpreta y ejecuta automáticamente

### Ventajas:

✅ Tests en lenguaje natural sin conocimientos técnicos
✅ Cambiar de LLM sin tocar tests
✅ Integración con Chrome DevTools vía MCP
✅ Testing móvil (Android/iOS) en desarrollo
✅ Compilación inteligente (35x más rápido)
✅ Interfaz web completa con IA integrada

---

## 🔧 Archivos de Configuración

### `config/llm.config.json` (Principal)
```json
{
  "activeProvider": "gemini",
  "model": "gemini-2.0-flash-exp",
  "temperature": 0.1,
  "timeout": 30000
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

---

## 🏗️ Arquitectura MCP

### Flujo de Ejecución

```
┌─────────────────────┐
│ Test Input          │  (Natural Language, YAML, o Web Form)
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ runner-core.js      │  ⭐ Núcleo principal
│ (Universal Runner)  │
└──────────┬──────────┘
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
             │ mobile-mcp       │  (Mobile - Fase 1 ✅)
             └──────────────────┘
                    │
                    v
             ┌──────────────────┐
             │ Browser/Device   │
             └──────────────────┘
```

### Componentes Clave

#### 1. runner-core.js (Núcleo Principal)
- Inicializa LLM adapter según configuración
- Conecta con MCP client (web o mobile)
- Ejecuta pasos del test
- Genera reportes

#### 2. MCP Client (mcp-client.js)
- Conexión stdio con chrome-devtools-mcp
- Herramientas disponibles:
  - `take_snapshot()` - Captura DOM con UIDs
  - `navigate()` - Navega a URL
  - `click()` - Click en elemento por UID
  - `fill()` - Llena campo de texto
  - `take_screenshot()` - Captura pantalla
  - `list_network_requests()` - Lista requests HTTP
  - `get_console_logs()` - Obtiene logs de consola

#### 3. Mobile MCP Client (en desarrollo - Fase 1 ✅)
- Conexión stdio con mobile-mcp
- 19 herramientas disponibles:
  - `mobile_list_available_devices` - Lista dispositivos
  - `mobile_launch_app` - Lanza app
  - `mobile_click_on_screen_at_coordinates` - Click en x,y
  - `mobile_list_elements_on_screen` - Lista elementos
  - `mobile_type_keys` - Escribe texto
  - `mobile_take_screenshot` - Captura pantalla
  - Y 13 más...

#### 4. LLM Adapters
Cada LLM tiene su adapter con interfaz común:

```javascript
class LLMAdapter {
  async initialize(config) { }
  async sendMessage(prompt, conversationHistory) { }
  async generateCompletion(prompt) { }
}
```

Adapters implementados:
- `gemini.adapter.js` - Google Gemini
- `ollama.adapter.js` - Ollama local
- `openai.adapter.js` - OpenAI GPT
- `anthropic.adapter.js` - Claude

#### 5. Browser Actions (browser-actions.js)
Abstracción sobre MCP tools para el LLM:

```javascript
async navigate(url)
async fill(selector, value)
async click(selector)
async verify(selector)
async screenshot(name)
async waitForElement(selector, timeout)
async getConsoleErrors()
async getNetworkRequests()
```

#### 6. Element Finder (element-finder.js)
Búsqueda híbrida de elementos:

1. **Búsqueda Local** (rápida)
   - Por texto visible
   - Por atributos (id, name, placeholder)
   - Por tipo de elemento
   - Sistema de scoring

2. **Búsqueda con LLM** (fallback)
   - Cuando búsqueda local falla
   - LLM analiza snapshot y selecciona UID

---

## 📝 Prompts del Sistema

### `prompts/system.md` (Prompt Universal)
- Instrucciones completas para el LLM
- Describe herramientas MCP disponibles
- Define formato de respuesta
- Guías de best practices

### `prompts/system-simple.md` (Prompt Optimizado)
- Versión simplificada para compilación
- Reduce tokens y tiempo de ejecución
- Usado en tests compilados (35x más rápido)

---

## 🚀 Modos de Ejecución

### 1. Tests en Lenguaje Natural (⭐ Recomendado)
```bash
npm run test-natural "Navega a google.com y busca 'testing'"
```

**Características:**
- Sin YAML, sin selectores CSS
- Directo en línea de comandos
- Opciones avanzadas: screenshots, logs, performance
- LLM interpreta y ejecuta en tiempo real

### 2. Wizard de Creación (Genera YAML)
```bash
npm run create-test
```

**Flujo:**
1. Describe qué probar en lenguaje natural
2. LLM genera YAML compilado
3. Se ejecuta y refina con feedback

### 3. Interfaz Web
```bash
npm run web
# Abre http://localhost:3001
```

**Funcionalidades:**
- Dashboard con estado del sistema
- Crear tests naturales desde el navegador
- Ejecutar tests con logs en streaming
- Ver reportes con screenshots
- API REST completa

### 4. YAML Manual
```bash
npm test tests/suites/mi-test.yml
```

**Para usuarios técnicos:**
- Control total sobre el test
- Selectores CSS directos
- Configuración avanzada

---

## 🎨 Sistema de Compilación

### Primera Ejecución (con LLM)
```
Test Natural → LLM → Analiza App → Encuentra Elementos → YAML Compilado
                ↓
           Ejecuta Test
```

- Duración: 2-3 minutos
- Usa IA para entender
- Captura snapshots
- Genera test compilado en `tests/compiled/`

### Siguientes Ejecuciones (sin LLM)
```
YAML Compilado → Ejecuta Directo → Resultados
```

- Duración: 4-5 segundos
- **35x más rápido**
- Sin llamadas a LLM
- Ideal para CI/CD

---

## 📱 Integración Mobile (En Desarrollo)

### Estado Actual: Fase 1 Completada ✅

```
Fase 1: Setup y Configuración        ████████████ 100% ✅
Fase 2: Infraestructura Core          ░░░░░░░░░░░░   0% ⏳
Fase 3: Acciones Mobile                ░░░░░░░░░░░░   0%
Fase 4: Búsqueda Inteligente           ░░░░░░░░░░░░   0%
Fase 5: Test Generator Mobile          ░░░░░░░░░░░░   0%
Fase 6: Testing y Refinamiento         ░░░░░░░░░░░░   0%
Fase 7: Interfaz Web                   ░░░░░░░░░░░░   0%
```

### Fase 1 - Logros:
- ✅ mobile-mcp v0.0.33 instalado y funcional
- ✅ Emulador Android (Pixel_6a_2) configurado
- ✅ 19 herramientas MCP documentadas
- ✅ Test de conectividad exitoso
- ✅ Documentación completa de hallazgos

### Próximos Pasos (Fase 2):
1. Crear MCP Client Factory (web/mobile)
2. Implementar Mobile MCP Client
3. Crear Mobile Actions (equivalente a browser-actions)
4. Extender Element Finder para mobile
5. Modificar Universal Runner para soportar plataforma

---

## 🌐 API REST (Web Interface)

### Endpoints Principales

```bash
# Sistema
GET  /api/status                 # Estado del sistema

# Tests YAML
GET  /api/tests                  # Lista de tests YAML
POST /api/tests/create           # Crear test desde lenguaje natural
POST /api/tests/run              # Ejecutar test
GET  /api/tests/status/:testId   # Estado de ejecución

# Tests Naturales
GET  /api/tests/natural          # Lista tests naturales
POST /api/tests/natural/create   # Crear test natural
POST /api/tests/natural/run      # Ejecutar test natural

# Resultados
GET  /api/results                # Lista de reportes
GET  /api/results/:filename      # Ver reporte específico
```

---

## 🚀 Comandos Disponibles

### Ejecución de Tests
```bash
npm test [test-path]              # Ejecutar test YAML
npm run test-natural [instrucción] # Test en lenguaje natural
npm run test-direct [test-path]   # Ejecutar sin LLM (directo)
```

### Creación de Tests
```bash
npm run create-test               # Wizard con IA
npm run cli-test                  # CLI interactiva
npm run web                       # Interfaz web
```

### Configuración
```bash
npm run setup                     # Setup inicial
npm run config                    # Ver configuración
npm run switch-llm [provider]     # Cambiar LLM
npm run status                    # Estado del sistema
```

---

## 📊 Comparación Web vs Mobile

| Aspecto | Web (chrome-devtools) | Mobile (mobile-mcp) |
|---------|----------------------|---------------------|
| **Navegación** | `navigate(url)` | `mobile_open_url(url)` |
| **Click** | `click(uid)` | `mobile_click_on_screen_at_coordinates(x, y)` |
| **Texto** | `fill(uid, text)` | Click + `mobile_type_keys(text)` |
| **Snapshot** | `take_snapshot()` | `mobile_list_elements_on_screen()` |
| **Screenshot** | `take_screenshot()` | `mobile_take_screenshot()` |
| **Identificación** | UIDs únicos | Coordenadas x,y |
| **Apps** | N/A | `launch_app()`, `terminate_app()` |
| **Gestos** | N/A | `swipe()`, `long_press()`, `double_tap()` |

---

## 🎯 Roadmap

### ✅ Completado
- Sistema agnóstico de LLM
- Tests en lenguaje natural sin YAML
- Interfaz web completa
- Integración MCP con Chrome DevTools
- Compilación inteligente (35x más rápido)
- Búsqueda híbrida de elementos
- API REST completa
- Setup mobile-mcp (Fase 1)

### 🚧 En Progreso
- Integración completa testing móvil (Fase 2-7)

### 🔮 Futuro
- Tests paralelos
- Integración CI/CD
- Visual regression testing
- Tests de accesibilidad (a11y)
- Soporte multi-idioma
- Testing de APIs REST

---

## 💡 Características Técnicas

### Gestión de Errores
- Retry automático en caso de fallo
- Captura de screenshots en errores
- Logs detallados de consola
- Network requests capturados

### Performance
- Sistema de caché para tests compilados
- Búsqueda local antes de llamar al LLM
- Reutilización de conexiones MCP
- Timeouts configurables

### Seguridad
- API Keys en variables de entorno
- No se almacenan credenciales en código
- Sandboxing de ejecución de tests

---

**Última actualización:** 2025-10-30
**Versión:** 1.0.0 (Mobile Integration Fase 1)
