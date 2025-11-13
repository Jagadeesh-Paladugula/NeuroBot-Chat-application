import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import config from '../config/index.js';
import { AuthenticationError } from '../errors/AppError.js';

export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
};

export const verifyToken = (token: string): { userId: string } | null => {
  try {
    return jwt.verify(token, config.jwtSecret) as { userId: string };
  } catch (error) {
    return null;
  }
};

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      throw new AuthenticationError('Invalid token');
    }

    (req as any).userId = decoded.userId;
    next();
  } catch (error) {
    next(error);
  }
};

