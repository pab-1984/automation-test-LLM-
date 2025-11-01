/**
 * Script para importar tests en lenguaje natural a la base de datos.
 */

const fs = require('fs');
const path = require('path');
const { getDatabase } = require('../database/db');

const NATURAL_TESTS_DIR = path.join(__dirname, '../tests/natural');

async function importNaturalTests() {
  try {
    const db = getDatabase();

    // 1. Asegurar que existe un proyecto y una suite por defecto
    let projectId = db.getProjectById(1)?.id;
    if (!projectId) {
      const project = db.createProject('Proyecto Principal', 'Proyecto por defecto para tests importados');
      projectId = project.id;
      console.log(`✅ Proyecto "Proyecto Principal" creado (ID: ${projectId})`);
    }

    let suiteId = db.getSuitesByProject(projectId).find(s => s.name === 'Tests Naturales')?.id;
    if (!suiteId) {
      const suite = db.createSuite(projectId, 'Tests Naturales', 'Tests importados desde la carpeta /tests/natural');
      suiteId = suite.id;
      console.log(`✅ Suite "Tests Naturales" creada (ID: ${suiteId})`);
    }

    // 2. Leer los archivos de la carpeta /tests/natural
    if (!fs.existsSync(NATURAL_TESTS_DIR)) {
      console.log('ℹ️ No existe la carpeta /tests/natural. No hay tests para importar.');
      return;
    }

    const files = fs.readdirSync(NATURAL_TESTS_DIR).filter(f => f.endsWith('.txt'));

    if (files.length === 0) {
      console.log('ℹ️ No se encontraron tests en /tests/natural para importar.');
      return;
    }

    console.log(`Encontrados ${files.length} tests para importar...`);

    let importCount = 0;
    for (const file of files) {
      const filePath = path.join(NATURAL_TESTS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');

      // 3. Parsear el contenido del archivo
      const nameMatch = content.match(/^TEST:\s*(.+)$/m);
      const urlMatch = content.match(/^URL:\s*(.+)$/m);
      const descMatch = content.match(/^Descripción:\s*(.+)$/m);

      const name = nameMatch ? nameMatch[1].trim() : file.replace('.txt', '');
      const url = urlMatch ? urlMatch[1].trim() : '';
      const description = descMatch ? descMatch[1].trim() : '';

      // 4. Verificar si el test ya existe en la base de datos (por file_path)
      const existingTest = db.db.prepare('SELECT * FROM tests WHERE file_path = ?').get(filePath);

      if (existingTest) {
        console.log(`- Test "${name}" ya existe. Omitiendo.`);
        continue;
      }

      // 5. Insertar en la base de datos
      db.createTest(suiteId, name, 'natural', filePath, description, url);
      importCount++;
      console.log(`+ Test "${name}" importado correctamente.`);
    }

    console.log(`
🎉 Proceso finalizado. ${importCount} tests nuevos importados.`);

  } catch (error) {
    console.error('❌ Error durante la importación:', error);
  } finally {
    const db = getDatabase();
    if (db && db.close) {
      db.close();
    }
  }
}

importNaturalTests();
