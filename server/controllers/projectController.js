/**
 * Controlador de Proyectos
 */

const { getDatabase } = require('../../database/db');

const projectController = {
  // GET /api/projects - Obtener todos los proyectos
  getAllProjects(req, res) {
    try {
      const db = getDatabase();
      const projects = db.getAllProjects();

      // Agregar estadísticas a cada proyecto
      const projectsWithStats = projects.map(project => ({
        ...project,
        stats: db.getProjectStatistics(project.id)
      }));

      res.json({ success: true, projects: projectsWithStats });
    } catch (error) {
      console.error('Error obteniendo proyectos:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/projects/:id - Obtener un proyecto específico
  getProjectById(req, res) {
    try {
      const db = getDatabase();
      const project = db.getProjectById(req.params.id);

      if (!project) {
        return res.status(404).json({ success: false, error: 'Proyecto no encontrado' });
      }

      const stats = db.getProjectStatistics(project.id);
      const suites = db.getSuitesByProject(project.id);

      res.json({
        success: true,
        project: { ...project, stats, suites }
      });
    } catch (error) {
      console.error('Error obteniendo proyecto:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // POST /api/projects - Crear un nuevo proyecto
  createProject(req, res) {
    try {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, error: 'El nombre es requerido' });
      }

      const db = getDatabase();
      const project = db.createProject(name, description);

      res.json({ success: true, project });
    } catch (error) {
      console.error('Error creando proyecto:', error);
      if (error.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ success: false, error: 'Ya existe un proyecto con ese nombre' });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  },

  // PUT /api/projects/:id - Actualizar un proyecto
  updateProject(req, res) {
    try {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, error: 'El nombre es requerido' });
      }

      const db = getDatabase();
      const project = db.updateProject(req.params.id, name, description);

      if (!project) {
        return res.status(404).json({ success: false, error: 'Proyecto no encontrado' });
      }

      res.json({ success: true, project });
    } catch (error) {
      console.error('Error actualizando proyecto:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // DELETE /api/projects/:id - Eliminar un proyecto
  deleteProject(req, res) {
    try {
      const db = getDatabase();
      const result = db.deleteProject(req.params.id);

      if (result.changes === 0) {
        return res.status(404).json({ success: false, error: 'Proyecto no encontrado' });
      }

      res.json({ success: true, message: 'Proyecto eliminado' });
    } catch (error) {
      console.error('Error eliminando proyecto:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = projectController;
