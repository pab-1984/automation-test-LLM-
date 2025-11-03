#!/usr/bin/env node

/**
 * Script de ejecución batch para todos los Mobile Tests
 * Ejecuta todas las suites de tests móviles y genera reporte consolidado
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 MOBILE TESTS - BATCH EXECUTION');
console.log('=' .repeat(70));
console.log('');

const testSuitesDir = path.join(__dirname, '..', 'tests', 'suites', 'mobile');

// Definir todas las suites de tests
const testSuites = {
  android: [
    'android/calculator-tests.yml',
    'android/chrome-tests.yml',
    'android/settings-tests.yml',
    'android/gmail-tests.yml',
    'android/gallery-tests.yml',
    'android/playstore-tests.yml'
  ],
  ios: [
    'ios/safari-tests.yml',
    'ios/notes-tests.yml',
    'ios/photos-tests.yml'
  ],
  common: [
    'common/gestures-tests.yml',
    'common/forms-tests.yml',
    'common/navigation-multiscreen-tests.yml'
  ]
};

// Configuración
const config = {
  continueOnError: true,  // Continuar aunque fallen tests
  generateReport: true,    // Generar reporte consolidado
  verbose: true,           // Mostrar output detallado
  platform: process.argv[2] || 'all'  // all, android, ios, common
};

console.log(`📋 Configuración:`);
console.log(`   Platform: ${config.platform}`);
console.log(`   Continue on Error: ${config.continueOnError}`);
console.log(`   Generate Report: ${config.generateReport}`);
console.log('');

// Estadísticas
const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: [],
  duration: 0,
  results: []
};

/**
 * Ejecuta una suite de tests
 */
