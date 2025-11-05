// runners/actions/api-actions.js
const { APIClient } = require('../core/api-client.js');

/**
 * API Actions para testing de APIs REST/GraphQL
 * Soporta validaciones, chaining, authentication y más
 */
class APIActions {
  constructor() {
    this.client = null;
    this.lastResponse = null;
  }

  /**
   * Ejecutar acción API
   */
  async execute(action, params, options = {}) {
    const { apiClient, config } = options;

    // Inicializar cliente si no existe
    if (!this.client && apiClient) {
      this.client = apiClient;
    }

    // Estructura de resultado consistente con browser-actions
    const result = {
      action,
      params,
      success: false,
      error: null,
      output: null
    };

    try {
      // Mapear action a método
      const actionMap = {
        // Requests
        'api.request': 'request',
        'api.get': 'get',
        'api.post': 'post',
        'api.put': 'put',
        'api.patch': 'patch',
        'api.delete': 'delete',
        'api.head': 'head',
        'api.options': 'options',

        // Validations
        'api.validateStatus': 'validateStatus',
        'api.validateResponse': 'validateResponse',
        'api.validateSchema': 'validateSchema',
        'api.validateHeaders': 'validateHeaders',
        'api.validateResponseTime': 'validateResponseTime',
        'api.validateBody': 'validateBody',

        // Variables & Chaining
        'api.setVariable': 'setVariable',
        'api.getVariable': 'getVariable',
        'api.extractValue': 'extractValue',

        // Authentication
        'api.setAuth': 'setAuth',
        'api.clearAuth': 'clearAuth',

        // Configuration
        'api.setBaseURL': 'setBaseURL',
        'api.setTimeout': 'setTimeout',

        // Utilities
        'api.wait': 'wait',
        'api.log': 'log'
      };

      const methodName = actionMap[action];

      if (!methodName) {
        throw new Error(`❌ Acción API desconocida: ${action}`);
      }

      // Ejecutar método y capturar resultado
      const methodResult = await this[methodName](params, config);

      result.success = true;
      result.output = methodResult;

    } catch (error) {
      result.success = false;
      result.error = error.message;
      throw error; // Re-lanzar para que test-executor lo capture
    }

    return result;
  }

  /**
   * Generic HTTP request
   */
  async request(params, config) {
    const { method, url, headers, body, params: queryParams } = params;

    console.log(`\n🌐 API Request: ${method.toUpperCase()} ${url}`);

    const response = await this.client.request(method.toLowerCase(), url, {
      headers,
      data: body,
      params: queryParams
    });

    this.lastResponse = response;
    return response;
  }

  /**
   * GET request
   */
  async get(params, config) {
    const { url, headers, params: queryParams } = params;

    console.log(`\n🌐 GET ${url}`);

    const response = await this.client.get(url, {
      headers,
      params: queryParams
    });

    this.lastResponse = response;
    return response;
  }

  /**
   * POST request
   */
  async post(params, config) {
    const { url, headers, body } = params;

    console.log(`\n🌐 POST ${url}`);
    if (body) {
      console.log(`📦 Body:`, JSON.stringify(body, null, 2).substring(0, 200));
    }

    const response = await this.client.post(url, body, { headers });

    this.lastResponse = response;
    return response;
  }

  /**
   * PUT request
   */
  async put(params, config) {
    const { url, headers, body } = params;

    console.log(`\n🌐 PUT ${url}`);

    const response = await this.client.put(url, body, { headers });

    this.lastResponse = response;
    return response;
  }

  /**
   * PATCH request
   */
  async patch(params, config) {
    const { url, headers, body } = params;

    console.log(`\n🌐 PATCH ${url}`);

    const response = await this.client.patch(url, body, { headers });

    this.lastResponse = response;
    return response;
  }

  /**
   * DELETE request
   */
  async delete(params, config) {
    const { url, headers } = params;

    console.log(`\n🌐 DELETE ${url}`);

    const response = await this.client.delete(url, { headers });

    this.lastResponse = response;
    return response;
  }

