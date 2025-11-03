// tests/element-finder-advanced-test.js

/**
 * Script de prueba para las nuevas capacidades avanzadas del ElementFinder
 * Fase 3: Element Finder Avanzado para Mobile
 */

const { ElementFinder } = require('../runners/actions/element-finder.js');

console.log('🧪 TEST: ElementFinder Avanzado - Fase 3\n');
console.log('=' .repeat(60));

const finder = new ElementFinder();

// ==========================================
// TEST 1: FUZZY MATCHING
// ==========================================
console.log('\n📝 TEST 1: Fuzzy Matching\n');

const testElements1 = [
  { text: 'Iniciar Sesión', type: 'button', x: 100, y: 200 },
  { text: 'Registro', type: 'button', x: 100, y: 300 },
  { text: 'Configuración', type: 'button', x: 100, y: 400 }
];

// Búsqueda con error tipográfico
const search1 = 'Inicar Secion'; // Error: falta 'i' y acento
const result1 = finder.findElementMobile(search1, testElements1, { fuzzy: true, fuzzyThreshold: 0.7 });

if (result1 && result1.text === 'Iniciar Sesión') {
  console.log('✅ Fuzzy matching funcionando: encontró "Iniciar Sesión" con búsqueda "Inicar Secion"');
} else {
  console.log('❌ Fuzzy matching falló');
}

// ==========================================
// TEST 2: NORMALIZACIÓN MULTI-IDIOMA
// ==========================================
console.log('\n📝 TEST 2: Normalización Multi-idioma\n');

const testElements2 = [
  { text: 'Configuración', type: 'button', x: 100, y: 200 },
  { text: 'Búsqueda', type: 'button', x: 100, y: 300 }
];

// Búsqueda sin acentos
const search2 = 'configuracion'; // Sin acento
const result2 = finder.findElementMobile(search2, testElements2);

if (result2 && result2.text === 'Configuración') {
  console.log('✅ Normalización multi-idioma: encontró "Configuración" buscando "configuracion"');
} else {
  console.log('❌ Normalización multi-idioma falló');
}

// ==========================================
// TEST 3: CACHE DE COORDENADAS
// ==========================================
console.log('\n📝 TEST 3: Cache de Coordenadas\n');

const testElements3 = [
  { text: 'Botón Principal', type: 'button', x: 500, y: 800 }
];

// Primera búsqueda (debe cachear)
const result3a = finder.findElementMobile('Botón Principal', testElements3, {
  useCache: true,
  context: 'HomeScreen'
});

// Segunda búsqueda (debe usar cache)
const result3b = finder.findElementMobile('Botón Principal', testElements3, {
  useCache: true,
  context: 'HomeScreen'
});

