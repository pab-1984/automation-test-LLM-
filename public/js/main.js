// ========================================
// VARIABLES GLOBALES
// ========================================

let selectedTest = null;
let currentTestId = null;
let statusInterval = null;
let currentPlatform = 'web'; // 'web' o 'mobile'
let selectedDevice = null;
let mobileDevices = [];

// ======================================== 
// NAVEGACIÓN DE TABS
// ========================================

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
  } else if (tabName === 'natural') {
    loadNaturalTests();
  }
}

// ======================================== 
// DASHBOARD - FUNCIONES
// ========================================

async function loadSystemStatus() {
  await loadLLMSelector();
  await loadTestStatistics();
}

async function loadLLMSelector() {
  try {
    const response = await fetch('/api/status');
    const status = await response.json();

    const dropdown = document.getElementById('llm-dropdown');
    const providers = status.config.providers;
    const activeProvider = status.config.activeProvider;

    const emoji = {
      'ollama': '🦙',
      'gemini': '🔮',
      'openai': '🤖',
      'anthropic': '🧠'
    };

    const options = Object.keys(providers).map(key => {
      const provider = providers[key];
      const isActive = key === activeProvider;
      const icon = emoji[key] || '⚙️';
      const displayName = key.charAt(0).toUpperCase() + key.slice(1);

      return `<option value="${key}" ${isActive ? 'selected' : ''} ${!provider.enabled ? 'disabled' : ''}>
        ${icon} ${displayName} - ${provider.model}
      </option>`;
    }).join('');

    dropdown.innerHTML = options;
  } catch (error) {
    document.getElementById('llm-dropdown').innerHTML =
      '<option value="">Error al cargar modelos</option>';
  }
}

function handleLLMChange(provider) {
  if (provider) {
    switchLLM(provider);
  }
}

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
      showNotification(`Modelo cambiado a: ${provider}`, 'success');
    } else {
      showNotification('Error al cambiar modelo: ' + result.error, 'error');
    }
  } catch (error) {
    showNotification('Error: ' + error.message, 'error');
  }
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 30px;
    padding: 15px 20px;
    background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#e74c3c' : '#2196f3'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

