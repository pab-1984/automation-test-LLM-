# 🚀 Guía Rápida - Crear Tests SIN Conocimientos Técnicos

## ¿Qué es esto?

Un sistema que te permite **crear y ejecutar tests automatizados escribiendo en lenguaje natural**, sin necesidad de saber programación, selectores CSS ni nada técnico.

---

## ⭐ Método Más Rápido (Recomendado)

### Tests en Lenguaje Natural - SIN YAML

La forma **más simple y directa** de crear tests. No genera archivos, ejecuta inmediatamente.

#### En Una Línea:
```bash
npm run test-natural "Navega a google.com y busca 'testing'"
```

#### Desde Archivo de Texto:
```bash
# 1. Crea archivo tests/natural/mi-test.txt
# 2. Escribe tus instrucciones en lenguaje natural
# 3. Ejecuta:
npm run test-natural tests/natural/mi-test.txt
```

#### Desde la Interfaz Web:
```bash
npm run web
# Abre http://localhost:3001
# → Tab "💬 Tests Naturales"
```

**Ventajas:**
- ✅ **Más rápido**: Un solo comando
- ✅ **Sin archivos**: No genera YAML
- ✅ **Directo**: Se ejecuta inmediatamente
- ✅ **Flexible**: Desde línea de comandos, archivo o web

---

## 📝 Método con Wizard (Genera YAML)

Si prefieres generar archivos YAML reutilizables:

### En 3 Pasos

#### Paso 1: Ejecuta el comando
```bash
npm run create-test
```

#### Paso 2: Responde las preguntas

El sistema te preguntará:

1. **Nombre del test:** Ej: "Test de Login"
2. **URL de tu aplicación:** Ej: "http://localhost:3000"
3. **Qué quieres probar** (se abre tu editor de texto)

#### Paso 3: Escribe en lenguaje natural

```
Abre la aplicación.
Haz click en el botón que dice "Login" o "Iniciar Sesión".
Ingresa "test@example.com" en el campo de email.
Ingresa "password123" en el campo de contraseña.
Haz click en el botón "Enviar" o "Submit".
Verifica que aparezca un mensaje de bienvenida.
```

**El sistema:**
- Genera un archivo YAML compilado
- Lo ejecuta (opcional)
- Lo guarda en `tests/suites/` para reutilizar

---

## 💡 Ejemplos de Instrucciones

### Ejemplo 1: Test Simple (Lenguaje Natural)

```bash
npm run test-natural "Ve a wikipedia.org, busca 'Model Context Protocol' y verifica resultados"
```

### Ejemplo 2: Test de E-commerce (Archivo)

```
# tests/natural/test-ecommerce.txt

Abre https://mi-tienda.com
Busca el botón que dice "Add to Cart" del primer producto
Haz click en ese botón
Verifica que el carrito muestre 1 producto
Haz click en el botón "Cart" o "Carrito"
Verifica que el producto aparezca en la lista
```

```bash
npm run test-natural tests/natural/test-ecommerce.txt
```

### Ejemplo 3: Test de Formulario (Wizard)

Ejecuta `npm run create-test` y escribe:

```
Ve a la página de contacto.
Llena el campo "Nombre" con "Juan Pérez".
Llena el campo "Email" con "juan@example.com".
Llena el campo "Mensaje" con "Hola, esto es una prueba".
Haz click en el botón "Enviar".
Verifica que aparezca un mensaje de confirmación.
```

### Ejemplo 4: Test de Dashboard

```
Inicia sesión con usuario "admin@test.com" y contraseña "admin123".
Espera a que cargue el dashboard.
Verifica que aparezca el nombre del usuario.
Haz click en el botón "Configuración".
Verifica que se abra el panel de configuración.
```

---

## 🎯 Qué Hace el Sistema

1. **Lee tus instrucciones** en lenguaje natural
2. **Usa Inteligencia Artificial** para entenderlas
3. **Abre tu aplicación** y la analiza
4. **Encuentra automáticamente** los botones, campos y elementos
5. **Ejecuta el test** y genera reporte

---

## 🔥 Comparación: Test Natural vs Wizard

| Característica | Test Natural | Wizard (create-test) |
|---------------|--------------|----------------------|
| **Velocidad de setup** | ⚡ Instantáneo | 🐢 3-5 preguntas |
| **Genera archivo** | ❌ No (solo ejecuta) | ✅ Sí (YAML reutilizable) |
| **Ejecución** | Inmediata | Opcional al crear |
| **Reutilización** | Guardar en .txt | Automático en .yml |
| **Mejor para** | Tests rápidos, ad-hoc | Tests permanentes, CI/CD |
| **Opciones avanzadas** | ✅ Sí (wizard interactivo) | ✅ Sí |

**Recomendación:**
- ⭐ **Test Natural**: Para experimentar, tests únicos, debugging
- 📄 **Wizard**: Para test suite completa, integración CI/CD

