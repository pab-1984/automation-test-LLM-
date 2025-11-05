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
          const platformMatch = content.match(/^Plataforma:.*\((.+?)\)/m);

          // Parsear opciones JSON para obtener plataforma y deviceId
          let platform = 'web';
          let deviceId = null;
          const optionsMatch = content.match(/# Opciones de ejecución \(JSON\)\n(\{[\s\S]+?\})/);
          if (optionsMatch) {
            try {
              const parsedOptions = JSON.parse(optionsMatch[1]);
              platform = parsedOptions.platform || 'web';
              deviceId = parsedOptions.deviceId || null;
            } catch (e) {
              // Ignore parsing errors
            }
          }

          return {
            filename: f,
            name: nameMatch ? nameMatch[1].trim() : f.replace('.txt', ''),
            url: urlMatch ? urlMatch[1].trim() : '',
            description: descMatch ? descMatch[1].trim() : '',
            platform: platform,
            deviceId: deviceId,
            created: stats.mtime,
            size: stats.size
          };
        });

      res.json({ success: true, tests: files });
    } catch (error) {
      console.error('Error listando tests naturales:', error);
      res.status(500).json({ success: false, error: error.message });
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
      const { name, url, description, instructions, options, platform, deviceId } = req.body;

      if (!name || !url || !instructions) {
        return res.status(400).json({
          error: 'Faltan campos requeridos: name, url, instructions'
        });
      }

      // Validar plataforma móvil
      if (platform === 'mobile' && !deviceId) {
        return res.status(400).json({
          error: 'Para plataforma móvil se requiere deviceId'
        });
      }

      // Crear contenido del archivo
      const testOptions = options || {
        screenshotPerStep: false,
        captureLogs: true,
        captureNetwork: false,
        performanceMetrics: false
      };

      // Agregar plataforma y dispositivo a las opciones
      testOptions.platform = platform || 'web';
      if (platform === 'mobile') {
        testOptions.deviceId = deviceId;
      }

      const platformLabel = platform === 'mobile' ? '📱 Móvil' : '🌐 Web';

      const content = `TEST: ${name}
URL: ${url}
Plataforma: ${platformLabel} (${platform || 'web'})
${platform === 'mobile' ? `Dispositivo: ${deviceId}\n` : ''}Descripción: ${description || 'Sin descripción'}

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
        performanceMetrics: false,
        forceRegenerate: false // Nueva opción para forzar regeneración
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
   * POST /api/tests/natural/regenerate-yaml - Regenerar YAML para un test natural
   */
  async regenerateYAML(req, res) {
    try {
      const { filename } = req.body;

      if (!filename) {
        return res.status(400).json({ error: 'Campo requerido: filename' });
      }

      const filePath = path.join('./tests/natural', filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Test no encontrado' });
      }

      // Leer contenido del test
      const content = fs.readFileSync(filePath, 'utf8');

      // Parsear metadata
      const nameMatch = content.match(/^TEST:\s*(.+)$/m);
      const testName = nameMatch ? nameMatch[1].trim() : filename.replace('.txt', '');

      const { YAMLGenerator } = require('../../runners/core/yaml-generator');
      const yamlGenerator = new YAMLGenerator();

      // Eliminar YAML existente
      const deleted = yamlGenerator.deleteGeneratedYAML(testName);

      res.json({
        success: true,
        message: deleted
          ? 'YAML eliminado. El próximo test lo regenerará.'
          : 'No había YAML generado. El próximo test lo creará.',
        testName,
        deleted
      });

    } catch (error) {
      console.error('Error regenerando YAML:', error);
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

      // Determinar plataforma y dispositivo desde las opciones
      const platform = options.platform || 'web';
      const deviceId = options.deviceId || null;

      const platformLabel = platform === 'mobile' ? '📱 MÓVIL' : '🌐 WEB';
      testRun.logs.push(`🎯 Plataforma: ${platformLabel}`);
      if (platform === 'mobile' && deviceId) {
        testRun.logs.push(`📱 Dispositivo: ${deviceId}`);
      }

      // Inicializar runner con opciones de plataforma
      const runner = new UniversalTestRunnerCore('./config/llm.config.json', {
        platform,
        deviceId
      });
      await runner.initialize();

      testRun.logs.push('✅ Runner inicializado');

      // Hook para capturar logs en tiempo real
      const originalLog = console.log;
      console.log = function(...args) {
        const message = args.join(' ');
        testRun.logs.push(message);
        originalLog.apply(console, args);
      };

      let result;
      let executionMode = 'llm'; // Por defecto LLM

      // EXECUTOR HÍBRIDO: Intentar usar YAML generado primero
      const { YAMLGenerator } = require('../../runners/core/yaml-generator');
      const yamlGenerator = new YAMLGenerator();

      // Parsear nombre del test
      const filename = path.basename(filePath);
      const nameMatch = content.match(/^TEST:\s*(.+)$/m);
      const testName = nameMatch ? nameMatch[1].trim() : filename.replace('.txt', '');

      // Verificar si existe YAML generado
      const generatedYAMLPath = yamlGenerator.getGeneratedYAMLPath(testName);

      if (generatedYAMLPath && !options.forceRegenerate) {
        testRun.logs.push('');
        testRun.logs.push('🔍 YAML generado encontrado!');
        testRun.logs.push(`📄 ${generatedYAMLPath}`);
        testRun.logs.push('⚡ Ejecutando con YAML (modo rápido, sin LLM)...');
        testRun.logs.push('');

        executionMode = 'yaml';

        try {
          // Intentar ejecutar con YAML
          result = await runner.runSuite(generatedYAMLPath, { recompile: false });

          testRun.logs.push('✅ Ejecución con YAML completada exitosamente');

          // Convertir resultado al formato esperado
          result = {
            success: result.failed === 0,
            report: `Test ejecutado con YAML. Passed: ${result.passed}, Failed: ${result.failed}`,
            duration: (result.endTime - result.startTime) / 1000,
            iterations: 1,
            consoleLogs: runner.consoleLogs || [],
            networkRequests: runner.networkRequests || [],
            performanceData: runner.performanceData || {},
            executedSteps: [], // Ya no necesitamos generar YAML
            usedYAML: true
          };

        } catch (yamlError) {
          testRun.logs.push('');
          testRun.logs.push(`⚠️  Ejecución con YAML falló: ${yamlError.message}`);
          testRun.logs.push('🔄 Fallback: Ejecutando con LLM...');
          testRun.logs.push('');

          executionMode = 'llm-fallback';

          // Extraer instrucciones del contenido
          const instructionsMatch = content.match(/Pasos:\n={50}\n\n([\s\S]+?)\n\n={50}/);
          const instructions = instructionsMatch ? instructionsMatch[1].trim() : content;

          // Ejecutar con LLM como fallback
          result = await runner.executeNaturalLanguageTest(instructions, options);
        }

      } else {
        // No hay YAML generado o se forzó regeneración
        if (options.forceRegenerate) {
          testRun.logs.push('');
          testRun.logs.push('🔄 Regeneración forzada - Ejecutando con LLM...');
          testRun.logs.push('');
        } else {
          testRun.logs.push('');
          testRun.logs.push('📝 Primera ejecución - Usando LLM...');
          testRun.logs.push('');
        }

        // Extraer instrucciones del contenido
        const instructionsMatch = content.match(/Pasos:\n={50}\n\n([\s\S]+?)\n\n={50}/);
        const instructions = instructionsMatch ? instructionsMatch[1].trim() : content;

        // Ejecutar con LLM
        result = await runner.executeNaturalLanguageTest(instructions, options);
      }

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

      // Si el test fue exitoso y hay pasos ejecutados, generar YAML automáticamente
      // Solo generar si se ejecutó con LLM (no si usó YAML existente)
      if (result.success && result.executedSteps && result.executedSteps.length > 0 && !result.usedYAML) {
        try {
          testRun.logs.push('');
          testRun.logs.push('🔨 Generando YAML automático para futuras ejecuciones...');

          // Parsear metadata del test
          const nameMatch = content.match(/^TEST:\s*(.+)$/m);
          const urlMatch = content.match(/^URL:\s*(.+)$/m);
          const descMatch = content.match(/^Descripción:\s*(.+)$/m);

          const metadata = {
            name: nameMatch ? nameMatch[1].trim() : filename.replace('.txt', ''),
            baseUrl: urlMatch ? urlMatch[1].trim() : 'https://ejemplo.com',
            description: descMatch ? descMatch[1].trim() : 'Test generado automáticamente',
            platform: platform
          };

          // Generar YAML
          const yamlTest = yamlGenerator.generateYAMLFromSteps(result.executedSteps, metadata);

          // Guardar YAML
          const yamlPath = yamlGenerator.saveGeneratedYAML(metadata.name, yamlTest);

          testRun.generatedYAMLPath = yamlPath;
          testRun.logs.push(`✅ YAML generado exitosamente: ${yamlPath}`);
          testRun.logs.push('⚡ Próxima ejecución será más rápida usando el YAML!');

        } catch (yamlError) {
          testRun.logs.push(`⚠️  No se pudo generar YAML: ${yamlError.message}`);
          testRun.logs.push('   El test seguirá funcionando con LLM');
        }
      } else if (result.usedYAML) {
        testRun.logs.push('');
        testRun.logs.push('ℹ️  Se usó YAML existente - No es necesario regenerar');
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
