// runners/llm/llm-processor.js

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * LLMProcessor: Centraliza la lógica de procesamiento con LLM
 *
 * Flujo de Compilación:
 * 1. Primera ejecución (con LLM):
 *    - Interpretar testcase en lenguaje natural
 *    - Obtener snapshot del DOM
 *    - Mapear cada paso con elementos específicos (UIDs)
 *    - Generar testcase compilado con UIDs
 *    - Guardar en tests/compiled/
 *
 * 2. Segunda ejecución (sin LLM - más rápida):
 *    - Cargar testcase compilado
 *    - Ejecutar directamente con MCP (sin interpretación)
 */
class LLMProcessor {
  constructor() {
    this.compiledDir = './tests/compiled';
    this.ensureCompiledDirectory();
  }

  /**
   * Asegura que el directorio de tests compilados existe
   */
  ensureCompiledDirectory() {
    if (!fs.existsSync(this.compiledDir)) {
      fs.mkdirSync(this.compiledDir, { recursive: true });
      console.log(`✓ Directorio creado: ${this.compiledDir}`);
    }
  }

  /**
   * Verifica si existe una versión compilada de un test
   * @param {string} originalSuitePath - Ruta al test original
   * @returns {boolean} - true si existe versión compilada
   */
  hasCompiledVersion(originalSuitePath) {
    const compiledPath = this.getCompiledPath(originalSuitePath);
    return fs.existsSync(compiledPath);
  }

  /**
   * Obtiene la ruta donde se guardará el test compilado
   * @param {string} originalSuitePath - Ruta al test original
   * @returns {string} - Ruta del test compilado
   */
  getCompiledPath(originalSuitePath) {
    const basename = path.basename(originalSuitePath, '.yml');
    return path.join(this.compiledDir, `${basename}-compiled.yml`);
  }

