# Guía de Testing Móvil

## 📱 Requisitos Previos

### 1. Configuración de ADB
- Instalar Android Studio o Android SDK
- ADB debe estar disponible en: `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe`

### 2. Dispositivos/Emuladores
- **Dispositivo físico**: Conectar vía USB con "Depuración USB" habilitada
- **Emulador**: Crear AVD en Android Studio o iniciar desde la interfaz web

## 🚀 Inicio Rápido

### Iniciar Emulador
```bash
# Listar emuladores disponibles
emulator -list-avds

# Iniciar emulador
emulator -avd Pixel_6a_2
```

O desde la interfaz web:
1. Ve a **📱 Dispositivos Móviles** → **🖥️ Emuladores**
2. Haz clic en **▶️ Iniciar** en el emulador deseado
3. Espera 30-60 segundos a que inicie

### Verificar Dispositivos Conectados
```bash
adb devices
```

## 📝 Estructura de Tests Móviles

### Formato YAML

```yaml
suite: "Nombre de la Suite"
description: "Descripción de la suite"
platform: "android"  # o "ios"
packageName: "com.example.app"

tests:
  - name: "TC001 - Nombre del test"
    description: "Descripción del test"
    steps:
      - action: launchApp
        packageName: "com.example.app"
        description: "Abrir aplicación"

      - action: wait
        duration: 2000
        description: "Esperar 2 segundos"

      - action: tap
        x: 540
        y: 1200
        description: "Tap en coordenadas"

      - action: screenshot
        filename: "captura-nombre"

    expectedResult: "El test debe completarse exitosamente"
```

## 🔧 Acciones Disponibles

### 1. launchApp
Lanza una aplicación por su package name.

```yaml
- action: launchApp
  packageName: "com.google.android.deskclock"
  description: "Abrir app de Reloj"
```

### 2. tap
Toca la pantalla. Requiere coordenadas (x, y) o texto.

**Por coordenadas:**
```yaml
- action: tap
  x: 540
  y: 1200
  description: "Tap en botón"
```

**Por texto:**
```yaml
- action: tap
  text: "Aceptar"
  description: "Tap en botón Aceptar"
```

### 3. doubleTap
Doble tap en coordenadas.

```yaml
- action: doubleTap
  x: 540
  y: 1200
  description: "Doble tap en elemento"
```

### 4. longPress
Mantiene presionado durante un tiempo.

```yaml
- action: longPress
  x: 540
  y: 1200
  duration: 1000
  description: "Long press por 1 segundo"
```

### 5. swipe
Desliza desde un punto a otro.

```yaml
- action: swipe
  startX: 700
  startY: 1000
  endX: 200
  endY: 1000
  duration: 300
  description: "Swipe horizontal de derecha a izquierda"
```

### 6. type / fill
Ingresa texto en un campo.

```yaml
- action: type
  text: "Hola Mundo"
  description: "Escribir texto"
```

### 7. screenshot
Captura una screenshot.

```yaml
- action: screenshot
  filename: "nombre-captura"
  description: "Captura de pantalla"
```

### 8. wait
Espera un tiempo determinado.

```yaml
- action: wait
  duration: 2000
  description: "Esperar 2 segundos"
```

### 9. verify
Verifica que algo es correcto (el LLM determina qué verificar).

```yaml
- action: verify
  description: "Verificar que se muestra el resultado correcto"
```

### 10. pressButton
Presiona botones del sistema.

```yaml
- action: pressButton
  button: "back"  # back, home, menu, recent, power
  description: "Presionar botón Back"
```

### 11. setOrientation
Cambia la orientación del dispositivo.

```yaml
- action: setOrientation
  orientation: "landscape"  # portrait o landscape
  description: "Cambiar a modo horizontal"
```

## 🎯 Ejemplo Completo: Test de Clock

