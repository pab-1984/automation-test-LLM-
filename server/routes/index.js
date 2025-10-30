const express = require('express');
const router = express.Router();

// Importar sub-routers
const apiRouter = require('./api');
const testsRouter = require('./tests');
const naturalRouter = require('./natural');
const resultsRouter = require('./results');

// Montar sub-routers
router.use('/', apiRouter);        // /api/status, /api/llm/switch
router.use('/tests', testsRouter); // /api/tests/*
router.use('/tests/natural', naturalRouter); // /api/tests/natural/*
router.use('/results', resultsRouter); // /api/results/*

module.exports = router;
