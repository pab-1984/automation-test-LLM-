#!/usr/bin/env node

/**
 * Script de migración de reportes legacy (archivos .md) a base de datos
 *
 * Uso:
 *   node scripts/migrate-reports-to-db.js [--dry-run]
 *
 * Opciones:
 *   --dry-run    Mostrar qué se haría sin modificar la base de datos
 *   --delete     Eliminar archivos .md después de migrar (por defecto: false)
 */

const fs = require('fs');
const path = require('path');
const { getDatabase } = require('../database/db');

const RESULTS_DIR = './tests/results';
const SCREENSHOTS_DIR = './tests/screenshots';

class ReportMigrator {
  constructor(options = {}) {
    this.options = {
      dryRun: options.dryRun || false,
      deleteFiles: options.deleteFiles || false
    };
    this.db = getDatabase();
    this.stats = {
      total: 0,
      migrated: 0,
      skipped: 0,
      errors: 0
    };
  }

  async run() {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  📦 MIGRACIÓN DE REPORTES LEGACY A BASE DE DATOS        ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    if (this.options.dryRun) {
      console.log('🔍 Modo DRY-RUN: No se modificará la base de datos\n');
    }

    // Verificar que exista el directorio de resultados
    if (!fs.existsSync(RESULTS_DIR)) {
      console.log('⚠️  Directorio de resultados no encontrado:', RESULTS_DIR);
      return;
    }

    // Obtener lista de archivos .md
    const files = fs.readdirSync(RESULTS_DIR)
      .filter(file => file.endsWith('.md'))
      .sort();

    this.stats.total = files.length;

    console.log(`📄 Encontrados ${files.length} reportes para migrar\n`);
    console.log('─'.repeat(60));

    for (const file of files) {
      await this.migrateReport(file);
    }

    this.printSummary();
  }

  async migrateReport(filename) {
    const filePath = path.join(RESULTS_DIR, filename);

    try {
      // Leer contenido del archivo
      const content = fs.readFileSync(filePath, 'utf8');

      // Extraer metadata del archivo
      const metadata = this.parseReportContent(content, filename);

      console.log(`\n📝 ${filename}`);
      console.log(`   Suite: ${metadata.suite}`);
      console.log(`   Fecha: ${metadata.date}`);
      console.log(`   Estado: ${metadata.status}`);

      // Verificar si ya existe en DB (por timestamp)
      const timestamp = filename.match(/reporte-(\d+)\.md/)?.[1];
      if (timestamp) {
        const existingExecutions = this.db.getAllExecutions();
        const exists = existingExecutions.some(ex => {
          const exTime = new Date(ex.started_at).getTime();
          return Math.abs(exTime - parseInt(timestamp)) < 5000;
        });

        if (exists) {
          console.log('   ⏩ Ya existe en base de datos, omitiendo...');
          this.stats.skipped++;
          return;
        }
      }

      if (!this.options.dryRun) {
        // Crear test en DB si no existe
        let testRecord = this.findOrCreateTest(metadata.suite, filePath);

        // Crear ejecución
        const execution = this.db.createExecution(testRecord.id, 'direct');

        // Actualizar ejecución con datos parseados
        this.db.saveExecutionReport(execution.id, {
          status: metadata.status,
          duration: metadata.duration,
          consoleLogs: [],
          networkRequests: [],
          performanceData: {},
          steps: metadata.steps,
          errorMessage: metadata.status === 'failed' ? 'Migrado desde reporte legacy' : null
        });

        // Registrar archivo .md como evidencia
        this.db.createEvidence(execution.id, 'report', filePath, {
          format: 'markdown',
          suite: metadata.suite,
          legacy: true,
          migrated_at: new Date().toISOString()
        });

        // Buscar screenshots asociados
        await this.migrateAssociatedScreenshots(execution.id, timestamp);

        console.log(`   ✅ Migrado (execution_id: ${execution.id})`);
        this.stats.migrated++;

        // Eliminar archivo si se solicitó
        if (this.options.deleteFiles) {
          fs.unlinkSync(filePath);
          console.log('   🗑️  Archivo eliminado');
        }
      } else {
        console.log('   ✓ Listo para migrar');
        this.stats.migrated++;
      }

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      this.stats.errors++;
    }
  }

