/**
 * API Middleware
 * Provides CORS, error handling, request logging, and authentication helpers
 */

import type { Context, Next } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

/**
 * CORS middleware configuration
 */
export const corsMiddleware = cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});

/**
 * Error response helper
 */
export interface ErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

/**
 * Success response helper
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Standard error handler middleware
 */
export const errorHandler = async (c: Context, next: Next) => {
  try {
    await next();
  } catch (error) {
    console.error('[API Error]', error);

    const status = (error as any).status || 500;
    const message = error instanceof Error ? error.message : 'Internal server error';

    return c.json<ErrorResponse>(
      {
        success: false,
        error: message,
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      },
      status
    );
  }
};

/**
 * Request logging middleware
 */
export const loggingMiddleware = logger((message) => {
  console.log(`[API] ${message}`);
});

/**
 * Validate request ID parameter
 */
export function validateId(c: Context, next: Next) {
  const id = c.req.param('id');
  if (!id) {
    return c.json<ErrorResponse>(
      {
        success: false,
        error: 'ID parameter is required',
      },
      400
    );
  }
  return next();
}

/**
 * Health check response
 */
export const healthCheck = () => ({
  success: true,
  status: 'healthy',
  timestamp: new Date().toISOString(),
  version: '0.1.0',
});
