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
        { name: '🚀 Ejecutar tests (YAML)', value: 'run' },
        { name: '💬 Tests en Lenguaje Natural', value: 'natural' },
        { name: '⚙️  Configurar LLM', value: 'config' },
        { name: '📊 Ver estado del sistema', value: 'status' },
        { name: '📋 Crear nuevo test (YAML)', value: 'create' },
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
    case 'natural':
      navigationStack.push('main');
      await runNaturalLanguageTests();
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

  // Preguntar método de creación
  const methodAnswer = await inquirer.prompt([
    {
      type: 'list',
      name: 'method',
      message: '¿Cómo deseas crear el test?',
      choices: [
        { name: '🤖 Desde lenguaje natural (IA genera el test)', value: 'natural' },
        { name: '📝 Plantilla básica (manual)', value: 'template' },
        { name: '⬅️  Volver atrás', value: 'back' }
      ]
    }
  ]);

  if (methodAnswer.method === 'back') {
    return;
  }

  if (methodAnswer.method === 'natural') {
    await createTestFromNaturalLanguage();
    return;
  }

  // Método de plantilla básica (código original)
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

async function createTestFromNaturalLanguage() {
  log.header('🤖 Crear Test desde Lenguaje Natural');

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
      message: 'URL base de la aplicación:',
      default: 'http://localhost:3000',
      validate: (input) => {
        // Normalizar URL si no tiene protocolo
        if (!input.startsWith('http://') && !input.startsWith('https://')) {
          return input.startsWith('localhost') || input.length > 0 ? true : 'Debe ser una URL válida';
        }
        return true;
      }
    },
    {
      type: 'editor',
      name: 'instructions',
      message: 'Instrucciones en lenguaje natural (se abrirá un editor):',
      default: `Abre la aplicación.
Haz click en el botón 'Login'.
Ingresa 'user@example.com' en el campo de email.
Ingresa 'password123' en el campo de contraseña.
Haz click en 'Enviar'.
Verifica que aparezca un mensaje de bienvenida.`,
      validate: (input) => input.length > 10 ? true : 'Las instrucciones son muy cortas'
    }
  ]);

  // Normalizar URL
  let baseUrl = answers.baseUrl.trim();
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = baseUrl.startsWith('localhost') ? `http://${baseUrl}` : `https://${baseUrl}`;
  }

  log.info('Generando test con IA...');
  log.info('Esto puede tardar unos segundos...');

  try {
    // Cargar configuración de LLM
    const configPath = './config/llm.config.json';
    if (!fs.existsSync(configPath)) {
      log.error('Configuración de LLM no encontrada');
      return;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    // Verificar que hay un LLM activo
    if (!config.activeProvider) {
      log.error('No hay un proveedor LLM activo');
      log.info('Configura un LLM con: npm run switch-llm');
      return;
    }

    // Cargar el adapter del LLM activo
    const adapterMap = {
      'ollama': './runners/adapters/ollama.adapter.js',
      'gemini': './runners/adapters/gemini.adapter.js',
      'openai': './runners/adapters/openai.adapter.js',
      'anthropic': './runners/adapters/anthropic.adapter.js'
    };

    const adapterPath = adapterMap[config.activeProvider];
    if (!adapterPath) {
      log.error(`Adapter no encontrado para: ${config.activeProvider}`);
      return;
    }

    const AdapterClass = require(path.join(__dirname, '..', adapterPath));
    const adapter = new (AdapterClass)(config.providers[config.activeProvider]);

    // Inicializar adapter
    log.info(`Conectando a ${config.activeProvider}...`);
    await adapter.initialize();

    // Cargar TestGenerator
    const { TestGenerator } = require(path.join(__dirname, '..', 'runners', 'test-generator.js'));
    const generator = new TestGenerator(adapter, config);

    // Generar test
    const testName = answers.name.toLowerCase().replace(/\s+/g, '-');
    log.info('Convirtiendo lenguaje natural a test...');

    const testStructure = await generator.convertNaturalLanguageToTest(
      answers.instructions,
      baseUrl,
      answers.name
    );

    // Guardar test
    const testPath = generator.saveTest(testStructure, testName);

    log.success(`✅ Test generado exitosamente!`);
    log.success(`📄 Archivo: ${testPath}`);

    // Mostrar preview del test
    console.log(`\n${colors.fg.blue}📋 Vista previa:${colors.reset}`);
    console.log(`  Suite: ${testStructure.suite}`);
    console.log(`  Tests: ${testStructure.tests.length}`);
    console.log(`  Pasos totales: ${testStructure.tests.reduce((sum, t) => sum + t.steps.length, 0)}`);

    // Preguntar si quiere ejecutarlo o editarlo
    const nextAction = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: '¿Qué deseas hacer ahora?',
        choices: [
          { name: '▶️  Ejecutar test', value: 'run' },
          { name: '✏️  Editar test', value: 'edit' },
          { name: '👀 Ver archivo completo', value: 'view' },
          { name: '⬅️  Volver atrás', value: 'back' }
        ]
      }
    ]);

    switch (nextAction.action) {
      case 'run':
        // Ejecutar el test recién creado
        log.info('Ejecutando test...');
        return new Promise((resolve) => {
          const child = spawn('node', [
            path.join(__dirname, 'test.js'),
            '--mode', 'auto',
            testPath
          ], {
            stdio: 'inherit'
          });

          child.on('close', (code) => {
            if (code === 0) {
              log.success('Test ejecutado correctamente');
            } else {
              log.error(`Test fallido con código ${code}`);
            }
            resolve();
          });
        });

      case 'edit':
        const editor = process.env.EDITOR || 'code';
        const child = spawn(editor, [testPath], { stdio: 'inherit' });
        child.on('error', () => {
          log.warn(`No se pudo abrir el editor. Edita manualmente: ${testPath}`);
        });
        break;

      case 'view':
        const yaml = require('js-yaml');
        const yamlContent = yaml.dump(testStructure, {
          indent: 2,
          lineWidth: 120
        });
        console.log(`\n${colors.fg.blue}📄 Contenido completo:${colors.reset}\n`);
        console.log(yamlContent);
        break;

      case 'back':
        return;
    }

    // Cleanup
    if (adapter.cleanup) {
      await adapter.cleanup();
    }

  } catch (error) {
    log.error(`Error al generar test: ${error.message}`);
    console.error(error);
  }
}

