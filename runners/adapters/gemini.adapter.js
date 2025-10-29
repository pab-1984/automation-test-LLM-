// runners/adapters/gemini.adapter.js
// Adapter para conectar con Google Gemini API

const fs = require('fs');

class GeminiAdapter {
  constructor(config) {
    this.config = config;
    this.model = config.model || 'gemini-2.0-flash-exp';
    this.temperature = config.temperature || 0.1;
    this.maxTokens = config.maxTokens || 4096;
    this.apiKey = null;
    this.genAI = null;
  }

  async initialize() {
    console.log(`🔌 Inicializando Gemini...`);

    // Obtener API key
    this.apiKey = this.getApiKey();

    if (!this.apiKey) {
      throw new Error(
        '❌ API Key de Gemini no configurada.\n' +
        '   Opciones:\n' +
        '   1. Set GEMINI_API_KEY environment variable\n' +
        '   2. Crea un archivo .env con: GEMINI_API_KEY=tu_key\n' +
        '   3. Obtén tu key en: https://makersuite.google.com/app/apikey'
      );
    }

    try {
      // Importar SDK de Gemini
      const { GoogleGenerativeAI } = require('@google/generative-ai');

      this.genAI = new GoogleGenerativeAI(this.apiKey);

      // No hacemos verificación inicial para no gastar requests del rate limit
      // La conexión se verifica en el primer uso real

      console.log(`✅ Gemini configurado`);
      console.log(`   Modelo: ${this.model}`);
      console.log(`   Temperatura: ${this.temperature}`);

    } catch (error) {
      if (error.message.includes('API_KEY')) {
        throw new Error('❌ API Key inválida o no autorizada');
      }
      if (error.message.includes('quota')) {
        throw new Error('❌ Cuota de Gemini excedida. Intenta mañana o usa otro LLM.');
      }
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error(
          '❌ SDK de Gemini no instalado.\n' +
          '   Instala con: npm install @google/generative-ai'
        );
      }
      throw error;
    }
  }

  getApiKey() {
    // 1. Intentar desde variable de entorno
    if (process.env.GEMINI_API_KEY) {
      return process.env.GEMINI_API_KEY;
    }

    // 2. Intentar desde archivo .env
    try {
      if (fs.existsSync('.env')) {
        const envContent = fs.readFileSync('.env', 'utf8');
        const match = envContent.match(/GEMINI_API_KEY=(.+)/);
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

      console.log(`   🤖 Consultando a Gemini...`);

      const model = this.genAI.getGenerativeModel({
        model: this.model,
        generationConfig: {
          temperature: this.temperature,
          maxOutputTokens: this.maxTokens,
        }
      });

      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      console.log(`   💭 Respuesta recibida (${text.length} caracteres)`);

      // Intentar parsear JSON de la respuesta
      const parsed = this.parseResponse(text);

      if (parsed) {
        console.log(`   🎯 Acción interpretada: ${parsed.action}`);
        return parsed;
      }

      // Si no hay JSON válido, usar fallback
      console.log('   ⚠️  Respuesta no JSON, usando fallback');
      return this.fallbackResponse(context.step);

    } catch (error) {
      console.error(`   ❌ Error en Gemini: ${error.message}`);

      if (error.message.includes('quota')) {
        console.error('   💡 Cambia a Ollama: npm run switch-llm ollama');
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

  /**
   * NUEVO: Chat con herramientas (function calling)
   * Usado para modo LLM + MCP directo sin YAML
   */
  async chatWithTools({ systemPrompt, messages, tools }) {
    try {
      // Convertir herramientas al formato de Gemini
      const geminiTools = this.convertToolsToGeminiFormat(tools);

      // Crear modelo con herramientas
      const model = this.genAI.getGenerativeModel({
        model: this.model,
        generationConfig: {
          temperature: this.temperature,
          maxOutputTokens: this.maxTokens,
        },
        systemInstruction: systemPrompt
      });

      // Convertir mensajes al formato de Gemini
      const geminiMessages = this.convertMessagesToGeminiFormat(messages);

      // Crear chat con historial
      const chat = model.startChat({
        history: geminiMessages.slice(0, -1), // Todos menos el último
        tools: geminiTools.length > 0 ? geminiTools : undefined
      });

      // Enviar último mensaje
      const lastMessage = geminiMessages[geminiMessages.length - 1];
      const result = await chat.sendMessage(lastMessage.parts);
      const response = await result.response;

      // Verificar si hay function calls
      const functionCalls = response.functionCalls();

      if (functionCalls && functionCalls.length > 0) {
        // LLM quiere ejecutar herramientas
        const toolCalls = functionCalls.map((fc, index) => ({
          id: `call_${Date.now()}_${index}`,
          name: fc.name,
          arguments: fc.args || {}
        }));

        return {
          toolCalls,
          text: response.text() || '',
          finishReason: 'tool_calls'
        };
      }

      // LLM respondió con texto (terminó)
      return {
        text: response.text(),
        toolCalls: null,
        finishReason: 'stop'
      };

    } catch (error) {
      console.error(`❌ Error en Gemini chatWithTools: ${error.message}`);

      // Manejo de errores específicos
      if (error.message.includes('quota')) {
        throw new Error('Cuota de Gemini excedida. Intenta más tarde o usa otro LLM (npm run switch-llm ollama)');
      }

      if (error.message.includes('API_KEY')) {
        throw new Error('API Key de Gemini inválida o expirada');
      }

      throw error;
    }
  }

  /**
   * Convierte herramientas MCP al formato de Gemini function calling
   */
  convertToolsToGeminiFormat(tools) {
    if (!tools || tools.length === 0) return [];

    return [{
      functionDeclarations: tools.map(tool => ({
        name: tool.name,
        description: tool.description || 'No description available',
        parameters: this.cleanSchemaForGemini(tool.parameters || { type: 'object', properties: {} })
      }))
    }];
  }

  /**
   * Limpia el esquema JSON Schema para que sea compatible con Gemini
   * Gemini no acepta: $schema, additionalProperties, exclusiveMinimum, etc.
   */
  cleanSchemaForGemini(schema) {
    if (typeof schema !== 'object' || schema === null) {
      return schema;
    }

    // Si es un array, limpiar cada elemento
    if (Array.isArray(schema)) {
      return schema.map(item => this.cleanSchemaForGemini(item));
    }

    // Clonar el objeto y remover campos no soportados
    const cleaned = {};
    const unsupportedFields = ['$schema', 'additionalProperties', 'exclusiveMinimum', 'exclusiveMaximum'];

    for (const [key, value] of Object.entries(schema)) {
      // Saltar campos no soportados
      if (unsupportedFields.includes(key)) {
        continue;
      }

      // Limpiar recursivamente objetos anidados
      if (typeof value === 'object' && value !== null) {
        cleaned[key] = this.cleanSchemaForGemini(value);
      } else {
        cleaned[key] = value;
      }
    }

    return cleaned;
  }

  /**
   * Convierte mensajes al formato de Gemini
   */
  convertMessagesToGeminiFormat(messages) {
    const geminiMessages = [];

    for (const msg of messages) {
      if (msg.role === 'user') {
        geminiMessages.push({
          role: 'user',
          parts: [{ text: msg.content }]
        });
      } else if (msg.role === 'assistant') {
        // Si tiene tool calls, convertir
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          const parts = [];

          // Texto si existe
          if (msg.content) {
            parts.push({ text: msg.content });
          }

          // Function calls
          for (const tc of msg.toolCalls) {
            parts.push({
              functionCall: {
                name: tc.name,
                args: tc.arguments
              }
            });
          }

          geminiMessages.push({
            role: 'model',
            parts
          });
        } else {
          // Solo texto
          geminiMessages.push({
            role: 'model',
            parts: [{ text: msg.content || '' }]
          });
        }
      } else if (msg.role === 'tool') {
        // Respuesta de herramienta
        geminiMessages.push({
          role: 'function',
          parts: [{
            functionResponse: {
              name: msg.name,
              response: {
                content: msg.content
              }
            }
          }]
        });
      }
    }

    return geminiMessages;
  }

  async cleanup() {
    // Gemini SDK no necesita limpieza específica
    console.log('✓ Gemini adapter limpiado');
  }
}

module.exports = GeminiAdapter;
