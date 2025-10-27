// runners/adapters/openai.adapter.js
// Adapter para conectar con OpenAI API

const fs = require('fs');

class OpenAIAdapter {
  constructor(config) {
    this.config = config;
    this.model = config.model || 'gpt-4o-mini';
    this.temperature = config.temperature || 0.1;
    this.maxTokens = config.maxTokens || 4096;
    this.apiKey = null;
    this.openai = null;
  }

  async initialize() {
    console.log(`= Inicializando OpenAI...`);

    // Obtener API key
    this.apiKey = this.getApiKey();

    if (!this.apiKey) {
      throw new Error(
        'L API Key de OpenAI no configurada.\n' +
        '   Opciones:\n' +
        '   1. Set OPENAI_API_KEY environment variable\n' +
        '   2. Crea un archivo .env con: OPENAI_API_KEY=tu_key\n' +
        '   3. Obtén tu key en: https://platform.openai.com/api-keys'
      );
    }

    try {
      // Importar SDK de OpenAI
      const OpenAI = require('openai');

      this.openai = new OpenAI({
        apiKey: this.apiKey
      });

      // Verificar conexión con un test simple
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'user', content: 'Responde solo: OK' }
        ],
        temperature: this.temperature,
        max_tokens: 50
      });

      if (!completion.choices || !completion.choices[0]) {
        throw new Error('No se recibió respuesta del modelo');
      }

      console.log(` Conectado a OpenAI`);
      console.log(`   Modelo: ${this.model}`);
      console.log(`   Temperatura: ${this.temperature}`);

    } catch (error) {
      if (error.message.includes('Incorrect API key')) {
        throw new Error('L API Key inválida');
      }
      if (error.message.includes('insufficient_quota')) {
        throw new Error('L Cuota de OpenAI excedida. Verifica tu cuenta.');
      }
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error(
          'L SDK de OpenAI no instalado.\n' +
          '   Instala con: npm install openai'
        );
      }
      throw error;
    }
  }

  getApiKey() {
    // 1. Intentar desde variable de entorno
    if (process.env.OPENAI_API_KEY) {
      return process.env.OPENAI_API_KEY;
    }

    // 2. Intentar desde archivo .env
    try {
      if (fs.existsSync('.env')) {
        const envContent = fs.readFileSync('.env', 'utf8');
        const match = envContent.match(/OPENAI_API_KEY=(.+)/);
        if (match) {
          return match[1].trim();
        }
      }
    } catch (e) {
      // Ignorar error
    }

    return null;
  }

  async processStep(prompt, context) {
    try {
      // Construir el prompt final
      const fullPrompt = this.buildPrompt(prompt, context);

      console.log(`   > Consultando a OpenAI...`);

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente especializado en testing automatizado. Respondes SIEMPRE en formato JSON válido.'
          },
          {
            role: 'user',
            content: fullPrompt
          }
        ],
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        response_format: { type: 'json_object' } // Forzar respuesta JSON
      });

      const responseText = completion.choices[0].message.content;

      console.log(`   =­ Respuesta recibida (${responseText.length} caracteres)`);

      // Intentar parsear JSON de la respuesta
      const parsed = this.parseResponse(responseText);

      if (parsed) {
        console.log(`   <¯ Acción interpretada: ${parsed.action}`);
        return parsed;
      }

      // Si no hay JSON válido, usar fallback
      console.log('      Respuesta no JSON, usando fallback');
      return this.fallbackResponse(context.step);

    } catch (error) {
      console.error(`   L Error en OpenAI: ${error.message}`);

      if (error.message.includes('quota')) {
        console.error('   =¡ Cambia a Ollama: npm run switch-llm ollama');
      }

      // En caso de error, ejecutar directo sin IA
      return this.fallbackResponse(context.step);
    }
  }

  buildPrompt(basePrompt, context) {
    // Usar prompt simplificado si existe
    let simplePrompt = basePrompt;
    try {
      if (fs.existsSync('./prompts/system-simple.md')) {
        simplePrompt = fs.readFileSync('./prompts/system-simple.md', 'utf8');
      }
    } catch (e) {
      console.log('      No se pudo cargar prompt simplificado');
    }

    return `${simplePrompt}

## Tarea actual:
Acción solicitada: ${context.step.action}
Descripción: ${context.step.description || 'Sin descripción'}
Parámetros completos: ${JSON.stringify(context.step, null, 2)}

## Contexto:
URL actual: ${context.currentUrl}
Base URL: ${context.baseUrl}

Responde SOLO con JSON válido usando el formato exacto mostrado arriba.`;
  }

  parseResponse(responseText) {
    try {
      // Intentar parsear como JSON directo
      const parsed = JSON.parse(responseText);
      if (parsed.action && parsed.params) {
        return parsed;
      }
    } catch (e) {
      // No es JSON directo
    }

    // Intentar extraer JSON del texto
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.action && parsed.action !== 'navigate') {
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
    console.log(`   = Ejecutando acción directa del YAML`);

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
    // OpenAI SDK no necesita limpieza específica
    console.log(' OpenAI adapter limpiado');
  }
}

module.exports = OpenAIAdapter;
