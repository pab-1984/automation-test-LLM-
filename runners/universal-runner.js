// runners/universal-runner.js
// Punto de entrada principal del runner universal

const { UniversalTestRunnerCore } = require('./core/runner-core.js');

if (require.main === module) {
  // Parsear argumentos
  const suiteFile = process.argv[2] || './tests/suites/ecommerce-suite.yml';
  const options = {
    recompile: process.argv.includes('--recompile') || process.argv.includes('-r')
  };

  const runner = new UniversalTestRunnerCore();

  runner.initialize()
    .then(() => runner.runSuite(suiteFile, options))
    .then(async results => {
      await runner.cleanup();
      const exitCode = results.failed > 0 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch(async error => {
      console.error('❌ Error fatal:', error);
      await runner.cleanup();
      process.exit(1);
    });
}

module.exports = { UniversalTestRunnerCore };