async function createTestFromScan() {
  log.header('📋 Crear Test desde Escaneo');
  log.info('Funcionalidad próximamente: Crear test basado en el análisis del proyecto');
}

// ========================================
// TESTS EN LENGUAJE NATURAL
// ========================================

async function runNaturalLanguageTests() {
  log.header('💬 Tests en Lenguaje Natural');
  console.log(`${colors.dim}Tests sin YAML, sin selectores CSS - solo instrucciones humanas${colors.reset}\n`);

  const naturalDir = './tests/natural';

  // Asegurar que el directorio existe
  if (!fs.existsSync(naturalDir)) {
    fs.mkdirSync(naturalDir, { recursive: true });
  }

  // Obtener tests naturales disponibles
  let naturalTests = [];
  if (fs.existsSync(naturalDir)) {
    naturalTests = fs.readdirSync(naturalDir)
      .filter(file => file.endsWith('.txt') || file.endsWith('.md'))
      .map(file => ({
        name: `📄 ${file}`,
        value: path.join(naturalDir, file)
      }));
  }

  const choices = [
    { name: '✨ Crear nuevo test interactivo', value: 'create' },
  ];

  if (naturalTests.length > 0) {
    choices.push(new inquirer.Separator('─── Tests Disponibles ───'));
    choices.push(...naturalTests);
  }

  choices.push(new inquirer.Separator());
  choices.push({ name: '⬅️  Volver atrás', value: 'back' });

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '¿Qué deseas hacer?',
      choices
    }
  ]);

  if (answer.action === 'back') {
    return;
  }

  if (answer.action === 'create') {
    await createNaturalTest();
  } else {
    await executeNaturalTest(answer.action);
  }
}