  /**
   * HEAD request
   */
  async head(params, config) {
    const { url, headers } = params;

    console.log(`\n🌐 HEAD ${url}`);

    const response = await this.client.head(url, { headers });

    this.lastResponse = response;
    return response;
  }

  /**
   * OPTIONS request
   */
  async options(params, config) {
    const { url, headers } = params;

    console.log(`\n🌐 OPTIONS ${url}`);

    const response = await this.client.options(url, { headers });

    this.lastResponse = response;
    return response;
  }

  /**
   * Validate status code
   */
  async validateStatus(params, config) {
    const { expected, statusCode } = params;
    const expectedStatus = expected || statusCode;

    if (!this.lastResponse) {
      throw new Error('❌ No hay respuesta para validar. Ejecuta un request primero.');
    }

    const actualStatus = this.lastResponse.status;

    console.log(`\n✓ Validando status code...`);
    console.log(`  Esperado: ${expectedStatus}`);
    console.log(`  Actual: ${actualStatus}`);

    if (actualStatus !== expectedStatus) {
      throw new Error(
        `❌ Status code inválido. Esperado: ${expectedStatus}, Actual: ${actualStatus}`
      );
    }

    console.log(`✅ Status code válido: ${actualStatus}`);
    return true;
  }

  /**
   * Validate response body
   */
  async validateResponse(params, config) {
    if (!this.lastResponse) {
      throw new Error('❌ No hay respuesta para validar');
    }

    const { contains, equals, notContains, isEmpty, isArray, isObject } = params;

    console.log(`\n✓ Validando respuesta...`);

    const data = this.lastResponse.data;

    // Check if is array
    if (isArray !== undefined) {
      const actual = Array.isArray(data);
      if (actual !== isArray) {
        throw new Error(`❌ Esperaba array=${isArray}, pero es array=${actual}`);
      }
      console.log(`✅ Es array: ${actual}`);
    }

    // Check if is object
    if (isObject !== undefined) {
      const actual = typeof data === 'object' && !Array.isArray(data);
      if (actual !== isObject) {
        throw new Error(`❌ Esperaba object=${isObject}, pero es object=${actual}`);
      }
      console.log(`✅ Es object: ${actual}`);
    }

    // Check contains properties
    if (contains) {
      const properties = Array.isArray(contains) ? contains : [contains];

      for (const prop of properties) {
        if (Array.isArray(data)) {
          // Check if all items have property
          const allHave = data.every(item => prop in item);
          if (!allHave) {
            throw new Error(`❌ No todos los elementos tienen la propiedad: ${prop}`);
          }
          console.log(`✅ Todos los elementos contienen: ${prop}`);
        } else {
          if (!(prop in data)) {
            throw new Error(`❌ Falta propiedad: ${prop}`);
          }
          console.log(`✅ Contiene propiedad: ${prop}`);
        }
      }
    }

    // Check not contains
    if (notContains) {
      const properties = Array.isArray(notContains) ? notContains : [notContains];

      for (const prop of properties) {
        if (prop in data) {
          throw new Error(`❌ No debería contener propiedad: ${prop}`);
        }
        console.log(`✅ No contiene: ${prop}`);
      }
    }

    // Check equals
    if (equals !== undefined) {
      const actual = JSON.stringify(data);
      const expected = JSON.stringify(equals);

      if (actual !== expected) {
        throw new Error(`❌ Respuesta no coincide.\nEsperado: ${expected}\nActual: ${actual}`);
      }
      console.log(`✅ Respuesta coincide exactamente`);
    }

    // Check is empty
    if (isEmpty !== undefined) {
      const actual = Object.keys(data).length === 0 || (Array.isArray(data) && data.length === 0);
      if (actual !== isEmpty) {
        throw new Error(`❌ Esperaba isEmpty=${isEmpty}, pero es isEmpty=${actual}`);
      }
      console.log(`✅ isEmpty: ${actual}`);
    }

    return true;
  }

