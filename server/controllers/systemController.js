const fs = require('fs');
const path = require('path');

/**
 * Controller para endpoints del sistema
 */
class SystemController {
  /**
   * GET /api/status - Estado del sistema
   */
  async getStatus(req, res) {
    try {
      const status = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        config: {},
        activeTests: global.activeTestRuns ? global.activeTestRuns.size : 0,
        statistics: {
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          successRate: 0
        }
      };

      // Leer configuración del LLM
      try {
        if (fs.existsSync('./config/llm.config.json')) {
          status.config = JSON.parse(fs.readFileSync('./config/llm.config.json', 'utf8'));
        }
      } catch (e) {
        status.config.error = 'No se pudo leer la configuración';
      }

      // Calcular estadísticas de tests desde reportes
      try {
        if (fs.existsSync('./tests/results')) {
          const reports = fs.readdirSync('./tests/results').filter(f => f.endsWith('.md'));
          let totalPassed = 0;
          let totalFailed = 0;

          reports.forEach(file => {
            try {
              const content = fs.readFileSync(`./tests/results/${file}`, 'utf8');
              const passMatch = content.match(/✅ Exitosas.*?(\d+)/);
              const failMatch = content.match(/❌ Fallidas.*?(\d+)/);

              if (passMatch) totalPassed += parseInt(passMatch[1]);
              if (failMatch) totalFailed += parseInt(failMatch[1]);
            } catch (e) {
              // Ignorar errores en reportes individuales
            }
          });

          status.statistics.totalTests = totalPassed + totalFailed;
          status.statistics.passedTests = totalPassed;
          status.statistics.failedTests = totalFailed;
          status.statistics.successRate = status.statistics.totalTests > 0
            ? ((totalPassed / status.statistics.totalTests) * 100).toFixed(1)
            : 0;
        }
      } catch (e) {
        // Ignorar error de estadísticas
      }

      res.json(status);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/llm/switch - Cambiar LLM activo
   */
  async switchLLM(req, res) {
    try {
      const { provider } = req.body;

      if (!provider) {
        return res.status(400).json({ error: 'Campo requerido: provider' });
      }

      const configPath = './config/llm.config.json';
      if (!fs.existsSync(configPath)) {
        return res.status(500).json({ error: 'Configuración no encontrada' });
      }

      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      if (!config.providers[provider]) {
        return res.status(400).json({
          error: `Proveedor '${provider}' no existe`,
          available: Object.keys(config.providers)
        });
      }

      // Cambiar proveedor activo
      const previousProvider = config.activeProvider;
      config.activeProvider = provider;
      config.providers[provider].enabled = true;

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      res.json({
        success: true,
        previous: previousProvider,
        current: provider,
        message: `LLM cambiado de ${previousProvider} a ${provider}`
      });

    } catch (error) {
      console.error('Error cambiando LLM:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new SystemController();
