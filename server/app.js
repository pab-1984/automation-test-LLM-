#!/usr/bin/env node

const express = require('express');
const path = require('path');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

// Puerto del servidor
const PORT = process.env.PORT || 3001;

// Crear aplicación Express
const app = express();

// Middleware global
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Logger middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Servir archivos estáticos desde public/
app.use(express.static(path.join(__dirname, '../public')));

// Montar rutas API
app.use('/api', routes);

// Ruta raíz - servir index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Middleware de manejo de errores (debe ir al final)
app.use(errorHandler);

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   🌐 SERVIDOR WEB INICIADO                                       ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝

🚀 URL: http://localhost:${PORT}
📡 API: http://localhost:${PORT}/api/status

✨ Funcionalidades:
   • Crear tests desde lenguaje natural
   • Ejecutar tests con IA
   • Ver resultados en tiempo real
   • Dashboard interactivo

Para detener: Ctrl + C
  `);
});

// Limpiar al cerrar
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Cerrando servidor...');

  if (global.runnerInstance) {
    await global.runnerInstance.cleanup();
  }

  server.close(() => {
    console.log('✅ Servidor cerrado');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('\n\n⚠️  Cerrando servidor...');

  if (global.runnerInstance) {
    await global.runnerInstance.cleanup();
  }

  server.close(() => {
    console.log('✅ Servidor cerrado');
    process.exit(0);
  });
});

module.exports = app;
