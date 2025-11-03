const express = require('express');
const router = express.Router();
const resultsController = require('../controllers/resultsController');

/**
 * Rutas para resultados y reportes
 */

// GET /api/results - Listar reportes
router.get('/', resultsController.listResults.bind(resultsController));

// GET /api/results/:id/html - Obtener reporte en formato HTML
router.get('/:id/html', resultsController.getResultHTML.bind(resultsController));

// GET /api/results/:id/evidences - Obtener evidencias de una ejecución
router.get('/:id/evidences', resultsController.getEvidences.bind(resultsController));

// DELETE /api/results/:id - Eliminar reporte
router.delete('/:id', resultsController.deleteResult.bind(resultsController));

// GET /api/results/:id - Obtener reporte específico (debe ir al final)
router.get('/:id', resultsController.getResult.bind(resultsController));

module.exports = router;