async function createNaturalTest() {
  log.header('✨ Crear Test en Lenguaje Natural');
  console.log(`${colors.dim}Vamos a crear un test paso a paso${colors.reset}\n`);

  // 1. Información básica
  const basicInfo = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Nombre del test:',
      validate: (input) => input.length > 0 || 'El nombre es requerido'
    },
    {
      type: 'input',
      name: 'url',
      message: 'URL inicial (ej: https://mercadolibre.com.uy):',
      validate: (input) => {
        if (!input) return 'URL es requerida';
        if (!input.includes('.')) return 'URL inválida';
        return true;
      }
    },
    {
      type: 'input',
      name: 'description',
      message: 'Descripción breve del test:',
      default: ''
    }
  ]);

  // 2. Opciones avanzadas
  const advancedOptions = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'screenshotPerStep',
      message: '¿Capturar screenshot después de cada paso?',
      default: false
    },
    {
      type: 'confirm',
      name: 'captureLogs',
      message: '¿Capturar logs de consola del navegador?',
      default: true
    },
    {
      type: 'confirm',
      name: 'captureNetwork',
      message: '¿Capturar requests de red?',
      default: false
    },
    {
      type: 'confirm',
      name: 'performanceMetrics',
      message: '¿Analizar métricas de rendimiento?',
      default: false
    }
  ]);

  // 3. Agregar pasos del test
  const steps = [];
  let addingSteps = true;

  console.log(`\n${colors.fg.cyan}Ahora vamos a agregar los pasos del test...${colors.reset}\n`);

  while (addingSteps) {
    const stepNumber = steps.length + 1;

    const stepAnswer = await inquirer.prompt([
      {
        type: 'editor',
        name: 'instruction',
        message: `Paso ${stepNumber} - Describe qué debe hacer (se abrirá tu editor):`,
        default: steps.length === 0 ?
          `Navega a ${basicInfo.url}\n\n(Describe la acción en lenguaje natural)` :
          '(Describe la siguiente acción en lenguaje natural)',
        validate: (input) => {
          const trimmed = input.trim();
          if (!trimmed) return 'La instrucción no puede estar vacía';
          if (trimmed.length < 10) return 'La instrucción debe ser más descriptiva';
          return true;
        }
      }
    ]);

    steps.push(stepAnswer.instruction.trim());
    log.success(`Paso ${stepNumber} agregado`);

    const continueAnswer = await inquirer.prompt([
      {
        type: 'list',
        name: 'continue',
        message: '¿Qué deseas hacer?',
        choices: [
          { name: '➕ Agregar otro paso', value: 'add' },
          { name: '✅ Finalizar y guardar', value: 'finish' },
          { name: '🗑️  Cancelar', value: 'cancel' }
        ]
      }
    ]);

    if (continueAnswer.continue === 'finish') {
      addingSteps = false;
    } else if (continueAnswer.continue === 'cancel') {
      log.warn('Creación de test cancelada');
      return;
    }
  }

  // 4. Generar contenido del test
  let testContent = `TEST: ${basicInfo.name}\n`;
  testContent += `URL: ${basicInfo.url}\n`;
  if (basicInfo.description) {
    testContent += `Descripción: ${basicInfo.description}\n`;
  }
  testContent += `\n`;

  testContent += `Opciones:\n`;
  testContent += `- Screenshot por paso: ${advancedOptions.screenshotPerStep ? 'Sí' : 'No'}\n`;
  testContent += `- Capturar logs: ${advancedOptions.captureLogs ? 'Sí' : 'No'}\n`;
  testContent += `- Capturar network: ${advancedOptions.captureNetwork ? 'Sí' : 'No'}\n`;
  testContent += `- Performance: ${advancedOptions.performanceMetrics ? 'Sí' : 'No'}\n`;
  testContent += `\n`;

  testContent += `Pasos:\n`;
  testContent += `${'='.repeat(50)}\n\n`;

  steps.forEach((step, index) => {
    testContent += `${index + 1}. ${step}\n\n`;
  });

  testContent += `\n${'='.repeat(50)}\n`;
  testContent += `\n# Opciones de ejecución (JSON)\n`;
  testContent += `${JSON.stringify(advancedOptions, null, 2)}\n`;

  // 5. Vista previa y confirmación
  console.log(`\n${colors.fg.blue}Vista previa del test:${colors.reset}`);
  console.log(colors.dim + '─'.repeat(60) + colors.reset);
  console.log(testContent);
  console.log(colors.dim + '─'.repeat(60) + colors.reset);

  const confirmAnswer = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '¿Qué deseas hacer?',
      choices: [
        { name: '💾 Guardar y ejecutar ahora', value: 'save_run' },
        { name: '💾 Solo guardar', value: 'save' },
        { name: '🗑️  Descartar', value: 'discard' }
      ]
    }
  ]);

  if (confirmAnswer.action === 'discard') {
    log.warn('Test descartado');
    return;
  }

  // 6. Guardar archivo
  const filename = basicInfo.name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');

  const naturalDir = './tests/natural';
  if (!fs.existsSync(naturalDir)) {
    fs.mkdirSync(naturalDir, { recursive: true });
  }

  const filePath = path.join(naturalDir, `${filename}.txt`);
  fs.writeFileSync(filePath, testContent, 'utf8');

  log.success(`Test guardado en: ${filePath}`);

  // 7. Ejecutar si se solicitó
  if (confirmAnswer.action === 'save_run') {
    console.log('');
    await executeNaturalTest(filePath, advancedOptions);
  }
}

