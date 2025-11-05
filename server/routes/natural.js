const express = require('express');
const router = express.Router();
const naturalController = require('../controllers/naturalController');

/**
 * Rutas para tests en lenguaje natural
 */

// GET /api/tests/natural - Listar tests naturales
router.get('/', naturalController.listNaturalTests.bind(naturalController));

// GET /api/tests/natural/:filename - Obtener test específico
router.get('/:filename', naturalController.getNaturalTest.bind(naturalController));

// POST /api/tests/natural/create - Crear test natural
router.post('/create', naturalController.createNaturalTest.bind(naturalController));

// POST /api/tests/natural/run - Ejecutar test natural
router.post('/run', naturalController.runNaturalTest.bind(naturalController));

// POST /api/tests/natural/regenerate-yaml - Regenerar YAML para test natural
router.post('/regenerate-yaml', naturalController.regenerateYAML.bind(naturalController));

module.exports = router;
