// runners/universal-runner.js
// Runner universal que funciona con cualquier LLM y se ejecuta con el MCP de Chrome DevTools

const default_api = require('default_api');
const fs = require('fs');
const yaml = require('js-yaml');

// Helper para pausar la ejecución
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class UniversalTestRunner {
  constructor(configPath = './config/llm.config.json') {
    this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    this.llmAdapter = null;
    this.page = null;
    this.results = {
      suite: '',
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: [],
      startTime: null,
      endTime: null,
      performance: null,
    };
  }

  async initialize() {
    console.log('Iniciando Universal Test Runner (Modo DevTools MCP)...');
    
    const activeProvider = this.config.activeProvider;
    console.log(`(+) Proveedor activo: ${activeProvider}`);
    const AdapterClass = require(`./adapters/${activeProvider}.adapter.js`);
    this.llmAdapter = new AdapterClass(this.config.providers[activeProvider]);
    await this.llmAdapter.initialize();
    console.log(`(+) LLM ${activeProvider} inicializado`);

    console.log('(+) Abriendo una nueva pagina en el navegador via DevTools MCP...');
    try {
      const newPageResult = await default_api.new_page({ url: 'about:blank' });
      this.page = { index: newPageResult.pageIdx, url: 'about:blank' };
      console.log(`(+) Nueva pagina creada y seleccionada (Indice: ${this.page.index})`);
    } catch (e) {
      console.error("(-) No se pudo crear una nueva pagina.");
      throw e;
    }
    
    console.log('(+) Iniciando traza de rendimiento...');
    await default_api.performance_start_trace({ reload: false, autoStop: false });
    console.log('(+) Traza de rendimiento activa.');

    this.ensureDirectories();
  }

  ensureDirectories() {
    const dirs = ['./tests/results', './tests/screenshots'];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
  }

  async runSuite(suiteFile) {
    console.log(`(+) Cargando suite: ${suiteFile}`);
    const suiteContent = fs.readFileSync(suiteFile, 'utf8');
    const suite = yaml.load(suiteContent);
    
    this.results.suite = suite.suite;
    this.results.startTime = new Date();
    
    console.log(`(+) Suite: ${suite.suite}`);
    console.log(`(+) Descripcion: ${suite.description}`);
    console.log(`(+) Base URL: ${suite.baseUrl}`);
    console.log('='.repeat(60));

    const systemPrompt = fs.readFileSync('./prompts/system.md', 'utf8');
    
    if (suite.setup) {
      console.log('\n(+) Ejecutando SETUP...');
      for (const step of suite.setup) await this.executeStepWithLLM(step, suite, systemPrompt);
    }

    for (const test of suite.tests) {
      await this.executeTest(test, suite, systemPrompt);
    }

    if (suite.teardown) {
      console.log('\n(+) Ejecutando TEARDOWN...');
      for (const step of suite.teardown) await this.executeStepWithLLM(step, suite, systemPrompt);
    }

    this.results.endTime = new Date();
    await this.generateReport();
    return this.results;
  }

  async executeTest(test, suite, systemPrompt) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`(+) Test: ${test.name}`);
    console.log(`(+) Objetivo: ${test.expectedResult}`);
    console.log(`${'='.repeat(60)}`);
    
    const startTime = Date.now();
    const testResult = { name: test.name, status: 'RUNNING', steps: [], logs: {} };

    try {
      for (let i = 0; i < test.steps.length; i++) {
        const step = test.steps[i];
        console.log(`\n[${i + 1}/${test.steps.length}] ${step.action}: ${step.description || ''}`);
        
        const stepResult = await this.executeStepWithLLM(step, suite, systemPrompt);
        testResult.steps.push(stepResult);
        
        if (!stepResult.success) throw new Error(stepResult.error || 'Paso fallo');
        await sleep(500);
      }
      testResult.status = 'PASS';
      this.results.passed++;
      console.log(`\n(+) PASS`);
    } catch (error) {
      testResult.status = 'FAIL';
      testResult.error = error.message;
      this.results.failed++;
      console.log(`\n(-) FAIL: ${error.message}`);
      
      const screenshotName = `error-${Date.now()}.png`;
      testResult.screenshot = `./tests/screenshots/${screenshotName}`;
      await default_api.take_screenshot({ filePath: testResult.screenshot, fullPage: true });
      console.log(`   (+) Screenshot: ${testResult.screenshot}`);
      
      testResult.logs.console = await default_api.list_console_messages();
      testResult.logs.network = await default_api.list_network_requests({ resourceTypes: ['xhr', 'fetch'] });
      console.log('   (+) Logs de consola y red capturados.');
    }
    testResult.duration = Date.now() - startTime;
    this.results.tests.push(testResult);
  }

  async executeStepWithLLM(step, suite, systemPrompt) {
    const pages = await default_api.list_pages();
    const currentUrl = pages.find(p => p.selected)?.url || 'N/A';

    const context = { currentUrl, step, baseUrl: suite.baseUrl, variables: suite.variables || {} };
    const stepPrompt = this.buildStepPrompt(step, context, systemPrompt);
    
    let llmResponse;
    try {
      llmResponse = await this.llmAdapter.processStep(stepPrompt, context);
    } catch (error) {
      console.log(`   (-) LLM fallo, ejecutando directo: ${error.message}`);
      return await this.executeStepDirect(step, suite);
    }
    return await this.executeAction(llmResponse.action, llmResponse.params, suite);
  }

  async executeStepDirect(step, suite) {
    const action = step.action;
    const params = { ...step };
    delete params.action;
    return await this.executeAction(action, params, suite);
  }
  
  async findUidBySelector(selector) {
    const snapshot = await default_api.take_snapshot();
    if (!snapshot || !snapshot.text) return null;
    const lines = snapshot.text.split('\n');
    const elementLine = lines.find(line => line.includes(selector));
    if (elementLine) {
      const uidMatch = elementLine.match(/uid=(\d+)/);
      if (uidMatch) return uidMatch[1];
    }
    return null;
  }

  async getElementTextByUid(uid) {
      const snapshot = await default_api.take_snapshot();
      if (!snapshot || !snapshot.text) return null;
      const lines = snapshot.text.split('\n');
      const elementLine = lines.find(line => line.startsWith(`uid=${uid}`));
      if (elementLine) {
          const textMatch = elementLine.match(/text="([^"]*)"/);
          if (textMatch) return textMatch[1];
      }
      return null;
  }

  replaceVariables(value, suite) {
      if (typeof value !== 'string') return value;
      let replacedValue = value.replaceAll('${baseUrl}', suite.baseUrl);
      const variables = suite.variables || {};
      for (const key in variables) {
          const val = variables[key];
          if (typeof val === 'object') {
              for (const subKey in val) {
                  const subVal = val[subKey];
                  const placeholder = '${' + key + '.' + subKey + '}';
                  replacedValue = replacedValue.replaceAll(placeholder, subVal);
              }
          } else {
              const placeholder = '${' + key + '}';
              replacedValue = replacedValue.replaceAll(placeholder, val);
          }
      }
      return replacedValue;
  }

  async executeAction(action, params, suite) {
    const result = { action, params, success: false, error: null };
    try {
      let uid;
      for (const key in params) {
          params[key] = this.replaceVariables(params[key], suite);
      }

      switch (action) {
        case 'navigate':
          await default_api.navigate_page({ url: params.url });
          console.log(`   (+) Navegado a: ${params.url}`);
          break;
        case 'click':
          uid = await this.findUidBySelector(params.selector);
          if (!uid) throw new Error(`Elemento no encontrado: ${params.selector}`);
          await default_api.click({ uid });
          console.log(`   (+) Click en: ${params.selector} (uid: ${uid})`);
          break;
        case 'fillInput': case 'fill':
          uid = await this.findUidBySelector(params.selector);
          if (!uid) throw new Error(`Elemento no encontrado: ${params.selector}`);
          await default_api.fill({ uid, value: params.value });
          console.log(`   (+) Campo llenado: ${params.selector}`);
          break;
        case 'waitForSelector':
          console.log(`   (+) Esperando por: ${params.selector}`);
          const timeout = params.timeout || this.config.testing.defaultTimeout;
          const startTime = Date.now();
          let elementFound = false;
          while (Date.now() - startTime < timeout) {
            if (await this.findUidBySelector(params.selector)) {
              elementFound = true;
              break;
            }
            await sleep(500);
          }
          if (!elementFound) throw new Error(`Timeout esperando por elemento: ${params.selector}`);
          console.log(`   (+) Elemento encontrado: ${params.selector}`);
          break;
        case 'verifyElementExists':
          for (const selector of params.selectors || [params.selector]) {
            if (!await this.findUidBySelector(selector)) throw new Error(`Elemento no encontrado: ${selector}`);
          }
          console.log(`   (+) Elementos verificados`);
          break;
        case 'screenshot':
          const path = `./tests/screenshots/${params.filename}.png`;
          await default_api.take_screenshot({ filePath: path, fullPage: true });
          console.log(`   (+) Screenshot: ${path}`);
          break;
        case 'clearCookies':
          await default_api.evaluate_script({ function: "() => { const c = document.cookie.split(';'); for(let i=0; i<c.length; i++) { const e = c[i].indexOf('='); const n = e > -1 ? c[i].substr(0, e) : c[i]; document.cookie = n + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'; } }" });
          console.log('   (+) Cookies limpiadas');
          break;
        case 'verifyElementText':
            uid = await this.findUidBySelector(params.selector);
            if (!uid) throw new Error(`Elemento no encontrado: ${params.selector}`);
            const text = await this.getElementTextByUid(uid);
            const matched = params.expectedPatterns.some(p => new RegExp(p, 'i').test(text));
            if (!matched) throw new Error(`Texto no coincide en ${params.selector}. Obtenido: '${text}'`);
            console.log(`   (+) Texto verificado en ${params.selector}`);
            break;
        default:
          throw new Error(`Accion no implementada en modo MCP: ${action}`);
      }
      result.success = true;
    } catch (error) {
      result.error = error.message;
    }
    return result;
  }

  buildStepPrompt(step, context, systemPrompt) {
    let prompt = systemPrompt;
    prompt += '\n\n## Contexto Actual\n';
    prompt += '- URL actual: ' + context.currentUrl + '\n';
    prompt += '- Base URL: ' + context.baseUrl + '\n';
    prompt += '\n## Paso a Ejecutar\n';
    prompt += '```yaml\n';
    prompt += yaml.dump(step);
    prompt += '\n```\n';
    prompt += '\n## Variables Disponibles\n';
    prompt += '```json\n';
    prompt += JSON.stringify(context.variables, null, 2);
    prompt += '\n```\n';
    prompt += '\n## Instruccion\nAnaliza el paso YAML y decide que accion ejecutar. Responde SOLO con JSON.';
    return prompt;
  }

  async generateReport() {
    if (this.results.startTime) {
        console.log('\n(+) Deteniendo traza de rendimiento...');
        this.results.performance = await default_api.performance_stop_trace();
        console.log('(+) Resultados de rendimiento obtenidos.');
    }
    
    const duration = this.results.endTime - this.results.startTime;
    const total = this.results.passed + this.results.failed + this.results.skipped;
    const rate = total > 0 ? ((this.results.passed / total) * 100).toFixed(1) : 0;

    let md = `# Reporte de Testing: ${this.results.suite}\n\n`;
    md += `| Metrica | Valor |\n|---|---|\n`;
    md += `| (+) Exitosas | ${this.results.passed} |\n| (-) Fallidas | ${this.results.failed} |\n`;
    md += `| (i) Tasa de exito | ${rate}% |\n| (t) Duracion | ${(duration / 1000).toFixed(2)}s |\n\n`;

    if (this.results.performance?.summary) {
        md += `## Metricas de Rendimiento\n\n`;
        md += '```json\n' + JSON.stringify(this.results.performance.summary, null, 2) + '\n```\n\n';
    }

    md += `## Detalle de Pruebas\n\n`;
    for (const test of this.results.tests) {
      const icon = test.status === 'PASS' ? '(+)' : '(-)';
      md += `### ${icon} ${test.name}\n- **Estado**: ${test.status} (${test.duration}ms)\n`;
      if (test.status === 'FAIL') {
        md += `- **Error**: ${test.error}\n`;
        if (test.screenshot) md += `- **Screenshot**: [Ver captura](${test.screenshot})\n`;
        if (test.logs?.console?.messages?.length) {
            md += `- **Logs de Consola**:\n\`\`\`\n${test.logs.console.messages.map(m=>m.text).join('\n')}\n\`\`\`\n`;
        }
      }
      md += `\n`;
    }

    const reportPath = `./tests/results/report-${Date.now()}.md`;
    fs.writeFileSync(reportPath, md);
    console.log(`\n(+) Reporte guardado: ${reportPath}`);
  }

  async cleanup() {
    console.log('\n(+) Limpiando y finalizando...');
    if (this.page) {
      try {
        await default_api.close_page({ pageIdx: this.page.index });
        console.log(`(+) Pagina de prueba (Indice: ${this.page.index}) cerrada.`);
      } catch (error) {
        console.warn(`(-) No se pudo cerrar la pagina de prueba: ${error.message}`);
      }
    }
    if (this.llmAdapter?.cleanup) await this.llmAdapter.cleanup();
    console.log('(+) Runner finalizado.');
  }
}

if (require.main === module) {
  const suiteFile = process.argv[2] || './tests/suites/ecommerce-suite.yml';
  const runner = new UniversalTestRunner();
  runner.initialize()
    .then(() => runner.runSuite(suiteFile))
    .then(() => runner.cleanup())
    .catch(error => {
      console.error('(-) Error fatal:', error);
      runner.cleanup();
      process.exit(1);
    });
}

module.exports = UniversalTestRunner;
