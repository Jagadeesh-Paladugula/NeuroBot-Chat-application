import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
  'JWT_SECRET',
  'MONGO_URI',
];

const optionalEnvVars = {
  PORT: 5000,
  NODE_ENV: 'development',
  CLIENT_URL: 'http://localhost:5173',
  GEMINI_API_KEY: null,
  GOOGLE_CLIENT_ID: null,
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 200,
  REQUEST_BODY_LIMIT: '1mb',
  GEMINI_MODEL: null,
  GEMINI_MAX_CONCURRENT_REQUESTS: 3,
  GEMINI_RATE_LIMIT_PER_MINUTE: 20,
  GEMINI_TEMPERATURE: 0.7,
  GEMINI_MAX_OUTPUT_TOKENS: 500,
};

// Validate required environment variables
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingVars.join(', ')}`
  );
}

// Build config object with defaults
const config = {
  // Server
  port: parseInt(process.env.PORT || '', 10) || optionalEnvVars.PORT,
  nodeEnv: process.env.NODE_ENV || optionalEnvVars.NODE_ENV,
  clientUrl: process.env.CLIENT_URL || optionalEnvVars.CLIENT_URL,

  // Database
  mongoUri: process.env.MONGO_URI!,

  // JWT
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '', 10) || optionalEnvVars.RATE_LIMIT_WINDOW_MS,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '', 10) || optionalEnvVars.RATE_LIMIT_MAX_REQUESTS,
  },

  // Request Limits
  requestBodyLimit: process.env.REQUEST_BODY_LIMIT || optionalEnvVars.REQUEST_BODY_LIMIT,

  // Gemini AI
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || optionalEnvVars.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || optionalEnvVars.GEMINI_MODEL,
    maxConcurrent: parseInt(process.env.GEMINI_MAX_CONCURRENT_REQUESTS || '', 10) || optionalEnvVars.GEMINI_MAX_CONCURRENT_REQUESTS,
    rateLimitPerMinute: parseInt(process.env.GEMINI_RATE_LIMIT_PER_MINUTE || '', 10) || optionalEnvVars.GEMINI_RATE_LIMIT_PER_MINUTE,
    temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '') || optionalEnvVars.GEMINI_TEMPERATURE,
    maxOutputTokens: parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS || '', 10) || optionalEnvVars.GEMINI_MAX_OUTPUT_TOKENS,
  },

  // Google OAuth
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || optionalEnvVars.GOOGLE_CLIENT_ID,
  },

  // Feature Flags
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
} as const;

export default config;

