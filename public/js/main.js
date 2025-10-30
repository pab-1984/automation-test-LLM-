// ========================================
// VARIABLES GLOBALES
// ========================================

let selectedTest = null;
let currentTestId = null;
let statusInterval = null;

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
  await loadSystemInfo();
}

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

      return `
        <div class="llm-option ${isActive ? 'active' : ''}" onclick="switchLLM('${key}')" style="cursor: ${provider.enabled ? 'pointer' : 'not-allowed'}; opacity: ${provider.enabled ? '1' : '0.5'};">
          <div style="font-size: 2em; margin-bottom: 10px;">${emoji}</div>
          <div style="font-weight: bold; text-transform: capitalize;">${key}</div>
          <div style="font-size: 0.9em; margin-top: 5px;">${provider.model}</div>
          ${isActive ? '<div style="margin-top: 10px; color: #4caf50;">✓ Activo</div>' : ''}
          ${!provider.enabled ? '<div style="margin-top: 10px; color: #e74c3c;">⚠️ Deshabilitado</div>' : ''}
        </div>
      `;
    }).join('');

    selectorDiv.innerHTML = `
      <div class="llm-selector-container">
        ${providerCards}
      </div>
    `;
  } catch (error) {
    document.getElementById('llm-selector').innerHTML =
      '<p class="alert alert-error">Error al cargar LLM selector</p>';
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
      const notification = document.createElement('div');
      notification.className = 'alert alert-success';
      notification.style.position = 'fixed';
      notification.style.top = '20px';
      notification.style.right = '20px';
      notification.style.zIndex = '1000';
      notification.innerHTML = `✅ LLM cambiado a: ${provider}`;
      document.body.appendChild(notification);

      setTimeout(() => notification.remove(), 3000);
    } else {
      alert('Error al cambiar LLM: ' + result.error);
    }
  } catch (error) {
    alert('Error: ' + error.message);
  }
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

async function loadSystemInfo() {
  try {
    const response = await fetch('/api/status');
    const status = await response.json();

    const infoDiv = document.getElementById('system-info');

    infoDiv.innerHTML = `
      <div class="status">
        <div class="status-indicator status-active"></div>
        <strong>Memoria:</strong> ${Math.round(status.memory.heapUsed / 1024 / 1024)} MB / ${Math.round(status.memory.heapTotal / 1024 / 1024)} MB
      </div>
      <div class="status">
        <div class="status-indicator status-active"></div>
        <strong>Uptime:</strong> ${Math.floor(status.uptime / 60)} minutos
      </div>
      <div class="status">
        <div class="status-indicator ${status.activeTests > 0 ? 'status-running' : 'status-inactive'}"></div>
        <strong>Tests Activos:</strong> ${status.activeTests}
      </div>
    `;
  } catch (error) {
    document.getElementById('system-info').innerHTML =
      '<p class="alert alert-error">Error al cargar información del sistema</p>';
  }
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
    const tests = await response.json();

    const selectorDiv = document.getElementById('test-selector');

    if (tests.length === 0) {
      selectorDiv.innerHTML = '<p style="color: #7f8c8d;">No hay tests disponibles</p>';
      return;
    }

    selectorDiv.innerHTML = `
      <ul class="test-list">
        ${tests.map(test => `
          <li class="test-item" onclick="selectTest('${test.path}', '${test.name}')">
            <span>📄 ${test.name}</span>
            <span style="color: #7f8c8d; font-size: 0.9em;">${(test.size / 1024).toFixed(1)} KB</span>
          </li>
        `).join('')}
      </ul>
    `;
  } catch (error) {
    document.getElementById('test-selector').innerHTML =
      '<p class="alert alert-error">Error al cargar tests</p>';
  }
}