---

## 🎨 Tips para Escribir Buenas Instrucciones

### ✅ Bueno

```
Haz click en el botón que dice "Agregar al Carrito".
Llena el campo de email con "test@example.com".
Verifica que el mensaje diga "Producto agregado".
```

**Por qué funciona:**
- Descripciones claras
- Menciona el texto visible
- Dice qué verificar

### ❌ Malo

```
Click en #btn-123.
Escribe en el input.
Verifica.
```

**Por qué no funciona:**
- Usa selectores técnicos (#btn-123)
- No describe el elemento
- No dice qué verificar

---

## 📚 Verbos que Puedes Usar

### Navegación
- "Abre la aplicación"
- "Ve a la página de contacto"
- "Navega a /login"
- "Abre https://google.com"

### Click
- "Haz click en el botón 'Login'"
- "Presiona el botón que dice 'Enviar'"
- "Selecciona la opción 'Premium'"
- "Click en el enlace 'Ver más'"

### Llenar Campos
- "Ingresa 'test@example.com' en el campo de email"
- "Escribe 'password123' en la contraseña"
- "Llena el campo 'Nombre' con 'Juan'"
- "Completa el formulario con..."

### Verificar
- "Verifica que aparezca un mensaje de éxito"
- "Comprueba que el carrito muestre 1 producto"
- "Asegúrate de que el usuario esté logueado"
- "Verifica que la URL sea /dashboard"

### Esperar
- "Espera a que cargue la página"
- "Espera 3 segundos"
- "Espera a que aparezca el modal"
- "Espera a que desaparezca el loader"

---

## 🔧 Qué Necesitas

### Requisitos
1. Tu aplicación **corriendo** (ej: http://localhost:3000)
2. Node.js instalado
3. Este proyecto configurado (`npm install`)

### Configuración Inicial

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar (solo primera vez)
npm run setup

# 3. Ejecutar tu primer test
npm run test-natural "Navega a google.com"
```

---

## ❓ Preguntas Frecuentes

### ¿Necesito saber programar?

**No.** Solo escribe en lenguaje natural lo que quieres probar.

### ¿Cuál es más rápido: test-natural o create-test?

**test-natural** es más rápido para ejecutar inmediatamente. **create-test** es mejor si quieres guardar el test para ejecutarlo múltiples veces.

### ¿Funciona con cualquier aplicación web?

**Sí.** React, Vue, Angular, HTML puro, etc. Todas funcionan.

### ¿Puedo guardar un test natural para reutilizarlo?

**Sí.** Guárdalo en un archivo .txt:
```bash
# Crear archivo
echo "Navega a google.com y busca 'testing'" > tests/natural/mi-test.txt

# Ejecutar cuando quieras
npm run test-natural tests/natural/mi-test.txt
```

### ¿Qué pasa si mi aplicación cambia?

Si usaste `create-test` y generaste YAML, ejecuta con `--recompile`:
```bash
npm test tests/suites/mi-test.yml --recompile
```

Si usas `test-natural`, simplemente vuelve a ejecutar el comando.

### ¿Puedo ejecutar el test en CI/CD?

**Sí.** Para CI/CD es mejor usar `create-test` porque genera YAML compilado que se ejecuta 35x más rápido:

1. Primera vez (local): `npm run create-test` → genera YAML
2. En CI/CD: `npm test tests/suites/mi-test.yml` → ejecución rápida

---

## 📁 Dónde Se Guardan las Cosas

```
tu-proyecto/
├── tests/natural/          # ← Tests en lenguaje natural (.txt)
│   └── mi-test.txt
├── tests/suites/           # ← Tests YAML (desde create-test)
│   └── mi-test.yml
├── tests/compiled/         # ← Tests compilados (auto)
│   └── mi-test-compiled.yml
├── tests/results/          # ← Reportes de resultados
│   └── reporte-*.md
└── tests/screenshots/      # ← Capturas de pantalla
    └── *.png
```

---

## 🎬 Ejemplo Completo: Test Natural

### Opción A: Desde Línea de Comandos

```bash
npm run test-natural "Ve a mercadolibre.com.uy y busca 'notebooks'"
```

### Opción B: Desde Archivo

```bash
# 1. Crear archivo
cat > tests/natural/busqueda-mercadolibre.txt << EOF
Navega a https://mercadolibre.com.uy
Busca el cuadro de búsqueda principal
Escribe "notebooks"
Presiona el botón de buscar
Verifica que aparezcan resultados
EOF

# 2. Ejecutar
npm run test-natural tests/natural/busqueda-mercadolibre.txt
```

### Opción C: Con Opciones Avanzadas (Wizard)

```bash
npm run test-natural

# Wizard interactivo:
? Instrucción de prueba: Ve a wikipedia.org y busca 'testing'
? ¿Quieres capturar screenshot de cada paso? Sí
? ¿Quieres capturar logs de consola? Sí
? ¿Quieres capturar network requests? No
? ¿Quieres métricas de performance? No
```

---

## 🎬 Ejemplo Completo: Wizard (create-test)

### 1. Ejecutar comando
```bash
npm run create-test
```

### 2. Responder preguntas
```
? Nombre del test: Test de Carrito
? URL de tu aplicación: http://localhost:3000
? Describe qué quieres probar:
```

### 3. Escribir instrucciones (se abre tu editor)
```
Abre la tienda.
Haz click en el botón "Add to Cart" del primer producto.
Verifica que el carrito muestre 1 producto.
Haz click en el botón "Cart".
Verifica que el producto aparezca en el carrito.
```

### 4. Confirmar ejecución
```
? ¿Quieres ejecutar el test inmediatamente? Sí
? ¿Tu aplicación ya está corriendo en http://localhost:3000? Sí
```

### 5. Resultado
```
✅ Test generado exitosamente!
📄 Archivo: tests/suites/test-de-carrito.yml

🚀 Ejecutando test...
[... progreso ...]

📊 RESULTADOS
✅ Exitosos: 1
❌ Fallidos: 0
⏱️  Duración: 156.04s

🎉 ¡Test completado exitosamente!

⚡ Próxima ejecución será 35x más rápida:
   npm test tests/suites/test-de-carrito.yml
```

---

## 🚀 Siguiente Ejecución (35x Más Rápida)

Solo para tests creados con `create-test`:

```bash
npm test tests/suites/test-de-carrito.yml
```

**Resultado:**
```
📊 RESULTADOS
✅ Exitosos: 1
❌ Fallidos: 0
⏱️  Duración: 4.46s  ← ¡35x más rápido!
```

---

## 💡 Pro Tips

1. **Sé específico con los textos:**
   - ✅ "botón que dice 'Add to Cart'"
   - ❌ "el botón"

2. **Divide en pasos claros:**
   - Un paso = una acción
   - No mezcles múltiples acciones

3. **Verifica resultados:**
   - Siempre verifica que la acción funcionó
   - "Verifica que..."

4. **Usa nombres descriptivos:**
   - ✅ "Test de Login con Credenciales Válidas"
   - ❌ "Test 1"

5. **Elige el método correcto:**
   - ⚡ **test-natural**: Tests rápidos, experimentación
   - 📄 **create-test**: Tests permanentes, CI/CD

6. **Para CI/CD:**
   - Primera vez local: `create-test` (genera YAML)
   - En pipeline: `npm test` (35x más rápido)

---

## 🌐 Desde la Interfaz Web

### La forma más visual:

```bash
npm run web
# Abre http://localhost:3001
```

**4 Tabs Disponibles:**

1. **📊 Dashboard**: Estado del sistema y métricas
2. **💬 Tests Naturales**: Ejecutar tests en lenguaje natural sin archivos
3. **➕ Crear Test**: Wizard visual que genera YAML
4. **▶️ Ejecutar**: Ejecutar tests existentes con logs en tiempo real

**Ejemplo en Tab "Tests Naturales":**
1. Escribe: "Navega a google.com y busca 'automation'"
2. Selecciona opciones (screenshots, logs, etc.)
3. Click "▶️ Ejecutar Test"
4. Ve el progreso en tiempo real
5. Descarga reporte al terminar

---

## 🎉 ¡Eso es Todo!

Ahora tienes **3 formas** de crear tests sin conocimientos técnicos:

### Comandos Útiles

```bash
# Método 1: Test Natural (Más Rápido) ⭐
npm run test-natural "Tu instrucción aquí"
npm run test-natural tests/natural/mi-test.txt

# Método 2: Wizard (Genera YAML)
npm run create-test

# Método 3: Interfaz Web
npm run web

# Ejecutar test YAML existente (35x más rápido)
npm test tests/suites/mi-test.yml

# Forzar recompilación
npm test tests/suites/mi-test.yml --recompile

# Ver reportes
ls tests/results/

# Ver screenshots
ls tests/screenshots/
```

---

## 📊 Resumen: ¿Cuál Usar?

| Situación | Comando Recomendado |
|-----------|---------------------|
| Quiero probar algo rápido | `npm run test-natural "instrucción"` |
| Experimento o debugging | `npm run test-natural` |
| Test para suite permanente | `npm run create-test` |
| Integración CI/CD | `npm run create-test` → `npm test` |
| Prefiero interfaz visual | `npm run web` |
| Ya tengo archivo .txt | `npm run test-natural archivo.txt` |
| Ya tengo archivo .yml | `npm test archivo.yml` |

---

**¿Necesitas ayuda?** Revisa el [README.md](README.md) para documentación completa o [ESTRUCTURA.md](ESTRUCTURA.md) para detalles técnicos.

**¡Happy Testing! 🚀**