```yaml
suite: "Clock Android - Test de Ejemplo"
description: "Test de ejemplo para demostrar la estructura correcta"
platform: "android"
packageName: "com.google.android.deskclock"

tests:
  - name: "TC001 - Abrir Clock y verificar"
    description: "Abre la app de Clock y verifica que funciona"
    steps:
      - action: launchApp
        packageName: "com.google.android.deskclock"
        description: "Abrir app de Reloj"

      - action: wait
        duration: 2000
        description: "Esperar que cargue la app"

      - action: screenshot
        filename: "clock-opened"
        description: "Captura de Clock abierto"

      - action: verify
        description: "Verificar que la app se abrió correctamente"

    expectedResult: "La app de Clock se abre correctamente"

  - name: "TC002 - Navegar por tabs"
    description: "Navega por los tabs de la app"
    steps:
      - action: launchApp
        packageName: "com.google.android.deskclock"
        description: "Abrir app de Reloj"

      - action: wait
        duration: 2000

      - action: tap
        x: 270
        y: 150
        description: "Tap en tab Alarm"

      - action: wait
        duration: 1000

      - action: screenshot
        filename: "clock-alarm-tab"
        description: "Captura del tab Alarm"

      - action: tap
        text: "Timer"
        description: "Tap en tab Timer por texto"

      - action: wait
        duration: 1000

      - action: screenshot
        filename: "clock-timer-tab"

    expectedResult: "Navegación entre tabs funciona correctamente"
```

## 📍 Cómo Obtener Coordenadas

### Método 1: Habilitar "Pointer Location" en Android
1. Ir a **Configuración** → **Opciones de desarrollador**
2. Activar **"Pointer location"**
3. Tocar la pantalla para ver las coordenadas X, Y

### Método 2: Usar ADB
```bash
# Habilitar coordenadas
adb shell settings put system pointer_location 1

# Deshabilitar
adb shell settings put system pointer_location 0
```

### Método 3: Usar UI Automator Viewer
1. Abrir Android Studio
2. **Tools** → **Device File Explorer** → **UI Automator**
3. Capturar pantalla y ver coordenadas de elementos

## 🔍 Debugging

### Ver logs del dispositivo
```bash
adb logcat | findstr "MobileTest"
```

### Capturar screenshot manualmente
```bash
adb -s emulator-5554 exec-out screencap -p > screenshot.png
```

### Listar apps instaladas
```bash
# Todas las apps
adb shell pm list packages

# Solo apps de terceros
adb shell pm list packages -3

# Buscar una app específica
adb shell pm list packages | findstr calculator
```

### Obtener package name de la app actual
```bash
adb shell dumpsys window | findstr mCurrentFocus
```

## ⚠️ Errores Comunes

### 1. "No hay dispositivos conectados"
**Solución**:
- Verificar con `adb devices`
- Iniciar emulador
- Conectar dispositivo físico con USB debugging habilitado

### 2. "App no se puede lanzar"
**Solución**:
- Verificar que el package name sea correcto
- Comprobar que la app esté instalada: `adb shell pm list packages | findstr <nombre>`

### 3. "Error en tap: Se requiere selector o coordenadas"
**Solución**:
```yaml
# ❌ INCORRECTO
- action: tap
  description: "Botón 5"

# ✅ CORRECTO
- action: tap
  x: 540
  y: 1200
  description: "Botón 5"

# ✅ TAMBIÉN CORRECTO
- action: tap
  text: "5"
  description: "Botón 5"
```

### 4. "MCP error: Tool take_screenshot not found"
**Causa**: Intentar usar acciones de web en tests móviles
**Solución**: Asegurarse de que el YAML tenga `platform: "android"` o `platform: "ios"`

## 📊 Reportes

Los reportes se generan automáticamente en:
- **Base de datos**: Accesible desde la interfaz web
- **Markdown**: `./tests/results/reporte-[timestamp].md`
- **Screenshots**: `./tests/screenshots/`

### Ver reporte en interfaz web
1. Ir a **📊 Resultados**
2. Seleccionar la ejecución
3. Ver detalles, evidencias y screenshots

## 🎓 Mejores Prácticas

1. **Siempre incluir waits**: Las apps móviles tardan en cargar
   ```yaml
   - action: launchApp
     packageName: "..."
   - action: wait
     duration: 2000  # Esperar que cargue
   ```

2. **Usar screenshots para debugging**: Captura pantallas en puntos clave
   ```yaml
   - action: screenshot
     filename: "estado-actual"
   ```

3. **Prefer texto sobre coordenadas cuando sea posible**: El texto es más robusto
   ```yaml
   - action: tap
     text: "Aceptar"  # Mejor que coordenadas fijas
   ```

4. **Verificar orientación**: Algunas apps cambian de layout
   ```yaml
   - action: setOrientation
     orientation: "portrait"
   ```

5. **Usar package names correctos**: Verificar antes de ejecutar
   ```bash
   adb shell pm list packages | findstr <nombre>
   ```

## 🔗 Referencias

- [ADB Documentation](https://developer.android.com/studio/command-line/adb)
- [Android Debug Bridge](https://developer.android.com/tools/adb)
- [UI Automator](https://developer.android.com/training/testing/other-components/ui-automator)
