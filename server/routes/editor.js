const express = require('express');
const router = express.Router();
const editorController = require('../controllers/editorController');

// Cargar test para editar
router.get('/load', editorController.loadTest.bind(editorController));

// Guardar test editado
router.post('/save', editorController.saveTest.bind(editorController));

// Crear nuevo test
router.post('/create', editorController.createTest.bind(editorController));

module.exports = router;
