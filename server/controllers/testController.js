const fs = require('fs');
const path = require('path');
const { TestGenerator } = require('../../runners/test-generator.js');
const { UniversalTestRunnerCore } = require('../../runners/universal-runner.js');

/**
 * Controller para tests YAML
 */
class TestController {
  /**
   * GET /api/tests - Listar tests (recursivo, incluye mobile)
   */
  async listTests(req, res) {
    try {
      const tests = [];
      const baseDir = './tests/suites';

      // Función recursiva para buscar tests
      const scanDirectory = (dir, platform = 'web') => {
        if (!fs.existsSync(dir)) return;

        const items = fs.readdirSync(dir);

        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            // Detectar plataforma por nombre de carpeta
            let subPlatform = platform;
            if (item === 'mobile') subPlatform = 'mobile';
            else if (item === 'android' && platform === 'mobile') subPlatform = 'android';
            else if (item === 'ios' && platform === 'mobile') subPlatform = 'ios';
            else if (item === 'common' && platform === 'mobile') subPlatform = 'common';

            // Recursivamente escanear subdirectorio
            scanDirectory(fullPath, subPlatform);
          } else if (item.endsWith('.yml') || item.endsWith('.yaml')) {
            // Es un archivo de test
            try {
              const content = fs.readFileSync(fullPath, 'utf8');
              const yaml = require('js-yaml');
              const testData = yaml.load(content);

              tests.push({
                file: item,
                name: testData.suite || item.replace('.yml', '').replace('.yaml', ''),
                description: testData.description || '',
                size: content.length,
                modified: stat.mtime,
                path: fullPath.replace(/\\/g, '/'),
                platform: testData.platform || platform,
                testCount: testData.tests ? testData.tests.length : 0
              });
            } catch (e) {
              tests.push({
                file: item,
                path: fullPath.replace(/\\/g, '/'),
                error: e.message
              });
            }
          }
        }
      };

      scanDirectory(baseDir);

      res.json({
        success: true,
        tests: tests,
        count: tests.length
      });
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
      const { testPath, mode, platform, deviceId } = req.body;

      if (!testPath) {
        return res.status(400).json({ error: 'Campo requerido: testPath' });
      }

      // Validar que si es mobile, se proporcione deviceId
      if (platform === 'mobile' && !deviceId) {
        return res.status(400).json({
          error: 'Para plataforma mobile se requiere deviceId'
        });
      }

      // Generar ID único para esta ejecución
      const testId = Date.now().toString();

      if (!global.activeTestRuns) {
        global.activeTestRuns = new Map();
      }

      global.activeTestRuns.set(testId, {
        status: 'running',
        logs: [],
        startTime: Date.now(),
        platform: platform || 'web',
        deviceId: deviceId || null
      });

      // Ejecutar test en background
      this.executeTestAsync(testId, testPath, mode || 'auto', platform || 'web', deviceId);

      res.json({
        success: true,
        testId: testId,
        message: 'Test iniciado',
        platform: platform || 'web',
        deviceId: deviceId || null
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
  async executeTestAsync(testId, testPath, mode, platform, deviceId) {
    try {
      const testRun = global.activeTestRuns.get(testId);
      testRun.logs.push(`Iniciando test: ${testPath} en modo ${mode}`);

      if (platform === 'mobile') {
        testRun.logs.push(`Plataforma: Mobile | Dispositivo: ${deviceId}`);
      } else {
        testRun.logs.push(`Plataforma: Web`);
      }

      // Inicializar runner con opciones de plataforma
      const runner = new UniversalTestRunnerCore('./config/llm.config.json', {
        platform: platform || 'web',
        deviceId: deviceId || null
      });
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
