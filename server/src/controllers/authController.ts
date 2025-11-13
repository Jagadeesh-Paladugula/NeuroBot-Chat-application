import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService.js';
import { sendSuccess } from '../utils/response.js';
import { SUCCESS_MESSAGES, HTTP_STATUS } from '../constants/index.js';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { name, email, password } = req.body;

  const result = await authService.registerUser({ name, email, password });

  sendSuccess(
    res,
    { user: result.user, token: result.token },
    SUCCESS_MESSAGES.USER_CREATED,
    HTTP_STATUS.CREATED
  );
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { email, password } = req.body;

  const result = await authService.loginUser(email, password);

  sendSuccess(
    res,
    { user: result.user, token: result.token },
    SUCCESS_MESSAGES.LOGIN_SUCCESS
  );
};

export const googleLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { credential } = req.body;

  const result = await authService.googleLoginUser(credential);

  sendSuccess(
    res,
    { user: result.user, token: result.token },
    SUCCESS_MESSAGES.LOGIN_SUCCESS
  );
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const user = await authService.getUserById((req as any).userId);

  sendSuccess(res, { user });
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { name, avatarUrl, phone, about, readReceiptsEnabled } = req.body;
  const userId = (req as any).userId;

  const user = await authService.updateUserProfile(userId, {
    name,
    avatarUrl,
    phone,
    about,
    readReceiptsEnabled,
  });

  sendSuccess(
    res,
    { user },
    SUCCESS_MESSAGES.PROFILE_UPDATED
  );
};

export const deleteAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = (req as any).userId;

  await authService.deleteUserAccount(userId);

  sendSuccess(
    res,
    null,
    SUCCESS_MESSAGES.ACCOUNT_DELETED
  );
};

