// runners/core/api-client.js
const axios = require('axios');

/**
 * Cliente HTTP para API Testing
 * Soporta autenticación, retry logic, rate limiting, y más
 */
class APIClient {
  constructor(config = {}) {
    this.config = {
      baseURL: config.baseURL || '',
      timeout: config.timeout || 30000,
      validateStatus: () => true, // No lanzar error en 4xx/5xx
      maxRedirects: config.maxRedirects || 5,
      ...config
    };

    // Variables globales para chaining
    this.variables = new Map();

    // Rate limiting
    this.rateLimiter = {
      enabled: config.rateLimit?.enabled || false,
      requestsPerSecond: config.rateLimit?.requestsPerSecond || 10,
      queue: [],
      processing: false
    };

    // Retry configuration
    this.retryConfig = {
      enabled: config.retry?.enabled || false,
      maxRetries: config.retry?.maxRetries || 3,
      retryDelay: config.retry?.retryDelay || 1000,
      retryOn: config.retry?.retryOn || [500, 502, 503, 504]
    };

    // Authentication
    this.auth = config.auth || null;

    // Create axios instance
    this.client = axios.create(this.config);

    // Setup interceptors
    this.setupInterceptors();

    // Request/Response history
    this.history = [];
  }

  /**
   * Setup interceptors for logging and authentication
   */
  setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add authentication
        if (this.auth) {
          config = this.addAuthentication(config, this.auth);
        }

        // Log request
        console.log(`🌐 ${config.method.toUpperCase()} ${config.url}`);

        // Replace variables in URL and body
        config = this.replaceVariables(config);

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Log response
        const duration = response.config.metadata?.duration || 0;
        console.log(`✅ ${response.status} ${response.statusText} (${duration}ms)`);

        // Save to history
        this.addToHistory(response);

