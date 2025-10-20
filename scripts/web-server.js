#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Puerto del servidor
const PORT = process.env.PORT || 3001;

// Tipos MIME
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Servir archivos estáticos
function serveStatic(req, res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Archivo no encontrado
        serve404(req, res);
      } else {
        // Error del servidor
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      // Éxito
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
}

// Página 404
function serve404(req, res) {
  res.writeHead(404, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>404 - Página no encontrada</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .error { color: #e74c3c; }
      </style>
    </head>
    <body>
      <h1 class="error">404 - Página no encontrada</h1>
      <p>La página que buscas no existe.</p>
      <a href="/">Volver al inicio</a>
    </body>
    </html>
  `);
}

// API endpoints
function handleApi(req, res, pathname) {
  const method = req.method;
  
  // Ruta base de la API
  if (pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    
    // Obtener estado del sistema
    const status = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      config: {}
    };
    
    // Leer configuración si existe
    try {
      if (fs.existsSync('./config/llm.config.json')) {
        status.config = JSON.parse(fs.readFileSync('./config/llm.config.json', 'utf8'));
      }
    } catch (e) {
      status.config.error = 'No se pudo leer la configuración';
    }
    
    res.end(JSON.stringify(status, null, 2));
    return;
  }
  
  // Listar tests
  if (pathname === '/api/tests') {
    const tests = [];
    if (fs.existsSync('./tests/suites')) {
      fs.readdirSync('./tests/suites')
        .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'))
        .forEach(file => {
          try {
            const content = fs.readFileSync(`./tests/suites/${file}`, 'utf8');
            tests.push({
              file: file,
              name: file.replace('.yml', '').replace('.yaml', ''),
              size: content.length,
              modified: fs.statSync(`./tests/suites/${file}`).mtime
            });
          } catch (e) {
            tests.push({
              file: file,
              error: e.message
            });
          }
        });
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(tests, null, 2));
    return;
  }
  
  // 404 para API
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint no encontrado' }));
}

// Crear servidor
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  console.log(`${new Date().toISOString()} - ${req.method} ${pathname}`);
  
  // API endpoints
  if (pathname.startsWith('/api/')) {
    handleApi(req, res, pathname);
    return;
  }
  
  // Ruta principal
  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Testing Automation Framework</title>
        <meta charset="utf-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; }
          .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
          header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
          button { background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin: 5px; }
          button:hover { background: #2980b9; }
          .status { display: flex; align-items: center; margin: 10px 0; }
          .status-indicator { width: 12px; height: 12px; border-radius: 50%; margin-right: 10px; }
          .status-active { background: #27ae60; }
          .status-inactive { background: #e74c3c; }
          pre { background: #2c3e50; color: #ecf0f1; padding: 15px; border-radius: 4px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <div class="container">
          <header>
            <h1>🧪 Testing Automation Framework</h1>
            <p>Sistema de testing automatizado con LLM</p>
          </header>
          
          <div class="grid">
            <div class="card">
              <h2>📊 Estado del Sistema</h2>
              <div id="system-status">Cargando...</div>
            </div>
            
            <div class="card">
              <h2>📋 Tests Disponibles</h2>
              <div id="tests-list">Cargando...</div>
            </div>
          </div>
          
          <div class="card">
            <h2>⚡ Acciones Rápidas</h2>
            <button onclick="runTest('direct')">Ejecutar Test (Directo)</button>
            <button onclick="runTest('llm')">Ejecutar Test (LLM)</button>
            <button onclick="showStatus()">Actualizar Estado</button>
          </div>
        </div>
        
        <script>
          // Cargar estado del sistema
          async function loadSystemStatus() {
            try {
              const response = await fetch('/api/status');
              const status = await response.json();
              
              const statusDiv = document.getElementById('system-status');
              statusDiv.innerHTML = \`
                <div class="status">
                  <div class="status-indicator \${status.config.activeProvider ? 'status-active' : 'status-inactive'}"></div>
                  <strong>LLM Activo:</strong> \${status.config.activeProvider || 'Ninguno'}
                </div>
                <div class="status">
                  <div class="status-indicator status-active"></div>
                  <strong>Memoria:</strong> \${Math.round(status.memory.heapUsed / 1024 / 1024)} MB
                </div>
                <div class="status">
                  <div class="status-indicator status-active"></div>
                  <strong>Uptime:</strong> \${Math.round(status.uptime)} segundos
                </div>
              \`;
            } catch (error) {
              document.getElementById('system-status').innerHTML = '<p class="error">Error al cargar el estado</p>';
            }
          }
          
          // Cargar lista de tests
          async function loadTests() {
            try {
              const response = await fetch('/api/tests');
              const tests = await response.json();
              
              const testsDiv = document.getElementById('tests-list');
              if (tests.length === 0) {
                testsDiv.innerHTML = '<p>No hay tests disponibles</p>';
                return;
              }
              
              testsDiv.innerHTML = tests.map(test => \`
                <div class="status">
                  <div class="status-indicator status-active"></div>
                  <strong>\${test.name}</strong> (\${test.file})
                </div>
              \`).join('');
            } catch (error) {
              document.getElementById('tests-list').innerHTML = '<p class="error">Error al cargar los tests</p>';
            }
          }
          
          // Ejecutar test
          async function runTest(mode) {
            alert('Funcionalidad de ejecución de tests próximamente');
          }
          
          // Mostrar estado
          function showStatus() {
            loadSystemStatus();
            loadTests();
          }
          
          // Cargar datos al inicio
          document.addEventListener('DOMContentLoaded', () => {
            loadSystemStatus();
            loadTests();
          });
        </script>
      </body>
      </html>
    `);
    return;
  }
  
  // Servir archivos estáticos
  const staticPath = path.join(process.cwd(), pathname);
  serveStatic(req, res, staticPath);
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`🚀 Servidor web iniciado en http://localhost:${PORT}`);
  console.log(`📄 Accede a la interfaz web en http://localhost:${PORT}`);
  console.log(`🔧 API disponible en http://localhost:${PORT}/api/status`);
});
