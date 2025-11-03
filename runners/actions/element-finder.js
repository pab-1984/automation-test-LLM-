// runners/actions/element-finder.js

class ElementFinder {
  constructor() {
    // Cache de coordenadas de elementos frecuentes
    this.coordinatesCache = new Map();
    this.cacheHits = 0;
    this.cacheMisses = 0;

    // Configuración de fuzzy matching
    this.fuzzyMatchThreshold = 0.8; // 80% de similitud mínima

    // Configuración de tolerancia de coordenadas
    this.coordinateTolerance = 20; // píxeles de tolerancia
  }

  // ==========================================
  // UTILIDADES DE FUZZY MATCHING
  // ==========================================

  /**
   * Calcula la distancia de Levenshtein entre dos strings
   * @param {string} a - Primer string
   * @param {string} b - Segundo string
   * @returns {number} Distancia de Levenshtein
   */
  levenshteinDistance(a, b) {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // sustitución
            matrix[i][j - 1] + 1,     // inserción
            matrix[i - 1][j] + 1      // eliminación
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Calcula la similitud entre dos strings (0-1)
   * @param {string} a - Primer string
   * @param {string} b - Segundo string
   * @returns {number} Similitud (0 = diferentes, 1 = idénticos)
   */
  stringSimilarity(a, b) {
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;

    if (longer.length === 0) {
      return 1.0;
    }

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Normaliza texto para búsqueda (remueve acentos, lowercase, trim)
   * @param {string} text - Texto a normalizar
   * @returns {string} Texto normalizado
   */
  normalizeText(text) {
    if (!text) return '';

    return text
      .toLowerCase()
      .trim()
      .normalize('NFD') // Descomponer caracteres acentuados
      .replace(/[\u0300-\u036f]/g, ''); // Remover diacríticos
  }

  /**
   * Encuentra coincidencias fuzzy en un array de elementos
   * @param {string} searchText - Texto a buscar
   * @param {Array} elements - Lista de elementos
   * @param {string} property - Propiedad a comparar (ej: 'text')
   * @returns {Array} Elementos ordenados por similitud
   */
  fuzzyMatch(searchText, elements, property = 'text') {
    const normalizedSearch = this.normalizeText(searchText);
    const matches = [];

    for (const element of elements) {
      if (!element[property]) continue;

      const normalizedElementText = this.normalizeText(element[property]);
      const similarity = this.stringSimilarity(normalizedSearch, normalizedElementText);

      if (similarity >= this.fuzzyMatchThreshold) {
        matches.push({
          element,
          similarity,
          matchedText: element[property]
        });
      }
    }

    // Ordenar por similitud descendente
    return matches.sort((a, b) => b.similarity - a.similarity);
  }

  // ==========================================
  // CACHE DE COORDENADAS
  // ==========================================

  /**
   * Genera clave de cache para un elemento
   * @param {string} selector - Selector del elemento
   * @param {string} context - Contexto adicional (ej: nombre de pantalla)
   * @returns {string} Clave de cache
   */
  getCacheKey(selector, context = '') {
    return `${context}::${this.normalizeText(selector)}`;
  }

  /**
   * Obtiene coordenadas desde cache
   * @param {string} selector - Selector del elemento
   * @param {string} context - Contexto adicional
   * @returns {object|null} Coordenadas cacheadas o null
   */
  getFromCache(selector, context = '') {
    const key = this.getCacheKey(selector, context);
    const cached = this.coordinatesCache.get(key);

    if (cached) {
      this.cacheHits++;
      console.log(`   📦 Cache HIT para "${selector}" (${this.cacheHits} hits, ${this.cacheMisses} misses)`);
      return cached;
    }

    this.cacheMisses++;
    return null;
  }

  /**
   * Guarda coordenadas en cache
   * @param {string} selector - Selector del elemento
   * @param {object} coordinates - {x, y}
   * @param {string} context - Contexto adicional
   */
  saveToCache(selector, coordinates, context = '') {
    const key = this.getCacheKey(selector, context);
    this.coordinatesCache.set(key, {
      ...coordinates,
      timestamp: Date.now()
    });
  }

  /**
   * Limpia cache de elementos antiguos (más de 5 minutos)
   */
  cleanCache() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutos

    for (const [key, value] of this.coordinatesCache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.coordinatesCache.delete(key);
      }
    }
  }

  /**
   * Limpia todo el cache
   */
  clearCache() {
    this.coordinatesCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    console.log('   🗑️  Cache limpiado');
  }

  /**
   * Obtiene estadísticas del cache
   * @returns {object} Estadísticas
   */
  getCacheStats() {
    return {
      size: this.coordinatesCache.size,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0
    };
  }

  // ==========================================
  // TOLERANCIA A CAMBIOS DE COORDENADAS
  // ==========================================

