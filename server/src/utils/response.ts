import { Response } from 'express';

/**
 * Response formatting utility for consistent API responses
 */

interface PaginationData {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

interface PaginatedResponseData<T> {
  data?: T[];
  pagination?: PaginationData;
}

/**
 * Send success response
 */
export const sendSuccess = (
  res: Response,
  data: any = null,
  message: string = 'Success',
  statusCode: number = 200
): Response => {
  const response: any = {
    success: true,
    message,
  };

  if (data !== null) {
    if (Array.isArray(data)) {
      response.data = data;
      response.count = data.length;
    } else if (typeof data === 'object' && data !== null) {
      // If data has pagination info, extract it
      const paginatedData = data as PaginatedResponseData<any>;
      if (paginatedData.data && paginatedData.pagination) {
        response.data = paginatedData.data;
        response.pagination = paginatedData.pagination;
      } else {
        response.data = data;
      }
    } else {
      response.data = data;
    }
  }

  return res.status(statusCode).json(response);
};

/**
 * Send error response (usually handled by error middleware, but useful for manual errors)
 */
export const sendError = (
  res: Response,
  message: string = 'An error occurred',
  statusCode: number = 500,
  errors: any = null
): Response => {
  const response: any = {
    success: false,
    error: message,
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send paginated response
 */
export const sendPaginated = (
  res: Response,
  data: any[],
  pagination: PaginationData,
  message: string = 'Success',
  statusCode: number = 200
): Response => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page || 1,
      limit: pagination.limit || 10,
      total: pagination.total || 0,
      totalPages: pagination.totalPages || 0,
      hasNext: pagination.hasNext || false,
      hasPrev: pagination.hasPrev || false,
    },
  });
};

/**
 * Format pagination metadata
 */
export const formatPagination = (page: number, limit: number, total: number): PaginationData => {
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.max(1, Math.min(page, totalPages));

  return {
    page: currentPage,
    limit,
    total,
    totalPages,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
  };
};

