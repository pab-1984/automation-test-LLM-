// runners/core/test-executor.js
const fs = require('fs');
const yaml = require('js-yaml');
const { sleep } = require('../utils/helpers.js');
const { getDatabase } = require('../../database/db');

class TestExecutor {
  async runSuite(suiteFile, options = {}) {
    console.log(`📋 Cargando suite: ${suiteFile}
`);

    // Verificar si existe test compilado y debemos usarlo
    const forceRecompile = options.recompile || false;
    let suite;
    let usingCompiledVersion = false;

    if (!forceRecompile && this.llmProcessor.hasCompiledVersion(suiteFile)) {
      console.log('🔍 Test compilado encontrado...');
      const compiled = this.llmProcessor.loadCompiledTest(suiteFile);

      if (compiled) {
        suite = compiled;
        usingCompiledVersion = true;
        console.log('⚡ Usando test compilado (ejecución rápida sin LLM)\n');
      }
    }

    // Si no hay compilado o se forzó recompilación, cargar original
    if (!suite) {
      const suiteContent = fs.readFileSync(suiteFile, 'utf8');
      suite = yaml.load(suiteContent);

      if (forceRecompile) {
        console.log('🔄 Forzando recompilación del test...\n');
      }
    }

    this.results.suite = suite.suite;
    this.results.startTime = new Date();
    this.originalSuiteFile = suiteFile;
    this.usingCompiledVersion = usingCompiledVersion;

    this.executionMode = suite.executionMode || suite.mode || 'direct';

    // Inicializar propiedades para captura de logs
    this.consoleLogs = [];
    this.networkRequests = [];
    this.performanceData = {};

    // Crear ejecución en base de datos
    this.executionId = null;
    try {
      const db = getDatabase();

      // Buscar o crear el test en la base de datos
      // Usamos la suite por defecto (id=1) y creamos un test temporal
      const path = require('path');
      const testName = `${suite.suite} - ${path.basename(suiteFile)}`;

      // Buscar test existente por file_path
      const existingTests = db.getAllTests();
      let testRecord = existingTests.find(t => t.file_path === suiteFile);

      // Si no existe, crear uno nuevo en la suite por defecto
      if (!testRecord) {
        testRecord = db.createTest(
          1, // suite_id por defecto
          testName,
          'yaml',
          suiteFile,
          suite.description || '',
          suite.baseUrl || ''
        );
        console.log(`💾 Test registrado en DB (id: ${testRecord.id})`);
      }

      // Crear registro de ejecución
      const execution = db.createExecution(testRecord.id, this.executionMode);
      this.executionId = execution.id;
      console.log(`💾 Ejecución creada en DB (execution_id: ${this.executionId})`);

      // Pasar executionId, deviceId y platform al config para que las actions puedan usarlos
      if (!this.config) this.config = {};
      this.config.executionId = this.executionId;
      this.config.deviceId = this.deviceId;
      this.config.platform = this.platform;

    } catch (err) {
      console.warn('⚠️  No se pudo crear ejecución en DB:', err.message);
      console.warn('    Continuando sin registro en DB...');
    }

    console.log(`📝 Suite: ${suite.suite}`);
    console.log(`📖 Descripcion: ${suite.description}`);
    console.log(`🌐 Base URL: ${suite.baseUrl}`);
    console.log(`⚙️  Modo de ejecucion: ${this.executionMode}`);
    if (usingCompiledVersion) {
      console.log(`🔨 Test compilado: Sí (compilado el ${suite.compiledAt})`);
    }
    console.log('='.repeat(60));

    const systemPrompt = fs.readFileSync('./prompts/system.md', 'utf8');
    
    if (suite.setup) {
      console.log('\n⚙️  Ejecutando SETUP...');
      for (const step of suite.setup) {
        await this.executeStepDirect(step, suite);
      }
    }

    for (const test of suite.tests) {
      await this.executeTest(test, suite, systemPrompt);
    }

    if (suite.teardown) {
      console.log('\n🧹 Ejecutando TEARDOWN...');
      for (const step of suite.teardown) {
        await this.executeStepDirect(step, suite);
      }
    }

    this.results.endTime = new Date();
    await this.reportGenerator.generateReport(this, this.executionId);

    // Si se ejecutó con LLM y no se usó test compilado, compilar ahora
    if (!this.usingCompiledVersion && this.executionMode === 'llm') {
      await this.compileAndSaveTest(this.originalSuiteFile, suite);
    }

    return this.results;
  }

