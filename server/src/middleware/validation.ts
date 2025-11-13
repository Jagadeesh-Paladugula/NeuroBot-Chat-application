import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../errors/AppError.js';
import logger from '../utils/logger.js';
import { DEFAULTS, CONVERSATION_TYPES, ATTACHMENT_TYPES } from '../constants/index.js';

/**
 * Validate request data against Joi schema
 */
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(
      {
        body: req.body,
        query: req.query,
        params: req.params,
      },
      {
        abortEarly: false,
        stripUnknown: true,
      }
    );

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.debug('Validation failed:', {
        errors,
        url: req.originalUrl,
        method: req.method,
      });

      return next(new ValidationError('Validation failed', errors.map(e => e.message)));
    }

    // Replace req with validated values
    req.body = value.body || req.body;
    req.query = value.query || req.query;
    req.params = value.params || req.params;

    next();
  };
};

/**
 * Common validation schemas
 */
export const schemas = {
  // Auth schemas
  register: Joi.object({
    body: Joi.object({
      name: Joi.string()
        .trim()
        .min(DEFAULTS.USER.NAME_MIN_LENGTH)
        .max(DEFAULTS.USER.NAME_MAX_LENGTH)
        .required(),
      email: Joi.string().email().trim().lowercase().required(),
      password: Joi.string().min(6).required(),
    }),
  }),

  login: Joi.object({
    body: Joi.object({
      email: Joi.string().email().trim().lowercase().required(),
      password: Joi.string().required(),
    }),
  }),

  googleLogin: Joi.object({
    body: Joi.object({
      credential: Joi.string().required(),
    }),
  }),

  updateProfile: Joi.object({
    body: Joi.object({
      name: Joi.string()
        .trim()
        .min(DEFAULTS.USER.NAME_MIN_LENGTH)
        .max(DEFAULTS.USER.NAME_MAX_LENGTH)
        .optional(),
      avatarUrl: Joi.string().uri().allow('').optional(),
      phone: Joi.string().trim().max(DEFAULTS.USER.PHONE_MAX_LENGTH).allow('').optional(),
      about: Joi.string().trim().max(DEFAULTS.USER.ABOUT_MAX_LENGTH).allow('').optional(),
      readReceiptsEnabled: Joi.boolean().optional(),
    }),
  }),

  // Conversation schemas
  createConversation: Joi.object({
    body: Joi.object({
      participantIds: Joi.array().items(Joi.string().hex().length(24)).min(1).required(),
      type: Joi.string()
        .valid(CONVERSATION_TYPES.ONE_TO_ONE, CONVERSATION_TYPES.GROUP)
        .optional(),
      name: Joi.string().trim().max(DEFAULTS.CONVERSATION.NAME_MAX_LENGTH).optional(),
    }),
  }),

  updateConversation: Joi.object({
    params: Joi.object({
      id: Joi.string().hex().length(24).required(),
    }),
    body: Joi.object({
      name: Joi.string().trim().max(DEFAULTS.CONVERSATION.NAME_MAX_LENGTH).optional(),
      description: Joi.string()
        .trim()
        .max(DEFAULTS.CONVERSATION.DESCRIPTION_MAX_LENGTH)
        .allow('')
        .optional(),
    }),
  }),

  // Message schemas
  createMessage: Joi.object({
    body: Joi.object({
      conversationId: Joi.string().hex().length(24).required(),
      text: Joi.string()
        .trim()
        .min(DEFAULTS.MESSAGE.MIN_LENGTH)
        .max(DEFAULTS.MESSAGE.MAX_LENGTH)
        .required(),
      attachments: Joi.array()
        .items(
          Joi.object({
            type: Joi.string()
              .valid(ATTACHMENT_TYPES.IMAGE, ATTACHMENT_TYPES.FILE, ATTACHMENT_TYPES.VIDEO)
              .required(),
            url: Joi.string().uri().required(),
            name: Joi.string().optional(),
            size: Joi.number().optional(),
          })
        )
        .optional(),
      parentMessageId: Joi.string().hex().length(24).optional(),
      mentions: Joi.array().items(Joi.string().hex().length(24)).optional(),
    }),
  }),

  getMessages: Joi.object({
    params: Joi.object({
      conversationId: Joi.string().hex().length(24).required(),
    }),
    query: Joi.object({
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number()
        .integer()
        .min(1)
        .max(DEFAULTS.PAGINATION.MAX_LIMIT)
        .optional(),
    }),
  }),

  // Common schemas
  mongoId: Joi.object({
    params: Joi.object({
      id: Joi.string().hex().length(24).required(),
    }),
  }),
};

