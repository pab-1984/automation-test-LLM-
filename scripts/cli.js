#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const inquirer = require('inquirer');

// Colores para la CLI
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  fg: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
  },
  
  bg: {
    black: '\x1b[40m',
    red: '\x1b[41m',
    green: '\x1b[42m',
    yellow: '\x1b[43m',
    blue: '\x1b[44m',
    magenta: '\x1b[45m',
    cyan: '\x1b[46m',
    white: '\x1b[47m'
  }
};

// Funciones de utilidad
const log = {
  info: (msg) => console.log(`${colors.fg.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.fg.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.fg.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.fg.red}✗${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.fg.blue}${colors.bright}${msg}${colors.reset}\n`)
};

// Pila de navegación para volver atrás
let navigationStack = [];

async function main() {
  console.clear();
  log.header('🧪 Testing Automation Framework - CLI');
  console.log(`${colors.dim}Sistema de testing automatizado con LLM${colors.reset}\n`);

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '¿Qué deseas hacer?',
      choices: [
        { name: '🚀 Ejecutar tests', value: 'run' },
        { name: '⚙️  Configurar LLM', value: 'config' },
        { name: '📊 Ver estado del sistema', value: 'status' },
        { name: '📋 Crear nuevo test', value: 'create' },
        { name: '🔍 Escanear proyecto', value: 'scan' },
        { name: '🚪 Salir', value: 'exit' }
      ]
    }
  ]);

  switch (answers.action) {
    case 'run':
      navigationStack.push('main');
      await runTests();
      break;
    case 'config':
      navigationStack.push('main');
      await configureLLM();
      break;
    case 'status':
      navigationStack.push('main');
      await showStatus();
      break;
    case 'create':
      navigationStack.push('main');
      await createTest();
      break;
    case 'scan':
      navigationStack.push('main');
      await scanProject();
      break;
    case 'exit':
      log.success('¡Hasta luego!');
      process.exit(0);
  }

  // Volver al menú principal después de cada acción
  await returnToMainMenu();
}

async function returnToMainMenu() {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'next',
      message: '¿Qué deseas hacer ahora?',
      choices: [
        { name: '🏠 Volver al menú principal', value: 'main' },
        { name: '🔄 Repetir última acción', value: 'repeat' },
        { name: '🚪 Salir', value: 'exit' }
      ]
    }
  ]);

  switch (answers.next) {
    case 'main':
      await main();
      break;
    case 'repeat':
      // Repetir la última acción del stack
      if (navigationStack.length > 0) {
        const lastAction = navigationStack.pop();
        // Re-add to stack for potential repeat
        navigationStack.push(lastAction);
        // Aquí podrías implementar la repetición específica
        await main();
      } else {
        await main();
      }
      break;
    case 'exit':
      log.success('¡Hasta luego!');
      process.exit(0);
  }
}

async function runTests() {
  log.header('🚀 Ejecutar Tests');
  
  // Obtener suites disponibles
  const suitesDir = './tests/suites';
  let suites = [];
  
  if (fs.existsSync(suitesDir)) {
    suites = fs.readdirSync(suitesDir)
      .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'))
      .map(file => ({
        name: file.replace('.yml', '').replace('.yaml', ''),
        value: path.join(suitesDir, file)
      }));
  }

  if (suites.length === 0) {
    log.warn('No se encontraron suites de tests');
    
    // Opción para crear un test
    const createAnswer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'create',
        message: '¿Deseas crear un test ahora?',
        default: false
      }
    ]);
    
    if (createAnswer.create) {
      await createTest();
    }
    return;
  }

  // Agregar opción para volver atrás
  suites.push(new inquirer.Separator());
  suites.push({ name: '⬅️  Volver atrás', value: 'back' });

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'suite',
      message: 'Selecciona una suite:',
      choices: suites
    }
  ]);

  if (answers.suite === 'back') {
    return;
  }

  const modeAnswer = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'Modo de ejecución:',
      choices: [
        { name: '🤖 LLM (Inteligente)', value: 'llm' },
        { name: '⚡ Directo (Rápido)', value: 'direct' },
        { name: '🔄 Automático (Híbrido)', value: 'auto' }
      ],
      default: 'auto'
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: '¿Confirmar ejecución?',
      default: true
    }
  ]);

  if (!modeAnswer.confirm) {
    log.info('Ejecución cancelada');
    return;
  }

  log.info(`Ejecutando: ${answers.suite} en modo ${modeAnswer.mode}`);
  
  // Ejecutar test y esperar a que termine
  return new Promise((resolve) => {
    const child = spawn('node', [
      path.join(__dirname, 'test.js'),
      '--mode', modeAnswer.mode,
      answers.suite
    ], {
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      if (code === 0) {
        log.success('Test ejecutado correctamente');
      } else {
        log.error(`Test fallido con código ${code}`);
      }
      
      // Preguntar si quiere ver el reporte
      inquirer.prompt([
        {
          type: 'confirm',
          name: 'viewReport',
          message: '¿Deseas ver el último reporte?',
          default: false
        }
      ]).then(reportAnswer => {
        if (reportAnswer.viewReport) {
          showLastReport();
        }
        resolve();
      }).catch(() => resolve());
    });
  });
}