function runTestSuite(suitePath, category) {
  const fullPath = path.join(testSuitesDir, suitePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  SKIPPED: ${suitePath} (file not found)`);
    stats.skipped++;
    return null;
  }

  console.log(`\n${'─'.repeat(70)}`);
  console.log(`📱 Running: ${suitePath}`);
  console.log(`${'─'.repeat(70)}\n`);

  const startTime = Date.now();
  const result = {
    suite: suitePath,
    category,
    status: 'unknown',
    duration: 0,
    error: null
  };

  try {
    const runnerPath = path.join(__dirname, '..', 'runners', 'mobile-runner.js');

    // Ejecutar el runner
    const output = execSync(
      `node "${runnerPath}" "${fullPath}"`,
      {
        encoding: 'utf8',
        stdio: config.verbose ? 'inherit' : 'pipe'
      }
    );

    result.status = 'passed';
    result.duration = Date.now() - startTime;
    stats.passed++;

    if (!config.verbose && output) {
      // Mostrar resumen si no está en modo verbose
      const lines = output.split('\n');
      const summaryLine = lines.find(l => l.includes('RESUMEN:') || l.includes('PASSED') || l.includes('FAILED'));
      if (summaryLine) {
        console.log(`   ${summaryLine.trim()}`);
      }
    }

  } catch (error) {
    result.status = 'failed';
    result.duration = Date.now() - startTime;
    result.error = error.message;
    stats.failed++;
    stats.errors.push({
      suite: suitePath,
      error: error.message
    });

    console.log(`\n❌ FAILED: ${suitePath}`);
    console.log(`   Error: ${error.message.split('\n')[0]}`);

    if (!config.continueOnError) {
      throw error;
    }
  }

  stats.total++;
  stats.duration += result.duration;
  stats.results.push(result);

  return result;
}

/**
 * Obtiene las suites a ejecutar según plataforma
 */
function getSuitesToRun() {
  if (config.platform === 'all') {
    return [
      ...testSuites.android.map(s => ({ path: s, category: 'android' })),
      ...testSuites.ios.map(s => ({ path: s, category: 'ios' })),
      ...testSuites.common.map(s => ({ path: s, category: 'common' }))
    ];
  } else if (testSuites[config.platform]) {
    return testSuites[config.platform].map(s => ({
      path: s,
      category: config.platform
    }));
  } else {
    console.error(`❌ Platform inválida: ${config.platform}`);
    console.log(`   Opciones: all, android, ios, common`);
    process.exit(1);
  }
}

/**
 * Genera reporte consolidado
 */
function generateReport() {
  if (!config.generateReport) return;

  console.log(`\n${'═'.repeat(70)}`);
  console.log('📊 REPORTE CONSOLIDADO');
  console.log(`${'═'.repeat(70)}\n`);

  // Agrupar por categoría
  const byCategory = {};
  stats.results.forEach(r => {
    if (!byCategory[r.category]) {
      byCategory[r.category] = { passed: 0, failed: 0, total: 0 };
    }
    byCategory[r.category].total++;
    if (r.status === 'passed') {
      byCategory[r.category].passed++;
    } else {
      byCategory[r.category].failed++;
    }
  });

  // Mostrar por categoría
  Object.keys(byCategory).forEach(category => {
    const cat = byCategory[category];
    const percentage = ((cat.passed / cat.total) * 100).toFixed(1);
    const icon = cat.failed === 0 ? '✅' : '⚠️';

    console.log(`${icon} ${category.toUpperCase()}`);
    console.log(`   Total: ${cat.total} suites`);
    console.log(`   Passed: ${cat.passed} (${percentage}%)`);
    console.log(`   Failed: ${cat.failed}`);
    console.log('');
  });

  // Resumen general
  const successRate = ((stats.passed / stats.total) * 100).toFixed(1);
  const avgDuration = (stats.duration / stats.total / 1000).toFixed(1);

  console.log(`${'─'.repeat(70)}`);
  console.log(`📈 RESUMEN GENERAL`);
  console.log(`${'─'.repeat(70)}`);
  console.log(`   Total Suites: ${stats.total}`);
  console.log(`   ✅ Passed: ${stats.passed}`);
  console.log(`   ❌ Failed: ${stats.failed}`);
  console.log(`   ⏭️  Skipped: ${stats.skipped}`);
  console.log(`   📊 Success Rate: ${successRate}%`);
  console.log(`   ⏱️  Total Duration: ${(stats.duration / 1000).toFixed(1)}s`);
  console.log(`   ⏱️  Avg Duration: ${avgDuration}s per suite`);
  console.log('');

  // Mostrar errores si hay
  if (stats.errors.length > 0) {
    console.log(`${'─'.repeat(70)}`);
    console.log(`❌ ERRORES ENCONTRADOS (${stats.errors.length})`);
    console.log(`${'─'.repeat(70)}`);
    stats.errors.forEach((err, i) => {
      console.log(`\n${i + 1}. ${err.suite}`);
      console.log(`   ${err.error.split('\n')[0]}`);
    });
    console.log('');
  }

  // Guardar reporte JSON
  const reportPath = path.join(__dirname, '..', 'results', `batch-report-${Date.now()}.json`);
  const reportData = {
    timestamp: new Date().toISOString(),
    platform: config.platform,
    stats,
    byCategory,
    config
  };

  // Crear directorio results si no existe
  const resultsDir = path.dirname(reportPath);
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  console.log(`💾 Reporte guardado en: ${reportPath}`);
  console.log('');

  return reportData;
}

/**
 * Main execution
 */
async function main() {
  const startTime = Date.now();

  try {
    const suitesToRun = getSuitesToRun();

    console.log(`🎯 Tests a ejecutar: ${suitesToRun.length} suites\n`);

    // Ejecutar cada suite
    for (const suite of suitesToRun) {
      runTestSuite(suite.path, suite.category);
    }

    // Generar reporte
    const report = generateReport();

    // Código de salida
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`${'═'.repeat(70)}`);
    if (stats.failed === 0 && stats.errors.length === 0) {
      console.log(`✅ EJECUCIÓN COMPLETADA EXITOSAMENTE (${totalDuration}s)`);
      console.log(`${'═'.repeat(70)}\n`);
      process.exit(0);
    } else {
      console.log(`⚠️  EJECUCIÓN COMPLETADA CON ERRORES (${totalDuration}s)`);
      console.log(`${'═'.repeat(70)}\n`);
      process.exit(1);
    }

  } catch (error) {
    console.error(`\n❌ ERROR FATAL: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ayuda
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
USO:
  node scripts/run-all-mobile-tests.js [platform]

PARÁMETROS:
  platform    Plataforma a ejecutar: all, android, ios, common
              Por defecto: all

EJEMPLOS:
  node scripts/run-all-mobile-tests.js              # Ejecutar todos
  node scripts/run-all-mobile-tests.js android      # Solo Android
  node scripts/run-all-mobile-tests.js ios          # Solo iOS
  node scripts/run-all-mobile-tests.js common       # Solo Common

OPCIONES:
  --help, -h  Mostrar esta ayuda

NOTAS:
  - Los tests fallan de manera independiente (continueOnError: true)
  - Se genera reporte JSON consolidado en results/
  - Usa --verbose en runners individuales para más detalle
`);
  process.exit(0);
}

// Ejecutar
main();
