// runners/core/mcp-client-factory.js

/**
 * Factory para crear clientes MCP según la plataforma
 * Soporta web (chrome-devtools-mcp) y mobile (mobile-mcp)
 */

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const path = require('path');

class MCPClientFactory {
  /**
   * Crea un cliente MCP según la plataforma especificada
   *
   * @param {string} platform - 'web' | 'mobile'
   * @param {object} options - Opciones específicas de la plataforma
   * @returns {Promise<object>} Cliente MCP inicializado con metadata
   */
  static async createClient(platform = 'web', options = {}) {
    switch (platform.toLowerCase()) {
      case 'web':
        return await this.createWebClient(options);

      case 'mobile':
        return await this.createMobileClient(options);

      default:
        throw new Error(`Plataforma no soportada: ${platform}. Usa 'web' o 'mobile'`);
    }
  }

  /**
   * Crea cliente para testing web (chrome-devtools-mcp)
   */
  static async createWebClient(options = {}) {
    console.log('🌐 Inicializando cliente MCP para WEB (chrome-devtools-mcp)...');

    const mcpClient = new Client({
      name: 'test-runner-web',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    // Configurar transport para chrome-devtools-mcp
    const serverPath = path.join(
      process.cwd(),
      'node_modules',
      '@agenticlabs',
      'chrome-devtools-mcp',
      'dist',
      'index.js'
    );

    const transport = new StdioClientTransport({
      command: 'node',
      args: [serverPath],
      env: {
        ...process.env,
        CHROME_PATH: options.chromePath || process.env.CHROME_PATH || ''
      }
    });

    await mcpClient.connect(transport);
    console.log('✅ Cliente MCP Web conectado');

    // Crear página inicial
    let pageIndex = null;
    try {
      const newPageResult = await mcpClient.callTool({
        name: 'new_page',
        arguments: {}
      });

      if (newPageResult.content && newPageResult.content[0]) {
        const resultText = newPageResult.content[0].text;
        const match = resultText.match(/^(\d+):[\s\S]*?\[selected\]/m);

        if (match) {
          pageIndex = parseInt(match[1]);
          console.log(`📄 Página web creada (índice: ${pageIndex})`);
        }
      }
    } catch (error) {
      console.error('⚠️  Error creando página web:', error.message);
    }

    return {
      client: mcpClient,
      transport,
      platform: 'web',
      pageIndex,
      capabilities: {
        navigate: true,
        screenshot: true,
        click: true,
        fill: true,
        snapshot: true,
        evaluate: true,
        cookies: true,
        network: true,
        performance: true
      }
    };
  }

  /**
   * Crea cliente para testing móvil (mobile-mcp)
   */
  static async createMobileClient(options = {}) {
    console.log('📱 Inicializando cliente MCP para MOBILE (mobile-mcp)...');

    const mcpClient = new Client({
      name: 'test-runner-mobile',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    // Configurar transport para mobile-mcp
    const serverPath = path.join(
      process.cwd(),
      'node_modules',
      '@mobilenext',
      'mobile-mcp',
      'lib',
      'index.js'
    );

    // Configurar PATH para Android SDK
    const androidSdkPath = process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk')
      : '';

    const transport = new StdioClientTransport({
      command: 'node',
      args: [serverPath],
      env: {
        ...process.env,
        PATH: process.env.PATH + ';' + path.join(androidSdkPath, 'platform-tools'),
        ANDROID_HOME: androidSdkPath,
        DEVICE_ID: options.deviceId || process.env.DEVICE_ID || ''
      }
    });

    await mcpClient.connect(transport);
    console.log('✅ Cliente MCP Mobile conectado');

    // Listar dispositivos disponibles
    let availableDevices = [];
    let selectedDevice = null;

    try {
      const devicesResult = await mcpClient.callTool({
        name: 'mobile_list_available_devices',
        arguments: {}
      });

      if (devicesResult.content && devicesResult.content[0]) {
        const devicesText = devicesResult.content[0].text;
        console.log('📱 Dispositivos disponibles:');
        console.log(devicesText);

        // Parsear lista de dispositivos
        availableDevices = this.parseDeviceList(devicesText);

        // Seleccionar dispositivo (primero disponible o el especificado)
        if (options.deviceId) {
          selectedDevice = availableDevices.find(d => d.id === options.deviceId);
        } else if (availableDevices.length > 0) {
          selectedDevice = availableDevices[0];
        }

        if (selectedDevice) {
          console.log(`📱 Dispositivo seleccionado: ${selectedDevice.name} (${selectedDevice.id})`);
        } else {
          console.warn('⚠️  No se encontró ningún dispositivo móvil disponible');
        }
      }
    } catch (error) {
      console.error('⚠️  Error listando dispositivos:', error.message);
    }

    return {
      client: mcpClient,
      transport,
      platform: 'mobile',
      deviceId: selectedDevice?.id || null,
      deviceName: selectedDevice?.name || null,
      availableDevices,
      capabilities: {
        navigate: true,          // mobile_open_url
        screenshot: true,        // mobile_take_screenshot
        click: true,             // mobile_click_on_screen_at_coordinates
        tap: true,               // mobile_click_on_screen_at_coordinates
        doubleTap: true,         // mobile_double_tap_on_screen
        longPress: true,         // mobile_long_press_on_screen_at_coordinates
        swipe: true,             // mobile_swipe_on_screen
        fill: true,              // mobile_click + mobile_type_keys
        type: true,              // mobile_type_keys
        snapshot: true,          // mobile_list_elements_on_screen
        listElements: true,      // mobile_list_elements_on_screen
        appManagement: true,     // launch_app, terminate_app, etc.
        pressButton: true,       // mobile_press_button (BACK, HOME, etc.)
        orientation: true,       // mobile_set_orientation, mobile_get_orientation
        evaluate: false,         // No disponible en mobile
        cookies: false,          // No disponible en mobile
        network: false,          // No disponible directamente
        performance: false       // No disponible directamente
      }
    };
  }

  /**
   * Parsea la lista de dispositivos del output de mobile-mcp
   */
  static parseDeviceList(devicesText) {
    const devices = [];
    const lines = devicesText.split('\n');

    for (const line of lines) {
      // Formato esperado: "emulator-5554  device  Pixel_6a_2"
      const match = line.match(/^([\w-]+)\s+(device|offline)\s*(.*)$/);
      if (match) {
        devices.push({
          id: match[1].trim(),
          status: match[2].trim(),
          name: match[3].trim() || match[1].trim()
        });
      }
    }

    return devices;
  }

  /**
   * Cierra un cliente MCP
   */
  static async closeClient(clientWrapper) {
    try {
      if (clientWrapper.client) {
        await clientWrapper.client.close();
      }
      if (clientWrapper.transport) {
        await clientWrapper.transport.close();
      }
      console.log(`✅ Cliente MCP ${clientWrapper.platform} cerrado`);
    } catch (error) {
      console.warn(`⚠️  Error cerrando cliente ${clientWrapper.platform}:`, error.message);
    }
  }

  /**
   * Verifica si una capacidad está disponible para la plataforma
   */
  static hasCapability(clientWrapper, capability) {
    return clientWrapper.capabilities && clientWrapper.capabilities[capability] === true;
  }

  /**
   * Obtiene información del cliente
   */
  static getClientInfo(clientWrapper) {
    return {
      platform: clientWrapper.platform,
      capabilities: Object.keys(clientWrapper.capabilities || {}).filter(
        key => clientWrapper.capabilities[key] === true
      ),
      pageIndex: clientWrapper.pageIndex || null,
      deviceId: clientWrapper.deviceId || null,
      deviceName: clientWrapper.deviceName || null,
      availableDevices: clientWrapper.availableDevices || []
    };
  }
}

module.exports = { MCPClientFactory };
