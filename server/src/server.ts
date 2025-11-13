import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { ApolloServer } from '@apollo/server';
import { parse } from 'graphql';
import config from './config/index.js';
import logger from './utils/logger.js';
import { connectDatabase, disconnectDatabase, checkDatabaseHealth } from './config/database.js';
import authRoutes from './routes/auth.js';
import conversationRoutes from './routes/conversations.js';
import messageRoutes from './routes/messages.js';
import analyticsRoutes from './routes/analytics.js';
import uploadRoutes from './routes/upload.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeSocket } from './sockets/socketHandler.js';
import sanitizeInput from './middleware/sanitizeInput.js';
import { securityMiddleware } from './middleware/security.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { swaggerUiServe, swaggerUiMiddleware, swaggerJson } from './middleware/swagger.js';
import { seedDatabase } from '../seed.js';
import { typeDefs } from './graphql/schema.js';
import { resolvers } from './graphql/resolvers/index.js';
import { createContext } from './graphql/context.js';
import { initializeAnalyticsJob } from './jobs/analyticsJob.js';

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// Log Gemini API key status
logger.info(
  `[Gemini] ${config.gemini.apiKey ? 'API key loaded' : 'API key NOT loaded'}`
);

// Initialize Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: config.clientUrl,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Security middleware
app.use(securityMiddleware);

// CORS middleware
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);

// Rate limiting
const apiRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many requests, please try again later.',
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      url: req.originalUrl,
    });
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later.',
    });
  },
});

app.use('/api', apiRateLimiter);

// Body parsing middleware
app.use(express.json({ limit: config.requestBodyLimit }));
app.use(
  express.urlencoded({ extended: true, limit: config.requestBodyLimit })
);
app.use(sanitizeInput);

// Initialize Apollo Server
const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: config.isDevelopment,
});

// Static file serving for uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Chat Application API is running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      docs: '/api-docs',
      graphql: '/graphql',
      auth: '/api/auth',
      conversations: '/api/conversations',
      messages: '/api/messages',
      analytics: '/api/analytics',
      upload: '/api/upload',
    },
    environment: config.nodeEnv,
  });
});

// Routes (keeping REST for backward compatibility, can be removed later)
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/upload', uploadRoutes);

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the API and its dependencies
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 *                 environment:
 *                   type: string
 *                 database:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     connected:
 *                       type: boolean
 *                 memory:
 *                   type: object
 *                   properties:
 *                     used:
 *                       type: number
 *                     total:
 *                       type: number
 *                     percentage:
 *                       type: number
 */
app.get('/api/health', (req: Request, res: Response) => {
  const dbHealth = checkDatabaseHealth();
  const memoryUsage = process.memoryUsage();
  const totalMemory = memoryUsage.heapTotal;
  const usedMemory = memoryUsage.heapUsed;
  const memoryPercentage = ((usedMemory / totalMemory) * 100).toFixed(2);

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: config.nodeEnv,
    database: {
      status: dbHealth ? 'connected' : 'disconnected',
      connected: dbHealth,
    },
    memory: {
      used: Math.round(usedMemory / 1024 / 1024), // MB
      total: Math.round(totalMemory / 1024 / 1024), // MB
      percentage: parseFloat(memoryPercentage),
    },
  });
});

// API Documentation
app.get('/api-docs.json', swaggerJson);
app.use('/api-docs', swaggerUiServe, swaggerUiMiddleware);

// Initialize Socket.io
initializeSocket(io);

// GraphQL endpoint (setup before error handlers)
app.use(
  '/graphql',
  cors({
    origin: config.clientUrl,
    credentials: true,
  }),
  express.json(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!apolloServer) {
        return res.status(503).json({
          success: false,
          error: 'GraphQL server is not ready',
        });
      }

      logger.debug('GraphQL Request received', {
        method: req.method,
        operationName: (req.body as any)?.operationName,
        hasQuery: !!(req.body as any)?.query,
        hasVariables: !!(req.body as any)?.variables,
      });

      const context = await createContext({ req, res });

      // Handle both GET and POST requests
      let query: string | undefined;
      let variables: any;
      let operationName: string | undefined;

      if (req.method === 'GET') {
        query = req.query.query as string;
        variables = req.query.variables
          ? JSON.parse(req.query.variables as string)
          : undefined;
        operationName = req.query.operationName as string;
      } else {
        const body = req.body as any;
        query = body.query;
        variables = body.variables;
        operationName = body.operationName;
      }

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Query is required',
        });
      }

      // Parse the query string to DocumentNode
      const document = parse(query);

      logger.debug('Executing GraphQL operation', {
        operationName,
        variables: variables ? Object.keys(variables) : [],
      });

      const result = await apolloServer.executeOperation(
        {
          query: document,
          variables,
          operationName,
        },
        {
          contextValue: context,
        }
      );

      // Apollo Server v5 returns result in a specific format
      let responseData: any;
      if (result.body && (result.body as any).kind === 'single') {
        responseData = (result.body as any).singleResult;
      } else if (result.body && (result.body as any).kind === 'incremental') {
        responseData = (result.body as any).initialResult;
      } else if (result.body) {
        responseData = result.body;
      } else {
        responseData = result;
      }

      // Return in the format Apollo Client expects
      const response = {
        data: responseData?.data || null,
        errors: responseData?.errors || null,
      };

      if (responseData?.errors) {
        logger.warn('GraphQL operation errors', {
          operationName,
          errors: responseData.errors,
        });
      }

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// 404 handler (must be before error handler)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Initialize server
const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDatabase();

    // Seed database (always reset and seed on startup, unless SKIP_SEED=true)
    try {
      const skipSeed = process.env.SKIP_SEED === 'true';
      if (skipSeed) {
        logger.info('⏭️  Skipping database seed (SKIP_SEED=true)');
      } else {
        await seedDatabase(true); // Always force reset and seed
        logger.info('🌱 Database reset and seeded with fresh demo data');
      }
    } catch (seedError: any) {
      logger.error('Failed to seed database on startup:', seedError);
    }

    // Initialize analytics job scheduler
    initializeAnalyticsJob();

    // Start Apollo Server
    await apolloServer.start();
    logger.info('Apollo Server started');

    // Start HTTP server
    server.listen(config.port, () => {
      logger.info(`🚀 Server running on port ${config.port}`);
      logger.info(`📊 GraphQL endpoint: http://localhost:${config.port}/graphql`);
      logger.info(`🌍 Environment: ${config.nodeEnv}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await apolloServer.stop();
          logger.info('Apollo Server stopped');

          await disconnectDatabase();

          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error: any) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error: any) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export { io };
