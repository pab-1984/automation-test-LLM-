const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

/**
 * GET /api/screenshots - Servir screenshots de tests
 * Query params:
 *   - path: Ruta del screenshot (ej: ./tests/screenshots/error-123.png)
 */
router.get('/', (req, res) => {
  try {
    const { path: screenshotPath } = req.query;

    if (!screenshotPath) {
      return res.status(400).json({
        success: false,
        error: 'Path del screenshot es requerido'
      });
    }

    // Resolver la ruta absoluta
    const absolutePath = path.resolve(screenshotPath);

    // Verificar que esté dentro del directorio de screenshots (seguridad)
    const screenshotsDir = path.resolve('./tests/screenshots');
    if (!absolutePath.startsWith(screenshotsDir)) {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado: path fuera del directorio de screenshots'
      });
    }

    // Verificar que el archivo existe
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({
        success: false,
        error: 'Screenshot no encontrado'
      });
    }

    // Determinar tipo de contenido
    const ext = path.extname(absolutePath).toLowerCase();
    const contentTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    // Servir el archivo
    res.type(contentType);
    const fileStream = fs.createReadStream(absolutePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error sirviendo screenshot:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
