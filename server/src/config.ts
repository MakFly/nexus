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
  serverVersion: '0.1.0',

  /** Whether to enable debug logging */
  debug: process.env.DEBUG === 'true',
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
