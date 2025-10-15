// runners/adapters/ollama.adapter.js
// Adapter para conectar con Ollama (LLM local)

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

      console.log(`   💭 Respuesta recibida`);
      
      // Intentar parsear JSON de la respuesta
      const parsed = this.parseResponse(data.response);
      
      if (parsed) {
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
    // Construir prompt más específico
    return `${basePrompt}

IMPORTANTE: Responde SOLO con un objeto JSON válido, sin markdown, sin explicaciones adicionales.

Formato requerido:
{
  "action": "nombre_de_accion",
  "params": { "key": "value" },
  "reasoning": "explicación breve"
}

Analiza el paso YAML y responde con el JSON correspondiente.`;
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
        if (parsed.action) {
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
        if (parsed.action) {
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
    
    return {
      action: step.action,
      params: { ...step },
      reasoning: 'Fallback - ejecutando acción directa sin interpretación del LLM'
    };
  }

  async cleanup() {
    // Ollama no necesita limpieza específica
    console.log('✓ Ollama adapter limpiado');
  }
}

module.exports = OllamaAdapter;