const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');

/**
 * Rutas para tests YAML
 */

// GET /api/tests - Listar tests
router.get('/', testController.listTests.bind(testController));

// POST /api/tests/create - Crear test desde lenguaje natural
router.post('/create', testController.createTest.bind(testController));

// POST /api/tests/run - Ejecutar test
router.post('/run', testController.runTest.bind(testController));

// GET /api/tests/status/:testId - Estado de ejecución
router.get('/status/:testId', testController.getTestStatus.bind(testController));

module.exports = router;
