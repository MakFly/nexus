/**
 * Database schema using Drizzle ORM
 * User-less architecture - single-user system
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';

/**
 * Contexts table - stores collections of memories
 */
export const contexts = sqliteTable('contexts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  tags: text('tags', { mode: 'json' }).notNull().default('[]'),
  stack: text('stack'), // Technology stack: nextjs, laravel, symfony, react19, vuejs, devops, etc.
  difficulty: text('difficulty'), // easy, normal, hard
  metadata: text('metadata', { mode: 'json' }).notNull().default('{}'),
  systemPrompt: text('system_prompt'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Memories table - stores individual memories
 */
export const memories = sqliteTable('memories', {
  id: text('id').primaryKey(),
  contextId: text('context_id').notNull().references(() => contexts.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // note, conversation, snippet, reference, task, idea
  title: text('title').notNull(),
  content: text('content').notNull(),
  stack: text('stack'), // Technology stack: nextjs, laravel, symfony, react19, vuejs, devops, etc.
  difficulty: text('difficulty'), // easy, normal, hard
  metadata: text('metadata', { mode: 'json' }).notNull().default('{}'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Relationships table - stores connections between memories
 */
export const relationships = sqliteTable('relationships', {
  id: text('id').primaryKey(),
  sourceId: text('source_id').notNull().references(() => memories.id, { onDelete: 'cascade' }),
  targetId: text('target_id').notNull().references(() => memories.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // related, depends_on, blocks, includes, references
  strength: integer('strength').notNull().default(1), // 0-100
  metadata: text('metadata', { mode: 'json' }).notNull().default('{}'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Relations between memories and contexts
 */
export const memoriesRelations = relations(memories, ({ one }) => ({
  context: one(contexts, {
    fields: [memories.contextId],
    references: [contexts.id],
  }),
}));

export const contextsRelations = relations(contexts, ({ many }) => ({
  memories: many(memories),
}));

/**
 * Full-text search virtual table for memories
 */
export const memoriesFts = sqliteTable('memories_fts', {
  id: text('id').primaryKey(),
  memoryId: text('memory_id').notNull().references(() => memories.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  type: text('type').notNull(),
  contextId: text('context_id').notNull(),
  stack: text('stack'), // For searching by technology stack
});

/**
 * Events table - tracks all system events for analytics and hooks
 */
export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // memory:created, context:updated, etc.
  data: text('data', { mode: 'json' }).notNull(), // Event payload
  metadata: text('metadata', { mode: 'json' }).notNull().default('{}'), // Optional metadata
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Export types for use in application
export type Context = typeof contexts.$inferSelect;
export type NewContext = typeof contexts.$inferInsert;

export type Memory = typeof memories.$inferSelect;
export type NewMemory = typeof memories.$inferInsert;

export type Relationship = typeof relationships.$inferSelect;
export type NewRelationship = typeof relationships.$inferInsert;

export type MemoriesFts = typeof memoriesFts.$inferSelect;
export type NewMemoriesFts = typeof memoriesFts.$inferInsert;

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
