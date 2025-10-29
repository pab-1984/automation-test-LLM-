# 💬 Tests en Lenguaje Natural - Guía Completa

## 🎯 ¿Qué es esto?

Un sistema completo de testing automatizado que te permite crear y ejecutar tests usando **solo lenguaje natural**:

✅ Sin YAML
✅ Sin selectores CSS
✅ Sin conocimientos técnicos
✅ El LLM identifica elementos por contexto

---

## 🚀 Formas de Uso

### **Opción 1: Desde la CLI Interactiva** (Recomendado)

```bash
npm run cli-test
```

En el menú principal, selecciona:
```
💬 Tests en Lenguaje Natural
```

Te aparecerá un submenu con opciones:
- ✨ **Crear nuevo test interactivo** - Wizard paso a paso
- 📄 **Tests disponibles** - Ejecutar tests ya creados

---

### **Opción 2: Línea de comandos directa**

```bash
npm run test-natural "tus instrucciones aquí"
```

**Ejemplos:**

```bash
# Test simple
npm run test-natural "Navega a mercadolibre.com.uy"

# Test con interacción
npm run test-natural "Ve a mercadolibre.com.uy, busca 'laptops' y toma un screenshot"

# Test completo multi-línea
npm run test-natural "
  Navega a localhost:3000/login
  Ingresa test@example.com en el campo de email
  Ingresa password123 en el campo de contraseña
  Haz click en el botón de Login
  Verifica que llegues al dashboard
"
```

---

### **Opción 3: Desde archivo de texto**

1. Crea un archivo en `tests/natural/mi-test.txt`:

```
TEST: Búsqueda en MercadoLibre

Navega a https://www.mercadolibre.com.uy

Busca el cuadro de búsqueda principal en la página
Escribe "laptops gaming"

Haz click en el botón de búsqueda

Verifica que aparezcan resultados

Toma un screenshot
```

2. Ejecuta:

```bash
npm run test-natural tests/natural/mi-test.txt
```

---

## 🧙 Wizard Interactivo de Creación

Cuando seleccionas **"Crear nuevo test interactivo"** desde el CLI, el wizard te guía paso a paso:

### **Paso 1: Información Básica**
```
Nombre del test: Búsqueda en MercadoLibre
URL inicial: https://www.mercadolibre.com.uy
Descripción: Verifica que la búsqueda funcione correctamente
```

### **Paso 2: Opciones Avanzadas**

```
¿Capturar screenshot después de cada paso? (Sí/No)
¿Capturar logs de consola del navegador? (Sí/No) [Default: Sí]
¿Capturar requests de red? (Sí/No)
¿Analizar métricas de rendimiento? (Sí/No)
```

**¿Qué hace cada opción?**

- **Screenshots por paso**: Captura pantalla automáticamente después de `navigate`, `click`, `fill`
- **Logs de consola**: Captura `console.log`, errores JavaScript, warnings
- **Network requests**: Lista todas las llamadas HTTP/HTTPS realizadas
- **Performance metrics**: Analiza Core Web Vitals, tiempos de carga, etc.

### **Paso 3: Agregar Pasos**

Para cada paso, se abrirá tu editor de texto donde describes la acción en lenguaje natural:

```
Paso 1: Navega a https://www.mercadolibre.com.uy

Paso 2: Busca el cuadro de búsqueda principal
        y escribe "laptops gaming"

Paso 3: Haz click en el botón de búsqueda
        (puede decir "Buscar" o tener ícono de lupa)

Paso 4: Espera a que carguen los resultados
        y verifica que haya productos

Paso 5: Toma un screenshot de la página de resultados
```

### **Paso 4: Vista Previa y Guardar**

El wizard muestra el test completo y te pregunta:
- 💾 Guardar y ejecutar ahora
- 💾 Solo guardar
- 🗑️  Descartar

---

## 📊 Reportes Ricos

Cuando ejecutas un test con opciones avanzadas, obtienes un reporte completo:

### **Reporte Básico**
```
═══════════════════════════════════════════════════════
📋 REPORTE FINAL
═══════════════════════════════════════════════════════
Test completado exitosamente.
Navegación a MercadoLibre OK
Búsqueda ejecutada OK
Resultados mostrados correctamente
═══════════════════════════════════════════════════════
⏱️  Duración: 14.80s | Iteraciones: 6
═══════════════════════════════════════════════════════
```

### **Con Logs de Consola** (si `captureLogs: true`)
```
📝 LOGS DE CONSOLA
────────────────────────────────────────────────────────
[INFO] Page loaded
[WARN] Deprecated API usage in analytics.js
[ERROR] Failed to load tracking pixel: CORS error
[INFO] User interaction recorded
... (15 líneas más)
────────────────────────────────────────────────────────
```

### **Con Network Requests** (si `captureNetwork: true`)
```
🌐 NETWORK REQUESTS
────────────────────────────────────────────────────────
GET https://www.mercadolibre.com.uy/ - 200 OK
GET https://cdn.mercadolibre.com/app.js - 200 OK
GET https://api.mercadolibre.com/search?q=laptops - 200 OK
POST https://analytics.mercadolibre.com/track - 204 No Content
... (10 requests más)
────────────────────────────────────────────────────────
```

### **Con Performance Metrics** (si `performanceMetrics: true`)
```
📊 PERFORMANCE METRICS
────────────────────────────────────────────────────────
First Contentful Paint: 1.2s
Largest Contentful Paint: 2.1s
Time to Interactive: 3.5s
Total Blocking Time: 450ms
Cumulative Layout Shift: 0.05

Core Web Vitals: ✅ PASSED
────────────────────────────────────────────────────────
```

---

## 🎓 Cómo el LLM Identifica Elementos

El LLM (Gemini) usa la herramienta MCP `take_snapshot()` para "ver" la estructura de la página con UIDs únicos.

### **Ejemplo de Snapshot:**
```
<body uid="1_0">
  <header uid="1_1">
    <input uid="1_28" placeholder="Buscar productos..." />
    <button uid="1_29">Buscar</button>
  </header>
  <main uid="1_50">
    ...
  </main>
</body>
```

### **Tu instrucción:**
> "Busca el cuadro de búsqueda principal y escribe 'laptops'"

### **Razonamiento del LLM:**
```
1. Ejecuto take_snapshot() para ver la página
2. Analizo: busco <input> que se use para búsquedas
3. Encuentro: uid="1_28" con placeholder="Buscar productos..."
4. Identifico: Este es el cuadro de búsqueda principal
5. Ejecuto: fill(uid="1_28", value="laptops")
```

**El LLM entiende contexto por:**
- Texto visible (`placeholder`, `label`, contenido)
- Posición en la página (`header`, `main`, `footer`)
- Función semántica (`search`, `login`, `submit`)
- Tipo de elemento (`input[type="search"]`, `button`)
- Relación con otros elementos (input cerca de botón "Buscar")

---

## 💡 Tips y Mejores Prácticas

### ✅ **DO - Buenas Instrucciones**

```
✅ "Busca el cuadro de búsqueda principal y escribe 'laptops'"
✅ "Haz click en el botón rojo que dice 'Comprar Ahora'"
✅ "Llena el campo de email con test@example.com"
✅ "Verifica que aparezca un mensaje de éxito en verde"
```

### ❌ **DON'T - Instrucciones Vagas**

```
❌ "Haz algo con el input"
❌ "Click ahí"
❌ "Verifica que funcione"
```

### 📝 **Instrucciones Descriptivas**

Mientras más descriptivo seas, mejor:

```
"Encuentra el formulario de login en el centro de la página.
 Busca el primer campo de texto que pida el email o usuario.
 Escribe: test@example.com

 Luego busca el campo de contraseña justo debajo.
 Escribe: password123

 Finalmente, busca el botón que diga 'Iniciar Sesión', 'Login' o 'Entrar'
 y haz click en él."
```

### 🎯 **Para Tests Complejos**

Divide en pasos lógicos:

```
Paso 1: Navegación inicial
Paso 2: Login
Paso 3: Búsqueda de producto
Paso 4: Agregar al carrito
Paso 5: Verificación del carrito
Paso 6: Screenshot final
```

---

## 🔧 Configuración Avanzada

### **Variables de Entorno**

Puedes pasar opciones vía environment:

```bash
export NATURAL_TEST_OPTIONS='{"screenshotPerStep":true,"captureLogs":true}'
npm run test-natural tests/natural/mi-test.txt
```

### **Opciones en Archivo de Test**

El archivo puede incluir configuración JSON al final:

```
TEST: Mi Test

Navega a...
Haz click en...

# Opciones de ejecución (JSON)
{
  "screenshotPerStep": true,
  "captureLogs": true,
  "captureNetwork": false,
  "performanceMetrics": false
}
```

### **Timeout y Límites**

Por defecto:
- **maxIterations**: 30 (máximo 30 interacciones LLM ↔ MCP)
- **timeout MCP**: 30 segundos por operación

---

## 🎬 Ejemplo Completo Paso a Paso

### 1. Inicia el CLI:
```bash
npm run cli-test
```

### 2. Selecciona:
```
💬 Tests en Lenguaje Natural
```

### 3. Selecciona:
```
✨ Crear nuevo test interactivo
```

### 4. Completa el wizard:
```
Nombre: Test de búsqueda MercadoLibre
URL: https://www.mercadolibre.com.uy
Screenshots por paso: Sí
Capturar logs: Sí
Capturar network: No
Performance: No
```

### 5. Agrega pasos:
```
Paso 1: Navega a la URL inicial

Paso 2: Busca el cuadro de búsqueda y escribe "celulares samsung"

Paso 3: Click en buscar y espera resultados
```

### 6. Guarda y ejecuta

### 7. Observa el resultado:
```
✅ Test EXITOSO
📸 3 screenshots capturados
📝 Logs capturados (15 mensajes)
⏱️  15.2s de duración
```

---

## 🆚 Comparación con YAML

| Aspecto | YAML | Lenguaje Natural |
|---------|------|------------------|
| **Input** | `selector: "input[name='q']"` | "el cuadro de búsqueda" |
| **Conocimiento** | HTML/CSS | Solo español |
| **Creación** | Manual en editor | Wizard interactivo |
| **Mantenimiento** | Alto (selectores cambian) | Bajo (contexto se adapta) |
| **Reportes** | Básicos | Ricos (logs, network, performance) |
| **Flexibilidad** | Fija | Dinámica (LLM razona) |

---

## ❓ FAQ

**P: ¿Puedo usar esto sin internet?**
R: Sí, si usas Ollama local. Con Gemini necesitas internet.

**P: ¿Qué pasa si cambia la UI de la app?**
R: El LLM se adapta automáticamente al nuevo contexto (a diferencia de selectores CSS fijos).

**P: ¿Cuánto cuesta usar Gemini?**
R: La tier gratuita permite bastantes requests. Para uso intensivo considera Ollama local.

**P: ¿Puedo ejecutar múltiples tests en paralelo?**
R: Actualmente uno a la vez. Paralelo está en el roadmap.

**P: ¿Los screenshots se guardan?**
R: Actualmente se capturan pero no se guardan automáticamente. Feature en desarrollo.

---

## 🚧 Roadmap

- [ ] Guardar screenshots en `tests/screenshots/`
- [ ] Exportar reportes a HTML/PDF
- [ ] Soporte para assertions más complejas
- [ ] Ejecución paralela de tests
- [ ] Integración CI/CD
- [ ] Dashboard web para visualizar resultados

---

## 🎉 ¡Ya está todo listo!

**Prueba tu primer test:**

```bash
npm run cli-test
```

Selecciona "💬 Tests en Lenguaje Natural" y crea tu primer test interactivo.

**O prueba directo:**

```bash
npm run test-natural "Navega a mercadolibre.com.uy y busca 'laptops'"
```

¡Disfruta de testing sin selectores CSS! 🚀
