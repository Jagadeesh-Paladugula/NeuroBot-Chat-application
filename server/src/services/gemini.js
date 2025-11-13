import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const STATIC_DEFAULT_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro',
  'gemini-1.0-pro',
];

let geminiClient = null;
const modelCache = new Map();
let discoveredModelsPromise = null;

const SYSTEM_INSTRUCTION = {
  role: 'system',
  parts: [
    {
      text: 'You are a helpful AI assistant in a chat application. Be concise, friendly, and helpful.',
    },
  ],
};

const normalizeModelName = (name) =>
  name ? name.replace(/^models\//, '').trim() : '';

const dedupe = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    if (!item) return false;
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getGeminiClient = () => {
  const apiKey = config.gemini.apiKey;
  if (!apiKey) {
    return null;
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(apiKey);
  }

  return geminiClient;
};

const discoverAvailableModels = async () => {
  if (discoveredModelsPromise) {
    return discoveredModelsPromise;
  }

  const client = getGeminiClient();
  if (!client) {
    discoveredModelsPromise = Promise.resolve([]);
    return discoveredModelsPromise;
  }

  const endpoints = [
    'https://generativelanguage.googleapis.com/v1/models',
    'https://generativelanguage.googleapis.com/v1beta/models',
  ];

  discoveredModelsPromise = (async () => {
    const apiKey = config.gemini.apiKey;
    const discovered = [];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${endpoint}?key=${apiKey}`);
        if (!response.ok) {
          continue;
        }

        const data = await response.json();
        const models = data?.models ?? [];

        models.forEach((model) => {
          const supportsContent = model?.supportedGenerationMethods?.includes(
            'generateContent'
          );

          if (supportsContent) {
            discovered.push(normalizeModelName(model.name));
          }
        });

        if (discovered.length > 0) {
          break;
        }
      } catch (error) {
        logger.warn(
          `Failed to discover models from ${endpoint}:`,
          error.message || error
        );
      }
    }

    return dedupe(discovered);
  })();

  return discoveredModelsPromise;
};

const getPreferredModels = async () => {
  const configured = normalizeModelName(config.gemini.model);

  const discovered = await discoverAvailableModels();

  const candidates = dedupe([
    configured,
    ...discovered,
    ...STATIC_DEFAULT_MODELS,
  ]);

  return candidates;
};

const getGeminiModel = (modelName) => {
  const client = getGeminiClient();
  if (!client) {
    return null;
  }

  const normalized = normalizeModelName(modelName);
  if (!normalized) {
    return null;
  }

  if (!modelCache.has(normalized)) {
    const model = client.getGenerativeModel({
      model: normalized,
      systemInstruction: SYSTEM_INSTRUCTION,
    });
    modelCache.set(normalized, model);
  }

  return modelCache.get(normalized);
};

const requestQueue = [];
let activeRequests = 0;
const MAX_CONCURRENT = config.gemini.maxConcurrent;
const RATE_LIMIT_PER_MINUTE = config.gemini.rateLimitPerMinute;
const requestTimestamps = [];

const cleanOldTimestamps = () => {
  const oneMinuteAgo = Date.now() - 60000;
  while (requestTimestamps.length > 0 && requestTimestamps[0] < oneMinuteAgo) {
    requestTimestamps.shift();
  }
};

const checkRateLimit = () => {
  cleanOldTimestamps();
  return requestTimestamps.length < RATE_LIMIT_PER_MINUTE;
};

const processQueue = async () => {
  if (activeRequests >= MAX_CONCURRENT || requestQueue.length === 0) {
    return;
  }

  if (!checkRateLimit()) {
    setTimeout(processQueue, 1000);
    return;
  }

  const { conversationId, prompt, contextMessages, resolve, reject } =
    requestQueue.shift();
  activeRequests++;
  requestTimestamps.push(Date.now());

  const finalize = () => {
    activeRequests--;
    setTimeout(processQueue, 100);
  };

  let modelCandidates;
  try {
    modelCandidates = await getPreferredModels();
  } catch (error) {
    logger.warn(
      'Failed to discover Gemini models. Falling back to static defaults.',
      error
    );
    modelCandidates = STATIC_DEFAULT_MODELS;
  }

  if (modelCandidates.length === 0) {
    reject(
      new Error(
        'Gemini API key is not configured. Please set GEMINI_API_KEY in your environment variables.'
      )
    );
    finalize();
    return;
  }

  const limitedContext = contextMessages
    .slice(-10)
    .map((msg) => ({
      role:
        msg.senderId?.isDemo && msg.senderId?.email === 'assistant@demo.com'
          ? 'assistant'
          : 'user',
      content: msg.text,
    }))
    .filter((msg) => msg.content && msg.content.trim().length > 0);

  const contextContents = limitedContext.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const generationConfig = {
    maxOutputTokens: config.gemini.maxOutputTokens,
    temperature: config.gemini.temperature,
  };

  let lastError = null;

  for (const modelName of modelCandidates) {
    try {
      const model = getGeminiModel(modelName);
      if (!model) {
        continue;
      }

      const result = await model.generateContent({
        contents: [
          ...contextContents,
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig,
      });

      const aiReply = result.response?.text()?.trim();
      resolve(
        aiReply && aiReply.length > 0
          ? aiReply
          : 'Sorry, I could not generate a response.'
      );
      finalize();
      return;
    } catch (error) {
      lastError = error;

      const status =
        error.status ||
        error.code ||
        error?.response?.status ||
        error?.error?.status;

      const notFound =
        status === 404 ||
        error.message?.includes('not found') ||
        error.message?.includes('Call ListModels');

      if (notFound) {
        logger.warn(
          `Gemini model ${modelName} not available. Trying next available model.`
        );
        modelCache.delete(normalizeModelName(modelName));
        continue;
      }

      logger.error('Gemini API error:', error);

      let errorMessage =
        'Sorry, I encountered an error processing your request.';

      if (status === 429) {
        errorMessage =
          'AI assistant is receiving too many requests. Please try again in a moment.';
      } else if (status === 401 || status === 403) {
        errorMessage =
          'AI assistant is not properly configured. Please check the API key.';
      } else if (status >= 500) {
        errorMessage =
          'AI assistant service is experiencing issues. Please try again later.';
      }

      error.userMessage = errorMessage;
      reject(error);
      finalize();
      return;
    }
  }

  const fallbackError =
    lastError ||
    new Error(
      'Gemini models are not available. Please verify the configured model or your API access.'
    );

  fallbackError.userMessage =
    'AI assistant is temporarily unavailable. Please verify the configuration or try again later.';

  reject(fallbackError);
  finalize();
};

export const sendToAssistant = async ({
  conversationId,
  prompt,
  contextMessages = [],
}) => {
  if (!config.gemini.apiKey) {
    throw new Error(
      'Gemini API key is not configured. Please set GEMINI_API_KEY in your environment variables.'
    );
  }

  return new Promise((resolve, reject) => {
    requestQueue.push({
      conversationId,
      prompt,
      contextMessages,
      resolve,
      reject,
    });

    processQueue();
  });
};

export const getAssistantUserId = async () => {
  const User = (await import('../models/User.js')).default;
  const assistant = await User.findOne({ email: 'assistant@demo.com' });
  return assistant?._id;
};

