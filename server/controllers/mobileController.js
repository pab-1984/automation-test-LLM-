// server/controllers/mobileController.js

/**
 * Controlador para gestión de dispositivos móviles
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);
const path = require('path');
const fs = require('fs');

/**
 * Obtiene la ruta del ejecutable de ADB
 */
function getAdbPath() {
  // Intentar primero con 'adb' del PATH
  const defaultAdb = 'adb';

  // Si estamos en Windows, intentar con la ruta por defecto del Android SDK
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) {
      const sdkPath = path.join(localAppData, 'Android', 'Sdk', 'platform-tools', 'adb.exe');
      if (fs.existsSync(sdkPath)) {
        return `"${sdkPath}"`;
      }
    }

    // Intentar con la variable de entorno ANDROID_HOME
    const androidHome = process.env.ANDROID_HOME;
    if (androidHome) {
      const sdkPath = path.join(androidHome, 'platform-tools', 'adb.exe');
      if (fs.existsSync(sdkPath)) {
        return `"${sdkPath}"`;
      }
    }
  }

  return defaultAdb;
}

/**
 * Lista dispositivos Android disponibles usando ADB
 */
async function listAndroidDevices() {
  try {
    const adbPath = getAdbPath();

    // Verificar que ADB esté disponible
    try {
      await execPromise(`${adbPath} version`);
    } catch (verifyError) {
      console.warn('⚠️ ADB no disponible. Por favor:');
      console.warn('   1. Instala Android Studio');
      console.warn('   2. O agrega ADB al PATH del sistema');
      console.warn(`   3. Ruta esperada: ${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools`);
      return [];
    }

    const { stdout } = await execPromise(`${adbPath} devices -l`);
    const lines = stdout.split('\n').filter(line => line.trim() && !line.includes('List of devices'));

    const devices = lines.map(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 2) return null;

      const id = parts[0];
      const status = parts[1];

      // Extraer modelo del output
      let model = 'Unknown Device';
      const modelMatch = line.match(/model:([^\s]+)/);
      if (modelMatch) {
        model = modelMatch[1].replace(/_/g, ' ');
      }

      // Extraer producto
      let product = '';
      const productMatch = line.match(/product:([^\s]+)/);
      if (productMatch) {
        product = productMatch[1];
      }

      return {
        id,
        status,
        model,
        product,
        platform: 'android',
        type: id.includes('emulator') ? 'emulator' : 'physical'
      };
    }).filter(Boolean);

    return devices;
  } catch (error) {
    console.error('Error listando dispositivos Android:', error.message);
    return [];
  }
}

/**
 * Obtiene la ruta del ejecutable de emulator
 */
function getEmulatorPath() {
  // Intentar encontrar emulator en el Android SDK
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) {
      const emulatorPath = path.join(localAppData, 'Android', 'Sdk', 'emulator', 'emulator.exe');
      if (fs.existsSync(emulatorPath)) {
        return `"${emulatorPath}"`;
      }
    }

    const androidHome = process.env.ANDROID_HOME;
    if (androidHome) {
      const emulatorPath = path.join(androidHome, 'emulator', 'emulator.exe');
      if (fs.existsSync(emulatorPath)) {
        return `"${emulatorPath}"`;
      }
    }
  } else {
    // Linux/Mac
    const androidHome = process.env.ANDROID_HOME;
    if (androidHome) {
      const emulatorPath = path.join(androidHome, 'emulator', 'emulator');
      if (fs.existsSync(emulatorPath)) {
        return emulatorPath;
      }
    }
  }

  return 'emulator'; // Intentar desde PATH
}

/**
 * Lista todos los emuladores Android disponibles (AVDs)
 */
async function listAvailableEmulators() {
  try {
    const emulatorPath = getEmulatorPath();

    const { stdout } = await execPromise(`${emulatorPath} -list-avds`);
    const avds = stdout.trim().split('\n').filter(line => line.trim());

    const emulators = avds.map(avd => ({
      name: avd.trim(),
      id: `emulator-${avd.trim()}`,
      status: 'offline',
      type: 'emulator',
      platform: 'android',
      isRunning: false
    }));

    // Verificar cuáles están corriendo actualmente
    const runningDevices = await listAndroidDevices();
    const runningEmulators = runningDevices.filter(d => d.type === 'emulator');

    emulators.forEach(emu => {
      const running = runningEmulators.find(r => r.id.includes(emu.name) || emu.name.includes(r.id));
      if (running) {
        emu.isRunning = true;
        emu.status = 'online';
        emu.actualId = running.id;
        emu.model = running.model;
      }
    });

    return emulators;
  } catch (error) {
    console.error('Error listando emuladores disponibles:', error.message);
    return [];
  }
}

