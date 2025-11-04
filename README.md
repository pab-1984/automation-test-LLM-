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
- ✅ Opciones avanzadas: screenshots automáticos, logs de consola, network requests, performance
- ✅ Wizard interactivo paso a paso

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
# Abre http://localhost:3001
```

**4 Tabs**:
- 📊 **Dashboard**: Estado del sistema, tests activos, métricas
- 💬 **Tests Naturales**: Crear tests sin YAML, ejecutar con opciones avanzadas
- ➕ **Crear Test**: Wizard web que genera YAML con IA
- ▶️ **Ejecutar**: Seleccionar y ejecutar tests con logs en tiempo real
- 📈 **Resultados**: Ver reportes ordenados por fecha

**Características**:
- ✅ Crear tests desde lenguaje natural directo en el navegador
- ✅ Ejecución con visualización de logs en streaming
- ✅ Reportes visuales con screenshots
- ✅ API REST completa
- ✅ Auto-refresh cada 30 segundos

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
│   │   └── mcp-client.js      # Cliente MCP para Chrome DevTools
│   ├── adapters/              # Adapters por LLM
│   │   ├── gemini.adapter.js
│   │   ├── ollama.adapter.js
│   │   ├── openai.adapter.js
│   │   └── anthropic.adapter.js
│   ├── actions/
│   │   └── browser-actions.js # Acciones web via MCP
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
- 📊 **Reportes en tiempo real** con logs específicos de mobile

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
- [x] API REST completa
- [x] Integración MCP con Chrome DevTools
- [x] Setup mobile-mcp (Fase 1)

### 🚧 En Progreso

- [ ] Integración completa testing móvil (Android/iOS)
  - [x] Fase 1: Setup y configuración
  - [ ] Fase 2: Infraestructura core
  - [ ] Fase 3-7: Implementación completa

### 🔮 Futuro

- [ ] Tests paralelos
- [ ] Integración CI/CD (GitHub Actions, GitLab CI)
- [ ] Dashboard de métricas avanzadas
- [ ] Recorder web interactivo
- [ ] Soporte multi-idioma
- [ ] Testing de APIs REST
- [ ] Visual regression testing
- [ ] Tests de accesibilidad (a11y)

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

**Última actualización**: 2025-10-30 | **Versión**: 1.0.0