async function loadTestStatistics() {
  try {
    const response = await fetch('/api/status');
    const status = await response.json();

    const statsDiv = document.getElementById('test-statistics');
    const stats = status.statistics;

    statsDiv.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
        <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
          <h3>${stats.totalTests}</h3>
          <p>Tests Totales</p>
        </div>
        <div class="stat-card" style="background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%); color: white;">
          <h3>${stats.passedTests}</h3>
          <p>Exitosos</p>
        </div>
        <div class="stat-card" style="background: linear-gradient(135deg, #f44336 0%, #e91e63 100%); color: white;">
          <h3>${stats.failedTests}</h3>
          <p>Fallidos</p>
        </div>
        <div class="stat-card" style="background: linear-gradient(135deg, #ff9800 0%, #ff5722 100%); color: white;">
          <h3>${stats.successRate}%</h3>
          <p>Tasa de Éxito</p>
        </div>
      </div>
    `;
  } catch (error) {
    document.getElementById('test-statistics').innerHTML =
      '<p class="alert alert-error">Error al cargar estadísticas</p>';
  }
}

function showExecutionConsole() {
  const consoleCard = document.getElementById('execution-console-card');
  const logsDiv = document.getElementById('execution-logs-dashboard');
  const statusDiv = document.getElementById('execution-status-dashboard');

  consoleCard.style.display = 'block';
  logsDiv.innerHTML = '<div style="color: #4caf50;">🚀 Iniciando ejecución del test...</div>';
  statusDiv.innerHTML = '<div class="loading"></div><span>⏳ Ejecutando...</span>';

  // Scroll al final de la página
  setTimeout(() => {
    consoleCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function appendExecutionLog(message, type = 'info') {
  const logsDiv = document.getElementById('execution-logs-dashboard');
  const escapedLog = message.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  let color = '#d4d4d4';
  if (type === 'error') color = '#e74c3c';
  if (type === 'success') color = '#4caf50';
  if (type === 'info') color = '#2196f3';

  logsDiv.innerHTML += `<div style="color: ${color};">${escapedLog}</div>`;
  logsDiv.scrollTop = logsDiv.scrollHeight;
}

function clearExecutionConsole() {
  const logsDiv = document.getElementById('execution-logs-dashboard');
  const statusDiv = document.getElementById('execution-status-dashboard');

  logsDiv.innerHTML = '';
  statusDiv.innerHTML = '<span>Consola limpiada</span>';
}


// ======================================== 
// CREAR TEST - FUNCIONES
// ========================================

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
      alertDiv.innerHTML = `
        <div class="alert alert-success">
          ✅ Test generado exitosamente!<br>
          📄 Archivo: ${result.testPath}<br>
          <button onclick="showTab('run')" style="margin-top: 10px;">▶️ Ir a ejecutar</button>
        </div>
      `;

      // Mostrar test generado
      document.getElementById('generated-test').innerHTML = `
        <div class="card" style="margin-top: 20px; background: #f8f9fa;">
          <h3>📝 Test Generado (YAML)</h3>
          <pre>${JSON.stringify(result.structure, null, 2)}</pre>
        </div>
      `;

      // Limpiar formulario
      document.getElementById('create-test-form').reset();
    } else {
      alertDiv.innerHTML = `
        <div class="alert alert-error">
          ❌ Error: ${result.error}
        </div>
      `;
    }
  } catch (error) {
    alertDiv.innerHTML = `
      <div class="alert alert-error">
        ❌ Error: ${error.message}
      </div>
    `;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🤖 Generar Test con IA';
  }
}

// ======================================== 
// EJECUTAR TEST - FUNCIONES
// ========================================

async function loadTestSelector() {
  try {
    const response = await fetch('/api/tests');
    const data = await response.json();
    const tests = data.tests || data; // Soporte para ambas estructuras de respuesta

    const selectorDiv = document.getElementById('test-selector');

    if (!tests || tests.length === 0) {
      selectorDiv.innerHTML = '<p style="color: #7f8c8d;">No hay tests disponibles</p>';
      return;
    }

    // Filtrar tests según plataforma seleccionada
    const filteredTests = tests.filter(test => {
      if (currentPlatform === 'mobile') {
        return test.platform === 'android' || test.platform === 'ios' || test.platform === 'common' || test.platform === 'mobile';
      } else {
        return test.platform === 'web' || !test.platform;
      }
    });

    if (filteredTests.length === 0) {
      selectorDiv.innerHTML = `<p style="color: #7f8c8d;">No hay tests disponibles para la plataforma ${currentPlatform}</p>`;
      return;
    }

    // Agrupar tests por plataforma
    const groupedTests = {};
    filteredTests.forEach(test => {
      const platform = test.platform || 'web';
      if (!groupedTests[platform]) {
        groupedTests[platform] = [];
      }
      groupedTests[platform].push(test);
    });

    const platformEmoji = {
      'web': '🌐',
      'mobile': '📱',
      'android': '🤖',
      'ios': '🍎',
      'common': '📲'
    };

    let html = '';
    for (const [platform, platformTests] of Object.entries(groupedTests)) {
      const emoji = platformEmoji[platform] || '📄';
      html += `
        <div class="test-group">
          <h4 style="margin: 15px 0 10px 0; color: #34495e; font-size: 0.95em;">
            ${emoji} ${platform.toUpperCase()} (${platformTests.length})
          </h4>
          <ul class="test-list">
            ${platformTests.map(test => `
              <li class="test-item" onclick="selectTest('${test.path}', '${test.name}', '${test.platform}')">
                <div style="flex: 1;">
                  <div style="font-weight: 500;">📄 ${test.name}</div>
                  ${test.description ? `<div style="font-size: 0.85em; color: #7f8c8d; margin-top: 3px;">${test.description}</div>` : ''}
                </div>
                <div style="text-align: right; font-size: 0.85em; color: #7f8c8d;">
                  <div>${test.testCount || 0} tests</div>
                  <div>${(test.size / 1024).toFixed(1)} KB</div>
                </div>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    selectorDiv.innerHTML = html;
  } catch (error) {
    console.error('Error cargando tests:', error);
    document.getElementById('test-selector').innerHTML =
      '<p class="alert alert-error">Error al cargar tests</p>';
  }
}

function selectTest(path, name, platform) {
  selectedTest = { path, name, platform };

  // Marcar como seleccionado
  document.querySelectorAll('.test-item').forEach(item => {
    item.classList.remove('selected');
  });
  event.currentTarget.classList.add('selected');

  // Determinar si es test móvil
  const isMobileTest = ['android', 'ios', 'mobile', 'common'].includes(platform);
  const platformIcon = isMobileTest ? '📱' : '🌐';
  const platformText = isMobileTest ? 'MÓVIL' : 'WEB';

  let warningMsg = '';
  if (isMobileTest && !selectedDevice) {
    warningMsg = '<br><span style="color: #f39c12;">⚠️ Requiere seleccionar un dispositivo móvil</span>';
  }

  document.getElementById('execution-status').innerHTML = `
    <div class="alert alert-info">
      ${platformIcon} Test seleccionado: <strong>${name}</strong><br>
      <span style="font-size: 0.85em; color: #7f8c8d;">Plataforma: ${platformText}</span>
      ${warningMsg}
    </div>
  `;
}

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
    // Construir payload con información de plataforma
    const payload = {
      testPath: selectedTest.path,
      mode: mode
    };

    // Determinar la plataforma basándose en el test seleccionado
    const testPlatform = selectedTest.platform || 'web';
    const isMobileTest = ['android', 'ios', 'mobile', 'common'].includes(testPlatform);

    // Agregar información de plataforma móvil si el test es móvil
    if (isMobileTest) {
      payload.platform = 'mobile';
      payload.deviceId = selectedDevice;

      // Validar que hay un dispositivo seleccionado
      if (!selectedDevice) {
        alert('⚠️ Este es un test móvil. Selecciona un dispositivo primero');
        btn.disabled = false;
        btn.innerHTML = '▶️ Ejecutar Test';
        return;
      }
    } else {
      payload.platform = 'web';
    }

    const response = await fetch('/api/tests/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.success) {
      currentTestId = result.testId;

      // Construir mensaje de estado según plataforma
      let platformInfo = '';
      if (currentPlatform === 'mobile') {
        const device = mobileDevices.find(d => d.id === selectedDevice);
        const deviceName = device ? device.model : selectedDevice;
        platformInfo = `<br>📱 Plataforma: Mobile<br>🤖 Dispositivo: ${deviceName}`;
      } else {
        platformInfo = '<br>🌐 Plataforma: Web';
      }

      document.getElementById('execution-status').innerHTML = `
        <div class="alert alert-info">
          🚀 Test iniciado!<br>
          📊 ID: ${result.testId}<br>
          ⚙️ Modo: ${mode}${platformInfo}
        </div>
      `;

      // Mostrar logs
      document.getElementById('execution-logs-card').style.display = 'block';
      document.getElementById('execution-logs').innerHTML = '<div class="log-entry info">Iniciando test...</div>';

      // Iniciar polling de estado
      startStatusPolling(result.testId);
    } else {
      document.getElementById('execution-status').innerHTML = `
        <div class="alert alert-error">
          ❌ Error: ${result.error}
        </div>
      `;
    }
  } catch (error) {
    document.getElementById('execution-status').innerHTML = `
      <div class="alert alert-error">
        ❌ Error: ${error.message}
      </div>
    `;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '▶️ Ejecutar Test';
  }
}

function startStatusPolling(testId) {
  if (statusInterval) {
    clearInterval(statusInterval);
  }

  statusInterval = setInterval(async () => {
    try {
      const response = await fetch(`/api/tests/status/${testId}`);
      const status = await response.json();

      // Actualizar logs
      const logsDiv = document.getElementById('execution-logs');
      logsDiv.innerHTML = status.logs.map(log => {
        const type = log.includes('✅') || log.includes('exitosos') ? 'success' :
                    log.includes('❌') || log.includes('Error') ? 'error' : 'info';
        return `<div class="log-entry ${type}">${log}</div>`;
      }).join('');
      logsDiv.scrollTop = logsDiv.scrollHeight;

      // Si terminó, mostrar resultados
      if (status.status !== 'running') {
        clearInterval(statusInterval);

        const resultHtml = `
          <div class="alert ${status.status === 'success' ? 'alert-success' : 'alert-error'}">
            <strong>Estado:</strong> ${status.status === 'success' ? '✅ Exitoso' : '❌ Fallido'}<br>
            <strong>Duración:</strong> ${(status.duration / 1000).toFixed(2)}s
          </div>
        `;

        if (status.results) {
          document.getElementById('execution-status').innerHTML = resultHtml + `
            <div class="results-summary">
              <div class="result-metric">
                <h3>✅ ${status.results.passed}</h3>
                <p>Exitosos</p>
              </div>
              <div class="result-metric">
                <h3>❌ ${status.results.failed}</h3>
                <p>Fallidos</p>
              </div>
              <div class="result-metric">
                <h3>${status.results.passed + status.results.failed}</h3>
                <p>Total</p>
              </div>
              <div class="result-metric">
                <h3>${((status.duration / 1000) / 60).toFixed(1)}m</h3>
                <p>Duración</p>
              </div>
            </div>
          `;
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

// ======================================== 
// RESULTADOS - FUNCIONES
// ========================================

async function loadResults() {
  try {
    const response = await fetch('/api/results');
    const data = await response.json();

    const resultsDiv = document.getElementById('results-list');

    if (!data.results || data.results.length === 0) {
      resultsDiv.innerHTML = '<p style="color: #7f8c8d;">No hay reportes generados</p>';
      return;
    }

    const results = data.results;

    // Separar resultados de DB y archivos legacy
    const dbResults = results.filter(r => r.source === 'database');
    const fileResults = results.filter(r => r.source === 'file');

    let html = '';

    // Mostrar resultados de base de datos
    if (dbResults.length > 0) {
      html += '<h3 style="margin-top: 0;">📊 Ejecuciones Recientes</h3>';
      html += '<ul class="test-list">';
      dbResults.forEach(result => {
        const statusIcon = result.status === 'success' ? '✅' : '❌';
        const statusClass = result.status === 'success' ? 'success' : 'error';
        const date = new Date(result.started_at);
        const duration = result.duration ? `${(result.duration / 1000).toFixed(2)}s` : 'N/A';

        html += `
          <li class="test-item" onclick="viewDatabaseReport(${result.id})" style="cursor: pointer;">
            <div>
              <strong>${statusIcon} ${result.test_name}</strong>
              <span class="badge badge-${statusClass}" style="margin-left: 8px;">${result.status.toUpperCase()}</span>
              <br>
              <span style="color: #7f8c8d; font-size: 0.9em;">
                ${date.toLocaleString()} • Duración: ${duration}
                ${result.evidence_count > 0 ? ` • ${result.evidence_count} evidencias` : ''}
              </span>
            </div>
            <button onclick="viewDatabaseReport(${result.id}); event.stopPropagation();" class="btn-secondary">
              Ver Detalle
            </button>
          </li>
        `;
      });
      html += '</ul>';
    }

    // Mostrar reportes legacy si existen
    if (fileResults.length > 0) {
      html += '<h3 style="margin-top: 20px;">📄 Reportes Legacy (Archivos .md)</h3>';
      html += '<ul class="test-list">';
      fileResults.forEach(result => {
        html += `
          <li class="test-item" onclick="viewReport('${result.file}')" style="cursor: pointer;">
            <div>
              <strong>📊 ${result.file}</strong><br>
              <span style="color: #7f8c8d; font-size: 0.9em;">
                ${new Date(result.modified).toLocaleString()} • ${(result.size / 1024).toFixed(1)} KB
              </span>
            </div>
            <button onclick="viewReport('${result.file}'); event.stopPropagation();" class="btn-secondary">
              Ver
            </button>
          </li>
        `;
      });
      html += '</ul>';
    }

    resultsDiv.innerHTML = html;
  } catch (error) {
    console.error('Error cargando resultados:', error);
    document.getElementById('results-list').innerHTML =
      '<p class="alert alert-error">Error al cargar resultados: ' + error.message + '</p>';
  }
}

async function viewReport(filename) {
  try {
    const response = await fetch(`/api/results/${filename}`);
    const content = await response.text();

    // Mostrar en modal o nueva ventana
    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reporte: ${filename}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 1000px; margin: 0 auto; }
          pre { background: #f8f9fa; padding: 15px; border-radius: 8px; white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <h1>📊 Reporte: ${filename}</h1>
        <pre>${content}</pre>
      </body>
      </html>
    `);
  } catch (error) {
    alert('Error al cargar el reporte: ' + error.message);
  }
}

async function viewDatabaseReport(executionId) {
  try {
    const response = await fetch(`/api/results/${executionId}`);
    const data = await response.json();

    if (!data) {
      alert('No se pudo cargar el reporte');
      return;
    }

    // Parsear logs si es string JSON
    let logs = data.logs;
    if (typeof logs === 'string') {
      try {
        logs = JSON.parse(logs);
      } catch (e) {
        logs = { console: [], network: [], performance: {}, steps: [] };
      }
    }

    const statusIcon = data.status === 'success' ? '✅' : '❌';
    const statusColor = data.status === 'success' ? '#27ae60' : '#e74c3c';
    const startDate = new Date(data.started_at).toLocaleString();
    const duration = data.duration ? `${(data.duration / 1000).toFixed(2)}s` : 'N/A';

    // Construir HTML del reporte
    let stepsHTML = '';
    if (logs.steps && logs.steps.length > 0) {
      stepsHTML = '<h2>📝 Pasos Ejecutados</h2><ul>';
      logs.steps.forEach((step, idx) => {
        stepsHTML += `<li><strong>Paso ${idx + 1}:</strong> ${step}</li>`;
      });
      stepsHTML += '</ul>';
    } else if (typeof logs.steps === 'string') {
      stepsHTML = `<h2>📝 Resultado</h2><pre>${logs.steps}</pre>`;
    }

    let consoleLogsHTML = '';
    if (logs.console && logs.console.length > 0) {
      consoleLogsHTML = '<h2>📋 Logs de Consola</h2><pre style="max-height: 400px; overflow-y: auto;">';
      logs.console.forEach(log => {
        consoleLogsHTML += `${log}\n`;
      });
      consoleLogsHTML += '</pre>';
    }

    let networkHTML = '';
    if (logs.network && logs.network.length > 0) {
      networkHTML = '<h2>🌐 Peticiones de Red</h2><ul>';
      logs.network.forEach(req => {
        networkHTML += `<li><strong>${req.method || 'GET'}</strong> ${req.url || req}</li>`;
      });
      networkHTML += '</ul>';
    }

    let evidencesHTML = '';
    try {
      const evidencesResponse = await fetch(`/api/results/${executionId}/evidences`);
      const evidencesData = await evidencesResponse.json();

      if (evidencesData.evidences && evidencesData.evidences.length > 0) {
        evidencesHTML = '<h2>📸 Evidencias</h2><div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">';
        evidencesData.evidences.forEach(ev => {
          const fileExt = ev.file_path.split('.').pop().toLowerCase();
          if (['png', 'jpg', 'jpeg', 'gif'].includes(fileExt)) {
            evidencesHTML += `
              <div style="border: 1px solid #ddd; border-radius: 8px; padding: 10px;">
                <img src="/${ev.file_path.replace(/\\/g, '/')}" style="width: 100%; border-radius: 4px;" alt="${ev.type}">
                <p style="margin: 10px 0 0 0; font-size: 0.9em; color: #666;"><strong>${ev.type}</strong></p>
                <p style="margin: 5px 0 0 0; font-size: 0.8em; color: #999;">${new Date(ev.created_at).toLocaleString()}</p>
              </div>
            `;
          }
        });
        evidencesHTML += '</div>';
      }
    } catch (e) {
      console.error('Error cargando evidencias:', e);
    }

    // Abrir en nueva ventana
    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reporte #${executionId} - ${data.test_name}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 20px 40px;
            max-width: 1200px;
            margin: 0 auto;
            background: #f5f6fa;
          }
          .header {
            background: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .status-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
          }
          .section {
            background: white;
            padding: 25px;
            border-radius: 12px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          h1 { margin: 0 0 10px 0; color: #2c3e50; }
          h2 { color: #34495e; margin-top: 0; font-size: 1.3em; }
          pre {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            white-space: pre-wrap;
            font-size: 0.9em;
            border-left: 4px solid #3498db;
          }
          ul { line-height: 1.8; }
          .meta { color: #7f8c8d; font-size: 0.95em; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${statusIcon} ${data.test_name}</h1>
          <span class="status-badge" style="background: ${statusColor}; color: white;">
            ${data.status.toUpperCase()}
          </span>
          <div class="meta" style="margin-top: 15px;">
            <strong>ID de Ejecución:</strong> #${executionId}<br>
            <strong>Tipo:</strong> ${data.test_type || 'N/A'}<br>
            <strong>Inicio:</strong> ${startDate}<br>
            <strong>Duración:</strong> ${duration}
          </div>
        </div>

        ${stepsHTML ? `<div class="section">${stepsHTML}</div>` : ''}
        ${consoleLogsHTML ? `<div class="section">${consoleLogsHTML}</div>` : ''}
        ${networkHTML ? `<div class="section">${networkHTML}</div>` : ''}
        ${evidencesHTML ? `<div class="section">${evidencesHTML}</div>` : ''}

        ${data.error_message ? `
          <div class="section">
            <h2>❌ Error</h2>
            <pre style="border-left-color: #e74c3c;">${data.error_message}</pre>
          </div>
        ` : ''}
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error cargando reporte:', error);
    alert('Error al cargar el reporte: ' + error.message);
  }
}

// ========================================
// SIDEBAR - FUNCIONES
// ========================================

let currentProjectId = null;
let currentSuiteId = null;

async function loadProjects() {
  try {
    const response = await fetch('/api/projects');
    const data = await response.json();

    if (!data.success) {
      console.error('Error cargando proyectos:', data.error);
      return;
    }

    const explorer = document.getElementById('project-explorer');
    explorer.innerHTML = '';

    // Cargar cada proyecto con sus suites
    for (const project of data.projects) {
      const projectElement = await createProjectTreeItem(project);
      explorer.appendChild(projectElement);
    }

    // Expandir y seleccionar el primer proyecto
    if (data.projects.length > 0) {
      const firstProjectHeader = explorer.querySelector('.tree-item-header');
      if (firstProjectHeader) {
        toggleTreeItem(firstProjectHeader);
      }
    }
  } catch (error) {
    console.error('Error cargando proyectos:', error);
  }
}

async function createProjectTreeItem(project) {
  // Obtener suites del proyecto
  const suitesResponse = await fetch(`/api/suites/project/${project.id}`);
  const suitesData = await suitesResponse.json();
  const suites = suitesData.success ? suitesData.suites : [];

  const projectDiv = document.createElement('div');
  projectDiv.className = 'tree-item';
  projectDiv.dataset.projectId = project.id;

  projectDiv.innerHTML = `
    <div class="tree-item-header" onclick="toggleTreeItem(this)">
      <span class="tree-expand">▶</span>
      <span class="tree-icon">📁</span>
      <span class="tree-label">${project.name}</span>
      <div class="tree-actions">
        <button class="tree-action-btn" onclick="addSuiteToProject(${project.id}); event.stopPropagation();" title="Nueva Suite">+</button>
        <button class="tree-action-btn" onclick="deleteProjectConfirm(${project.id}, '${project.name}'); event.stopPropagation();" title="Eliminar Proyecto" style="color: #e74c3c;">🗑️</button>
      </div>
    </div>
    <div class="tree-children">
      ${suites.length === 0 ? '<div style="padding: 6px 10px; color: #7f8c8d; font-size: 0.85em;">Sin suites</div>' : ''}
    </div>
  `;

  // Agregar suites
  const childrenDiv = projectDiv.querySelector('.tree-children');
  for (const suite of suites) {
    const suiteElement = await createSuiteTreeItem(suite, project.id);
    childrenDiv.appendChild(suiteElement);
  }

  return projectDiv;
}

async function createSuiteTreeItem(suite, projectId) {
  // Obtener tests de la suite
  const testsResponse = await fetch(`/api/test-items/suite/${suite.id}`);
  const testsData = await testsResponse.json();
  const tests = testsData.success ? testsData.tests : [];

  const suiteDiv = document.createElement('div');
  suiteDiv.className = 'tree-item';
  suiteDiv.dataset.suiteId = suite.id;
  suiteDiv.dataset.projectId = projectId;

  suiteDiv.innerHTML = `
    <div class="tree-item-header" onclick="selectSuiteFromTree(${suite.id}, this, event)">
      <span class="tree-expand" onclick="toggleTreeItem(this.parentElement); event.stopPropagation();">▶</span>
      <span class="tree-icon">📋</span>
      <span class="tree-label">${suite.name}</span>
      <span class="test-count-badge">${tests.length}</span>
      <div class="tree-actions">
        <button class="tree-action-btn" onclick="addTestToSuiteFromTree(${suite.id}); event.stopPropagation();" title="Agregar Test">+</button>
        <button class="tree-action-btn" onclick="deleteSuiteConfirm(${suite.id}, '${suite.name}'); event.stopPropagation();" title="Eliminar Suite" style="color: #e74c3c;">🗑️</button>
      </div>
    </div>
    <div class="tree-children">
      ${tests.length === 0 ? '<div style="padding: 6px 10px; color: #7f8c8d; font-size: 0.85em;">Sin tests</div>' : ''}
    </div>
  `;

  // Agregar tests
  const childrenDiv = suiteDiv.querySelector('.tree-children');
  for (const test of tests) {
    const testElement = createTestTreeItem(test);
    childrenDiv.appendChild(testElement);
  }

  return suiteDiv;
}

function createTestTreeItem(test) {
  const testDiv = document.createElement('div');
  testDiv.className = 'tree-item';
  testDiv.dataset.testId = test.id;

  const icon = test.type === 'natural' ? '💬' : '📄';

  testDiv.innerHTML = `
    <div class="tree-item-header" onclick="selectTestFromTree(${test.id}, this, event)">
      <span class="tree-expand" style="visibility: hidden;"></span>
      <span class="tree-icon">${icon}</span>
      <span class="tree-label">${test.name}</span>
      <div class="tree-actions">
        <button class="tree-action-btn" onclick="executeTestItem(${test.id}); event.stopPropagation();" title="Ejecutar">▶️</button>
        <button class="tree-action-btn" onclick="deleteTestConfirm(${test.id}, '${test.name}'); event.stopPropagation();" title="Eliminar Test de Suite" style="color: #e74c3c;">🗑️</button>
      </div>
    </div>
  `;

  return testDiv;
}

function toggleTreeItem(header) {
  const treeItem = header.closest ? header.closest('.tree-item') : header.parentElement.closest('.tree-item');
  const expand = treeItem.querySelector('.tree-expand');
  const children = treeItem.querySelector('.tree-children');

  if (children) {
    const isExpanded = children.classList.contains('expanded');

    if (isExpanded) {
      children.classList.remove('expanded');
      expand.classList.remove('expanded');
    } else {
      children.classList.add('expanded');
      expand.classList.add('expanded');
    }
  }
}

async function selectSuiteFromTree(suiteId, header, event) {
  if (event) event.stopPropagation();

  // Remover selección anterior
  document.querySelectorAll('.tree-item-header.active').forEach(h => h.classList.remove('active'));

  // Marcar como activo
  header.classList.add('active');

  currentSuiteId = suiteId;

  // Obtener info de la suite
  const treeItem = header.closest('.tree-item');
  const projectId = treeItem.dataset.projectId;
  currentProjectId = projectId;

  const suiteName = header.querySelector('.tree-label').textContent;
  document.getElementById('current-suite-name').textContent = suiteName;
  document.getElementById('add-test-btn-compact').disabled = false;

  // Expandir si está colapsado
  toggleTreeItem(header);

  // Cargar tests
  await loadTestsBySuite(suiteId);

  showNotification('Suite seleccionada', 'info');
}

function selectTestFromTree(testId, header, event) {
  if (event) event.stopPropagation();

  // Remover selección anterior
  document.querySelectorAll('.tree-item-header.active').forEach(h => h.classList.remove('active'));

  // Marcar como activo
  header.classList.add('active');

  viewTestDetails(testId);
}

async function addTestSuite() {
  const suiteName = prompt('Nombre de la nueva suite:');
  if (!suiteName) return;

  const description = prompt('Descripción (opcional):') || '';

  if (!currentProjectId) {
    showNotification('Error: No hay proyecto seleccionado', 'error');
    return;
  }

  try {
    const response = await fetch('/api/suites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: currentProjectId,
        name: suiteName,
        description
      })
    });

    const data = await response.json();

    if (data.success) {
      showNotification(`Suite "${suiteName}" creada`, 'success');
      await loadProjects();
    } else {
      showNotification('Error: ' + data.error, 'error');
    }
  } catch (error) {
    showNotification('Error creando suite: ' + error.message, 'error');
  }
}

async function addSuiteToProject(projectId) {
  currentProjectId = projectId;
  await addTestSuite();
}

async function addTestToSuiteFromTree(suiteId) {
  currentSuiteId = suiteId;
  showAddTestModal();
}


async function loadTestsBySuite(suiteId) {
  try {
    const response = await fetch(`/api/test-items/suite/${suiteId}`);
    const data = await response.json();

    if (!data.success) {
      console.error('Error cargando tests:', data.error);
      return;
    }

    // Actualizar vista del dashboard con los tests
    updateDashboardTests(data.tests);
  } catch (error) {
    console.error('Error cargando tests de suite:', error);
  }
}

function updateDashboardTests(tests) {
  const listDiv = document.getElementById('suite-tests-list');
  const runAllBtn = document.getElementById('run-all-tests-btn');
  const suiteInfoSpan = document.getElementById('current-suite-info');

  if (tests.length === 0) {
    listDiv.innerHTML = '<p style="color: #7f8c8d; padding: 10px;">No hay tests en esta suite. Usa el botón "Agregar Test" para comenzar.</p>';
    runAllBtn.disabled = true;
    suiteInfoSpan.textContent = 'Sin tests';
  } else {
    let html = '<ul class="test-list" style="margin: 0;">';
    tests.forEach(test => {
      const successRate = test.execution_count > 0
        ? Math.round((test.success_count / test.execution_count) * 100)
        : 0;
      html += `
        <li class="test-item" onclick="viewTestDetails(${test.id})" style="margin-bottom: 8px;">
          <div>
            <span style="font-weight: bold; font-size: 0.95em;">${test.type === 'natural' ? '💬' : '📄'} ${test.name}</span><br>
            <span style="color: #7f8c8d; font-size: 0.85em;">
              ${test.execution_count} ejecuciones | ${successRate}% éxito
            </span>
          </div>
          <button onclick="executeTestItem(${test.id}); event.stopPropagation();" class="btn-compact">
            ▶️
          </button>
        </li>
      `;
    });
    html += '</ul>';

    listDiv.innerHTML = html;
    runAllBtn.disabled = false;
    suiteInfoSpan.textContent = `${tests.length} test${tests.length !== 1 ? 's' : ''}`;
  }

  // Guardar tests actuales para ejecutar todos
  window.currentSuiteTests = tests;
}

async function addProject() {
  const projectName = prompt('Nombre del nuevo proyecto:');
  if (!projectName) return;

  const description = prompt('Descripción (opcional):') || '';

  try {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: projectName, description })
    });

    const data = await response.json();

    if (data.success) {
      showNotification(`Proyecto "${projectName}" creado`, 'success');
      await loadProjects();
    } else {
      showNotification('Error: ' + data.error, 'error');
    }
  } catch (error) {
    showNotification('Error creando proyecto: ' + error.message, 'error');
  }
}


