// runners/core/yaml-generator.js
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * YAMLGenerator: Convierte pasos ejecutados por LLM a test YAML estructurado
 *
 * Flujo:
 * 1. Test natural ejecutado con LLM → captura pasos (MCP tool calls)
 * 2. Convertir tool calls MCP a acciones YAML estructuradas
 * 3. Guardar YAML para futuras ejecuciones (más rápido, sin LLM)
 */
class YAMLGenerator {
  constructor() {
    this.generatedDir = './tests/generated';
    this.ensureGeneratedDirectory();
  }

  /**
   * Asegura que el directorio de tests generados existe
   */
  ensureGeneratedDirectory() {
    if (!fs.existsSync(this.generatedDir)) {
      fs.mkdirSync(this.generatedDir, { recursive: true });
      console.log(`✓ Directorio creado: ${this.generatedDir}`);
    }
  }

  /**
   * Genera un test YAML estructurado desde pasos ejecutados
   *
   * @param {Array} executedSteps - Pasos ejecutados capturados del LLM
   * @param {Object} metadata - Metadata del test (nombre, URL, descripción, etc.)
   * @returns {Object} - Test en formato YAML
   */
  generateYAMLFromSteps(executedSteps, metadata) {
    console.log('\n🔨 Generando YAML desde pasos ejecutados...');

    const steps = [];
    let hasNavigate = false;

    for (const executedStep of executedSteps) {
      const yamlStep = this.convertMCPToolToYAMLAction(executedStep);

      if (yamlStep) {
        // Asegurar que el primer paso sea navigate si no lo es
        if (!hasNavigate && yamlStep.action !== 'navigate') {
          steps.push({
            action: 'navigate',
            url: metadata.baseUrl || '${baseUrl}',
            description: 'Navegar a la aplicación'
          });
          hasNavigate = true;
        }

        if (yamlStep.action === 'navigate') {
          hasNavigate = true;
        }

        steps.push(yamlStep);
      }
    }

    // Si no hay steps, crear uno básico
    if (steps.length === 0) {
      steps.push({
        action: 'navigate',
        url: metadata.baseUrl || '${baseUrl}',
        description: 'Navegar a la aplicación'
      });
    }

    const yamlTest = {
      suite: metadata.name || 'Test Generado',
      description: metadata.description || 'Test generado automáticamente desde lenguaje natural',
      baseUrl: metadata.baseUrl || 'https://ejemplo.com',
      platform: metadata.platform || 'web',
      mode: 'direct', // Los tests generados siempre son directos
      timeout: 30000,

      tests: [
        {
          name: `${metadata.name} - Automatizado`,
          description: 'Test generado automáticamente desde ejecución con LLM',
          steps: steps,
          expectedResult: 'Test debe completarse exitosamente'
        }
      ]
    };

    console.log(`✓ YAML generado con ${steps.length} pasos`);
    return yamlTest;
  }

