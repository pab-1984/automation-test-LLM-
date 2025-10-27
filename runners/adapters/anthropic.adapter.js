// runners/adapters/anthropic.adapter.js
// Adapter para conectar con Anthropic (Claude) API

const fs = require('fs');

class AnthropicAdapter {
  constructor(config) {
    this.config = config;
    this.model = config.model || 'claude-3-5-sonnet-20241022';
    this.temperature = config.temperature || 0.1;
    this.maxTokens = config.maxTokens || 4096;
    this.apiKey = null;
    this.anthropic = null;
  }

  async initialize() {
    console.log(`🔌 Inicializando Anthropic (Claude)...`);

    // Obtener API key
    this.apiKey = this.getApiKey();

    if (!this.apiKey) {
      throw new Error(
        '❌ API Key de Anthropic no configurada.\n' +
        '   Opciones:\n' +
        '   1. Set ANTHROPIC_API_KEY environment variable\n' +
        '   2. Crea un archivo .env con: ANTHROPIC_API_KEY=tu_key\n' +
        '   3. Obtén tu key en: https://console.anthropic.com/settings/keys'
      );
    }

    try {
      // Importar SDK de Anthropic
      const Anthropic = require('@anthropic-ai/sdk');

      this.anthropic = new Anthropic({
        apiKey: this.apiKey
      });

      // Verificar conexión con un test simple
      const message = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 50,
        messages: [
          { role: 'user', content: 'Responde solo: OK' }
        ]
      });

      if (!message.content || !message.content[0]) {
        throw new Error('No se recibió respuesta del modelo');
      }

      console.log(`✅ Conectado a Anthropic (Claude)`);
      console.log(`   Modelo: ${this.model}`);
      console.log(`   Temperatura: ${this.temperature}`);

    } catch (error) {
      if (error.message.includes('invalid_api_key')) {
        throw new Error('❌ API Key inválida');
      }
      if (error.message.includes('overloaded') || error.message.includes('rate_limit')) {
        throw new Error('❌ Servicio sobrecargado o límite alcanzado. Intenta más tarde.');
      }
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error(
          '❌ SDK de Anthropic no instalado.\n' +
          '   Instala con: npm install @anthropic-ai/sdk'
        );
      }
      throw error;
    }
  }

  getApiKey() {
    // 1. Intentar desde variable de entorno
    if (process.env.ANTHROPIC_API_KEY) {
      return process.env.ANTHROPIC_API_KEY;
    }

    // 2. Intentar desde archivo .env
    try {
      if (fs.existsSync('.env')) {
        const envContent = fs.readFileSync('.env', 'utf8');
        const match = envContent.match(/ANTHROPIC_API_KEY=(.+)/);
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

      console.log(`   🤖 Consultando a Claude...`);

      const message = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        system: 'Eres un asistente especializado en testing automatizado. Respondes SIEMPRE en formato JSON válido.',
        messages: [
          {
            role: 'user',
            content: fullPrompt
          }
        ]
      });

      const responseText = message.content[0].text;

      console.log(`   💭 Respuesta recibida (${responseText.length} caracteres)`);

      // Intentar parsear JSON de la respuesta
      const parsed = this.parseResponse(responseText);

      if (parsed) {
        console.log(`   🎯 Acción interpretada: ${parsed.action}`);
        return parsed;
      }

      // Si no hay JSON válido, usar fallback
      console.log('   ⚠️  Respuesta no JSON, usando fallback');
      return this.fallbackResponse(context.step);

    } catch (error) {
      console.error(`   ❌ Error en Claude: ${error.message}`);

      if (error.message.includes('rate_limit')) {
        console.error('   💡 Límite alcanzado. Cambia a Ollama: npm run switch-llm ollama');
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
      console.log('   ⚠️  No se pudo cargar prompt simplificado');
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

    // Intentar extraer de bloques de código
    const codeBlockMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      try {
        const parsed = JSON.parse(codeBlockMatch[1]);
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
    // Anthropic SDK no necesita limpieza específica
    console.log('✓ Anthropic adapter limpiado');
  }
}

module.exports = AnthropicAdapter;
