// runners/core/test-executor.js
const fs = require('fs');
const yaml = require('js-yaml');
const { sleep } = require('../utils/helpers.js'); // CORREGIDO: Apunta a runner-core para sleep

class TestExecutor {
  async runSuite(suiteFile) {
    console.log(`📋 Cargando suite: ${suiteFile}
`);
    
    const suiteContent = fs.readFileSync(suiteFile, 'utf8');
    const suite = yaml.load(suiteContent);
    
    this.results.suite = suite.suite;
    this.results.startTime = new Date();
    
    this.executionMode = suite.executionMode || 'direct';
    
    console.log(`📝 Suite: ${suite.suite}`);
    console.log(`📖 Descripcion: ${suite.description}`);
    console.log(`🌐 Base URL: ${suite.baseUrl}`);
    console.log(`⚙️  Modo de ejecucion: ${this.executionMode}`);
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
    await this.reportGenerator.generateReport(this);
    
    return this.results;
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

        if (stepMode === 'llm') {
          console.log(`   🤖 Usando LLM para interpretar...`);
          stepResult = await this.executeStepWithLLM(step, suite, systemPrompt);
        } else {
          stepResult = await this.executeStepDirect(step, suite);
        }

        testResult.steps.push(stepResult);
        
        if (!stepResult.success) {
          throw new Error(stepResult.error || 'Paso fallo');
        }
        
        await sleep(500);
      }

      testResult.status = 'PASS';
      this.results.passed++;
      console.log(`\n✅ PASS (${Date.now() - startTime}ms)`);

    } catch (error) {
      testResult.status = 'FAIL';
      testResult.error = error.message;
      this.results.failed++;
      console.log(`\n❌ FAIL (${Date.now() - startTime}ms)`);
      console.log(`   Error: ${error.message}`);
      
      const screenshotName = `error-${Date.now()}.png`;
      testResult.screenshot = `./tests/screenshots/${screenshotName}`;
      
      try {
        await this.browserActions.executeActionMCP('screenshot', { filePath: testResult.screenshot, fullPage: true }, suite, this.mcpClient, this.elementFinder, this.config);
        console.log(`   📸 Screenshot: ${testResult.screenshot}`);
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

    return await this.browserActions.executeActionMCP(action, replacedParams, suite, this.mcpClient, this.elementFinder, this.config);
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
