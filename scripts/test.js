const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Parsear argumentos
let suiteFile = null;
let executionMode = 'auto';
let args = [];

// Procesar argumentos
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--mode' || process.argv[i] === '-m') {
    executionMode = process.argv[i + 1];
    i++; // Saltar el valor del modo
  } else if (!process.argv[i].startsWith('-')) {
    suiteFile = process.argv[i];
  } else {
    args.push(process.argv[i]);
  }
}

// 1. Validar que se proporcionó un archivo
if (!suiteFile) {
  console.error('❌ Error: No se especificó un archivo de suite de pruebas.');
  console.log('Uso: npm run test-llm <ruta_al_archivo_de_la_suite.yml>');
  console.log('Ejemplo: npm run test-llm tests/suites/mi-test.yml');
  process.exit(1);
}

// Construir la ruta absoluta para asegurar que el archivo se encuentre
const absoluteSuitePath = path.resolve(process.cwd(), suiteFile);

// 2. Validar que el archivo existe
if (!fs.existsSync(absoluteSuitePath)) {
  console.error(`❌ Error: El archivo de suite '${suiteFile}' no se encuentra en la ruta especificada.`);
  process.exit(1);
}

console.log(`▶️  Iniciando la suite de pruebas: ${suiteFile}`);
console.log(`⚙️  Modo de ejecución: ${executionMode}\n`);

// Definir el proceso a ejecutar
const runnerPath = path.join(__dirname, '..', 'runners', 'universal-runner.js');

// Construir argumentos para el runner
const runnerArgs = [runnerPath, suiteFile, '--mode', executionMode, ...args];

const child = spawn('node', runnerArgs, {
  stdio: 'inherit'
});

// Manejar el cierre del proceso hijo
child.on('close', (code) => {
  if (code === 0) {
    console.log(`\n✅ Suite de pruebas '${suiteFile}' completada con éxito.`);
  } else {
    console.error(`\n❌ La suite de pruebas '${suiteFile}' finalizó con errores (código de salida: ${code}).`);
  }
  process.exit(code);
});

child.on('error', (err) => {
  console.error('❌ Error al iniciar el runner de pruebas:', err);
  process.exit(1);
});