/**
 * Inicia un emulador Android específico
 */
async function startEmulator(avdName, options = {}) {
  try {
    const emulatorPath = getEmulatorPath();

    // Opciones del emulador
    const opts = [];
    if (options.noWindow) opts.push('-no-window');
    if (options.noSnapshot) opts.push('-no-snapshot');
    if (options.wipeData) opts.push('-wipe-data');
    if (options.gpu) opts.push(`-gpu ${options.gpu}`);

    const optsString = opts.join(' ');

    // Iniciar emulador en background
    const command = `${emulatorPath} -avd ${avdName} ${optsString}`;

    console.log(`🚀 Iniciando emulador: ${avdName}`);
    console.log(`   Comando: ${command}`);

    // Ejecutar en background sin esperar
    const { exec } = require('child_process');
    const child = exec(command, { detached: true, stdio: 'ignore' });
    child.unref();

    // Esperar un poco para que inicie
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verificar que el emulador esté iniciando
    let attempts = 0;
    const maxAttempts = 30; // 30 segundos

    while (attempts < maxAttempts) {
      const devices = await listAndroidDevices();
      const emulator = devices.find(d => d.type === 'emulator' && d.status === 'device');

      if (emulator) {
        console.log(`✅ Emulador iniciado: ${emulator.id}`);
        return {
          success: true,
          emulatorId: emulator.id,
          avdName,
          message: 'Emulador iniciado correctamente'
        };
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    return {
      success: true,
      message: 'Emulador iniciando... Puede tomar varios minutos',
      avdName
    };

  } catch (error) {
    console.error('Error iniciando emulador:', error.message);
    throw error;
  }
}

/**
 * Detiene un emulador específico
 */
async function stopEmulator(deviceId) {
  try {
    const adbPath = getAdbPath();
    await execPromise(`${adbPath} -s ${deviceId} emu kill`);

    return {
      success: true,
      message: 'Emulador detenido',
      deviceId
    };
  } catch (error) {
    console.error('Error deteniendo emulador:', error.message);
    throw error;
  }
}

/**
 * Lista dispositivos iOS disponibles usando simctl (macOS)
 */
async function listIOSDevices() {
  try {
    // Verificar si estamos en macOS
    if (process.platform !== 'darwin') {
      return [];
    }

    const { stdout } = await execPromise('xcrun simctl list devices available --json');
    const data = JSON.parse(stdout);

    const devices = [];

    // Parsear dispositivos por runtime
    Object.keys(data.devices || {}).forEach(runtime => {
      const runtimeDevices = data.devices[runtime] || [];
      runtimeDevices.forEach(device => {
        if (device.state === 'Booted' || device.isAvailable) {
          devices.push({
            id: device.udid,
            status: device.state === 'Booted' ? 'online' : 'offline',
            model: device.name,
            product: runtime,
            platform: 'ios',
            type: 'simulator'
          });
        }
      });
    });

    return devices;
  } catch (error) {
    console.error('Error listando dispositivos iOS:', error.message);
    return [];
  }
}

/**
 * GET /api/mobile/devices
 * Lista todos los dispositivos móviles disponibles (Android + iOS)
 */
async function getDevices(req, res) {
  try {
    const platform = req.query.platform; // 'android', 'ios', o undefined para todos

    let devices = [];

    if (!platform || platform === 'android') {
      const androidDevices = await listAndroidDevices();
      devices = devices.concat(androidDevices);
    }

    if (!platform || platform === 'ios') {
      const iosDevices = await listIOSDevices();
      devices = devices.concat(iosDevices);
    }

    // Obtener información adicional del dispositivo seleccionado si se proporciona
    const selectedDeviceId = req.query.selectedDevice;
    let selectedDevice = null;

    if (selectedDeviceId) {
      selectedDevice = devices.find(d => d.id === selectedDeviceId);

      // Obtener información adicional del dispositivo
      if (selectedDevice && selectedDevice.platform === 'android') {
        try {
          const adbPath = getAdbPath();
          // Obtener versión de Android
          const { stdout: version } = await execPromise(`${adbPath} -s ${selectedDeviceId} shell getprop ro.build.version.release`);
          selectedDevice.androidVersion = version.trim();

          // Obtener tamaño de pantalla
          const { stdout: screenSize } = await execPromise(`${adbPath} -s ${selectedDeviceId} shell wm size`);
          const sizeMatch = screenSize.match(/(\d+)x(\d+)/);
          if (sizeMatch) {
            selectedDevice.screenSize = { width: parseInt(sizeMatch[1]), height: parseInt(sizeMatch[2]) };
          }
        } catch (error) {
          console.warn('Error obteniendo info adicional:', error.message);
        }
      }
    }

    res.json({
      success: true,
      devices,
      selectedDevice,
      count: devices.length,
      platforms: {
        android: devices.filter(d => d.platform === 'android').length,
        ios: devices.filter(d => d.platform === 'ios').length
      }
    });
  } catch (error) {
    console.error('Error en getDevices:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/mobile/devices/:deviceId
 * Obtiene información detallada de un dispositivo específico
 */
async function getDeviceInfo(req, res) {
  try {
    const { deviceId } = req.params;

    // Primero obtener lista de dispositivos
    const androidDevices = await listAndroidDevices();
    const iosDevices = await listIOSDevices();
    const allDevices = [...androidDevices, ...iosDevices];

    const device = allDevices.find(d => d.id === deviceId);

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Dispositivo no encontrado'
      });
    }

    // Obtener información adicional según la plataforma
    if (device.platform === 'android') {
      try {
        const adbPath = getAdbPath();
        const { stdout: version } = await execPromise(`${adbPath} -s ${deviceId} shell getprop ro.build.version.release`);
        device.androidVersion = version.trim();

        const { stdout: screenSize } = await execPromise(`${adbPath} -s ${deviceId} shell wm size`);
        const sizeMatch = screenSize.match(/(\d+)x(\d+)/);
        if (sizeMatch) {
          device.screenSize = { width: parseInt(sizeMatch[1]), height: parseInt(sizeMatch[2]) };
        }

        const { stdout: density } = await execPromise(`${adbPath} -s ${deviceId} shell wm density`);
        const densityMatch = density.match(/(\d+)/);
        if (densityMatch) {
          device.density = parseInt(densityMatch[1]);
        }
      } catch (error) {
        console.warn('Error obteniendo info de Android:', error.message);
      }
    }

    res.json({
      success: true,
      device
    });
  } catch (error) {
    console.error('Error en getDeviceInfo:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/mobile/devices/:deviceId/screenshot
 * Toma un screenshot del dispositivo
 */
async function takeDeviceScreenshot(req, res) {
  try {
    const { deviceId } = req.params;
    const timestamp = Date.now();
    const filename = `device-${deviceId}-${timestamp}.png`;
    const outputPath = path.join(process.cwd(), 'results', 'screenshots', filename);

    // Crear directorio si no existe
    const fs = require('fs');
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Tomar screenshot según plataforma
    // Determinar plataforma del dispositivo
    const isAndroid = !deviceId.includes('iOS') && !deviceId.includes('simulator');

    if (isAndroid) {
      const adbPath = getAdbPath();
      await execPromise(`${adbPath} -s ${deviceId} exec-out screencap -p > "${outputPath}"`);
    } else {
      // iOS simulator
      await execPromise(`xcrun simctl io ${deviceId} screenshot "${outputPath}"`);
    }

    res.json({
      success: true,
      filename,
      path: `/screenshots/${filename}`,
      timestamp
    });
  } catch (error) {
    console.error('Error tomando screenshot:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/mobile/emulators
 * Lista todos los emuladores Android disponibles (AVDs)
 */
async function getAvailableEmulators(req, res) {
  try {
    const emulators = await listAvailableEmulators();

    res.json({
      success: true,
      emulators,
      count: emulators.length,
      running: emulators.filter(e => e.isRunning).length
    });
  } catch (error) {
    console.error('Error en getAvailableEmulators:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/mobile/emulators/:avdName/start
 * Inicia un emulador específico
 */
async function startEmulatorEndpoint(req, res) {
  try {
    const { avdName } = req.params;
    const options = req.body || {};

    const result = await startEmulator(avdName, options);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error en startEmulatorEndpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/mobile/devices/:deviceId/stop
 * Detiene un emulador específico
 */
async function stopEmulatorEndpoint(req, res) {
  try {
    const { deviceId } = req.params;

    const result = await stopEmulator(deviceId);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error en stopEmulatorEndpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  getDevices,
  getDeviceInfo,
  takeDeviceScreenshot,
  listAndroidDevices,
  listIOSDevices,
  getAvailableEmulators,
  startEmulatorEndpoint,
  stopEmulatorEndpoint,
  listAvailableEmulators,
  startEmulator,
  stopEmulator
};
