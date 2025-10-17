// runners/actions/browser-actions.js
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
      switch (action) {
        case 'navigate':
          console.log(`   🌐 Navegando a: ${params.url}`);
          
          // Intentar navegar
          const navResult = await mcpClient.callTool({
            name: 'navigate_page',
            arguments: { url: params.url }
          });
          
          // Esperar carga
          console.log(`   ⏳ Esperando carga (3s)...`);
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
            console.log(`   ✅ URL actual: ${currentUrl}`);
          } catch (e) {
            console.log(`   ⚠️  No se pudo verificar URL`);
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
          console.log(`   ✓ Click en: ${params.selector} (uid: ${uid})`);
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
          console.log(`   ✓ Campo llenado: ${params.selector}`);
          break;

        case 'waitForSelector':
          console.log(`   ⏳ Esperando elemento: ${params.selector}`);
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
                console.log(`   📏 Snapshot obtenido: ${snapText.length} caracteres`);
              }
              
              // Buscar el selector en el snapshot
              if (snapText.includes(params.selector) || 
                  elementFinder.findUidInSnapshot(snapText, params.selector)) {
                found = true;
                break;
              }
            } catch (e) {
              console.log(`   ⚠️  Error en intento ${attempts}: ${e.message}`);
              // Continuar intentando
            }
            
            if (attempts % 5 === 0) {
              console.log(`   ⏳ ${attempts} intentos, ${Math.floor((Date.now() - startTime) / 1000)}s transcurridos...`);
            }
            await sleep(1000);
          }
          
          if (!found) {
            throw new Error(`Timeout esperando elemento: ${params.selector} (${attempts} intentos)`);
          }
          console.log(`   ✅ Elemento encontrado después de ${attempts} intentos`);
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
          console.log(`   ✓ Elementos verificados`);
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
          console.log(`   ✓ Screenshot: ${screenshotPath}`);
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
          console.log(`   ✓ Cookies limpiadas`);
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
          console.log(`   ✓ Texto verificado`);
          break;

        default:
          console.log(`   ⚠️  Acción no implementada: ${action}`);
      }

      result.success = true;
    } catch (error) {
      result.error = error.message;
      console.log(`   ❌ Error: ${error.message}`);
    }

    return result;
  }
}

module.exports = { BrowserActions };