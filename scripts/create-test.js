// scripts/create-test.js
// CLI interactivo para crear tests desde lenguaje natural

const inquirer = require('inquirer');
const fs = require('fs');
const { spawn } = require('child_process');
const { TestGenerator } = require('../runners/test-generator.js');
const { UniversalTestRunnerCore } = require('../runners/universal-runner.js');

console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   🤖 GENERADOR INTELIGENTE DE TESTS                              ║
║   Crea tests automatizados sin conocimientos técnicos           ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
`);

async function main() {
  try {
    // Paso 1: Recopilar información del usuario
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'suiteName',
        message: '📝 Nombre del test (ej: Test de Login):',
        default: 'Test Generado',
        validate: (input) => input.length > 0 || 'El nombre es requerido'
      },
      {
        type: 'input',
        name: 'baseUrl',
        message: '🌐 URL de tu aplicación:',
        default: 'http://localhost:3000',
        validate: (input) => {
          try {
            new URL(input);
            return true;
          } catch {
            return 'Ingresa una URL válida';
          }
        }
      },
      {
        type: 'editor',
        name: 'instructions',
        message: '📖 Describe qué quieres probar (se abrirá tu editor):',
        default: `Ejemplo:
Abre la aplicación.
Busca el botón que dice "Add to Cart" o "Agregar al Carrito" y haz click.
Verifica que el carrito muestre 1 producto.
Haz click en el botón "Cart" para ver el carrito.
Verifica que el producto aparezca en el carrito.`,
        validate: (input) => input.trim().length > 10 || 'Describe al menos qué quieres probar'
      },
      {
        type: 'confirm',
        name: 'executeNow',
        message: '▶️  ¿Quieres ejecutar el test inmediatamente?',
        default: true
      }
    ]);

    console.log('\n' + '='.repeat(70));
    console.log('📋 RESUMEN');
    console.log('='.repeat(70));
    console.log(`Nombre: ${answers.suiteName}`);
    console.log(`URL: ${answers.baseUrl}`);
    console.log(`Instrucciones: ${answers.instructions.substring(0, 100)}...`);
    console.log('='.repeat(70) + '\n');

    // Paso 2: Inicializar runner y generador
    console.log('⚙️  Inicializando sistema...\n');
    const runner = new UniversalTestRunnerCore();
    await runner.initialize();

    const generator = new TestGenerator(runner.llmAdapter, runner.config);

    // Paso 3: Convertir lenguaje natural a YAML
    console.log('🤖 Generando test desde tus instrucciones...');
    const testStructure = await generator.convertNaturalLanguageToTest(
      answers.instructions,
      answers.baseUrl,
      answers.suiteName
    );

    // Crear nombre de archivo seguro
    const filename = answers.suiteName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Paso 4: Guardar test inicial
    const testPath = generator.saveTest(testStructure, filename);

    console.log('\n✅ Test generado exitosamente!');
    console.log(`📄 Archivo: ${testPath}`);

    // Paso 5: Preguntar si quiere ejecutar
    if (answers.executeNow) {
      console.log('\n' + '='.repeat(70));
      console.log('▶️  EJECUTANDO TEST');
      console.log('='.repeat(70) + '\n');

      console.log('ℹ️  El sistema ahora:');
      console.log('   1️⃣  Ejecutará tu aplicación');
      console.log('   2️⃣  Capturará snapshots del DOM');
      console.log('   3️⃣  Usará IA para encontrar los elementos');
      console.log('   4️⃣  Compilará el test optimizado');
      console.log('   5️⃣  Futuras ejecuciones serán 35x más rápidas!\n');

      // Preguntar si la aplicación ya está corriendo
      const { appRunning } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'appRunning',
          message: `¿Tu aplicación ya está corriendo en ${answers.baseUrl}?`,
          default: false
        }
      ]);

      if (!appRunning) {
        console.log('\n⚠️  IMPORTANTE: Asegúrate de que tu aplicación esté corriendo antes de continuar.');
        console.log(`   Abre otra terminal y ejecuta tu aplicación en: ${answers.baseUrl}`);
        console.log('   Luego presiona Enter para continuar...\n');

        await inquirer.prompt([
          {
            type: 'input',
            name: 'continue',
            message: 'Presiona Enter cuando tu aplicación esté lista'
          }
        ]);
      }

      console.log('\n🚀 Iniciando ejecución del test...\n');

      // Ejecutar el test
      try {
        const results = await runner.runSuite(testPath, { recompile: false });

        console.log('\n' + '='.repeat(70));
        console.log('📊 RESULTADOS');
        console.log('='.repeat(70));
        console.log(`✅ Exitosos: ${results.passed}`);
        console.log(`❌ Fallidos: ${results.failed}`);
        console.log(`⏱️  Duración: ${((results.endTime - results.startTime) / 1000).toFixed(2)}s`);
        console.log('='.repeat(70) + '\n');

        if (results.passed > 0) {
          console.log('🎉 ¡Test completado exitosamente!');
          console.log('\n📝 Próximos pasos:');
          console.log('   1️⃣  Revisa el reporte en: tests/results/');
          console.log('   2️⃣  Revisa los screenshots en: tests/screenshots/');
          console.log('   3️⃣  El test compilado está en: tests/compiled/');
          console.log('\n⚡ Ejecuta el test de nuevo para velocidad 35x más rápida:');
          console.log(`   npm test ${testPath}`);
        } else {
          console.log('⚠️  El test tuvo errores.');
          console.log('   Revisa el reporte y los screenshots para más detalles.');
          console.log('\n🔧 Sugerencias:');
          console.log('   - Verifica que la URL sea correcta');
          console.log('   - Asegúrate de que la aplicación esté corriendo');
          console.log('   - Revisa que las descripciones sean claras');
        }

      } catch (error) {
        console.error('\n❌ Error ejecutando el test:', error.message);
        console.log('\n🔧 Puedes ejecutar el test manualmente con:');
        console.log(`   npm test ${testPath}`);
      } finally {
        await runner.cleanup();
      }

    } else {
      console.log('\n📝 Test guardado. Puedes ejecutarlo cuando quieras con:');
      console.log(`   npm test ${testPath}`);
      console.log('\n💡 Tips:');
      console.log('   - Primera ejecución compilará el test (2-3 minutos)');
      console.log('   - Siguientes ejecuciones serán 35x más rápidas');
      console.log('   - Puedes editar el test en el archivo YAML generado');
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ ¡Proceso completado!');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    if (error.message === 'User force closed the prompt') {
      console.log('\n\n⚠️  Proceso cancelado por el usuario.');
    } else {
      console.error('\n❌ Error:', error.message);
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Manejar señales de interrupción
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Proceso interrumpido.');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n⚠️  Proceso terminado.');
  process.exit(0);
});

// Ejecutar
main().catch(error => {
  console.error('\n❌ Error fatal:', error.message);
  process.exit(1);
});
