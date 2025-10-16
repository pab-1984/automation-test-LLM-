// runners/core/test-executor.js
const fs = require('fs');
const yaml = require('js-yaml');
const { sleep } = require('./runner-core.js');

class TestExecutor {
  async runSuite(suiteFile) {
    console.log(`📋 Cargando suite: ${suiteFile}
`);
    
    const suiteContent = fs.readFileSync(suiteFile, 'utf8');
    const suite = yaml.load(suiteContent);
    
    this.results.suite = suite.suite;
    this.results.startTime = new Date();
    
    // Modo de ejecución global
    this.executionMode = suite.executionMode || 'direct';
    
    console.log(`📝 Suite: ${suite.suite}`);
    console.log(`📖 Descripción: ${suite.description}`);
    console.log(`🌐 Base URL: ${suite.baseUrl}`);
    console.log(`⚙️  Modo de ejecución: ${this.executionMode}`);
    console.log('='.repeat(60));

    const systemPrompt = fs.readFileSync('./prompts/system.md', 'utf8');
    
    // Setup
    if (suite.setup) {
      console.log('\n⚙️  Ejecutando SETUP...');
      for (const step of suite.setup) {
        await this.executeStepDirect(step, suite);
      }
    }

    // Tests
    for (const test of suite.tests) {
      await this.executeTest(test, suite, systemPrompt);
    }

    // Teardown
    if (suite.teardown) {
      console.log('\n🧹 Ejecutando TEARDOWN...');
      for (const step of suite.teardown) {
        await this.executeStepDirect(step, suite);
      }
    }

    this.results.endTime = new Date();
    await this.generateReport();
    
    return this.results;
  }

  async executeTest(test, suite, systemPrompt) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 Test: ${test.name}`);
    console.log(`📌 Objetivo: ${test.expectedResult}`);
    
    // Determinar modo de ejecución para este test
    const testMode = test.mode || this.executionMode || 'direct';
    console.log(`⚙️  Modo: ${testMode}`);
    console.log(`${ '='.repeat(60)}`);
    
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

        // Determinar modo para este paso específico
        const stepMode = step.mode || testMode;
        let stepResult;

        if (stepMode === 'llm') {
          console.log(`   🤖 Usando LLM para interpretar...`);
          stepResult = await this.executeStepWithLLM(step, suite, systemPrompt);
        } else {
          // Modo 'direct' o 'hybrid' ejecuta directo por defecto
          stepResult = await this.executeStepDirect(step, suite);
        }

        testResult.steps.push(stepResult);
        
        if (!stepResult.success) {
          throw new Error(stepResult.error || 'Paso falló');
        }
        
        await sleep(500);
      }

      testResult.status = 'PASS';
      testResult.duration = Date.now() - startTime;
      this.results.passed++;
      
      console.log(`\n✅ PASS (${testResult.duration}ms)`);

    } catch (error) {
      testResult.status = 'FAIL';
      testResult.error = error.message;
      testResult.duration = Date.now() - startTime;
      this.results.failed++;
      
      console.log(`\n❌ FAIL (${testResult.duration}ms)`);
      console.log(`   Error: ${error.message}`);
      
      // Capturar screenshot
      const screenshotName = `error-${Date.now()}.png`;
      testResult.screenshot = `./tests/screenshots/${screenshotName}`;
      
      try {
        await this.mcpClient.callTool({
          name: 'take_screenshot',
          arguments: {
            filePath: testResult.screenshot,
            fullPage: true
          }
        });
        console.log(`   📸 Screenshot: ${testResult.screenshot}`);
      } catch (e) {
        console.log(`   ⚠️  No se pudo capturar screenshot: ${e.message}`);
      }
    }

    this.results.tests.push(testResult);
  }

  async executeStepWithLLM(step, suite, systemPrompt) {
    // Obtener URL actual
    let currentUrl = 'unknown';
    try {
      const pagesResult = await this.mcpClient.callTool({
        name: 'list_pages',
        arguments: {}
      });
      const pagesText = pagesResult.content[0]?.text || '[]';
      const pages = JSON.parse(pagesText);
      const currentPage = pages.find(p => p.selected);
      if (currentPage) currentUrl = currentPage.url;
    } catch (e) {
      console.log(`   ⚠️  No se pudo obtener URL actual`);
    }

    const context = {
      currentUrl,
      step,
      baseUrl: suite.baseUrl,
      variables: suite.variables || {}
    };

    const stepPrompt = this.buildStepPrompt(step, context, systemPrompt);
    
    let llmResponse;
    try {
      llmResponse = await this.llmAdapter.processStep(stepPrompt, context);
    } catch (error) {
      console.log(`   ⚠️  LLM falló, ejecutando directo: ${error.message}`);
      return await this.executeStepDirect(step, suite);
    }

    return await this.executeActionMCP(llmResponse.action, llmResponse.params, suite);
  }

  async executeStepDirect(step, suite) {
    const action = step.action;
    const params = { ...step };
    delete params.action;
    
    // Reemplazar variables usando la utilidad
    const replacedParams = this.variableReplacer.replaceVariablesInParams(params, suite);

    return await this.executeActionMCP(action, replacedParams, suite);
  }

  buildStepPrompt(step, context, systemPrompt) {
    return `${systemPrompt}\n\n## Contexto Actual\n- URL actual: ${context.currentUrl}\n- Base URL: ${context.baseUrl}\n\n## Paso a Ejecutar\n\
```yaml\n${yaml.dump(step)}\n\
```\n\n## Variables Disponibles\n\
```json\n${JSON.stringify(context.variables, null, 2)}\n\
```\n\n## Instrucción\nAnaliza el paso YAML y decide qué acción ejecutar. Responde SOLO con JSON:\n{\n  "action": "nombre_accion",\n  "params": { "clave": "valor" },\n  "reasoning": "explicación breve"\n}`;
  }
}

module.exports = { TestExecutor };
