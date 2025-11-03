// runners/actions/element-finder.js

class ElementFinder {
  findUidInSnapshot(snapshotText, selector) {
    if (!snapshotText) return null;
    const lines = snapshotText.split('\n');

    // Try to find by exact UID if selector is a UID (e.g., "uid=1_4")
    const uidExactMatch = selector.match(/^uid=(\d+_\d+)$/);
    if (uidExactMatch) {
      for (const line of lines) {
        if (line.includes(selector)) {
          const uidMatch = line.match(/uid=(\d+_\d+)/);
          if (uidMatch) return uidMatch[1];
        }
      }
    }

    // General approach: iterate lines and match based on selector type
    for (const line of lines) {
      const uidMatch = line.match(/uid=(\d+_\d+)/);
      if (!uidMatch) continue; // Skip lines without UID

      const uid = uidMatch[1];

      // 1. Selector de tag simple (h1, button, div, etc.)
      const tagMatch = selector.match(/^([a-z][a-z0-9]*)$/i);
      if (tagMatch) {
        const tag = tagMatch[1].toLowerCase();
        // Snapshot format: 'heading "Products" level="1"' for h1
        // 'button "Cart 0"' for button
        if (tag === 'h1' && line.includes('heading') && line.includes('level="1"')) {
          return uid;
        }
        if (tag === 'h2' && line.includes('heading') && line.includes('level="2"')) {
          return uid;
        }
        if (tag === 'button' && line.includes('button')) {
          return uid;
        }
        // Add more tag mappings as needed
      }

      // 2. Selector de clase (.card, .btn-primary, etc.)
      const classMatch = selector.match(/^\.([a-zA-Z0-9_-]+)$/);
      if (classMatch) {
        const className = classMatch[1];
        // Snapshot format: 'class="btn btn-primary"'
        const classRegex = new RegExp(`class="[^"]*\\b${className}\\b[^"]*"`);
        if (classRegex.test(line)) {
          return uid;
        }
      }

      // 3. Selector de texto (e.g., "Products")
      // This is a common way to find elements in snapshots
      if (line.includes(`"${selector}"`)) { // Exact text match
        return uid;
      }
      // Or if selector is text and line contains it as StaticText
      if (line.includes('StaticText') && line.includes(`"${selector}"`)) {
        return uid;
      }
    }
    
    console.log(`   ⚠️  No se pudo encontrar UID para selector: ${selector}`);
    console.log(`   💡 Primeras 10 líneas del snapshot:`);
    lines.slice(0, 10).forEach(line => console.log(`      ${line.substring(0, 100)}`));
    
    return null;
  }

  getTextFromSnapshot(snapshotText, uid) {
    const lines = snapshotText.split('\n');
    for (const line of lines) {
      if (line.includes(`uid=${uid}`)) {
        const textMatch = line.match(/text="([^"]*)"/);
        if (textMatch) {
          return textMatch[1];
        }
      }
    }
    return '';
  }

  // ==========================================
  // MÉTODOS PARA MOBILE
  // ==========================================

  /**
   * Busca un elemento móvil por selector y retorna sus coordenadas
   * @param {string} selector - Texto o descripción del elemento
   * @param {Array} elements - Lista de elementos del snapshot móvil
   * @returns {object|null} Elemento con coordenadas {x, y, text, type}
   */
  findElementMobile(selector, elements) {
    if (!elements || elements.length === 0) return null;

    // Normalizar selector
    const normalizedSelector = selector.toLowerCase().trim();

    // 1. Búsqueda exacta por texto
    for (const element of elements) {
      if (element.text && element.text.toLowerCase() === normalizedSelector) {
        if (element.x !== null && element.y !== null) {
          return element;
        }
      }
    }

    // 2. Búsqueda parcial por texto
    for (const element of elements) {
      if (element.text && element.text.toLowerCase().includes(normalizedSelector)) {
        if (element.x !== null && element.y !== null) {
          return element;
        }
      }
    }

    // 3. Búsqueda por tipo de elemento
    for (const element of elements) {
      if (element.type && element.type.toLowerCase() === normalizedSelector) {
        if (element.x !== null && element.y !== null) {
          return element;
        }
      }
    }

    // 4. Búsqueda por atributos
    for (const element of elements) {
      if (element.attributes && element.attributes.toLowerCase().includes(normalizedSelector)) {
        if (element.x !== null && element.y !== null) {
          return element;
        }
      }
    }

    console.log(`   ⚠️  No se encontró elemento móvil con selector: ${selector}`);
    console.log(`   💡 Elementos disponibles (primeros 5):`);
    elements.slice(0, 5).forEach(el => {
      console.log(`      ${el.type} "${el.text}" at (${el.x}, ${el.y})`);
    });

    return null;
  }

  /**
   * Busca múltiples elementos móviles por selector
   * @param {string} selector - Texto o descripción del elemento
   * @param {Array} elements - Lista de elementos del snapshot móvil
   * @returns {Array} Lista de elementos que coinciden
   */
  findAllElementsMobile(selector, elements) {
    if (!elements || elements.length === 0) return [];

    const normalizedSelector = selector.toLowerCase().trim();
    const matches = [];

    for (const element of elements) {
      // Búsqueda por texto
      if (element.text && element.text.toLowerCase().includes(normalizedSelector)) {
        if (element.x !== null && element.y !== null) {
          matches.push(element);
        }
      }
      // Búsqueda por tipo
      else if (element.type && element.type.toLowerCase() === normalizedSelector) {
        if (element.x !== null && element.y !== null) {
          matches.push(element);
        }
      }
      // Búsqueda por atributos
      else if (element.attributes && element.attributes.toLowerCase().includes(normalizedSelector)) {
        if (element.x !== null && element.y !== null) {
          matches.push(element);
        }
      }
    }

    return matches;
  }

  /**
   * Calcula el centro de un elemento móvil desde sus bounds
   * @param {object} bounds - {left, top, width, height}
   * @returns {object} {x, y}
   */
  calculateCenterFromBounds(bounds) {
    return {
      x: bounds.left + (bounds.width / 2),
      y: bounds.top + (bounds.height / 2)
    };
  }

  /**
   * Filtra elementos móviles por tipo
   * @param {Array} elements - Lista de elementos
   * @param {string} type - Tipo de elemento (Button, EditText, etc.)
   * @returns {Array} Elementos del tipo especificado
   */
  filterMobileElementsByType(elements, type) {
    return elements.filter(el =>
      el.type && el.type.toLowerCase() === type.toLowerCase()
    );
  }

  /**
   * Filtra elementos móviles que contengan un texto específico
   * @param {Array} elements - Lista de elementos
   * @param {string} text - Texto a buscar
   * @returns {Array} Elementos que contienen el texto
   */
  filterMobileElementsByText(elements, text) {
    const normalizedText = text.toLowerCase().trim();
    return elements.filter(el =>
      el.text && el.text.toLowerCase().includes(normalizedText)
    );
  }
}

module.exports = { ElementFinder };
