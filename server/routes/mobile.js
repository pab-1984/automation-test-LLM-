// server/routes/mobile.js

const express = require('express');
const router = express.Router();
const mobileController = require('../controllers/mobileController');

// GET /api/mobile/devices - Lista dispositivos móviles
router.get('/devices', mobileController.getDevices);

// GET /api/mobile/devices/:deviceId - Info de dispositivo específico
router.get('/devices/:deviceId', mobileController.getDeviceInfo);

// POST /api/mobile/devices/:deviceId/screenshot - Screenshot de dispositivo
router.post('/devices/:deviceId/screenshot', mobileController.takeDeviceScreenshot);

// POST /api/mobile/devices/:deviceId/stop - Detener emulador
router.post('/devices/:deviceId/stop', mobileController.stopEmulatorEndpoint);

// GET /api/mobile/emulators - Lista emuladores disponibles (AVDs)
router.get('/emulators', mobileController.getAvailableEmulators);

// POST /api/mobile/emulators/:avdName/start - Iniciar emulador específico
router.post('/emulators/:avdName/start', mobileController.startEmulatorEndpoint);

module.exports = router;
