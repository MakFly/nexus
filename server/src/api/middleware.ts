/**
 * API Middleware
 * Provides CORS, error handling, request logging, rate limiting, and authentication helpers
 */

import type { Context, Next } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { config } from '../config.js';

/**
 * CORS middleware configuration
 * Uses origins from config (can be overridden via CORS_ORIGINS env var)
 */
export const corsMiddleware = cors({
  origin: config.corsOrigins,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400, // 24 hours
});

/**
 * Simple in-memory rate limiter using sliding window
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Clean up expired rate limit entries (runs every 5 minutes)
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate limiting middleware
 * Limits requests per IP address using a sliding window algorithm
 */
export const rateLimitMiddleware = async (c: Context, next: Next) => {
  const clientIp = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    || c.req.header('x-real-ip')
    || 'unknown';

  const now = Date.now();
  const windowMs = config.rateLimit.windowMs;
  const maxRequests = config.rateLimit.maxRequests;

  const record = rateLimitStore.get(clientIp);

  if (!record || record.resetTime < now) {
    // New window
    rateLimitStore.set(clientIp, { count: 1, resetTime: now + windowMs });
    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', (maxRequests - 1).toString());
    c.header('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
    return next();
  }

  if (record.count >= maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    c.header('Retry-After', retryAfter.toString());
    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', '0');
    c.header('X-RateLimit-Reset', new Date(record.resetTime).toISOString());

    return c.json(
      {
        success: false,
        error: 'Too many requests',
        retryAfter,
      },
      429
    );
  }

  // Increment count
  record.count++;
  c.header('X-RateLimit-Limit', maxRequests.toString());
  c.header('X-RateLimit-Remaining', (maxRequests - record.count).toString());
  c.header('X-RateLimit-Reset', new Date(record.resetTime).toISOString());

  return next();
};

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
