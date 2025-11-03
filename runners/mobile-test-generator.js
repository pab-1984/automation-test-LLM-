// runners/mobile-test-generator.js

/**
 * MobileTestGenerator: Genera tests móviles desde lenguaje natural
 *
 * Diferencias con el generador web:
 * - Usa coordenadas (x, y) en lugar de UIDs
 * - Trabaja con lista de elementos móviles
 * - Soporta acciones móviles: tap, swipe, launchApp, etc.
 * - Genera tests para Android/iOS
 */

const fs = require('fs');
const yaml = require('js-yaml');

class MobileTestGenerator {
  constructor(llmAdapter, config) {
    this.llmAdapter = llmAdapter;
    this.config = config;
  }

  /**
   * Convierte instrucciones en lenguaje natural a test móvil YAML
   *
   * @param {string} naturalLanguageInstructions - Instrucciones del usuario
   * @param {string} appPackage - Package de la app (Android) o BundleId (iOS)
   * @param {string} suiteName - Nombre de la suite
   * @param {string} platform - 'android' o 'ios'
   * @returns {Object} Test en formato YAML
   */
  async convertNaturalLanguageToMobileTest(naturalLanguageInstructions, appPackage, suiteName, platform = 'android') {
    console.log('\n🤖 Paso 1: Convirtiendo lenguaje natural a test móvil YAML...');

    const prompt = this.buildConversionPrompt(naturalLanguageInstructions, appPackage, suiteName, platform);

    try {
      const response = await this.llmAdapter.processStep(prompt, {
        step: { action: 'generate_mobile_test' },
        platform: platform
      });

      // Intentar parsear la respuesta
      if (response && response.test) {
        return response.test;
      }

      if (typeof response === 'string' && response.includes('suite:')) {
        return yaml.load(response);
      }

      const yamlMatch = response.toString().match(/```(?:yaml)?\n([\s\S]*?)\n```/);
      if (yamlMatch) {
        return yaml.load(yamlMatch[1]);
      }

      console.log('⚠️  LLM no generó formato esperado, creando estructura básica...');
      return this.generateBasicMobileTestStructure(naturalLanguageInstructions, appPackage, suiteName, platform);

    } catch (error) {
      console.error(`❌ Error en conversión: ${error.message}`);
      console.log('📝 Generando test básico como fallback...');
      return this.generateBasicMobileTestStructure(naturalLanguageInstructions, appPackage, suiteName, platform);
    }
  }

  /**
   * Construye el prompt para convertir lenguaje natural a YAML móvil
   */
  buildConversionPrompt(instructions, appPackage, suiteName, platform) {
    const platformName = platform === 'android' ? 'Android' : 'iOS';
    const appIdentifier = platform === 'android' ? 'packageName' : 'bundleId';

    return `Eres un generador de tests automatizados para aplicaciones móviles ${platformName}.
Tu trabajo es convertir instrucciones en lenguaje natural a un test en formato YAML para testing móvil.

## INSTRUCCIONES DEL USUARIO:
${instructions}

## CONTEXTO:
- Nombre de la suite: ${suiteName}
- Plataforma: ${platformName}
- App: ${appPackage}

## TU TAREA:
Convierte las instrucciones a un test móvil en formato YAML.

IMPORTANTE:
- NO uses selectores técnicos
- USA descripciones en lenguaje natural de los elementos
- Las descripciones deben ser claras para buscar elementos en pantalla
- Divide en pasos lógicos

## ACCIONES MÓVILES DISPONIBLES:

### Gestión de Apps:
- launchApp: Lanzar aplicación
- terminateApp: Cerrar aplicación
- listApps: Listar apps instaladas

### Navegación:
- openUrl: Abrir URL en navegador

### Interacción:
- tap: Tocar elemento (equivalente a click)
- doubleTap: Doble tap
- longPress: Presión larga
- swipe: Deslizar (requiere fromX, fromY, toX, toY)

### Input:
- fill: Llenar campo de texto (tap + type)
- type: Escribir texto

### Botones Físicos:
- pressBack: Botón atrás
- pressHome: Botón home
- pressButton: Otros botones (menu, recent apps, etc.)

### Snapshots:
- take_snapshot: Capturar lista de elementos en pantalla
- screenshot: Tomar captura de pantalla

### Verificación:
- verify: Verificar algo en pantalla
- wait: Esperar condición

## FORMATO DE SALIDA (YAML):
\`\`\`yaml
suite: "${suiteName}"
description: "Test móvil para ${suiteName}"
platform: "${platform}"
${appIdentifier}: "${appPackage}"

tests:
  - name: "TC001 - Nombre descriptivo"
    steps:
      - action: "launchApp"
        ${appIdentifier}: "${appPackage}"
        description: "Abrir la aplicación"

      - action: "tap"
        description: "Tocar el botón que dice 'Iniciar Sesión'"

      - action: "fill"
        description: "Llenar el campo de email"
        value: "test@example.com"

      - action: "fill"
        description: "Llenar el campo de contraseña"
        value: "password123"

      - action: "tap"
        description: "Tocar el botón 'Entrar' o 'Login'"

      - action: "verify"
        description: "Verificar que aparece el texto 'Bienvenido'"

      - action: "screenshot"
        filename: "login-exitoso"
        description: "Captura de pantalla del resultado"

      - action: "pressBack"
        description: "Presionar botón atrás"

    expectedResult: "El usuario puede iniciar sesión correctamente"
\`\`\`

IMPORTANTE: Responde SOLO con el YAML, sin explicaciones adicionales.`;
  }

