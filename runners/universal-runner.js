// runners/universal-runner.js
// Runner universal que usa el cliente MCP para Chrome DevTools

const fs = require('fs');
const yaml = require('js-yaml');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class UniversalTestRunner {
  constructor(configPath = './config/llm.config.json') {
    this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    this.llmAdapter = null;
    this.mcpClient = null;
    this.mcpTransport = null;
    this.pageIndex = null;
    this.results = {
      suite: '',
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: [],
      startTime: null,
      endTime: null
    };
  }

  async initialize() {
    console.log('🚀 Iniciando Universal Test Runner (Modo MCP)...\n');
    
    // 1. Inicializar LLM Adapter
    const activeProvider = this.config.activeProvider;
    console.log(`📡 Proveedor activo: ${activeProvider}`);
    
    const AdapterClass = require(`./adapters/${activeProvider}.adapter.js`);
    this.llmAdapter = new AdapterClass(this.config.providers[activeProvider]);
    await this.llmAdapter.initialize();
    console.log(`✅ LLM ${activeProvider} inicializado\n`);

    // 2. Conectar al servidor MCP de Chrome DevTools
    console.log('🔌 Conectando al servidor MCP de Chrome DevTools...');
    
    const chromePath = this.config.testing.chrome?.paths?.windows || 
                      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    
    this.mcpTransport = new StdioClientTransport({
      command: 'npx',
      args: ['-y', 'chrome-devtools-mcp@latest'],
      env: {
        ...process.env,
        CHROME_PATH: chromePath
      }
    });

    this.mcpClient = new Client({
      name: 'universal-test-runner',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    await this.mcpClient.connect(this.mcpTransport);
    console.log('✅ Conectado al servidor MCP de Chrome DevTools\n');

    // 3. Listar herramientas disponibles
    const toolsResult = await this.mcpClient.listTools();
    console.log(`🔧 Herramientas MCP disponibles (${toolsResult.tools.length}):`);
    toolsResult.tools.slice(0, 5).forEach(tool => {
      console.log(`   - ${tool.name}`);
    });
    if (toolsResult.tools.length > 5) {
      console.log(`   ... y ${toolsResult.tools.length - 5} más\n`);
    }

    // 4. Crear una nueva página
    console.log('📄 Creando nueva página en el navegador...');
    console.log('   Llamando a new_page con url="about:blank"...');
    
    try {
      const newPageResult = await this.mcpClient.callTool({
        name: 'new_page',
        arguments: { url: 'about:blank' }
      });
      
      console.log('   📦 Resultado completo de new_page:');
      console.log(JSON.stringify(newPageResult, null, 2));
      
      // Parsear el resultado para obtener el pageIdx
      if (newPageResult.content && newPageResult.content[0]) {
        const resultText = newPageResult.content[0].text;
        console.log('   📄 Texto del resultado:', resultText);
        
        const match = resultText.match(/"pageIdx":\s*(\d+)/);
        if (match) {
          this.pageIndex = parseInt(match[1]);
          console.log(`✅ Página creada (índice: ${this.pageIndex})`);
        } else {
          console.log('⚠️  No se pudo extraer pageIdx del resultado');
          console.log('   Intentando parsear como JSON...');
          try {
            const parsed = JSON.parse(resultText);
            this.pageIndex = parsed.pageIdx;
            console.log(`✅ Página creada vía JSON parse (índice: ${this.pageIndex})`);
          } catch (e) {
            console.log('❌ No se pudo parsear como JSON:', e.message);
          }
        }
      } else {
        console.log('⚠️  newPageResult no tiene el formato esperado');
      }
      
      // Verificar que la página se creó listando todas las páginas
      console.log('\n   🔍 Verificando páginas disponibles...');
      const pagesListResult = await this.mcpClient.callTool({
        name: 'list_pages',
        arguments: {}
      });
      console.log('   📋 Páginas actuales:', pagesListResult.content[0]?.text);
      
    } catch (error) {
      console.error('❌ Error al crear página:', error);
      throw error;
    }

    console.log('');
    this.ensureDirectories();
  }

  ensureDirectories() {
    const dirs = ['./tests/results', './tests/screenshots'];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async runSuite(suiteFile) {
    console.log(`📋 Cargando suite: ${suiteFile}\n`);
    
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
    console.log(`${'='.repeat(60)}`);
    
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
    
    // Reemplazar variables en TODOS los parámetros
    const replacedParams = {};
    for (const key in params) {
      if (Array.isArray(params[key])) {
        replacedParams[key] = params[key].map(v => 
          typeof v === 'string' ? this.replaceVariables(v, suite) : v
        );
      } else if (typeof params[key] === 'string') {
        replacedParams[key] = this.replaceVariables(params[key], suite);
      } else {
        replacedParams[key] = params[key];
      }
    }

    return await this.executeActionMCP(action, replacedParams, suite);
  }

  replaceVariables(value, suite) {
    if (typeof value !== 'string') return value;
    
    let result = value.replace('${baseUrl}', suite.baseUrl);
    
    const variables = suite.variables || {};
    for (const key in variables) {
      const val = variables[key];
      if (typeof val === 'object') {
        for (const subKey in val) {
          const placeholder = `\${${key}.${subKey}}`;
          result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), val[subKey]);
        }
      } else {
        const placeholder = `\${${key}}`;
        result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), val);
      }
    }
    
    return result;
  }

  async executeActionMCP(action, params, suite) {
    const result = {
      action,
      params,
      success: false,
      error: null,
      output: null
    };

    try {
      switch (action) {
        case 'navigate':
          console.log(`   🌐 Navegando a: ${params.url}`);
          
          // Intentar navegar
          const navResult = await this.mcpClient.callTool({
            name: 'navigate_page',
            arguments: { url: params.url }
          });
          
          // Esperar carga
          console.log(`   ⏳ Esperando carga (3s)...`);
          await sleep(3000);
          
          // Verificar URL actual
          try {
            const pagesAfter = await this.mcpClient.callTool({
              name: 'list_pages',
              arguments: {}
            });
            const pagesData = JSON.parse(pagesAfter.content[0]?.text || '[]');
            const currentPage = pagesData.find(p => p.selected);
            console.log(`   ✅ URL actual: ${currentPage?.url || 'unknown'}`);
          } catch (e) {
            console.log(`   ⚠️  No se pudo verificar URL`);
          }
          
          break;

        case 'click':
          // Necesitamos obtener el UID del elemento primero
          const snapshot = await this.mcpClient.callTool({
            name: 'take_snapshot',
            arguments: {}
          });
          const snapshotText = snapshot.content[0]?.text || '';
          const uid = this.findUidInSnapshot(snapshotText, params.selector);
          
          if (!uid) {
            throw new Error(`Elemento no encontrado: ${params.selector}`);
          }
          
          await this.mcpClient.callTool({
            name: 'click',
            arguments: { uid }
          });
          console.log(`   ✓ Click en: ${params.selector} (uid: ${uid})`);
          break;

        case 'fillInput':
        case 'fill':
          const snapshotFill = await this.mcpClient.callTool({
            name: 'take_snapshot',
            arguments: {}
          });
          const snapshotTextFill = snapshotFill.content[0]?.text || '';
          const uidFill = this.findUidInSnapshot(snapshotTextFill, params.selector);
          
          if (!uidFill) {
            throw new Error(`Elemento no encontrado: ${params.selector}`);
          }
          
          await this.mcpClient.callTool({
            name: 'fill',
            arguments: { uid: uidFill, value: params.value }
          });
          console.log(`   ✓ Campo llenado: ${params.selector}`);
          break;

        case 'waitForSelector':
          console.log(`   ⏳ Esperando elemento: ${params.selector}`);
          const timeout = params.timeout || this.config.testing.defaultTimeout;
          const startTime = Date.now();
          let found = false;
          let attempts = 0;
          
          while (Date.now() - startTime < timeout) {
            attempts++;
            try {
              const snap = await this.mcpClient.callTool({
                name: 'take_snapshot',
                arguments: {}
              });
              const snapText = snap.content[0]?.text || '';
              
              // Debug en el primer intento
              if (attempts === 1) {
                console.log(`   📏 Snapshot obtenido: ${snapText.length} caracteres`);
              }
              
              // Buscar el selector en el snapshot
              if (snapText.includes(params.selector) || 
                  this.findUidInSnapshot(snapText, params.selector)) {
                found = true;
                break;
              }
            } catch (e) {
              console.log(`   ⚠️  Error en intento ${attempts}: ${e.message}`);
              // Continuar intentando
            }
            
            if (attempts % 5 === 0) {
              console.log(`   ⏳ ${attempts} intentos, ${Math.floor((Date.now() - startTime) / 1000)}s transcurridos...`);
            }
            await sleep(1000);
          }
          
          if (!found) {
            throw new Error(`Timeout esperando elemento: ${params.selector} (${attempts} intentos)`);
          }
          console.log(`   ✅ Elemento encontrado después de ${attempts} intentos`);
          break;

        case 'verifyElementExists':
          const verifySnap = await this.mcpClient.callTool({
            name: 'take_snapshot',
            arguments: {}
          });
          const verifyText = verifySnap.content[0]?.text || '';
          
          for (const selector of params.selectors || [params.selector]) {
            if (!verifyText.includes(selector)) {
              throw new Error(`Elemento no encontrado: ${selector}`);
            }
          }
          console.log(`   ✓ Elementos verificados`);
          break;

        case 'screenshot':
          const screenshotPath = `./tests/screenshots/${params.filename}.png`;
          await this.mcpClient.callTool({
            name: 'take_screenshot',
            arguments: {
              filePath: screenshotPath,
              fullPage: true
            }
          });
          console.log(`   ✓ Screenshot: ${screenshotPath}`);
          result.output = screenshotPath;
          break;

        case 'clearCookies':
          await this.mcpClient.callTool({
            name: 'evaluate_script',
            arguments: {
              function: `() => {
                const cookies = document.cookie.split(';');
                for (let i = 0; i < cookies.length; i++) {
                  const eq = cookies[i].indexOf('=');
                  const name = eq > -1 ? cookies[i].substr(0, eq) : cookies[i];
                  document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
                }
              }`
            }
          });
          console.log(`   ✓ Cookies limpiadas`);
          break;

        case 'verifyElementText':
          const textSnap = await this.mcpClient.callTool({
            name: 'take_snapshot',
            arguments: {}
          });
          const textSnapContent = textSnap.content[0]?.text || '';
          const uidText = this.findUidInSnapshot(textSnapContent, params.selector);
          
          if (!uidText) {
            throw new Error(`Elemento no encontrado: ${params.selector}`);
          }
          
          const elementText = this.getTextFromSnapshot(textSnapContent, uidText);
          const matched = params.expectedPatterns.some(p => 
            new RegExp(p, 'i').test(elementText)
          );
          
          if (!matched) {
            throw new Error(`Texto no coincide en ${params.selector}. Obtenido: ${elementText}`);
          }
          console.log(`   ✓ Texto verificado`);
          break;

        default:
          console.log(`   ⚠️  Acción no implementada: ${action}`);
      }

      result.success = true;
    } catch (error) {
      result.error = error.message;
      console.log(`   ❌ Error: ${error.message}`);
    }

    return result;
  }

  findUidInSnapshot(snapshotText, selector) {
    if (!snapshotText) return null;
    
    const lines = snapshotText.split('\n');
    
    // 1. Intentar buscar selector exacto primero
    for (const line of lines) {
      if (line.includes(selector)) {
        const uidMatch = line.match(/uid=(\d+)/);
        if (uidMatch) {
          return uidMatch[1];
        }
      }
    }
    
    // 2. Parsear selectores específicos
    // Selector de tag simple (h1, button, div, etc.)
    const tagMatch = selector.match(/^([a-z][a-z0-9]*)$/i);
    if (tagMatch) {
      const tag = tagMatch[1].toLowerCase();
      for (const line of lines) {
        // Buscar apertura de tag
        const tagRegex = new RegExp(`<${tag}[\\s>]`, 'i');
        if (tagRegex.test(line)) {
          const uidMatch = line.match(/uid=(\d+)/);
          if (uidMatch) {
            return uidMatch[1];
          }
        }
      }
    }
    
    // 3. Selector de clase (.card, .btn-primary, etc.)
    const classMatch = selector.match(/^\.([a-zA-Z0-9_-]+)$/);
    if (classMatch) {
      const className = classMatch[1];
      for (const line of lines) {
        // Buscar class="..." o class='...'
        const classRegex = new RegExp(`class=["']([^"']*\\b${className}\\b[^"']*)["']`);
        if (classRegex.test(line)) {
          const uidMatch = line.match(/uid=(\d+)/);
          if (uidMatch) {
            return uidMatch[1];
          }
        }
      }
    }
    
    // 4. Selector compuesto con clase (.card button, button.btn-primary)
    const compoundMatch = selector.match(/^([a-z]+)\.([a-zA-Z0-9_-]+)$/i);
    if (compoundMatch) {
      const tag = compoundMatch[1].toLowerCase();
      const className = compoundMatch[2];
      for (const line of lines) {
        const tagRegex = new RegExp(`<${tag}[\\s>]`, 'i');
        const classRegex = new RegExp(`class=["']([^"']*\\b${className}\\b[^"']*)["']`);
        if (tagRegex.test(line) && classRegex.test(line)) {
          const uidMatch = line.match(/uid=(\d+)/);
          if (uidMatch) {
            return uidMatch[1];
          }
        }
      }
    }
    
    // 5. Selector descendiente (.card button, .card:first-of-type button)
    const descendantMatch = selector.match(/^(.+)\s+([a-z]+)$/i);
    if (descendantMatch) {
      const parentSelector = descendantMatch[1];
      const childTag = descendantMatch[2].toLowerCase();
      
      // Primero encontrar el padre
      const parentUid = this.findUidInSnapshot(snapshotText, parentSelector);
      if (parentUid) {
        // Buscar hijos del padre (esto es aproximado)
        let foundParent = false;
        for (const line of lines) {
          if (line.includes(`uid=${parentUid}`)) {
            foundParent = true;
            continue;
          }
          if (foundParent) {
            const tagRegex = new RegExp(`<${childTag}[\\s>]`, 'i');
            if (tagRegex.test(line)) {
              const uidMatch = line.match(/uid=(\d+)/);
              if (uidMatch) {
                return uidMatch[1];
              }
            }
            // Si encontramos un tag de cierre del padre, parar
            if (line.includes('</')) {
              break;
            }
          }
        }
      }
    }
    
    // 6. Pseudo-selector :first-of-type, :first-child
    const pseudoMatch = selector.match(/^(.+):first-of-type$/);
    if (pseudoMatch) {
      const baseSelector = pseudoMatch[1];
      // Buscar el primero que coincida con el selector base
      return this.findUidInSnapshot(snapshotText, baseSelector);
    }
    
    console.log(`   ⚠️  No se pudo encontrar UID para selector: ${selector}`);
    console.log(`   💡 Primeras 10 líneas del snapshot:`);
    lines.slice(0, 10).forEach(line => console.log(`      ${line.substring(0, 100)}`));
    
    return null;
  }

  getTextFromSnapshot(snapshotText, uid) {
    const lines = snapshotText.split('\n');
    for (const line of lines) {
      if (line.includes(`uid=${uid}`)) {
        const textMatch = line.match(/text="([^"]*)"/);
        if (textMatch) {
          return textMatch[1];
        }
      }
    }
    return '';
  }

  buildStepPrompt(step, context, systemPrompt) {
    return `${systemPrompt}

## Contexto Actual
- URL actual: ${context.currentUrl}
- Base URL: ${context.baseUrl}

## Paso a Ejecutar
\`\`\`yaml
${yaml.dump(step)}
\`\`\`

## Variables Disponibles
\`\`\`json
${JSON.stringify(context.variables, null, 2)}
\`\`\`

## Instrucción
Analiza el paso YAML y decide qué acción ejecutar. Responde SOLO con JSON:
{
  "action": "nombre_accion",
  "params": { "clave": "valor" },
  "reasoning": "explicación breve"
}`;
  }

  async generateReport() {
    const duration = this.results.endTime - this.results.startTime;
    const totalTests = this.results.passed + this.results.failed + this.results.skipped;
    const successRate = totalTests > 0 ? ((this.results.passed / totalTests) * 100).toFixed(1) : 0;

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE RESULTADOS');
    console.log('='.repeat(60));
    console.log(`✅ Exitosas: ${this.results.passed}`);
    console.log(`❌ Fallidas: ${this.results.failed}`);
    console.log(`📈 Tasa de éxito: ${successRate}%`);
    console.log(`⏱️  Duración total: ${(duration / 1000).toFixed(2)}s`);
    console.log('='.repeat(60));

    // Generar reporte Markdown
    let markdown = `# 📊 Reporte de Testing\n\n`;
    markdown += `**Suite**: ${this.results.suite}\n`;
    markdown += `**Fecha**: ${this.results.endTime.toLocaleString()}\n`;
    markdown += `**LLM**: ${this.config.activeProvider}\n\n`;
    
    markdown += `## Resumen Ejecutivo\n\n`;
    markdown += `| Métrica | Valor |\n`;
    markdown += `|---------|-------|\n`;
    markdown += `| ✅ Exitosas | ${this.results.passed} |\n`;
    markdown += `| ❌ Fallidas | ${this.results.failed} |\n`;
    markdown += `| 📈 Tasa de éxito | ${successRate}% |\n`;
    markdown += `| ⏱️ Duración | ${(duration / 1000).toFixed(2)}s |\n\n`;

    markdown += `## Detalle de Pruebas\n\n`;

    for (const test of this.results.tests) {
      const icon = test.status === 'PASS' ? '✅' : '❌';
      markdown += `### ${icon} ${test.name}\n\n`;
      markdown += `- **Estado**: ${test.status}\n`;
      markdown += `- **Duración**: ${test.duration}ms\n`;
      markdown += `- **Resultado esperado**: ${test.expectedResult}\n`;
      
      if (test.status === 'FAIL') {
        markdown += `- **Error**: \`${test.error}\`\n`;
        if (test.screenshot) {
          markdown += `- **Screenshot**: [Ver captura](${test.screenshot})\n`;
        }
      }

      markdown += `\n`;
    }

    // Guardar reporte
    const reportPath = `./tests/results/reporte-${Date.now()}.md`;
    fs.writeFileSync(reportPath, markdown);
    console.log(`\n📄 Reporte guardado: ${reportPath}\n`);
  }

  async cleanup() {
    console.log('\n🧹 Limpiando...');
    
    if (this.pageIndex !== null && this.mcpClient) {
      try {
        await this.mcpClient.callTool({
          name: 'close_page',
          arguments: { pageIdx: this.pageIndex }
        });
        console.log(`✓ Página cerrada (índice: ${this.pageIndex})`);
      } catch (e) {
        console.log(`⚠️  No se pudo cerrar la página: ${e.message}`);
      }
    }
    
    if (this.mcpClient) {
      await this.mcpClient.close();
      console.log('✓ Cliente MCP cerrado');
    }
    
    if (this.llmAdapter && this.llmAdapter.cleanup) {
      await this.llmAdapter.cleanup();
    }
    
    console.log('✓ Limpieza completada');
  }
}

if (require.main === module) {
  const suiteFile = process.argv[2] || './tests/suites/ecommerce-suite.yml';
  
  const runner = new UniversalTestRunner();
  
  runner.initialize()
    .then(() => runner.runSuite(suiteFile))
    .then(results => {
      runner.cleanup();
      const exitCode = results.failed > 0 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('❌ Error fatal:', error);
      runner.cleanup();
      process.exit(1);
    });
}

module.exports = UniversalTestRunner;