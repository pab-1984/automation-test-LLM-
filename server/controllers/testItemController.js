/**
 * Controlador de Tests (items de test)
 */

const { getDatabase } = require('../../database/db');
const path = require('path');
const fs = require('fs');
const { UniversalTestRunnerCore } = require('../../runners/universal-runner.js');

const testItemController = {
  // GET /api/test-items - Obtener todos los tests
  getAllTests(req, res) {
    try {
      const db = getDatabase();
      const tests = db.getAllTests();
      res.json({ success: true, tests });
    } catch (error) {
      console.error('Error obteniendo tests:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/test-items/suite/:suiteId - Obtener tests de una suite
  getTestsBySuite(req, res) {
    try {
      const db = getDatabase();
      const tests = db.getTestsBySuite(req.params.suiteId);
      res.json({ success: true, tests });
    } catch (error) {
      console.error('Error obteniendo tests de la suite:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/test-items/:id - Obtener un test específico
  getTestById(req, res) {
    try {
      const db = getDatabase();
      const test = db.getTestById(req.params.id);

      if (!test) {
        return res.status(404).json({ success: false, error: 'Test no encontrado' });
      }

      const executions = db.getExecutionsByTest(test.id);

      res.json({ success: true, test: { ...test, executions } });
    } catch (error) {
      console.error('Error obteniendo test:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // POST /api/test-items - Agregar un test existente a una suite
  addTestToSuite(req, res) {
    try {
      const { suiteId, name, type, filePath, description, url } = req.body;

      if (!suiteId || !name || !type || !filePath) {
        return res.status(400).json({
          success: false,
          error: 'suiteId, name, type y filePath son requeridos'
        });
      }

      if (!['natural', 'yaml'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'El tipo debe ser "natural" o "yaml"'
        });
      }

      const db = getDatabase();
      const test = db.createTest(suiteId, name, type, filePath, description, url);

      res.json({ success: true, test });
    } catch (error) {
      console.error('Error agregando test a suite:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // PUT /api/test-items/:id - Actualizar un test
  updateTest(req, res) {
    try {
      const { name, description, url } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, error: 'El nombre es requerido' });
      }

      const db = getDatabase();
      const test = db.updateTest(req.params.id, name, description, url);

      if (!test) {
        return res.status(404).json({ success: false, error: 'Test no encontrado' });
      }

      res.json({ success: true, test });
    } catch (error) {
      console.error('Error actualizando test:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // DELETE /api/test-items/:id - Eliminar un test de la suite
  deleteTest(req, res) {
    try {
      const db = getDatabase();
      const result = db.deleteTest(req.params.id);

      if (result.changes === 0) {
        return res.status(404).json({ success: false, error: 'Test no encontrado' });
      }

      res.json({ success: true, message: 'Test eliminado de la suite' });
    } catch (error) {
      console.error('Error eliminando test:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // POST /api/test-items/:id/execute - Ejecutar un test
  executeTest(req, res) {
    try {
      const { mode = 'auto' } = req.body;
      const db = getDatabase();
      const test = db.getTestById(req.params.id);

      if (!test) {
        return res.status(404).json({ success: false, error: 'Test no encontrado' });
      }

      // Verificar que el archivo del test existe
      if (!fs.existsSync(test.file_path)) {
        return res.status(404).json({
          success: false,
          error: `Archivo de test no encontrado: ${test.file_path}`
        });
      }

      // Crear registro de ejecución
      const execution = db.createExecution(test.id, mode);

      // Responder inmediatamente con el ID de ejecución
      res.json({
        success: true,
        executionId: execution.id,
        testId: `execution-${execution.id}`,
        message: 'Test iniciado',
        test: test
      });

      // Ejecutar test en background
      this.executeTestAsync(execution.id, test, mode).catch(error => {
        console.error('Error en ejecución async:', error);
      });

    } catch (error) {
      console.error('Error ejecutando test:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * Ejecutar test en background y actualizar BD con resultados
   */
  async executeTestAsync(executionId, test, mode) {
    const db = getDatabase();
    const testRunId = `execution-${executionId}`;

    try {
      // Inicializar registro de logs en memoria para polling
      if (!global.activeTestRuns) {
        global.activeTestRuns = new Map();
      }

      global.activeTestRuns.set(testRunId, {
        status: 'running',
        logs: [],
        startTime: Date.now(),
        executionId: executionId,
        testType: test.type
      });

      const testRun = global.activeTestRuns.get(testRunId);
      testRun.logs.push(`🚀 Iniciando ejecución del test: ${test.name}`);
      testRun.logs.push(`📋 Modo: ${mode} | Tipo: ${test.type}`);

      // Inicializar runner
      const runner = new UniversalTestRunnerCore();
      await runner.initialize();
      testRun.logs.push('✅ Runner inicializado');

      let result;

      if (test.type === 'natural') {
        // Ejecutar test natural
        const content = fs.readFileSync(test.file_path, 'utf8');

        // Parsear opciones del archivo
        let options = { maxIterations: 30 };
        const optionsMatch = content.match(/# Opciones de ejecución \(JSON\)\n(\{[\s\S]+?\})/);
        if (optionsMatch) {
          options = { ...options, ...JSON.parse(optionsMatch[1]) };
        }

        // Extraer instrucciones
        const instructionsMatch = content.match(/Pasos:\n={50}\n\n([\s\S]+?)\n\n={50}/);
        const instructions = instructionsMatch ? instructionsMatch[1].trim() : content;

        testRun.logs.push('▶️  Ejecutando test en lenguaje natural...');

        // Hook para capturar logs
        const originalLog = console.log;
        console.log = function(...args) {
          const message = args.join(' ');
          testRun.logs.push(message);
          originalLog.apply(console, args);
        };

        result = await runner.executeNaturalLanguageTest(instructions, options);

        // Restaurar console.log
        console.log = originalLog;

      } else {
        // Ejecutar test YAML
        testRun.logs.push('▶️  Ejecutando test YAML...');
        result = await runner.runTestFromFile(test.file_path);
      }

      // Calcular duración
      const duration = Date.now() - testRun.startTime;

      // Determinar estado final
      const finalStatus = result.success ? 'success' : 'failed';
      testRun.status = finalStatus;

      testRun.logs.push('─'.repeat(60));
      testRun.logs.push(`📊 RESULTADO: ${finalStatus === 'success' ? '✅ EXITOSO' : '❌ FALLIDO'}`);
      testRun.logs.push(`⏱️  Duración: ${(duration / 1000).toFixed(2)}s`);

      // Actualizar registro de ejecución en BD
      db.updateExecution(
        executionId,
        finalStatus,
        duration,
        JSON.stringify(testRun.logs),
        result.error || null
      );

      testRun.logs.push('💾 Resultados guardados en base de datos');

      // Guardar evidencias si existen
      await this.saveEvidences(executionId, result);

      // Limpiar runner
      await runner.cleanup();

    } catch (error) {
      console.error('Error en executeTestAsync:', error);

      const testRun = global.activeTestRuns.get(testRunId);
      if (testRun) {
        testRun.status = 'error';
        testRun.logs.push(`❌ ERROR: ${error.message}`);
        testRun.logs.push(error.stack);

        // Actualizar BD con error
        const duration = Date.now() - testRun.startTime;
        db.updateExecution(
          executionId,
          'error',
          duration,
          JSON.stringify(testRun.logs),
          error.message
        );
      }
    }
  },

  /**
   * Guardar evidencias de la ejecución
   */
  async saveEvidences(executionId, result) {
    const db = getDatabase();
    const testRun = global.activeTestRuns.get(`execution-${executionId}`);

    try {
      // Guardar screenshots
      if (result.screenshots && Array.isArray(result.screenshots)) {
        result.screenshots.forEach(screenshotPath => {
          if (fs.existsSync(screenshotPath)) {
            db.createEvidence(
              executionId,
              'screenshot',
              screenshotPath,
              JSON.stringify({ timestamp: new Date().toISOString() })
            );
          }
        });
      }

      // Guardar logs de consola
      if (result.consoleLogs && result.consoleLogs.length > 0) {
        const logsPath = `./test-results/logs-${executionId}.json`;
        fs.writeFileSync(logsPath, JSON.stringify(result.consoleLogs, null, 2));
        db.createEvidence(
          executionId,
          'log',
          logsPath,
          JSON.stringify({ count: result.consoleLogs.length })
        );
      }

      // Guardar network requests
      if (result.networkRequests && result.networkRequests.length > 0) {
        const networkPath = `./test-results/network-${executionId}.json`;
        fs.writeFileSync(networkPath, JSON.stringify(result.networkRequests, null, 2));
        db.createEvidence(
          executionId,
          'network',
          networkPath,
          JSON.stringify({ count: result.networkRequests.length })
        );
      }

      // Guardar performance metrics
      if (result.performanceData) {
        const perfPath = `./test-results/performance-${executionId}.json`;
        fs.writeFileSync(perfPath, JSON.stringify(result.performanceData, null, 2));
        db.createEvidence(
          executionId,
          'performance',
          perfPath,
          JSON.stringify({ metrics: Object.keys(result.performanceData).length })
        );
      }

      if (testRun) {
        testRun.logs.push('📎 Evidencias guardadas en base de datos');
      }

    } catch (error) {
      console.error('Error guardando evidencias:', error);
      if (testRun) {
        testRun.logs.push(`⚠️  Error guardando evidencias: ${error.message}`);
      }
    }
  }
};

module.exports = testItemController;
