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
    
    // Verificar que Ollama esté disponible
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      
      if (!response.ok) {
        throw new Error(`Ollama respondió con status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Verificar que el modelo existe
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

  async processStep(prompt, context) {
    try {
      // Construir el prompt final
      const fullPrompt = this.buildPrompt(prompt, context);
      
      console.log(`   🤖 Consultando a Ollama...`);
      
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: fullPrompt,
          stream: false,
          options: {
            temperature: this.temperature,
            num_predict: this.maxTokens,
            top_p: 0.9,
            top_k: 40
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
      
      // Intentar parsear JSON de la respuesta
      const parsed = this.parseResponse(data.response);
      
      if (parsed) {
        console.log(`   🎯 Acción interpretada: ${parsed.action}`);
        return parsed;
      }

      // Si no hay JSON válido, usar fallback
      console.log('   ⚠️  Respuesta no JSON, usando fallback');
      return this.fallbackResponse(context.step);
      
    } catch (error) {
      console.error(`   ❌ Error en Ollama: ${error.message}`);
      
      // En caso de error, ejecutar directo sin IA
      return this.fallbackResponse(context.step);
    }
  }

  buildPrompt(basePrompt, context) {
    // Usar prompt simplificado si existe, sino el original
    let simplePrompt = basePrompt;
    try {
      if (fs.existsSync('./prompts/system-simple.md')) {
        simplePrompt = fs.readFileSync('./prompts/system-simple.md', 'utf8');
      }
    } catch (e) {
      // Usar el prompt original si hay error
      console.log('   ⚠️  No se pudo cargar prompt simplificado, usando original');
    }
    
    return `${simplePrompt}

## Tarea actual:
Acción solicitada: ${context.step.action}
Descripción: ${context.step.description || 'Sin descripción'}
Parámetros completos: ${JSON.stringify(context.step, null, 2)}

## Contexto:
URL actual: ${context.currentUrl}
Base URL: ${context.baseUrl}

Responde SOLO con JSON válido usando el formato exacto mostrado arriba:`;
  }

  parseResponse(responseText) {
    try {
      // Intentar parsear como JSON directo
      const parsed = JSON.parse(responseText);
      if (parsed.action && parsed.params) {
        return parsed;
      }
    } catch (e) {
      // No es JSON directo, intentar extraer
    }

    // Intentar extraer JSON del texto
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.action && parsed.action !== 'navigate') { // Evitar navegaciones incorrectas
          return parsed;
        }
      } catch (e) {
        // Falló el parsing
      }
    }

    // Intentar extraer de bloques de código
    const codeBlockMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      try {
        const parsed = JSON.parse(codeBlockMatch[1]);
        if (parsed.action && parsed.action !== 'navigate') { // Evitar navegaciones incorrectas
          return parsed;
        }
      } catch (e) {
        // Falló el parsing
      }
    }

    return null;
  }

  fallbackResponse(step) {
    // Respuesta de emergencia cuando el LLM no responde correctamente
    console.log(`   🔄 Ejecutando acción directa del YAML`);
    
    // Crear una copia limpia de los parámetros
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
    // Ollama no necesita limpieza específica
    console.log('✓ Ollama adapter limpiado');
  }
}

module.exports = OllamaAdapter;