// ======================================== 
// TESTS NATURALES - FUNCIONES
// ========================================

async function loadNaturalTests() {
  const listDiv = document.getElementById('natural-tests-list');
  listDiv.innerHTML = '<div class="status"><div class="loading"></div><span>Cargando tests...</span></div>';

  try {
    const response = await fetch('/api/tests/natural');
    const data = await response.json();

    if (!data.tests || data.tests.length === 0) {
      listDiv.innerHTML = '<p style="color: #95a5a6; text-align: center; padding: 20px;">No hay tests naturales creados todavía</p>';
      return;
    }

    let html = '<div class="scrollable-list">';
    data.tests.forEach(test => {
      const date = new Date(test.created).toLocaleString('es-UY');
      const platform = test.platform || 'web';
      const platformIcon = platform === 'mobile' ? '📱' : '🌐';
      const platformLabel = platform === 'mobile' ? 'MÓVIL' : 'WEB';
      const platformColor = platform === 'mobile' ? '#e74c3c' : '#3498db';

      html += '<div class="list-item">';
      html += '<div>';
      html += '<div style="font-weight: bold; margin-bottom: 5px;">';
      html += '📄 ' + test.name;
      html += ' <span style="background: ' + platformColor + '; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.7em; margin-left: 8px;">';
      html += platformIcon + ' ' + platformLabel;
      html += '</span>';
      html += '</div>';
      html += '<div style="font-size: 0.9em; color: #7f8c8d;">' + (test.description || 'Sin descripción') + '</div>';
      html += '<div style="font-size: 0.85em; color: #95a5a6; margin-top: 5px;">';
      html += platformIcon + ' ' + test.url;
      if (platform === 'mobile' && test.deviceId) {
        html += ' | 📱 ' + test.deviceId;
      }
      html += ' | 📅 ' + date;
      html += '</div>';
      html += '</div>';
      html += '<button onclick="runNaturalTest(\'' + test.filename + '\')" class="primary" style="margin-left: auto;">▶️ Ejecutar</button>';
      html += '</div>';
    });
    html += '</div>';
    listDiv.innerHTML = html;

  } catch (error) {
    listDiv.innerHTML = '<p style="color: #e74c3c;">Error al cargar tests: ' + error.message + '</p>';
  }
}