  /**
   * Compila un test después de ejecutarlo con LLM
   * Mapea los pasos con UIDs del DOM y guarda el test compilado
   */
  async compileAndSaveTest(suiteFile, originalSuite) {
    console.log('\n🔨 Compilando test para futuras ejecuciones...');

    try {
      // 1. Obtener snapshot del DOM actual
      console.log('  📸 Capturando snapshot del DOM...');
      const snapshot = await this.mcpClient.callTool({
        name: 'take_snapshot',
        arguments: {}
      });
      const snapshotText = snapshot.content[0]?.text || '';

      if (!snapshotText) {
        console.warn('  ⚠️  No se pudo obtener snapshot, compilación cancelada');
        return;
      }

      console.log(`  📄 Snapshot obtenido (${snapshotText.length} caracteres)`);

      // 2. Compilar test usando LLMProcessor
      console.log('  🔨 Mapeando pasos con elementos del DOM...');
      const compiledSuite = await this.llmProcessor.compileTest(
        originalSuite,
        snapshotText,
        this.llmAdapter,
        this.elementFinder
      );

      // 3. Guardar test compilado
      const savedPath = this.llmProcessor.saveCompiledTest(suiteFile, compiledSuite);
      console.log(`  ✅ Test compilado guardado: ${savedPath}`);
      console.log('  ⚡ Próxima ejecución será 10x más rápida!');

    } catch (error) {
      console.error(`  ❌ Error compilando test: ${error.message}`);
      console.error(`  ℹ️  El test seguirá funcionando, pero sin optimización`);
    }
  }

  async executeTest(test, suite, systemPrompt) {
    console.log('\n' + '='.repeat(60));
    console.log(`🧪 Test: ${test.name}`);
    console.log(`📌 Objetivo: ${test.expectedResult}`);

    const testMode = test.mode || this.executionMode || 'direct';
    console.log(`⚙️  Modo: ${testMode}`);
    console.log('='.repeat(60));

    const startTime = Date.now();
    const testResult = {
      name: test.name,
      status: 'RUNNING',
      expectedResult: test.expectedResult,
      mode: testMode,
      steps: [],
      error: null,
      errorDetails: null,  // Nueva propiedad para detalles del error
      failedStep: null,     // Nueva propiedad para el paso que falló
      screenshot: null,
      duration: 0,
      logs: []
    };

    try {
      for (let i = 0; i < test.steps.length; i++) {
        const step = test.steps[i];
        console.log(`\n[${i + 1}/${test.steps.length}] ${step.action}`);
        if (step.description) {
          console.log(`   💬 ${step.description}`);
        }

        const stepMode = step.mode || testMode;
        let stepResult;

        try {
          if (stepMode === 'llm') {
            console.log(`   🤖 Usando LLM para interpretar...`);
            stepResult = await this.executeStepWithLLM(step, suite, systemPrompt);
          } else {
            stepResult = await this.executeStepDirect(step, suite);
          }

          testResult.steps.push(stepResult);

          if (!stepResult.success) {
            // Capturar información detallada del paso que falló
            throw new Error(stepResult.error || 'Paso fallo');
          }
        } catch (stepError) {
          // Enriquecer el error con información del paso
          stepError.stepIndex = i;
          stepError.stepNumber = i + 1;
          stepError.step = step;
          throw stepError;
        }

        await sleep(500);
      }

      testResult.status = 'PASS';
      this.results.passed++;
      console.log(`\n✅ PASS (${Date.now() - startTime}ms)`);

    } catch (error) {
      testResult.status = 'FAIL';
      testResult.error = error.message;

      // Capturar información detallada del error
      testResult.errorDetails = {
        message: error.message,
        stack: error.stack,
        stepNumber: error.stepNumber || 'desconocido',
        stepIndex: error.stepIndex !== undefined ? error.stepIndex : -1,
        action: error.step ? error.step.action : 'desconocida',
        stepDescription: error.step ? error.step.description : null,
        stepParams: error.step ? { ...error.step, action: undefined } : null
      };

      testResult.failedStep = error.step || null;

      this.results.failed++;
      console.log(`\n❌ FAIL (${Date.now() - startTime}ms)`);
      console.log(`   Error en paso ${testResult.errorDetails.stepNumber}/${test.steps.length}`);
      console.log(`   Acción: ${testResult.errorDetails.action}`);
      console.log(`   Error: ${error.message}`);

      const screenshotName = `error-${Date.now()}.png`;
      testResult.screenshot = `./tests/screenshots/${screenshotName}`;

      try {
        // Capturar screenshot según la plataforma
        if (this.platform === 'mobile') {
          await this.mobileActions.executeActionMCP('screenshot', { filePath: testResult.screenshot }, suite, this.mcpClient, null, this.config);
        } else {
          await this.browserActions.executeActionMCP('screenshot', { filePath: testResult.screenshot, fullPage: true }, suite, this.mcpClient, this.elementFinder, this.config);
        }
        console.log(`   📸 Screenshot: ${testResult.screenshot}`);

        // Guardar screenshot en DB si tenemos executionId
        if (this.executionId) {
          try {
            const db = require('../../database/db').getDatabase();
            db.createEvidence(this.executionId, 'screenshot', testResult.screenshot, {
              type: 'error',
              stepNumber: testResult.errorDetails.stepNumber,
              action: testResult.errorDetails.action,
              error: error.message
            });
          } catch (dbErr) {
            console.log(`   ⚠️  No se pudo registrar screenshot en DB: ${dbErr.message}`);
          }
        }
      } catch (e) {
        console.log(`   ⚠️  No se pudo capturar screenshot: ${e.message}`);
      }
    } finally {
        testResult.duration = Date.now() - startTime;
        this.results.tests.push(testResult);
    }
  }

