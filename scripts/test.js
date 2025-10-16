const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Obtener la ruta del archivo de la suite de los argumentos de la línea de comandos
const suiteFile = process.argv[2];

// 1. Validar que se proporcionó un archivo
if (!suiteFile) {
  console.error('❌ Error: No se especificó un archivo de suite de pruebas.');
  console.log('Uso: npm test <ruta_al_archivo_de_la_suite.yml>');
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

// Definir el proceso a ejecutar
const runnerPath = path.join(__dirname, '..', 'runners', 'universal-runner.js');
const child = spawn('node', [runnerPath, suiteFile], {
  // stdio: 'inherit' es un atajo para pipear stdout, stderr, y stdin
  stdio: 'inherit'
});

// Manejar el cierre del proceso hijo
child.on('close', (code) => {
  if (code === 0) {
    console.log(`✅ Suite de pruebas '${suiteFile}' completada con éxito.`);
  } else {
    console.error(`❌ La suite de pruebas '${suiteFile}' finalizó con errores (código de salida: ${code}).`);
  }
  process.exit(code);
});

child.on('error', (err) => {
    console.error('❌ Error al iniciar el runner de pruebas:', err);
    process.exit(1);
});
