import swaggerJsdoc from 'swagger-jsdoc';
import config from './index.js';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Chat Application API',
      version: '1.0.0',
      description: 'RESTful API documentation for the Chat Application backend',
      contact: {
        name: 'API Support',
      },
      license: {
        name: 'ISC',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
      {
        url: config.clientUrl,
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'User ID',
            },
            name: {
              type: 'string',
              description: 'User name',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email',
            },
            avatarUrl: {
              type: 'string',
              format: 'uri',
              description: 'User avatar URL',
            },
            phone: {
              type: 'string',
              description: 'User phone number',
            },
            about: {
              type: 'string',
              description: 'User bio/about',
            },
            readReceiptsEnabled: {
              type: 'boolean',
              description: 'Read receipts enabled',
            },
            isOnline: {
              type: 'boolean',
              description: 'User online status',
            },
            lastSeen: {
              type: 'string',
              format: 'date-time',
              description: 'Last seen timestamp',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              description: 'Error message',
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                  },
                  message: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              description: 'Success message',
            },
            data: {
              type: 'object',
              description: 'Response data',
            },
          },
        },
        Message: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Message ID',
            },
            conversationId: {
              type: 'string',
              description: 'Conversation ID',
            },
            senderId: {
              $ref: '#/components/schemas/User',
              description: 'Sender user object',
            },
            text: {
              type: 'string',
              description: 'Message text content',
            },
            attachments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  url: {
                    type: 'string',
                    format: 'uri',
                  },
                  type: {
                    type: 'string',
                    enum: ['image', 'file', 'video', 'audio'],
                  },
                  name: {
                    type: 'string',
                  },
                },
              },
            },
            status: {
              type: 'string',
              enum: ['sent', 'delivered', 'seen'],
              description: 'Message status',
            },
            parentMessageId: {
              type: 'string',
              description: 'Parent message ID for replies',
            },
            mentions: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/User',
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Conversation: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Conversation ID',
            },
            type: {
              type: 'string',
              enum: ['one-to-one', 'group'],
              description: 'Conversation type',
            },
            name: {
              type: 'string',
              description: 'Conversation name (for group chats)',
            },
            participant: {
              $ref: '#/components/schemas/User',
              description: 'Other participant (for one-to-one chats)',
            },
            participants: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/User',
              },
              description: 'List of participants',
            },
            createdBy: {
              $ref: '#/components/schemas/User',
              description: 'User who created the conversation',
            },
            admins: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/User',
              },
              description: 'List of admin users (for group chats)',
            },
            lastMessage: {
              $ref: '#/components/schemas/Message',
              description: 'Last message in the conversation',
            },
            lastMessageAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp of last message',
            },
            unreadCount: {
              type: 'number',
              description: 'Number of unread messages',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
            aiSummary: {
              type: 'object',
              properties: {
                text: {
                  type: 'string',
                },
                messageCount: {
                  type: 'number',
                },
                generatedAt: {
                  type: 'string',
                  format: 'date-time',
                },
              },
            },
            aiSummaries: {
              type: 'array',
              items: {
                type: 'object',
              },
            },
          },
        },
        AISummary: {
          type: 'object',
          properties: {
            summaryId: {
              type: 'string',
              description: 'Summary ID',
            },
            summary: {
              type: 'string',
              description: 'Summary text',
            },
            messageCount: {
              type: 'number',
              description: 'Number of messages summarized',
            },
            generatedAt: {
              type: 'string',
              format: 'date-time',
            },
            requestedBy: {
              type: 'string',
              description: 'User ID who requested the summary',
            },
            requestedByName: {
              type: 'string',
              description: 'Name of user who requested the summary',
            },
            lastMessageCreatedAt: {
              type: 'string',
              format: 'date-time',
            },
            cached: {
              type: 'boolean',
              description: 'Whether the summary was cached',
            },
            summaryMessage: {
              $ref: '#/components/schemas/Message',
            },
            rangeStart: {
              type: 'string',
              format: 'date-time',
            },
            rangeEnd: {
              type: 'string',
              format: 'date-time',
            },
            requestedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Auth',
        description: 'Authentication endpoints',
      },
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
      {
        name: 'Conversations',
        description: 'Conversation management endpoints',
      },
      {
        name: 'Messages',
        description: 'Message management endpoints',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/routes/*.js', './src/controllers/*.ts', './src/controllers/*.js', './src/server.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

