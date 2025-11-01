/**
 * Rutas de API para Test Items
 */

const express = require('express');
const router = express.Router();
const testItemController = require('../controllers/testItemController');

// Rutas de tests
router.get('/', testItemController.getAllTests.bind(testItemController));
router.get('/suite/:suiteId', testItemController.getTestsBySuite.bind(testItemController));
router.get('/:id', testItemController.getTestById.bind(testItemController));
router.post('/', testItemController.addTestToSuite.bind(testItemController));
router.put('/:id', testItemController.updateTest.bind(testItemController));
router.delete('/:id', testItemController.deleteTest.bind(testItemController));
router.post('/:id/execute', testItemController.executeTest.bind(testItemController));

module.exports = router;
