# 🧪 Testing Automatizado con Gemini CLI + Chrome DevTools MCP

Sistema de testing automatizado que permite ejecutar pruebas web en lenguaje natural.

## 📚 Documentación Rápida

### Ejecutar Pruebas

```bash
# Modo semi-automático (recomendado)
gemini --approval-mode auto_edit "Ejecuta las pruebas en tests/suites/"

# Modo completamente automático (cuidado!)
gemini --yolo "Ejecuta todas las pruebas"

# Modo interactivo
gemini "Ejecuta las pruebas de login"
```

### Crear Nuevas Pruebas

Edita los archivos `.yml` en `tests/suites/` o pide a Gemini que lo haga:

```bash
gemini "Crea una suite de pruebas para el carrito de compras"
```

### Ver Resultados

- **Reportes**: `tests/results/`
- **Screenshots**: `tests/screenshots/`

## 🛠️ Comandos Útiles

```bash
# Verificar autenticación
gemini auth status

# Ver ayuda
gemini --help

# Reinstalar MCP server
npm install -g @modelcontextprotocol/server-chrome-devtools
```

## 📁 Estructura del Proyecto

```
mi-proyecto-testing/
├── GEMINI.md              # Configuración del agente
├── .gemini/
│   └── settings.json      # Configuración técnica
└── tests/
    ├── suites/            # Tus pruebas (.yml)
    ├── results/           # Reportes generados
    └── screenshots/       # Capturas
```

## 🔧 Solución de Problemas

**Chrome no encontrado**: Ajusta `CHROME_PATH` en `.gemini/settings.json`

**No autenticado**: Ejecuta `gemini auth login`

**MCP no responde**: Reinstala con `npm install -g @modelcontextprotocol/server-chrome-devtools`

---

Para más detalles, consulta la guía completa de instalación.
