/**
 * Controlador de Test Suites
 */

const { getDatabase } = require('../../database/db');

const suiteController = {
  // GET /api/suites - Obtener todas las suites
  getAllSuites(req, res) {
    try {
      const db = getDatabase();
      const suites = db.getAllSuites();
      res.json({ success: true, suites });
    } catch (error) {
      console.error('Error obteniendo suites:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/suites/project/:projectId - Obtener suites de un proyecto
  getSuitesByProject(req, res) {
    try {
      const db = getDatabase();
      const suites = db.getSuitesByProject(req.params.projectId);
      res.json({ success: true, suites });
    } catch (error) {
      console.error('Error obteniendo suites del proyecto:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/suites/:id - Obtener una suite específica
  getSuiteById(req, res) {
    try {
      const db = getDatabase();
      const suite = db.getSuiteById(req.params.id);

      if (!suite) {
        return res.status(404).json({ success: false, error: 'Suite no encontrada' });
      }

      const tests = db.getTestsBySuite(suite.id);

      res.json({ success: true, suite: { ...suite, tests } });
    } catch (error) {
      console.error('Error obteniendo suite:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // POST /api/suites - Crear una nueva suite
  createSuite(req, res) {
    try {
      const { projectId, name, description } = req.body;

      if (!projectId || !name) {
        return res.status(400).json({
          success: false,
          error: 'El ID del proyecto y el nombre son requeridos'
        });
      }

      const db = getDatabase();
      const suite = db.createSuite(projectId, name, description);

      res.json({ success: true, suite });
    } catch (error) {
      console.error('Error creando suite:', error);
      if (error.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({
          success: false,
          error: 'Ya existe una suite con ese nombre en este proyecto'
        });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  },

  // PUT /api/suites/:id - Actualizar una suite
  updateSuite(req, res) {
    try {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, error: 'El nombre es requerido' });
      }

      const db = getDatabase();
      const suite = db.updateSuite(req.params.id, name, description);

      if (!suite) {
        return res.status(404).json({ success: false, error: 'Suite no encontrada' });
      }

      res.json({ success: true, suite });
    } catch (error) {
      console.error('Error actualizando suite:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // DELETE /api/suites/:id - Eliminar una suite
  deleteSuite(req, res) {
    try {
      const db = getDatabase();
      const result = db.deleteSuite(req.params.id);

      if (result.changes === 0) {
        return res.status(404).json({ success: false, error: 'Suite no encontrada' });
      }

      res.json({ success: true, message: 'Suite eliminada' });
    } catch (error) {
      console.error('Error eliminando suite:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = suiteController;