function handleNaturalPlatformChange() {
  const platform = document.getElementById('natural-platform').value;
  const mobileFields = document.getElementById('natural-mobile-fields');

  if (platform === 'mobile') {
    mobileFields.style.display = 'block';
    loadDevicesForNatural();
  } else {
    mobileFields.style.display = 'none';
  }
}

async function loadDevicesForNatural() {
  try {
    const response = await fetch('/api/mobile/devices');
    const data = await response.json();

    const deviceSelect = document.getElementById('natural-device');
    deviceSelect.innerHTML = '<option value="">Seleccionar dispositivo...</option>';

    if (data.devices && data.devices.length > 0) {
      data.devices.forEach(device => {
        const icon = device.platform === 'android' ? '🤖' : '🍎';
        deviceSelect.innerHTML += `
          <option value="${device.id}">
            ${icon} ${device.model || device.name} (${device.id})
          </option>
        `;
      });
    } else {
      deviceSelect.innerHTML = '<option value="">No hay dispositivos conectados</option>';
    }
  } catch (error) {
    console.error('Error cargando dispositivos:', error);
    alert('Error al cargar dispositivos: ' + error.message);
  }
}

async function createNaturalTest() {
  const name = document.getElementById('natural-name').value.trim();
  const url = document.getElementById('natural-url').value.trim();
  const description = document.getElementById('natural-description').value.trim();
  const instructions = document.getElementById('natural-instructions').value.trim();
  const platform = document.getElementById('natural-platform').value;

  if (!name || !url || !instructions) {
    alert('Por favor completa los campos obligatorios: nombre, URL/packageName e instrucciones');
    return;
  }

  // Validar dispositivo si es móvil
  let deviceId = null;
  if (platform === 'mobile') {
    deviceId = document.getElementById('natural-device').value;
    if (!deviceId) {
      alert('Por favor selecciona un dispositivo móvil');
      return;
    }
  }

  const options = {
    screenshotPerStep: document.getElementById('natural-screenshot').checked,
    captureLogs: document.getElementById('natural-logs').checked,
    captureNetwork: document.getElementById('natural-network').checked,
    performanceMetrics: document.getElementById('natural-performance').checked
  };

  try {
    const requestBody = {
      name,
      url,
      description,
      instructions,
      options,
      platform,
      deviceId
    };

    const response = await fetch('/api/tests/natural/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (data.success) {
      alert('✅ Test "' + name + '" creado exitosamente');
      // Limpiar formulario
      document.getElementById('natural-name').value = '';
      document.getElementById('natural-url').value = '';
      document.getElementById('natural-description').value = '';
      document.getElementById('natural-instructions').value = '';
      document.getElementById('natural-screenshot').checked = false;
      document.getElementById('natural-logs').checked = true;
      document.getElementById('natural-network').checked = false;
      document.getElementById('natural-performance').checked = false;

      // Recargar lista
      loadNaturalTests();
    } else {
      alert('❌ Error: ' + (data.error || 'No se pudo crear el test'));
    }
  } catch (error) {
    alert('❌ Error al crear test: ' + error.message);
  }
}