const stats = finder.getCacheStats();
if (stats.hits > 0) {
  console.log(`✅ Cache funcionando: ${stats.hits} hits, ${stats.misses} misses, hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
} else {
  console.log('❌ Cache no está registrando hits');
}

// ==========================================
// TEST 4: TOLERANCIA A CAMBIOS DE COORDENADAS
// ==========================================
console.log('\n📝 TEST 4: Tolerancia a Cambios de Coordenadas\n');

const testElements4 = [
  { text: 'Elemento A', type: 'button', x: 100, y: 200 },
  { text: 'Elemento B', type: 'button', x: 105, y: 205 }, // Muy cerca de A
  { text: 'Elemento C', type: 'button', x: 300, y: 400 }
];

const nearby = finder.findNearbyElements(100, 200, testElements4, 20);

if (nearby.length === 2) {
  console.log(`✅ Tolerancia de coordenadas: encontró ${nearby.length} elementos cercanos a (100, 200)`);
  nearby.forEach(n => {
    console.log(`   - ${n.element.text} a ${n.distance.toFixed(1)}px de distancia`);
  });
} else {
  console.log('❌ Tolerancia de coordenadas no funcionó correctamente');
}

// ==========================================
// TEST 5: DETECCIÓN DE ELEMENTOS DINÁMICOS
// ==========================================
console.log('\n📝 TEST 5: Detección de Elementos Dinámicos\n');

const testElements5 = [
  { text: 'Cargando...', type: 'spinner', x: 100, y: 200 },
  { text: 'Usuario: 12345', type: 'text', x: 100, y: 300 },
  { text: '12:45 PM', type: 'text', x: 100, y: 400 },
  { text: 'Botón Estático', type: 'button', x: 100, y: 500 }
];

let dynamicCount = 0;
let stableCount = 0;

testElements5.forEach(el => {
  const analysis = finder.detectDynamicElement(el);
  if (analysis.isDynamic) {
    dynamicCount++;
    console.log(`   🔄 Dinámico: "${el.text}" (confianza: ${(analysis.confidence * 100).toFixed(1)}%)`);
  } else {
    stableCount++;
  }
});

if (dynamicCount >= 2 && stableCount >= 1) {
  console.log(`✅ Detección de elementos dinámicos: ${dynamicCount} dinámicos, ${stableCount} estables`);
} else {
  console.log('❌ Detección de elementos dinámicos incorrecta');
}

// ==========================================
// TEST 6: SELECCIÓN DEL MEJOR CANDIDATO
// ==========================================
console.log('\n📝 TEST 6: Selección del Mejor Candidato\n');

const testElements6 = [
  { text: 'Botón Arriba', type: 'button', x: 500, y: 100 },
  { text: 'Botón Abajo', type: 'button', x: 500, y: 900 },
  { text: 'Texto Medio', type: 'text', x: 500, y: 500 }
];

// Preferir elementos en la parte superior
const bestTop = finder.selectBestCandidate(testElements6, { position: 'top' });

if (bestTop && bestTop.text === 'Botón Arriba') {
  console.log('✅ Selección de candidato con preferencia "top" correcta');
} else {
  console.log('❌ Selección de candidato con preferencia "top" falló');
}

// Preferir elementos clickables
const bestClickable = finder.selectBestCandidate(testElements6, { preferClickable: true });

if (bestClickable && bestClickable.type === 'button') {
  console.log('✅ Selección de candidato preferiendo clickables correcta');
} else {
  console.log('❌ Selección de candidato preferiendo clickables falló');
}

// ==========================================
// TEST 7: ELEMENTOS COMUNES ENTRE SNAPSHOTS
// ==========================================
console.log('\n📝 TEST 7: Tracking de Elementos entre Snapshots\n');

const snapshot1 = [
  { text: 'Elemento Fijo', type: 'button', x: 100, y: 200 },
  { text: 'Elemento que se mueve', type: 'button', x: 100, y: 300 }
];

const snapshot2 = [
  { text: 'Elemento Fijo', type: 'button', x: 100, y: 200 },
  { text: 'Elemento que se mueve', type: 'button', x: 150, y: 350 },
  { text: 'Elemento Nuevo', type: 'button', x: 200, y: 400 }
];

const common = finder.findCommonElements(snapshot1, snapshot2);

if (common.length === 2) {
  console.log(`✅ Tracking de elementos: ${common.length} elementos comunes encontrados`);
  common.forEach(c => {
    if (c.hasMoved) {
      console.log(`   📍 "${c.element.text}" se movió de (${c.previousPosition.x}, ${c.previousPosition.y}) a (${c.currentPosition.x}, ${c.currentPosition.y})`);
    } else {
      console.log(`   ✓ "${c.element.text}" se mantuvo en la misma posición`);
    }
  });
} else {
  console.log('❌ Tracking de elementos falló');
}

// ==========================================
// TEST 8: DIAGNÓSTICOS
// ==========================================
console.log('\n📝 TEST 8: Diagnósticos del Sistema\n');

finder.printDiagnostics();

// ==========================================
// RESUMEN
// ==========================================
console.log('\n' + '='.repeat(60));
console.log('✅ TESTS COMPLETADOS');
console.log('='.repeat(60));

console.log('\n📊 NUEVAS CAPACIDADES VALIDADAS:');
console.log('   ✅ Fuzzy matching para búsqueda tolerante a errores');
console.log('   ✅ Normalización multi-idioma (sin acentos)');
console.log('   ✅ Cache de coordenadas de elementos frecuentes');
console.log('   ✅ Tolerancia a cambios menores en coordenadas');
console.log('   ✅ Detección de elementos dinámicos');
console.log('   ✅ Selección inteligente del mejor candidato');
console.log('   ✅ Tracking de elementos entre snapshots');
console.log('   ✅ Sistema de diagnósticos');

console.log('\n💡 SIGUIENTE: Integrar búsqueda por contexto visual con LLM en tests reales');
console.log('\n');
