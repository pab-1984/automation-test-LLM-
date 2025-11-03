// runners/actions/mobile-actions.js

/**
 * Acciones específicas para testing móvil usando mobile-mcp
 * Implementa las 19 herramientas MCP disponibles para Android/iOS
 */

class MobileActions {
  /**
   * Ejecuta una acción móvil usando mobile-mcp
   *
   * @param {string} action - Nombre de la acción
   * @param {object} params - Parámetros de la acción
   * @param {object} suite - Suite de tests (para variables)
   * @param {object} mcpClient - Cliente MCP móvil
   * @param {object} elementFinder - Buscador de elementos (para coordenadas)
   * @param {object} config - Configuración (incluye executionId)
   * @returns {Promise<object>} Resultado de la acción
   */
  async executeActionMCP(action, params, suite, mcpClient, elementFinder, config) {
    const result = {
      action,
      success: false,
      output: null,
      error: null
    };

    try {
      switch (action) {
        // ==========================================
        // NAVEGACIÓN Y APPS
        // ==========================================

        case 'navigate':
        case 'openUrl':
          console.log(` 🌐 Navegando a: ${params.url}`);
          await mcpClient.callTool({
            name: 'mobile_open_url',
            arguments: { url: params.url }
          });
          result.success = true;
          break;

        case 'launchApp':
          console.log(` 🚀 Lanzando app: ${params.packageName || params.bundleId}`);
          await mcpClient.callTool({
            name: 'mobile_launch_app',
            arguments: {
              packageName: params.packageName,
              bundleId: params.bundleId,
              activity: params.activity
            }
          });
          result.success = true;
          break;

        case 'terminateApp':
          console.log(` 🛑 Cerrando app: ${params.packageName || params.bundleId}`);
          await mcpClient.callTool({
            name: 'mobile_terminate_app',
            arguments: {
              packageName: params.packageName,
              bundleId: params.bundleId
            }
          });
          result.success = true;
          break;

        case 'listApps':
          console.log(` 📱 Listando apps instaladas...`);
          const appsResult = await mcpClient.callTool({
            name: 'mobile_list_apps',
            arguments: {}
          });
          result.output = appsResult.content[0]?.text || '';
          result.success = true;
          console.log(` ✓ Apps encontradas`);
          break;

        // ==========================================
        // INTERACCIÓN CON ELEMENTOS
        // ==========================================

        case 'click':
        case 'tap':
          const clickCoords = await this.resolveCoordinates(params, mcpClient, elementFinder);
          console.log(` 👆 Click en (${clickCoords.x}, ${clickCoords.y})`);

          await mcpClient.callTool({
            name: 'mobile_click_on_screen_at_coordinates',
            arguments: {
              x: clickCoords.x,
              y: clickCoords.y
            }
          });
          result.success = true;
          break;

        case 'doubleTap':
          const doubleTapCoords = await this.resolveCoordinates(params, mcpClient, elementFinder);
          console.log(` 👆👆 Doble tap en (${doubleTapCoords.x}, ${doubleTapCoords.y})`);

          await mcpClient.callTool({
            name: 'mobile_double_tap_on_screen',
            arguments: {
              x: doubleTapCoords.x,
              y: doubleTapCoords.y
            }
          });
          result.success = true;
          break;

        case 'longPress':
          const longPressCoords = await this.resolveCoordinates(params, mcpClient, elementFinder);
          const duration = params.duration || 1000;
          console.log(` 👆⏱️  Long press en (${longPressCoords.x}, ${longPressCoords.y}) por ${duration}ms`);

          await mcpClient.callTool({
            name: 'mobile_long_press_on_screen_at_coordinates',
            arguments: {
              x: longPressCoords.x,
              y: longPressCoords.y,
              duration
            }
          });
          result.success = true;
          break;

        case 'swipe':
          const fromCoords = params.fromX && params.fromY
            ? { x: params.fromX, y: params.fromY }
            : await this.resolveCoordinates({ selector: params.from }, mcpClient, elementFinder);

          const toCoords = params.toX && params.toY
            ? { x: params.toX, y: params.toY }
            : await this.resolveCoordinates({ selector: params.to }, mcpClient, elementFinder);

          console.log(` 👉 Swipe de (${fromCoords.x}, ${fromCoords.y}) a (${toCoords.x}, ${toCoords.y})`);

          await mcpClient.callTool({
            name: 'mobile_swipe_on_screen',
            arguments: {
              fromX: fromCoords.x,
              fromY: fromCoords.y,
              toX: toCoords.x,
              toY: toCoords.y,
              duration: params.duration || 500
            }
          });
          result.success = true;
          break;

        // ==========================================
        // INPUT DE TEXTO
        // ==========================================

        case 'fill':
        case 'type':
          console.log(` ⌨️  Escribiendo texto: "${params.value}"`);

          // Si hay selector, hacer click primero
          if (params.selector || (params.x && params.y)) {
            const typeCoords = await this.resolveCoordinates(params, mcpClient, elementFinder);
            await mcpClient.callTool({
              name: 'mobile_click_on_screen_at_coordinates',
              arguments: { x: typeCoords.x, y: typeCoords.y }
            });
            await this.sleep(300); // Esperar a que se active el teclado
          }

          await mcpClient.callTool({
            name: 'mobile_type_keys',
            arguments: { keys: params.value }
          });
          result.success = true;
          break;

        // ==========================================
        // SNAPSHOTS Y ELEMENTOS
        // ==========================================

        case 'take_snapshot':
        case 'listElements':
          console.log(` 📸 Capturando lista de elementos...`);
          const elementsResult = await mcpClient.callTool({
            name: 'mobile_list_elements_on_screen',
            arguments: {}
          });

          const elementsText = elementsResult.content[0]?.text || '';
          result.output = this.parseElementsList(elementsText);
          result.success = true;
          console.log(` ✓ ${result.output.length} elementos encontrados`);
          break;

        // ==========================================
        // SCREENSHOTS
        // ==========================================

        case 'screenshot':
          const screenshotPath = params.filePath || `./tests/screenshots/mobile-${Date.now()}.png`;
          console.log(` 📷 Capturando screenshot...`);

          await mcpClient.callTool({
            name: 'mobile_save_screenshot',
            arguments: { filePath: screenshotPath }
          });

          result.output = screenshotPath;
          result.success = true;
          console.log(` ✓ Screenshot: ${screenshotPath}`);

          // Registrar evidencia en DB si está disponible
          if (config && config.executionId) {
            try {
              const { getDatabase } = require('../../database/db');
              const db = getDatabase();
              const fs = require('fs');

              let fileSize = 0;
              try {
                const stats = fs.statSync(screenshotPath);
                fileSize = stats.size;
              } catch (e) {
                // Ignorar
              }

              db.createEvidence(config.executionId, 'screenshot', screenshotPath, {
                platform: 'mobile',
                size: fileSize,
                timestamp: new Date().toISOString()
              });
            } catch (err) {
              console.log(`   ⚠️  No se pudo registrar evidencia en DB: ${err.message}`);
            }
          }
          break;

        // ==========================================
        // BOTONES FÍSICOS
        // ==========================================

        case 'pressBack':
          console.log(` ⬅️  Presionando BACK`);
          await mcpClient.callTool({
            name: 'mobile_press_button',
            arguments: { button: 'BACK' }
          });
          result.success = true;
          break;

        case 'pressHome':
          console.log(` 🏠 Presionando HOME`);
          await mcpClient.callTool({
            name: 'mobile_press_button',
            arguments: { button: 'HOME' }
          });
          result.success = true;
          break;

        case 'pressButton':
          const button = params.button.toUpperCase();
          console.log(` 🔘 Presionando ${button}`);
          await mcpClient.callTool({
            name: 'mobile_press_button',
            arguments: { button }
          });
          result.success = true;
          break;

        // ==========================================
        // ORIENTACIÓN
        // ==========================================

        case 'setOrientation':
          const orientation = params.orientation.toUpperCase();
          console.log(` 🔄 Cambiando orientación a ${orientation}`);
          await mcpClient.callTool({
            name: 'mobile_set_orientation',
            arguments: { orientation }
          });
          result.success = true;
          break;

        case 'getOrientation':
          console.log(` 🔄 Obteniendo orientación...`);
          const orientationResult = await mcpClient.callTool({
            name: 'mobile_get_orientation',
            arguments: {}
          });
          result.output = orientationResult.content[0]?.text || '';
          result.success = true;
          console.log(` ✓ Orientación: ${result.output}`);
          break;

        // ==========================================
        // INFORMACIÓN
        // ==========================================

        case 'getScreenSize':
          console.log(` 📐 Obteniendo tamaño de pantalla...`);
          const sizeResult = await mcpClient.callTool({
            name: 'mobile_get_screen_size',
            arguments: {}
          });
          result.output = sizeResult.content[0]?.text || '';
          result.success = true;
          console.log(` ✓ Tamaño: ${result.output}`);
          break;

        // ==========================================
        // WAIT
        // ==========================================

        case 'wait':
          const waitTime = params.time || params.ms || 1000;
          console.log(` ⏳ Esperando ${waitTime}ms...`);
          await this.sleep(waitTime);
          result.success = true;
          break;

        // ==========================================
        // DEFAULT
        // ==========================================

        default:
          throw new Error(`Acción móvil no soportada: ${action}`);
      }

    } catch (error) {
      result.success = false;
      result.error = error.message;
      console.error(` ❌ Error en ${action}:`, error.message);
    }

    return result;
  }

