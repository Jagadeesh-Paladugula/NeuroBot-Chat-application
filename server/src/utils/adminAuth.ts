import { Request, Response, NextFunction } from 'express';
import User from '../models/User.js';
import { AuthenticationError, AuthorizationError } from '../errors/AppError.js';
import { authMiddleware } from './auth.js';

/**
 * Middleware to check if user is admin
 */
export const adminMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // First check authentication
    await new Promise<void>((resolve, reject) => {
      authMiddleware(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Then check if user is admin
    const userId = (req as any).userId;
    if (!userId) {
      throw new AuthenticationError('User not authenticated');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    if (!user.isAdmin) {
      throw new AuthorizationError('Admin access required');
    }

    (req as any).adminUser = user;
    next();
  } catch (error) {
    next(error);
  }
};

