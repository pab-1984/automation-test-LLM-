#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { TestGenerator } = require('../runners/test-generator.js');
const { UniversalTestRunnerCore } = require('../runners/universal-runner.js');

// Puerto del servidor
const PORT = process.env.PORT || 3001;

// Estado global
let activeTestRuns = new Map(); // testId -> { status, logs, results }
let runnerInstance = null;

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
        serve404(req, res);
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
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

// Leer body de POST requests
function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// API endpoints
async function handleApi(req, res, pathname) {
  const method = req.method;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // GET /api/status - Estado del sistema
  if (pathname === '/api/status' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });

    const status = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      config: {},
      activeTests: activeTestRuns.size,
      statistics: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        successRate: 0
      }
    };

    try {
      if (fs.existsSync('./config/llm.config.json')) {
        status.config = JSON.parse(fs.readFileSync('./config/llm.config.json', 'utf8'));
      }
    } catch (e) {
      status.config.error = 'No se pudo leer la configuración';
    }

    // Calcular estadísticas de tests desde reportes
    try {
      if (fs.existsSync('./tests/results')) {
        const reports = fs.readdirSync('./tests/results').filter(f => f.endsWith('.md'));
        let totalPassed = 0;
        let totalFailed = 0;

        reports.forEach(file => {
          try {
            const content = fs.readFileSync(`./tests/results/${file}`, 'utf8');
            const passMatch = content.match(/✅ Exitosas.*?(\d+)/);
            const failMatch = content.match(/❌ Fallidas.*?(\d+)/);

            if (passMatch) totalPassed += parseInt(passMatch[1]);
            if (failMatch) totalFailed += parseInt(failMatch[1]);
          } catch (e) {
            // Ignorar errores en reportes individuales
          }
        });

        status.statistics.totalTests = totalPassed + totalFailed;
        status.statistics.passedTests = totalPassed;
        status.statistics.failedTests = totalFailed;
        status.statistics.successRate = status.statistics.totalTests > 0
          ? ((totalPassed / status.statistics.totalTests) * 100).toFixed(1)
          : 0;
      }
    } catch (e) {
      // Ignorar error de estadísticas
    }

    res.end(JSON.stringify(status, null, 2));
    return;
  }

  // GET /api/tests - Listar tests
  if (pathname === '/api/tests' && method === 'GET') {
    const tests = [];
    if (fs.existsSync('./tests/suites')) {
      fs.readdirSync('./tests/suites')
        .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'))
        .forEach(file => {
          try {
            const content = fs.readFileSync(`./tests/suites/${file}`, 'utf8');
            const stats = fs.statSync(`./tests/suites/${file}`);
            tests.push({
              file: file,
              name: file.replace('.yml', '').replace('.yaml', ''),
              size: content.length,
              modified: stats.mtime,
              path: `./tests/suites/${file}`
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

  // POST /api/tests/create - Crear test desde lenguaje natural
  if (pathname === '/api/tests/create' && method === 'POST') {
    try {
      const body = await getRequestBody(req);
      const { name, baseUrl, instructions } = body;

      if (!name || !baseUrl || !instructions) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Faltan campos requeridos: name, baseUrl, instructions' }));
        return;
      }

      // Inicializar runner si no existe
      if (!runnerInstance) {
        runnerInstance = new UniversalTestRunnerCore();
        await runnerInstance.initialize();
      }

      // Generar test
      const generator = new TestGenerator(runnerInstance.llmAdapter, runnerInstance.config);
      const testStructure = await generator.convertNaturalLanguageToTest(instructions, baseUrl, name);

      // Guardar test
      const filename = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const testPath = generator.saveTest(testStructure, filename);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        testPath: testPath,
        filename: filename,
        structure: testStructure
      }));
    } catch (error) {
      console.error('Error creando test:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // POST /api/tests/run - Ejecutar test
  if (pathname === '/api/tests/run' && method === 'POST') {
    try {
      const body = await getRequestBody(req);
      const { testPath, mode } = body;

      if (!testPath) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Campo requerido: testPath' }));
        return;
      }

      // Generar ID único para esta ejecución
      const testId = Date.now().toString();
      activeTestRuns.set(testId, {
        status: 'running',
        logs: [],
        startTime: Date.now()
      });

      // Ejecutar test en background
      executeTestAsync(testId, testPath, mode || 'auto');

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        testId: testId,
        message: 'Test iniciado'
      }));
    } catch (error) {
      console.error('Error iniciando test:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // GET /api/tests/status/:testId - Estado de ejecución
  if (pathname.startsWith('/api/tests/status/') && method === 'GET') {
    const testId = pathname.split('/').pop();

    if (activeTestRuns.has(testId)) {
      const testRun = activeTestRuns.get(testId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(testRun));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Test no encontrado' }));
    }
    return;
  }

  // GET /api/results - Listar reportes
  if (pathname === '/api/results' && method === 'GET') {
    const results = [];
    if (fs.existsSync('./tests/results')) {
      fs.readdirSync('./tests/results')
        .filter(file => file.endsWith('.md'))
        .forEach(file => {
          try {
            const stats = fs.statSync(`./tests/results/${file}`);
            const content = fs.readFileSync(`./tests/results/${file}`, 'utf8');
            results.push({
              file: file,
              modified: stats.mtime,
              size: stats.size,
              preview: content.substring(0, 200)
            });
          } catch (e) {
            results.push({ file: file, error: e.message });
          }
        });
    }

    // Ordenar por más reciente
    results.sort((a, b) => new Date(b.modified) - new Date(a.modified));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(results));
    return;
  }

  // GET /api/results/:filename - Obtener reporte específico
  if (pathname.startsWith('/api/results/') && method === 'GET') {
    const filename = pathname.split('/').pop();
    const filePath = `./tests/results/${filename}`;

    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(content);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Reporte no encontrado' }));
    }
    return;
  }

  // POST /api/llm/switch - Cambiar LLM activo
  if (pathname === '/api/llm/switch' && method === 'POST') {
    try {
      const body = await getRequestBody(req);
      const { provider } = body;

      if (!provider) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Campo requerido: provider' }));
        return;
      }

      const configPath = './config/llm.config.json';
      if (!fs.existsSync(configPath)) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Configuración no encontrada' }));
        return;
      }

      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      if (!config.providers[provider]) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: `Proveedor '${provider}' no existe`,
          available: Object.keys(config.providers)
        }));
        return;
      }

      // Cambiar proveedor activo
      const previousProvider = config.activeProvider;
      config.activeProvider = provider;
      config.providers[provider].enabled = true;

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        previous: previousProvider,
        current: provider,
        message: `LLM cambiado de ${previousProvider} a ${provider}`
      }));

    } catch (error) {
      console.error('Error cambiando LLM:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // 404 para API
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint no encontrado' }));
}

// Ejecutar test en background
async function executeTestAsync(testId, testPath, mode) {
  try {
    const testRun = activeTestRuns.get(testId);
    testRun.logs.push(`Iniciando test: ${testPath} en modo ${mode}`);

    // Inicializar runner
    const runner = new UniversalTestRunnerCore();
    await runner.initialize();

    testRun.logs.push('Runner inicializado');

    // Ejecutar test
    const results = await runner.runSuite(testPath, { mode });

    // Guardar resultados
    testRun.status = results.failed === 0 ? 'success' : 'failed';
    testRun.results = results;
    testRun.endTime = Date.now();
    testRun.duration = testRun.endTime - testRun.startTime;
    testRun.logs.push(`Test completado: ${results.passed} exitosos, ${results.failed} fallidos`);

    // Limpiar
    await runner.cleanup();

  } catch (error) {
    const testRun = activeTestRuns.get(testId);
    testRun.status = 'error';
    testRun.error = error.message;
    testRun.logs.push(`Error: ${error.message}`);
    console.error(`Error ejecutando test ${testId}:`, error);
  }
}

// Crear servidor
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  console.log(`${new Date().toISOString()} - ${req.method} ${pathname}`);

  // API endpoints
  if (pathname.startsWith('/api/')) {
    await handleApi(req, res, pathname);
    return;
  }

  // Ruta principal
  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(getMainHTML());
    return;
  }

  // Servir archivos estáticos
  const staticPath = path.join(process.cwd(), pathname);
  serveStatic(req, res, staticPath);
});

