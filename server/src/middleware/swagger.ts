import { Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../config/swagger.js';

/**
 * Swagger UI middleware
 */
export const swaggerUiMiddleware = swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Chat Application API Documentation',
});

/**
 * Swagger UI serve middleware
 */
export const swaggerUiServe = swaggerUi.serve;

/**
 * Swagger JSON endpoint handler
 */
export const swaggerJson = (req: Request, res: Response): void => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
};

export default { swaggerUiMiddleware, swaggerUiServe, swaggerJson };

