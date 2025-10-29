// scripts/create-test.js
// Version 4.0 - Implementa la estrategia "Híbrida y Ligera"

const inquirer = require('inquirer');
const fs = require('fs');
const yaml = require('js-yaml');
const { UniversalTestRunnerCore } = require('../runners/universal-runner.js');

// --- PROMPTS v4.0 ---

const PROMPT_TRANSLATE_TO_PLAN = `
Eres un asistente de QA. Convierte una lista de instrucciones en lenguaje natural a un plan de prueba JSON.

REGLAS:
1.  Tu única salida debe ser un objeto JSON, sin explicaciones ni markdown.
2.  El JSON debe contener una clave "steps" que es un array de objetos.
3.  Cada objeto debe tener "action" y "description".
4.  La acción DEBE SER UNA de las siguientes: ["navigate", "click", "fill", "verify"].
5.  Descompón acciones complejas. "Buscar 'algo'" se convierte en un paso 'fill' y un paso 'click'.

INSTRUCCIONES DEL USUARIO:
---
{USER_INSTRUCTIONS}
---

EJEMPLO DE SALIDA JSON:
{
  "steps": [
    {
      "action": "navigate",
      "description": "la página de inicio"
    },
    {
      "action": "fill",
      "description": "el campo de búsqueda con 'alquileres en montevideo'"
    },
    {
      "action": "click",
      "description": "el botón de búsqueda"
    }
  ]
}
`;

const PROMPT_MAP_ELEMENT_FALLBACK = `
Eres un experto en QA. Mi buscador local no pudo encontrar un elemento. Ayúdame a encontrarlo como último recurso.

REGLAS:
1.  Tu única salida debe ser un objeto JSON.
2.  Encuentra el "uid" del elemento que mejor corresponde a la descripción.
3.  Si no puedes encontrarlo, responde con {"uid": null}.

INSTRUCCIÓN:
"Quiero interactuar con {STEP_DESCRIPTION}"

SNAPSHOT DEL DOM (MUY TRUNCADO - SOLO LÍNEAS RELEVANTES):
---
{DOM_SNAPSHOT}
---

SALIDA JSON:
`;


