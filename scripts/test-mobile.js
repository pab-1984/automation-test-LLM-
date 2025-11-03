#!/usr/bin/env node

/**
 * Script helper para ejecutar tests móviles
 * Facilita la ejecución de tests en dispositivos Android/iOS
 *
 * Uso:
 *   node scripts/test-mobile.js [suiteFile] [options]
 *   npm run test-mobile [suiteFile] [options]
 *
 * Opciones:
 *   --device=ID      ID del dispositivo (ej: emulator-5554)
 *   --list           Listar dispositivos disponibles
 *   --recompile, -r  Forzar recompilación del test
 *
 * Ejemplos:
 *   node scripts/test-mobile.js ./tests/suites/mobile-login.yml
 *   node scripts/test-mobile.js --device=emulator-5554
 *   node scripts/test-mobile.js --list
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function listDevices() {
  console.log('\n📱 DISPOSITIVOS MÓVILES DISPONIBLES\n');
  console.log('═'.repeat(60));

  try {
    // Buscar dispositivos Android con ADB
    const androidPath = process.env.LOCALAPPDATA
      ? `${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe`
      : 'adb';

    const { stdout } = await execAsync(`"${androidPath}" devices`);
    const lines = stdout.split('\n').filter(line => line.trim() && !line.startsWith('List'));

    if (lines.length === 0) {
      console.log('⚠️  No se encontraron dispositivos Android conectados');
      console.log('\n💡 Asegúrate de:');
      console.log('   1. Tener un emulador Android corriendo');
      console.log('   2. O tener un dispositivo físico conectado por USB');
      console.log('   3. Android SDK instalado correctamente');
    } else {
      console.log('ANDROID:');
      lines.forEach(line => {
        const [id, status] = line.trim().split(/\s+/);
        const statusIcon = status === 'device' ? '✅' : '❌';
        console.log(`  ${statusIcon} ${id} - ${status}`);
      });

      console.log('\n💡 Para ejecutar un test en un dispositivo específico:');
      const firstDevice = lines[0].split(/\s+/)[0];
      console.log(`   node scripts/test-mobile.js --device=${firstDevice}`);
    }

  } catch (error) {
    console.error('❌ Error listando dispositivos:', error.message);
    console.log('\n💡 Verifica que Android SDK esté instalado en:');
    console.log(`   ${process.env.LOCALAPPDATA}\\Android\\Sdk`);
  }

  console.log('═'.repeat(60));
}

async function runMobileTest() {
  const args = process.argv.slice(2);

  // Si se solicita listar dispositivos
  if (args.includes('--list')) {
    await listDevices();
    return;
  }

  // Parsear argumentos
  const suiteFile = args.find(arg => !arg.startsWith('--')) || './tests/suites/mobile-example.yml';
  const deviceArg = args.find(arg => arg.startsWith('--device='));
  const recompile = args.includes('--recompile') || args.includes('-r');

  console.log('\n📱 EJECUTANDO TEST MÓVIL\n');
  console.log('═'.repeat(60));
  console.log(`Suite: ${suiteFile}`);

  // Construir comando
  let command = `node runners/universal-runner.js "${suiteFile}" --mobile`;

  if (deviceArg) {
    command += ` ${deviceArg}`;
    console.log(`Dispositivo: ${deviceArg.split('=')[1]}`);
  } else {
    console.log(`Dispositivo: (se usará el primero disponible)`);
  }

  if (recompile) {
    command += ' --recompile';
    console.log('Recompilación: forzada');
  }

  console.log('═'.repeat(60));
  console.log('');

  // Ejecutar test
  const child = exec(command);

  // Redirigir output
  child.stdout.on('data', data => process.stdout.write(data));
  child.stderr.on('data', data => process.stderr.write(data));

  // Esperar a que termine
  return new Promise((resolve, reject) => {
    child.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Test failed with code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

// Ejecutar
if (require.main === module) {
  runMobileTest()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    });
}

module.exports = { listDevices, runMobileTest };
