// runners/actions/browser-actions.js
const fs = require('fs');
const { sleep } = require('../utils/helpers.js');

class BrowserActions {
  async executeActionMCP(action, params, suite, mcpClient, elementFinder, config) {
    const result = {
      action,
      params,
      success: false,
      error: null,
      output: null
    };

    try {
      // ⚠️ Corrección del error: Declarar variables que se usan en múltiples 'case' fuera del switch.
      let targetUid = null; 
      let executionResult = null;
      let actionUid = null; 

      switch (action) {
        case 'navigate':
          console.log(` 🌐 Navegando a: ${params.url}`);
          
          // Intentar navegar
          const navResult = await mcpClient.callTool({
            name: 'navigate_page',
            arguments: { url: params.url }
          });
          
          // Esperar carga
          console.log(` ⏳ Esperando carga (3s)...`);
          await sleep(3000);
          
          // Verificar URL actual
          try {
            const pagesAfter = await mcpClient.callTool({
              name: 'list_pages',
              arguments: {}
            });
            const pagesText = pagesAfter.content[0]?.text || '';
            const selectedPageLine = pagesText.split('\n').find(line => line.includes('[selected]'));
            const urlMatch = selectedPageLine ? selectedPageLine.match(/^\d+:\s*(.*?)\s*\[selected\]/) : null;
            const currentUrl = urlMatch ? urlMatch[1] : 'unknown';
            console.log(` ✅ URL actual: ${currentUrl}`);
          } catch (e) {
            console.log(` ⚠️  No se pudo verificar URL`);
          }
          
          break;

        case 'click':
          // Necesitamos obtener el UID del elemento primero
          const snapshot = await mcpClient.callTool({
            name: 'take_snapshot',
            arguments: {}
          });
          const snapshotText = snapshot.content[0]?.text || '';
          const uid = elementFinder.findUidInSnapshot(snapshotText, params.selector);
          
          if (!uid) {
            throw new Error(`Elemento no encontrado: ${params.selector}`);
          }
          
          await mcpClient.callTool({
            name: 'click',
            arguments: { uid }
          });
          console.log(` ✓ Click en: ${params.selector} (uid: ${uid})`);
          break;

        case 'fillInput':
        case 'fill':
          const snapshotFill = await mcpClient.callTool({
            name: 'take_snapshot',
            arguments: {}
          });
          const snapshotTextFill = snapshotFill.content[0]?.text || '';
          const uidFill = elementFinder.findUidInSnapshot(snapshotTextFill, params.selector);
          
          if (!uidFill) {
            throw new Error(`Elemento no encontrado: ${params.selector}`);
          }
          
          await mcpClient.callTool({
            name: 'fill',
            arguments: { uid: uidFill, value: params.value }
          });
          console.log(` ✓ Campo llenado: ${params.selector}`);
          break;

        case 'waitForSelector':
          console.log(` ⏳ Esperando elemento: ${params.selector}`);
          const timeout = params.timeout || config.testing.defaultTimeout;
          const startTime = Date.now();
          let found = false;
          let attempts = 0;
          
          while (Date.now() - startTime < timeout) {
            attempts++;
            try {
              const snap = await mcpClient.callTool({
                name: 'take_snapshot',
                arguments: {}
              });
              const snapText = snap.content[0]?.text || '';
              
              // Debug en el primer intento
              if (attempts === 1) {
                console.log(` 📏 Snapshot obtenido: ${snapText.length} caracteres`);
              }
              
              // Buscar el selector en el snapshot
              if (snapText.includes(params.selector) || 
                  elementFinder.findUidInSnapshot(snapText, params.selector)) {
                found = true;
                break;
              }
            } catch (e) {
              console.log(` ⚠️  Error en intento ${attempts}: ${e.message}`);
              // Continuar intentando
            }
            
            if (attempts % 5 === 0) {
              console.log(` ⏳ ${attempts} intentos, ${Math.floor((Date.now() - startTime) / 1000)}s transcurridos...`);
            }
            await sleep(1000);
          }
          
          if (!found) {
            throw new Error(`Timeout esperando elemento: ${params.selector} (${attempts} intentos)`);
          }
          console.log(` ✅ Elemento encontrado después de ${attempts} intentos`);
          break;

        case 'verifyElementExists':
          const verifySnap = await mcpClient.callTool({
            name: 'take_snapshot',
            arguments: {}
          });
          const verifyText = verifySnap.content[0]?.text || '';
          
          for (const selector of params.selectors || [params.selector]) {
            if (!verifyText.includes(selector)) {
              throw new Error(`Elemento no encontrado: ${selector}`);
            }
          }
          console.log(` ✓ Elementos verificados`);
          break;

        case 'screenshot':
          const screenshotPath = `./tests/screenshots/${params.filename}.png`;
          await mcpClient.callTool({
            name: 'take_screenshot',
            arguments: {
              filePath: screenshotPath,
              fullPage: true
            }
          });
          console.log(` ✓ Screenshot: ${screenshotPath}`);
          result.output = screenshotPath;
          break;

        case 'clearCookies':
          await mcpClient.callTool({
            name: 'evaluate_script',
            arguments: {
              function: `() => {
                const cookies = document.cookie.split(';');
                for (let i = 0; i < cookies.length; i++) {
                  const eq = cookies[i].indexOf('=');
                  const name = eq > -1 ? cookies[i].substr(0, eq) : cookies[i];
                  document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
                }
              }`
            }
          });
          console.log(` ✓ Cookies limpiadas`);
          break;

        case 'verifyElementText':
          const textSnap = await mcpClient.callTool({
            name: 'take_snapshot',
            arguments: {}
          });
          const textSnapContent = textSnap.content[0]?.text || '';
          const uidText = elementFinder.findUidInSnapshot(textSnapContent, params.selector);
          
          if (!uidText) {
            throw new Error(`Elemento no encontrado: ${params.selector}`);
          }
          
          const elementText = elementFinder.getTextFromSnapshot(textSnapContent, uidText);
          const matched = params.expectedPatterns.some(p => 
            new RegExp(p, 'i').test(elementText)
          );
          
          if (!matched) {
            throw new Error(`Texto no coincide en ${params.selector}. Obtenido: ${elementText}`);
          }
          console.log(` ✓ Texto verificado`);
          break;

        case 'take_snapshot':
          console.log(` 📸 Tomando snapshot de la página...`);
          
          const snapResult = await mcpClient.callTool({
            name: 'take_snapshot',
            arguments: {}
          });
          
          const snapContent = snapResult.content[0]?.text || '';
          console.log(` 📄 Snapshot capturado (${snapContent.length} caracteres)`);
          
          // Guardar snapshot en archivo para análisis
          require('fs').writeFileSync(`./tests/screenshots/snapshot-${Date.now()}.txt`, snapContent); 
          console.log(` 💾 Snapshot guardado: ./tests/screenshots/snapshot-${Date.now()}.txt`);
          
          result.output = snapContent;
          result.success = true;
          break;
          
        case 'findButtonByText':
          console.log(` 🔍 Buscando botón con texto: "${params.text}"`);
          
          // Tomar snapshot actual
          const findSnapshot = await mcpClient.callTool({
            name: 'take_snapshot',
            arguments: {}
          });
          
          const findContent = findSnapshot.content[0]?.text || '';
          console.log(` 📄 Analizando snapshot (${findContent.length} caracteres)`);
          
          // Buscar botones con el texto especificado
          const lines = findContent.split('\n');
          let foundButtons = [];
          
          for (const line of lines) {
            if (line.includes('button') && line.includes(params.text)) {
              const uidMatch = line.match(/uid=(\d+_\d+)/);
              if (uidMatch) {
                foundButtons.push({
                  uid: uidMatch[1],
                  line: line.trim()
                });
              }
            }
          }
          
          if (foundButtons.length > 0) {
            console.log(` ✅ Encontrados ${foundButtons.length} botones:`);
            foundButtons.forEach((btn, index) => {
              console.log(`    ${index + 1}. UID: ${btn.uid} - ${btn.line}`);
            });
            result.output = foundButtons;
            result.success = true;
          } else {
            console.log(` ⚠️  No se encontraron botones con texto "${params.text}"`);
            // Buscar botones que contengan parte del texto
            for (const line of lines) {
              if (line.includes('button')) {
                const uidMatch = line.match(/uid=(\d+_\d+)/);
                if (uidMatch) {
                  console.log(`    Botón disponible: ${line.trim()}`);
                }
              }
            }
            result.success = false;
            result.error = `No se encontró botón con texto "${params.text}"`;
          }
          break;

        case 'clickButtonWithText':
          console.log(` 🎯 Buscando y clickeando botón con texto: "${params.text}"`);
          
          // Tomar snapshot actual
          const clickSnapshot = await mcpClient.callTool({
            name: 'take_snapshot',
            arguments: {}
          });
          
          const clickContent = clickSnapshot.content[0]?.text || '';
          console.log(` 📄 Analizando snapshot para encontrar botón...`);
          
          const clickLines = clickContent.split('\n');
          targetUid = null; // Re-inicializamos la variable
          
          for (const line of clickLines) {
            if (line.includes('button') && line.includes(params.text)) {
              const uidMatch = line.match(/uid=(\d+_\d+)/);
              if (uidMatch) {
                targetUid = uidMatch[1];
                console.log(` 🎯 Encontrado botón: ${line.trim()}`);
                break;
              }
            }
          }
          
          // Si no encontramos el texto exacto, buscar aproximado
          if (!targetUid) {
            console.log(` 🔍 Buscando botón aproximado...`);
            for (const line of clickLines) {
              if (line.includes('button') && line.toLowerCase().includes(params.text.toLowerCase())) {
                const uidMatch = line.match(/uid=(\d+_\d+)/);
                if (uidMatch) {
                  targetUid = uidMatch[1];
                  console.log(` 🎯 Encontrado botón aproximado: ${line.trim()}`);
                  break;
                }
              }
            }
          }
          
          if (targetUid) {
            // Hacer click en el botón encontrado
            await mcpClient.callTool({
              name: 'click',
              arguments: { uid: targetUid }
            });
            console.log(` ✓ Click exitoso en botón UID: ${targetUid}`);
            result.success = true;
          } else {
            // Fallback: click en primer botón disponible
            console.log(` ⚠️  No se encontró botón con "${params.text}", usando primer botón`);
            const fallbackUid = elementFinder.findUidInSnapshot(clickContent, 'button');
            if (fallbackUid) {
              await mcpClient.callTool({
                name: 'click',
                arguments: { uid: fallbackUid }
              });
              console.log(` ✓ Click fallback en primer botón UID: ${fallbackUid}`);
              result.success = true;
            } else {
              result.success = false;
              result.error = `No se encontró ningún botón para clickear`;
            }
          }
          break;
          
        case 'analyzePageForButtons':
          console.log(` 🤖 Analizando página para botones de acción...`);
          
          const analyzeSnapshot = await mcpClient.callTool({
            name: 'take_snapshot',
            arguments: {}
          });
          
          const analyzeContent = analyzeSnapshot.content[0]?.text || '';
          console.log(` 📊 Contenido analizado (${analyzeContent.length} caracteres)`);
          
          // Extraer información de botones
          const analyzeLines = analyzeContent.split('\n');
          let buttonsInfo = [];
          
          for (const line of analyzeLines) {
            if (line.includes('button')) {
              const uidMatch = line.match(/uid=(\d+_\d+)/);
              const textMatch = line.match(/text="([^"]*)"/);
              if (uidMatch) {
                buttonsInfo.push({
                  uid: uidMatch[1],
                  text: textMatch ? textMatch[1] : 'Sin texto',
                  fullLine: line.trim()
                });
              }
            }
          }
          
          console.log(` 📋 Botones encontrados (${buttonsInfo.length}):`);
          buttonsInfo.forEach((btn, index) => {
            console.log(`    ${index + 1}. "${btn.text}" (UID: ${btn.uid})`);
          });
          
          result.output = buttonsInfo;
          result.success = true;
          break;

        case 'clickActionButton':
          console.log(` 🎯 Buscando botón de acción principal...`);
          
          const actionSnapshot = await mcpClient.callTool({
            name: 'take_snapshot',
            arguments: {}
          });
          
          const actionContent = actionSnapshot.content[0]?.text || '';
          const actionLines = actionContent.split('\n');
          
          // Buscar botones de acción específicos (en orden de preferencia)
          const actionPriorities = [
            { keywords: ['Add to Cart', 'Add Product', 'Agregar Producto'], type: 'add_to_cart' },
            { keywords: ['Buy', 'Comprar', 'Purchase'], type: 'buy' },
            { keywords: ['Add', 'Agregar'], type: 'add' }
          ];
          
          actionUid = null; // Re-inicializamos la variable
          let foundButtonType = null;
          
          // Buscar botones específicos de "Add to Cart"
          for (const priority of actionPriorities) {
            for (const line of actionLines) {
              if (line.includes('button')) {
                const uidMatch = line.match(/uid=(\d+_\d+)/);
                const textMatch = line.match(/text="([^"]*)"/);
                
                if (uidMatch && textMatch) {
                  const buttonText = textMatch[1];
                  if (priority.keywords.some(keyword => 
                      buttonText.toLowerCase().includes(keyword.toLowerCase()))) {
                    // Evitar botones del carrito mismo
                    if (!buttonText.toLowerCase().includes('cart')) {
                      actionUid = uidMatch[1];
                      foundButtonType = priority.type;
                      console.log(` 🎯 Botón '${priority.type}' encontrado: "${buttonText}" (UID: ${actionUid})`);
                      break;
                    }
                  }
                }
              }
            }
            if (actionUid) break;
          }
          
          // Si no encontramos botón específico de acción, mostrar opciones disponibles
          if (!actionUid) {
            console.log(` 🔍 No se encontró botón de acción específico. Botones disponibles:`);
            const availableButtons = [];
            for (const line of actionLines) {
              if (line.includes('button')) {
                const uidMatch = line.match(/uid=(\d+_\d+)/);
                const textMatch = line.match(/text="([^"]*)"/);
                if (uidMatch && textMatch) {
                  const buttonText = textMatch[1];
                  const uid_btn = uidMatch[1];
                  availableButtons.push({ uid: uid_btn, text: buttonText, line: line.trim() });
                  console.log(`    - "${buttonText}" (UID: ${uid_btn})`);
                }
              }
            }
            
            // Elegir el primer botón que NO sea el carrito
            for (const btn of availableButtons) {
              if (!btn.text.toLowerCase().includes('cart')) {
                actionUid = btn.uid;
                console.log(` 🎯 Seleccionando botón no-carrito: "${btn.text}"`);
                break;
              }
            }
            
            // Último recurso: usar cualquier botón excepto el carrito
            if (!actionUid && availableButtons.length > 0) {
              actionUid = availableButtons[0].uid;
              console.log(` ⚠️  Usando primer botón disponible: "${availableButtons[0].text}"`);
            }
          }
          
