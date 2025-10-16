// runners/actions/element-finder.js

class ElementFinder {
  findUidInSnapshot(snapshotText, selector) {
    if (!snapshotText) return null;
    
    const lines = snapshotText.split('\n');
    
    // 1. Intentar buscar selector exacto primero
    for (const line of lines) {
      if (line.includes(selector)) {
        const uidMatch = line.match(/uid=(\d+)/);
        if (uidMatch) {
          return uidMatch[1];
        }
      }
    }
    
    // 2. Parsear selectores específicos
    // Selector de tag simple (h1, button, div, etc.)
    const tagMatch = selector.match(/^([a-z][a-z0-9]*)$/i);
    if (tagMatch) {
      const tag = tagMatch[1].toLowerCase();
      for (const line of lines) {
        // Buscar apertura de tag
        const tagRegex = new RegExp(`<${tag}[\s>]`, 'i');
        if (tagRegex.test(line)) {
          const uidMatch = line.match(/uid=(\d+)/);
          if (uidMatch) {
            return uidMatch[1];
          }
        }
      }
    }
    
    // 3. Selector de clase (.card, .btn-primary, etc.)
    const classMatch = selector.match(/^\.([a-zA-Z0-9_-]+)$/);
    if (classMatch) {
      const className = classMatch[1];
      for (const line of lines) {
        // Buscar class="..." o class='...'
        const classRegex = new RegExp(`class="[^"]*\b${className}\b[^"]*"`);
        if (classRegex.test(line)) {
          const uidMatch = line.match(/uid=(\d+)/);
          if (uidMatch) {
            return uidMatch[1];
          }
        }
      }
    }
    
    // 4. Selector compuesto con clase (.card button, button.btn-primary)
    const compoundMatch = selector.match(/^([a-z]+)\.([a-zA-Z0-9_-]+)$/i);
    if (compoundMatch) {
      const tag = compoundMatch[1].toLowerCase();
      const className = compoundMatch[2];
      for (const line of lines) {
        const tagRegex = new RegExp(`<${tag}[\s>]`, 'i');
        const classRegex = new RegExp(`class="[^"]*\b${className}\b[^"]*"`);
        if (tagRegex.test(line) && classRegex.test(line)) {
          const uidMatch = line.match(/uid=(\d+)/);
          if (uidMatch) {
            return uidMatch[1];
          }
        }
      }
    }
    
    // 5. Selector descendiente (.card button, .card:first-of-type button)
    const descendantMatch = selector.match(/^(.+)\s+([a-z]+)$/i);
    if (descendantMatch) {
      const parentSelector = descendantMatch[1];
      const childTag = descendantMatch[2].toLowerCase();
      
      // Primero encontrar el padre
      const parentUid = this.findUidInSnapshot(snapshotText, parentSelector);
      if (parentUid) {
        // Buscar hijos del padre (esto es aproximado)
        let foundParent = false;
        for (const line of lines) {
          if (line.includes(`uid=${parentUid}`)) {
            foundParent = true;
            continue;
          }
          if (foundParent) {
            const tagRegex = new RegExp(`<${childTag}[\s>]`, 'i');
            if (tagRegex.test(line)) {
              const uidMatch = line.match(/uid=(\d+)/);
              if (uidMatch) {
                return uidMatch[1];
              }
            }
            // Si encontramos un tag de cierre del padre, parar
            if (line.includes('</')) {
              break;
            }
          }
        }
      }
    }
    
    // 6. Pseudo-selector :first-of-type, :first-child
    const pseudoMatch = selector.match(/^(.+):first-of-type$/);
    if (pseudoMatch) {
      const baseSelector = pseudoMatch[1];
      // Buscar el primero que coincida con el selector base
      return this.findUidInSnapshot(snapshotText, baseSelector);
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
}

module.exports = { ElementFinder };