// HTML principal con interfaz mejorada
function getMainHTML() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Testing Automation Framework</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    header {
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 20px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    header h1 {
      color: #2c3e50;
      font-size: 2em;
      margin-bottom: 10px;
    }

    header p {
      color: #7f8c8d;
      font-size: 1.1em;
    }

    .tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }

    .tab-button {
      background: white;
      border: none;
      padding: 15px 30px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1em;
      transition: all 0.3s;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .tab-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }

    .tab-button.active {
      background: #667eea;
      color: white;
    }

    .tab-content {
      display: none;
    }

    .tab-content.active {
      display: block;
    }

    .card {
      background: white;
      border-radius: 12px;
      padding: 25px;
      margin-bottom: 20px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .card h2 {
      color: #2c3e50;
      margin-bottom: 20px;
      font-size: 1.5em;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      color: #2c3e50;
      font-weight: 600;
    }

    .form-group input,
    .form-group textarea,
    .form-group select {
      width: 100%;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 1em;
      transition: border-color 0.3s;
    }

    .form-group input:focus,
    .form-group textarea:focus,
    .form-group select:focus {
      outline: none;
      border-color: #667eea;
    }

    .form-group textarea {
      min-height: 150px;
      font-family: monospace;
      resize: vertical;
    }

    button {
      background: #667eea;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1em;
      transition: all 0.3s;
      margin-right: 10px;
    }

    button:hover {
      background: #5568d3;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }

    button:disabled {
      background: #95a5a6;
      cursor: not-allowed;
      transform: none;
    }

    button.secondary {
      background: #95a5a6;
    }

    button.secondary:hover {
      background: #7f8c8d;
    }

    button.danger {
      background: #e74c3c;
    }

    button.danger:hover {
      background: #c0392b;
    }

    .status {
      display: flex;
      align-items: center;
      margin: 10px 0;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 12px;
      animation: pulse 2s infinite;
    }

    .status-active { background: #27ae60; }
    .status-inactive { background: #e74c3c; }
    .status-running { background: #f39c12; }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .test-list {
      list-style: none;
    }

    .test-item {
      padding: 15px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      margin-bottom: 10px;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .test-item:hover {
      border-color: #667eea;
      background: #f8f9fa;
    }

    .test-item.selected {
      border-color: #667eea;
      background: #e8ebfe;
    }

    .alert {
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .alert-success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .alert-error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    .alert-info {
      background: #d1ecf1;
      color: #0c5460;
      border: 1px solid #bee5eb;
    }

    .log-console {
      background: #2c3e50;
      color: #ecf0f1;
      padding: 20px;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      max-height: 400px;
      overflow-y: auto;
      line-height: 1.6;
    }

    .log-console .log-entry {
      margin-bottom: 5px;
    }

    .log-console .log-entry.success {
      color: #2ecc71;
    }

    .log-console .log-entry.error {
      color: #e74c3c;
    }

    .log-console .log-entry.info {
      color: #3498db;
    }

    .results-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 20px;
    }

    .result-metric {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }

    .result-metric h3 {
      font-size: 2em;
      margin-bottom: 5px;
    }

    .result-metric p {
      font-size: 0.9em;
      opacity: 0.9;
    }

    .loading {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 3px solid rgba(255,255,255,.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s ease-in-out infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    pre {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      overflow-x: auto;
      border: 1px solid #e0e0e0;
    }

    /* LLM Selector */
    .llm-selector-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 20px;
    }

    .llm-option {
      padding: 20px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
      text-align: center;
    }

    .llm-option:hover {
      border-color: #667eea;
      background: #f8f9fa;
    }

    .llm-option.active {
      border-color: #667eea;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .llm-option h3 {
      font-size: 1.2em;
      margin-bottom: 5px;
    }

    .llm-option p {
      font-size: 0.9em;
      opacity: 0.8;
    }

    /* Statistics cards */
    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 10px;
    }

    .stat-card h3 {
      font-size: 2.5em;
      margin: 0;
    }

    .stat-card p {
      font-size: 1em;
      margin: 5px 0 0 0;
      opacity: 0.9;
    }

    /* Scrollable test list */
    .scrollable-list {
      max-height: 400px;
      overflow-y: auto;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 10px;
    }

    .scrollable-list::-webkit-scrollbar {
      width: 8px;
    }

    .scrollable-list::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 4px;
    }

    .scrollable-list::-webkit-scrollbar-thumb {
      background: #667eea;
      border-radius: 4px;
    }

    .scrollable-list::-webkit-scrollbar-thumb:hover {
      background: #5568d3;
    }

    /* Search box */
    .search-box {
      width: 100%;
      padding: 12px;
      margin-bottom: 15px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 1em;
    }

    .search-box:focus {
      outline: none;
      border-color: #667eea;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🧪 Testing Automation Framework</h1>
      <p>Sistema de testing automatizado con Inteligencia Artificial</p>
    </header>

    <div class="tabs">
      <button class="tab-button active" onclick="showTab('dashboard')">📊 Dashboard</button>
      <button class="tab-button" onclick="showTab('create')">➕ Crear Test</button>
      <button class="tab-button" onclick="showTab('run')">▶️ Ejecutar Test</button>
      <button class="tab-button" onclick="showTab('results')">📈 Resultados</button>
    </div>

    <!-- Dashboard Tab -->
    <div id="dashboard" class="tab-content active">
      <div class="grid">
        <div class="card" style="grid-column: 1 / -1;">
          <h2>🤖 Modelo LLM Activo</h2>
          <div id="llm-selector" style="margin-top: 20px;">
            <div class="status">
              <div class="loading"></div>
              <span>Cargando...</span>
            </div>
          </div>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <h2>📊 Tests Ejecutados</h2>
          <div id="test-statistics">
            <div class="status">
              <div class="loading"></div>
              <span>Cargando...</span>
            </div>
          </div>
        </div>

        <div class="card">
          <h2>💻 Sistema</h2>
          <div id="system-info">
            <div class="status">
              <div class="loading"></div>
              <span>Cargando...</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <h2>🔄 Tests en Ejecución</h2>
        <div id="active-tests">
          <p style="color: #7f8c8d;">No hay tests en ejecución en este momento</p>
        </div>
      </div>
    </div>

    <!-- Create Test Tab -->
    <div id="create" class="tab-content">
      <div class="card">
        <h2>➕ Crear Test desde Lenguaje Natural</h2>
        <p style="color: #7f8c8d; margin-bottom: 20px;">
          Describe en lenguaje natural lo que quieres probar. La IA generará el test automáticamente.
        </p>

        <div id="create-alert"></div>

        <form id="create-test-form" onsubmit="createTest(event)">
          <div class="form-group">
            <label for="test-name">Nombre del Test *</label>
            <input type="text" id="test-name" placeholder="ej: Test de Login" required>
          </div>

          <div class="form-group">
            <label for="base-url">URL de la Aplicación *</label>
            <input type="text" id="base-url" placeholder="https://www.ejemplo.com o localhost:3000" required>
            <small style="color: #7f8c8d; font-size: 0.9em;">
              💡 Puedes escribir con o sin https:// - se agregará automáticamente
            </small>
          </div>

          <div class="form-group">
            <label for="instructions">Instrucciones en Lenguaje Natural *</label>
            <textarea id="instructions" placeholder="Ejemplo:
Abre la aplicación.
Haz click en el botón 'Login'.
Ingresa 'test@example.com' en el campo de email.
Ingresa 'password123' en el campo de contraseña.
Haz click en 'Enviar'.
Verifica que aparezca un mensaje de bienvenida." required></textarea>
          </div>

          <button type="submit" id="create-btn">
            🤖 Generar Test con IA
          </button>
          <button type="button" class="secondary" onclick="document.getElementById('create-test-form').reset()">
            🔄 Limpiar
          </button>
        </form>

        <div id="generated-test"></div>
      </div>
    </div>

    <!-- Run Test Tab -->
    <div id="run" class="tab-content">
      <div class="grid">
        <div class="card">
          <h2>📋 Seleccionar Test</h2>
          <input type="text" class="search-box" id="test-search" placeholder="🔍 Buscar test..." onkeyup="filterTests()">
          <div class="scrollable-list" id="test-selector">
            <div class="status">
              <div class="loading"></div>
              <span>Cargando tests...</span>
            </div>
          </div>
        </div>

        <div class="card">
          <h2>⚙️ Configuración</h2>
          <div class="form-group">
            <label for="execution-mode">Modo de Ejecución</label>
            <select id="execution-mode">
              <option value="auto">🔄 Automático (Híbrido)</option>
              <option value="llm">🤖 LLM (Inteligente)</option>
              <option value="direct">⚡ Directo (Rápido)</option>
            </select>
          </div>

          <button onclick="runSelectedTest()" id="run-btn">
            ▶️ Ejecutar Test
          </button>
        </div>
      </div>

      <div class="card">
        <h2>📊 Estado de Ejecución</h2>
        <div id="execution-status">
          <p style="color: #7f8c8d;">Selecciona y ejecuta un test para ver el progreso</p>
        </div>
      </div>

      <div class="card" id="execution-logs-card" style="display: none;">
        <h2>📝 Logs de Ejecución</h2>
        <div class="log-console" id="execution-logs"></div>
      </div>
    </div>

    <!-- Results Tab -->
    <div id="results" class="tab-content">
      <div class="card">
        <h2>📈 Reportes Generados</h2>
        <button onclick="loadResults()" class="secondary">🔄 Actualizar</button>
        <div id="results-list" style="margin-top: 20px;">
          <div class="status">
            <div class="loading"></div>
            <span>Cargando resultados...</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    let selectedTest = null;
    let currentTestId = null;
    let statusInterval = null;

    // Cambiar tabs
    function showTab(tabName) {
      // Ocultar todos los tabs
      document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
      });
      document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
      });

      // Mostrar tab seleccionado
      document.getElementById(tabName).classList.add('active');
      event.target.classList.add('active');

      // Cargar datos según el tab
      if (tabName === 'dashboard') {
        loadSystemStatus();
      } else if (tabName === 'run') {
        loadTestSelector();
      } else if (tabName === 'results') {
        loadResults();
      }
    }

    // Cargar estado del sistema
    async function loadSystemStatus() {
      await loadLLMSelector();
      await loadTestStatistics();
      await loadSystemInfo();
    }

    // Cargar selector de LLM
    async function loadLLMSelector() {
      try {
        const response = await fetch('/api/status');
        const status = await response.json();

        const selectorDiv = document.getElementById('llm-selector');
        const providers = status.config.providers;
        const activeProvider = status.config.activeProvider;

        const providerCards = Object.keys(providers).map(key => {
          const provider = providers[key];
          const isActive = key === activeProvider;
          const emoji = {
            'ollama': '🦙',
            'gemini': '🔮',
            'openai': '🤖',
            'anthropic': '🧠'
          }[key] || '⚙️';

          return \`
            <div class="llm-option \${isActive ? 'active' : ''}" onclick="switchLLM('\${key}')" style="cursor: \${provider.enabled ? 'pointer' : 'not-allowed'}; opacity: \${provider.enabled ? '1' : '0.5'};">
              <div style="font-size: 2em; margin-bottom: 10px;">\${emoji}</div>
              <div style="font-weight: bold; text-transform: capitalize;">\${key}</div>
              <div style="font-size: 0.9em; margin-top: 5px;">\${provider.model}</div>
              \${isActive ? '<div style="margin-top: 10px; color: #4caf50;">✓ Activo</div>' : ''}
              \${!provider.enabled ? '<div style="margin-top: 10px; color: #e74c3c;">⚠️ Deshabilitado</div>' : ''}
            </div>
          \`;
        }).join('');

        selectorDiv.innerHTML = \`
          <div class="llm-selector-container">
            \${providerCards}
          </div>
        \`;
      } catch (error) {
        document.getElementById('llm-selector').innerHTML =
          '<p class="alert alert-error">Error al cargar LLM selector</p>';
      }
    }

    // Cambiar LLM activo
    async function switchLLM(provider) {
      try {
        const response = await fetch('/api/llm/switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider })
        });

        const result = await response.json();

        if (result.success) {
          // Recargar selector para reflejar el cambio
          await loadLLMSelector();

          // Mostrar notificación
          const notification = document.createElement('div');
          notification.className = 'alert alert-success';
          notification.style.position = 'fixed';
          notification.style.top = '20px';
          notification.style.right = '20px';
          notification.style.zIndex = '1000';
          notification.innerHTML = \`✅ LLM cambiado a: \${provider}\`;
          document.body.appendChild(notification);

          setTimeout(() => notification.remove(), 3000);
        } else {
          alert('Error al cambiar LLM: ' + result.error);
        }
      } catch (error) {
        alert('Error: ' + error.message);
      }
    }

    // Cargar estadísticas de tests
    async function loadTestStatistics() {
      try {
        const response = await fetch('/api/status');
        const status = await response.json();

        const statsDiv = document.getElementById('test-statistics');
        const stats = status.statistics;

        statsDiv.innerHTML = \`
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
            <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
              <h3>\${stats.totalTests}</h3>
              <p>Tests Totales</p>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%); color: white;">
              <h3>\${stats.passedTests}</h3>
              <p>Exitosos</p>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #f44336 0%, #e91e63 100%); color: white;">
              <h3>\${stats.failedTests}</h3>
              <p>Fallidos</p>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #ff9800 0%, #ff5722 100%); color: white;">
              <h3>\${stats.successRate}%</h3>
              <p>Tasa de Éxito</p>
            </div>
          </div>
        \`;
      } catch (error) {
        document.getElementById('test-statistics').innerHTML =
          '<p class="alert alert-error">Error al cargar estadísticas</p>';
      }
    }

    // Cargar información del sistema
    async function loadSystemInfo() {
      try {
        const response = await fetch('/api/status');
        const status = await response.json();

        const infoDiv = document.getElementById('system-info');

        infoDiv.innerHTML = \`
          <div class="status">
            <div class="status-indicator status-active"></div>
            <strong>Memoria:</strong> \${Math.round(status.memory.heapUsed / 1024 / 1024)} MB / \${Math.round(status.memory.heapTotal / 1024 / 1024)} MB
          </div>
          <div class="status">
            <div class="status-indicator status-active"></div>
            <strong>Uptime:</strong> \${Math.floor(status.uptime / 60)} minutos
          </div>
          <div class="status">
            <div class="status-indicator \${status.activeTests > 0 ? 'status-running' : 'status-inactive'}"></div>
            <strong>Tests Activos:</strong> \${status.activeTests}
          </div>
          <div class="status">
            <div class="status-indicator status-active"></div>
            <strong>Node Version:</strong> \${process.version || 'N/A'}
          </div>
        \`;
      } catch (error) {
        document.getElementById('system-info').innerHTML =
          '<p class="alert alert-error">Error al cargar información del sistema</p>';
      }
    }

    // Normalizar URL (agregar protocolo si falta)
    function normalizeUrl(url) {
      url = url.trim();

      // Si ya tiene protocolo, devolver tal cual
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }

      // Si es localhost, usar http://
      if (url.startsWith('localhost')) {
        return 'http://' + url;
      }

      // Si no tiene protocolo, agregar https://
      return 'https://' + url;
    }

    // Crear test desde lenguaje natural
    async function createTest(event) {
      event.preventDefault();

      const name = document.getElementById('test-name').value;
      let baseUrl = document.getElementById('base-url').value;
      const instructions = document.getElementById('instructions').value;
      const btn = document.getElementById('create-btn');
      const alertDiv = document.getElementById('create-alert');

      // Normalizar URL
      baseUrl = normalizeUrl(baseUrl);

      btn.disabled = true;
      btn.innerHTML = '<span class="loading"></span> Generando con IA...';
      alertDiv.innerHTML = '';

      try {
        const response = await fetch('/api/tests/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, baseUrl, instructions })
        });

        const result = await response.json();

        if (result.success) {
          alertDiv.innerHTML = \`
            <div class="alert alert-success">
              ✅ Test generado exitosamente!<br>
              📄 Archivo: \${result.testPath}<br>
              <button onclick="showTab('run')" style="margin-top: 10px;">▶️ Ir a ejecutar</button>
            </div>
          \`;

          // Mostrar test generado
          document.getElementById('generated-test').innerHTML = \`
            <div class="card" style="margin-top: 20px; background: #f8f9fa;">
              <h3>📝 Test Generado (YAML)</h3>
              <pre>\${JSON.stringify(result.structure, null, 2)}</pre>
            </div>
          \`;

          // Limpiar formulario
          document.getElementById('create-test-form').reset();
        } else {
          alertDiv.innerHTML = \`
            <div class="alert alert-error">
              ❌ Error: \${result.error}
            </div>
          \`;
        }
      } catch (error) {
        alertDiv.innerHTML = \`
          <div class="alert alert-error">
            ❌ Error: \${error.message}
          </div>
        \`;
      } finally {
        btn.disabled = false;
        btn.innerHTML = '🤖 Generar Test con IA';
      }
    }

    // Cargar selector de tests
    async function loadTestSelector() {
      try {
        const response = await fetch('/api/tests');
        const tests = await response.json();

        const selectorDiv = document.getElementById('test-selector');

        if (tests.length === 0) {
          selectorDiv.innerHTML = '<p style="color: #7f8c8d;">No hay tests disponibles</p>';
          return;
        }

        selectorDiv.innerHTML = \`
          <ul class="test-list">
            \${tests.map(test => \`
              <li class="test-item" onclick="selectTest('\${test.path}', '\${test.name}')">
                <span>📄 \${test.name}</span>
                <span style="color: #7f8c8d; font-size: 0.9em;">\${(test.size / 1024).toFixed(1)} KB</span>
              </li>
            \`).join('')}
          </ul>
        \`;
      } catch (error) {
        document.getElementById('test-selector').innerHTML =
          '<p class="alert alert-error">Error al cargar tests</p>';
      }
    }

    // Seleccionar test
    function selectTest(path, name) {
      selectedTest = { path, name };

      // Marcar como seleccionado
      document.querySelectorAll('.test-item').forEach(item => {
        item.classList.remove('selected');
      });
      event.currentTarget.classList.add('selected');

      document.getElementById('execution-status').innerHTML = \`
        <div class="alert alert-info">
          📄 Test seleccionado: <strong>\${name}</strong>
        </div>
      \`;
    }

    // Filtrar tests por búsqueda
    function filterTests() {
      const searchInput = document.getElementById('test-search');
      const filter = searchInput.value.toLowerCase();
      const testItems = document.querySelectorAll('#test-selector .test-item');

      testItems.forEach(item => {
        const testName = item.textContent.toLowerCase();
        if (testName.includes(filter)) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
    }

    // Ejecutar test seleccionado
    async function runSelectedTest() {
      if (!selectedTest) {
        alert('Selecciona un test primero');
        return;
      }

      const mode = document.getElementById('execution-mode').value;
      const btn = document.getElementById('run-btn');

      btn.disabled = true;
      btn.innerHTML = '<span class="loading"></span> Iniciando...';

      try {
        const response = await fetch('/api/tests/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            testPath: selectedTest.path,
            mode: mode
          })
        });

        const result = await response.json();

        if (result.success) {
          currentTestId = result.testId;

          document.getElementById('execution-status').innerHTML = \`
            <div class="alert alert-info">
              🚀 Test iniciado!<br>
              📊 ID: \${result.testId}<br>
              ⚙️ Modo: \${mode}
            </div>
          \`;

          // Mostrar logs
          document.getElementById('execution-logs-card').style.display = 'block';
          document.getElementById('execution-logs').innerHTML = '<div class="log-entry info">Iniciando test...</div>';

          // Iniciar polling de estado
          startStatusPolling(result.testId);
        } else {
          document.getElementById('execution-status').innerHTML = \`
            <div class="alert alert-error">
              ❌ Error: \${result.error}
            </div>
          \`;
        }
      } catch (error) {
        document.getElementById('execution-status').innerHTML = \`
          <div class="alert alert-error">
            ❌ Error: \${error.message}
          </div>
        \`;
      } finally {
        btn.disabled = false;
        btn.innerHTML = '▶️ Ejecutar Test';
      }
    }

    // Polling de estado
    function startStatusPolling(testId) {
      if (statusInterval) {
        clearInterval(statusInterval);
      }

      statusInterval = setInterval(async () => {
        try {
          const response = await fetch(\`/api/tests/status/\${testId}\`);
          const status = await response.json();

          // Actualizar logs
          const logsDiv = document.getElementById('execution-logs');
          logsDiv.innerHTML = status.logs.map(log => {
            const type = log.includes('✅') || log.includes('exitosos') ? 'success' :
                        log.includes('❌') || log.includes('Error') ? 'error' : 'info';
            return \`<div class="log-entry \${type}">\${log}</div>\`;
          }).join('');
          logsDiv.scrollTop = logsDiv.scrollHeight;

          // Si terminó, mostrar resultados
          if (status.status !== 'running') {
            clearInterval(statusInterval);

            const resultHtml = \`
              <div class="alert \${status.status === 'success' ? 'alert-success' : 'alert-error'}">
                <strong>Estado:</strong> \${status.status === 'success' ? '✅ Exitoso' : '❌ Fallido'}<br>
                <strong>Duración:</strong> \${(status.duration / 1000).toFixed(2)}s
              </div>
            \`;

            if (status.results) {
              document.getElementById('execution-status').innerHTML = resultHtml + \`
                <div class="results-summary">
                  <div class="result-metric">
                    <h3>✅ \${status.results.passed}</h3>
                    <p>Exitosos</p>
                  </div>
                  <div class="result-metric">
                    <h3>❌ \${status.results.failed}</h3>
                    <p>Fallidos</p>
                  </div>
                  <div class="result-metric">
                    <h3>\${status.results.passed + status.results.failed}</h3>
                    <p>Total</p>
                  </div>
                  <div class="result-metric">
                    <h3>\${((status.duration / 1000) / 60).toFixed(1)}m</h3>
                    <p>Duración</p>
                  </div>
                </div>
              \`;
            } else {
              document.getElementById('execution-status').innerHTML = resultHtml;
            }

            document.getElementById('run-btn').disabled = false;
          }
        } catch (error) {
          console.error('Error en polling:', error);
          clearInterval(statusInterval);
        }
      }, 2000); // Poll cada 2 segundos
    }

    // Cargar resultados
    async function loadResults() {
      try {
        const response = await fetch('/api/results');
        const results = await response.json();

        const resultsDiv = document.getElementById('results-list');

        if (results.length === 0) {
          resultsDiv.innerHTML = '<p style="color: #7f8c8d;">No hay reportes generados</p>';
          return;
        }

        resultsDiv.innerHTML = \`
          <ul class="test-list">
            \${results.map(result => \`
              <li class="test-item" onclick="viewReport('\${result.file}')">
                <div>
                  <strong>📊 \${result.file}</strong><br>
                  <span style="color: #7f8c8d; font-size: 0.9em;">
                    \${new Date(result.modified).toLocaleString()} - \${(result.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <button onclick="viewReport('\${result.file}'); event.stopPropagation();">
                  Ver
                </button>
              </li>
            \`).join('')}
          </ul>
        \`;
      } catch (error) {
        document.getElementById('results-list').innerHTML =
          '<p class="alert alert-error">Error al cargar resultados</p>';
      }
    }

    // Ver reporte
    async function viewReport(filename) {
      try {
        const response = await fetch(\`/api/results/\${filename}\`);
        const content = await response.text();

        // Mostrar en modal o nueva ventana
        const win = window.open('', '_blank');
        win.document.write(\`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Reporte: \${filename}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; max-width: 1000px; margin: 0 auto; }
              pre { background: #f8f9fa; padding: 15px; border-radius: 8px; white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <h1>📊 Reporte: \${filename}</h1>
            <pre>\${content}</pre>
          </body>
          </html>
        \`);
      } catch (error) {
        alert('Error al cargar el reporte: ' + error.message);
      }
    }

    // Cargar datos iniciales
    document.addEventListener('DOMContentLoaded', () => {
      loadSystemStatus();
      loadTestsCount();

      // Auto-refresh del dashboard cada 30 segundos
      setInterval(() => {
        if (document.getElementById('dashboard').classList.contains('active')) {
          loadSystemStatus();
          loadTestsCount();
        }
      }, 30000);
    });
  </script>
</body>
</html>`;
}

// Iniciar servidor
server.listen(PORT, () => {
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

  if (runnerInstance) {
    await runnerInstance.cleanup();
  }

  server.close(() => {
    console.log('✅ Servidor cerrado');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('\n\n⚠️  Cerrando servidor...');

  if (runnerInstance) {
    await runnerInstance.cleanup();
  }

  server.close(() => {
    console.log('✅ Servidor cerrado');
    process.exit(0);
  });
});
