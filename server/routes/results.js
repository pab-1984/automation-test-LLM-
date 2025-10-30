const express = require('express');
const router = express.Router();
const resultsController = require('../controllers/resultsController');

/**
 * Rutas para resultados y reportes
 */

// GET /api/results - Listar reportes
router.get('/', resultsController.listResults.bind(resultsController));

// GET /api/results/:filename - Obtener reporte específico
router.get('/:filename', resultsController.getResult.bind(resultsController));

module.exports = router;
