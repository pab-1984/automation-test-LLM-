// test-mcp-web.js
// Script de validación para cliente MCP Web

const { MCPClientFactory } = require('./runners/core/mcp-client-factory.js');

console.log('🧪 TEST: Inicialización de MCP Web Client\n');
console.log('=' .repeat(60));

async function testWebClient() {
  let clientWrapper = null;

  try {
    console.log('\n1️⃣ Creando cliente MCP para WEB...\n');

    clientWrapper = await MCPClientFactory.createClient('web', {
      chromePath: process.env.CHROME_PATH || ''
    });

    console.log('\n✅ Cliente MCP Web creado exitosamente\n');

    // Mostrar información del cliente
    const info = MCPClientFactory.getClientInfo(clientWrapper);
    console.log('📊 Información del cliente:');
    console.log(`   Platform: ${info.platform}`);
    console.log(`   Page Index: ${info.pageIndex}`);
    console.log(`   Capacidades disponibles (${info.capabilities.length}):`);
    info.capabilities.forEach(cap => {
      console.log(`      ✓ ${cap}`);
    });

    console.log('\n2️⃣ Probando herramienta básica (list_pages)...\n');

    // Probar una herramienta simple
    const result = await clientWrapper.client.callTool({
      name: 'list_pages',
      arguments: {}
    });

    console.log('✅ Herramienta ejecutada correctamente');
    console.log('\nRespuesta:');
    if (result.content && result.content[0]) {
      console.log(result.content[0].text);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ VALIDACIÓN EXITOSA: MCP Web Client funciona correctamente');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ ERROR en la validación:');
    console.error('='.repeat(60));
    console.error(`\nError: ${error.message}`);
    console.error(`\nStack: ${error.stack}`);
    console.error('\n💡 POSIBLES SOLUCIONES:');
    console.error('   1. Verifica que Chrome esté instalado');
    console.error('   2. Verifica la ruta en mcp-client-factory.js');
    console.error('   3. Reinstala chrome-devtools-mcp: npm install chrome-devtools-mcp');
    console.error('   4. Verifica la versión de Node.js (requiere 20.19+ o 22.12+)');
    process.exit(1);
  } finally {
    // Limpiar
    if (clientWrapper) {
      console.log('\n🧹 Cerrando cliente...');
      await MCPClientFactory.closeClient(clientWrapper);
    }
  }
}

// Ejecutar test
testWebClient().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