        return response;
      },
      (error) => {
        if (error.response) {
          console.log(`❌ ${error.response.status} ${error.response.statusText}`);
          this.addToHistory(error.response);
        } else {
          console.log(`❌ Network Error: ${error.message}`);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Add authentication to request
   */
  addAuthentication(config, auth) {
    switch (auth.type) {
      case 'bearer':
        config.headers = config.headers || {};
        config.headers['Authorization'] = `Bearer ${auth.token}`;
        break;

      case 'basic':
        config.auth = {
          username: auth.username,
          password: auth.password
        };
        break;

      case 'apikey':
        config.headers = config.headers || {};
        if (auth.in === 'header') {
          config.headers[auth.key] = auth.value;
        } else if (auth.in === 'query') {
          config.params = config.params || {};
          config.params[auth.key] = auth.value;
        }
        break;

      case 'oauth2':
        config.headers = config.headers || {};
        config.headers['Authorization'] = `Bearer ${auth.accessToken}`;
        break;
    }

    return config;
  }

  /**
   * Replace variables in config
   */
  replaceVariables(config) {
    // Replace in URL
    if (config.url) {
      config.url = this.replaceVariablesInString(config.url);
    }

    // Replace in body
    if (config.data && typeof config.data === 'object') {
      config.data = JSON.parse(
        this.replaceVariablesInString(JSON.stringify(config.data))
      );
    }

    // Replace in headers
    if (config.headers) {
      Object.keys(config.headers).forEach(key => {
        if (typeof config.headers[key] === 'string') {
          config.headers[key] = this.replaceVariablesInString(config.headers[key]);
        }
      });
    }

    return config;
  }

  /**
   * Replace {{variable}} patterns in string
   */
  replaceVariablesInString(str) {
    return str.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return this.variables.get(varName) || match;
    });
  }

  /**
   * Set variable for chaining
   */
  setVariable(name, value) {
    this.variables.set(name, value);
    console.log(`📝 Variable set: ${name} = ${value}`);
  }

  /**
   * Get variable
   */
  getVariable(name) {
    return this.variables.get(name);
  }

  /**
   * Make HTTP request with retry logic
   */
  async request(method, url, options = {}) {
    const startTime = Date.now();

    // Apply rate limiting
    if (this.rateLimiter.enabled) {
      await this.applyRateLimit();
    }

    const config = {
      method,
      url,
      ...options,
      metadata: { startTime }
    };

    let lastError;
    const maxAttempts = this.retryConfig.enabled ? this.retryConfig.maxRetries + 1 : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.client.request(config);

        // Calculate duration
        response.config.metadata.duration = Date.now() - startTime;

        // Check if should retry
        if (
          this.retryConfig.enabled &&
          this.retryConfig.retryOn.includes(response.status) &&
          attempt < maxAttempts
        ) {
          console.log(`⚠️  Retrying... (attempt ${attempt}/${maxAttempts})`);
          await this.sleep(this.retryConfig.retryDelay * attempt);
          continue;
        }

        return response;
      } catch (error) {
        lastError = error;

        if (attempt < maxAttempts && this.retryConfig.enabled) {
          console.log(`⚠️  Retrying... (attempt ${attempt}/${maxAttempts})`);
          await this.sleep(this.retryConfig.retryDelay * attempt);
        } else {
          throw error;
        }
      }
    }

    throw lastError;
  }

  /**
   * Apply rate limiting
   */
  async applyRateLimit() {
    const delay = 1000 / this.rateLimiter.requestsPerSecond;

    return new Promise(resolve => {
      this.rateLimiter.queue.push(resolve);

      if (!this.rateLimiter.processing) {
        this.processRateLimitQueue(delay);
      }
    });
  }

  /**
   * Process rate limit queue
   */
  async processRateLimitQueue(delay) {
    this.rateLimiter.processing = true;

    while (this.rateLimiter.queue.length > 0) {
      const resolve = this.rateLimiter.queue.shift();
      resolve();

      if (this.rateLimiter.queue.length > 0) {
        await this.sleep(delay);
      }
    }

    this.rateLimiter.processing = false;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Add response to history
   */
  addToHistory(response) {
    this.history.push({
      timestamp: new Date().toISOString(),
      method: response.config.method.toUpperCase(),
      url: response.config.url,
      status: response.status,
      statusText: response.statusText,
      duration: response.config.metadata?.duration || 0,
      requestHeaders: response.config.headers,
      responseHeaders: response.headers,
      requestBody: response.config.data,
      responseBody: response.data
    });

    // Keep only last 50 requests
    if (this.history.length > 50) {
      this.history.shift();
    }
  }

  /**
   * GET request
   */
  async get(url, options = {}) {
    return this.request('GET', url, options);
  }

  /**
   * POST request
   */
  async post(url, data, options = {}) {
    return this.request('POST', url, { ...options, data });
  }

  /**
   * PUT request
   */
  async put(url, data, options = {}) {
    return this.request('PUT', url, { ...options, data });
  }

  /**
   * PATCH request
   */
  async patch(url, data, options = {}) {
    return this.request('PATCH', url, { ...options, data });
  }

  /**
   * DELETE request
   */
  async delete(url, options = {}) {
    return this.request('DELETE', url, options);
  }

  /**
   * HEAD request
   */
  async head(url, options = {}) {
    return this.request('HEAD', url, options);
  }

  /**
   * OPTIONS request
   */
  async options(url, options = {}) {
    return this.request('OPTIONS', url, options);
  }

  /**
   * Get request history
   */
  getHistory() {
    return this.history;
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * Get last response
   */
  getLastResponse() {
    return this.history[this.history.length - 1];
  }

  /**
   * Set base URL
   */
  setBaseURL(baseURL) {
    this.config.baseURL = baseURL;
    this.client.defaults.baseURL = baseURL;
  }

  /**
   * Set authentication
   */
  setAuth(auth) {
    this.auth = auth;
  }

  /**
   * Clear authentication
   */
  clearAuth() {
    this.auth = null;
  }

  /**
   * Set timeout
   */
  setTimeout(timeout) {
    this.config.timeout = timeout;
    this.client.defaults.timeout = timeout;
  }
}

module.exports = { APIClient };
