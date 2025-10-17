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
}

module.exports = { ElementFinder };
