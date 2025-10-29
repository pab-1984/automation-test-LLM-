// runners/adapters/ollama.adapter.js
// Adapter para conectar con Ollama (LLM local)

const fs = require('fs');

class OllamaAdapter {
  constructor(config) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    this.model = config.model || 'llama3.2:3b';
    this.temperature = config.temperature || 0.1;
    this.maxTokens = config.maxTokens || 2000;
  }

  async initialize() {
    console.log(`🔌 Conectando con Ollama en ${this.baseUrl}...`);
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Ollama respondió con status ${response.status}`);
      }
      const data = await response.json();
      const modelExists = data.models && data.models.some(m => m.name === this.model);
      if (!modelExists) {
        console.log(`\n⚠️  Modelo ${this.model} no encontrado.`);
        console.log('Modelos disponibles:');
        if (data.models && data.models.length > 0) {
          data.models.forEach(m => console.log(`   - ${m.name}`));
        } else {
          console.log('   (ninguno)');
        }
        console.log(`\nPara instalar el modelo, ejecuta:`);
        console.log(`   ollama pull ${this.model}\n`);
        throw new Error(`Modelo ${this.model} no está instalado`);
      }
      console.log(`✅ Conectado a Ollama`);
      console.log(`   Modelo: ${this.model}`);
      console.log(`   Temperatura: ${this.temperature}`);
    } catch (error) {
      if (error.message.includes('fetch failed') || error.code === 'ECONNREFUSED') {
        throw new Error(
          '❌ No se pudo conectar a Ollama.\n' +
          '   Asegúrate de que Ollama esté corriendo:\n' +
          '   1. Abre otra terminal\n' +
          '   2. Ejecuta: ollama serve\n' +
          '   3. Vuelve a intentar'
        );
      }
      throw error;
    }
  }

  /**
   * Método genérico para enviar un prompt y recibir una respuesta JSON.
   * @param {string} prompt - El prompt a enviar al LLM.
   * @returns {Promise<Object|null>} - El objeto JSON parseado o null si falla.
   */
  async generateJson(prompt) {
    try {
      console.log(`   🤖 Consultando a Ollama...`);
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          format: 'json', // Solicitar explícitamente formato JSON
          stream: false,
          options: {
            temperature: this.temperature,
            num_predict: this.maxTokens,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.response) {
        throw new Error('Ollama no retornó respuesta');
      }

      console.log(`   💭 Respuesta recibida (${data.response.length} caracteres)`);
      return this.parseResponse(data.response);

    } catch (error) {
        console.error(`   ❌ Error en la consulta a Ollama: ${error.message}`);
        return null;
    }
  }

  /**
   * Procesa un paso de test. Mantenido por retrocompatibilidad.
   * @param {string} prompt - El prompt base del sistema.
   * @param {Object} context - El contexto del paso actual.
   * @returns {Promise<Object>} - La acción a ejecutar.
   */
  async processStep(prompt, context) {
    // Construir el prompt específico para la ejecución de un paso
    const fullPrompt = this.buildPromptForStep(prompt, context);
    
    const parsed = await this.generateJson(fullPrompt);

    if (parsed) {
      console.log(`   🎯 Acción interpretada: ${parsed.action || 'desconocida'}`);
      return parsed;
    }

    // Si no hay JSON válido, usar fallback
    console.log('   ⚠️  Respuesta no JSON, usando fallback');
    return this.fallbackResponse(context.step);
  }

  buildPromptForStep(basePrompt, context) {
    // Carga el prompt del sistema si no se proporciona uno específico
    let systemPrompt = basePrompt;
    try {
      if (fs.existsSync('./prompts/system-simple.md')) {
        systemPrompt = fs.readFileSync('./prompts/system-simple.md', 'utf8');
      }
    } catch (e) {
      console.log('   ⚠️  No se pudo cargar prompt del sistema, usando prompt base');
    }
    
    // Asegurarse de que el contexto y el paso existan
    const stepAction = context?.step?.action || 'ninguna';
    const stepDescription = context?.step?.description || 'ninguna';
    const stepParams = JSON.stringify(context?.step, null, 2) || '{}';
    const currentUrl = context?.currentUrl || 'desconocida';
    const baseUrl = context?.baseUrl || 'desconocida';

    return `${systemPrompt}\n\n## Tarea actual:\nAcción solicitada: ${stepAction}\nDescripción: ${stepDescription}\nParámetros completos: ${stepParams}\n\n## Contexto:\nURL actual: ${currentUrl}\nBase URL: ${baseUrl}\n\nResponde SOLO con JSON válido usando el formato exacto mostrado en el prompt del sistema.`;
  }

  parseResponse(responseText) {
    try {
      // Ollama con format: 'json' devuelve un string JSON, por lo que se necesita un parseo.
      const parsed = JSON.parse(responseText);
      return parsed;
    } catch (e) {
      // Si falla el parseo, puede que el LLM haya incluido texto extra.
      // Intentamos extraer el JSON de todas formas.
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e2) {
          console.error('   ❌ Error final de parseo JSON:', e2.message);
          return null;
        }
      }
    }
    return null;
  }

  fallbackResponse(step) {
    console.log(`   🔄 Ejecutando acción directa del YAML`);
    const params = { ...step };
    delete params.action;
    delete params.description;
    delete params.mode;
    
    return {
      action: step.action,
      params: params,
      reasoning: 'Fallback - ejecutando acción directa sin interpretación del LLM'
    };
  }

  async cleanup() {
    console.log('✓ Ollama adapter limpiado');
  }
}

module.exports = OllamaAdapter;