  /**
   * Validate JSON Schema
   */
  async validateSchema(params, config) {
    if (!this.lastResponse) {
      throw new Error('❌ No hay respuesta para validar');
    }

    const { schema } = params;

    console.log(`\n✓ Validando schema...`);

    // Simple schema validation (can be extended with Ajv)
    const data = this.lastResponse.data;

    try {
      this.validateObjectSchema(data, schema);
      console.log(`✅ Schema válido`);
      return true;
    } catch (error) {
      throw new Error(`❌ Schema inválido: ${error.message}`);
    }
  }

  /**
   * Recursive schema validation helper
   */
  validateObjectSchema(data, schema) {
    if (schema.type) {
      const actualType = Array.isArray(data) ? 'array' : typeof data;

      if (schema.type !== actualType) {
        throw new Error(`Tipo incorrecto. Esperado: ${schema.type}, Actual: ${actualType}`);
      }
    }

    if (schema.properties) {
      Object.keys(schema.properties).forEach(key => {
        if (schema.required && schema.required.includes(key) && !(key in data)) {
          throw new Error(`Propiedad requerida faltante: ${key}`);
        }

        if (key in data) {
          this.validateObjectSchema(data[key], schema.properties[key]);
        }
      });
    }

    if (schema.items && Array.isArray(data)) {
      data.forEach((item, index) => {
        try {
          this.validateObjectSchema(item, schema.items);
        } catch (error) {
          throw new Error(`Item ${index}: ${error.message}`);
        }
      });
    }
  }

  /**
   * Validate response headers
   */
  async validateHeaders(params, config) {
    if (!this.lastResponse) {
      throw new Error('❌ No hay respuesta para validar');
    }

    const { headers: expectedHeaders } = params;

    console.log(`\n✓ Validando headers...`);

    const actualHeaders = this.lastResponse.headers;

    Object.keys(expectedHeaders).forEach(key => {
      const expected = expectedHeaders[key];
      const actual = actualHeaders[key.toLowerCase()];

      if (actual !== expected) {
        throw new Error(
          `❌ Header inválido: ${key}\nEsperado: ${expected}\nActual: ${actual}`
        );
      }

      console.log(`✅ Header ${key}: ${actual}`);
    });

    return true;
  }

  /**
   * Validate response time
   */
  async validateResponseTime(params, config) {
    if (!this.lastResponse) {
      throw new Error('❌ No hay respuesta para validar');
    }

    const { maxMs, lessThan } = params;
    const max = maxMs || lessThan;

    const actual = this.lastResponse.config.metadata.duration;

    console.log(`\n✓ Validando tiempo de respuesta...`);
    console.log(`  Máximo: ${max}ms`);
    console.log(`  Actual: ${actual}ms`);

    if (actual > max) {
      throw new Error(
        `❌ Respuesta muy lenta. Máximo: ${max}ms, Actual: ${actual}ms`
      );
    }

    console.log(`✅ Tiempo de respuesta OK: ${actual}ms`);
    return true;
  }

  /**
   * Validate response body with assertions
   */
  async validateBody(params, config) {
    if (!this.lastResponse) {
      throw new Error('❌ No hay respuesta para validar');
    }

    const { path, equals, contains, notEquals, greaterThan, lessThan } = params;

    console.log(`\n✓ Validando body...`);

    let value = this.lastResponse.data;

    // Extract value using JSON path
    if (path) {
      value = this.extractValueByPath(value, path);
      console.log(`  Valor en "${path}": ${JSON.stringify(value)}`);
    }

    // Equals
    if (equals !== undefined) {
      if (JSON.stringify(value) !== JSON.stringify(equals)) {
        throw new Error(
          `❌ Valor no coincide.\nEsperado: ${JSON.stringify(equals)}\nActual: ${JSON.stringify(value)}`
        );
      }
      console.log(`✅ Valor coincide: ${JSON.stringify(equals)}`);
    }

    // Not equals
    if (notEquals !== undefined) {
      if (JSON.stringify(value) === JSON.stringify(notEquals)) {
        throw new Error(`❌ Valor no debería ser: ${JSON.stringify(notEquals)}`);
      }
      console.log(`✅ Valor diferente de: ${JSON.stringify(notEquals)}`);
    }

    // Contains
    if (contains !== undefined) {
      const str = JSON.stringify(value);
      if (!str.includes(contains)) {
        throw new Error(`❌ No contiene: "${contains}"`);
      }
      console.log(`✅ Contiene: "${contains}"`);
    }

    // Greater than
    if (greaterThan !== undefined) {
      if (value <= greaterThan) {
        throw new Error(`❌ ${value} no es mayor que ${greaterThan}`);
      }
      console.log(`✅ ${value} > ${greaterThan}`);
    }

    // Less than
    if (lessThan !== undefined) {
      if (value >= lessThan) {
        throw new Error(`❌ ${value} no es menor que ${lessThan}`);
      }
      console.log(`✅ ${value} < ${lessThan}`);
    }

    return true;
  }

