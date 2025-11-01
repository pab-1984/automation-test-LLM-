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

async function addSuiteToProject(projectId) {
  currentProjectId = projectId;
  await addTestSuite();
  // Recargar explorador
  await loadProjects();
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
      // Tests YAML
      response = await fetch('/api/tests');
      const data = await response.json();

      // El endpoint devuelve directamente el array de tests
      tests = Array.isArray(data) ? data : [];
    }

    if (!tests || tests.length === 0) {
      listDiv.innerHTML = '<p style="color: #7f8c8d;">No hay tests disponibles de este tipo</p>';
      return;
    }

    let html = '';
    tests.forEach(test => {
      const testData = type === 'natural'
        ? { name: test.name, filename: test.filename, description: test.description, url: test.url, type: 'natural' }
        : { name: test.name, path: test.path, type: 'yaml' };

      html += `
        <div class="test-item" onclick='selectTestForSuite(${JSON.stringify(testData).replace(/'/g, "&#39;")})' style="cursor: pointer;">
          <div>
            <strong>${type === 'natural' ? '💬' : '📄'} ${testData.name}</strong><br>
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