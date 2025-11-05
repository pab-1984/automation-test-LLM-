// runners/core/runner-core.js
const fs = require('fs');
const yaml = require('js-yaml');
const { TestExecutor } = require('./test-executor.js');
const { ReportGenerator } = require('./report-generator.js');
const { BrowserActions } = require('../actions/browser-actions.js');
const { MobileActions } = require('../actions/mobile-actions.js');
const { APIActions } = require('../actions/api-actions.js');
const { VariableReplacer } = require('../actions/variable-replacer.js');
const { LLMProcessor } = require('../llm/llm-processor.js');
const { ElementFinder } = require('../actions/element-finder.js');
const { MCPClientFactory } = require('./mcp-client-factory.js');
const { APIClient } = require('./api-client.js');

class UniversalTestRunnerCore extends TestExecutor {
  constructor(configPath = './config/llm.config.json', options = {}) {
    super();
    this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    this.llmAdapter = null;
    this.mcpClient = null;
    this.mcpClientWrapper = null;  // Wrapper del factory
    this.mcpTransport = null;
    this.pageIndex = null;
    this.platform = options.platform || 'web';  // 'web' o 'mobile'
    this.deviceId = options.deviceId || null;   // Para mobile
    this.results = {
      suite: '',
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: [],
      startTime: null,
      endTime: null
    };

    // Inicializar utilidades
    this.elementFinder = new ElementFinder();
    this.variableReplacer = new VariableReplacer();
    this.browserActions = new BrowserActions();
    this.mobileActions = new MobileActions();
    this.apiActions = new APIActions();
    this.reportGenerator = new ReportGenerator();
    this.llmProcessor = new LLMProcessor();

    // API Client (se inicializa bajo demanda)
    this.apiClient = null;
  }

