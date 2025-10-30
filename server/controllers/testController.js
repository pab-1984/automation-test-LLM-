const fs = require('fs');
const path = require('path');
const { TestGenerator } = require('../../runners/test-generator.js');
const { UniversalTestRunnerCore } = require('../../runners/universal-runner.js');

/**
 * Controller para tests YAML
 */
class TestController {
  /**
   * GET /api/tests - Listar tests
   */
  async listTests(req, res) {
    try {
      const tests = [];
      if (fs.existsSync('./tests/suites')) {
        fs.readdirSync('./tests/suites')
          .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'))
          .forEach(file => {
            try {
              const content = fs.readFileSync(`./tests/suites/${file}`, 'utf8');
              const stats = fs.statSync(`./tests/suites/${file}`);
              tests.push({
                file: file,
                name: file.replace('.yml', '').replace('.yaml', ''),
                size: content.length,
                modified: stats.mtime,
                path: `./tests/suites/${file}`
              });
            } catch (e) {
              tests.push({
                file: file,
                error: e.message
              });
            }
          });
      }

      res.json(tests);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/tests/create - Crear test desde lenguaje natural
   */
  async createTest(req, res) {
    try {
      const { name, baseUrl, instructions } = req.body;

      if (!name || !baseUrl || !instructions) {
        return res.status(400).json({
          error: 'Faltan campos requeridos: name, baseUrl, instructions'
        });
      }

      // Inicializar runner si no existe
      if (!global.runnerInstance) {
        global.runnerInstance = new UniversalTestRunnerCore();
        await global.runnerInstance.initialize();
      }

      // Generar test
      const generator = new TestGenerator(
        global.runnerInstance.llmAdapter,
        global.runnerInstance.config
      );
      const testStructure = await generator.convertNaturalLanguageToTest(
        instructions,
        baseUrl,
        name
      );

      // Guardar test
      const filename = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const testPath = generator.saveTest(testStructure, filename);

      res.json({
        success: true,
        testPath: testPath,
        filename: filename,
        structure: testStructure
      });
    } catch (error) {
      console.error('Error creando test:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/tests/run - Ejecutar test
   */
  async runTest(req, res) {
    try {
      const { testPath, mode } = req.body;

      if (!testPath) {
        return res.status(400).json({ error: 'Campo requerido: testPath' });
      }

      // Generar ID único para esta ejecución
      const testId = Date.now().toString();

      if (!global.activeTestRuns) {
        global.activeTestRuns = new Map();
      }

      global.activeTestRuns.set(testId, {
        status: 'running',
        logs: [],
        startTime: Date.now()
      });

      // Ejecutar test en background
      this.executeTestAsync(testId, testPath, mode || 'auto');

      res.json({
        success: true,
        testId: testId,
        message: 'Test iniciado'
      });
    } catch (error) {
      console.error('Error iniciando test:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/tests/status/:testId - Estado de ejecución
   */
  async getTestStatus(req, res) {
    try {
      const { testId } = req.params;

      if (!global.activeTestRuns) {
        global.activeTestRuns = new Map();
      }

      if (global.activeTestRuns.has(testId)) {
        const testRun = global.activeTestRuns.get(testId);
        res.json(testRun);
      } else {
        res.status(404).json({ error: 'Test no encontrado' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Ejecutar test en background (helper privado)
   */
  async executeTestAsync(testId, testPath, mode) {
    try {
      const testRun = global.activeTestRuns.get(testId);
      testRun.logs.push(`Iniciando test: ${testPath} en modo ${mode}`);

      // Inicializar runner
      const runner = new UniversalTestRunnerCore();
      await runner.initialize();

      testRun.logs.push('Runner inicializado');

      // Ejecutar test
      const results = await runner.runSuite(testPath, { mode });

      // Guardar resultados
      testRun.status = results.failed === 0 ? 'success' : 'failed';
      testRun.results = results;
      testRun.endTime = Date.now();
      testRun.duration = testRun.endTime - testRun.startTime;
      testRun.logs.push(`Test completado: ${results.passed} exitosos, ${results.failed} fallidos`);

      // Limpiar
      await runner.cleanup();

    } catch (error) {
      const testRun = global.activeTestRuns.get(testId);
      testRun.status = 'error';
      testRun.error = error.message;
      testRun.logs.push(`Error: ${error.message}`);
      console.error(`Error ejecutando test ${testId}:`, error);
    }
  }
}

module.exports = new TestController();
