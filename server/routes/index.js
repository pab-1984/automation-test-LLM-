const express = require('express');
const router = express.Router();

// Importar sub-routers
const apiRouter = require('./api');
const testsRouter = require('./tests');
const naturalRouter = require('./natural');
const resultsRouter = require('./results');

// Nuevas rutas para base de datos
const projectsRouter = require('./projects');
const suitesRouter = require('./suites');
const testItemsRouter = require('./test-items');

// Montar sub-routers
router.use('/', apiRouter);        // /api/status, /api/llm/switch
router.use('/tests', testsRouter); // /api/tests/*
router.use('/tests/natural', naturalRouter); // /api/tests/natural/*
router.use('/results', resultsRouter); // /api/results/*

// Rutas de base de datos
router.use('/projects', projectsRouter);      // /api/projects/*
router.use('/suites', suitesRouter);          // /api/suites/*
router.use('/test-items', testItemsRouter);   // /api/test-items/*

module.exports = router;
