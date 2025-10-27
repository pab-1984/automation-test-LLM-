// runners/test-generator.js
// Generador de tests desde lenguaje natural

const fs = require('fs');
const yaml = require('js-yaml');

/**
 * TestGenerator: Convierte lenguaje natural a tests automatizados
 *
 * Flujo:
 * 1. Usuario escribe en lenguaje natural
 * 2. LLM convierte a YAML con descripciones (sin selectores técnicos)
 * 3. Sistema ejecuta y captura snapshot
 * 4. LLM mapea descripciones a UIDs específicos
 * 5. Genera test compilado que se ejecuta sin LLM
 */
class TestGenerator {
  constructor(llmAdapter, config) {
    this.llmAdapter = llmAdapter;
    this.config = config;
  }

  /**
   * Convierte instrucciones en lenguaje natural a test YAML
   *
   * @param {string} naturalLanguageInstructions - Instrucciones del usuario
   * @param {string} baseUrl - URL de la aplicación
   * @param {string} suiteName - Nombre de la suite
   * @returns {Object} Test en formato YAML (sin UIDs todavía)
   */
  async convertNaturalLanguageToTest(naturalLanguageInstructions, baseUrl, suiteName) {
    console.log('\n🤖 Paso 1: Convirtiendo lenguaje natural a test YAML...');

    const prompt = this.buildConversionPrompt(naturalLanguageInstructions, baseUrl, suiteName);

    try {
      const response = await this.llmAdapter.processStep(prompt, {
        step: { action: 'generate_test' },
        baseUrl: baseUrl
      });

      // Si el LLM devuelve un objeto con la estructura del test
      if (response && response.test) {
        return response.test;
      }

      // Si el LLM devuelve directamente el YAML como string
      if (typeof response === 'string' && response.includes('suite:')) {
        return yaml.load(response);
      }

      // Intentar parsear del response completo
      const yamlMatch = response.toString().match(/```(?:yaml)?\n([\s\S]*?)\n```/);
      if (yamlMatch) {
        return yaml.load(yamlMatch[1]);
      }

      // Si nada funciona, generar test básico
      console.log('⚠️  LLM no generó formato esperado, creando estructura básica...');
      return this.generateBasicTestStructure(naturalLanguageInstructions, baseUrl, suiteName);

    } catch (error) {
      console.error(`❌ Error en conversión: ${error.message}`);
      console.log('📝 Generando test básico como fallback...');
      return this.generateBasicTestStructure(naturalLanguageInstructions, baseUrl, suiteName);
    }
  }

  /**
   * Construye el prompt para convertir lenguaje natural a YAML
   */
  buildConversionPrompt(instructions, baseUrl, suiteName) {
    return `Eres un generador de tests automatizados. Tu trabajo es convertir instrucciones en lenguaje natural a un test en formato YAML.

## INSTRUCCIONES DEL USUARIO:
${instructions}

## CONTEXTO:
- Nombre de la suite: ${suiteName}
- URL de la aplicación: ${baseUrl}

## TU TAREA:
Convierte las instrucciones a un test en formato YAML.

IMPORTANTE:
- NO uses selectores técnicos (CSS, XPath, etc.)
- USA descripciones en lenguaje natural
- Las descripciones deben ser claras para que otro LLM pueda buscar elementos
- Divide en pasos lógicos
- Cada paso debe tener "action" y "description"

## ACCIONES DISPONIBLES:
- navigate: Navegar a una URL
- click: Hacer click (sin selector, solo descripción del elemento)
- fill: Llenar un campo (sin selector, describe el campo)
- verify: Verificar algo (describe qué verificar)
- wait: Esperar algo (describe qué esperar)
- screenshot: Tomar captura de pantalla

## FORMATO DE SALIDA (YAML):
\`\`\`yaml
suite: "${suiteName}"
description: "Descripción generada de qué hace este test"
baseUrl: "${baseUrl}"
mode: "auto"

tests:
  - name: "TC001 - Nombre descriptivo"
    steps:
      - action: "navigate"
        url: "\${baseUrl}"
        description: "Ir a la página principal"

      - action: "click"
        description: "Hacer click en el botón que dice 'Agregar al carrito' o 'Add to Cart'"

      - action: "verify"
        description: "Verificar que el carrito muestre 1 producto"

      - action: "screenshot"
        filename: "resultado"
        description: "Capturar resultado final"

    expectedResult: "El producto se agrega al carrito correctamente"
\`\`\`

IMPORTANTE: Responde SOLO con el YAML, sin explicaciones adicionales.`;
  }