  async executeStepWithLLM(step, suite, systemPrompt) {
    let currentUrl = 'unknown';
    try {
      const pagesResult = await this.mcpClient.callTool({ name: 'list_pages', arguments: {} });
      const pagesText = pagesResult.content[0]?.text || '';
      
      const selectedPageLine = pagesText.split('\n').find(line => line.includes('[selected]'));
      const urlMatch = selectedPageLine ? selectedPageLine.match(/^\d+:\s*(.*?)\s*\[selected\]/) : null;
      currentUrl = urlMatch ? urlMatch[1] : 'unknown';
      
    } catch (e) {
      console.log(`   ⚠️  No se pudo obtener URL actual`);
    }

    // Reemplazar variables en el paso ANTES de enviarlo al LLM
    const stepWithReplacedVars = this.variableReplacer.replaceVariablesInParams(step, suite);

    const context = { currentUrl, step: stepWithReplacedVars, baseUrl: suite.baseUrl, variables: suite.variables || {} };
    const stepPrompt = this.buildStepPrompt(stepWithReplacedVars, context, systemPrompt);
    
    let llmResponse;
    try {
      llmResponse = await this.llmAdapter.processStep(stepPrompt, context);
    } catch (error) {
      console.log(`   ⚠️  LLM fallo, ejecutando directo: ${error.message}`);
      return await this.executeStepDirect(step, suite);
    }

    return await this.browserActions.executeActionMCP(llmResponse.action, llmResponse.params, suite, this.mcpClient, this.elementFinder, this.config);
  }

  async executeStepDirect(step, suite) {
    const action = step.action;
    const params = { ...step };
    delete params.action;

    const replacedParams = this.variableReplacer.replaceVariablesInParams(params, suite);

    // Detectar si es acción API
    if (action.startsWith('api.')) {
      // Inicializar API client si no existe
      if (!this.apiClient) {
        const { APIClient } = require('./api-client.js');
        this.apiClient = new APIClient({
          baseURL: suite.baseUrl || '',
          timeout: suite.timeout || 30000,
          retry: {
            enabled: suite.retry?.enabled || false,
            maxRetries: suite.retry?.maxRetries || 3
          },
          rateLimit: {
            enabled: suite.rateLimit?.enabled || false,
            requestsPerSecond: suite.rateLimit?.requestsPerSecond || 10
          }
        });
        console.log('\n🌐 API Client inicializado');
      }

      return await this.apiActions.execute(action, replacedParams, {
        apiClient: this.apiClient,
        config: this.config
      });
    }

    // Intentar ejecutar directamente
    try {
      // Delegar a las acciones correctas según la plataforma
      if (this.platform === 'mobile') {
        return await this.mobileActions.executeActionMCP(
          action,
          replacedParams,
          suite,
          this.mcpClient,
          this.elementFinder,
          this.config
        );
      } else {
        // web (default)
        return await this.browserActions.executeActionMCP(
          action,
          replacedParams,
          suite,
          this.mcpClient,
          this.elementFinder,
          this.config
        );
      }
    } catch (error) {
      // AUTO-CORRECCIÓN: Si falla por selector no encontrado, usar LLM
      const isElementNotFound = error.message && (
        error.message.includes('not found') ||
        error.message.includes('no se encontró') ||
        error.message.includes('could not find') ||
        error.message.includes('Element not visible') ||
        error.message.includes('timeout')
      );

      const hasSelector = replacedParams.selector || replacedParams.uid || replacedParams.text;
      const canAutoCorrect = isElementNotFound && hasSelector && this.llmAdapter;

      if (canAutoCorrect) {
        console.log(`   ⚠️  Selector falló: ${error.message}`);
        console.log(`   🤖 Auto-corrección: Usando LLM para encontrar elemento...`);

        try {
          const correctedResult = await this.autoCorrectWithLLM(action, replacedParams, suite, error);

          if (correctedResult.success) {
            console.log(`   ✅ Auto-corrección exitosa!`);
            return correctedResult;
          }
        } catch (llmError) {
          console.log(`   ❌ Auto-corrección falló: ${llmError.message}`);
        }
      }

      // Si no se puede auto-corregir o falló, lanzar error original
      throw error;
    }
  }

