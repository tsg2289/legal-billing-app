import dotenv from 'dotenv';

dotenv.config();

const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || 'development',
    cors: {
      origin: process.env.NODE_ENV === 'development' 
        ? 'http://localhost:5173' 
        : true,
      credentials: true
    }
  },

  // AI service configuration
  ai: {
    service: 'OpenAI',
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 500,
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
    timeout: parseInt(process.env.OPENAI_TIMEOUT) || 30000
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.NODE_ENV === 'development' ? 'dev' : 'combined',
    file: process.env.LOG_FILE || null
  },

  // Security configuration
  security: {
    maxRequestSize: '10mb',
    trustProxy: process.env.NODE_ENV === 'production'
  }
};

/**
 * Validate the configuration
 */
export function validateConfig() {
  const errors = [];
  
  // Check required environment variables
  if (!config.ai.apiKey) {
    errors.push('OPENAI_API_KEY is required');
  }
  
  // Validate port
  if (isNaN(config.server.port) || config.server.port < 1 || config.server.port > 65535) {
    errors.push('PORT must be a valid port number (1-65535)');
  }
  
  // Validate AI configuration
  if (!config.ai.model) {
    errors.push('OPENAI_MODEL is required');
  }
  
  if (isNaN(config.ai.maxTokens) || config.ai.maxTokens < 1) {
    errors.push('OPENAI_MAX_TOKENS must be a positive number');
  }
  
  if (isNaN(config.ai.temperature) || config.ai.temperature < 0 || config.ai.temperature > 2) {
    errors.push('OPENAI_TEMPERATURE must be between 0 and 2');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get configuration for a specific section
 */
export function getConfig(section) {
  return config[section] || null;
}

/**
 * Get the full configuration object
 */
export function getAllConfig() {
  return config;
}

export default config; 