  /**
   * Carga un test compilado
   * @param {string} originalSuitePath - Ruta al test original
   * @returns {Object|null} - Contenido del test compilado o null si no existe
   */
  loadCompiledTest(originalSuitePath) {
    const compiledPath = this.getCompiledPath(originalSuitePath);

    if (!fs.existsSync(compiledPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(compiledPath, 'utf8');
      const compiled = yaml.load(content);
      console.log(`✓ Test compilado cargado: ${compiledPath}`);
      return compiled;
    } catch (error) {
      console.error(`❌ Error cargando test compilado: ${error.message}`);
      return null;
    }
  }

  /**
   * Compila un test: Mapea pasos con elementos del DOM usando LLM
   *
   * @param {Object} originalSuite - Suite original en YAML
   * @param {Object} snapshot - Snapshot del DOM de la aplicación
   * @param {Object} llmAdapter - Adapter del LLM activo
   * @param {Object} elementFinder - Instancia de ElementFinder
   * @returns {Object} - Suite compilada con UIDs mapeados
   */
  async compileTest(originalSuite, snapshot, llmAdapter, elementFinder) {
    console.log('\n🔨 Compilando test con LLM...');

    const compiledSuite = {
      ...originalSuite,
      compiled: true,
      compiledAt: new Date().toISOString(),
      mode: 'direct', // Los tests compilados siempre son directos
      tests: []
    };

    // Procesar cada test
    for (const test of originalSuite.tests) {
      console.log(`  📝 Compilando test: ${test.name}`);

      const compiledTest = {
        ...test,
        mode: 'direct',
        steps: []
      };

      // Procesar cada paso
      for (const step of test.steps) {
        const compiledStep = await this.compileStep(
          step,
          snapshot,
          llmAdapter,
          elementFinder,
          originalSuite
        );
        compiledTest.steps.push(compiledStep);
      }

      compiledSuite.tests.push(compiledTest);
    }

    console.log('✓ Compilación completada');
    return compiledSuite;
  }

  /**
   * Compila un paso individual del test
   *
   * @param {Object} step - Paso original
   * @param {Object} snapshot - Snapshot del DOM
   * @param {Object} llmAdapter - Adapter del LLM
   * @param {Object} elementFinder - ElementFinder
   * @param {Object} suite - Suite completa (para contexto)
   * @returns {Object} - Paso compilado con UID mapeado
   */
  async compileStep(step, snapshot, llmAdapter, elementFinder, suite) {
    const compiledStep = { ...step };

    // Acciones que necesitan mapeo de elementos
    const actionsNeedingMapping = ['click', 'fill', 'fillInput', 'verify'];

    if (actionsNeedingMapping.includes(step.action)) {
      // Si ya tiene un selector claro, intentar mapear directamente
      if (step.selector) {
        const uid = elementFinder.findUidInSnapshot(snapshot, step.selector);

        if (uid) {
          compiledStep.uid = uid;
          compiledStep.originalSelector = step.selector;
          console.log(`    ✓ ${step.action}: "${step.selector}" → UID ${uid}`);
        } else {
          // Si no encuentra, usar LLM para interpretación inteligente
          console.log(`    🤖 LLM necesario para: "${step.selector}"`);
          const llmMapped = await this.mapWithLLM(step, snapshot, llmAdapter, suite);
          if (llmMapped) {
            compiledStep.uid = llmMapped.uid;
            compiledStep.originalSelector = step.selector;
            compiledStep.llmReasoning = llmMapped.reasoning;
          }
        }
      }

      // Si la acción incluye texto (ej: "click en botón con texto 'Add to Cart'")
      if (step.text || step.description?.includes('texto')) {
        console.log(`    🤖 LLM necesario para interpretación de texto`);
        const llmMapped = await this.mapWithLLM(step, snapshot, llmAdapter, suite);
        if (llmMapped) {
          compiledStep.uid = llmMapped.uid;
          compiledStep.llmReasoning = llmMapped.reasoning;
        }
      }
    }

    return compiledStep;
  }

  /**
   * Usa el LLM para mapear un paso con elementos del DOM
   *
   * @param {Object} step - Paso a mapear
   * @param {Object} snapshot - Snapshot del DOM
   * @param {Object} llmAdapter - Adapter del LLM
   * @param {Object} suite - Suite para contexto
   * @returns {Object|null} - {uid, reasoning} o null si falla
   */
  async mapWithLLM(step, snapshot, llmAdapter, suite) {
    const prompt = this.buildMappingPrompt(step, snapshot, suite);

    try {
      const response = await llmAdapter.processStep(prompt, {
        step,
        snapshot,
        baseUrl: suite.baseUrl
      });

      if (response && response.uid) {
        return {
          uid: response.uid,
          reasoning: response.reasoning || 'Mapeado por LLM'
        };
      }
    } catch (error) {
      console.error(`    ❌ Error en mapeo LLM: ${error.message}`);
    }

    return null;
  }

  /**
   * Construye el prompt para el LLM al mapear elementos
   *
   * @param {Object} step - Paso a mapear
   * @param {Object} snapshot - Snapshot del DOM
   * @param {Object} suite - Suite para contexto
   * @returns {string} - Prompt para el LLM
   */
  buildMappingPrompt(step, snapshot, suite) {
    return `Analiza el siguiente paso de test y el snapshot del DOM, y encuentra el UID correcto del elemento.

## Paso del Test:
- Acción: ${step.action}
- Selector: ${step.selector || 'No especificado'}
- Texto: ${step.text || 'No especificado'}
- Descripción: ${step.description || 'No especificado'}

## Contexto:
- Suite: ${suite.suite}
- Base URL: ${suite.baseUrl}

## Snapshot del DOM (primeras 50 líneas):
${snapshot.split('\n').slice(0, 50).join('\n')}

## Tarea:
Encuentra el UID del elemento que mejor corresponda al paso descrito.

## Respuesta (JSON):
{
  "uid": "el_UID_encontrado",
  "reasoning": "breve explicación de por qué elegiste este elemento"
}`;
  }

  /**
   * Guarda un test compilado en disco
   *
   * @param {string} originalSuitePath - Ruta del test original
   * @param {Object} compiledSuite - Suite compilada
   */
  saveCompiledTest(originalSuitePath, compiledSuite) {
    const compiledPath = this.getCompiledPath(originalSuitePath);

    try {
      const yamlContent = yaml.dump(compiledSuite, {
        indent: 2,
        lineWidth: 120,
        noRefs: true
      });

      fs.writeFileSync(compiledPath, yamlContent, 'utf8');
      console.log(`✓ Test compilado guardado: ${compiledPath}`);

      return compiledPath;
    } catch (error) {
      console.error(`❌ Error guardando test compilado: ${error.message}`);
      throw error;
    }
  }

  /**
   * Invalida (elimina) un test compilado
   * Útil cuando el test original cambia
   *
   * @param {string} originalSuitePath - Ruta del test original
   */
  invalidateCompiledTest(originalSuitePath) {
    const compiledPath = this.getCompiledPath(originalSuitePath);

    if (fs.existsSync(compiledPath)) {
      fs.unlinkSync(compiledPath);
      console.log(`✓ Test compilado invalidado: ${compiledPath}`);
    }
  }

  /**
   * Valida la respuesta del LLM
   *
   * @param {Object} response - Respuesta del LLM
   * @returns {boolean} - true si la respuesta es válida
   */
  validateLLMResponse(response) {
    if (!response) {
      return false;
    }

    // Debe tener al menos 'action'
    if (!response.action) {
      console.warn('⚠️  Respuesta LLM sin campo "action"');
      return false;
    }

    // Si tiene params, debe ser un objeto
    if (response.params && typeof response.params !== 'object') {
      console.warn('⚠️  Respuesta LLM con "params" inválido');
      return false;
    }

    return true;
  }

  /**
   * Limpia tests compilados antiguos (más de N días)
   *
   * @param {number} days - Días de antigüedad para limpiar
   */
  cleanOldCompiledTests(days = 7) {
    if (!fs.existsSync(this.compiledDir)) {
      return;
    }

    const now = Date.now();
    const maxAge = days * 24 * 60 * 60 * 1000;
    let cleaned = 0;

    const files = fs.readdirSync(this.compiledDir);

    for (const file of files) {
      const filePath = path.join(this.compiledDir, file);
      const stats = fs.statSync(filePath);

      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`✓ Limpiados ${cleaned} tests compilados antiguos`);
    }
  }
}

module.exports = { LLMProcessor };
