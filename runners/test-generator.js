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
   * Mejorado con mejor parsing y soporte multi-idioma
   */
  extractStepsFromInstructions(instructions) {
    const steps = [];
    const lines = instructions.split(/\n|\.(?=\s|$)/).filter(line => line.trim().length > 0);

    let hasNavigate = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      const lowerLine = trimmedLine.toLowerCase();

      // Detectar navegación (ES/EN)
      if (!hasNavigate && this.matchesPattern(lowerLine, [
        /^(?:abre|navega|ve a|ir a|abre la|navega a la|ve a la)/i,
        /^(?:open|navigate|go to|visit|load)/i
      ])) {
        steps.push({
          action: 'navigate',
          url: '${baseUrl}',
          description: 'Navegar a la aplicación'
        });
        hasNavigate = true;
        continue;
      }

      // Detectar clicks - Mejorado con más patrones (ES/EN)
      const clickMatch = this.extractAction(lowerLine, [
        // Español
        /(?:haz|hacer|realiza|realiza un|da|dar) click (?:en|sobre) (?:el |la |los |las )?(?:bot[oó]n |enlace |link )?["']?([^"',\.]+)["']?/i,
        /(?:clickea|clickear|presiona|presionar|pulsa|pulsar|toca|tocar|selecciona|seleccionar) (?:el |la |los |las )?(?:bot[oó]n |enlace |link )?["']?([^"',\.]+)["']?/i,
        /click (?:en|sobre) (?:el |la |los |las )?(?:bot[oó]n |enlace |link )?["']?([^"',\.]+)["']?/i,
        // English
        /(?:click|press|tap|hit|select) (?:on |the )?(?:button |link )?["']?([^"',\.]+)["']?/i,
        /(?:click|press|tap) (?:the )?["']?([^"',\.]+)["']? (?:button|link)/i
      ]);

      if (clickMatch) {
        steps.push({
          action: 'click',
          description: `Hacer click en ${clickMatch}`
        });
        continue;
      }

      // Detectar llenado de campos - Mejorado (ES/EN)
      const fillMatch = this.extractFillAction(lowerLine, trimmedLine);
      if (fillMatch) {
        steps.push({
          action: 'fill',
          description: `Llenar campo: ${fillMatch.field}`,
          value: fillMatch.value
        });
        continue;
      }

      // Detectar verificaciones (ES/EN)
      const verifyMatch = this.extractAction(lowerLine, [
        /^(?:verifica|verificar|comprueba|comprobar|aseg[uú]rate?|asegurar|valida|validar|confirma|confirmar) (?:que )?(.+)/i,
        /^(?:verify|check|ensure|validate|confirm|assert) (?:that )?(.+)/i
      ]);

      if (verifyMatch) {
        steps.push({
          action: 'verify',
          description: `Verificar que ${verifyMatch}`
        });
        continue;
      }

      // Detectar esperas (ES/EN)
      const waitMatch = this.extractAction(lowerLine, [
        /^(?:espera|esperar|aguarda|aguardar) (?:a )?(?:que )?(.+)/i,
        /^(?:wait|await) (?:for |until )?(.+)/i
      ]);

      if (waitMatch) {
        steps.push({
          action: 'wait',
          description: `Esperar a que ${waitMatch}`
        });
        continue;
      }

      // Detectar scroll (ES/EN)
      if (this.matchesPattern(lowerLine, [
        /(?:scroll|desplaza|desplazar|baja|bajar|sube|subir)/i
      ])) {
        steps.push({
          action: 'scroll',
          description: trimmedLine
        });
        continue;
      }

      // Detectar hover (ES/EN)
      const hoverMatch = this.extractAction(lowerLine, [
        /(?:pasa el (?:mouse|cursor|rat[oó]n)|posiciona el cursor|hover) (?:sobre|en) (?:el |la )?(.+)/i,
        /^(?:hover|mouse over) (?:the )?(.+)/i
      ]);

      if (hoverMatch) {
        steps.push({
          action: 'hover',
          description: `Pasar el cursor sobre ${hoverMatch}`
        });
        continue;
      }

      // Detectar selección de dropdown/select (ES/EN)
      const selectMatch = this.extractSelectAction(lowerLine);
      if (selectMatch) {
        steps.push({
          action: 'select',
          description: `Seleccionar '${selectMatch.value}' en ${selectMatch.field}`,
          value: selectMatch.value
        });
        continue;
      }

      // Si la línea parece una acción pero no coincidió con ningún patrón
      // Agregarla como descripción genérica
      if (lowerLine.length > 5 && !lowerLine.startsWith('//') && !lowerLine.startsWith('#')) {
        steps.push({
          action: 'custom',
          description: trimmedLine
        });
      }
    }

    // Si no detectamos navegación al inicio, agregarla
    if (!hasNavigate && steps.length > 0) {
      steps.unshift({
        action: 'navigate',
        url: '${baseUrl}',
        description: 'Navegar a la aplicación'
      });
    }

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
   * Helper: Verifica si una línea coincide con algún patrón
   */
  matchesPattern(text, patterns) {
    return patterns.some(pattern => pattern.test(text));
  }

  /**
   * Helper: Extrae la acción de una línea usando múltiples patrones
   */
  extractAction(text, patterns) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  }

  /**
   * Helper: Extrae acción de llenado de campo con valor
   */
  extractFillAction(lowerText, originalText) {
    // Patrones para detectar campo y valor
    const patterns = [
      // Español: "ingresa X en Y", "escribe X en Y"
      /(?:ingresa|ingresar|escribe|escribir|llena|llenar|completa|completar|introduce|introducir) (?:el valor )?["']?([^"']+?)["']? (?:en|dentro de|dentro del) (?:el |la )?(?:campo |input )?["']?([^"',\.]+?)["']?/i,
      // Español: "llena Y con X"
      /(?:llena|llenar|completa|completar) (?:el |la )?(?:campo |input )?["']?([^"']+?)["']? (?:con|con el valor) ["']?([^"',\.]+?)["']?/i,
      // English: "enter X in Y", "type X in Y"
      /(?:enter|type|input|fill|write) (?:the value )?["']?([^"']+?)["']? (?:in|into|in the|into the) (?:field )?["']?([^"',\.]+?)["']?/i,
      // English: "fill Y with X"
      /(?:fill|complete) (?:the )?(?:field )?["']?([^"']+?)["']? (?:with|with the value) ["']?([^"',\.]+?)["']?/i
    ];

    for (const pattern of patterns) {
      const match = originalText.match(pattern);
      if (match) {
        // Determinar qué grupo es el campo y cuál el valor
        const group1 = match[1].trim();
        const group2 = match[2].trim();

        // Si el patrón es del tipo "llena Y con X", invertir
        if (pattern.source.includes('llena|llenar|completa|completar') &&
            pattern.source.includes('con|con el valor')) {
          return { field: group1, value: group2 };
        }

        return { field: group2, value: group1 };
      }
    }

    return null;
  }

  /**
   * Helper: Extrae acción de selección de dropdown
   */
  extractSelectAction(lowerText) {
    const patterns = [
      // Español: "selecciona X del dropdown Y"
      /(?:selecciona|seleccionar|elige|elegir|escoge|escoger) ["']?([^"']+?)["']? (?:del|de la|en el|en la) (?:dropdown|select|lista|men[uú]) ["']?([^"',\.]+?)["']?/i,
      // English: "select X from Y"
      /(?:select|choose|pick) ["']?([^"']+?)["']? (?:from|in) (?:the )?(?:dropdown|select|list) ["']?([^"',\.]+?)["']?/i
    ];

    for (const pattern of patterns) {
      const match = lowerText.match(pattern);
      if (match) {
        return { value: match[1].trim(), field: match[2].trim() };
      }
    }

    return null;
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
