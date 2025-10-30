#!/usr/bin/env node

/**
 * Wrapper para el servidor web modular
 *
 * Este script es un simple punto de entrada que inicia
 * el servidor Express modular ubicado en server/app.js
 *
 * Mantiene compatibilidad con: npm run web
 */

// Inicializar variables globales para tracking
global.activeTestRuns = new Map(); // testId -> { status, logs, results }
global.runnerInstance = null;      // Instancia del runner compartida

// Iniciar el servidor modular
require('../server/app.js');
