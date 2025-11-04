# 📖 Manual de Usuario - LLM Testing Automation

> Guía completa para usuarios del sistema de testing automatizado con IA

---

## 📑 Tabla de Contenidos

1. [Instalación y Configuración](#-instalación-y-configuración)
2. [Interfaz Web](#-interfaz-web)
3. [Gestión de Proyectos y Suites](#-gestión-de-proyectos-y-suites)
4. [Testing Web](#-testing-web)
5. [Testing Móvil](#-testing-móvil)
6. [Interpretación de Reportes](#-interpretación-de-reportes)
7. [Troubleshooting](#-troubleshooting)
8. [Mejores Prácticas](#-mejores-prácticas)

---

## 🚀 Instalación y Configuración

### Requisitos Previos

- **Node.js** v18 o superior
- **npm** v9 o superior
- **Git** (opcional, para clonar el repositorio)

#### Para Testing Web:
- **Google Chrome** instalado

#### Para Testing Móvil (Android):
- **Android Studio** con Android SDK
- **ADB** (Android Debug Bridge) en PATH
- Dispositivo Android con **USB Debugging** habilitado

#### Para Testing Móvil (iOS):
- **macOS** con Xcode instalado
- **Simulador iOS** o dispositivo físico

### Instalación Paso a Paso

#### 1. Clonar o Descargar el Repositorio

```bash
git clone https://github.com/pab-1984/automation-test-LLM.git
cd automation-test-LLM
```

#### 2. Instalar Dependencias

```bash
npm install
```

#### 3. Configurar LLM (Primera Vez)

```bash
npm run setup
```

Este wizard interactivo te guiará para:
- Seleccionar tu proveedor de LLM (Gemini, Ollama, OpenAI, Claude)
- Ingresar las API keys necesarias
- Configurar el modelo a utilizar

**Proveedores soportados:**
- 🔮 **Gemini** (Google) - Gratis con límites generosos
- 🦙 **Ollama** - Local y gratuito
- 🤖 **OpenAI** - GPT-3.5/4
- 🧠 **Claude** (Anthropic) - Claude 2/3

#### 4. Verificar Instalación

```bash
npm run status
```

Deberías ver información sobre el LLM configurado y el estado del sistema.

### Configuración Móvil (Opcional)

Si vas a usar testing móvil, verifica la configuración:

```bash
npm run check:mobile
```

Este comando verifica:
- ✅ ADB instalado y accesible
- ✅ Android SDK configurado
- ✅ Dispositivos conectados

---

## 🌐 Interfaz Web

### Iniciar el Servidor

```bash
npm run web
```

La interfaz web estará disponible en: **http://localhost:3001**

### Pantalla Principal

Al abrir la interfaz web, verás:

#### Header (Parte Superior)
- **Selector de Plataforma**: Web 🌐 o Mobile 📱
- **Selector de Dispositivo**: (Solo visible en modo Mobile)
- **Selector de Modelo LLM**: Cambia el modelo de IA activo

#### Sidebar Izquierdo - Explorador de Archivos
- **EXPLORADOR**: Árbol jerárquico de proyectos y suites
- **Botón [+]**: Crear nuevo proyecto
- **Acciones por proyecto/suite**: Agregar, eliminar, editar

#### Tabs Principales
1. **Dashboard** 📊 - Vista general y estadísticas
2. **Crear Test** ✍️ - Wizard para crear tests con lenguaje natural
3. **Ejecutar Test** ▶️ - Selector y ejecución de tests
4. **Resultados** 📈 - Historial de ejecuciones

---

## 🗂️ Gestión de Proyectos y Suites

### Crear un Nuevo Proyecto

1. Haz clic en el botón **[+]** junto a "EXPLORADOR"
2. Ingresa el **nombre del proyecto** (ej: "Tienda Online")
3. Opcionalmente, agrega una **descripción**
4. El proyecto aparecerá en el explorador con el ícono 📁

### Crear una Suite dentro de un Proyecto

1. Expande el proyecto haciendo clic en la flecha ▶
2. Haz clic en el botón **[+]** junto al nombre del proyecto
3. Ingresa el **nombre de la suite** (ej: "Tests de Checkout")
4. Opcionalmente, agrega una **descripción**
5. La suite aparecerá bajo el proyecto con el ícono 📋

### Agregar Tests a una Suite

#### Opción A: Agregar test existente

1. Haz clic en una suite para seleccionarla
2. En el dashboard, haz clic en **"+ Agregar Test"**
3. Selecciona el origen:
   - **Tests en Lenguaje Natural**: Tests creados con IA
   - **Tests YAML**: Tests estructurados (web y móviles)
4. Selecciona el test de la lista
5. Haz clic en **"Agregar a Suite"**

Los tests se mostrarán con íconos según su tipo:
- 🌐 Web
- 🤖 Android
- 🍎 iOS
- 📱 Mobile genérico

#### Opción B: Crear test nuevo

1. Ve al tab **"Crear Test"**
2. Escribe las instrucciones en lenguaje natural
3. Configura las opciones avanzadas si es necesario
4. Haz clic en **"Generar y Ejecutar Test"**

### Eliminar Proyectos o Suites

- **Eliminar Suite**: Haz clic en el botón 🗑️ junto a la suite
- **Eliminar Proyecto**: Haz clic en el botón 🗑️ junto al proyecto
  - ⚠️ Esto eliminará también todas las suites del proyecto

---

## 🌐 Testing Web

### Crear un Test Web con Lenguaje Natural

1. Ve al tab **"Crear Test"**
2. En el campo de texto, describe lo que quieres probar en español:

```
Navega a https://www.example.com
Busca el producto "laptop"
Haz clic en el primer resultado
Verifica que el precio sea menor a 1000 dólares
Agrega al carrito
```

3. Configura opciones avanzadas (opcional):
   - **Screenshots por paso**: Captura cada acción
   - **Logs de consola**: Registra errores de JavaScript
   - **Network requests**: Captura todas las peticiones HTTP
   - **Performance metrics**: Mide tiempos de carga

4. Haz clic en **"Generar y Ejecutar Test"**

### Ejecutar Tests Web Existentes

1. Ve al tab **"Ejecutar Test"**
2. Asegúrate de tener seleccionada la plataforma **Web** 🌐
3. Selecciona un test de la lista
4. Elige el modo de ejecución:
   - **Auto**: El sistema decide automáticamente
   - **Direct**: Ejecuta directamente con selectores compilados
   - **LLM**: Usa IA para interpretar cada paso
5. Haz clic en **"Ejecutar Test"**

### Monitorear Ejecución

Durante la ejecución verás:
- **Status en tiempo real**: Running, Success, Failed
- **Logs del proceso**: Cada acción ejecutada
- **Progreso visual**: Barra de progreso

---

## 📱 Testing Móvil

### Configuración Inicial de Dispositivos Android

#### 1. Habilitar Depuración USB

1. En tu dispositivo Android, ve a **Configuración**
2. Busca **"Acerca del teléfono"**
3. Toca **7 veces** en **"Número de compilación"**
4. Verás el mensaje: "Ahora eres desarrollador"
5. Regresa a Configuración y abre **"Opciones de desarrollador"**
6. Activa **"Depuración USB"**

#### 2. Conectar Dispositivo

1. Conecta tu dispositivo Android via USB a la computadora
2. En tu dispositivo, acepta el permiso de "Depuración USB"
3. Ejecuta para verificar:

```bash
npm run check:mobile
```

Deberías ver tu dispositivo listado con:
- 📱 ID del dispositivo
- 📦 Modelo
- ✅ Estado: device

### Usar Testing Móvil desde la Interfaz Web

#### 1. Cambiar a Modo Mobile

1. En el header, cambia el selector de **Web** 🌐 a **Mobile** 📱
2. Automáticamente aparecerá el **Selector de Dispositivo**
3. Verás un panel con los **dispositivos conectados**

#### 2. Seleccionar Dispositivo

En el **Selector de Dispositivo**, elige tu dispositivo:
- 📱 **Físico**: Tu teléfono/tablet conectado
- 💻 **Emulador**: Emulador de Android Studio

El sistema mostrará:
- Modelo del dispositivo
- Versión de Android
- Estado de conexión

#### 3. Ejecutar Tests Móviles

1. Ve al tab **"Ejecutar Test"**
2. Los tests móviles aparecerán automáticamente filtrados
3. Notarás badges de plataforma:
   - 🤖 **ANDROID**
   - 🍎 **IOS**
4. Selecciona un test y haz clic en **"Ejecutar Test Móvil"**

### Tests Móviles Incluidos

El sistema incluye **86 test cases** listos para usar:

#### Android (68 tests)
- **Calculator** (6 tests): Operaciones básicas
- **System Apps** (15 tests): Settings, Browser, etc.
- **UI Components** (22 tests): Buttons, inputs, gestures
- **E-commerce** (25 tests): Flows completos de compra

#### iOS (18 tests)
- **Calculator** (6 tests)
- **Native Apps** (12 tests)

Ver detalles completos en: `tests/suites/mobile/README.md`

### Crear Tests Móviles Personalizados

```bash
npm run create-mobile-test
```

Este wizard te guiará para crear:
- Tests para Android específicos
- Tests para iOS específicos
- Tests multiplataforma (common)

### Crear Tests Móviles en Lenguaje Natural ⭐ **NUEVO**

**La forma más fácil de crear tests móviles**: Escribe en español qué quieres probar y el sistema lo ejecuta en tu dispositivo.

#### Desde la Interfaz Web

1. Ve al tab **"Crear Test"**
2. En el selector **"Plataforma"**, elige **📱 Móvil**
3. Aparecerá el selector de **"Dispositivo"** - elige tu dispositivo conectado
4. En el campo **"URL inicial / Package Name"**, ingresa el package de la app:
   ```
   Ejemplo Android: com.miui.calculator
   Ejemplo iOS: com.apple.calculator
   ```

5. Escribe las instrucciones en lenguaje natural:

```
Abre la calculadora

Presiona el botón "5"
Presiona el botón "+"
Presiona el botón "3"
Presiona el botón "="

Verifica que el resultado sea "8"

Toma un screenshot
```

6. Configura opciones si es necesario:
   - 📸 Screenshot por paso
   - 📝 Capturar logs
   - 🌐 Capturar network
   - 📊 Performance

7. Haz clic en **"💾 Guardar Test"** o **"▶️ Guardar y Ejecutar"**

#### Características de Tests Naturales Móviles

- ✅ **Sin código**: Solo describe las acciones en español
- ✅ **Detección automática**: El LLM encuentra botones y elementos por su texto visible
- ✅ **Soporte gestos**: tap, swipe, scroll, long press
- ✅ **Verificaciones**: El LLM valida texto en pantalla
- ✅ **Screenshots automáticos**: Captura cada paso si lo configuras
- ✅ **Multi-dispositivo**: Funciona en Android e iOS

#### Ejemplos de Acciones Soportadas

**Navegación:**
```
Abre la app de configuración
Ve a la sección de Wi-Fi
Regresa a la pantalla anterior
```

**Interacciones:**
```
Presiona el botón "Aceptar"
Escribe "Hola mundo" en el campo de texto
Desliza hacia arriba
Mantén presionado el botón "Opciones"
```

**Verificaciones:**
```
Verifica que aparezca el texto "Éxito"
Verifica que el botón "Enviar" esté visible
Confirma que la app está en la pantalla principal
```

---

## 📊 Interpretación de Reportes

### Dashboard - Vista de Estadísticas

El dashboard muestra:

#### Card de Suite Actual
- **Nombre de la suite** seleccionada
- **Número de tests** en la suite
- **Botón "Ejecutar Todos"**: Ejecuta toda la suite

#### Tests de la Suite
Lista de tests con:
- ▶️ **Botón de ejecución individual**
- 📋 **Nombre del test**
- 🎯 **Resultado esperado**

#### Panel de Dispositivos Móviles (modo Mobile)
- 📱 **Dispositivos conectados**: Cantidad y estado
- 📊 **Info del dispositivo**: Modelo, Android version, screen size
- 🔄 **Botón actualizar**: Refresca lista de dispositivos

#### Estadísticas Generales
- ✅ **Tests exitosos**
- ❌ **Tests fallidos**
- 📈 **Tasa de éxito**
- ⏱️ **Tiempo promedio**

### Tab de Resultados

Muestra el **historial completo** de ejecuciones:

#### Para cada ejecución verás:
- 📅 **Fecha y hora**
- 🧪 **Nombre del test**
- ✅/❌ **Estado**: Success, Failed, Error
- ⏱️ **Duración**
- 🌐/📱 **Plataforma**: Web o Mobile
- 📱 **Dispositivo** (si es mobile)
- 🔍 **Botón "Ver Detalles"**

#### Ver Detalles de una Ejecución

Al hacer clic en "Ver Detalles":

1. **Resumen**:
   - Status final
   - Duración total
   - Plataforma y dispositivo

2. **Logs**:
   - Cada paso ejecutado
   - Salida de cada acción
   - Errores si los hubo

3. **Screenshots** (si están habilitados):
   - Capturas de pantalla automáticas
   - Screenshots de errores

4. **Performance** (si está habilitado):
   - Tiempos de carga
   - Métricas de red
   - Logs de consola

### Reportes Markdown

Cada ejecución genera un reporte en:
```
tests/results/reporte-[timestamp].md
```

Contiene:
- 📋 Resumen de la suite
- ✅ Tests exitosos con detalles
- ❌ Tests fallidos con errores
- 📸 Referencias a screenshots
- ⏱️ Métricas de tiempo

---

## 🔧 Troubleshooting

### Problemas Comunes - Web

#### "Error: Chrome not found"

**Solución**:
1. Instala Google Chrome
2. O configura la ruta en `config/testing.config.json`:
```json
{
  "chrome": {
    "paths": {
      "windows": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "mac": "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "linux": "/usr/bin/google-chrome"
    }
  }
}
```

#### "Error: LLM API key not configured"

**Solución**:
```bash
npm run setup
```
Vuelve a configurar tu API key.

#### Tests lentos o timeout

**Soluciones**:
1. Aumenta el timeout en el test YAML:
```yaml
timeout: 60000  # 60 segundos
```

2. Usa modo "direct" en vez de "llm":
```yaml
mode: direct
```

3. Compila el test para futuras ejecuciones más rápidas:
```bash
npm test tu-test.yml
# La próxima ejecución será 35x más rápida
```

### Problemas Comunes - Mobile

#### "ADB no encontrado"

**Solución Windows**:
1. Instala Android Studio
2. Durante instalación, marca "Android SDK Platform-Tools"
3. La ruta debería ser:
   ```
   C:\Users\[TU_USUARIO]\AppData\Local\Android\Sdk\platform-tools
   ```
4. Verifica:
   ```bash
   npm run check:mobile
   ```

**Solución macOS/Linux**:
```bash
# Instalar via Homebrew (macOS)
brew install android-platform-tools

# O agregar al PATH manualmente
export PATH=$PATH:$HOME/Library/Android/sdk/platform-tools
```

#### "No hay dispositivos conectados"

**Checklist**:
- [ ] Cable USB conectado (no solo carga)
- [ ] USB Debugging habilitado en el dispositivo
- [ ] Permiso aceptado en el dispositivo
- [ ] Dispositivo desbloqueado

**Verificar conexión**:
```bash
npm run mobile-devices
```

#### "Device unauthorized"

**Solución**:
1. En tu dispositivo Android, verás un popup
2. Marca "Siempre permitir desde esta computadora"
3. Toca "OK"
4. Ejecuta de nuevo:
   ```bash
   npm run mobile-devices
   ```

#### Tests móviles fallan: "App no encontrada"

**Solución**:
1. Verifica que la app esté instalada:
   ```bash
   # Android
   adb shell pm list packages | grep [nombre-paquete]
   ```

2. Instala la app manualmente en el dispositivo

3. Verifica el package name correcto en el test YAML:
   ```yaml
   packageName: "com.example.app"  # Android
   bundleId: "com.example.app"     # iOS
   ```

### Problemas de la Interfaz Web

#### "Error al cargar proyectos"

**Solución**:
1. Verifica que el servidor esté corriendo:
   ```bash
   npm run web
   ```

2. Refresca el navegador (Ctrl+F5 / Cmd+Shift+R)

3. Abre la consola del navegador (F12) y busca errores

#### "Test no aparece en el explorador"

**Solución**:
1. Verifica que el test esté en formato correcto (YAML o lenguaje natural)
2. Recarga el explorador con el botón 🔄
3. Verifica que el archivo esté en:
   - `tests/natural/*.txt` (lenguaje natural)
   - `tests/suites/**/*.yml` (YAML)
   - `tests/suites/mobile/**/*.yml` (móvil)

---

## ✅ Mejores Prácticas

### Testing Web

#### 1. Nombres Descriptivos
```yaml
# ✅ Bueno
name: "Login con credenciales válidas"
description: "Verifica que un usuario puede iniciar sesión con email y contraseña correctos"

# ❌ Malo
name: "Test 1"
description: "Login"
```

#### 2. Usa Variables
```yaml
variables:
  BASE_URL: "https://mi-app.com"
  TEST_USER: "test@example.com"
  TEST_PASSWORD: "SecurePass123"

tests:
  - action: navigate
    url: "{{BASE_URL}}/login"
```

#### 3. Capturas en Puntos Clave
```yaml
steps:
  - action: click
    selector: "#submit-button"
  - action: screenshot  # Captura después de acciones importantes
    filename: "after-submit"
```

#### 4. Assertions Explícitas
```yaml
- action: verify
  selector: ".success-message"
  expectedText: "Pedido confirmado"
  description: "Verifica que apareció mensaje de éxito"
```

### Testing Móvil

#### 1. Tests Específicos por Plataforma

Organiza por carpetas:
```
tests/suites/mobile/
├── android/          # Solo Android
├── ios/              # Solo iOS
└── common/           # Multiplataforma
```

#### 2. Esperas Adecuadas
```yaml
- action: launchApp
  packageName: "com.example.app"
- action: wait
  time: 2000  # Espera a que la app cargue
- action: tap
  selector: "Login Button"
```

#### 3. Manejo de Orientación
```yaml
- action: setOrientation
  orientation: "LANDSCAPE"
- action: screenshot
  filename: "landscape-view"
- action: setOrientation
  orientation: "PORTRAIT"
```

#### 4. Coordenadas vs Selectores

Prefiere selectores cuando sea posible:
```yaml
# ✅ Mejor - más mantenible
- action: tap
  selector: "Login Button"

# ⚠️ Usar solo si es necesario
- action: tap
  x: 540
  y: 960
```

### Organización de Proyectos

#### Estructura Recomendada
```
📁 Proyecto: E-commerce
  📋 Suite: Autenticación
    🧪 Login exitoso
    🧪 Login fallido
    🧪 Recuperar contraseña
  📋 Suite: Catálogo
    🧪 Búsqueda de productos
    🧪 Filtros
    🧪 Ordenamiento
  📋 Suite: Checkout
    🧪 Agregar al carrito
    🧪 Proceso de pago
    🧪 Confirmación
```

### Performance

#### 1. Usa Tests Compilados
```bash
# Primera ejecución (lenta, con LLM)
npm test mi-test.yml

# Segunda ejecución (35x más rápida)
npm test mi-test.yml
# Usa la versión compilada automáticamente
```

#### 2. Modo de Ejecución

```yaml
# Para desarrollo - más flexible
mode: llm

# Para CI/CD - más rápido
mode: direct
```

#### 3. Ejecuta en Batch
```bash
# Ejecutar toda una suite
npm run test:mobile:android  # Todos los tests Android

# O desde la web: botón "Ejecutar Todos"
```

---

## 📞 Soporte

### Recursos

- **README**: [README.md](README.md)
- **Tests Lenguaje Natural**: [TESTS_LENGUAJE_NATURAL.md](TESTS_LENGUAJE_NATURAL.md)
- **Guía Rápida**: [GUIA_RAPIDA.md](GUIA_RAPIDA.md)
- **Documentación Mobile**: [tests/suites/mobile/README.md](tests/suites/mobile/README.md)

### Reportar Problemas

Si encuentras un bug o tienes una sugerencia:

1. Abre un issue en GitHub: [Issues](https://github.com/pab-1984/automation-test-LLM/issues)
2. Incluye:
   - Descripción del problema
   - Pasos para reproducirlo
   - Screenshots si aplica
   - Logs relevantes

### Preguntas Frecuentes

**¿Puedo usar múltiples LLMs simultáneamente?**
No directamente, pero puedes cambiar entre LLMs sin modificar tests:
```bash
npm run switch-llm
```

**¿Los tests funcionan sin internet?**
- Con **Ollama** (local): Sí, 100% offline
- Con **Gemini/OpenAI/Claude**: Necesitas conexión a internet

**¿Cuánto cuesta usar LLMs?**
- **Gemini**: Gratis hasta cierto límite
- **Ollama**: Gratis (local)
- **OpenAI**: Según tu plan
- **Claude**: Según tu plan

**¿Puedo ejecutar tests en CI/CD?**
Sí, usa el modo headless:
```bash
npm test tests/suites/mi-suite.yml -- --headless
```

---

## 📝 Notas Finales

### Actualizaciones

Para actualizar a la última versión:
```bash
git pull origin main
npm install
```

### Licencia

Este proyecto está bajo licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

### Autor

**Pablo Flores**
- GitHub: [@pab-1984](https://github.com/pab-1984)
- Proyecto: [automation-test-LLM](https://github.com/pab-1984/automation-test-LLM)

---

**🎉 ¡Disfruta automatizando tus tests con IA!**
