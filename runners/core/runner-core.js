// runners/core/runner-core.js
const fs = require('fs');
const yaml = require('js-yaml');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { TestExecutor } = require('./test-executor.js');
const { ReportGenerator } = require('./report-generator.js');
const { BrowserActions } = require('../actions/browser-actions.js');
const { VariableReplacer } = require('../actions/variable-replacer.js');
const { LLMProcessor } = require('../llm/llm-processor.js');
const { ElementFinder } = require('../actions/element-finder.js');

class UniversalTestRunnerCore extends TestExecutor {
  constructor(configPath = './config/llm.config.json') {
    super();
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
    
    // Inicializar utilidades
    this.elementFinder = new ElementFinder();
    this.variableReplacer = new VariableReplacer();
    this.browserActions = new BrowserActions();
    this.reportGenerator = new ReportGenerator();
    this.llmProcessor = new LLMProcessor();
  }

  async initialize() {
    console.log('Iniciando Universal Test Runner (Modo MCP)...');
    
    const activeProvider = this.config.activeProvider;
    console.log(`Proveedor activo: ${activeProvider}`);
    
    const AdapterClass = require(`../adapters/${activeProvider}.adapter.js`);
    this.llmAdapter = new AdapterClass(this.config.providers[activeProvider]);
    await this.llmAdapter.initialize();
    console.log(`LLM ${activeProvider} inicializado
`);

    console.log('Conectando al servidor MCP de Chrome DevTools...');
    
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
    console.log('Conectado al servidor MCP de Chrome DevTools');

    const toolsResult = await this.mcpClient.listTools();
    console.log(`Herramientas MCP disponibles (${toolsResult.tools.length}):`);
    toolsResult.tools.slice(0, 5).forEach(tool => {
      console.log(`   - ${tool.name}`);
    });
    if (toolsResult.tools.length > 5) {
      console.log(`   ... y ${toolsResult.tools.length - 5} más
`);
    }

    console.log('Creando nueva página en el navegador...');
    console.log('   Llamando a new_page con url="about:blank"...');
    
    try {
      const newPageResult = await this.mcpClient.callTool({
        name: 'new_page',
        arguments: { url: 'about:blank' }
      });
      
      console.log('   Resultado completo de new_page:');
      console.log(JSON.stringify(newPageResult, null, 2));
      
      if (newPageResult.content && newPageResult.content[0]) {
        const resultText = newPageResult.content[0].text;
        console.log('   Texto del resultado:', resultText);
        
        const match = resultText.match(/^(\d+):[\s\S]*?\[selected\]/m);
        
        if (match) {
          this.pageIndex = parseInt(match[1]);
          console.log(`Página creada (índice: ${this.pageIndex})`);
        } else {
          console.log('No se pudo extraer pageIdx del resultado usando regex.');
        }
      } else {
        console.log('newPageResult no tiene el formato esperado');
      }
      
      console.log('\n   Verificando páginas disponibles...');
      const pagesListResult = await this.mcpClient.callTool({
        name: 'list_pages',
        arguments: {}
      });
      console.log('   Páginas actuales:', pagesListResult.content[0]?.text);
      
    } catch (error) {
      console.error('Error al crear página:', error);
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

  async cleanup() {
    console.log('\nLimpiando...');
    
    if (this.pageIndex !== null && this.mcpClient) {
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
    
    if (this.mcpClient) {
      await this.mcpClient.close();
      console.log('Cliente MCP cerrado');
    }
    
    if (this.llmAdapter && this.llmAdapter.cleanup) {
      await this.llmAdapter.cleanup();
    }
    
    console.log('Limpieza completada');
  }
}

module.exports = { UniversalTestRunnerCore };