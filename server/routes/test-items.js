/**
 * Rutas de API para Test Items
 */

const express = require('express');
const router = express.Router();
const testItemController = require('../controllers/testItemController');

// Rutas de tests
router.get('/', testItemController.getAllTests);
router.get('/suite/:suiteId', testItemController.getTestsBySuite);
router.get('/:id', testItemController.getTestById);
router.post('/', testItemController.addTestToSuite);
router.put('/:id', testItemController.updateTest);
router.delete('/:id', testItemController.deleteTest);
router.post('/:id/execute', testItemController.executeTest);

module.exports = router;
