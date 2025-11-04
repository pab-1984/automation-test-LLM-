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

module.exports = {
  getDevices,
  getDeviceInfo,
  takeDeviceScreenshot
};
