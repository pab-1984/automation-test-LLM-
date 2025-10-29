#!/usr/bin/env node

// scripts/test-natural.js
// Script para ejecutar tests en lenguaje natural usando LLM + MCP directo
// NO requiere YAML, NO requiere selectores CSS

const { UniversalTestRunnerCore } = require('../runners/core/runner-core.js');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🚀 Test Natural - LLM + MCP Directo');
  console.log('─'.repeat(60));

  // Obtener instrucciones del usuario
  let instructions = '';

  // 1. Desde argumento de línea de comandos
  if (process.argv[2]) {
    const arg = process.argv[2];

    // Si es un archivo, leerlo
    if (fs.existsSync(arg)) {
      console.log(`📄 Leyendo instrucciones desde: ${arg}\n`);
      instructions = fs.readFileSync(arg, 'utf8');
    } else {
      // Es texto directo
      instructions = arg;
    }
  }

  // 2. Si no hay argumento, usar ejemplo por defecto
  if (!instructions) {
    console.log('⚠️  No se proporcionaron instrucciones\n');
    console.log('Uso:');
    console.log('  node scripts/test-natural.js "instrucciones aquí"');
    console.log('  node scripts/test-natural.js archivo.txt');
    console.log('  npm run test-natural "instrucciones aquí"\n');
    console.log('Usando ejemplo de demostración:\n');

    instructions = `
Navega a https://www.google.com

Busca el cuadro de búsqueda principal y escribe: "MCP protocol"

Presiona Enter o haz click en el botón de búsqueda

Espera a que carguen los resultados

Toma un screenshot como evidencia

Verifica que aparezcan resultados relacionados con "Model Context Protocol"
    `.trim();
  }

  const runner = new UniversalTestRunnerCore();

  try {
    // Inicializar (conecta MCP + LLM)
    await runner.initialize();

    console.log('');

    // Obtener opciones desde variables de entorno (si vienen del CLI)
    let testOptions = {
      maxIterations: 30,
      screenshotPerStep: false,
      captureLogs: true,
      captureNetwork: false,
      performanceMetrics: false
    };

    if (process.env.NATURAL_TEST_OPTIONS) {
      try {
        const envOptions = JSON.parse(process.env.NATURAL_TEST_OPTIONS);
        testOptions = { ...testOptions, ...envOptions };
      } catch (e) {
        console.log('⚠️  No se pudieron parsear opciones del entorno');
      }
    }

    console.log(`📋 Opciones de ejecución:`);
    console.log(`   - Screenshots por paso: ${testOptions.screenshotPerStep ? 'Sí' : 'No'}`);
    console.log(`   - Capturar logs: ${testOptions.captureLogs ? 'Sí' : 'No'}`);
    console.log(`   - Capturar network: ${testOptions.captureNetwork ? 'Sí' : 'No'}`);
    console.log(`   - Performance metrics: ${testOptions.performanceMetrics ? 'Sí' : 'No'}`);
    console.log('');

    // Ejecutar test en lenguaje natural
    const result = await runner.executeNaturalLanguageTest(instructions, testOptions);

    // Resultado
    if (result.success) {
      console.log('✅ Test EXITOSO');
      process.exit(0);
    } else {
      console.log('❌ Test FALLIDO');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Error fatal:', error.message);
    console.error(error.stack);
    process.exit(1);

  } finally {
    // Limpiar recursos
    await runner.cleanup();
  }
}

// Manejo de errores no capturados
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Error no manejado:', error);
  process.exit(1);
});

// Ejecutar
main();