async function configureLLM() {
  log.header('⚙️  Configurar LLM');
  
  const configPath = './config/llm.config.json';
  if (!fs.existsSync(configPath)) {
    log.error('Archivo de configuración no encontrado');
    return;
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  // Opciones de proveedores
  const providerChoices = Object.keys(config.providers).map(key => ({
    name: `${key} ${config.providers[key].enabled ? '✅' : '❌'}`,
    value: key
  }));
  
  providerChoices.push(new inquirer.Separator());
  providerChoices.push({ name: '⬅️  Volver atrás', value: 'back' });

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Proveedor LLM:',
      choices: providerChoices
    }
  ]);

  if (answers.provider === 'back') {
    return;
  }

  const actionAnswer = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '¿Qué deseas hacer?',
      choices: [
        { name: '✅ Activar este proveedor', value: 'enable' },
        { name: '❌ Desactivar este proveedor', value: 'disable' },
        { name: '🎯 Establecer como activo', value: 'setActive' },
        { name: '⬅️  Volver atrás', value: 'back' }
      ]
    }
  ]);

  if (actionAnswer.action === 'back') {
    return;
  }

  switch (actionAnswer.action) {
    case 'enable':
      config.providers[answers.provider].enabled = true;
      log.success(`Proveedor ${answers.provider} activado`);
      break;
    case 'disable':
      config.providers[answers.provider].enabled = false;
      log.success(`Proveedor ${answers.provider} desactivado`);
      break;
    case 'setActive':
      config.providers[answers.provider].enabled = true;
      config.activeProvider = answers.provider;
      log.success(`Proveedor ${answers.provider} establecido como activo`);
      break;
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  // Mostrar estado actualizado
  await showLLMStatus(config);
}

async function showLLMStatus(config) {
  console.log(`\n${colors.fg.blue}📊 Estado actual:${colors.reset}`);
  console.log(`${colors.fg.green}✓${colors.reset} LLM Activo: ${config.activeProvider}`);
  console.log(`${colors.fg.blue}ℹ${colors.reset} Proveedores:`);
  Object.entries(config.providers).forEach(([name, provider]) => {
    const status = provider.enabled ? `${colors.fg.green}✅ Activo${colors.reset}` : `${colors.fg.red}❌ Inactivo${colors.reset}`;
    console.log(`  ${name}: ${status}`);
  });
}