console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   🤖 GENERADOR INTELIGENTE DE TESTS (v4.0 - Híbrido)             ║
║   Crea tests robustos directamente desde lenguaje natural.      ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
`);

async function main() {
  let runner;
  try {
    const userInput = await promptForUserInput();

    console.log('\n⚙️  Inicializando sistema y conectando con el navegador...');
    runner = new UniversalTestRunnerCore();
    await runner.initialize();
    console.log('✅ Sistema inicializado.');

    console.log('\n🤖 Paso 1/3: Traduciendo tus instrucciones a un plan de prueba...');
    const provisionalTest = await generateProvisionalTest(runner.llmAdapter, userInput.instructions);
    console.log(`✅ Plan de prueba generado con ${provisionalTest.steps.length} pasos.`);

    console.log('\n🤖 Paso 2/3: Procesando y mapeando los pasos de forma interactiva...');
    const finalSteps = await processStepsAndBuildTest(runner, provisionalTest.steps, userInput.baseUrl);

    console.log('\n🤖 Paso 3/3: Ensamblando y guardando el test final...');
    const finalTest = {
      suite: userInput.suiteName,
      description: `Test para '${userInput.suiteName}', generado desde lenguaje natural.`, 
      baseUrl: userInput.baseUrl,
      tests: [{ name: 'Test Principal', steps: finalSteps }]
    };
    const testPath = saveFinalTest(finalTest, userInput.suiteName);

    console.log(`\n✨ ¡Test generado exitosamente!`);
    console.log(`   📄 Archivo: ${testPath}`);

  } catch (error) {
    handleError(error);
  } finally {
    if (runner) {
      await runner.cleanup();
    }
    console.log('\n✅ Proceso completado.');
  }
}

async function promptForUserInput() {
    return inquirer.prompt([
        {
            type: 'input', name: 'suiteName', message: '📝 Nombre del test (ej: Test de Login):',
            default: 'Test Generado', validate: (input) => input.length > 0 || 'El nombre es requerido'
        },
        {
            type: 'input', name: 'baseUrl', message: '🌐 URL de tu aplicación:',
            default: 'https://www.mercadolibre.com.uy', validate: (input) => (input.startsWith('http') ? true : 'Debe ser una URL válida')
        },
        {
            type: 'editor', name: 'instructions', message: '📖 Describe qué quieres probar (se abrirá tu editor de texto):',
            default: 'ingresar a la app, buscar alquileres en montevideo, y luego hacer click en el botón de buscar',
            validate: (input) => input.trim().length > 10 || 'Describe con más detalle qué quieres probar.'
        }
    ]);
}

async function generateProvisionalTest(llmAdapter, instructions) {
    const prompt = PROMPT_TRANSLATE_TO_PLAN.replace('{USER_INSTRUCTIONS}', instructions);
    const response = await llmAdapter.generateJson(prompt);
    if (!response || !response.steps) {
        throw new Error('El LLM no pudo generar un plan de prueba válido a partir de las instrucciones.');
    }
    return response;
}

function findElementLocally(snapshotText, description) {
    console.log(`     - 🔍 Búsqueda local inteligente...`);
    const lines = snapshotText.split('\n');
    const lowerCaseDescription = description.toLowerCase();

    // Extraer texto entre comillas si existe, para búsqueda de texto exacto
    const quotedTextMatch = lowerCaseDescription.match(/['""](.*?)['""]/);
    const quotedText = quotedTextMatch ? quotedTextMatch[1] : null;

    let bestCandidate = null;

    for (const line of lines) {
        const lowerCaseLine = line.toLowerCase();
        let score = 0;
        let matchDetails = [];

        // Prioridad 1: Búsqueda de texto exacto si se especificó (máxima prioridad)
        if (quotedText && lowerCaseLine.includes(quotedText)) {
            score += 15;
            matchDetails.push(`texto exacto "${quotedText}"`);
        }

        // Prioridad 2: Coincidencia de roles y palabras clave
        // Botones
        if ((lowerCaseDescription.includes('botón') || lowerCaseDescription.includes('button')) && lowerCaseLine.includes('button')) {
            score += 8;
            matchDetails.push('tipo:button');
        }

        // Campos de entrada
        if ((lowerCaseDescription.includes('campo') || lowerCaseDescription.includes('input')) &&
            (lowerCaseLine.includes('input') || lowerCaseLine.includes('textbox') || lowerCaseLine.includes('searchbox'))) {
            score += 8;
            matchDetails.push('tipo:input');
        }

        // Búsqueda específica
        if ((lowerCaseDescription.includes('búsqueda') || lowerCaseDescription.includes('buscar') || lowerCaseDescription.includes('search')) &&
            (lowerCaseLine.includes('search') || lowerCaseLine.includes('búsqueda'))) {
            score += 10;
            matchDetails.push('búsqueda');
        }

        // Enlaces
        if ((lowerCaseDescription.includes('enlace') || lowerCaseDescription.includes('link')) && lowerCaseLine.includes('link')) {
            score += 8;
            matchDetails.push('tipo:link');
        }

        // Prioridad 3: Atributos comunes
        // Name attribute
        if (lowerCaseDescription.includes('nombre') || lowerCaseDescription.includes('name')) {
            const nameMatch = line.match(/name="([^"]*)"/i);
            if (nameMatch && lowerCaseDescription.includes(nameMatch[1].toLowerCase())) {
                score += 12;
                matchDetails.push(`name="${nameMatch[1]}"`);
            }
        }

        // Placeholder
        const placeholderMatch = line.match(/placeholder="([^"]*)"/i);
        if (placeholderMatch && lowerCaseDescription.includes(placeholderMatch[1].toLowerCase())) {
            score += 10;
            matchDetails.push(`placeholder="${placeholderMatch[1]}"`);
        }

        // Prioridad 4: Palabras clave en el texto del elemento
        const textMatch = line.match(/text="([^"]*)"/i);
        if (textMatch) {
            const elementText = textMatch[1].toLowerCase();
            // Palabras clave de la descripción en el texto del elemento
            const keywords = lowerCaseDescription.split(/\s+/).filter(word => word.length > 3);
            for (const keyword of keywords) {
                if (elementText.includes(keyword)) {
                    score += 3;
                    matchDetails.push(`palabra:"${keyword}"`);
                }
            }
        }

        // Prioridad 5: Roles ARIA
        if (lowerCaseDescription.includes('menú') && lowerCaseLine.includes('menu')) {
            score += 7;
            matchDetails.push('role:menu');
        }
        if (lowerCaseDescription.includes('lista') && lowerCaseLine.includes('list')) {
            score += 7;
            matchDetails.push('role:list');
        }

        if (score > (bestCandidate?.score || 0)) {
            const uidMatch = line.match(/uid=(\d+_\d+)/);
            if (uidMatch) {
                bestCandidate = { uid: uidMatch[1], score, line, matchDetails };
            }
        }
    }

    if (bestCandidate && bestCandidate.score > 0) {
        console.log(`     - ✅ Candidato encontrado (puntuación: ${bestCandidate.score})`);
        console.log(`     - 📊 Coincidencias: ${bestCandidate.matchDetails.join(', ')}`);
        console.log(`     - 📄 Elemento: ${bestCandidate.line.trim().substring(0, 100)}...`);
        return bestCandidate.uid;
    }

    console.log('     - ⚠️ No se encontró un candidato local claro.');
    return null;
}

async function processStepsAndBuildTest(runner, steps, baseUrl) {
    const finalSteps = [];
    let isFirstStep = true;

    for (const [index, step] of steps.entries()) {
        console.log(`\n   - Procesando paso ${index + 1}/${steps.length}: ${step.action} -> "${step.description}"`);

        if (step.action === 'navigate') {
            const urlToNavigate = step.description.includes('http') ? step.description : baseUrl;
            console.log(`     - Navegando a: ${urlToNavigate}`);
            await runner.mcpClient.callTool({ name: 'navigate_page', arguments: { url: urlToNavigate } });
            isFirstStep = false;
            finalSteps.push({ action: 'navigate', description: step.description, url: urlToNavigate, mode: 'direct' });
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
        }

        if (isFirstStep) {
            console.log(`     - Forzando navegación a ${baseUrl} para el primer paso.`);
            await runner.mcpClient.callTool({ name: 'navigate_page', arguments: { url: baseUrl } });
            isFirstStep = false;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log('     - Tomando snapshot del DOM...');
        const snapshotResult = await runner.mcpClient.callTool({ name: 'take_snapshot', arguments: { verbose: true } });
        const snapshotText = snapshotResult.content[0]?.text || '';
        if (!snapshotText) {
            console.warn('     - ⚠️ No se pudo obtener snapshot. Marcando paso para ejecución con LLM.');
            finalSteps.push({ ...step, mode: 'llm', reasoning: 'No se pudo obtener snapshot del DOM para compilar.' });
            continue;
        }

        // --- Lógica Híbrida ---
        let mappedUid = findElementLocally(snapshotText, step.description);
        let reasoning = 'Encontrado con buscador local.';

        if (!mappedUid) {
            console.log('     - Buscador local falló. Usando LLM como respaldo...');

            // Filtrado inteligente basado en el tipo de acción
            let relevantRoles = [];
            let maxLines = 100;

            if (step.action === 'click') {
                relevantRoles = ['button', 'link', 'heading'];
                maxLines = 60;
            } else if (step.action === 'fill') {
                relevantRoles = ['input', 'textbox', 'searchbox', 'textarea'];
                maxLines = 50;
            } else if (step.action === 'verify') {
                relevantRoles = ['button', 'link', 'input', 'heading', 'text'];
                maxLines = 80;
            } else {
                relevantRoles = ['button', 'link', 'input', 'textbox', 'searchbox', 'heading'];
                maxLines = 75;
            }

            // Filtrar líneas relevantes
            const lines = snapshotText.split('\n');
            const filteredLines = [];
            const keywords = step.description.toLowerCase().split(/\s+/).filter(w => w.length > 3);

            for (const line of lines) {
                const lowerLine = line.toLowerCase();
                let isRelevant = false;

                // Incluir si tiene rol relevante
                if (relevantRoles.some(role => lowerLine.includes(role))) {
                    isRelevant = true;
                }

                // Incluir si contiene palabras clave de la descripción
                if (keywords.some(keyword => lowerLine.includes(keyword))) {
                    isRelevant = true;
                }

                // Incluir si tiene texto entre comillas que coincida
                const textMatch = line.match(/text="([^"]*)"/i);
                if (textMatch && keywords.some(kw => textMatch[1].toLowerCase().includes(kw))) {
                    isRelevant = true;
                }

                if (isRelevant) {
                    filteredLines.push(line);
                }
            }

            const truncatedSnapshot = filteredLines.slice(0, maxLines).join('\n');
            console.log(`     - 📊 Snapshot filtrado: ${filteredLines.length} líneas relevantes (enviando ${Math.min(filteredLines.length, maxLines)})`);

            const prompt = PROMPT_MAP_ELEMENT_FALLBACK
                .replace('{STEP_DESCRIPTION}', step.description)
                .replace('{DOM_SNAPSHOT}', truncatedSnapshot);

            const mappingResult = await runner.llmAdapter.generateJson(prompt);

            if (mappingResult && mappingResult.uid) {
                mappedUid = mappingResult.uid;
                reasoning = `Encontrado por LLM como respaldo. ${mappingResult.reasoning || ''}`;
                console.log(`     - ✅ LLM encontró el elemento: ${mappedUid}`);
            } else {
                console.warn(`     - ⚠️ LLM tampoco pudo mapear el elemento. Se marcará para ejecución en tiempo real.`);
                finalSteps.push({ ...step, mode: 'llm', reasoning: 'Ni el buscador local ni el LLM de respaldo pudieron encontrar un selector estable.' });
                continue;
            }
        }

        const finalStep = { action: step.action, description: step.description, uid: mappedUid, mode: 'direct', reasoning };

        if (step.action === 'fill') {
            const valueMatch = step.description.match(/con ['"]([^'"]*)['"]/);
            finalStep.value = valueMatch ? valueMatch[1] : '';
        }

        finalSteps.push(finalStep);

        // ✅ MEJORA: Ejecutar y validar cada acción durante la creación del test
        console.log(`     - 🚀 Ejecutando acción para validar y actualizar estado...`);

        try {
            if (step.action === 'fill') {
                // Ejecutar fill
                await runner.mcpClient.callTool({
                    name: 'fill',
                    arguments: { uid: mappedUid, value: finalStep.value }
                });
                console.log(`     - ✅ Campo llenado con: "${finalStep.value}"`);

                // Detectar si es un campo de búsqueda y presionar Enter
                const isSearchField = step.description.toLowerCase().includes('búsqueda') ||
                                     step.description.toLowerCase().includes('buscar') ||
                                     step.description.toLowerCase().includes('search') ||
                                     finalStep.line?.toLowerCase().includes('search');

                if (isSearchField) {
                    console.log(`     - 🔍 Campo de búsqueda detectado, presionando Enter...`);

                    try {
                        // Usar la herramienta type de MCP para simular Enter
                        await runner.mcpClient.callTool({
                            name: 'type',
                            arguments: {
                                uid: mappedUid,
                                text: '\n'  // \n simula Enter
                            }
                        });
                        console.log(`     - ⏳ Esperando resultados de búsqueda (4s)...`);
                        await new Promise(resolve => setTimeout(resolve, 4000));
                        console.log(`     - ✅ Enter presionado, página actualizada`);
                    } catch (enterError) {
                        // Fallback: Buscar y clickear el botón de búsqueda
                        console.log(`     - ⚠️ No se pudo presionar Enter, buscando botón de búsqueda...`);

                        const searchButtonSnapshot = await runner.mcpClient.callTool({
                            name: 'take_snapshot',
                            arguments: {}
                        });
                        const searchSnap = searchButtonSnapshot.content[0]?.text || '';

                        // Buscar botón de búsqueda
                        const searchButtonUid = findElementLocally(searchSnap, 'botón de búsqueda');

                        if (searchButtonUid) {
                            console.log(`     - 🔘 Botón de búsqueda encontrado, haciendo click...`);
                            await runner.mcpClient.callTool({
                                name: 'click',
                                arguments: { uid: searchButtonUid }
                            });
                            await new Promise(resolve => setTimeout(resolve, 4000));
                            console.log(`     - ✅ Click en botón de búsqueda ejecutado`);
                        } else {
                            console.log(`     - ℹ️ No se pudo activar la búsqueda automáticamente`);
                        }
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 1500));

            } else if (step.action === 'click') {
                // Ejecutar click
                await runner.mcpClient.callTool({
                    name: 'click',
                    arguments: { uid: mappedUid }
                });
                console.log(`     - ✅ Click ejecutado`);

                // Esperar actualización de página
                console.log(`     - ⏳ Esperando actualización de página (3s)...`);
                await new Promise(resolve => setTimeout(resolve, 3000));

            } else if (step.action === 'verify') {
                // Para verify, solo tomar screenshot de validación
                console.log(`     - 📸 Verificación registrada (se ejecutará en el test)`);
            }

            console.log(`     - 🎯 Acción validada exitosamente`);

        } catch (error) {
            console.warn(`     - ⚠️ Error ejecutando acción: ${error.message}`);
            console.log(`     - ℹ️ El paso se guardará, pero revisa que funcione en la ejecución final`);
        }
    }

    return finalSteps;
}

function saveFinalTest(testContent, suiteName) {
    const filename = suiteName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const testPath = `./tests/suites/${filename}.yml`;
    const yamlContent = yaml.dump(testContent, { indent: 2, lineWidth: 120 });
    fs.writeFileSync(testPath, yamlContent, 'utf8');
    return testPath;
}

function handleError(error) {
    if (error.message.includes('User force closed the prompt')) {
      console.log('\n\n⚠️  Proceso cancelado por el usuario.');
    } else {
      console.error('\n❌ Error Inesperado:', error.message);
      console.error(error.stack);
    }
    process.exit(1);
}

// --- Manejo de Interrupciones ---
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Proceso interrumpido.');
  process.exit(0);
});
process.on('SIGTERM', () => {
  console.log('\n\n⚠️  Proceso terminado.');
  process.exit(0);
});

// --- Ejecución Principal ---
main().catch(handleError);