async function createAndRunNaturalTest() {
  const name = document.getElementById('natural-name').value.trim();
  const url = document.getElementById('natural-url').value.trim();
  const description = document.getElementById('natural-description').value.trim();
  const instructions = document.getElementById('natural-instructions').value.trim();
  const platform = document.getElementById('natural-platform').value;

  if (!name || !url || !instructions) {
    alert('Por favor completa los campos obligatorios: nombre, URL/packageName e instrucciones');
    return;
  }

  // Validar dispositivo si es móvil
  let deviceId = null;
  if (platform === 'mobile') {
    deviceId = document.getElementById('natural-device').value;
    if (!deviceId) {
      alert('Por favor selecciona un dispositivo móvil');
      return;
    }
  }

  const options = {
    screenshotPerStep: document.getElementById('natural-screenshot').checked,
    captureLogs: document.getElementById('natural-logs').checked,
    captureNetwork: document.getElementById('natural-network').checked,
    performanceMetrics: document.getElementById('natural-performance').checked
  };

  try {
    const requestBody = {
      name,
      url,
      description,
      instructions,
      options,
      platform,
      deviceId
    };

    // Primero crear
    const createResponse = await fetch('/api/tests/natural/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const createData = await createResponse.json();

    if (!createData.success) {
      alert('❌ Error al crear test: ' + (createData.error || 'Error desconocido'));
      return;
    }

    // Luego ejecutar
    await runNaturalTest(createData.filename);

    // Recargar lista
    loadNaturalTests();

  } catch (error) {
    alert('❌ Error: ' + error.message);
  }
}

async function executeTest(testInfo, context = 'natural') {
  let statusDiv, logsDiv;

  if (context === 'dashboard') {
    showExecutionConsole();
    statusDiv = document.getElementById('execution-status-dashboard');
    logsDiv = document.getElementById('execution-logs-dashboard');
  } else {
    const executionArea = document.getElementById('natural-execution-area');
    executionArea.style.display = 'block';
    statusDiv = document.getElementById('natural-execution-status');
    logsDiv = document.getElementById('natural-execution-logs');
  }

  statusDiv.innerHTML = '<div class="loading"></div><span>Iniciando test...</span>';
  logsDiv.innerHTML = '<div style="color: #4caf50;">🚀 Iniciando ejecución del test...</div>';

  return new Promise(async (resolve, reject) => {
    try {
      let response;
      if (testInfo.type === 'natural') {
        response = await fetch('/api/tests/natural/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: testInfo.filename })
        });
      } else {
        response = await fetch(`/api/test-items/${testInfo.id}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'auto' })
        });
      }

      const data = await response.json();

      if (!data.success) {
        logsDiv.innerHTML += '<div style="color: #e74c3c;">❌ Error: ' + data.error + '</div>';
        statusDiv.innerHTML = '<span style="color: #e74c3c;">❌ Error</span>';
        reject('error');
        return;
      }

      logsDiv.innerHTML += '<div style="color: #2196f3;">📡 Test ID: ' + data.testId + '</div>';
      logsDiv.innerHTML += '<div style="color: #2196f3;">⏳ Ejecutando...</div>';
      logsDiv.innerHTML += '<div style="color: #666;">' + '─'.repeat(60) + '</div>';

      pollTestStatus(data.testId, statusDiv, logsDiv, (finalStatus) => {
        resolve(finalStatus);
      });

    } catch (error) {
      logsDiv.innerHTML += '<div style="color: #e74c3c;">❌ Error: ' + error.message + '</div>';
      statusDiv.innerHTML = '<span style="color: #e74c3c;">❌ Error</span>';
      reject('error');
    }
  });
}

async function runNaturalTest(filename) {
  await executeTest({ type: 'natural', filename: filename }, 'natural');
}

async function executeTestItem(testId) {
  await executeTest({ type: 'yaml', id: testId }, 'dashboard');
}

function pollTestStatus(testId, statusDiv, logsDiv, completionCallback) {
  let lastLogCount = 0;

  const pollInterval = setInterval(async () => {
    try {
      const response = await fetch(`/api/tests/status/${testId}`);
      const data = await response.json();

      // Actualizar status
      if (data.status === 'running') {
        statusDiv.innerHTML = '<div class="loading"></div><span>⏳ Ejecutando...</span>';
      } else if (data.status === 'success') {
        statusDiv.innerHTML = '<span style="color: #4caf50;">✅ Completado Exitosamente</span>';
        clearInterval(pollInterval);
        if (completionCallback) completionCallback('success');
      } else if (data.status === 'failed') {
        statusDiv.innerHTML = '<span style="color: #e74c3c;">❌ Test Fallido</span>';
        clearInterval(pollInterval);
        if (completionCallback) completionCallback('failed');
      } else if (data.status === 'error') {
        statusDiv.innerHTML = '<span style="color: #e74c3c;">❌ Error en Ejecución</span>';
        clearInterval(pollInterval);
        if (completionCallback) completionCallback('error');
      }

      // Actualizar logs (solo los nuevos)
      if (data.logs && data.logs.length > lastLogCount) {
        const newLogs = data.logs.slice(lastLogCount);
        newLogs.forEach(log => {
          const escapedLog = log.replace(/</g, '&lt;').replace(/>/g, '&gt;');
          logsDiv.innerHTML += '<div>' + escapedLog + '</div>';
        });
        lastLogCount = data.logs.length;

        // Auto-scroll al final
        logsDiv.scrollTop = logsDiv.scrollHeight;
      }

      // Si terminó, mostrar resumen
      if (data.status !== 'running' && data.results) {
        logsDiv.innerHTML += '<div style="color: #666; margin-top: 20px;">' + '═'.repeat(60) + '</div>';
        logsDiv.innerHTML += '<div style="color: #4caf50; font-weight: bold; margin-top: 10px;">📊 RESUMEN FINAL</div>';
        logsDiv.innerHTML += '<div style="color: #666; margin-top: 10px;">' + '═'.repeat(60) + '</div>';

        if (data.duration) {
          logsDiv.innerHTML += '<div style="color: #2196f3;">⏱️  Duración: ' + (data.duration / 1000).toFixed(2) + 's</div>';
        }

        // ... (resto del código de resumen)
      }

    } catch (error) {
      console.error('Error en polling:', error);
      logsDiv.innerHTML += '<div style="color: #e74c3c;">❌ Error actualizando estado: ' + error.message + '</div>';
      clearInterval(pollInterval);
      if (completionCallback) completionCallback('error');
    }
  }, 2000); // Poll cada 2 segundos
}

async function pollNaturalTestStatus(testId) {
  const statusDiv = document.getElementById('natural-execution-status');
  const logsDiv = document.getElementById('natural-execution-logs');
  pollTestStatus(testId, statusDiv, logsDiv);
}

async function pollTestExecutionLogs(testId, completionCallback) {
  const statusDiv = document.getElementById('execution-status-dashboard');
  const logsDiv = document.getElementById('execution-logs-dashboard');
  pollTestStatus(testId, statusDiv, logsDiv, completionCallback);
}
function viewTestDetails(testId) {
  showNotification('Detalles del test (próximamente)', 'info');
  // TODO: Mostrar modal con detalles y historial de ejecuciones
}

async function executeAllTestsInSuite() {
  if (!window.currentSuiteTests || window.currentSuiteTests.length === 0) {
    showNotification('No hay tests para ejecutar', 'error');
    return;
  }

  const runAllBtn = document.getElementById('run-all-tests-btn');
  const originalText = runAllBtn.innerHTML;
  runAllBtn.disabled = true;
  runAllBtn.innerHTML = '⏳ Ejecutando...';

  showNotification(`Iniciando ejecución de ${window.currentSuiteTests.length} tests`, 'info');
  showExecutionConsole();

  let successCount = 0;
  let failedCount = 0;

  for (const test of window.currentSuiteTests) {
    appendExecutionLog(`--- Iniciando test: ${test.name} ---`, 'info');
    try {
      const result = await executeTest({ type: test.type, id: test.id, filename: test.file_path }, 'dashboard');
      if (result === 'success') {
        successCount++;
        appendExecutionLog(`--- Test ${test.name} finalizado: ✅ Éxito ---`, 'success');
      } else {
        failedCount++;
        appendExecutionLog(`--- Test ${test.name} finalizado: ❌ Fallido ---`, 'error');
      }
    } catch (error) {
      failedCount++;
      appendExecutionLog(`--- Test ${test.name} finalizado: ❌ Error ---`, 'error');
    }
  }

  runAllBtn.disabled = false;
  runAllBtn.innerHTML = originalText;

  const summaryMessage = `Ejecución de suite completa: ${successCount} exitosos, ${failedCount} fallidos`;
  appendExecutionLog(summaryMessage, failedCount === 0 ? 'success' : 'error');
  showNotification(summaryMessage, failedCount === 0 ? 'success' : 'error');

  // Recargar estadísticas y la lista de tests de la suite
  await loadTestStatistics();
  if (currentSuiteId) {
    await loadTestsBySuite(currentSuiteId);
  }
}

// ======================================== 
// MODAL DE AGREGAR TESTS
// ========================================

let selectedTestToAdd = null;

async function showAddTestModal() {
  if (!currentSuiteId) {
    showNotification('Selecciona una suite primero', 'error');
    return;
  }

  const modal = document.getElementById('add-test-modal');
  modal.style.display = 'flex';

  // Cargar tests naturales por defecto
  await updateTestSourceList('natural');
}

function closeAddTestModal() {
  const modal = document.getElementById('add-test-modal');
  modal.style.display = 'none';
  selectedTestToAdd = null;
  document.getElementById('add-test-btn').disabled = true;
  document.getElementById('selected-test-preview').innerHTML = '<p style="color: #7f8c8d;">Selecciona un test de la lista</p>';
}

async function updateTestSourceList(type) {
  const listDiv = document.getElementById('available-tests-list');
  listDiv.innerHTML = '<p style="color: #7f8c8d;">Cargando tests...</p>';

  try {
    let response;
    let tests = [];

    if (type === 'natural') {
      response = await fetch('/api/tests/natural');
      const data = await response.json();

      // El endpoint devuelve { tests: [...] } o { error: '...' }
      if (data.error) {
        listDiv.innerHTML = '<p style="color: #e74c3c;">Error: ' + data.error + '</p>';
        return;
      }

      tests = data.tests || [];
    } else {
      // Tests YAML (incluye web y mobile)
      response = await fetch('/api/tests');
      const data = await response.json();

      // El endpoint ahora devuelve { success: true, tests: [...] }
      tests = data.tests || (Array.isArray(data) ? data : []);
    }

    if (!tests || tests.length === 0) {
      listDiv.innerHTML = '<p style="color: #7f8c8d;">No hay tests disponibles de este tipo</p>';
      return;
    }

    let html = '';
    tests.forEach(test => {
      const testData = type === 'natural'
        ? { name: test.name, filename: test.filename, description: test.description, url: test.url, type: 'natural' }
        : { name: test.name, path: test.path, type: 'yaml', platform: test.platform || 'web', description: test.description };

      // Determinar ícono según plataforma
      let icon = '📄';
      let platformBadge = '';

      if (type === 'natural') {
        icon = '💬';
      } else if (testData.platform) {
        const platformIcons = {
          'web': '🌐',
          'mobile': '📱',
          'android': '🤖',
          'ios': '🍎',
          'common': '📲'
        };
        icon = platformIcons[testData.platform] || '📄';
        platformBadge = `<span style="background: ${testData.platform === 'web' ? '#3498db' : '#e74c3c'}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.75em; margin-left: 8px;">${testData.platform.toUpperCase()}</span>`;
      }

      html += `
        <div class="test-item" onclick='selectTestForSuite(${JSON.stringify(testData).replace(/'/g, "&#39;")})' style="cursor: pointer;">
          <div>
            <strong>${icon} ${testData.name}</strong>${platformBadge}<br>
            ${testData.description ? `<span style="color: #7f8c8d; font-size: 0.9em;">${testData.description}</span>` : ''}
          </div>
        </div>
      `;
    });

    listDiv.innerHTML = html;
  } catch (error) {
    console.error('Error cargando tests:', error);
    listDiv.innerHTML = '<p style="color: #e74c3c;">Error: ' + error.message + '</p>';
  }
}

function selectTestForSuite(testData) {
  selectedTestToAdd = testData;

  const previewDiv = document.getElementById('selected-test-preview');
  previewDiv.innerHTML = `
    <div>
      <strong style="font-size: 1.1em;">${testData.type === 'natural' ? '💬' : '📄'} ${testData.name}</strong>
      ${testData.description ? `<p style="color: #7f8c8d; margin-top: 8px;">${testData.description}</p>` : ''}
      ${testData.url ? `<p style="color: #667eea; margin-top: 5px; font-size: 0.9em;">🌐 ${testData.url}</p>` : ''}
      <p style="color: #95a5a6; margin-top: 8px; font-size: 0.85em;">
        Tipo: ${testData.type.toUpperCase()} | Archivo: ${testData.filename || testData.path}
      </p>
    </div>
  `;

  document.getElementById('add-test-btn').disabled = false;

  // Marcar como seleccionado
  document.querySelectorAll('#available-tests-list .test-item').forEach(item => {
    item.classList.remove('selected');
  });
  event.currentTarget.classList.add('selected');
}

async function addTestToCurrentSuite() {
  if (!selectedTestToAdd || !currentSuiteId) {
    showNotification('Error: No hay test o suite seleccionada', 'error');
    return;
  }

  try {
    // Construir el path completo según el tipo
    let filePath;
    if (selectedTestToAdd.type === 'natural') {
      filePath = `tests/natural/${selectedTestToAdd.filename}`;
    } else {
      filePath = selectedTestToAdd.path;
    }

    const response = await fetch('/api/test-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suiteId: currentSuiteId,
        name: selectedTestToAdd.name,
        type: selectedTestToAdd.type,
        filePath: filePath,
        description: selectedTestToAdd.description || '',
        url: selectedTestToAdd.url || ''
      })
    });

    const data = await response.json();

    if (data.success) {
      showNotification('Test agregado a la suite correctamente', 'success');
      closeAddTestModal();
      // Recargar tests de la suite
      await loadTestsBySuite(currentSuiteId);
      // Recargar explorador completo
      await loadProjects();
    } else {
      showNotification('Error: ' + data.error, 'error');
    }
  } catch (error) {
    console.error('Error agregando test a suite:', error);
    showNotification('Error: ' + error.message, 'error');
  }
}

// ======================================== 
// FUNCIONES DE ELIMINACIÓN
// ========================================

async function deleteProjectConfirm(projectId, projectName) {
  if (!confirm(`¿Estás seguro de eliminar el proyecto "${projectName}"?\n\nSe eliminarán también sus test suites, pero los archivos de tests NO se eliminarán.`)) {
    return;
  }

  try {
    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (data.success) {
      showNotification(`Proyecto "${projectName}" eliminado`, 'success');
      await loadProjects();

      // Limpiar vista si era el proyecto/suite actual
      if (currentProjectId === projectId) {
        currentProjectId = null;
        currentSuiteId = null;
        document.getElementById('current-suite-name').textContent = 'Suite Actual';
        document.getElementById('suite-tests-list').innerHTML = '<p style="color: #7f8c8d;">Selecciona una suite</p>';
      }
    } else {
      showNotification('Error: ' + data.error, 'error');
    }
  } catch (error) {
    showNotification('Error eliminando proyecto: ' + error.message, 'error');
  }
}

async function deleteSuiteConfirm(suiteId, suiteName) {
  if (!confirm(`¿Estás seguro de eliminar la suite "${suiteName}"?\n\nLos tests de la suite quedarán sin suite asignada, pero NO se eliminarán los archivos.`)) {
    return;
  }

  try {
    const response = await fetch(`/api/suites/${suiteId}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (data.success) {
      showNotification(`Suite "${suiteName}" eliminada`, 'success');
      await loadProjects();

      // Limpiar vista si era la suite actual
      if (currentSuiteId === suiteId) {
        currentSuiteId = null;
        document.getElementById('current-suite-name').textContent = 'Suite Actual';
        document.getElementById('suite-tests-list').innerHTML = '<p style="color: #7f8c8d;">Selecciona una suite</p>';
      }
    } else {
      showNotification('Error: ' + data.error, 'error');
    }
  } catch (error) {
    showNotification('Error eliminando suite: ' + error.message, 'error');
  }
}

async function deleteTestConfirm(testId, testName) {
  if (!confirm(`¿Estás seguro de eliminar "${testName}" de la suite?\n\nNOTA: Solo se elimina la referencia en la base de datos.\nEl archivo del test NO se eliminará.`)) {
    return;
  }

  try {
    const response = await fetch(`/api/test-items/${testId}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (data.success) {
      showNotification(`Test "${testName}" eliminado de la suite`, 'success');

      // Recargar explorador y vista actual
      await loadProjects();
      if (currentSuiteId) {
        await loadTestsBySuite(currentSuiteId);
      }
    } else {
      showNotification('Error: ' + data.error, 'error');
    }
  } catch (error) {
    showNotification('Error eliminando test: ' + error.message, 'error');
  }
}

// ======================================== 
// INICIALIZACIÓN
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  loadSystemStatus();
  loadProjects(); // Cargar proyectos y suites

  // Auto-refresh del dashboard cada 30 segundos
  setInterval(() => {
    if (document.getElementById('dashboard').classList.contains('active')) {
      loadSystemStatus();
    }
  }, 30000);
});

// Agregar estilos de animación para notificaciones
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// ========================================
// MOBILE - GESTIÓN DE PLATAFORMA Y DISPOSITIVOS
// ========================================

/**
 * Maneja el cambio de plataforma (Web/Mobile)
 */
async function handlePlatformChange(platform) {
  currentPlatform = platform;

  if (platform === 'mobile') {
    // Mostrar selector de dispositivos
    document.getElementById('device-selector-container').style.display = 'flex';
    // Mostrar panel de dispositivos móviles
    document.getElementById('mobile-devices-panel').style.display = 'block';
    // Cargar dispositivos
    await loadMobileDevices();
  } else {
    // Ocultar selector de dispositivos (para web y api)
    document.getElementById('device-selector-container').style.display = 'none';
    // Ocultar panel de dispositivos móviles
    document.getElementById('mobile-devices-panel').style.display = 'none';
    selectedDevice = null;
  }

  // Actualizar interfaz
  updateUIForPlatform(platform);

  // Recargar lista de tests según plataforma
  await loadTestSelector();
}

/**
 * Carga la lista de dispositivos móviles disponibles
 */
async function loadMobileDevices() {
  try {
    const response = await fetch('/api/mobile/devices');
    const data = await response.json();

    if (data.success) {
      mobileDevices = data.devices;
      updateDeviceSelector(data.devices);
      updateDevicesPanel(data);
    } else {
      console.error('Error cargando dispositivos:', data.error);
      showNoDevicesMessage();
    }
  } catch (error) {
    console.error('Error en loadMobileDevices:', error);
    showNoDevicesMessage();
  }
}

/**
 * Actualiza el selector de dispositivos en el header
 */
function updateDeviceSelector(devices) {
  const dropdown = document.getElementById('device-dropdown');

  if (!devices || devices.length === 0) {
    dropdown.innerHTML = '<option value="">No hay dispositivos</option>';
    return;
  }

  const options = devices.map(device => {
    const icon = device.platform === 'android' ? '🤖' : '🍎';
    const typeIcon = device.type === 'emulator' ? '💻' : '📱';
    const statusIcon = device.status === 'device' || device.status === 'online' ? '🟢' : '🔴';

    return `<option value="${device.id}">
      ${icon} ${typeIcon} ${device.model} ${statusIcon}
    </option>`;
  }).join('');

  dropdown.innerHTML = options;

  // Seleccionar primer dispositivo automáticamente
  if (devices.length > 0) {
    selectedDevice = devices[0].id;
    dropdown.value = selectedDevice;
  }
}

/**
 * Actualiza el panel de información de dispositivos
 */
function updateDevicesPanel(data) {
  const panel = document.getElementById('mobile-devices-info');

  if (!data.devices || data.devices.length === 0) {
    panel.innerHTML = '<p style="color: #e74c3c;">❌ No se encontraron dispositivos móviles conectados</p>';
    return;
  }

  const html = `
    <div style="margin-bottom: 15px;">
      <strong>Dispositivos Disponibles:</strong> ${data.count}
    </div>
    <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px; font-size: 0.9em;">
      <span>🤖 Android:</span>
      <span><strong>${data.platforms.android}</strong> dispositivo(s)</span>
      <span>🍎 iOS:</span>
      <span><strong>${data.platforms.ios}</strong> dispositivo(s)</span>
    </div>
    <div style="margin-top: 15px; padding: 10px; background: #ecf0f1; border-radius: 6px;">
      ${data.devices.map(device => {
        const icon = device.platform === 'android' ? '🤖' : '🍎';
        const typeIcon = device.type === 'emulator' ? '💻' : '📱';
        const statusColor = device.status === 'device' || device.status === 'online' ? '#27ae60' : '#e74c3c';

        return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; margin-bottom: 8px; background: white; border-radius: 4px;">
            <div>
              <span style="font-size: 1.2em;">${icon} ${typeIcon}</span>
              <strong>${device.model}</strong>
            </div>
            <span style="font-size: 0.85em; color: ${statusColor};">
              ● ${device.status}
            </span>
          </div>
        `;
      }).join('')}
    </div>
  `;

  panel.innerHTML = html;
}

/**
 * Muestra mensaje cuando no hay dispositivos
 */
function showNoDevicesMessage() {
  const panel = document.getElementById('mobile-devices-info');
  panel.innerHTML = `
    <div style="color: #e74c3c; padding: 15px;">
      <p><strong>❌ No se encontraron dispositivos móviles</strong></p>
      <p style="font-size: 0.9em; margin-top: 10px;">
        <strong>Para Android:</strong><br>
        • Asegúrate de tener ADB instalado<br>
        • Conecta un dispositivo o inicia un emulador<br>
        • Ejecuta: <code>adb devices</code>
      </p>
      <p style="font-size: 0.9em; margin-top: 10px;">
        <strong>Para iOS (macOS):</strong><br>
        • Asegúrate de tener Xcode instalado<br>
        • Inicia un simulador desde Xcode
      </p>
    </div>
  `;
}

/**
 * Maneja el cambio de dispositivo seleccionado
 */
async function handleDeviceChange(deviceId) {
  selectedDevice = deviceId;
  console.log('Dispositivo seleccionado:', deviceId);

  // Obtener información detallada del dispositivo si es necesario
  if (deviceId) {
    try {
      const response = await fetch(`/api/mobile/devices/${deviceId}`);
      const data = await response.json();

      if (data.success) {
        console.log('Info del dispositivo:', data.device);
        // Aquí podrías actualizar la UI con información adicional
      }
    } catch (error) {
      console.error('Error obteniendo info del dispositivo:', error);
    }
  }
}

/**
 * Refresca la lista de dispositivos
 */
async function refreshDevices() {
  showToast('🔄 Actualizando dispositivos...', 'info');
  await loadMobileDevices();
  showToast('✅ Dispositivos actualizados', 'success');
}


/**
 * Cambia entre tabs de dispositivos y emuladores
 */
function switchMobileTab(tab) {
  const devicesTab = document.getElementById('devices-tab');
  const emulatorsTab = document.getElementById('emulators-tab');
  const devicesContent = document.getElementById('mobile-devices-content');
  const emulatorsContent = document.getElementById('mobile-emulators-content');

  if (tab === 'devices') {
    devicesTab.classList.add('active');
    devicesTab.style.borderBottom = '3px solid #007bff';
    devicesTab.style.color = '';
    emulatorsTab.classList.remove('active');
    emulatorsTab.style.borderBottom = '3px solid transparent';
    emulatorsTab.style.color = '#666';
    devicesContent.style.display = 'block';
    emulatorsContent.style.display = 'none';
  } else {
    emulatorsTab.classList.add('active');
    emulatorsTab.style.borderBottom = '3px solid #007bff';
    emulatorsTab.style.color = '';
    devicesTab.classList.remove('active');
    devicesTab.style.borderBottom = '3px solid transparent';
    devicesTab.style.color = '#666';
    emulatorsContent.style.display = 'block';
    devicesContent.style.display = 'none';

    // Cargar emuladores la primera vez que se abre el tab
    if (!window.emulatorsLoaded) {
      loadEmulators();
      window.emulatorsLoaded = true;
    }
  }
}

/**
 * Carga la lista de emuladores disponibles
 */
async function loadEmulators() {
  try {
    const panel = document.getElementById('mobile-emulators-info');
    panel.innerHTML = '<div class="status"><div class="loading"></div><span>Cargando emuladores...</span></div>';

    const response = await fetch('/api/mobile/emulators');
    const data = await response.json();

    if (data.success) {
      updateEmulatorsPanel(data);
    } else {
      panel.innerHTML = `<p style="color: #e74c3c;">❌ Error: ${data.error}</p>`;
    }
  } catch (error) {
    console.error('Error en loadEmulators:', error);
    const panel = document.getElementById('mobile-emulators-info');
    panel.innerHTML = `
      <div style="color: #e74c3c; padding: 15px;">
        <p><strong>❌ Error cargando emuladores</strong></p>
        <p style="font-size: 0.9em;">Asegúrate de tener Android SDK instalado</p>
      </div>
    `;
  }
}

/**
 * Actualiza el panel de emuladores
 */
function updateEmulatorsPanel(data) {
  const panel = document.getElementById('mobile-emulators-info');

  if (!data.emulators || data.emulators.length === 0) {
    panel.innerHTML = `
      <div style="color: #e74c3c; padding: 15px;">
        <p><strong>❌ No se encontraron emuladores (AVDs)</strong></p>
        <p style="font-size: 0.9em; margin-top: 10px;">
          <strong>Para crear un emulador:</strong><br>
          • Abre Android Studio<br>
          • Ve a Tools → Device Manager<br>
          • Crea un nuevo Virtual Device (AVD)
        </p>
      </div>
    `;
    return;
  }

  const html = `
    <div style="margin-bottom: 15px;">
      <strong>Emuladores Disponibles:</strong> ${data.count}
      <span style="margin-left: 10px; color: #27ae60;">
        🟢 En ejecución: ${data.running}
      </span>
    </div>
    <div style="margin-top: 15px;">
      ${data.emulators.map(emu => {
        const isRunning = emu.isRunning;
        const statusColor = isRunning ? '#27ae60' : '#95a5a6';
        const statusText = isRunning ? 'En ejecución' : 'Detenido';
        const deviceId = emu.actualId || emu.id;

        return `
          <div style="padding: 12px; margin-bottom: 10px; background: white; border: 1px solid #ddd; border-radius: 6px; border-left: 4px solid ${statusColor};">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: bold; margin-bottom: 5px;">
                  💻 ${emu.name}
                </div>
                <div style="font-size: 0.85em; color: ${statusColor};">
                  ● ${statusText}
                </div>
              </div>
              <div style="display: flex; gap: 5px;">
                ${isRunning ? `
                  <button onclick="stopEmulator('${deviceId}')" class="btn-compact" style="background: #e74c3c;">
                    ⏹️ Detener
                  </button>
                  <button onclick="selectEmulator('${deviceId}')" class="btn-compact" style="background: #3498db;">
                    ✅ Usar
                  </button>
                ` : `
                  <button onclick="startEmulator('${emu.name}')" class="btn-compact" style="background: #27ae60;">
                    ▶️ Iniciar
                  </button>
                `}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  panel.innerHTML = html;
}

/**
 * Inicia un emulador específico
 */
async function startEmulator(avdName) {
  try {
    showToast(`🚀 Iniciando emulador: ${avdName}...`, 'info');

    const response = await fetch(`/api/mobile/emulators/${encodeURIComponent(avdName)}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    const data = await response.json();

    if (data.success) {
      showToast(`✅ ${data.message}`, 'success');

      // Esperar 3 segundos y actualizar
      setTimeout(async () => {
        await loadEmulators();
        await loadMobileDevices();
      }, 3000);
    } else {
      showToast(`❌ Error: ${data.error}`, 'error');
    }
  } catch (error) {
    console.error('Error iniciando emulador:', error);
    showToast(`❌ Error: ${error.message}`, 'error');
  }
}

/**
 * Detiene un emulador específico
 */
async function stopEmulator(deviceId) {
  if (!confirm(`¿Detener el emulador ${deviceId}?`)) {
    return;
  }

  try {
    showToast(`⏹️ Deteniendo emulador...`, 'info');

    const response = await fetch(`/api/mobile/devices/${encodeURIComponent(deviceId)}/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.success) {
      showToast(`✅ Emulador detenido`, 'success');

      // Actualizar listas
      setTimeout(async () => {
        await loadEmulators();
        await loadMobileDevices();
      }, 2000);
    } else {
      showToast(`❌ Error: ${data.error}`, 'error');
    }
  } catch (error) {
    console.error('Error deteniendo emulador:', error);
    showToast(`❌ Error: ${error.message}`, 'error');
  }
}

/**
 * Selecciona un emulador para usarlo en tests
 */
function selectEmulator(deviceId) {
  selectedDevice = deviceId;
  const dropdown = document.getElementById('device-dropdown');
  dropdown.value = deviceId;

  // Cambiar al tab de dispositivos para mostrar selección
  switchMobileTab('devices');

  showToast(`✅ Emulador seleccionado: ${deviceId}`, 'success');
}

/**
 * Refresca la lista de emuladores
 */
async function refreshEmulators() {
  showToast('🔄 Actualizando emuladores...', 'info');
  await loadEmulators();
  showToast('✅ Emuladores actualizados', 'success');
}


/**
 * Actualiza la UI según la plataforma seleccionada
 */
function updateUIForPlatform(platform) {
  // Actualizar textos y labels según la plataforma
  const runButton = document.getElementById('run-btn');

  if (platform === 'mobile') {
    if (runButton) {
      runButton.innerHTML = '📱 Ejecutar Test Móvil';
    }
  } else if (platform === 'api') {
    if (runButton) {
      runButton.innerHTML = '🔌 Ejecutar Test API';
    }
  } else {
    if (runButton) {
      runButton.innerHTML = '▶️ Ejecutar Test';
    }
  }

  // Aquí podrías agregar más cambios de UI según la plataforma
}

// ========================================
// EDITOR DE CÓDIGO
// ========================================

let codeEditor = null;
let currentEditorFile = null;
let editorIsDirty = false;

/**
 * Inicializa el editor CodeMirror
 */
function initializeCodeEditor() {
  const textarea = document.getElementById('code-editor');

  if (!textarea || codeEditor) return;

  codeEditor = CodeMirror.fromTextArea(textarea, {
    mode: 'yaml',
    theme: 'default',
    lineNumbers: true,
    lineWrapping: true,
    indentUnit: 2,
    tabSize: 2,
    indentWithTabs: false,
    autofocus: true,
    styleActiveLine: true,
    matchBrackets: true,
    autoCloseBrackets: true,
    foldGutter: true,
    gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter']
  });

  // Detectar cambios
  codeEditor.on('change', () => {
    editorIsDirty = true;
    updateEditorButtons();
  });

  console.log('✅ Editor CodeMirror inicializado');
}

/**
 * Carga tests disponibles en el editor
 */
async function loadTestsForEditor() {
  const testType = document.getElementById('editor-test-type').value;
  const platform = document.getElementById('editor-platform-filter').value;
  const listContainer = document.getElementById('editor-tests-list');
  const platformFilterGroup = document.getElementById('editor-platform-filter-group');

  // Mostrar/ocultar filtro de plataforma según el tipo
  platformFilterGroup.style.display = testType === 'yaml' ? 'block' : 'none';

  listContainer.innerHTML = '<div class="status"><div class="loading"></div><span>Cargando...</span></div>';

  try {
    let tests = [];

    if (testType === 'natural') {
      // Cargar tests en lenguaje natural
      const response = await fetch('/api/tests/natural');
      const data = await response.json();

      if (!data.success || !data.tests) {
        listContainer.innerHTML = '<p style="color: #e74c3c;">Error cargando tests</p>';
        return;
      }

      tests = data.tests.map(test => ({
        ...test,
        path: test.fullPath || `./tests/natural/${test.filename}`,
        name: test.name || test.filename.replace('.txt', ''),
        file: test.filename,
        platform: test.platform || 'natural',
        type: 'natural'
      }));

    } else {
      // Cargar tests YAML
      const response = await fetch('/api/tests');
      const data = await response.json();

      if (!data.success || !data.tests) {
        listContainer.innerHTML = '<p style="color: #e74c3c;">Error cargando tests</p>';
        return;
      }

      tests = data.tests.map(test => ({
        ...test,
        type: 'yaml'
      }));

      // Filtrar por plataforma si no es "all"
      if (platform !== 'all') {
        tests = tests.filter(test => test.platform === platform);
      }
    }

    if (tests.length === 0) {
      listContainer.innerHTML = '<p style="color: #7f8c8d;">No hay tests disponibles</p>';
      return;
    }

    // Agrupar por plataforma (solo para YAML)
    if (testType === 'yaml') {
      const grouped = {};
      tests.forEach(test => {
        const plat = test.platform || 'web';
        if (!grouped[plat]) grouped[plat] = [];
        grouped[plat].push(test);
      });

      let html = '';
      Object.keys(grouped).sort().forEach(plat => {
        const icon = plat === 'web' ? '🌐' : plat === 'mobile' ? '📱' : plat === 'api' ? '🔌' : '📄';
        html += `<div style="margin-bottom: 15px;">
          <div style="font-weight: bold; margin-bottom: 8px; color: #2c3e50;">${icon} ${plat.toUpperCase()}</div>`;

        grouped[plat].forEach(test => {
          html += `
            <div class="test-item" onclick="loadTestInEditor('${test.path.replace(/\\/g, '\\\\')}', 'yaml')"
                 style="padding: 8px; margin-bottom: 5px; background: #f8f9fa; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
              <div style="font-weight: 500; font-size: 0.95em;">${test.name}</div>
              <div style="font-size: 0.85em; color: #7f8c8d;">${test.file}</div>
            </div>`;
        });

        html += '</div>';
      });

      listContainer.innerHTML = html;

    } else {
      // Lista simple para tests naturales
      let html = '<div style="margin-bottom: 15px;">';
      html += '<div style="font-weight: bold; margin-bottom: 8px; color: #2c3e50;">💬 TESTS EN LENGUAJE NATURAL</div>';

      tests.forEach(test => {
        const platformBadge = test.platform === 'web' ? '🌐' : test.platform === 'mobile' ? '📱' : test.platform === 'api' ? '🔌' : '📄';
        html += `
          <div class="test-item" onclick="loadTestInEditor('${test.path.replace(/\\/g, '\\\\')}', 'natural')"
               style="padding: 8px; margin-bottom: 5px; background: #f8f9fa; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
            <div style="font-weight: 500; font-size: 0.95em;">${platformBadge} ${test.name}</div>
            <div style="font-size: 0.85em; color: #7f8c8d;">${test.file}</div>
          </div>`;
      });

      html += '</div>';
      listContainer.innerHTML = html;
    }

  } catch (error) {
    console.error('Error loading tests:', error);
    listContainer.innerHTML = '<p style="color: #e74c3c;">Error cargando tests</p>';
  }
}

/**
 * Carga un test específico en el editor
 */
async function loadTestInEditor(testPath, testType = 'yaml') {
  if (editorIsDirty) {
    if (!confirm('Hay cambios sin guardar. ¿Deseas continuar?')) {
      return;
    }
  }

  try {
    const response = await fetch(`/api/editor/load?path=${encodeURIComponent(testPath)}&type=${testType}`);
    const data = await response.json();

    if (!data.success) {
      showToast('❌ Error cargando test: ' + data.error, 'error');
      return;
    }

    // Cargar contenido en el editor
    codeEditor.setValue(data.content);

    // Cambiar modo del editor según el tipo
    if (testType === 'natural') {
      codeEditor.setOption('mode', 'text/plain');
    } else {
      codeEditor.setOption('mode', 'yaml');
    }

    currentEditorFile = {
      path: testPath,
      name: data.name,
      platform: data.platform,
      suite: data.suite,
      type: testType
    };

    // Actualizar UI
    document.getElementById('editor-file-info').textContent = data.name;
    document.getElementById('editor-filename').textContent = data.name;
    document.getElementById('editor-platform-badge').innerHTML = getPlatformBadge(data.platform);
    document.getElementById('editor-suite-name').textContent = data.suite || (testType === 'natural' ? 'Test Natural' : 'N/A');
    document.getElementById('editor-test-info').style.display = 'block';

    editorIsDirty = false;
    updateEditorButtons();

    showToast('✅ Test cargado: ' + data.name, 'success');

  } catch (error) {
    console.error('Error loading test:', error);
    showToast('❌ Error cargando test', 'error');
  }
}

/**
 * Guarda el test actual
 */
async function saveCurrentTest() {
  if (!currentEditorFile) {
    showToast('⚠️ No hay archivo abierto', 'warning');
    return;
  }

  const content = codeEditor.getValue();

  try {
    const response = await fetch('/api/editor/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: currentEditorFile.path,
        content: content
      })
    });

    const data = await response.json();

    if (data.success) {
      editorIsDirty = false;
      updateEditorButtons();
      showToast('✅ Test guardado correctamente', 'success');
    } else {
      showToast('❌ Error guardando: ' + data.error, 'error');
    }

  } catch (error) {
    console.error('Error saving test:', error);
    showToast('❌ Error guardando test', 'error');
  }
}

/**
 * Guarda y ejecuta el test
 */
async function saveAndRunTest() {
  await saveCurrentTest();

  if (!currentEditorFile) return;

  // Cambiar al tab de ejecución y ejecutar
  showTab('run');

  // Aquí podríamos integrar con la función existente de ejecución
  showToast('ℹ️ Usa el tab "Ejecutar Test" para ejecutar el test guardado', 'info');
}

/**
 * Valida la sintaxis YAML
 */
async function validateYAML() {
  const content = codeEditor.getValue();
  const messageDiv = document.getElementById('editor-validation-message');

  try {
    const yaml = jsyaml.load(content);

    messageDiv.style.display = 'block';
    messageDiv.style.background = '#d4edda';
    messageDiv.style.color = '#155724';
    messageDiv.style.border = '1px solid #c3e6cb';
    messageDiv.innerHTML = '✅ YAML válido - Sintaxis correcta';

    setTimeout(() => {
      messageDiv.style.display = 'none';
    }, 3000);

  } catch (error) {
    messageDiv.style.display = 'block';
    messageDiv.style.background = '#f8d7da';
    messageDiv.style.color = '#721c24';
    messageDiv.style.border = '1px solid #f5c6cb';
    messageDiv.innerHTML = `❌ Error de sintaxis YAML:<br><code style="font-size: 0.9em;">${error.message}</code>`;
  }
}

/**
 * Formatea el código YAML
 */
async function formatYAML() {
  const content = codeEditor.getValue();

  try {
    const parsed = jsyaml.load(content);
    const formatted = jsyaml.dump(parsed, {
      indent: 2,
      lineWidth: 100,
      noRefs: true
    });

    codeEditor.setValue(formatted);
    showToast('✅ YAML formateado', 'success');

  } catch (error) {
    showToast('❌ Error formateando: ' + error.message, 'error');
  }
}

/**
 * Crea un nuevo test
 */
function createNewTest() {
  if (editorIsDirty) {
    if (!confirm('Hay cambios sin guardar. ¿Deseas continuar?')) {
      return;
    }
  }

  const testType = document.getElementById('editor-test-type').value;
  const platform = document.getElementById('editor-platform-filter').value || 'web';
  const platformName = platform === 'all' ? 'web' : platform;

  let template;

  if (testType === 'natural') {
    // Plantilla para test natural
    template = `TEST: Nuevo Test en Lenguaje Natural
Plataforma: Web

Descripción:
Escribe aquí una descripción del test

Pasos:
Navega a la URL inicial

Busca el elemento principal
Haz click en el elemento

Verifica que aparezca el resultado esperado

Toma un screenshot

Opciones:
- Screenshots automáticos
- Capturar logs de consola
- Métricas de rendimiento
`;

    // Cambiar editor a modo texto
    codeEditor.setOption('mode', 'text/plain');

  } else {
    // Plantilla para test YAML
    template = `suite: "Nuevo Test ${platformName.toUpperCase()}"
description: "Descripción del test"
baseUrl: "https://ejemplo.com"
platform: "${platformName}"
timeout: 30000

tests:
  - name: "Primer test"
    description: "Descripción del primer test"
    steps:
      - action: ${platformName === 'api' ? 'api.get' : 'navigate'}
        ${platformName === 'api' ? 'url: "/endpoint"' : 'url: "/"'}
        description: "Paso inicial"

expectedResult: "Test debe completarse exitosamente"
`;

    // Cambiar editor a modo YAML
    codeEditor.setOption('mode', 'yaml');
  }

  codeEditor.setValue(template);
  currentEditorFile = null;

  document.getElementById('editor-file-info').textContent = 'Nuevo test (sin guardar)';
  document.getElementById('editor-test-info').style.display = 'none';

  editorIsDirty = true;
  updateEditorButtons();

  showToast(`📝 Nuevo test ${testType === 'natural' ? 'natural' : 'YAML'} creado - No olvides guardarlo`, 'info');
}

/**
 * Cierra el editor actual
 */
function closeEditor() {
  if (editorIsDirty) {
    if (!confirm('Hay cambios sin guardar. ¿Deseas continuar?')) {
      return;
    }
  }

  codeEditor.setValue('');
  currentEditorFile = null;
  editorIsDirty = false;

  document.getElementById('editor-file-info').textContent = 'Ningún archivo seleccionado';
  document.getElementById('editor-test-info').style.display = 'none';

  updateEditorButtons();
}

/**
 * Actualiza el estado de los botones del editor
 */
function updateEditorButtons() {
  const hasFile = currentEditorFile !== null || editorIsDirty;

  document.getElementById('editor-save-btn').disabled = !hasFile;
  document.getElementById('editor-run-btn').disabled = !hasFile;
  document.getElementById('editor-validate-btn').disabled = !hasFile;
  document.getElementById('editor-format-btn').disabled = !hasFile;
  document.getElementById('editor-close-btn').disabled = !hasFile;
}

/**
 * Obtiene el badge HTML para una plataforma
 */
function getPlatformBadge(platform) {
  const badges = {
    web: '🌐 Web',
    mobile: '📱 Mobile',
    api: '🔌 API'
  };
  return badges[platform] || '📄 ' + platform;
}

// ========================================
// INICIALIZACIÓN EN CARGA DE PÁGINA
// ========================================

// Agregar al evento de carga inicial
document.addEventListener('DOMContentLoaded', () => {
  // Cargar estado de plataforma
  const platformDropdown = document.getElementById('platform-dropdown');
  if (platformDropdown) {
    currentPlatform = platformDropdown.value;
    if (currentPlatform === 'mobile') {
      handlePlatformChange('mobile');
    }
  }

  // Inicializar editor cuando se carga la página
  setTimeout(() => {
    initializeCodeEditor();
    loadTestsForEditor();
  }, 500);
});