async function showStatus() {
  log.header('📊 Estado del Sistema');
  
  // Mostrar estado de LLM
  const configPath = './config/llm.config.json';
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log(`${colors.fg.green}✓${colors.reset} LLM Activo: ${config.activeProvider}`);
    console.log(`${colors.fg.blue}ℹ${colors.reset} Proveedores disponibles:`);
    Object.entries(config.providers).forEach(([name, provider]) => {
      const status = provider.enabled ? `${colors.fg.green}✅ Activo${colors.reset}` : `${colors.fg.red}❌ Inactivo${colors.reset}`;
      console.log(`  ${name}: ${status}`);
    });
  }

  // Mostrar estado de tests
  const suitesDir = './tests/suites';
  if (fs.existsSync(suitesDir)) {
    const suites = fs.readdirSync(suitesDir)
      .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'));
    console.log(`\n${colors.fg.green}✓${colors.reset} Suites de tests: ${suites.length}`);
  }

  // Mostrar estado de resultados
  const resultsDir = './tests/results';
  if (fs.existsSync(resultsDir)) {
    const results = fs.readdirSync(resultsDir)
      .filter(file => file.endsWith('.md'));
    console.log(`${colors.fg.green}✓${colors.reset} Reportes generados: ${results.length}`);
  }

  // Mostrar estado de screenshots
  const screenshotsDir = './tests/screenshots';
  if (fs.existsSync(screenshotsDir)) {
    const screenshots = fs.readdirSync(screenshotsDir)
      .filter(file => file.endsWith('.png'));
    console.log(`${colors.fg.green}✓${colors.reset} Capturas de pantalla: ${screenshots.length}`);
  }

  // Opciones adicionales
  const statusChoices = [
    { name: '📄 Ver último reporte', value: 'lastReport' },
    { name: '🖼️  Ver última captura', value: 'lastScreenshot' },
    { name: '⬅️  Volver atrás', value: 'back' }
  ];

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Acciones adicionales:',
      choices: statusChoices
    }
  ]);

  switch (answers.action) {
    case 'lastReport':
      showLastReport();
      break;
    case 'lastScreenshot':
      showLastScreenshot();
      break;
    case 'back':
      return;
  }
}

function showLastReport() {
  const resultsDir = './tests/results';
  if (fs.existsSync(resultsDir)) {
    const reports = fs.readdirSync(resultsDir)
      .filter(file => file.endsWith('.md'))
      .sort((a, b) => {
        const aTime = fs.statSync(path.join(resultsDir, a)).mtime.getTime();
        const bTime = fs.statSync(path.join(resultsDir, b)).mtime.getTime();
        return bTime - aTime; // Más reciente primero
      });
    
    if (reports.length > 0) {
      const lastReport = reports[0];
      const reportPath = path.join(resultsDir, lastReport);
      const content = fs.readFileSync(reportPath, 'utf8');
      console.log(`\n${colors.fg.blue}📄 Último reporte: ${lastReport}${colors.reset}\n`);
      console.log(content.substring(0, 1000) + '...'); // Mostrar solo parte
      console.log(`${colors.dim}(Reporte completo en: ${reportPath})${colors.reset}`);
    } else {
      log.info('No hay reportes disponibles');
    }
  }
}

function showLastScreenshot() {
  const screenshotsDir = './tests/screenshots';
  if (fs.existsSync(screenshotsDir)) {
    const screenshots = fs.readdirSync(screenshotsDir)
      .filter(file => file.endsWith('.png'))
      .sort((a, b) => {
        const aTime = fs.statSync(path.join(screenshotsDir, a)).mtime.getTime();
        const bTime = fs.statSync(path.join(screenshotsDir, b)).mtime.getTime();
        return bTime - aTime; // Más reciente primero
      });
    
    if (screenshots.length > 0) {
      const lastScreenshot = screenshots[0];
      log.info(`Última captura: ${lastScreenshot}`);
      log.info(`Ruta: ${path.join(screenshotsDir, lastScreenshot)}`);
    } else {
      log.info('No hay capturas disponibles');
    }
  }
}

