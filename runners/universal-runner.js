// runners/universal-runner.js
// Punto de entrada principal del runner universal

const { UniversalTestRunnerCore } = require('./core/runner-core.js');

if (require.main === module) {
  const suiteFile = process.argv[2] || './tests/suites/ecommerce-suite.yml';
  
  const runner = new UniversalTestRunnerCore();
  
  runner.initialize()
    .then(() => runner.runSuite(suiteFile))
          .then(async results => {
            await runner.cleanup();
            const exitCode = results.failed > 0 ? 1 : 0;
            process.exit(exitCode);
          })
          .catch(async error => {
            console.error('❌ Error fatal:', error);
            await runner.cleanup();
            process.exit(1);
          });}

module.exports = { UniversalTestRunnerCore };