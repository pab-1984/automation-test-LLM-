#!/usr/bin/env node

/**
 * Script de migración de base de datos
 * Recrea la base de datos con el nuevo schema
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../database/testing_automation.db');

console.log('🔄 Iniciando migración de base de datos...\n');

// 1. Eliminar base de datos existente
if (fs.existsSync(dbPath)) {
  console.log('📦 Eliminando base de datos existente...');
  fs.unlinkSync(dbPath);
  console.log('✅ Base de datos eliminada\n');
} else {
  console.log('ℹ️  No existe base de datos previa\n');
}

// 2. Recrear base de datos
console.log('🔨 Creando nueva base de datos con schema actualizado...');
const { getDatabase } = require('../database/db');
const db = getDatabase();

console.log('✅ Base de datos creada exitosamente\n');

console.log('📊 Resumen de cambios:');
console.log('  • suite_id en tabla tests ahora permite NULL');
console.log('  • Al eliminar suite → tests quedan sin suite (no se eliminan)');
console.log('  • Al eliminar proyecto → se eliminan suites → tests quedan sin suite');
console.log('  • Los archivos .txt de tests NUNCA se eliminan\n');

console.log('✅ Migración completada exitosamente!');
console.log('\n💡 Ahora puedes reiniciar el servidor: npm run web\n');