  /**
   * Genera estructura de test móvil básica cuando el LLM falla
   */
  generateBasicMobileTestStructure(instructions, appPackage, suiteName, platform) {
    const steps = this.extractMobileStepsFromInstructions(instructions, appPackage, platform);
    const appIdentifier = platform === 'android' ? 'packageName' : 'bundleId';

    return {
      suite: suiteName,
      description: `Test móvil generado desde: ${instructions.substring(0, 100)}...`,
      platform: platform,
      [appIdentifier]: appPackage,
      tests: [
        {
          name: 'TC001 - Test móvil generado automáticamente',
          steps: steps,
          expectedResult: 'Test ejecutado correctamente'
        }
      ]
    };
  }

  /**
   * Extrae pasos móviles de las instrucciones en lenguaje natural
   */
  extractMobileStepsFromInstructions(instructions, appPackage, platform) {
    const steps = [];
    const lines = instructions.split(/\n|\.(?=\s|$)/).filter(line => line.trim().length > 0);

    const appIdentifier = platform === 'android' ? 'packageName' : 'bundleId';
    let hasLaunchApp = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      const lowerLine = trimmedLine.toLowerCase();

      // Detectar launch app
      if (!hasLaunchApp && this.matchesPattern(lowerLine, [
        /^(?:abre|abrir|lanza|lanzar|inicia|iniciar|ejecuta|ejecutar) (?:la )?(?:app|aplicaci[oó]n)/i,
        /^(?:open|launch|start|run) (?:the )?(?:app|application)/i
      ])) {
        steps.push({
          action: 'launchApp',
          [appIdentifier]: appPackage,
          description: 'Abrir la aplicación'
        });
        hasLaunchApp = true;
        continue;
      }

      // Detectar openUrl
      const urlMatch = lowerLine.match(/(?:abre|abrir|navega|ir a|ve a) (?:la url |el sitio |la p[aá]gina )?["']?(https?:\/\/[^\s"']+)["']?/i);
      if (urlMatch) {
        steps.push({
          action: 'openUrl',
          url: urlMatch[1],
          description: `Abrir ${urlMatch[1]}`
        });
        continue;
      }

      // Detectar taps (toques)
      const tapMatch = this.extractAction(lowerLine, [
        // Español
        /(?:toca|tocar|tapa|tapar|presiona|presionar|pulsa|pulsar|haz tap|hacer tap) (?:en |sobre )?(?:el |la )?(?:bot[oó]n |elemento |campo )?["']?([^"',\.]+)["']?/i,
        /(?:haz|hacer|realiza|realizar) (?:un )?tap (?:en |sobre )?["']?([^"',\.]+)["']?/i,
        // English
        /(?:tap|touch|press) (?:on |the )?(?:button |element )?["']?([^"',\.]+)["']?/i
      ]);

      if (tapMatch) {
        steps.push({
          action: 'tap',
          description: `Tocar ${tapMatch}`
        });
        continue;
      }

      // Detectar swipe (deslizar)
      if (this.matchesPattern(lowerLine, [
        /(?:desliza|deslizar|swipe|arrastra|arrastrar|scroll)/i
      ])) {
        const direction = this.extractSwipeDirection(lowerLine);
        steps.push({
          action: 'swipe',
          description: direction ? `Deslizar hacia ${direction}` : 'Deslizar en pantalla'
        });
        continue;
      }

      // Detectar llenado de campos
      const fillMatch = this.extractFillActionMobile(lowerLine, trimmedLine);
      if (fillMatch) {
        steps.push({
          action: 'fill',
          description: `Llenar campo: ${fillMatch.field}`,
          value: fillMatch.value
        });
        continue;
      }

      // Detectar botones físicos
      if (this.matchesPattern(lowerLine, [
        /(?:presiona|presionar|pulsa|pulsar) (?:el )?(?:bot[oó]n )?(?:de )?(?:atr[aá]s|back|volver)/i
      ])) {
        steps.push({
          action: 'pressBack',
          description: 'Presionar botón atrás'
        });
        continue;
      }

      if (this.matchesPattern(lowerLine, [
        /(?:presiona|presionar|pulsa|pulsar) (?:el )?(?:bot[oó]n )?(?:de )?(?:inicio|home)/i
      ])) {
        steps.push({
          action: 'pressHome',
          description: 'Presionar botón home'
        });
        continue;
      }

      // Detectar verificaciones
      const verifyMatch = this.extractAction(lowerLine, [
        /^(?:verifica|verificar|comprueba|comprobar|aseg[uú]rate|asegurar|valida|validar) (?:que )?(.+)/i,
        /^(?:verify|check|ensure|validate) (?:that )?(.+)/i
      ]);

      if (verifyMatch) {
        steps.push({
          action: 'verify',
          description: `Verificar que ${verifyMatch}`
        });
        continue;
      }

      // Detectar esperas
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

      // Si no coincide con nada, agregar como tap genérico
      if (lowerLine.length > 5) {
        steps.push({
          action: 'custom',
          description: trimmedLine
        });
      }
    }