function selectTest(path, name) {
  selectedTest = { path, name };

  // Marcar como seleccionado
  document.querySelectorAll('.test-item').forEach(item => {
    item.classList.remove('selected');
  });
  event.currentTarget.classList.add('selected');

  document.getElementById('execution-status').innerHTML = `
    <div class="alert alert-info">
      📄 Test seleccionado: <strong>${name}</strong>
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

      document.getElementById('execution-status').innerHTML = `
        <div class="alert alert-info">
          🚀 Test iniciado!<br>
          📊 ID: ${result.testId}<br>
          ⚙️ Modo: ${mode}
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
    const results = await response.json();

    const resultsDiv = document.getElementById('results-list');

    if (results.length === 0) {
      resultsDiv.innerHTML = '<p style="color: #7f8c8d;">No hay reportes generados</p>';
      return;
    }

    resultsDiv.innerHTML = `
      <ul class="test-list">
        ${results.map(result => `
          <li class="test-item" onclick="viewReport('${result.file}')">
            <div>
              <strong>📊 ${result.file}</strong><br>
              <span style="color: #7f8c8d; font-size: 0.9em;">
                ${new Date(result.modified).toLocaleString()} - ${(result.size / 1024).toFixed(1)} KB
              </span>
            </div>
            <button onclick="viewReport('${result.file}'); event.stopPropagation();">
              Ver
            </button>
          </li>
        `).join('')}
      </ul>
    `;
  } catch (error) {
    document.getElementById('results-list').innerHTML =
      '<p class="alert alert-error">Error al cargar resultados</p>';
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
      html += '<div class="list-item">';
      html += '<div>';
      html += '<div style="font-weight: bold; margin-bottom: 5px;">📄 ' + test.name + '</div>';
      html += '<div style="font-size: 0.9em; color: #7f8c8d;">' + (test.description || 'Sin descripción') + '</div>';
      html += '<div style="font-size: 0.85em; color: #95a5a6; margin-top: 5px;">';
      html += '🌐 ' + test.url + ' | 📅 ' + date;
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

async function createNaturalTest() {
  const name = document.getElementById('natural-name').value.trim();
  const url = document.getElementById('natural-url').value.trim();
  const description = document.getElementById('natural-description').value.trim();
  const instructions = document.getElementById('natural-instructions').value.trim();

  if (!name || !url || !instructions) {
    alert('Por favor completa los campos obligatorios: nombre, URL e instrucciones');
    return;
  }

  const options = {
    screenshotPerStep: document.getElementById('natural-screenshot').checked,
    captureLogs: document.getElementById('natural-logs').checked,
    captureNetwork: document.getElementById('natural-network').checked,
    performanceMetrics: document.getElementById('natural-performance').checked
  };

  try {
    const response = await fetch('/api/tests/natural/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, url, description, instructions, options })
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

  if (!name || !url || !instructions) {
    alert('Por favor completa los campos obligatorios: nombre, URL e instrucciones');
    return;
  }

  const options = {
    screenshotPerStep: document.getElementById('natural-screenshot').checked,
    captureLogs: document.getElementById('natural-logs').checked,
    captureNetwork: document.getElementById('natural-network').checked,
    performanceMetrics: document.getElementById('natural-performance').checked
  };

  try {
    // Primero crear
    const createResponse = await fetch('/api/tests/natural/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, url, description, instructions, options })
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

async function runNaturalTest(filename) {
  const executionArea = document.getElementById('natural-execution-area');
  const statusDiv = document.getElementById('natural-execution-status');
  const logsDiv = document.getElementById('natural-execution-logs');

  executionArea.style.display = 'block';
  statusDiv.innerHTML = '<div class="loading"></div><span>Iniciando test...</span>';
  logsDiv.innerHTML = '<div style="color: #4caf50;">🚀 Iniciando ejecución del test...</div>';

  try {
    const response = await fetch('/api/tests/natural/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename })
    });

    const data = await response.json();

    if (!data.success) {
      logsDiv.innerHTML += '<div style="color: #e74c3c;">❌ Error: ' + data.error + '</div>';
      statusDiv.innerHTML = '<span style="color: #e74c3c;">❌ Error</span>';
      return;
    }

    // Comenzar polling
    logsDiv.innerHTML += '<div style="color: #2196f3;">📡 Test ID: ' + data.testId + '</div>';
    logsDiv.innerHTML += '<div style="color: #2196f3;">⏳ Ejecutando...</div>';
    logsDiv.innerHTML += '<div style="color: #666;">' + '─'.repeat(60) + '</div>';

    pollNaturalTestStatus(data.testId);

  } catch (error) {
    logsDiv.innerHTML += '<div style="color: #e74c3c;">❌ Error: ' + error.message + '</div>';
    statusDiv.innerHTML = '<span style="color: #e74c3c;">❌ Error</span>';
  }
}

async function pollNaturalTestStatus(testId) {
  const statusDiv = document.getElementById('natural-execution-status');
  const logsDiv = document.getElementById('natural-execution-logs');
  let lastLogCount = 0;

  const pollInterval = setInterval(async () => {
    try {
      const response = await fetch('/api/tests/status/' + testId);
      const data = await response.json();

      // Actualizar status
      if (data.status === 'running') {
        statusDiv.innerHTML = '<div class="loading"></div><span>⏳ Ejecutando...</span>';
      } else if (data.status === 'success') {
        statusDiv.innerHTML = '<span style="color: #4caf50;">✅ Completado Exitosamente</span>';
        clearInterval(pollInterval);
      } else if (data.status === 'failed') {
        statusDiv.innerHTML = '<span style="color: #e74c3c;">❌ Test Fallido</span>';
        clearInterval(pollInterval);
      } else if (data.status === 'error') {
        statusDiv.innerHTML = '<span style="color: #e74c3c;">❌ Error en Ejecución</span>';
        clearInterval(pollInterval);
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

        // Mostrar datos adicionales si existen
        if (data.consoleLogs) {
          logsDiv.innerHTML += '<div style="color: #ff9800; margin-top: 10px;">📝 Logs de consola capturados</div>';
        }
        if (data.networkRequests) {
          logsDiv.innerHTML += '<div style="color: #ff9800;">🌐 Network requests capturados</div>';
        }
        if (data.performanceData) {
          logsDiv.innerHTML += '<div style="color: #ff9800;">📊 Performance metrics capturados</div>';
        }
      }

    } catch (error) {
      console.error('Error en polling:', error);
      logsDiv.innerHTML += '<div style="color: #e74c3c;">❌ Error actualizando estado: ' + error.message + '</div>';
      clearInterval(pollInterval);
    }
  }, 2000); // Poll cada 2 segundos
}

// ========================================
// INICIALIZACIÓN
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  loadSystemStatus();

  // Auto-refresh del dashboard cada 30 segundos
  setInterval(() => {
    if (document.getElementById('dashboard').classList.contains('active')) {
      loadSystemStatus();
    }
  }, 30000);
});
