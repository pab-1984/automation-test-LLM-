// runners/universal-runner.js
// Punto de entrada principal del runner universal

const { UniversalTestRunnerCore } = require('./core/runner-core.js');

if (require.main === module) {
  // Parsear argumentos
  const args = process.argv.slice(2);
  const suiteFile = args.find(arg => !arg.startsWith('--')) || './tests/suites/ecommerce-suite.yml';

  const options = {
    recompile: args.includes('--recompile') || args.includes('-r'),
    platform: 'web',  // Por defecto web
    deviceId: null
  };

  // Parsear --platform=mobile o --mobile
  const platformArg = args.find(arg => arg.startsWith('--platform='));
  if (platformArg) {
    options.platform = platformArg.split('=')[1];
  } else if (args.includes('--mobile')) {
    options.platform = 'mobile';
  }

  // Parsear --device=emulator-5554
  const deviceArg = args.find(arg => arg.startsWith('--device='));
  if (deviceArg) {
    options.deviceId = deviceArg.split('=')[1];
  }

  const runner = new UniversalTestRunnerCore('./config/llm.config.json', {
    platform: options.platform,
    deviceId: options.deviceId
  });

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