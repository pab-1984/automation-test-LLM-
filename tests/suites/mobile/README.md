# 📱 Mobile Test Suites - Guía de Ejecución

Esta carpeta contiene suites de tests completas para pruebas móviles automatizadas en Android e iOS.

## 📂 Estructura de Archivos

```
mobile/
├── android/           # Tests específicos de Android
│   ├── calculator-tests.yml    # 6 tests: operaciones matemáticas
│   ├── chrome-tests.yml        # 4 tests: navegación web
│   ├── settings-tests.yml      # 4 tests: configuración del sistema
│   ├── gmail-tests.yml         # 6 tests: correo electrónico
│   ├── gallery-tests.yml       # 7 tests: fotos y gestos
│   └── playstore-tests.yml     # 8 tests: tienda de apps
├── ios/               # Tests específicos de iOS
│   ├── safari-tests.yml        # 6 tests: navegación web
│   ├── notes-tests.yml         # 7 tests: notas y edición
│   └── photos-tests.yml        # 8 tests: fotos y álbumes
└── common/            # Tests multiplataforma
    ├── gestures-tests.yml              # 10 tests: gestos complejos
    ├── forms-tests.yml                 # 10 tests: formularios
    └── navigation-multiscreen-tests.yml # 10 tests: navegación compleja
```

## 🎯 Total de Tests Disponibles

- **Android Tests**: 35 casos de prueba
- **iOS Tests**: 21 casos de prueba
- **Common Tests**: 30 casos de prueba
- **TOTAL**: **86 casos de prueba**

---

## 🚀 Ejecución Rápida

### Ejecutar UN test individual

```bash
# Android
node runners/mobile-runner.js tests/suites/mobile/android/calculator-tests.yml

# iOS
node runners/mobile-runner.js tests/suites/mobile/ios/safari-tests.yml

# Common (especificar plataforma en el archivo)
node runners/mobile-runner.js tests/suites/mobile/common/gestures-tests.yml
```

### Ejecutar TODOS los tests de una categoría

```bash
# Todos los tests Android
npm run test:mobile:android

# Todos los tests iOS
npm run test:mobile:ios

# Todos los tests (Android + iOS + Common)
npm run test:mobile:all
```

---

## 📋 Prerrequisitos

### Para Android Tests

1. **Android Studio** instalado
2. **Android SDK** configurado
3. **Emulador Android** o dispositivo físico conectado
4. **ADB** en el PATH del sistema

Verificar:
```bash
adb devices
```

### Para iOS Tests

1. **Xcode** instalado (macOS únicamente)
2. **iOS Simulator** disponible
3. **xcrun** en el PATH

Verificar:
```bash
xcrun simctl list devices
```

### Dependencias del Proyecto

```bash
npm install
```

---

## 🔧 Configuración de Dispositivos

### Android - Crear y lanzar emulador

```bash
# Listar emuladores disponibles
emulator -list-avds

# Lanzar un emulador
emulator -avd Pixel_5_API_33

# O crear uno nuevo
avdmanager create avd -n TestDevice -k "system-images;android-33;google_apis;x86_64"
```

### iOS - Listar y lanzar simuladores

```bash
# Listar simuladores
xcrun simctl list devices

# Lanzar simulador
open -a Simulator

# Iniciar dispositivo específico
xcrun simctl boot "iPhone 14"
```

---

## 📖 Descripción de Test Suites

### 🤖 Android Tests

#### 1. **calculator-tests.yml** (6 tests)
- ✅ Suma simple (5 + 3 = 8)
- ➖ Resta (15 - 7 = 8)
- ✖️ Multiplicación (6 × 4 = 24)
- ➗ División (20 ÷ 4 = 5)
- 🔢 Operación combinada (orden de operaciones)
- 🧹 Botón Clear

#### 2. **chrome-tests.yml** (4 tests)
- 🌐 Navegar a Wikipedia
- 🔍 Búsqueda en Google
- ⬅️ Navegación con botón atrás
- 📜 Scroll en página web

#### 3. **settings-tests.yml** (4 tests)
- ⚙️ Verificar secciones principales
- 📱 Ver información del dispositivo
- 🖥️ Navegar a configuración de pantalla
- 📶 Explorar red e internet

