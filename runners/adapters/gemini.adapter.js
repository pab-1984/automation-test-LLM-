// runners/adapters/gemini.adapter.js
// Adapter para conectar con Gemini CLI/API

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class GeminiAdapter {
  constructor(config) {
    this.config = config;
    this.model = config.model || 'gemini-2.0-flash-exp';
    this.useAuth = config.useAuth !== false;
  }

  async initialize() {
    // Verificar que Gemini CLI esté instalado
    try {
      const { stdout } = await execAsync('gemini --version');
      console.log(`✓ Gemini CLI v${stdout.trim()}`);
    } catch (error) {
      throw new Error('Gemini CLI no está instalado. Instala con: npm install -g @google/genai-cli');
    }

    // Verificar autenticación
    if (this.useAuth) {
      try {
        await execAsync('gemini auth status');
        console.log('✓ Autenticado con Gemini');
      } catch (error) {
        throw new Error('No estás autenticado. Ejecuta: gemini auth login');
      }
    }
  }

  async processStep(prompt, context) {
    try {
      // Construir comando de Gemini
      const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/\n/g, ' ');
      const cmd = `gemini --model ${this.model} --yolo "${escapedPrompt}"`;

      const { stdout, stderr } = await execAsync(cmd, {
        timeout: 60000, // 60 segundos timeout
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });

      if (stderr && stderr.includes('Quota exceeded')) {
        throw new Error('Cuota de Gemini excedida');
      }

      // Intentar extraer JSON de la respuesta
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      console.log('⚠️  Respuesta no JSON de Gemini, usando fallback');
      return this.fallbackResponse(context.step);

    } catch (error) {
      if (error.message.includes('Quota exceeded')) {
        console.error('❌ Cuota de Gemini excedida. Cambia a otro LLM con: npm run switch-llm ollama');
      }
      console.error('Error en Gemini:', error.message);
      return this.fallbackResponse(context.step);
    }
  }

  fallbackResponse(step) {
    return {
      action: step.action,
      params: step,
      reasoning: 'Fallback - ejecutando acción directa del YAML'
    };
  }

  async cleanup() {
    // Gemini CLI no necesita limpieza específica
  }
}

module.exports = GeminiAdapter;