  /**
   * Genera estructura de test básica cuando el LLM falla
   */
  generateBasicTestStructure(instructions, baseUrl, suiteName) {
    // Dividir las instrucciones en pasos simples
    const steps = this.extractStepsFromInstructions(instructions);

    return {
      suite: suiteName,
      description: `Test generado desde: ${instructions.substring(0, 100)}...`,
      baseUrl: baseUrl,
      mode: 'auto',
      tests: [
        {
          name: 'TC001 - Test generado automáticamente',
          steps: steps,
          expectedResult: 'Test ejecutado correctamente'
        }
      ]
    };
  }

  /**
   * Extrae pasos básicos de las instrucciones en lenguaje natural
   */
  extractStepsFromInstructions(instructions) {
    const steps = [];
    const lowerInstructions = instructions.toLowerCase();

    // Detectar navegación
    if (lowerInstructions.includes('abre') ||
        lowerInstructions.includes('navega') ||
        lowerInstructions.includes('ve a')) {
      steps.push({
        action: 'navigate',
        url: '${baseUrl}',
        description: 'Navegar a la aplicación'
      });
    }

    // Detectar clicks
    const clickPatterns = [
      /haz click en (?:el |la )?(.+?)(?:\.|,|$)/gi,
      /clickea (?:el |la )?(.+?)(?:\.|,|$)/gi,
      /presiona (?:el |la )?(.+?)(?:\.|,|$)/gi,
      /selecciona (?:el |la )?(.+?)(?:\.|,|$)/gi
    ];

    clickPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(lowerInstructions)) !== null) {
        steps.push({
          action: 'click',
          description: `Hacer click en ${match[1]}`
        });
      }
    });

    // Detectar llenado de campos
    const fillPatterns = [
      /ingresa (.+?) en (?:el campo )?(.+?)(?:\.|,|$)/gi,
      /escribe (.+?) en (?:el campo )?(.+?)(?:\.|,|$)/gi,
      /llena (?:el campo )?(.+?) con (.+?)(?:\.|,|$)/gi
    ];

    fillPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(lowerInstructions)) !== null) {
        steps.push({
          action: 'fill',
          description: `Llenar campo: ${match[2] || match[1]}`,
          value: match[1]
        });
      }
    });

    // Detectar verificaciones
    const verifyPatterns = [
      /verifica (?:que )?(.+?)(?:\.|,|$)/gi,
      /comprueba (?:que )?(.+?)(?:\.|,|$)/gi,
      /asegura(?:te)? (?:que )?(.+?)(?:\.|,|$)/gi
    ];

    verifyPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(lowerInstructions)) !== null) {
        steps.push({
          action: 'verify',
          description: `Verificar que ${match[1]}`
        });
      }
    });

    // Si no detectamos pasos, agregar uno genérico
    if (steps.length === 0) {
      steps.push({
        action: 'navigate',
        url: '${baseUrl}',
        description: 'Navegar a la aplicación'
      });
      steps.push({
        action: 'screenshot',
        filename: 'test-generado',
        description: 'Capturar pantalla de la aplicación'
      });
    }

    // Siempre agregar screenshot final
    steps.push({
      action: 'screenshot',
      filename: 'resultado-final',
      description: 'Capturar resultado final'
    });

    return steps;
  }

  /**
   * Guarda el test generado en un archivo YAML
   */
  saveTest(testStructure, filename) {
    const yamlContent = yaml.dump(testStructure, {
      indent: 2,
      lineWidth: 120,
      noRefs: true
    });

    const filepath = `./tests/suites/${filename}.yml`;
    fs.writeFileSync(filepath, yamlContent, 'utf8');

    console.log(`✅ Test guardado: ${filepath}`);
    return filepath;
  }

  /**
   * Mapea descripciones en lenguaje natural a UIDs específicos
   * usando el snapshot de la aplicación
   */
  async mapDescriptionsToUIDs(testStructure, snapshot, elementFinder) {
    console.log('\n🔨 Paso 2: Mapeando descripciones a elementos específicos...');

    const mappedTest = { ...testStructure };
    mappedTest.tests = [];

    for (const test of testStructure.tests) {
      const mappedTestCase = { ...test, steps: [] };

      for (const step of test.steps) {
        const mappedStep = await this.mapStepToUID(step, snapshot, elementFinder);
        mappedTestCase.steps.push(mappedStep);
      }

      mappedTest.tests.push(mappedTestCase);
    }

    return mappedTest;
  }

  /**
   * Mapea un paso individual a UID específico
   */
  async mapStepToUID(step, snapshot, elementFinder) {
    const mappedStep = { ...step };

    // Acciones que no necesitan mapeo
    const noMappingActions = ['navigate', 'screenshot', 'wait'];
    if (noMappingActions.includes(step.action)) {
      return mappedStep;
    }

    // Intentar encontrar elemento por descripción
    console.log(`  🔍 Mapeando: ${step.description}`);

    try {
      // Buscar en el snapshot usando la descripción
      const uid = await this.findUIDByDescription(step.description, snapshot, elementFinder);

      if (uid) {
        mappedStep.uid = uid;
        mappedStep.originalDescription = step.description;
        console.log(`    ✅ Encontrado UID: ${uid}`);
      } else {
        console.log(`    ⚠️  No se encontró UID, se usará descripción en ejecución`);
      }
    } catch (error) {
      console.log(`    ❌ Error mapeando: ${error.message}`);
    }

    return mappedStep;
  }

  /**
   * Busca UID en el snapshot basado en descripción en lenguaje natural
   */
  async findUIDByDescription(description, snapshot, elementFinder) {
    // Buscar patrones comunes en la descripción
    const lowerDesc = description.toLowerCase();

    // Buscar por texto exacto en botones
    if (lowerDesc.includes('botón') || lowerDesc.includes('button')) {
      const textMatch = description.match(/["'](.+?)["']|"(.+?)"|'(.+?)'|dice\s+(.+?)(?:\s|$)/i);
      if (textMatch) {
        const buttonText = textMatch[1] || textMatch[2] || textMatch[3] || textMatch[4];

        // Buscar en el snapshot
        const lines = snapshot.split('\n');
        for (const line of lines) {
          if (line.includes('button') && line.toLowerCase().includes(buttonText.toLowerCase())) {
            const uidMatch = line.match(/uid=(\d+_\d+)/);
            if (uidMatch) {
              return uidMatch[1];
            }
          }
        }
      }
    }

    // Buscar por tipo de elemento
    if (lowerDesc.includes('campo') || lowerDesc.includes('input')) {
      const lines = snapshot.split('\n');
      for (const line of lines) {
        if (line.includes('input') || line.includes('textbox')) {
          const uidMatch = line.match(/uid=(\d+_\d+)/);
          if (uidMatch) {
            return uidMatch[1];
          }
        }
      }
    }

    // Buscar por palabras clave en el contenido
    const keywords = this.extractKeywords(description);
    if (keywords.length > 0) {
      const lines = snapshot.split('\n');
      for (const line of lines) {
        const lineMatches = keywords.filter(kw =>
          line.toLowerCase().includes(kw.toLowerCase())
        );

        if (lineMatches.length > 0) {
          const uidMatch = line.match(/uid=(\d+_\d+)/);
          if (uidMatch) {
            return uidMatch[1];
          }
        }
      }
    }

    return null;
  }

  /**
   * Extrae palabras clave de una descripción
   */
  extractKeywords(description) {
    // Remover palabras comunes
    const stopWords = [
      'el', 'la', 'los', 'las', 'un', 'una', 'en', 'de', 'que', 'hacer',
      'click', 'botón', 'campo', 'verificar', 'the', 'a', 'an', 'in', 'on'
    ];

    const words = description
      .toLowerCase()
      .replace(/['"]/g, '')
      .split(/\s+/)
      .filter(word =>
        word.length > 2 &&
        !stopWords.includes(word) &&
        !/^\d+$/.test(word)
      );

    return [...new Set(words)]; // Eliminar duplicados
  }

  /**
   * Genera prompt para que el LLM analice el snapshot y encuentre elementos
   */
  buildMappingPrompt(description, snapshot) {
    return `Analiza el siguiente snapshot del DOM y encuentra el UID del elemento que coincida con la descripción.

## DESCRIPCIÓN DEL ELEMENTO:
${description}

## SNAPSHOT DEL DOM (primeras 100 líneas):
${snapshot.split('\n').slice(0, 100).join('\n')}

## TU TAREA:
Encuentra el UID (formato: número_número, ejemplo: 15_42) del elemento que mejor coincida con la descripción.

## RESPUESTA (JSON):
{
  "uid": "número_número",
  "reasoning": "Por qué elegiste este elemento",
  "confidence": "high|medium|low"
}

IMPORTANTE: Si no encuentras un elemento que coincida claramente, devuelve null en uid.`;
  }
}

module.exports = { TestGenerator };