  /**
   * Convierte un tool call MCP a una acción YAML
   *
   * @param {Object} executedStep - Paso ejecutado con tool call MCP
   * @returns {Object|null} - Acción YAML o null si no es convertible
   */
  convertMCPToolToYAMLAction(executedStep) {
    const { action, arguments: args } = executedStep;

    // Mapeo de acciones MCP a acciones YAML
    const actionMap = {
      // Navegación
      navigate_page: () => ({
        action: 'navigate',
        url: args.url || args.href || '/',
        description: `Navegar a ${args.url || args.href || '/'}`
      }),

      // Click
      click: () => ({
        action: 'click',
        selector: args.selector || args.uid || args.text,
        uid: args.uid || undefined,
        text: args.text || undefined,
        description: args.description || `Click en ${args.selector || args.text || 'elemento'}`
      }),

      // Fill / Input
      fill: () => ({
        action: 'fill',
        selector: args.selector || args.uid,
        uid: args.uid || undefined,
        value: args.value || args.text || '',
        description: args.description || `Llenar campo con "${args.value || args.text}"`
      }),

      fill_form: () => ({
        action: 'fillForm',
        fields: args.fields || {},
        description: args.description || 'Llenar formulario'
      }),

      // Verificación
      check_element_exists: () => ({
        action: 'verify',
        selector: args.selector || args.uid,
        uid: args.uid || undefined,
        description: args.description || `Verificar que existe ${args.selector || 'elemento'}`
      }),

      // Wait
      wait: () => ({
        action: 'wait',
        time: args.time || args.ms || 1000,
        description: args.description || `Esperar ${args.time || args.ms || 1000}ms`
      }),

      // Screenshot
      take_screenshot: () => ({
        action: 'screenshot',
        filename: args.filename || `screenshot-${Date.now()}`,
        fullPage: args.fullPage !== false,
        description: args.description || 'Capturar screenshot'
      }),

      // Acciones móviles
      tap: () => ({
        action: 'tap',
        text: args.text || args.selector,
        description: args.description || `Tap en ${args.text || args.selector}`
      }),

      swipe: () => ({
        action: 'swipe',
        direction: args.direction || 'up',
        description: args.description || `Swipe ${args.direction || 'up'}`
      }),

      // API
      fetch: () => {
        if (args.method) {
          return {
            action: `api.${args.method.toLowerCase()}`,
            url: args.url,
            headers: args.headers || undefined,
            body: args.body || undefined,
            description: args.description || `${args.method} request a ${args.url}`
          };
        }
        return null;
      }
    };

    // Buscar el convertidor apropiado
    const converter = actionMap[action];
    if (converter) {
      try {
        return converter();
      } catch (error) {
        console.warn(`⚠️  No se pudo convertir acción "${action}":`, error.message);
        return null;
      }
    }

    // Si no hay mapeo directo, intentar detectar por nombre
    if (action.startsWith('api_') || action.includes('fetch')) {
      // Acciones API genéricas
      return {
        action: 'api.request',
        method: args.method || 'GET',
        url: args.url || args.endpoint || '/',
        description: `Request API: ${args.method || 'GET'} ${args.url || args.endpoint}`
      };
    }

    // Acción no reconocida - ignorar
    console.log(`   ℹ️  Acción "${action}" no convertida a YAML (no crítica)`);
    return null;
  }

  /**
   * Guarda un test YAML generado en disco
   *
   * @param {string} originalTestName - Nombre del test original
   * @param {Object} yamlTest - Test en formato YAML
   * @returns {string} - Ruta del archivo guardado
   */
  saveGeneratedYAML(originalTestName, yamlTest) {
    try {
      // Generar nombre del archivo
      const sanitized = originalTestName
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      const filename = `${sanitized}-auto.yml`;
      const filePath = path.join(this.generatedDir, filename);

      // Convertir a YAML
      const yamlContent = yaml.dump(yamlTest, {
        indent: 2,
        lineWidth: 120,
        noRefs: true
      });

      // Guardar archivo
      fs.writeFileSync(filePath, yamlContent, 'utf8');
      console.log(`✓ YAML guardado: ${filePath}`);

      return filePath;
    } catch (error) {
      console.error(`❌ Error guardando YAML generado: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verifica si existe un YAML generado para un test natural
   *
   * @param {string} naturalTestName - Nombre del test natural
   * @returns {string|null} - Ruta del YAML generado o null
   */
  getGeneratedYAMLPath(naturalTestName) {
    const sanitized = naturalTestName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const filename = `${sanitized}-auto.yml`;
    const filePath = path.join(this.generatedDir, filename);

    return fs.existsSync(filePath) ? filePath : null;
  }

  /**
   * Elimina el YAML generado para un test (útil para regenerar)
   *
   * @param {string} naturalTestName - Nombre del test natural
   */
  deleteGeneratedYAML(naturalTestName) {
    const filePath = this.getGeneratedYAMLPath(naturalTestName);

    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✓ YAML generado eliminado: ${filePath}`);
      return true;
    }

    return false;
  }
}

module.exports = { YAMLGenerator };
