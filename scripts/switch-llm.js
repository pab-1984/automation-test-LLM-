// scripts/switch-llm.js
// Script para cambiar fácilmente entre diferentes LLMs

const fs = require('fs');
const path = require('path');

const configPath = './config/llm.config.json';

function switchLLM(provider) {
  if (!fs.existsSync(configPath)) {
    console.error('❌ Archivo de configuración no encontrado:', configPath);
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  // Verificar que el proveedor existe
  if (!config.providers[provider]) {
    console.error(`❌ Proveedor '${provider}' no existe en la configuración`);
    console.log('\nProveedores disponibles:');
    Object.keys(config.providers).forEach(p => {
      const enabled = config.providers[p].enabled ? '✅' : '❌';
      const active = p === config.activeProvider ? ' (ACTIVO)' : '';
      console.log(`  ${enabled} ${p}${active}`);
    });
    process.exit(1);
  }

  // Verificar que está habilitado
  if (!config.providers[provider].enabled) {
    console.log(`⚠️  Proveedor '${provider}' está deshabilitado. Habilitándolo...`);
    config.providers[provider].enabled = true;
  }

  // Cambiar proveedor activo
  const previousProvider = config.activeProvider;
  config.activeProvider = provider;

  // Guardar configuración
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  console.log('\n' + '='.repeat(50));
  console.log('✅ LLM cambiado exitosamente');
  console.log('='.repeat(50));
  console.log(`📤 Anterior: ${previousProvider}`);
  console.log(`📥 Nuevo: ${provider}`);
  console.log('='.repeat(50));
  
  // Mostrar información del proveedor
  const providerConfig = config.providers[provider];
  console.log('\n📋 Configuración del proveedor:');
  if (providerConfig.model) {
    console.log(`   Modelo: ${providerConfig.model}`);
  }
  if (providerConfig.baseUrl) {
    console.log(`   URL: ${providerConfig.baseUrl}`);
  }
  if (providerConfig.temperature !== undefined) {
    console.log(`   Temperatura: ${providerConfig.temperature}`);
  }

  // Dar instrucciones específicas según el proveedor
  console.log('\n💡 Siguiente paso:');
  switch (provider) {
    case 'ollama':
      console.log('   1. Asegúrate de que Ollama esté corriendo: ollama serve');
      console.log(`   2. Verifica que tengas el modelo: ollama list`);
      console.log(`   3. Si no lo tienes: ollama pull ${providerConfig.model}`);
      break;
    case 'gemini':
      console.log('   1. Verifica tu autenticación: gemini auth status');
      console.log('   2. Si no estás autenticado: gemini auth login');
      console.log('   ⚠️  Recuerda la cuota diaria limitada');
      break;
    case 'openai':
      console.log('   1. Configura tu API key: export OPENAI_API_KEY=tu_key');
      console.log('   2. O agrégala a .env');
      console.log('   ⚠️  Este proveedor tiene costo');
      break;
    case 'anthropic':
      console.log('   1. Configura tu API key: export ANTHROPIC_API_KEY=tu_key');
      console.log('   2. O agrégala a .env');
      console.log('   ⚠️  Este proveedor tiene costo');
      break;
  }

  console.log('\n🚀 Ahora puedes ejecutar tus tests:');
  console.log('   node runners/universal-runner.js tests/suites/tu-suite.yml');
  console.log('   o: npm test\n');
}

function showStatus() {
  if (!fs.existsSync(configPath)) {
    console.error('❌ Archivo de configuración no encontrado');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  console.log('\n' + '='.repeat(50));
  console.log('📊 Estado de Proveedores LLM');
  console.log('='.repeat(50));

  Object.entries(config.providers).forEach(([name, pConfig]) => {
    const enabled = pConfig.enabled ? '✅' : '❌';
    const active = name === config.activeProvider ? ' ⭐ ACTIVO' : '';
    console.log(`\n${enabled} ${name.toUpperCase()}${active}`);
    if (pConfig.model) console.log(`   Modelo: ${pConfig.model}`);
    if (pConfig.baseUrl) console.log(`   URL: ${pConfig.baseUrl}`);
  });

  console.log('\n' + '='.repeat(50));
  console.log(`\n💡 Para cambiar: npm run switch-llm <provider>`);
  console.log('   Ejemplo: npm run switch-llm ollama\n');
}

// Main
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === 'status') {
  showStatus();
} else {
  const provider = args[0].toLowerCase();
  switchLLM(provider);
}