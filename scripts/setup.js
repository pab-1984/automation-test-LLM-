// scripts/setup.js
// Script para configuración inicial del proyecto

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

console.log('🚀 Configuración inicial del proyecto\n');

async function setup() {
  // 1. Verificar estructura de carpetas
  console.log('📁 Verificando estructura de carpetas...');
  const folders = [
    './config',
    './config/providers',
    './prompts',
    './runners',
    './runners/adapters',
    './scripts',
    './tests',
    './tests/suites',
    './tests/results',
    './tests/screenshots',
    './tests/videos'
  ];

  folders.forEach(folder => {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
      console.log(`   ✓ Creada: ${folder}`);
    } else {
      console.log(`   ✓ Existe: ${folder}`);
    }
  });

  // 2. Verificar archivos de configuración
  console.log('\n📝 Verificando archivos de configuración...');
  
  const requiredFiles = [
    './config/llm.config.json',
    './prompts/system.md',
    './runners/universal-runner.js',
    './runners/adapters/ollama.adapter.js',
    './runners/adapters/gemini.adapter.js',
    './scripts/switch-llm.js'
  ];

  let missingFiles = [];
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`   ✓ ${file}`);
    } else {
      console.log(`   ❌ FALTA: ${file}`);
      missingFiles.push(file);
    }
  });

  if (missingFiles.length > 0) {
    console.log('\n⚠️  Archivos faltantes detectados.');
    console.log('   Por favor, crea estos archivos usando los artifacts proporcionados.\n');
    return;
  }

  // 3. Verificar Node.js y npm
  console.log('\n🔧 Verificando herramientas...');
  try {
    const { stdout: nodeVersion } = await execAsync('node --version');
    console.log(`   ✓ Node.js: ${nodeVersion.trim()}`);
  } catch (error) {
    console.log('   ❌ Node.js no encontrado');
    return;
  }

  // 4. Verificar/instalar dependencias
  console.log('\n📦 Verificando dependencias...');
  if (!fs.existsSync('./node_modules')) {
    console.log('   Instalando dependencias...');
    try {
      await execAsync('npm install');
      console.log('   ✓ Dependencias instaladas');
    } catch (error) {
      console.log('   ❌ Error instalando dependencias:', error.message);
      return;
    }
  } else {
    console.log('   ✓ Dependencias ya instaladas');
  }

  // 5. Verificar Playwright
  console.log('\n🌐 Verificando navegadores...');
  try {
    await execAsync('npx playwright --version');
    console.log('   ✓ Playwright instalado');
    
    // Instalar navegadores si no existen
    console.log('   Instalando navegador Chromium (puede tardar)...');
    await execAsync('npx playwright install chromium');
    console.log('   ✓ Chromium instalado');
  } catch (error) {
    console.log('   ⚠️  Error con Playwright:', error.message);
  }

  // 6. Detectar LLMs disponibles
  console.log('\n🤖 Detectando LLMs disponibles...');
  
  // Verificar Ollama
  try {
    await execAsync('ollama --version');
    console.log('   ✓ Ollama instalado');
    
    try {
      const { stdout } = await execAsync('ollama list');
      console.log('   Modelos disponibles:');
      const lines = stdout.split('\n').filter(l => l.trim());
      lines.slice(1, 4).forEach(line => {
        const model = line.split(/\s+/)[0];
        if (model) console.log(`     - ${model}`);
      });
    } catch (error) {
      console.log('   ⚠️  Ollama instalado pero no hay modelos');
      console.log('   Sugerencia: ollama pull llama3.2:3b');
    }
  } catch (error) {
    console.log('   ❌ Ollama no instalado');
    console.log('   Descarga: https://ollama.com/download');
  }

  // Verificar Gemini CLI
  try {
    await execAsync('gemini --version');
    console.log('   ✓ Gemini CLI instalado');
    
    try {
      await execAsync('gemini auth status');
      console.log('   ✓ Autenticado con Gemini');
    } catch (error) {
      console.log('   ⚠️  Gemini CLI instalado pero no autenticado');
      console.log('   Ejecuta: gemini auth login');
    }
  } catch (error) {
    console.log('   ❌ Gemini CLI no instalado');
    console.log('   Instala: npm install -g @google/genai-cli');
  }

  // 7. Resumen y siguientes pasos
  console.log('\n' + '='.repeat(60));
  console.log('✅ SETUP COMPLETADO');
  console.log('='.repeat(60));
  
  console.log('\n📋 Siguientes pasos:\n');
  console.log('1. Elige tu LLM:');
  console.log('   npm run switch-llm ollama');
  console.log('   # o');
  console.log('   npm run switch-llm gemini\n');
  
  console.log('2. Si usas Ollama, inícialo:');
  console.log('   ollama serve\n');
  
  console.log('3. Inicia tu aplicación web:');
  console.log('   npm start\n');
  
  console.log('4. Ejecuta tus tests:');
  console.log('   npm test tests/suites/tu-suite.yml\n');
  
  console.log('💡 Ver estado: npm run status');
  console.log('📚 Ayuda: cat README.md\n');
}

setup().catch(error => {
  console.error('❌ Error en setup:', error);
  process.exit(1);
});