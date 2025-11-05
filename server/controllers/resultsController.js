const fs = require('fs');
const path = require('path');
const { getDatabase } = require('../../database/db');

/**
 * Controller para resultados y reportes
 * Ahora lee primero de la base de datos y mantiene compatibilidad con archivos .md
 */
class ResultsController {
  /**
   * GET /api/results - Listar reportes (DB + archivos legacy)
   */
  async listResults(req, res) {
    try {
      const results = [];
      const db = getDatabase();

      // 1. Obtener resultados de la base de datos
      const executions = db.getRecentExecutions(50);

      for (const execution of executions) {
        results.push({
          id: execution.id,
          source: 'database',
          test_name: execution.test_name,
          test_type: execution.test_type,
          status: execution.status,
          started_at: execution.started_at,
          finished_at: execution.finished_at,
          duration: execution.duration,
          evidence_count: execution.evidence_count || 0,
          has_logs: !!execution.logs,
          preview: this.generatePreview(execution)
        });
      }

      // 2. Obtener reportes legacy de archivos .md (para compatibilidad)
      if (fs.existsSync('./tests/results')) {
        fs.readdirSync('./tests/results')
          .filter(file => file.endsWith('.md'))
          .forEach(file => {
            try {
              const stats = fs.statSync(`./tests/results/${file}`);
              const content = fs.readFileSync(`./tests/results/${file}`, 'utf8');

              // Evitar duplicados: solo agregar si no está en DB
              const timestamp = file.match(/reporte-(\d+)\.md/)?.[1];
              const isInDB = results.some(r =>
                r.source === 'database' &&
                Math.abs(new Date(r.started_at).getTime() - parseInt(timestamp || 0)) < 5000
              );

              if (!isInDB) {
                results.push({
                  file: file,
                  source: 'file',
                  modified: stats.mtime,
                  size: stats.size,
                  preview: content.substring(0, 200),
                  legacy: true
                });
              }
            } catch (e) {
              results.push({ file: file, source: 'file', error: e.message, legacy: true });
            }
          });
      }

      // Ordenar por más reciente (fecha de DB o modificación de archivo)
      results.sort((a, b) => {
        const dateA = a.started_at ? new Date(a.started_at) : new Date(a.modified);
        const dateB = b.started_at ? new Date(b.started_at) : new Date(b.modified);
        return dateB - dateA;
      });

      res.json({
        total: results.length,
        from_database: results.filter(r => r.source === 'database').length,
        from_files: results.filter(r => r.source === 'file').length,
        results
      });
    } catch (error) {
      res.status(500).json({ error: error.message, stack: error.stack });
    }
  }

  /**
   * GET /api/results/:id - Obtener reporte específico
   * Soporta tanto IDs de DB como nombres de archivo
   */
  async getResult(req, res) {
    try {
      const { id } = req.params;

      // Verificar si es un ID numérico (DB) o nombre de archivo
      if (/^\d+$/.test(id)) {
        // Es un ID de base de datos
        return this.getResultFromDB(parseInt(id), req, res);
      } else {
        // Es un nombre de archivo legacy
        return this.getResultFromFile(id, req, res);
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/results/:id/html - Obtener reporte en formato HTML
   */
  async getResultHTML(req, res) {
    try {
      const { id } = req.params;

      if (!/^\d+$/.test(id)) {
        return res.status(400).json({ error: 'ID debe ser numérico para reportes HTML' });
      }

      const db = getDatabase();
      const { ReportGenerator } = require('../../runners/core/report-generator');
      const generator = new ReportGenerator();

      const html = generator.generateHTMLReport(parseInt(id));

      res.type('text/html').send(html);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/results/:id/evidences - Obtener evidencias de una ejecución
   */
  async getEvidences(req, res) {
    try {
      const { id } = req.params;

      if (!/^\d+$/.test(id)) {
        return res.status(400).json({ error: 'ID debe ser numérico' });
      }

      const db = getDatabase();
      const evidences = db.getEvidencesByExecution(parseInt(id));

      res.json({
        execution_id: parseInt(id),
        count: evidences.length,
        evidences
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Helper: Obtener reporte desde base de datos
   */
  async getResultFromDB(executionId, req, res) {
    try {
      const db = getDatabase();
      const report = db.getExecutionReport(executionId);

      if (!report) {
        return res.status(404).json({ error: 'Ejecución no encontrada' });
      }

      // Los logs ya vienen parseados desde getExecutionReport
      res.json({
        ...report,
        source: 'database'
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Helper: Obtener reporte desde archivo legacy
   */
  async getResultFromFile(filename, req, res) {
    try {
      const filePath = `./tests/results/${filename}`;

      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        res.json({
          filename,
          content,
          source: 'file',
          legacy: true
        });
      } else {
        res.status(404).json({ error: 'Reporte no encontrado' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Helper: Generar preview de una ejecución
   */
  generatePreview(execution) {
    const status = execution.status === 'success' ? '✅ Exitoso' : '❌ Fallido';
    const duration = execution.duration ? `${(execution.duration / 1000).toFixed(2)}s` : 'N/A';

    return `${status} - ${execution.test_name} - Duración: ${duration}`;
  }

  /**
   * DELETE /api/results/:id - Eliminar reporte
   */
  async deleteResult(req, res) {
    try {
      const { id } = req.params;

      if (/^\d+$/.test(id)) {
        // Eliminar de base de datos (cascade eliminará evidencias)
        const db = getDatabase();
        const execution = db.getExecutionById(parseInt(id));

        if (!execution) {
          return res.status(404).json({ error: 'Ejecución no encontrada' });
        }

        // Obtener evidencias para eliminar archivos físicos
        const evidences = db.getEvidencesByExecution(parseInt(id));

        for (const evidence of evidences) {
          try {
            if (fs.existsSync(evidence.file_path)) {
              fs.unlinkSync(evidence.file_path);
            }
          } catch (e) {
            console.warn(`No se pudo eliminar archivo: ${evidence.file_path}`);
          }
        }

        // Eliminar registro de DB (cascade eliminará evidencias)
        db.db.prepare('DELETE FROM executions WHERE id = ?').run(parseInt(id));

        res.json({ success: true, message: 'Ejecución eliminada' });
      } else {
        // Eliminar archivo legacy
        const filePath = `./tests/results/${id}`;
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          res.json({ success: true, message: 'Archivo eliminado' });
        } else {
          res.status(404).json({ error: 'Archivo no encontrado' });
        }
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new ResultsController();