  parseReportContent(content, filename) {
    const metadata = {
      suite: 'Unknown',
      date: new Date(),
      status: 'success',
      duration: 0,
      passed: 0,
      failed: 0,
      steps: []
    };

    // Extraer suite
    const suiteMatch = content.match(/\*\*Suite\*\*:\s*(.+)/);
    if (suiteMatch) metadata.suite = suiteMatch[1].trim();

    // Extraer fecha
    const dateMatch = content.match(/\*\*Fecha\*\*:\s*(.+)/);
    if (dateMatch) {
      try {
        metadata.date = new Date(dateMatch[1].trim());
      } catch (e) {
        // Usar fecha del archivo si falla el parsing
        const stats = fs.statSync(path.join(RESULTS_DIR, filename));
        metadata.date = stats.mtime;
      }
    }

    // Extraer métricas
    const passedMatch = content.match(/✅ Exitosas\s*\|\s*(\d+)/);
    const failedMatch = content.match(/❌ Fallidas\s*\|\s*(\d+)/);
    const durationMatch = content.match(/⏱️ Duración\s*\|\s*([\d.]+)s/);

    if (passedMatch) metadata.passed = parseInt(passedMatch[1]);
    if (failedMatch) metadata.failed = parseInt(failedMatch[1]);
    if (durationMatch) metadata.duration = parseFloat(durationMatch[1]) * 1000; // convertir a ms

    metadata.status = metadata.failed > 0 ? 'failed' : 'success';

    // Extraer pasos
    const stepRegex = /###\s*(✅|❌)\s*(.+?)\n\n-\s*\*\*Estado\*\*:\s*(\w+)\n-\s*\*\*Duración\*\*:\s*(\d+)ms\n-\s*\*\*Resultado esperado\*\*:\s*(.+?)(?:\n-\s*\*\*Error\*\*:\s*(.+?))?(?=\n\n|$)/gs;

    let match;
    while ((match = stepRegex.exec(content)) !== null) {
      metadata.steps.push({
        name: match[2].trim(),
        status: match[3],
        duration: parseInt(match[4]),
        expectedResult: match[5].trim(),
        error: match[6] ? match[6].trim() : null
      });
    }

    return metadata;
  }

  findOrCreateTest(suiteName, filePath) {
    const existingTests = this.db.getAllTests();
    let testRecord = existingTests.find(t => t.file_path === filePath);

    if (!testRecord) {
      testRecord = this.db.createTest(
        1, // suite_id por defecto
        suiteName,
        'yaml',
        filePath,
        'Migrado desde reporte legacy',
        ''
      );
    }

    return testRecord;
  }

  async migrateAssociatedScreenshots(executionId, timestamp) {
    if (!timestamp || !fs.existsSync(SCREENSHOTS_DIR)) return;

    try {
      const screenshotFiles = fs.readdirSync(SCREENSHOTS_DIR)
        .filter(file => {
          const fileTime = file.match(/(\d+)\.(png|txt|json)/)?.[1];
          return fileTime && Math.abs(parseInt(fileTime) - parseInt(timestamp)) < 10000;
        });

      for (const file of screenshotFiles) {
        const filePath = path.join(SCREENSHOTS_DIR, file);
        let type = 'screenshot';

        if (file.endsWith('.txt')) type = 'log';
        else if (file.endsWith('.json')) type = 'log';

        this.db.createEvidence(executionId, type, filePath, {
          associated_with_report: true,
          migrated_at: new Date().toISOString()
        });

        console.log(`   📎 Screenshot/log asociado: ${file}`);
      }
    } catch (error) {
      console.warn(`   ⚠️  Error migrando screenshots: ${error.message}`);
    }
  }

  printSummary() {
    console.log('\n' + '═'.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('═'.repeat(60));
    console.log(`Total archivos:     ${this.stats.total}`);
    console.log(`✅ Migrados:        ${this.stats.migrated}`);
    console.log(`⏩ Omitidos:        ${this.stats.skipped}`);
    console.log(`❌ Errores:         ${this.stats.errors}`);
    console.log('═'.repeat(60));

    if (this.options.dryRun) {
      console.log('\n💡 Ejecuta sin --dry-run para realizar la migración');
    } else {
      console.log('\n✅ Migración completada');

      if (!this.options.deleteFiles) {
        console.log('💡 Los archivos .md originales se mantienen como respaldo');
        console.log('   Usa --delete para eliminarlos después de verificar la migración');
      }
    }
  }
}

// Ejecutar migración
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    deleteFiles: args.includes('--delete')
  };

  const migrator = new ReportMigrator(options);

  migrator.run()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { ReportMigrator };
