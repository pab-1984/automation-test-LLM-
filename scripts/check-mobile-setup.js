#!/usr/bin/env node

/**
 * Script para verificar la configuración de testing móvil
 * Valida que ADB, Android SDK y dispositivos estén configurados correctamente
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);
const path = require('path');
const fs = require('fs');

console.log('🔍 VALIDACIÓN DE CONFIGURACIÓN MÓVIL');
console.log('=' .repeat(70));
console.log('');

let hasErrors = false;

/**
 * Obtiene la ruta del ejecutable de ADB
 */
function getAdbPath() {
  // Intentar con la ruta por defecto del Android SDK en Windows
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) {
      const sdkPath = path.join(localAppData, 'Android', 'Sdk', 'platform-tools', 'adb.exe');
      if (fs.existsSync(sdkPath)) {
        return sdkPath;
      }
    }

    // Intentar con ANDROID_HOME
    const androidHome = process.env.ANDROID_HOME;
    if (androidHome) {
      const sdkPath = path.join(androidHome, 'platform-tools', 'adb.exe');
      if (fs.existsSync(sdkPath)) {
        return sdkPath;
      }
    }
  }

  return 'adb';
}

async function checkADB() {
  console.log('1️⃣ Verificando ADB (Android Debug Bridge)...\n');

  const adbPath = getAdbPath();

  try {
    const { stdout } = await execPromise(`"${adbPath}" version`);
    const versionMatch = stdout.match(/Android Debug Bridge version ([\d.]+)/);
    const version = versionMatch ? versionMatch[1] : 'desconocida';

    console.log(`   ✅ ADB encontrado: ${adbPath}`);
    console.log(`   📦 Versión: ${version}`);
    console.log('');
    return true;
  } catch (error) {
    console.log(`   ❌ ADB NO encontrado`);
    console.log(`   📂 Ruta buscada: ${adbPath}`);
    console.log('');
    console.log('   💡 SOLUCIONES:');
    console.log('      • Instala Android Studio desde: https://developer.android.com/studio');
    console.log('      • Asegúrate de instalar "Android SDK Platform-Tools"');
    console.log(`      • La ruta esperada es: ${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools`);
    console.log('      • O agrega ADB al PATH del sistema');
    console.log('');
    hasErrors = true;
    return false;
  }
}

async function checkDevices() {
  console.log('2️⃣ Verificando dispositivos conectados...\n');

  const adbPath = getAdbPath();

  try {
    const { stdout } = await execPromise(`"${adbPath}" devices -l`);
    const lines = stdout.split('\n').filter(line => line.trim() && !line.includes('List of devices'));

    if (lines.length === 0) {
      console.log('   ⚠️  No hay dispositivos conectados');
      console.log('');
      console.log('   💡 SOLUCIONES:');
      console.log('      • Conecta un dispositivo Android físico vía USB');
      console.log('      • Habilita "Depuración USB" en el dispositivo:');
      console.log('        Configuración → Acerca del teléfono → Tap 7 veces en "Número de compilación"');
      console.log('        Configuración → Opciones de desarrollador → Activar "Depuración USB"');
      console.log('      • O inicia un emulador Android desde Android Studio');
      console.log('      • Ejecuta: adb devices para verificar');
      console.log('');
      hasErrors = true;
      return false;
    }

    console.log(`   ✅ ${lines.length} dispositivo(s) encontrado(s):\n`);

    lines.forEach((line, index) => {
      const parts = line.trim().split(/\s+/);
      const id = parts[0];
      const status = parts[1];

      let model = 'Unknown Device';
      const modelMatch = line.match(/model:([^\s]+)/);
      if (modelMatch) {
        model = modelMatch[1].replace(/_/g, ' ');
      }

      const statusIcon = status === 'device' ? '🟢' : '🔴';
      const typeIcon = id.includes('emulator') ? '💻' : '📱';

      console.log(`   ${index + 1}. ${statusIcon} ${typeIcon} ${id}`);
      console.log(`      Modelo: ${model}`);
      console.log(`      Estado: ${status}`);
      console.log('');
    });

    return true;
  } catch (error) {
    console.log(`   ❌ Error listando dispositivos: ${error.message}`);
    console.log('');
    hasErrors = true;
    return false;
  }
}

async function checkAndroidSDK() {
  console.log('3️⃣ Verificando Android SDK...\n');

  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) {
    console.log('   ⚠️  Variable LOCALAPPDATA no encontrada');
    console.log('');
    return false;
  }

  const sdkPath = path.join(localAppData, 'Android', 'Sdk');

  if (fs.existsSync(sdkPath)) {
    console.log(`   ✅ Android SDK encontrado: ${sdkPath}`);

    // Verificar platform-tools
    const platformTools = path.join(sdkPath, 'platform-tools');
    if (fs.existsSync(platformTools)) {
      console.log(`   ✅ Platform Tools encontrado: ${platformTools}`);
    } else {
      console.log(`   ⚠️  Platform Tools NO encontrado`);
      hasErrors = true;
    }

    // Verificar emulator
    const emulator = path.join(sdkPath, 'emulator');
    if (fs.existsSync(emulator)) {
      console.log(`   ✅ Emulator encontrado: ${emulator}`);
    } else {
      console.log(`   ℹ️  Emulator NO encontrado (opcional)`);
    }

    console.log('');
    return true;
  } else {
    console.log(`   ❌ Android SDK NO encontrado en: ${sdkPath}`);
    console.log('');
    console.log('   💡 SOLUCIÓN:');
    console.log('      • Instala Android Studio');
    console.log('      • Durante la instalación, asegúrate de instalar el Android SDK');
    console.log('');
    hasErrors = true;
    return false;
  }
}

async function checkEnvironmentVariables() {
  console.log('4️⃣ Verificando variables de entorno...\n');

  const androidHome = process.env.ANDROID_HOME;
  if (androidHome) {
    console.log(`   ✅ ANDROID_HOME: ${androidHome}`);
  } else {
    console.log('   ℹ️  ANDROID_HOME no configurada (opcional)');
  }

  const path = process.env.PATH;
  if (path && path.includes('platform-tools')) {
    console.log('   ✅ platform-tools está en el PATH');
  } else {
    console.log('   ⚠️  platform-tools NO está en el PATH');
    console.log('');
    console.log('   💡 RECOMENDACIÓN:');
    console.log('      Agrega platform-tools al PATH para usar ADB desde cualquier lugar:');
    console.log(`      ${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools`);
  }

  console.log('');
}

async function main() {
  const adbOk = await checkADB();

  if (adbOk) {
    await checkDevices();
  }

  await checkAndroidSDK();
  await checkEnvironmentVariables();

  console.log('='.repeat(70));
  if (hasErrors) {
    console.log('❌ CONFIGURACIÓN INCOMPLETA');
    console.log('   Hay problemas que deben resolverse antes de ejecutar tests móviles');
  } else {
    console.log('✅ CONFIGURACIÓN CORRECTA');
    console.log('   Todo está listo para ejecutar tests móviles');
  }
  console.log('='.repeat(70));
  console.log('');

  if (hasErrors) {
    console.log('📚 RECURSOS ÚTILES:');
    console.log('   • Guía de instalación de Android Studio:');
    console.log('     https://developer.android.com/studio/install');
    console.log('   • Configurar depuración USB:');
    console.log('     https://developer.android.com/studio/debug/dev-options');
    console.log('   • Gestionar emuladores:');
    console.log('     https://developer.android.com/studio/run/managing-avds');
    console.log('');
    process.exit(1);
  }

  process.exit(0);
}

main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