  /**
   * Extract value from JSON path
   */
  extractValueByPath(obj, path) {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      // Handle array index: items[0]
      const arrayMatch = part.match(/(\w+)\[(\d+)\]/);

      if (arrayMatch) {
        const [, prop, index] = arrayMatch;
        current = current[prop][parseInt(index)];
      } else {
        current = current[part];
      }

      if (current === undefined) {
        throw new Error(`❌ Path no encontrado: ${path}`);
      }
    }

    return current;
  }

  /**
   * Set variable for chaining
   */
  async setVariable(params, config) {
    const { name, value, from } = params;

    let finalValue = value;

    // Extract from last response
    if (from && this.lastResponse) {
      finalValue = this.extractValueByPath(this.lastResponse.data, from);
    }

    this.client.setVariable(name, finalValue);

    console.log(`\n📝 Variable guardada: ${name} = ${finalValue}`);

    return finalValue;
  }

  /**
   * Get variable
   */
  async getVariable(params, config) {
    const { name } = params;
    const value = this.client.getVariable(name);

    console.log(`\n📖 Variable obtenida: ${name} = ${value}`);

    return value;
  }

  /**
   * Extract value from response
   */
  async extractValue(params, config) {
    const { path, saveTo } = params;

    if (!this.lastResponse) {
      throw new Error('❌ No hay respuesta para extraer valor');
    }

    const value = this.extractValueByPath(this.lastResponse.data, path);

    console.log(`\n📤 Valor extraído de "${path}": ${value}`);

    if (saveTo) {
      this.client.setVariable(saveTo, value);
      console.log(`📝 Guardado en variable: ${saveTo}`);
    }

    return value;
  }

  /**
   * Set authentication
   */
  async setAuth(params, config) {
    const { type, token, username, password, key, value, in: location, accessToken } = params;

    console.log(`\n🔐 Configurando autenticación: ${type}`);

    const auth = { type, token, username, password, key, value, in: location, accessToken };

    this.client.setAuth(auth);

    return true;
  }

  /**
   * Clear authentication
   */
  async clearAuth(params, config) {
    console.log(`\n🔓 Limpiando autenticación`);
    this.client.clearAuth();
    return true;
  }

  /**
   * Set base URL
   */
  async setBaseURL(params, config) {
    const { url, baseURL } = params;
    const finalURL = url || baseURL;

    console.log(`\n🌐 Base URL: ${finalURL}`);
    this.client.setBaseURL(finalURL);

    return true;
  }

  /**
   * Set timeout
   */
  async setTimeout(params, config) {
    const { ms, timeout } = params;
    const finalTimeout = ms || timeout;

    console.log(`\n⏱️  Timeout: ${finalTimeout}ms`);
    this.client.setTimeout(finalTimeout);

    return true;
  }

  /**
   * Wait/sleep
   */
  async wait(params, config) {
    const { ms, time } = params;
    const duration = ms || time;

    console.log(`\n⏸️  Esperando ${duration}ms...`);

    await new Promise(resolve => setTimeout(resolve, duration));

    return true;
  }

  /**
   * Log message
   */
  async log(params, config) {
    const { message, value } = params;

    if (value !== undefined) {
      console.log(`\n📋 ${message || 'Log'}:`, value);
    } else {
      console.log(`\n📋 ${message}`);
    }

    return true;
  }

  /**
   * Get last response for debugging
   */
  getLastResponse() {
    return this.lastResponse;
  }
}

module.exports = { APIActions };