async function createTest() {
  log.header('📋 Crear Nuevo Test');
  
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Nombre del test:',
      validate: (input) => input.length > 0 ? true : 'El nombre es requerido'
    },
    {
      type: 'input',
      name: 'baseUrl',
      message: 'URL base:',
      default: 'http://localhost:3000',
      validate: (input) => input.startsWith('http') ? true : 'Debe ser una URL válida'
    },
    {
      type: 'input',
      name: 'description',
      message: 'Descripción:'
    },
    {
      type: 'list',
      name: 'mode',
      message: 'Modo por defecto:',
      choices: [
        { name: '🤖 LLM (Inteligente)', value: 'llm' },
        { name: '⚡ Directo (Rápido)', value: 'direct' },
        { name: '🔄 Automático (Híbrido)', value: 'auto' }
      ],
      default: 'auto'
    }
  ]);

  // Crear estructura básica del test
  const testName = answers.name.toLowerCase().replace(/\s+/g, '-');
  const testFile = `./tests/suites/${testName}.yml`;
  
  const testContent = `# Test: ${answers.name}
# Descripción: ${answers.description}

suite: "${answers.name}"
description: "${answers.description}"
baseUrl: "${answers.baseUrl}"
timeout: 15000
mode: "${answers.mode}"

tests:
  - name: "TC001 - Test básico"
    mode: "direct"
    steps:
      - action: "navigate"
        url: "\${baseUrl}/"
        description: "Ir a la página principal"
      
      - action: "screenshot"
        filename: "${testName}-pagina-principal"
        description: "Captura de la página principal"
    
    expectedResult: "La página carga correctamente"
`;

  // Guardar test
  fs.writeFileSync(testFile, testContent);
  log.success(`Test creado: ${testFile}`);
  
  // Preguntar si quiere editarlo
  const editAnswer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'edit',
      message: '¿Deseas editar el test ahora?',
      default: false
    }
  ]);

  if (editAnswer.edit) {
    // Intentar abrir en editor por defecto
    const editor = process.env.EDITOR || 'code';
    const child = spawn(editor, [testFile], {
      stdio: 'inherit'
    });
    
    child.on('error', () => {
      log.warn(`No se pudo abrir el editor. Puedes editar manualmente: ${testFile}`);
    });
  }
}

async function scanProject() {
  log.header('🔍 Escaneo del Proyecto');
  
  console.log(`${colors.fg.blue}ℹ${colors.reset} Escaneando estructura del proyecto...`);
  
  // Mostrar estructura de carpetas
  const folders = [
    'config/', 'runners/', 'tests/', 'prompts/', 'scripts/'
  ];
  
  folders.forEach(folder => {
    if (fs.existsSync(folder)) {
      console.log(`${colors.fg.green}✓${colors.reset} ${folder}`);
    } else {
      console.log(`${colors.fg.red}✗${colors.reset} ${folder} (faltante)`);
    }
  });
  
  // Mostrar archivos importantes
  const importantFiles = [
    'config/llm.config.json',
    'config/testing.config.json',
    'prompts/system.md',
    'package.json'
  ];
  
  console.log(`\n${colors.fg.blue}ℹ${colors.reset} Archivos importantes:`);
  importantFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`${colors.fg.green}✓${colors.reset} ${file}`);
    } else {
      console.log(`${colors.fg.red}✗${colors.reset} ${file} (faltante)`);
    }
  });
  
  // Mostrar estadísticas
  console.log(`\n${colors.fg.blue}ℹ${colors.reset} Estadísticas:`);
  
  // Contar tests
  let testCount = 0;
  if (fs.existsSync('./tests/suites')) {
    testCount = fs.readdirSync('./tests/suites')
      .filter(file => file.endsWith('.yml') || file.endsWith('.yaml')).length;
  }
  
  // Contar reportes
  let reportCount = 0;
  if (fs.existsSync('./tests/results')) {
    reportCount = fs.readdirSync('./tests/results')
      .filter(file => file.endsWith('.md')).length;
  }
  
  console.log(`  Tests: ${testCount}`);
  console.log(`  Reportes: ${reportCount}`);
  
  // Opciones de acción
  const scanChoices = [
    { name: '📋 Crear test desde escaneo', value: 'createFromScan' },
    { name: '⬅️  Volver atrás', value: 'back' }
  ];

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '¿Qué deseas hacer?',
      choices: scanChoices
    }
  ]);

  switch (answers.action) {
    case 'createFromScan':
      await createTestFromScan();
      break;
    case 'back':
      return;
  }
}

async function createTestFromScan() {
  log.header('📋 Crear Test desde Escaneo');
  log.info('Funcionalidad próximamente: Crear test basado en el análisis del proyecto');
}

// Iniciar CLI
if (require.main === module) {
  main().catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
}

module.exports = { main };