  /**
   * Encuentra elementos cercanos a unas coordenadas dadas
   * @param {number} x - Coordenada X objetivo
   * @param {number} y - Coordenada Y objetivo
   * @param {Array} elements - Lista de elementos
   * @param {number} tolerance - Tolerancia en píxeles (default: 20)
   * @returns {Array} Elementos cercanos ordenados por distancia
   */
  findNearbyElements(x, y, elements, tolerance = null) {
    const tol = tolerance || this.coordinateTolerance;
    const nearby = [];

    for (const element of elements) {
      if (element.x === null || element.y === null) continue;

      const distance = Math.sqrt(
        Math.pow(element.x - x, 2) + Math.pow(element.y - y, 2)
      );

      if (distance <= tol) {
        nearby.push({
          element,
          distance
        });
      }
    }

    // Ordenar por distancia ascendente
    return nearby.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Verifica si dos coordenadas son similares dentro de la tolerancia
   * @param {object} coords1 - {x, y}
   * @param {object} coords2 - {x, y}
   * @param {number} tolerance - Tolerancia en píxeles
   * @returns {boolean} True si son similares
   */
  areCoordinatesSimilar(coords1, coords2, tolerance = null) {
    const tol = tolerance || this.coordinateTolerance;
    const distance = Math.sqrt(
      Math.pow(coords1.x - coords2.x, 2) + Math.pow(coords1.y - coords2.y, 2)
    );
    return distance <= tol;
  }

  // ==========================================
  // MÉTODOS WEB (Existentes)
  // ==========================================

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
   * MEJORADO: Ahora con fuzzy matching, cache y multi-idioma
   *
   * @param {string} selector - Texto o descripción del elemento
   * @param {Array} elements - Lista de elementos del snapshot móvil
   * @param {object} options - Opciones de búsqueda
   * @param {boolean} options.useCache - Usar cache (default: true)
   * @param {string} options.context - Contexto para cache (default: '')
   * @param {boolean} options.fuzzy - Habilitar fuzzy matching (default: true)
   * @param {number} options.fuzzyThreshold - Umbral fuzzy (default: 0.8)
   * @returns {object|null} Elemento con coordenadas {x, y, text, type}
   */
  findElementMobile(selector, elements, options = {}) {
    if (!elements || elements.length === 0) return null;

    const opts = {
      useCache: true,
      context: '',
      fuzzy: true,
      fuzzyThreshold: this.fuzzyMatchThreshold,
      ...options
    };

    // 1. Verificar cache primero
    if (opts.useCache) {
      const cached = this.getFromCache(selector, opts.context);
      if (cached) {
        // Verificar que el elemento aún existe en coordenadas similares
        const nearby = this.findNearbyElements(cached.x, cached.y, elements);
        if (nearby.length > 0) {
          return nearby[0].element;
        }
      }
    }

    // Normalizar selector para búsquedas
    const normalizedSelector = this.normalizeText(selector);

    // 2. Búsqueda exacta por texto normalizado (sin acentos)
    for (const element of elements) {
      if (element.text) {
        const normalizedText = this.normalizeText(element.text);
        if (normalizedText === normalizedSelector) {
          if (element.x !== null && element.y !== null) {
            // Guardar en cache
            if (opts.useCache) {
              this.saveToCache(selector, { x: element.x, y: element.y }, opts.context);
            }
            return element;
          }
        }
      }
    }

    // 3. Búsqueda parcial por texto normalizado
    for (const element of elements) {
      if (element.text) {
        const normalizedText = this.normalizeText(element.text);
        if (normalizedText.includes(normalizedSelector)) {
          if (element.x !== null && element.y !== null) {
            if (opts.useCache) {
              this.saveToCache(selector, { x: element.x, y: element.y }, opts.context);
            }
            return element;
          }
        }
      }
    }

    // 4. Búsqueda por tipo de elemento
    for (const element of elements) {
      if (element.type) {
        const normalizedType = this.normalizeText(element.type);
        if (normalizedType === normalizedSelector) {
          if (element.x !== null && element.y !== null) {
            if (opts.useCache) {
              this.saveToCache(selector, { x: element.x, y: element.y }, opts.context);
            }
            return element;
          }
        }
      }
    }

    // 5. Búsqueda por atributos
    for (const element of elements) {
      if (element.attributes) {
        const normalizedAttrs = this.normalizeText(element.attributes);
        if (normalizedAttrs.includes(normalizedSelector)) {
          if (element.x !== null && element.y !== null) {
            if (opts.useCache) {
              this.saveToCache(selector, { x: element.x, y: element.y }, opts.context);
            }
            return element;
          }
        }
      }
    }

    // 6. Fuzzy matching como último recurso
    if (opts.fuzzy) {
      const previousThreshold = this.fuzzyMatchThreshold;
      this.fuzzyMatchThreshold = opts.fuzzyThreshold;

      const fuzzyMatches = this.fuzzyMatch(selector, elements, 'text');

      this.fuzzyMatchThreshold = previousThreshold;

      if (fuzzyMatches.length > 0) {
        const bestMatch = fuzzyMatches[0];
        console.log(`   🔍 Fuzzy match encontrado: "${bestMatch.matchedText}" (similitud: ${(bestMatch.similarity * 100).toFixed(1)}%)`);

        if (bestMatch.element.x !== null && bestMatch.element.y !== null) {
          if (opts.useCache) {
            this.saveToCache(selector, { x: bestMatch.element.x, y: bestMatch.element.y }, opts.context);
          }
          return bestMatch.element;
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

  // ==========================================
  // HEURÍSTICAS PARA ELEMENTOS DINÁMICOS
  // ==========================================

  /**
   * Detecta si un elemento es probablemente dinámico
   * @param {object} element - Elemento a analizar
   * @returns {object} {isDynamic, confidence, reasons}
   */
  detectDynamicElement(element) {
    const reasons = [];
    let confidence = 0;

    // 1. Elementos con "loading", "spinner", "progress" (más prioritario)
    const dynamicKeywords = ['loading', 'spinner', 'progress', 'placeholder', 'cargando'];
    const textLower = (element.text || '').toLowerCase();
    const typeLower = (element.type || '').toLowerCase();

    for (const keyword of dynamicKeywords) {
      if (textLower.includes(keyword) || typeLower.includes(keyword)) {
        reasons.push(`Palabra clave dinámica: ${keyword}`);
        confidence += 0.6;
        break;
      }
    }

    // 2. Texto con fechas/horas
    if (element.text && /\d{1,2}:\d{2}|\d{1,2}\/\d{1,2}/.test(element.text)) {
      reasons.push('Contiene fecha/hora');
      confidence += 0.5;
    }

    // 3. Texto con números que cambian (contadores, IDs)
    if (element.text && /\d{3,}/.test(element.text)) {
      reasons.push('Contiene números (posible ID/contador)');
      confidence += 0.35;
    }

    // 4. IDs generados automáticamente
    if (element.attributes && /id.*[0-9a-f]{8,}/.test(element.attributes)) {
      reasons.push('ID generado');
      confidence += 0.25;
    }

    return {
      isDynamic: confidence >= 0.5,
      confidence: Math.min(confidence, 1.0),
      reasons
    };
  }

  /**
   * Encuentra elementos estables (no dinámicos) en una lista
   * @param {Array} elements - Lista de elementos
   * @returns {Array} Elementos estables
   */
  findStableElements(elements) {
    return elements.filter(el => {
      const analysis = this.detectDynamicElement(el);
      return !analysis.isDynamic;
    });
  }

  /**
   * Identifica elementos comunes entre dos snapshots (para tracking)
   * @param {Array} elements1 - Snapshot anterior
   * @param {Array} elements2 - Snapshot actual
   * @returns {Array} Elementos que aparecen en ambos
   */
  findCommonElements(elements1, elements2) {
    const common = [];

    for (const el1 of elements1) {
      for (const el2 of elements2) {
        // Comparar por texto y tipo
        if (el1.text === el2.text && el1.type === el2.type) {
          // Verificar si las coordenadas son similares
          if (this.areCoordinatesSimilar(
            { x: el1.x, y: el1.y },
            { x: el2.x, y: el2.y },
            50 // tolerancia mayor para elementos que pueden moverse
          )) {
            common.push({
              element: el2,
              previousPosition: { x: el1.x, y: el1.y },
              currentPosition: { x: el2.x, y: el2.y },
              hasMoved: !this.areCoordinatesSimilar(
                { x: el1.x, y: el1.y },
                { x: el2.x, y: el2.y },
                5 // movimiento mínimo significativo
              )
            });
          }
        }
      }
    }

    return common;
  }

  // ==========================================
  // BÚSQUEDA POR CONTEXTO VISUAL CON IA
  // ==========================================

  /**
   * Busca elementos usando descripción en lenguaje natural con LLM
   * NOTA: Requiere un adaptador LLM pasado como parámetro
   *
   * @param {string} description - Descripción natural (ej: "botón azul en la esquina superior derecha")
   * @param {Array} elements - Lista de elementos
   * @param {object} llmAdapter - Adaptador LLM (opcional)
   * @returns {Promise<object|null>} Elemento encontrado
   */
  async findByVisualContext(description, elements, llmAdapter = null) {
    if (!llmAdapter) {
      console.log('   ⚠️  LLM adapter no disponible, usando búsqueda básica');
      return this.findElementMobile(description, elements);
    }

    try {
      // Preparar contexto para el LLM
      const elementsContext = elements.map((el, idx) => ({
        index: idx,
        type: el.type,
        text: el.text,
        position: `(${el.x}, ${el.y})`,
        attributes: el.attributes
      }));

      const prompt = `
Eres un asistente de testing automatizado. Tu tarea es identificar qué elemento de una lista coincide mejor con una descripción visual.

**Descripción del elemento buscado:**
"${description}"

**Elementos disponibles:**
${JSON.stringify(elementsContext, null, 2)}

Responde SOLO con el número de índice del elemento que mejor coincida con la descripción.
Si ninguno coincide, responde con -1.
NO incluyas explicaciones, SOLO el número.
`;

      console.log('   🤖 Consultando LLM para búsqueda visual...');
      const response = await llmAdapter.sendMessage(prompt);
      const elementIndex = parseInt(response.trim());

      if (elementIndex >= 0 && elementIndex < elements.length) {
        console.log(`   ✓ LLM encontró elemento: ${elements[elementIndex].text}`);
        return elements[elementIndex];
      }

      console.log('   ⚠️  LLM no pudo identificar el elemento');
      return null;

    } catch (error) {
      console.error('   ❌ Error en búsqueda visual con LLM:', error.message);
      // Fallback a búsqueda normal
      return this.findElementMobile(description, elements);
    }
  }

  /**
   * Analiza un grupo de elementos y sugiere el mejor candidato
   * usando heurísticas de posición, tamaño y contexto
   *
   * @param {Array} candidates - Lista de candidatos
   * @param {object} preferences - Preferencias de búsqueda
   * @param {string} preferences.position - 'top'|'bottom'|'left'|'right'|'center'
   * @param {string} preferences.size - 'large'|'medium'|'small'
   * @param {boolean} preferences.preferClickable - Preferir elementos clickables
   * @returns {object|null} Mejor candidato
   */
  selectBestCandidate(candidates, preferences = {}) {
    if (!candidates || candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    const prefs = {
      position: null,
      size: null,
      preferClickable: true,
      ...preferences
    };

    let scored = candidates.map(el => {
      let score = 0;

      // 1. Preferencia por posición
      if (prefs.position) {
        switch (prefs.position) {
          case 'top':
            score += (1000 - el.y) / 1000 * 30; // Más puntos cuanto más arriba
            break;
          case 'bottom':
            score += el.y / 1000 * 30; // Más puntos cuanto más abajo
            break;
          case 'left':
            score += (1000 - el.x) / 1000 * 30;
            break;
          case 'right':
            score += el.x / 1000 * 30;
            break;
          case 'center':
            const distanceFromCenter = Math.abs(el.x - 500) + Math.abs(el.y - 500);
            score += (1000 - distanceFromCenter) / 1000 * 30;
            break;
        }
      }

      // 2. Preferencia por elementos clickables
      if (prefs.preferClickable) {
        const clickableTypes = ['button', 'link', 'tab', 'checkbox', 'radio'];
        if (clickableTypes.some(type => el.type && el.type.toLowerCase().includes(type))) {
          score += 20;
        }
      }

      // 3. Elementos con texto son generalmente más útiles
      if (el.text && el.text.trim().length > 0) {
        score += 10;
      }

      // 4. Penalizar elementos dinámicos
      const dynamicAnalysis = this.detectDynamicElement(el);
      if (dynamicAnalysis.isDynamic) {
        score -= dynamicAnalysis.confidence * 15;
      }

      return { element: el, score };
    });

    // Ordenar por score descendente
    scored.sort((a, b) => b.score - a.score);

    console.log(`   🎯 Mejor candidato: ${scored[0].element.text || scored[0].element.type} (score: ${scored[0].score.toFixed(1)})`);

    return scored[0].element;
  }

  // ==========================================
  // UTILIDADES DE DIAGNÓSTICO
  // ==========================================

  /**
   * Genera un reporte de diagnóstico del estado actual
   * @returns {object} Reporte con estadísticas
   */
  getDiagnostics() {
    const cacheStats = this.getCacheStats();

    return {
      cache: {
        size: cacheStats.size,
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRate: `${(cacheStats.hitRate * 100).toFixed(1)}%`
      },
      settings: {
        fuzzyMatchThreshold: this.fuzzyMatchThreshold,
        coordinateTolerance: this.coordinateTolerance
      }
    };
  }

  /**
   * Imprime diagnóstico en consola
   */
  printDiagnostics() {
    const diag = this.getDiagnostics();
    console.log('\n📊 Element Finder Diagnostics:');
    console.log(`   Cache: ${diag.cache.size} elementos, ${diag.cache.hitRate} hit rate`);
    console.log(`   Fuzzy threshold: ${diag.settings.fuzzyMatchThreshold}`);
    console.log(`   Coordinate tolerance: ${diag.settings.coordinateTolerance}px\n`);
  }
}

module.exports = { ElementFinder };