#### 4. **gmail-tests.yml** (6 tests)
- 📥 Abrir bandeja de entrada
- ✉️ Componer nuevo correo
- 🔎 Buscar correos
- 📂 Menú lateral
- 📄 Scroll en lista
- 🔄 Pull to refresh

#### 5. **gallery-tests.yml** (7 tests)
- 🖼️ Ver álbumes
- 📷 Abrir foto individual
- 🔍 Zoom con doble tap
- ↔️ Swipe entre fotos
- 📁 Navegar álbumes
- 📜 Scroll en cuadrícula
- ⚙️ Menú de opciones

#### 6. **playstore-tests.yml** (8 tests)
- 🏪 Verificar secciones
- 🔎 Buscar aplicación
- 📱 Ver detalles de app
- 📂 Navegar por categorías
- 🎮 Ver juegos destacados
- ↔️ Scroll horizontal en carrusel
- 💭 Ver historial de búsqueda
- ⬅️ Navegación con botón atrás

### 🍎 iOS Tests

#### 7. **safari-tests.yml** (6 tests)
- 🌐 Navegar a Wikipedia
- 🔍 Búsqueda en Google
- ⬅️ Botón atrás
- 📜 Scroll en página
- 📑 Abrir nueva pestaña
- 📖 Modo lectura

#### 8. **notes-tests.yml** (7 tests)
- 📝 Verificar lista de notas
- ➕ Crear nueva nota
- ✏️ Editar nota existente
- 🔎 Buscar nota
- 📜 Scroll en lista
- 📁 Vista de carpetas
- 🗑️ Eliminar nota (swipe)

#### 9. **photos-tests.yml** (8 tests)
- 📚 Ver biblioteca
- 🖼️ Abrir foto individual
- 🔍 Zoom con doble tap
- ↔️ Swipe entre fotos
- 📁 Navegar a álbumes
- 📜 Scroll en cuadrícula
- 💡 Ver pestaña "Para ti"
- 📤 Menú de compartir

### 🌍 Common Tests (Multiplataforma)

#### 10. **gestures-tests.yml** (10 tests)
- ↕️ Swipe vertical (rápido/lento)
- ↔️ Swipe horizontal
- ↗️ Swipe diagonal
- ⏱️ Long press
- 👆 Double tap
- 🗑️ Swipe to dismiss
- 🔄 Pull to refresh
- 🤏 Pinch to zoom
- 🔀 Gestos en secuencia
- 📐 Edge swipe

#### 11. **forms-tests.yml** (10 tests)
- 📝 Formulario de registro básico
- ✉️ Validación de email
- 🔘 Radio buttons
- ☑️ Checkboxes
- 📋 Dropdown/Select
- 🔢 Campo numérico
- 📅 Date picker
- 🔒 Campo de contraseña
- 📄 Formulario largo
- ✅ Validación de campos requeridos

#### 12. **navigation-multiscreen-tests.yml** (10 tests)
- 🏢 Navegación profunda (4+ niveles)
- 📱 Navegación con drawer
- ⬇️ Bottom navigation
- 🛒 Flujo de compra completo
- 💬 Modals y dialogs
- 📑 Tabs superiores swipeable
- 📚 Stack complejo
- ⚡ Interrupción y restauración
- 🔗 Deep links
- 📜 Preservar scroll position

---

## 🎬 Ejemplos de Uso

### Ejemplo 1: Ejecutar tests de Calculator

```bash
node runners/mobile-runner.js tests/suites/mobile/android/calculator-tests.yml
```

**Salida esperada:**
```
🧪 MOBILE TEST RUNNER
=====================
📄 Suite: Calculator Android - Tests de Calculadora
🤖 Platform: android
📦 Package: com.google.android.calculator

✅ TC001 - Suma simple: PASSED (5.2s)
✅ TC002 - Resta: PASSED (4.8s)
✅ TC003 - Multiplicación: PASSED (4.5s)
...

📊 RESUMEN: 6/6 tests PASSED (32.4s)
```

### Ejemplo 2: Ejecutar tests de gestos

```bash
node runners/mobile-runner.js tests/suites/mobile/common/gestures-tests.yml
```