  async initialize() {
    console.log(`Iniciando Universal Test Runner (Plataforma: ${this.platform.toUpperCase()})...`);

    const activeProvider = this.config.activeProvider;
    console.log(`Proveedor LLM activo: ${activeProvider}`);

    const AdapterClass = require(`../adapters/${activeProvider}.adapter.js`);
    this.llmAdapter = new AdapterClass(this.config.providers[activeProvider]);
    await this.llmAdapter.initialize();
    console.log(`✅ LLM ${activeProvider} inicializado\n`);

    // Usar factory para crear cliente MCP según plataforma
    const clientOptions = {};

    if (this.platform === 'web') {
      // Cargar configuración de Chrome
      let chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
      try {
        const testingConfig = JSON.parse(fs.readFileSync('./config/testing.config.json', 'utf8'));
        if (testingConfig.chrome?.paths?.windows) {
          chromePath = testingConfig.chrome.paths.windows;
        }
      } catch (e) {
        // Usar ruta por defecto
      }
      clientOptions.chromePath = chromePath;

    } else if (this.platform === 'mobile') {
      // Opciones para mobile
      if (this.deviceId) {
        clientOptions.deviceId = this.deviceId;
      }
    }

    // Crear cliente MCP usando factory
    this.mcpClientWrapper = await MCPClientFactory.createClient(this.platform, clientOptions);
    this.mcpClient = this.mcpClientWrapper.client;
    this.mcpTransport = this.mcpClientWrapper.transport;
    this.pageIndex = this.mcpClientWrapper.pageIndex;

    // Mostrar herramientas disponibles
    const toolsResult = await this.mcpClient.listTools();
    console.log(`\n📦 Herramientas MCP disponibles (${toolsResult.tools.length}):`);
    toolsResult.tools.slice(0, 5).forEach(tool => {
      console.log(`   - ${tool.name}`);
    });
    if (toolsResult.tools.length > 5) {
      console.log(`   ... y ${toolsResult.tools.length - 5} más`);
    }

    // Mostrar capacidades
    const capabilities = Object.keys(this.mcpClientWrapper.capabilities || {})
      .filter(key => this.mcpClientWrapper.capabilities[key] === true);
    console.log(`\n✨ Capacidades habilitadas: ${capabilities.join(', ')}`);

    if (this.platform === 'mobile') {
      console.log(`\n📱 Dispositivo: ${this.mcpClientWrapper.deviceName || 'No seleccionado'}`);
      if (this.mcpClientWrapper.availableDevices.length > 0) {
        console.log(`📋 Dispositivos disponibles: ${this.mcpClientWrapper.availableDevices.length}`);
      }
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

  /**
   * NUEVO: Ejecuta tests en lenguaje natural usando LLM + MCP directo
   * Sin YAML, sin selectores CSS - solo contexto
   */
  async executeNaturalLanguageTest(instructions, options = {}) {
    const maxIterations = options.maxIterations || 30;
    const screenshotPerStep = options.screenshotPerStep || false;
    const captureLogs = options.captureLogs !== false; // default true
    const captureNetwork = options.captureNetwork || false;
    const performanceMetrics = options.performanceMetrics || false;

    const startTime = Date.now();

    // Iniciar performance tracking si se solicitó
    if (performanceMetrics) {
      try {
        await this.mcpClient.callTool({
          name: 'performance_start_trace',
          arguments: { reload: false, autoStop: false }
        });
        console.log('📊 Performance tracking iniciado');
      } catch (e) {
        console.log('⚠️  No se pudo iniciar performance tracking');
      }
    }

    console.log('\n🎯 Instrucciones recibidas:');
    console.log(instructions);
    console.log('\n▶️  Ejecutando con LLM + MCP directo...\n');

    // Obtener herramientas MCP disponibles
    const toolsResult = await this.mcpClient.listTools();
    const mcpTools = toolsResult.tools;

    // Cargar system prompt para modo MCP directo
    let systemPrompt = '';
    try {
      systemPrompt = fs.readFileSync('./prompts/mcp-direct.md', 'utf8');
    } catch (e) {
      console.log('⚠️  Prompt mcp-direct.md no encontrado, usando básico');
      systemPrompt = this.buildBasicMCPPrompt(mcpTools);
    }

    // Historial de conversación
    const messages = [
      {
        role: 'user',
        content: `Ejecuta las siguientes instrucciones de testing:\n\n${instructions}\n\nAl finalizar, genera un reporte con los resultados.`
      }
    ];

    let iteration = 0;
    let testReport = '';
    const executedSteps = []; // Capturar pasos para generar YAML

    while (iteration < maxIterations) {
      iteration++;
      console.log(`\n━━━ Iteración ${iteration}/${maxIterations} ━━━`);

      try {
        // LLM decide qué hacer (con acceso a herramientas MCP)
        const llmResponse = await this.llmAdapter.chatWithTools({
          systemPrompt,
          messages,
          tools: this.convertMCPToolsFormat(mcpTools)
        });

        // LLM quiere ejecutar herramientas
        if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {

          // Agregar respuesta del LLM al historial
          messages.push({
            role: 'assistant',
            content: llmResponse.text || '',
            toolCalls: llmResponse.toolCalls
          });

          // Ejecutar cada herramienta solicitada
          for (const toolCall of llmResponse.toolCalls) {
            console.log(`🔧 ${toolCall.name}(${JSON.stringify(toolCall.arguments).substring(0, 100)}...)`);

            try {
              // Ejecutar en MCP
              const result = await this.mcpClient.callTool({
                name: toolCall.name,
                arguments: toolCall.arguments
              });

              const resultText = result.content[0]?.text || JSON.stringify(result);
              console.log(`   ✅ ${resultText.substring(0, 150)}${resultText.length > 150 ? '...' : ''}`);

              // Capturar paso ejecutado para generar YAML
              executedSteps.push({
                action: toolCall.name,
                arguments: toolCall.arguments,
                result: resultText,
                success: true,
                timestamp: Date.now()
              });

              // Agregar resultado al historial
              messages.push({
                role: 'tool',
                toolCallId: toolCall.id,
                name: toolCall.name,
                content: resultText
              });

              // Capturar screenshot después de acciones importantes (si está habilitado)
              if (screenshotPerStep && ['navigate_page', 'click', 'fill', 'fill_form'].includes(toolCall.name)) {
                try {
                  const timestamp = Date.now();
                  const screenshotResult = await this.mcpClient.callTool({
                    name: 'take_screenshot',
                    arguments: { format: 'png', fullPage: true }
                  });
                  console.log(`   📸 Screenshot capturado (paso ${iteration})`);
                } catch (e) {
                  // No detener la ejecución si falla el screenshot
                }
              }

            } catch (toolError) {
              console.log(`   ❌ Error: ${toolError.message}`);
              messages.push({
                role: 'tool',
                toolCallId: toolCall.id,
                name: toolCall.name,
                content: `Error: ${toolError.message}`
              });
            }
          }

        }
        // LLM terminó (no más herramientas)
        else if (llmResponse.text) {
          console.log('\n✅ LLM finalizó la ejecución\n');
          testReport = llmResponse.text;
          messages.push({
            role: 'assistant',
            content: llmResponse.text
          });
          break;
        }
        // Respuesta vacía
        else {
          console.log('⚠️  Respuesta vacía del LLM, continuando...');
        }

      } catch (error) {
        console.error(`❌ Error en iteración ${iteration}:`, error.message);

        // Si falla, intentar recuperar
        if (iteration < maxIterations - 1) {
          messages.push({
            role: 'user',
            content: `Ocurrió un error: ${error.message}. Continúa con el siguiente paso si es posible.`
          });
        } else {
          throw error;
        }
      }
    }

    if (iteration >= maxIterations) {
      console.log('\n⚠️  Límite de iteraciones alcanzado');
      testReport = 'Test incompleto: se alcanzó el límite de iteraciones.';
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // ========================================
    // RECOLECCIÓN DE DATOS ADICIONALES
    // ========================================

    let consoleLogs = '';
    let networkRequests = '';
    let performanceData = '';

    // Capturar logs de consola
    if (captureLogs) {
      try {
        const logsResult = await this.mcpClient.callTool({
          name: 'list_console_messages',
          arguments: {}
        });
        consoleLogs = logsResult.content[0]?.text || 'Sin logs';
        console.log('📝 Logs de consola capturados');
      } catch (e) {
        consoleLogs = 'No se pudieron capturar logs';
      }
    }

    // Capturar network requests
    if (captureNetwork) {
      try {
        const networkResult = await this.mcpClient.callTool({
          name: 'list_network_requests',
          arguments: { pageSize: 50 }
        });
        networkRequests = networkResult.content[0]?.text || 'Sin requests';
        console.log('🌐 Network requests capturados');
      } catch (e) {
        networkRequests = 'No se pudieron capturar network requests';
      }
    }

    // Detener y capturar performance metrics
    if (performanceMetrics) {
      try {
        const perfResult = await this.mcpClient.callTool({
          name: 'performance_stop_trace',
          arguments: {}
        });
        performanceData = perfResult.content[0]?.text || 'Sin datos de performance';
        console.log('📊 Performance metrics capturados');
      } catch (e) {
        performanceData = 'No se pudieron capturar performance metrics';
      }
    }

    // ========================================
    // RESULTADO FINAL
    // ========================================
    console.log('\n' + '═'.repeat(60));
    console.log('📋 REPORTE FINAL');
    console.log('═'.repeat(60));
    console.log(testReport);
    console.log('═'.repeat(60));
    console.log(`⏱️  Duración: ${duration}s | Iteraciones: ${iteration}`);
    console.log('═'.repeat(60));

    // Mostrar información adicional
    if (captureLogs && consoleLogs && consoleLogs !== 'Sin logs') {
      console.log('\n📝 LOGS DE CONSOLA');
      console.log('─'.repeat(60));
      const logLines = consoleLogs.split('\n').slice(0, 20); // Primeras 20 líneas
      console.log(logLines.join('\n'));
      if (consoleLogs.split('\n').length > 20) {
        console.log(`\n... (${consoleLogs.split('\n').length - 20} líneas más)`);
      }
      console.log('─'.repeat(60));
    }

    if (captureNetwork && networkRequests && networkRequests !== 'Sin requests') {
      console.log('\n🌐 NETWORK REQUESTS');
      console.log('─'.repeat(60));
      const reqLines = networkRequests.split('\n').slice(0, 15); // Primeros 15 requests
      console.log(reqLines.join('\n'));
      if (networkRequests.split('\n').length > 15) {
        console.log(`\n... (${networkRequests.split('\n').length - 15} requests más)`);
      }
      console.log('─'.repeat(60));
    }

    if (performanceMetrics && performanceData && performanceData !== 'Sin datos de performance') {
      console.log('\n📊 PERFORMANCE METRICS');
      console.log('─'.repeat(60));
      console.log(performanceData.substring(0, 500));
      if (performanceData.length > 500) {
        console.log('\n... (datos truncados)');
      }
      console.log('─'.repeat(60));
    }

    console.log('');

    // Guardar logs en el runner para que puedan ser accedidos por el report generator
    this.consoleLogs = consoleLogs;
    this.networkRequests = networkRequests;
    this.performanceData = performanceData;

    return {
      success: !testReport.toLowerCase().includes('error') && !testReport.toLowerCase().includes('falló'),
      report: testReport,
      duration,
      iterations: iteration,
      consoleLogs,
      networkRequests,
      performanceData,
      executedSteps // Pasos ejecutados para generar YAML
    };
  }

  /**
   * Convierte herramientas MCP al formato que espera el LLM adapter
   */
  convertMCPToolsFormat(mcpTools) {
    return mcpTools.map(tool => ({
      name: tool.name,
      description: tool.description || 'No description',
      parameters: tool.inputSchema || { type: 'object', properties: {} }
    }));
  }

  /**
   * Genera un prompt básico si no existe el archivo
   */
  buildBasicMCPPrompt(mcpTools) {
    let prompt = `# Testing Agent with MCP Chrome DevTools

You are an automated testing agent with direct access to Chrome browser via MCP protocol.

## Available Tools (${mcpTools.length} total)

`;

    mcpTools.forEach(tool => {
      prompt += `### ${tool.name}\n`;
      prompt += `${tool.description || 'No description'}\n`;
      if (tool.inputSchema?.properties) {
        const params = Object.keys(tool.inputSchema.properties).join(', ');
        prompt += `Parameters: ${params}\n`;
      }
      prompt += '\n';
    });

    prompt += `
## Workflow

1. **Use take_snapshot()** to see page structure with UIDs
2. **Interact** using UIDs from snapshot (click, fill, hover, etc)
3. **Validate** results using screenshots, console messages, network requests
4. **Report** what worked and what failed

## Important Rules

- ALWAYS call take_snapshot() before interacting with elements
- UIDs are temporary - take new snapshot after page changes
- Use descriptive reasoning in your actions
- When finished, provide a clear summary report

## Example Flow

User: "Login with test@example.com / password123"

Your actions:
1. navigate_page(url: "...")
2. take_snapshot() → analyze structure
3. Find email input UID
4. fill(uid: "...", value: "test@example.com")
5. Find password input UID
6. fill(uid: "...", value: "password123")
7. Find submit button UID
8. click(uid: "...")
9. take_screenshot() for evidence
10. Report success/failure
`;

    return prompt;
  }

  async cleanup() {
    console.log('\nLimpiando...');

    // Cerrar página solo en web
    if (this.platform === 'web' && this.pageIndex !== null && this.mcpClient) {
      try {
        await this.mcpClient.callTool({
          name: 'close_page',
          arguments: { pageIdx: this.pageIndex }
        });
        console.log(`Página cerrada (índice: ${this.pageIndex})`);
      } catch (e) {
        console.log(`No se pudo cerrar la página: ${e.message}`);
      }
    }

    // Usar factory para cerrar cliente MCP
    if (this.mcpClientWrapper) {
      await MCPClientFactory.closeClient(this.mcpClientWrapper);
    }

    // Cleanup del LLM adapter
    if (this.llmAdapter && this.llmAdapter.cleanup) {
      await this.llmAdapter.cleanup();
    }

    console.log('Limpieza completada');
  }
}

module.exports = { UniversalTestRunnerCore };