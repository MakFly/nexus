/**
 * Database client factory and initialization
 * Uses Bun's built-in SQLite (bun:sqlite)
 * User-less architecture - single-user system
 */

import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { config } from '../config.js';
import * as schema from './schema.js';

let db: ReturnType<typeof drizzle> | null = null;

/**
 * Get or create database connection
 */
export function getDb() {
  if (!db) {
    const sqlite = new Database(config.databasePath);

    // Enable foreign keys
    sqlite.exec('PRAGMA foreign_keys = ON');

    // Create connection
    db = drizzle({
      client: sqlite,
      schema,
    });
  }

  return db;
}

/**
 * Close database connection
 */
export function closeDb() {
  if (db) {
    // Bun SQLite connections are automatically closed when the Database object is garbage collected
    db = null;
  }
}

/**
 * Get the raw SQLite database instance
 * Useful for raw SQL queries and migrations
 */
export function getRawDb(): Database {
  return new Database(config.databasePath);
}

/**
 * Initialize database schema
 * Creates tables and FTS virtual table if they don't exist
 * User-less architecture - no users table
 */
export async function initializeDatabase() {
  const sqlite = getRawDb();

  // Enable foreign keys
  sqlite.exec('PRAGMA foreign_keys = ON');

  // Create contexts table (no user_id)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS contexts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      stack TEXT,
      difficulty TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      system_prompt TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Create memories table (no user_id)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      context_id TEXT NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      stack TEXT,
      difficulty TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Create relationships table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS relationships (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
      target_id TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      strength INTEGER NOT NULL DEFAULT 1,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Create FTS5 virtual table for full-text search
  sqlite.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
      id,
      memory_id,
      title,
      content,
      type,
      context_id,
      stack
    )
  `);

  // Migration: Add stack column to FTS if it doesn't exist
  try {
    const ftsColumns = sqlite.query(`
      SELECT COUNT(*) as count FROM pragma_table_info('memories_fts') WHERE name = 'stack'
    `).get() as { count: number };

    if (ftsColumns.count === 0) {
      console.log('[DB] Migrating FTS table: adding stack column');
      // Backup existing data
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS memories_fts_backup AS SELECT * FROM memories_fts
      `);

      // Recreate FTS table with stack column
      sqlite.exec(`DROP TABLE IF EXISTS memories_fts`);
      sqlite.exec(`
        CREATE VIRTUAL TABLE memories_fts USING fts5(
          id,
          memory_id,
          title,
          content,
          type,
          context_id,
          stack
        )
      `);

      // Restore data
      sqlite.exec(`
        INSERT INTO memories_fts (id, memory_id, title, content, type, context_id, stack)
        SELECT id, memory_id, title, content, type, context_id, NULL
        FROM memories_fts_backup
      `);

      // Clean up
      sqlite.exec(`DROP TABLE memories_fts_backup`);

      console.log('[DB] FTS migration completed');
    }
  } catch (e) {
    // Table might not exist yet or other error, ignore
    console.log('[DB] FTS migration skipped or failed:', e);
  }

  // Create events table (no user_id)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      data TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Migration: Add stack and difficulty columns if they don't exist
  try {
    // Check if contexts.stack exists
    const columns = sqlite.query(`
      SELECT COUNT(*) as count FROM pragma_table_info('contexts') WHERE name IN ('stack', 'difficulty')
    `).get() as { count: number };

    if (columns.count === 0) {
      sqlite.exec(`ALTER TABLE contexts ADD COLUMN stack TEXT`);
      sqlite.exec(`ALTER TABLE contexts ADD COLUMN difficulty TEXT`);
    }
  } catch (e) {
    // Ignore if columns already exist
  }

  try {
    // Check if memories.stack exists
    const columns = sqlite.query(`
      SELECT COUNT(*) as count FROM pragma_table_info('memories') WHERE name IN ('stack', 'difficulty')
    `).get() as { count: number };

    if (columns.count === 0) {
      sqlite.exec(`ALTER TABLE memories ADD COLUMN stack TEXT`);
      sqlite.exec(`ALTER TABLE memories ADD COLUMN difficulty TEXT`);
    }
  } catch (e) {
    // Ignore if columns already exist
  }

  // PMP2: Add digest column for token optimization
  try {
    const digestColumn = sqlite.query(`
      SELECT COUNT(*) as count FROM pragma_table_info('memories') WHERE name = 'digest'
    `).get() as { count: number };

    if (digestColumn.count === 0) {
      console.log('[DB] Adding digest column for PMP2 token optimization');
      sqlite.exec(`ALTER TABLE memories ADD COLUMN digest TEXT`);

      // Generate digests for existing memories (first sentence, max 80 chars)
      sqlite.exec(`
        UPDATE memories
        SET digest = SUBSTR(
          TRIM(SUBSTR(content, 1,
            CASE
              WHEN INSTR(content, '. ') > 0 THEN INSTR(content, '. ')
              WHEN INSTR(content, '.') > 0 THEN INSTR(content, '.')
              ELSE 80
            END
          )),
          1, 80
        )
        WHERE digest IS NULL
      `);

      console.log('[DB] Digest column added and backfilled');
    }
  } catch (e) {
    console.log('[DB] Digest migration skipped:', e);
  }

  // Create indexes for better performance (no user indexes)
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_memories_context_id ON memories(context_id);
    CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
    CREATE INDEX IF NOT EXISTS idx_memories_stack ON memories(stack);
    CREATE INDEX IF NOT EXISTS idx_memories_difficulty ON memories(difficulty);
    CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at);
    CREATE INDEX IF NOT EXISTS idx_memories_context_type ON memories(context_id, type);
    CREATE INDEX IF NOT EXISTS idx_contexts_stack ON contexts(stack);
    CREATE INDEX IF NOT EXISTS idx_contexts_difficulty ON contexts(difficulty);
    CREATE INDEX IF NOT EXISTS idx_relationships_source ON relationships(source_id);
    CREATE INDEX IF NOT EXISTS idx_relationships_target ON relationships(target_id);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
    CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
  `);

  sqlite.close();
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
