const fs = require('fs');
const path = require('path');
const { UniversalTestRunnerCore } = require('../../runners/universal-runner.js');

/**
 * Controller para tests en lenguaje natural
 */
class NaturalController {
  /**
   * GET /api/tests/natural - Listar tests naturales
   */
  async listNaturalTests(req, res) {
    try {
      const naturalDir = './tests/natural';

      if (!fs.existsSync(naturalDir)) {
        fs.mkdirSync(naturalDir, { recursive: true });
      }

      const files = fs.readdirSync(naturalDir)
        .filter(f => f.endsWith('.txt'))
        .map(f => {
          const filePath = path.join(naturalDir, f);
          const stats = fs.statSync(filePath);
          const content = fs.readFileSync(filePath, 'utf8');

          // Parsear metadata del archivo
          const nameMatch = content.match(/^TEST:\s*(.+)$/m);
          const urlMatch = content.match(/^URL:\s*(.+)$/m);
          const descMatch = content.match(/^Descripción:\s*(.+)$/m);

          return {
            filename: f,
            name: nameMatch ? nameMatch[1].trim() : f.replace('.txt', ''),
            url: urlMatch ? urlMatch[1].trim() : '',
            description: descMatch ? descMatch[1].trim() : '',
            created: stats.mtime,
            size: stats.size
          };
        });

      res.json({ tests: files });
    } catch (error) {
      console.error('Error listando tests naturales:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/tests/natural/:filename - Obtener test natural específico
   */
  async getNaturalTest(req, res) {
    try {
      const { filename } = req.params;
      const filePath = path.join('./tests/natural', filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Test no encontrado' });
      }

      const content = fs.readFileSync(filePath, 'utf8');

      // Parsear contenido y opciones
      const nameMatch = content.match(/^TEST:\s*(.+)$/m);
      const urlMatch = content.match(/^URL:\s*(.+)$/m);
      const descMatch = content.match(/^Descripción:\s*(.+)$/m);
      const optionsMatch = content.match(/# Opciones de ejecución \(JSON\)\n(\{[\s\S]+?\})/);

      res.json({
        filename,
        name: nameMatch ? nameMatch[1].trim() : '',
        url: urlMatch ? urlMatch[1].trim() : '',
        description: descMatch ? descMatch[1].trim() : '',
        content: content,
        options: optionsMatch ? JSON.parse(optionsMatch[1]) : {}
      });
    } catch (error) {
      console.error('Error obteniendo test natural:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/tests/natural/create - Crear test natural
   */
  async createNaturalTest(req, res) {
    try {
      const { name, url, description, instructions, options } = req.body;

      if (!name || !url || !instructions) {
        return res.status(400).json({
          error: 'Faltan campos requeridos: name, url, instructions'
        });
      }

      // Crear contenido del archivo
      const testOptions = options || {
        screenshotPerStep: false,
        captureLogs: true,
        captureNetwork: false,
        performanceMetrics: false
      };

      const content = `TEST: ${name}
URL: ${url}
Descripción: ${description || 'Sin descripción'}

Opciones:
- Screenshot por paso: ${testOptions.screenshotPerStep ? 'Sí' : 'No'}
- Capturar logs: ${testOptions.captureLogs ? 'Sí' : 'No'}
- Capturar network: ${testOptions.captureNetwork ? 'Sí' : 'No'}
- Performance: ${testOptions.performanceMetrics ? 'Sí' : 'No'}

Pasos:
==================================================

${instructions}

==================================================

# Opciones de ejecución (JSON)
${JSON.stringify(testOptions, null, 2)}
`;

      // Guardar archivo
      const filename = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.txt';
      const naturalDir = './tests/natural';

      if (!fs.existsSync(naturalDir)) {
        fs.mkdirSync(naturalDir, { recursive: true });
      }

      const filePath = path.join(naturalDir, filename);
      fs.writeFileSync(filePath, content, 'utf8');

      res.json({
        success: true,
        filename,
        path: filePath,
        message: 'Test natural creado exitosamente'
      });
    } catch (error) {
      console.error('Error creando test natural:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/tests/natural/run - Ejecutar test natural
   */
  async runNaturalTest(req, res) {
    try {
      const { filename, options } = req.body;

      if (!filename) {
        return res.status(400).json({ error: 'Campo requerido: filename' });
      }

      const filePath = path.join('./tests/natural', filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Test no encontrado' });
      }

      // Leer contenido del test
      const content = fs.readFileSync(filePath, 'utf8');

      // Parsear opciones del archivo si existen
      let testOptions = {
        maxIterations: 30,
        screenshotPerStep: false,
        captureLogs: true,
        captureNetwork: false,
        performanceMetrics: false
      };

      const optionsMatch = content.match(/# Opciones de ejecución \(JSON\)\n(\{[\s\S]+?\})/);
      if (optionsMatch) {
        testOptions = { ...testOptions, ...JSON.parse(optionsMatch[1]) };
      }

      // Override con opciones del request si se proporcionan
      if (options) {
        testOptions = { ...testOptions, ...options };
      }

      // Generar ID único para este test run
      const testId = `natural-${Date.now()}`;

      if (!global.activeTestRuns) {
        global.activeTestRuns = new Map();
      }

      global.activeTestRuns.set(testId, {
        status: 'running',
        logs: [],
        startTime: Date.now(),
        testType: 'natural',
        filename
      });

      // Ejecutar en background
      this.executeNaturalTestAsync(testId, filePath, content, testOptions);

      res.json({
        success: true,
        testId,
        message: 'Test natural iniciado',
        pollUrl: `/api/tests/status/${testId}`
      });
    } catch (error) {
      console.error('Error ejecutando test natural:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Ejecutar test natural en background (helper privado)
   */
  async executeNaturalTestAsync(testId, filePath, content, options) {
    try {
      const testRun = global.activeTestRuns.get(testId);
      testRun.logs.push(`🚀 Iniciando test natural: ${filePath}`);
      testRun.logs.push(`📋 Opciones: ${JSON.stringify(options)}`);

      // Inicializar runner
      const runner = new UniversalTestRunnerCore();
      await runner.initialize();

      testRun.logs.push('✅ Runner inicializado');

      // Extraer instrucciones del contenido
      const instructionsMatch = content.match(/Pasos:\n={50}\n\n([\s\S]+?)\n\n={50}/);
      const instructions = instructionsMatch ? instructionsMatch[1].trim() : content;

      testRun.logs.push('▶️  Ejecutando test en lenguaje natural...');

      // Hook para capturar logs en tiempo real
      const originalLog = console.log;
      console.log = function(...args) {
        const message = args.join(' ');
        testRun.logs.push(message);
        originalLog.apply(console, args);
      };

      // Ejecutar test natural
      const result = await runner.executeNaturalLanguageTest(instructions, options);

      // Restaurar console.log
      console.log = originalLog;

      // Guardar resultados
      testRun.status = result.success ? 'success' : 'failed';
      testRun.results = result;
      testRun.endTime = Date.now();
      testRun.duration = testRun.endTime - testRun.startTime;
      testRun.logs.push('');
      testRun.logs.push('═'.repeat(60));
      testRun.logs.push(result.success ? '✅ Test EXITOSO' : '❌ Test FALLIDO');
      testRun.logs.push(`⏱️  Duración: ${result.duration}s | Iteraciones: ${result.iterations}`);
      testRun.logs.push('═'.repeat(60));

      // Agregar datos adicionales al testRun
      if (result.consoleLogs) {
        testRun.consoleLogs = result.consoleLogs;
      }
      if (result.networkRequests) {
        testRun.networkRequests = result.networkRequests;
      }
      if (result.performanceData) {
        testRun.performanceData = result.performanceData;
      }

      // Limpiar
      await runner.cleanup();

    } catch (error) {
      const testRun = global.activeTestRuns.get(testId);
      testRun.status = 'error';
      testRun.error = error.message;
      testRun.logs.push('');
      testRun.logs.push(`❌ Error: ${error.message}`);
      testRun.logs.push(error.stack || '');
      console.error(`Error ejecutando test natural ${testId}:`, error);
    }
  }
}

module.exports = new NaturalController();
