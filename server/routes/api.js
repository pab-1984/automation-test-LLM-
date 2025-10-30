const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');

/**
 * Rutas principales de la API
 */

// GET /api/status - Estado del sistema
router.get('/status', systemController.getStatus.bind(systemController));

// POST /api/llm/switch - Cambiar LLM activo
router.post('/llm/switch', systemController.switchLLM.bind(systemController));

module.exports = router;
