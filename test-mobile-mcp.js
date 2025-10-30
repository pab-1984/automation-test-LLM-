// test-mobile-mcp.js
// Script de prueba para explorar herramientas de mobile-mcp

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const path = require('path');

async function testMobileMCP() {
  console.log('🔌 Conectando a mobile-mcp...\n');

  try {
    // Path to mobile-mcp executable
    const serverPath = path.resolve(__dirname, 'node_modules/@mobilenext/mobile-mcp/lib/index.js');

    // Create transport with command and args
    const transport = new StdioClientTransport({
      command: 'node',
      args: [serverPath, '--stdio'],
      env: {
        ...process.env,
        PATH: process.env.PATH + ';' + process.env.LOCALAPPDATA + '\\Android\\Sdk\\platform-tools'
      }
    });

    // Create client
    const client = new Client({
      name: 'mobile-mcp-tester',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    // Connect
    await client.connect(transport);
    console.log('✅ Conectado a mobile-mcp\n');

    // List tools
    const tools = await client.listTools();
    console.log('📋 Herramientas disponibles:\n');
    console.log('Total:', tools.tools.length, 'herramientas\n');

    tools.tools.forEach((tool, index) => {
      console.log(`${index + 1}. ${tool.name}`);
      console.log(`   Descripción: ${tool.description || 'N/A'}`);

      if (tool.inputSchema && tool.inputSchema.properties) {
        console.log(`   Parámetros:`);
        Object.keys(tool.inputSchema.properties).forEach(param => {
          const prop = tool.inputSchema.properties[param];
          const required = tool.inputSchema.required?.includes(param) ? ' (requerido)' : '';
          console.log(`     - ${param}${required}: ${prop.description || prop.type}`);
        });
      }
      console.log('');
    });

    // List devices
    console.log('\n📱 Probando mobile_list_available_devices...\n');
    const devicesResult = await client.callTool({
      name: 'mobile_list_available_devices',
      arguments: { noParams: {} }
    });
    console.log('Resultado:');
    console.log(JSON.stringify(devicesResult, null, 2));

    // Cleanup
    await client.close();

    console.log('\n✅ Test completado exitosamente');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testMobileMCP();