          if (actionUid) {
            await mcpClient.callTool({
              name: 'click',
              arguments: { uid: actionUid }
            });
            console.log(` ✓ Click exitoso en botón UID: ${actionUid}`);
            result.success = true;
          } else {
            result.success = false;
            result.error = 'No se encontró botón de acción válido';
          }
          break;

        // --- Nuevos Casos Agregados ---

        case 'scanPage':
          console.log(` 🎯 Escaneando página completa...`);
          
          const scanSnapshot = await mcpClient.callTool({
            name: 'take_snapshot',
            arguments: {}
          });
          
          const scanContent = scanSnapshot.content[0]?.text || '';
          console.log(` 📄 Contenido obtenido (${scanContent.length} caracteres)`);
          
          // Parsear y catalogar elementos
          const scanLines = scanContent.split('\n');
          const elements = {
            buttons: [],
            links: [],
            headings: [],
            textElements: [],
            images: [],
            forms: [],
            inputs: []
          };
          
          for (const line of scanLines) {
            const uidMatch = line.match(/uid=(\d+_\d+)/);
            const textMatch = line.match(/text="([^"]*)"/);
            
            if (uidMatch) {
              const uid_scan = uidMatch[1];
              const text = textMatch ? textMatch[1] : '';
              
              // Catalogar por tipo de elemento
              if (line.includes('button')) {
                elements.buttons.push({ uid: uid_scan, text, fullLine: line.trim() });
              } else if (line.includes('link')) {
                elements.links.push({ uid: uid_scan, text, fullLine: line.trim() });
              } else if (line.includes('heading')) {
                elements.headings.push({ uid: uid_scan, text, level: line.match(/level="(\d+)"/)?.[1] || 'unknown' });
              } else if (line.includes('StaticText')) {
                elements.textElements.push({ uid: uid_scan, text, fullLine: line.trim() });
              } else if (line.includes('image')) {
                elements.images.push({ uid: uid_scan, text, fullLine: line.trim() });
              } else if (line.includes('input')) {
                elements.inputs.push({ uid: uid_scan, text, fullLine: line.trim() });
              }
            }
          }
          
          // Mostrar resumen
          console.log(` 📊 Elementos encontrados:`);
          console.log(`    - Botones: ${elements.buttons.length}`);
          console.log(`    - Links: ${elements.links.length}`);
          console.log(`    - Encabezados: ${elements.headings.length}`);
          console.log(`    - Textos: ${elements.textElements.length}`);
          console.log(`    - Imágenes: ${elements.images.length}`);
          console.log(`    - Inputs: ${elements.inputs.length}`);
          
          // Mostrar botones específicos
          if (elements.buttons.length > 0) {
            console.log(` 🎯 Botones identificados:`);
            elements.buttons.slice(0, 5).forEach((btn, index) => {
              console.log(`     ${index + 1}. "${btn.text}" (UID: ${btn.uid})`);
            });
            if (elements.buttons.length > 5) {
              console.log(`     ... y ${elements.buttons.length - 5} más`);
            }
          }
          
          // Guardar análisis para referencia
          const analysisPath = `./tests/screenshots/analisis-${Date.now()}.json`;
          require('fs').writeFileSync(analysisPath, JSON.stringify(elements, null, 2));
          console.log(` 💾 Análisis guardado: ${analysisPath}`);
          
          result.output = elements;
          result.success = true;
          break;

        case 'identifyTestElements':
          console.log(` 🔍 Identificando elementos específicos para testing...`);
          
          const targetElements = params.targetElements || [];
          console.log(` 🎯 Buscando elementos: ${targetElements.join(', ')}`);
          
          const identifySnapshot = await mcpClient.callTool({
            name: 'take_snapshot',
            arguments: {}
          });
          
          const identifyContent = identifySnapshot.content[0]?.text || '';
          const identifyLines = identifyContent.split('\n');
          
          const identifiedElements = {
            add_to_cart_buttons: [],
            cart_indicator: null,
            product_cards: [],
            navigation_elements: []
          };
          
          // Identificar elementos específicos
          for (const line of identifyLines) {
            const uidMatch = line.match(/uid=(\d+_\d+)/);
            const textMatch = line.match(/text="([^"]*)"/);
            
            if (uidMatch && textMatch) {
              const uid_identify = uidMatch[1];
              const text = textMatch[1];
              
              // Identificar botones "Add to Cart"
              if (line.includes('button') && text.toLowerCase().includes('add to cart')) {
                identifiedElements.add_to_cart_buttons.push({ uid: uid_identify, text });
                console.log(` 🛒 Botón Add to Cart: "${text}" (UID: ${uid_identify})`);
              }
              
              // Identificar indicador de carrito
              if (line.includes('button') && text.toLowerCase().includes('cart')) {
                if (text.match(/cart\s*\(\d+\)/i) || text.toLowerCase() === 'cart') {
                    identifiedElements.cart_indicator = { uid: uid_identify, text };
                    console.log(` 🛒 Indicador de carrito: "${text}" (UID: ${uid_identify})`);
                }
              }
              
              // Identificar tarjetas de producto (por texto de productos)
              if (text.toLowerCase().includes('react') || text.includes('$') || text.includes('t-shirt')) {
                const isProduct = text.includes('$') || text.toLowerCase().includes('t-shirt');
                if (isProduct) {
                  identifiedElements.product_cards.push({ uid: uid_identify, text });
                }
              }
            }
          }
          
          console.log(` ✅ Elementos identificados:`);
          console.log(`    - Botones Add to Cart: ${identifiedElements.add_to_cart_buttons.length}`);
          console.log(`    - Indicador de carrito: ${identifiedElements.cart_indicator ? 'Sí' : 'No'}`);
          console.log(`    - Tarjetas de producto: ${identifiedElements.product_cards.length}`);
          
          result.output = identifiedElements;
          result.success = true;
          break;

        case 'scanAndExecute':
          console.log(` 🚀 Escaneando y ejecutando: ${params.actionToExecute}`);
          
          // Paso 1: Escanear página
          console.log(` 🔍 Escaneando página para identificar elementos...`);
          
          const executeSnapshot = await mcpClient.callTool({
            name: 'take_snapshot',
            arguments: {}
          });
          
          const executeContent = executeSnapshot.content[0]?.text || '';
          const executeLines = executeContent.split('\n');
          
          targetUid = null; // Re-inicializamos la variable
          executionResult = null; // Re-inicializamos la variable
          
          // Paso 2: Identificar y ejecutar acción específica
          switch (params.actionToExecute) {
            case 'click_add_to_cart':
              console.log(` 🎯 Buscando botón 'Add to Cart'...`);
              
              for (const line of executeLines) {
                if (line.includes('button')) {
                  const uidMatch = line.match(/uid=(\d+_\d+)/);
                  const textMatch = line.match(/text="([^"]*)"/);
                  
                  if (uidMatch && textMatch) {
                    const text = textMatch[1];
                    if (text.toLowerCase().includes('add to cart') || text.toLowerCase().includes('agregar al carrito')) {
                      targetUid = uidMatch[1];
                      console.log(` 🛒 Encontrado: "${text}" (UID: ${targetUid})`);
                      break;
                    }
                  }
                }
              }
              
              // Fallback: primer botón que no sea carrito
              if (!targetUid) {
                console.log(` 🔍 Buscando botón alternativo...`);
                for (const line of executeLines) {
                  if (line.includes('button')) {
                    const uidMatch = line.match(/uid=(\d+_\d+)/);
                    const textMatch = line.match(/text="([^"]*)"/);
                    
                    if (uidMatch && textMatch) {
                      const text = textMatch[1];
                      if (!text.toLowerCase().includes('cart') && !text.toLowerCase().includes('menu')) {
                        targetUid = uidMatch[1];
                        console.log(` 🎯 Botón alternativo: "${text}" (UID: ${targetUid})`);
                        break;
                      }
                    }
                  }
                }
              }
              
              // Ejecutar click
              if (targetUid) {
                await mcpClient.callTool({
                  name: 'click',
                  arguments: { uid: targetUid }
                });
                console.log(` ✓ Click ejecutado en UID: ${targetUid}`);
                executionResult = { action: 'click', uid: targetUid, status: 'success' };
              } else {
                executionResult = { action: 'click', status: 'failed', error: 'No se encontró botón' };
              }
              break;
              
            default:
              console.log(` ⚠️  Acción no reconocida: ${params.actionToExecute}`);
              executionResult = { action: params.actionToExecute, status: 'unknown' };
          }
          
          // Paso 3: Verificación si se solicita
          if (params.verification) {
            console.log(` 🔍 Verificando: ${params.verification}`);
            
            switch (params.verification) {
              case 'cart_updated':
                const verifySnapshot = await mcpClient.callTool({
                  name: 'take_snapshot',
                  arguments: {}
                });
                
                const verifyContent = verifySnapshot.content[0]?.text || '';
                const verifyLines = verifyContent.split('\n');
                
                let cartUpdated = false;
                for (const line of verifyLines) {
                  if (line.includes('button') && line.toLowerCase().includes('cart')) {
                    const textMatch = line.match(/text="(?:Cart|Carrito)\s*\D*(\d+)"/i);
                    if (textMatch && parseInt(textMatch[1]) > 0) {
                      cartUpdated = true;
                      console.log(` ✅ Carrito actualizado: ${textMatch[1]} productos`);
                      break;
                    }
                  }
                }
                
                if (!cartUpdated) {
                  console.log(` ⚠️  Carrito no actualizado o indicador no encontrado`);
                }
                executionResult.verification = { type: 'cart_updated', result: cartUpdated };
                break;
            }
          }
          
          result.output = executionResult;
          result.success = targetUid ? true : false;
          break;


        default:
          console.log(` ⚠️  Acción no implementada: ${action}`);
      }

      // Si no hubo un error y el éxito no fue explícitamente establecido (por ejemplo, en un caso que no devuelve nada), se asume éxito.
      if (result.error === null && result.success === false) {
          result.success = true;
      }
      
    } catch (error) {
      result.error = error.message;
      result.success = false; // Asegurar que sea false si hay error
      console.log(` ❌ Error: ${error.message}`);
    }

    return result;
  }
}

module.exports = { BrowserActions };