  /**
   * Auto-corrección con LLM cuando un selector falla
   * @param {string} action - Acción que falló
   * @param {Object} params - Parámetros del paso
   * @param {Object} suite - Suite del test
   * @param {Error} originalError - Error original
   * @returns {Object} - Resultado del paso corregido
   */
  async autoCorrectWithLLM(action, params, suite, originalError) {
    // Obtener snapshot del DOM actual
    const snapshot = await this.mcpClient.callTool({
      name: 'take_snapshot',
      arguments: {}
    });
    const snapshotText = snapshot.content[0]?.text || '';

    if (!snapshotText) {
      throw new Error('No se pudo obtener snapshot para auto-corrección');
    }

    // Construir prompt para LLM
    const prompt = `El siguiente paso de test falló porque no se encontró el elemento:

**Acción**: ${action}
**Selector original**: ${params.selector || params.uid || params.text}
**Descripción**: ${params.description || 'N/A'}
**Error**: ${originalError.message}

**Snapshot del DOM actual (primeras 100 líneas)**:
${snapshotText.split('\n').slice(0, 100).join('\n')}

Tu tarea: Encuentra el selector correcto (UID, texto o selector CSS) para ejecutar esta acción.

Responde SOLO con JSON:
{
  "selector": "nuevo_selector_o_uid",
  "reasoning": "breve explicación de por qué elegiste este selector"
}`;

    // Llamar al LLM
    const llmResponse = await this.llmAdapter.processStep(prompt, {
      step: { action, ...params },
      snapshot: snapshotText,
      baseUrl: suite.baseUrl
    });

    // Extraer el nuevo selector
    let newSelector;
    let reasoning = 'Auto-corregido por LLM';

    if (llmResponse.selector) {
      newSelector = llmResponse.selector;
      reasoning = llmResponse.reasoning || reasoning;
    } else if (typeof llmResponse === 'string') {
      // Intentar parsear JSON del string
      try {
        const parsed = JSON.parse(llmResponse);
        newSelector = parsed.selector;
        reasoning = parsed.reasoning || reasoning;
      } catch (e) {
        throw new Error('LLM no devolvió formato válido');
      }
    }

    if (!newSelector) {
      throw new Error('LLM no pudo encontrar selector alternativo');
    }

    console.log(`   🔍 LLM sugiere: "${newSelector}"`);
    console.log(`   💭 Razonamiento: ${reasoning}`);

    // Intentar ejecutar con el nuevo selector
    const correctedParams = {
      ...params,
      selector: newSelector,
      uid: newSelector.startsWith('uid_') ? newSelector : undefined,
      originalSelector: params.selector || params.uid, // Guardar el original
      autoCorrect: true,
      autoCorrectReasoning: reasoning
    };

    // Ejecutar con el selector corregido
    if (this.platform === 'mobile') {
      return await this.mobileActions.executeActionMCP(
        action,
        correctedParams,
        suite,
        this.mcpClient,
        this.elementFinder,
        this.config
      );
    } else {
      return await this.browserActions.executeActionMCP(
        action,
        correctedParams,
        suite,
        this.mcpClient,
        this.elementFinder,
        this.config
      );
    }
  }

  buildStepPrompt(step, context, systemPrompt) {
    const yamlBlock = '```yaml\n' + yaml.dump(step) + '\n```';
    const jsonBlock = '```json\n' + JSON.stringify(context.variables, null, 2) + '\n```';

    return systemPrompt +
      '\n\n## Contexto Actual\n' +
      `- URL actual: ${context.currentUrl}\n` +
      `- Base URL: ${context.baseUrl}\n\n` +
      '## Paso a Ejecutar\n' +
      yamlBlock +
      '\n\n## Variables Disponibles\n' +
      jsonBlock +
      '\n\n## Instruccion\n' +
      'Analiza el paso YAML y decide que accion ejecutar. Responde SOLO con JSON:\n' +
      '{\n' +
      '  "action": "nombre_accion",\n' +
      '  "params": { "clave": "valor" },\n' +
      '  "reasoning": "explicacion breve"\n' +
      '}';
  }
}

module.exports = { TestExecutor };
