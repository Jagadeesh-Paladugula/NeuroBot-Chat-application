import { Request, Response, NextFunction } from 'express';

const sanitizeString = (input: any): any => {
  if (typeof input !== 'string') {
    return input;
  }

  // Remove common XSS vectors while preserving safe characters.
  return input
    // Remove script/style tags and their content.
    .replace(/<\s*(script|style).*?>.*?<\s*\/\s*\1\s*>/gmis, '')
    // Remove any remaining HTML tags.
    .replace(/<[^>]*>?/g, '')
    // Remove control characters except for newline and tab.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .trim();
};

const sanitizeValue = (value: any): any => {
  if (value == null) {
    return value;
  }

  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value instanceof Date || Buffer.isBuffer(value)) {
    return value;
  }

  if (typeof value === 'object') {
    Object.keys(value).forEach((key) => {
      value[key] = sanitizeValue(value[key]);
    });
  }

  return value;
};

const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  req.body = sanitizeValue(req.body);
  req.query = sanitizeValue(req.query);
  req.params = sanitizeValue(req.params);
  next();
};

export default sanitizeInput;
export { sanitizeValue };

