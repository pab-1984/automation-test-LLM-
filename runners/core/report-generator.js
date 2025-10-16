// runners/core/report-generator.js
const fs = require('fs');

class ReportGenerator {
  async generateReport(runner) {
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

    // Generar reporte Markdown
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

    for (const test of runner.results.tests) {
      const icon = test.status === 'PASS' ? '✅' : '❌';
      markdown += `### ${icon} ${test.name}\n\n`;
      markdown += `- **Estado**: ${test.status}\n`;
      markdown += `- **Duración**: ${test.duration}ms\n`;
      markdown += `- **Resultado esperado**: ${test.expectedResult}\n`;
      
      if (test.status === 'FAIL') {
        markdown += `- **Error**: 	este.error}
`;
        if (test.screenshot) {
          markdown += `- **Screenshot**: [Ver captura](${test.screenshot})\n`;
        }
      }

      markdown += `\n`;
    }

    // Guardar reporte
    const reportPath = `./tests/results/reporte-${Date.now()}.md`;
    fs.writeFileSync(reportPath, markdown);
    console.log(`\n📄 Reporte guardado: ${reportPath}\n`);
  }
}

module.exports = { ReportGenerator };
