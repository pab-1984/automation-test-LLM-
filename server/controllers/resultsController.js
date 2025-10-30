const fs = require('fs');
const path = require('path');

/**
 * Controller para resultados y reportes
 */
class ResultsController {
  /**
   * GET /api/results - Listar reportes
   */
  async listResults(req, res) {
    try {
      const results = [];
      if (fs.existsSync('./tests/results')) {
        fs.readdirSync('./tests/results')
          .filter(file => file.endsWith('.md'))
          .forEach(file => {
            try {
              const stats = fs.statSync(`./tests/results/${file}`);
              const content = fs.readFileSync(`./tests/results/${file}`, 'utf8');
              results.push({
                file: file,
                modified: stats.mtime,
                size: stats.size,
                preview: content.substring(0, 200)
              });
            } catch (e) {
              results.push({ file: file, error: e.message });
            }
          });
      }

      // Ordenar por más reciente
      results.sort((a, b) => new Date(b.modified) - new Date(a.modified));

      res.json(results);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/results/:filename - Obtener reporte específico
   */
  async getResult(req, res) {
    try {
      const { filename } = req.params;
      const filePath = `./tests/results/${filename}`;

      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        res.type('text/plain').send(content);
      } else {
        res.status(404).json({ error: 'Reporte no encontrado' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new ResultsController();
