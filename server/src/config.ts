/**
 * Configuration management for Free Context MCP server
 */

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const config = {
  /** Database file path - relative to server directory */
  databasePath: process.env.DATABASE_PATH || join(__dirname, '../data/free-context.db'),
  testDatabasePath: join(__dirname, '../data/free-context.test.db'),

  /** Server name for MCP protocol */
  serverName: 'free-context-server',

  /** Server version */
  serverVersion: '1.0.0',

  /** Whether to enable debug logging */
  debug: process.env.DEBUG === 'true',

  /** Rate limiting configuration */
  rateLimit: {
    /** Max requests per window */
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    /** Window duration in milliseconds (default: 1 minute) */
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  },

  /** CORS allowed origins (comma-separated in env) */
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ],
} as const;

/**
 * Get database URL for Drizzle
 */
export function getDatabaseUrl(): string {
  return config.databasePath;
}

/**
 * Get test database URL for Drizzle
 */
export function getTestDatabaseUrl(): string {
  return config.testDatabaseUrl;
}