async function executeNaturalTest(testFilePath, options = null) {
  log.header('▶️  Ejecutar Test Natural');

  // Leer archivo
  if (!fs.existsSync(testFilePath)) {
    log.error(`Archivo no encontrado: ${testFilePath}`);
    return;
  }

  const testContent = fs.readFileSync(testFilePath, 'utf8');

  console.log(`${colors.fg.cyan}Archivo:${colors.reset} ${testFilePath}`);
  console.log(`${colors.fg.cyan}Contenido:${colors.reset}`);
  console.log(colors.dim + testContent.substring(0, 300) + '...' + colors.reset);
  console.log('');

  // Extraer opciones del archivo si no se pasaron
  if (!options) {
    const optionsMatch = testContent.match(/# Opciones de ejecución \(JSON\)\n({[\s\S]*?})/);
    if (optionsMatch) {
      try {
        options = JSON.parse(optionsMatch[1]);
      } catch (e) {
        options = {};
      }
    } else {
      options = {};
    }
  }

  const confirmAnswer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'execute',
      message: '¿Confirmar ejecución?',
      default: true
    }
  ]);

  if (!confirmAnswer.execute) {
    log.info('Ejecución cancelada');
    return;
  }

  log.info('Ejecutando test natural con LLM + MCP...');

  // Construir opciones para el runner
  const runnerOptions = {
    screenshotPerStep: options.screenshotPerStep || false,
    captureLogs: options.captureLogs !== false, // default true
    captureNetwork: options.captureNetwork || false,
    performanceMetrics: options.performanceMetrics || false
  };

  console.log(`${colors.dim}Opciones: ${JSON.stringify(runnerOptions)}${colors.reset}\n`);

  // Ejecutar usando test-natural.js pasando opciones
  return new Promise((resolve) => {
    const args = [
      path.join(__dirname, 'test-natural.js'),
      testFilePath
    ];

    // Pasar opciones como variables de entorno
    const env = {
      ...process.env,
      NATURAL_TEST_OPTIONS: JSON.stringify(runnerOptions)
    };

    const child = spawn('node', args, {
      stdio: 'inherit',
      env
    });

    child.on('close', (code) => {
      if (code === 0) {
        log.success('✅ Test ejecutado correctamente');
      } else {
        log.error(`❌ Test fallido con código ${code}`);
      }
      resolve();
    });
  });
}

// Iniciar CLI
if (require.main === module) {
  main().catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
}

module.exports = { main };
