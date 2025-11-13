import { Request, Response } from 'express';
import { verifyToken } from '../utils/auth.js';

interface GraphQLContext {
  userId: string | null;
  req: Request;
  res: Response;
}

export const createContext = async ({ req, res }: { req: Request; res: Response }): Promise<GraphQLContext> => {
  const token = req.headers.authorization?.replace('Bearer ', '') || null;
  let userId: string | null = null;

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      userId = decoded.userId;
    }
  }

  return {
    userId,
    req,
    res,
  };
};

