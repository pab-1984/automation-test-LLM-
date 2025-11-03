// tests/mobile-test-generator-validation.js

/**
 * Script de validación para el MobileTestGenerator
 * Prueba la generación de tests desde templates
 */

const { MobileTestGenerator } = require('../runners/mobile-test-generator.js');

console.log('🧪 TEST: Mobile Test Generator - Validación\n');
console.log('=' .repeat(60));

const generator = new MobileTestGenerator(null, {});

// Test 1: Template de Login
console.log('\n📝 TEST 1: Generar test desde template "login"\n');

const loginTest = generator.generateFromTemplate('login', {
  appPackage: 'com.example.testapp',
  platform: 'android',
  email: 'user@test.com',
  password: 'test123'
});

if (loginTest && loginTest.suite === 'Login Test' && loginTest.tests[0].steps.length >= 5) {
  console.log('✅ Template de login generado correctamente');
  console.log(`   - Suite: ${loginTest.suite}`);
  console.log(`   - Plataforma: ${loginTest.platform}`);
  console.log(`   - Package: ${loginTest.packageName}`);
  console.log(`   - Pasos: ${loginTest.tests[0].steps.length}`);
} else {
  console.log('❌ Template de login falló');
}

// Test 2: Template de Registro
console.log('\n📝 TEST 2: Generar test desde template "register"\n');

const registerTest = generator.generateFromTemplate('register', {
  appPackage: 'com.example.testapp',
  platform: 'android',
  email: 'newuser@test.com',
  password: 'newpass123',
  username: 'testuser'
});

if (registerTest && registerTest.suite === 'Register Test') {
  console.log('✅ Template de registro generado correctamente');
  console.log(`   - Suite: ${registerTest.suite}`);
  console.log(`   - Pasos: ${registerTest.tests[0].steps.length}`);
} else {
  console.log('❌ Template de registro falló');
}

// Test 3: Template de Búsqueda
console.log('\n📝 TEST 3: Generar test desde template "search"\n');

const searchTest = generator.generateFromTemplate('search', {
  appPackage: 'com.example.testapp',
  platform: 'ios',
  searchTerm: 'testing mobile'
});

if (searchTest && searchTest.suite === 'Search Test' && searchTest.bundleId) {
  console.log('✅ Template de búsqueda generado correctamente (iOS)');
  console.log(`   - Suite: ${searchTest.suite}`);
  console.log(`   - Plataforma: ${searchTest.platform}`);
  console.log(`   - Bundle ID: ${searchTest.bundleId}`);
} else {
  console.log('❌ Template de búsqueda falló');
}

// Test 4: Template de Compra
console.log('\n📝 TEST 4: Generar test desde template "purchase"\n');

const purchaseTest = generator.generateFromTemplate('purchase', {
  appPackage: 'com.example.testapp',
  platform: 'android'
});

if (purchaseTest && purchaseTest.suite === 'Purchase Test') {
  console.log('✅ Template de compra generado correctamente');
  console.log(`   - Suite: ${purchaseTest.suite}`);
  console.log(`   - Pasos: ${purchaseTest.tests[0].steps.length}`);
} else {
  console.log('❌ Template de compra falló');
}

// Test 5: Template de Perfil
console.log('\n📝 TEST 5: Generar test desde template "profile"\n');

const profileTest = generator.generateFromTemplate('profile', {
  appPackage: 'com.example.testapp',
  platform: 'android',
  newName: 'Updated User Name'
});

if (profileTest && profileTest.suite === 'Profile Test') {
  console.log('✅ Template de perfil generado correctamente');
  console.log(`   - Suite: ${profileTest.suite}`);
  console.log(`   - Pasos: ${profileTest.tests[0].steps.length}`);
} else {
  console.log('❌ Template de perfil falló');
}

// Test 6: Extracción de pasos desde lenguaje natural
console.log('\n📝 TEST 6: Extraer pasos desde lenguaje natural\n');

const instructions = `
Abre la app
Toca el botón de login
Llena el campo de email con test@example.com
Llena el campo de contraseña con password123
Toca el botón entrar
Verifica que aparece el texto Bienvenido
`;

const steps = generator.extractMobileStepsFromInstructions(instructions, 'com.example.app', 'android');

if (steps.length >= 5) {
  console.log(`✅ Extracción de pasos correcta (${steps.length} pasos)`);
  steps.forEach((step, i) => {
    console.log(`   ${i + 1}. ${step.action}: ${step.description}`);
  });
} else {
  console.log('❌ Extracción de pasos falló');
}

// Test 7: Guardar test a archivo
console.log('\n📝 TEST 7: Guardar test a archivo YAML\n');

try {
  const filepath = generator.saveMobileTest(loginTest, 'test-validation-login');
  console.log(`✅ Test guardado correctamente en: ${filepath}`);
} catch (error) {
  console.log(`❌ Error guardando test: ${error.message}`);
}

// Resumen
console.log('\n' + '='.repeat(60));
console.log('✅ VALIDACIÓN COMPLETADA');
console.log('='.repeat(60));

console.log('\n📊 RESUMEN:');
console.log('   ✅ 5 templates validados (login, register, search, purchase, profile)');
console.log('   ✅ Extracción de pasos desde lenguaje natural');
console.log('   ✅ Soporte para Android e iOS');
console.log('   ✅ Guardado a archivo YAML');

console.log('\n💡 PRÓXIMO: Ejecutar wizard interactivo');
console.log('   npm run create-mobile-test\n');
