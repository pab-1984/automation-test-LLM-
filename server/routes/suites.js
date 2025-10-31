/**
 * Rutas de API para Test Suites
 */

const express = require('express');
const router = express.Router();
const suiteController = require('../controllers/suiteController');

// Rutas de suites
router.get('/', suiteController.getAllSuites);
router.get('/project/:projectId', suiteController.getSuitesByProject);
router.get('/:id', suiteController.getSuiteById);
router.post('/', suiteController.createSuite);
router.put('/:id', suiteController.updateSuite);
router.delete('/:id', suiteController.deleteSuite);

module.exports = router;
