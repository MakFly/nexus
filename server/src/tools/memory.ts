/**
 * Memory management MCP tools
 * Provides add, get, list, and delete operations for memories
 */

import { z } from 'zod/v4';
import { getDb, generateId, getRawDb } from '../storage/client.js';
import { memories, contexts } from '../storage/schema.js';
import { eq, and, desc, asc } from 'drizzle-orm';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// Valid memory types
const memoryTypes = ['note', 'conversation', 'snippet', 'reference', 'task', 'idea'] as const;

// Zod schemas for validation
export const AddMemorySchema = z.object({
  contextId: z.string(),
  type: z.enum(memoryTypes),
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  stack: z.enum(['nextjs', 'laravel', 'symfony', 'react19', 'vuejs', 'devops', 'php-api-platform', 'basic', 'search', 'automation', 'advanced']).optional(),
  difficulty: z.enum(['easy', 'normal', 'hard']).optional(),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

export const GetMemorySchema = z.object({
  memoryId: z.string(),
});

export const ListMemoriesSchema = z.object({
  contextId: z.string().optional(),
  type: z.enum(memoryTypes).optional(),
  stack: z.enum(['nextjs', 'laravel', 'symfony', 'react19', 'vuejs', 'devops', 'php-api-platform', 'basic', 'search', 'automation', 'advanced']).optional(),
  difficulty: z.enum(['easy', 'normal', 'hard']).optional(),
  limit: z.number().optional().default(50),
  offset: z.number().optional().default(0),
});

export const DeleteMemorySchema = z.object({
  memoryId: z.string(),
});

export const UpdateMemorySchema = z.object({
  memoryId: z.string(),
  type: z.enum(memoryTypes).optional(),
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).optional(),
  stack: z.enum(['nextjs', 'laravel', 'symfony', 'react19', 'vuejs', 'devops', 'php-api-platform', 'basic', 'search', 'automation', 'advanced']).optional(),
  difficulty: z.enum(['easy', 'normal', 'hard']).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Add a new memory
 */
export async function addMemory(args: unknown): Promise<CallToolResult> {
  try {
    const input = AddMemorySchema.parse(args);
    const db = getDb();

    const context = await db.query.contexts.findFirst({
      where: eq(contexts.id, input.contextId),
    });

    if (!context) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: 'Context not found',
            }, null, 2),
          },
        ],
        isError: true,
      };
    }

    const memoryId = generateId();
    const now = new Date();
    const ftsId = generateId();

    await db.insert(memories).values({
      id: memoryId,
      contextId: input.contextId,
      type: input.type,
      title: input.title,
      content: input.content,
      stack: input.stack,
      difficulty: input.difficulty,
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
    });

    // Also insert into FTS table for search using prepared statement
    const sqlite = getRawDb();
    const stmt = sqlite.prepare(`
      INSERT INTO memories_fts (id, memory_id, title, content, type, context_id, stack)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(ftsId, memoryId, input.title, input.content, input.type, input.contextId, input.stack ?? null);
    sqlite.close();

    const memory = await db.query.memories.findFirst({
      where: eq(memories.id, memoryId),
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            memory: {
              id: memory.id,
              title: memory.title,
              type: memory.type,
              contextId: memory.contextId,
              stack: memory.stack,
              difficulty: memory.difficulty,
              createdAt: memory.createdAt,
            },
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }, null, 2),
          },
        ],
      isError: true,
    };
  }
}

/**
 * Get a memory by ID
 */
export async function getMemory(args: unknown): Promise<CallToolResult> {
  try {
    const input = GetMemorySchema.parse(args);
    const db = getDb();

    const memory = await db.query.memories.findFirst({
      where: eq(memories.id, input.memoryId),
    });

    if (!memory) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: 'Memory not found',
            }, null, 2),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            memory,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }, null, 2),
          },
        ],
      isError: true,
    };
  }
}

/**
 * List memories with optional filters and pagination info
 */
export async function listMemories(args: unknown): Promise<CallToolResult> {
  try {
    const input = ListMemoriesSchema.parse(args);
    const db = getDb();

    const conditions = [];

    if (input.contextId) {
      conditions.push(eq(memories.contextId, input.contextId));
    }

    if (input.type) {
      conditions.push(eq(memories.type, input.type));
    }

    if (input.stack) {
      conditions.push(eq(memories.stack, input.stack));
    }

    if (input.difficulty) {
      conditions.push(eq(memories.difficulty, input.difficulty));
    }

    // Get total count for pagination info
    const sqlite = getRawDb();
    let countQuery = 'SELECT COUNT(*) as total FROM memories';
    const countParams: unknown[] = [];

    if (conditions.length > 0) {
      const whereClauses: string[] = [];
      if (input.contextId) {
        whereClauses.push('context_id = ?');
        countParams.push(input.contextId);
      }
      if (input.type) {
        whereClauses.push('type = ?');
        countParams.push(input.type);
      }
      if (input.stack) {
        whereClauses.push('stack = ?');
        countParams.push(input.stack);
      }
      if (input.difficulty) {
        whereClauses.push('difficulty = ?');
        countParams.push(input.difficulty);
      }
      countQuery += ' WHERE ' + whereClauses.join(' AND ');
    }

    const countResult = sqlite.prepare(countQuery).get(...countParams) as { total: number };
    sqlite.close();

    const allMemories = await db.query.memories.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(memories.createdAt)],
      limit: input.limit,
      offset: input.offset,
    });

    // Return compact memories (without content) to save tokens
    const compactMemories = allMemories.map(m => ({
      id: m.id,
      title: m.title,
      type: m.type,
      contextId: m.contextId,
      stack: m.stack,
      difficulty: m.difficulty,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      // Content NOT included - use get_memory() to retrieve full content
    }));

    const totalCount = countResult.total;
    const hasMore = input.offset + compactMemories.length < totalCount;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            memories: compactMemories,
            pagination: {
              total: totalCount,
              limit: input.limit,
              offset: input.offset,
              count: compactMemories.length,
              hasMore,
            },
            note: 'Full content not included. Use get_memory() to retrieve specific memory content.',
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }, null, 2),
          },
        ],
      isError: true,
    };
  }
}

/**
 * Delete a memory
 */
export async function deleteMemory(args: unknown): Promise<CallToolResult> {
  try {
    const input = DeleteMemorySchema.parse(args);
    const db = getDb();

    const memory = await db.query.memories.findFirst({
      where: eq(memories.id, input.memoryId),
    });

    if (!memory) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: 'Memory not found',
            }, null, 2),
          },
        ],
        isError: true,
      };
    }

    await db.delete(memories).where(eq(memories.id, input.memoryId));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Memory deleted successfully',
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }, null, 2),
          },
        ],
      isError: true,
    };
  }
}

/**
 * Update an existing memory
 */
export async function updateMemory(args: unknown): Promise<CallToolResult> {
  try {
    const input = UpdateMemorySchema.parse(args);
    const db = getDb();

    const existing = await db.query.memories.findFirst({
      where: eq(memories.id, input.memoryId),
    });

    if (!existing) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: 'Memory not found',
            }, null, 2),
          },
        ],
        isError: true,
      };
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.type !== undefined) updateData.type = input.type;
    if (input.title !== undefined) updateData.title = input.title;
    if (input.content !== undefined) updateData.content = input.content;
    if (input.stack !== undefined) updateData.stack = input.stack;
    if (input.difficulty !== undefined) updateData.difficulty = input.difficulty;
    if (input.metadata !== undefined) updateData.metadata = input.metadata;

    await db.update(memories)
      .set(updateData)
      .where(eq(memories.id, input.memoryId));

    // Update FTS table if title or content changed
    if (input.title !== undefined || input.content !== undefined) {
      const sqlite = getRawDb();
      const stmt = sqlite.prepare(`
        UPDATE memories_fts
        SET title = ?, content = ?
        WHERE memory_id = ?
      `);
      stmt.run(input.title ?? existing.title, input.content ?? existing.content, input.memoryId);
      sqlite.close();
    }

    const updated = await db.query.memories.findFirst({
      where: eq(memories.id, input.memoryId),
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            memory: {
              id: updated.id,
              title: updated.title,
              type: updated.type,
              contextId: updated.contextId,
              stack: updated.stack,
              difficulty: updated.difficulty,
              createdAt: updated.createdAt,
              updatedAt: updated.updatedAt,
            },
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }, null, 2),
          },
        ],
      isError: true,
    };
  }
}
