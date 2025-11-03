// scripts/create-mobile-test.js

/**
 * Wizard interactivo para crear tests móviles
 * Soporta Android e iOS
 * Usa templates o lenguaje natural
 */

const inquirer = require('inquirer');
const { MobileTestGenerator } = require('../runners/mobile-test-generator.js');
const { UniversalTestRunnerCore } = require('../runners/universal-runner.js');
const { MCPClientFactory } = require('../runners/core/mcp-client-factory.js');

console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   📱 GENERADOR DE TESTS MÓVILES (v1.0)                          ║
║   Crea tests para Android e iOS desde lenguaje natural.         ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
`);

async function main() {
  try {
    console.log('🚀 Iniciando wizard de creación de tests móviles...\n');

    // Paso 1: Elegir modo
    const mode = await chooseMode();

    if (mode === 'template') {
      await createFromTemplate();
    } else if (mode === 'natural') {
      await createFromNaturalLanguage();
    } else if (mode === 'recorder') {
      await createWithRecorder();
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

/**
 * Permite al usuario elegir el modo de creación
 */
async function chooseMode() {
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: '¿Cómo quieres crear el test?',
      choices: [
        {
          name: '📋 Usar un template predefinido (Login, Registro, Búsqueda, etc.)',
          value: 'template'
        },
        {
          name: '💬 Escribir en lenguaje natural',
          value: 'natural'
        },
        {
          name: '🎬 Recorder - Capturar interacciones en tiempo real (próximamente)',
          value: 'recorder',
          disabled: '(Próximamente en Fase 4.2)'
        }
      ]
    }
  ]);

  return mode;
}

/**
 * Crea test desde un template predefinido
 */
async function createFromTemplate() {
  console.log('\n📋 MODO: Template Predefinido\n');

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'platform',
      message: '📱 ¿Qué plataforma?',
      choices: ['android', 'ios'],
      default: 'android'
    },
    {
      type: 'input',
      name: 'appPackage',
      message: (answers) => answers.platform === 'android'
        ? '📦 Package de la app (ej: com.example.app):'
        : '📦 Bundle ID de la app (ej: com.example.app):',
      default: 'com.example.app',
      validate: (input) => input.length > 0 || 'El package/bundle ID es requerido'
    },
    {
      type: 'list',
      name: 'templateName',
      message: '🎨 ¿Qué template quieres usar?',
      choices: [
        {
          name: '🔐 Login - Test de inicio de sesión',
          value: 'login'
        },
        {
          name: '📝 Register - Test de registro de usuario',
          value: 'register'
        },
        {
          name: '🔍 Search - Test de búsqueda',
          value: 'search'
        },
        {
          name: '🛒 Purchase - Test de compra/carrito',
          value: 'purchase'
        },
        {
          name: '👤 Profile - Test de edición de perfil',
          value: 'profile'
        }
      ]
    },
    {
      type: 'input',
      name: 'suiteName',
      message: '📝 Nombre del test suite:',
      default: (answers) => `${answers.templateName}-test`,
      validate: (input) => input.length > 0 || 'El nombre es requerido'
    }
  ]);

  // Pedir opciones específicas según el template
  const templateOptions = await getTemplateSpecificOptions(answers.templateName, answers.platform);

  console.log('\n🔨 Generando test desde template...');

  // Crear instancia del generador (sin LLM para templates)
  const generator = new MobileTestGenerator(null, {});

  // Generar test desde template
  const testStructure = generator.generateFromTemplate(answers.templateName, {
    appPackage: answers.appPackage,
    platform: answers.platform,
    ...templateOptions
  });

  // Actualizar nombre de suite
  testStructure.suite = answers.suiteName;

  // Guardar test
  const filename = answers.suiteName.toLowerCase().replace(/\s+/g, '-');
  const filepath = generator.saveMobileTest(testStructure, filename);

  console.log(`\n✅ ¡Test creado exitosamente!`);
  console.log(`   📄 Archivo: ${filepath}`);
  console.log(`   🎯 Template: ${answers.templateName}`);
  console.log(`   📱 Plataforma: ${answers.platform}`);

  // Preguntar si quiere ejecutar
  const { executeNow } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'executeNow',
      message: '¿Quieres ejecutar el test ahora?',
      default: false
    }
  ]);

  if (executeNow) {
    await executeTest(filepath, answers.platform, answers.appPackage);
  } else {
    console.log(`\n💡 Para ejecutarlo después:`);
    console.log(`   npm run test-mobile ${filepath} --device=<device-id>`);
  }
}

/**
 * Obtiene opciones específicas según el template
 */
async function getTemplateSpecificOptions(templateName, platform) {
  const options = {};

  switch (templateName) {
    case 'login':
      const loginAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'email',
          message: '📧 Email de prueba:',
          default: 'test@example.com'
        },
        {
          type: 'password',
          name: 'password',
          message: '🔑 Contraseña de prueba:',
          default: 'password123'
        }
      ]);
      return loginAnswers;

    case 'register':
      const registerAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'username',
          message: '👤 Nombre de usuario:',
          default: 'newuser'
        },
        {
          type: 'input',
          name: 'email',
          message: '📧 Email:',
          default: 'newuser@example.com'
        },
        {
          type: 'password',
          name: 'password',
          message: '🔑 Contraseña:',
          default: 'NewPass123'
        }
      ]);
      return registerAnswers;

    case 'search':
      const searchAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'searchTerm',
          message: '🔍 Término de búsqueda:',
          default: 'producto de prueba'
        }
      ]);
      return searchAnswers;

    case 'profile':
      const profileAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'newName',
          message: '✏️  Nuevo nombre para el perfil:',
          default: 'Usuario Actualizado'
        }
      ]);
      return profileAnswers;

    case 'purchase':
    default:
      return options;
  }
}

/**
 * Crea test desde lenguaje natural
 */
async function createFromNaturalLanguage() {
  console.log('\n💬 MODO: Lenguaje Natural\n');

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'suiteName',
      message: '📝 Nombre del test:',
      default: 'Test Móvil Generado',
      validate: (input) => input.length > 0 || 'El nombre es requerido'
    },
    {
      type: 'list',
      name: 'platform',
      message: '📱 ¿Qué plataforma?',
      choices: ['android', 'ios'],
      default: 'android'
    },
    {
      type: 'input',
      name: 'appPackage',
      message: (answers) => answers.platform === 'android'
        ? '📦 Package de la app (ej: com.example.app):'
        : '📦 Bundle ID de la app (ej: com.example.app):',
      default: 'com.example.app',
      validate: (input) => input.length > 0 || 'El package/bundle ID es requerido'
    },
    {
      type: 'editor',
      name: 'instructions',
      message: '📖 Describe qué quieres probar (se abrirá tu editor):',
      default: 'Abre la app, toca el botón de login, llena el email con test@example.com, llena la contraseña con password123, toca el botón entrar, verifica que aparece el texto Bienvenido',
      validate: (input) => input.trim().length > 10 || 'Describe con más detalle qué quieres probar.'
    }
  ]);

  console.log('\n⚙️  Inicializando LLM...');

  // Crear runner para obtener LLM adapter
  const runner = new UniversalTestRunnerCore();
  await runner.initialize();

  console.log('\n🤖 Generando test desde lenguaje natural...');

  // Crear generador
  const generator = new MobileTestGenerator(runner.llmAdapter, runner.config);

  // Generar test
  const testStructure = await generator.convertNaturalLanguageToMobileTest(
    answers.instructions,
    answers.appPackage,
    answers.suiteName,
    answers.platform
  );

  // Guardar test
  const filename = answers.suiteName.toLowerCase().replace(/\s+/g, '-');
  const filepath = generator.saveMobileTest(testStructure, filename);

  console.log(`\n✅ ¡Test creado exitosamente!`);
  console.log(`   📄 Archivo: ${filepath}`);
  console.log(`   📱 Plataforma: ${answers.platform}`);
  console.log(`   📦 App: ${answers.appPackage}`);

  // Limpiar
  await runner.cleanup();

  // Preguntar si quiere ejecutar
  const { executeNow } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'executeNow',
      message: '¿Quieres ejecutar el test ahora?',
      default: false
    }
  ]);

  if (executeNow) {
    await executeTest(filepath, answers.platform, answers.appPackage);
  } else {
    console.log(`\n💡 Para ejecutarlo después:`);
    console.log(`   npm run test-mobile ${filepath} --device=<device-id>`);
  }
}

/**
 * Crea test con recorder (próximamente)
 */
async function createWithRecorder() {
  console.log('\n🎬 MODO: Recorder (En desarrollo)\n');
  console.log('Esta funcionalidad estará disponible próximamente.');
  console.log('El recorder capturará tus interacciones en tiempo real y generará el test automáticamente.\n');
}

/**
 * Ejecuta un test móvil
 */
async function executeTest(testPath, platform, appPackage) {
  console.log('\n🚀 Ejecutando test...\n');

  try {
    // Listar dispositivos disponibles
    const devices = await listAvailableDevices();

    if (devices.length === 0) {
      console.log('❌ No hay dispositivos móviles disponibles.');
      console.log('💡 Asegúrate de tener un emulador ejecutándose o un dispositivo conectado.');
      return;
    }

    console.log(`\n📱 Dispositivos disponibles:`);
    devices.forEach((device, index) => {
      console.log(`   ${index + 1}. ${device.id} - ${device.state}`);
    });

    // Seleccionar dispositivo
    const { deviceIndex } = await inquirer.prompt([
      {
        type: 'list',
        name: 'deviceIndex',
        message: '¿En qué dispositivo quieres ejecutar?',
        choices: devices.map((device, index) => ({
          name: `${device.id} (${device.state})`,
          value: index
        }))
      }
    ]);

    const selectedDevice = devices[deviceIndex];

    // Ejecutar test
    const { spawn } = require('child_process');

    const testProcess = spawn('node', [
      'scripts/test-mobile.js',
      testPath,
      '--device',
      selectedDevice.id
    ], {
      stdio: 'inherit'
    });

    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Test completado exitosamente!');
      } else {
        console.log(`\n❌ Test finalizó con código: ${code}`);
      }
    });

  } catch (error) {
    console.error('❌ Error ejecutando test:', error.message);
  }
}

/**
 * Lista dispositivos móviles disponibles
 */
async function listAvailableDevices() {
  try {
    const factory = MCPClientFactory || require('../runners/core/mcp-client-factory.js').MCPClientFactory;

    // Listar dispositivos Android
    const { execSync } = require('child_process');

    try {
      const output = execSync('adb devices -l', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const lines = output.split('\n').filter(line => line.trim() && !line.includes('List of devices'));

      const devices = lines.map(line => {
        const parts = line.split(/\s+/);
        return {
          id: parts[0],
          state: parts[1],
          platform: 'android'
        };
      }).filter(d => d.state === 'device' || d.state === 'emulator');

      return devices;
    } catch (error) {
      console.log('⚠️  No se pudo ejecutar adb. Asegúrate de que Android SDK esté instalado.');
      return [];
    }
  } catch (error) {
    console.error('Error listando dispositivos:', error.message);
    return [];
  }
}

// Ejecutar
main();