    // Si no detectamos launch app, agregarlo al inicio
    if (!hasLaunchApp && steps.length > 0) {
      steps.unshift({
        action: 'launchApp',
        [appIdentifier]: appPackage,
        description: 'Abrir la aplicación'
      });
    }

    // Si no hay pasos, agregar básicos
    if (steps.length === 0) {
      steps.push({
        action: 'launchApp',
        [appIdentifier]: appPackage,
        description: 'Abrir la aplicación'
      });
      steps.push({
        action: 'screenshot',
        filename: 'app-abierta',
        description: 'Capturar pantalla inicial'
      });
    }

    // Agregar screenshot final
    steps.push({
      action: 'screenshot',
      filename: 'resultado-final',
      description: 'Capturar resultado final'
    });

    return steps;
  }

  /**
   * Extrae dirección de swipe
   */
  extractSwipeDirection(text) {
    if (/(?:arriba|up)/i.test(text)) return 'arriba';
    if (/(?:abajo|down)/i.test(text)) return 'abajo';
    if (/(?:izquierda|left)/i.test(text)) return 'izquierda';
    if (/(?:derecha|right)/i.test(text)) return 'derecha';
    return null;
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
   * Helper: Extrae acción de llenado de campo móvil con valor
   */
  extractFillActionMobile(lowerText, originalText) {
    const patterns = [
      // Español
      /(?:ingresa|ingresar|escribe|escribir|llena|llenar|completa|completar|introduce|introducir) (?:el valor )?["']?([^"']+?)["']? (?:en|dentro de|en el) (?:campo )?["']?([^"',\.]+?)["']?/i,
      /(?:llena|llenar|completa|completar) (?:el )?(?:campo )?["']?([^"']+?)["']? (?:con|con el valor) ["']?([^"',\.]+?)["']?/i,
      // English
      /(?:enter|type|input|fill) (?:the value )?["']?([^"']+?)["']? (?:in|into|in the) (?:field )?["']?([^"',\.]+?)["']?/i,
      /(?:fill|complete) (?:the )?(?:field )?["']?([^"']+?)["']? (?:with|with the value) ["']?([^"',\.]+?)["']?/i
    ];

    for (const pattern of patterns) {
      const match = originalText.match(pattern);
      if (match) {
        const group1 = match[1].trim();
        const group2 = match[2].trim();

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
   * Guarda el test móvil generado en un archivo YAML
   */
  saveMobileTest(testStructure, filename) {
    const yamlContent = yaml.dump(testStructure, {
      indent: 2,
      lineWidth: 120,
      noRefs: true
    });

    const dirPath = './tests/suites/mobile';
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const filepath = `${dirPath}/${filename}.yml`;
    fs.writeFileSync(filepath, yamlContent, 'utf8');

    console.log(`✅ Test móvil guardado: ${filepath}`);
    return filepath;
  }

  /**
   * Genera test desde template predefinido
   *
   * @param {string} templateName - 'login', 'register', 'search', 'purchase', 'profile'
   * @param {object} options - Opciones específicas del template
   * @returns {Object} Estructura de test
   */
  generateFromTemplate(templateName, options = {}) {
    const templates = {
      login: this.getLoginTemplate(options),
      register: this.getRegisterTemplate(options),
      search: this.getSearchTemplate(options),
      purchase: this.getPurchaseTemplate(options),
      profile: this.getProfileTemplate(options)
    };

    const template = templates[templateName];
    if (!template) {
      throw new Error(`Template '${templateName}' no encontrado. Disponibles: ${Object.keys(templates).join(', ')}`);
    }

    return template;
  }

  /**
   * Template: Test de Login
   */
  getLoginTemplate(options) {
    const {
      appPackage = 'com.example.app',
      platform = 'android',
      email = 'test@example.com',
      password = 'password123'
    } = options;

    const appIdentifier = platform === 'android' ? 'packageName' : 'bundleId';

    return {
      suite: 'Login Test',
      description: 'Test de inicio de sesión móvil',
      platform: platform,
      [appIdentifier]: appPackage,
      tests: [
        {
          name: 'TC001 - Login exitoso',
          steps: [
            {
              action: 'launchApp',
              [appIdentifier]: appPackage,
              description: 'Abrir la aplicación'
            },
            {
              action: 'tap',
              description: 'Tocar botón "Iniciar Sesión" o "Login"'
            },
            {
              action: 'fill',
              description: 'Llenar campo de email o usuario',
              value: email
            },
            {
              action: 'fill',
              description: 'Llenar campo de contraseña',
              value: password
            },
            {
              action: 'tap',
              description: 'Tocar botón "Entrar" o "Sign In"'
            },
            {
              action: 'verify',
              description: 'Verificar que aparece el texto "Bienvenido" o nombre de usuario'
            },
            {
              action: 'screenshot',
              filename: 'login-exitoso',
              description: 'Captura de sesión iniciada'
            }
          ],
          expectedResult: 'El usuario puede iniciar sesión correctamente'
        }
      ]
    };
  }

  /**
   * Template: Test de Registro
   */
  getRegisterTemplate(options) {
    const {
      appPackage = 'com.example.app',
      platform = 'android',
      email = 'newuser@example.com',
      password = 'NewPass123',
      username = 'newuser'
    } = options;

    const appIdentifier = platform === 'android' ? 'packageName' : 'bundleId';

    return {
      suite: 'Register Test',
      description: 'Test de registro de usuario móvil',
      platform: platform,
      [appIdentifier]: appPackage,
      tests: [
        {
          name: 'TC001 - Registro exitoso',
          steps: [
            {
              action: 'launchApp',
              [appIdentifier]: appPackage,
              description: 'Abrir la aplicación'
            },
            {
              action: 'tap',
              description: 'Tocar botón "Registrarse" o "Sign Up"'
            },
            {
              action: 'fill',
              description: 'Llenar campo de nombre de usuario',
              value: username
            },
            {
              action: 'fill',
              description: 'Llenar campo de email',
              value: email
            },
            {
              action: 'fill',
              description: 'Llenar campo de contraseña',
              value: password
            },
            {
              action: 'fill',
              description: 'Confirmar contraseña',
              value: password
            },
            {
              action: 'tap',
              description: 'Tocar botón "Crear Cuenta" o "Register"'
            },
            {
              action: 'verify',
              description: 'Verificar mensaje de confirmación de registro'
            },
            {
              action: 'screenshot',
              filename: 'registro-exitoso',
              description: 'Captura de cuenta creada'
            }
          ],
          expectedResult: 'El usuario puede registrarse correctamente'
        }
      ]
    };
  }

  /**
   * Template: Test de Búsqueda
   */
  getSearchTemplate(options) {
    const {
      appPackage = 'com.example.app',
      platform = 'android',
      searchTerm = 'producto de prueba'
    } = options;

    const appIdentifier = platform === 'android' ? 'packageName' : 'bundleId';

    return {
      suite: 'Search Test',
      description: 'Test de búsqueda en app móvil',
      platform: platform,
      [appIdentifier]: appPackage,
      tests: [
        {
          name: 'TC001 - Búsqueda exitosa',
          steps: [
            {
              action: 'launchApp',
              [appIdentifier]: appPackage,
              description: 'Abrir la aplicación'
            },
            {
              action: 'tap',
              description: 'Tocar campo de búsqueda o ícono de lupa'
            },
            {
              action: 'fill',
              description: 'Escribir término de búsqueda',
              value: searchTerm
            },
            {
              action: 'tap',
              description: 'Tocar botón "Buscar" o ícono de búsqueda'
            },
            {
              action: 'verify',
              description: 'Verificar que aparecen resultados de búsqueda'
            },
            {
              action: 'screenshot',
              filename: 'resultados-busqueda',
              description: 'Captura de resultados'
            }
          ],
          expectedResult: 'La búsqueda muestra resultados correctamente'
        }
      ]
    };
  }

  /**
   * Template: Test de Compra
   */
  getPurchaseTemplate(options) {
    const {
      appPackage = 'com.example.app',
      platform = 'android'
    } = options;

    const appIdentifier = platform === 'android' ? 'packageName' : 'bundleId';

    return {
      suite: 'Purchase Test',
      description: 'Test de flujo de compra móvil',
      platform: platform,
      [appIdentifier]: appPackage,
      tests: [
        {
          name: 'TC001 - Agregar al carrito',
          steps: [
            {
              action: 'launchApp',
              [appIdentifier]: appPackage,
              description: 'Abrir la aplicación'
            },
            {
              action: 'tap',
              description: 'Seleccionar un producto'
            },
            {
              action: 'tap',
              description: 'Tocar botón "Agregar al Carrito" o "Add to Cart"'
            },
            {
              action: 'verify',
              description: 'Verificar que el carrito muestra 1 producto'
            },
            {
              action: 'tap',
              description: 'Abrir carrito de compras'
            },
            {
              action: 'verify',
              description: 'Verificar que el producto está en el carrito'
            },
            {
              action: 'screenshot',
              filename: 'carrito-con-producto',
              description: 'Captura del carrito'
            }
          ],
          expectedResult: 'El producto se agrega al carrito correctamente'
        }
      ]
    };
  }

  /**
   * Template: Test de Perfil
   */
  getProfileTemplate(options) {
    const {
      appPackage = 'com.example.app',
      platform = 'android',
      newName = 'Usuario Actualizado'
    } = options;

    const appIdentifier = platform === 'android' ? 'packageName' : 'bundleId';

    return {
      suite: 'Profile Test',
      description: 'Test de edición de perfil móvil',
      platform: platform,
      [appIdentifier]: appPackage,
      tests: [
        {
          name: 'TC001 - Editar perfil',
          steps: [
            {
              action: 'launchApp',
              [appIdentifier]: appPackage,
              description: 'Abrir la aplicación'
            },
            {
              action: 'tap',
              description: 'Tocar ícono de perfil o menú'
            },
            {
              action: 'tap',
              description: 'Tocar "Editar Perfil" o "Edit Profile"'
            },
            {
              action: 'fill',
              description: 'Cambiar nombre de usuario',
              value: newName
            },
            {
              action: 'tap',
              description: 'Tocar botón "Guardar" o "Save"'
            },
            {
              action: 'verify',
              description: 'Verificar mensaje de confirmación'
            },
            {
              action: 'screenshot',
              filename: 'perfil-actualizado',
              description: 'Captura de perfil actualizado'
            }
          ],
          expectedResult: 'El perfil se actualiza correctamente'
        }
      ]
    };
  }
}

module.exports = { MobileTestGenerator };
