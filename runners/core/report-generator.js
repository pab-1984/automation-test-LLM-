// runners/core/report-generator.js
const fs = require('fs');
const path = require('path');
const { getDatabase } = require('../../database/db');

class ReportGenerator {
  constructor() {
    this.db = getDatabase();
  }

  async generateReport(runner, executionId = null) {
    const duration = runner.results.endTime - runner.results.startTime;
    const totalTests = runner.results.passed + runner.results.failed + runner.results.skipped;
    const successRate = totalTests > 0 ? ((runner.results.passed / totalTests) * 100).toFixed(1) : 0;

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE RESULTADOS');
    console.log('='.repeat(60));
    console.log(`✅ Exitosas: ${runner.results.passed}`);
    console.log(`❌ Fallidas: ${runner.results.failed}`);
    console.log(`📈 Tasa de éxito: ${successRate}%`);
    console.log(`⏱️  Duración total: ${(duration / 1000).toFixed(2)}s`);
    console.log('='.repeat(60));

    // Generar reporte Markdown (para compatibilidad)
    let markdown = `# 📊 Reporte de Testing\n\n`;
    markdown += `**Suite**: ${runner.results.suite}\n`;
    markdown += `**Fecha**: ${runner.results.endTime.toLocaleString()}\n`;
    markdown += `**LLM**: ${runner.config.activeProvider}\n\n`;

    markdown += `## Resumen Ejecutivo\n\n`;
    markdown += `| Métrica | Valor |\n`;
    markdown += `|---------|-------|\n`;
    markdown += `| ✅ Exitosas | ${runner.results.passed} |\n`;
    markdown += `| ❌ Fallidas | ${runner.results.failed} |\n`;
    markdown += `| 📈 Tasa de éxito | ${successRate}% |\n`;
    markdown += `| ⏱️ Duración | ${(duration / 1000).toFixed(2)}s |\n\n`;

    markdown += `## Detalle de Pruebas\n\n`;

    const steps = [];
    for (const test of runner.results.tests) {
      const icon = test.status === 'PASS' ? '✅' : '❌';
      markdown += `### ${icon} ${test.name}\n\n`;
      markdown += `- **Estado**: ${test.status}\n`;
      markdown += `- **Duración**: ${test.duration}ms\n`;
      markdown += `- **Resultado esperado**: ${test.expectedResult}\n`;

      if (test.status === 'FAIL') {
        markdown += `- **Error**: ${test.error}\n`;
        if (test.screenshot) {
          markdown += `- **Screenshot**: [Ver captura](${test.screenshot})\n`;
        }
      }

      // Construir estructura de steps para la DB
      steps.push({
        name: test.name,
        status: test.status,
        duration: test.duration,
        expectedResult: test.expectedResult,
        error: test.error || null,
        screenshot: test.screenshot || null
      });

      markdown += `\n`;
    }

    // Guardar reporte Markdown (para retrocompatibilidad y backup)
    const reportPath = `./tests/results/reporte-${Date.now()}.md`;
    try {
      fs.writeFileSync(reportPath, markdown);
      console.log(`\n📄 Reporte Markdown guardado: ${reportPath}`);
    } catch (err) {
      console.warn('⚠️  No se pudo guardar el reporte Markdown:', err.message);
    }

    // Guardar en base de datos
    if (executionId) {
      try {
        const status = runner.results.failed > 0 ? 'failed' : 'success';

        // Guardar reporte completo en DB
        this.db.saveExecutionReport(executionId, {
          status,
          duration,
          consoleLogs: runner.consoleLogs || [],
          networkRequests: runner.networkRequests || [],
          performanceData: runner.performanceData || {},
          steps,
          errorMessage: runner.results.failed > 0 ? 'Uno o más tests fallaron' : null
        });

        // Registrar el reporte Markdown como evidencia
        this.db.createEvidence(executionId, 'report', reportPath, {
          format: 'markdown',
          suite: runner.results.suite,
          provider: runner.config.activeProvider,
          totalTests,
          passed: runner.results.passed,
          failed: runner.results.failed,
          successRate: parseFloat(successRate)
        });

        console.log(`💾 Reporte guardado en base de datos (execution_id: ${executionId})`);
      } catch (err) {
        console.error('❌ Error guardando reporte en base de datos:', err.message);
        console.error(err.stack);
      }
    } else {
      console.log('ℹ️  No se proporcionó executionId, reporte solo guardado en archivo');
    }
  }

  // Método para generar reporte HTML desde la DB
  generateHTMLReport(executionId) {
    const report = this.db.getExecutionReport(executionId);
    if (!report) {
      throw new Error(`No se encontró ejecución con id ${executionId}`);
    }

    const logs = report.logs || { steps: [] };
    const evidences = report.evidences || [];

    let html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte de Testing - ${report.test_name}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
    .metric { background: #ecf0f1; padding: 15px; border-radius: 5px; text-align: center; }
    .metric .value { font-size: 2em; font-weight: bold; color: #2c3e50; }
    .metric .label { color: #7f8c8d; margin-top: 5px; }
    .test { background: white; border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }
    .test.pass { border-left: 4px solid #27ae60; }
    .test.fail { border-left: 4px solid #e74c3c; }
    .evidence { margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 3px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Reporte de Testing</h1>
    <p><strong>Test:</strong> ${report.test_name}</p>
    <p><strong>Fecha:</strong> ${new Date(report.started_at).toLocaleString()}</p>
    <p><strong>Duración:</strong> ${(report.duration / 1000).toFixed(2)}s</p>
  </div>

  <div class="summary">
    <div class="metric">
      <div class="value">${report.status === 'success' ? '✅' : '❌'}</div>
      <div class="label">Estado</div>
    </div>
    <div class="metric">
      <div class="value">${logs.steps ? logs.steps.length : 0}</div>
      <div class="label">Pasos Ejecutados</div>
    </div>
    <div class="metric">
      <div class="value">${evidences.length}</div>
      <div class="label">Evidencias</div>
    </div>
  </div>

  <h2>Detalle de Pasos</h2>`;

    for (const step of logs.steps || []) {
      const statusClass = step.status === 'PASS' ? 'pass' : 'fail';
      html += `
  <div class="test ${statusClass}">
    <h3>${step.status === 'PASS' ? '✅' : '❌'} ${step.name}</h3>
    <p><strong>Duración:</strong> ${step.duration}ms</p>
    <p><strong>Resultado esperado:</strong> ${step.expectedResult}</p>`;

      if (step.error) {
        html += `<p style="color: #e74c3c;"><strong>Error:</strong> ${step.error}</p>`;
      }

      html += `</div>`;
    }

    html += `
  <h2>Evidencias</h2>`;

    for (const evidence of evidences) {
      const metadata = evidence.metadata ? JSON.parse(evidence.metadata) : {};
      html += `
  <div class="evidence">
    <strong>${evidence.type.toUpperCase()}:</strong> ${path.basename(evidence.file_path)}
    ${metadata ? `<br><small>${JSON.stringify(metadata)}</small>` : ''}
  </div>`;
    }

    html += `
</body>
</html>`;

    return html;
  }
}

module.exports = { ReportGenerator };