  /**
   * Resuelve coordenadas desde selector o coordenadas directas
   * MEJORADO: Ahora usa cache, fuzzy matching y contexto
   */
  async resolveCoordinates(params, mcpClient, elementFinder, options = {}) {
    // Si ya tiene coordenadas x,y, usarlas directamente
    if (params.x !== undefined && params.y !== undefined) {
      return { x: params.x, y: params.y };
    }

    // Si tiene selector, buscar elemento y obtener coordenadas
    if (params.selector) {
      console.log(`   🔍 Buscando elemento: "${params.selector}"`);

      // Opciones de búsqueda mejorada
      const searchOptions = {
        useCache: params.useCache !== false, // Por defecto usar cache
        context: params.context || options.screenName || '', // Contexto para cache
        fuzzy: params.fuzzy !== false, // Por defecto usar fuzzy matching
        fuzzyThreshold: params.fuzzyThreshold || 0.8,
        ...options
      };

      // Primero intentar desde cache si está habilitado
      if (searchOptions.useCache) {
        const cached = elementFinder.getFromCache(params.selector, searchOptions.context);
        if (cached) {
          // Verificar que las coordenadas cached aún son válidas
          const elementsResult = await mcpClient.callTool({
            name: 'mobile_list_elements_on_screen',
            arguments: {}
          });

          const elementsText = elementsResult.content[0]?.text || '';
          const elements = this.parseElementsList(elementsText);

          // Buscar elementos cercanos a las coordenadas cacheadas
          const nearby = elementFinder.findNearbyElements(cached.x, cached.y, elements, 30);
          if (nearby.length > 0) {
            console.log(`   ✓ Usando coordenadas desde cache`);
            return { x: cached.x, y: cached.y };
          } else {
            console.log(`   ⚠️  Cache inválido, buscando de nuevo...`);
          }
        }
      }

      // Obtener lista de elementos
      const elementsResult = await mcpClient.callTool({
        name: 'mobile_list_elements_on_screen',
        arguments: {}
      });

      const elementsText = elementsResult.content[0]?.text || '';
      const elements = this.parseElementsList(elementsText);

      // Buscar elemento que coincida con el selector (ahora con fuzzy matching)
      const element = elementFinder.findElementMobile(params.selector, elements, searchOptions);

      if (!element) {
        throw new Error(`No se encontró elemento con selector: ${params.selector}`);
      }

      console.log(`   ✓ Elemento encontrado en (${element.x}, ${element.y})`);
      return { x: element.x, y: element.y };
    }

    throw new Error('Se requiere selector o coordenadas (x, y)');
  }

  /**
   * Parsea la lista de elementos de mobile-mcp
   * Formato esperado: líneas con información de elementos y coordenadas
   */
  parseElementsList(elementsText) {
    const elements = [];
    const lines = elementsText.split('\n');

    for (const line of lines) {
      // Parsear líneas que contienen información de elementos
      // El formato depende de mobile-mcp, ajustar según sea necesario
      // Ejemplo: "Button 'Login' at (100, 200) [enabled]"

      // Regex para extraer: tipo, texto, coordenadas, atributos
      const match = line.match(/^(\w+)\s+'([^']+)'\s+at\s+\((\d+),\s*(\d+)\)\s*(\[.*\])?/);

      if (match) {
        elements.push({
          type: match[1],
          text: match[2],
          x: parseInt(match[3]),
          y: parseInt(match[4]),
          attributes: match[5] || '',
          rawLine: line
        });
      } else if (line.trim() && !line.startsWith('//')) {
        // Si no coincide con el formato esperado, guardar como elemento genérico
        elements.push({
          type: 'unknown',
          text: line.trim(),
          x: null,
          y: null,
          attributes: '',
          rawLine: line
        });
      }
    }

    return elements;
  }

  /**
   * Helper para sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { MobileActions };