### Ejemplo 3: Ejecutar suite completa de iOS

```bash
# Ejecutar uno por uno
node runners/mobile-runner.js tests/suites/mobile/ios/safari-tests.yml
node runners/mobile-runner.js tests/suites/mobile/ios/notes-tests.yml
node runners/mobile-runner.js tests/suites/mobile/ios/photos-tests.yml

# O usar el script batch (ver siguiente sección)
```

---

## 🔄 Scripts de Ejecución Batch

### Crear y usar script de ejecución masiva

```bash
# Ejecutar script que corre TODOS los tests
node scripts/run-all-mobile-tests.js

# O usando npm script
npm run test:mobile:batch
```

---

## 📊 Reportes y Screenshots

Después de ejecutar los tests, encontrarás:

### Ubicación de Screenshots
```
results/
└── [timestamp]/
    ├── calculator-sum-result.png
    ├── calculator-subtract-result.png
    ├── gmail-inbox.png
    ├── safari-wikipedia.png
    └── ...
```

### Reportes HTML
```
results/
└── [timestamp]/
    └── report.html
```

Abrir reporte:
```bash
# Windows
start results/[timestamp]/report.html

# macOS
open results/[timestamp]/report.html

# Linux
xdg-open results/[timestamp]/report.html
```

---

## 🐛 Troubleshooting

### Problema: "No devices found"
**Solución:**
```bash
# Android
adb kill-server
adb start-server
adb devices

# iOS
xcrun simctl list devices
```

### Problema: "App not installed"
**Solución:**
Verifica que la app esté instalada en el dispositivo/emulador:
```bash
# Android
adb shell pm list packages | grep [package-name]

# Instalar si no existe
adb install path/to/app.apk
```

### Problema: "Element not found"
**Solución:**
- El elemento puede tener un selector diferente en tu versión de la app
- Verifica los selectores usando:
  - Android: `adb shell uiautomator dump`
  - iOS: Xcode Accessibility Inspector

### Problema: Tests muy lentos
**Solución:**
- Reduce los `wait` times en los archivos YAML
- Usa emuladores con hardware acceleration habilitado
- Aumenta RAM del emulador

---

## 🎯 Mejores Prácticas

1. **Ejecuta tests en orden**: Algunos tests pueden dejar estado en la app
2. **Limpia datos entre ejecuciones**:
   ```bash
   # Android
   adb shell pm clear [package-name]
   ```
3. **Usa emuladores dedicados**: No uses tu dispositivo personal para testing
4. **Revisa screenshots**: Siempre revisa los screenshots después de fallos
5. **Ajusta tiempos**: Los `wait` pueden necesitar ajuste según tu hardware

---

## 📚 Recursos Adicionales

- [Documentación completa del proyecto](../../../README.md)
- [Fase 4: Test Generator](../../../FASE4_TEST_GENERATOR_MOBILE.md)
- [Fase 3: Element Finder](../../../FASE3_ELEMENT_FINDER_AVANZADO.md)

---

## 💡 Crear Nuevos Tests

### Usando el Test Generator

```bash
npm run create-mobile-test
```

Sigue el wizard interactivo para:
- Elegir entre templates predefinidos
- Generar desde lenguaje natural
- Grabar acciones en tiempo real

### Manualmente

1. Copia un archivo YAML existente
2. Modifica `suite`, `platform`, `packageName`/`bundleId`
3. Ajusta los `tests` y `steps`
4. Ejecuta con `node runners/mobile-runner.js [archivo].yml`

---

## ✅ Checklist Pre-Ejecución

- [ ] Dispositivo/emulador está encendido y conectado
- [ ] `adb devices` o `xcrun simctl list` muestra el dispositivo
- [ ] Apps necesarias están instaladas
- [ ] Hay suficiente espacio en disco para screenshots
- [ ] Node.js y dependencias están instaladas

---

## 📞 Soporte

Si encuentras problemas:
1. Revisa la sección de Troubleshooting arriba
2. Verifica los logs en `results/[timestamp]/logs/`
3. Consulta la documentación del proyecto
4. Abre un issue en el repositorio del proyecto

---

**¡Listo para ejecutar tests móviles!** 🚀
