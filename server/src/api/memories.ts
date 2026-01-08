/**
 * Memory API Routes
 * Handles all memory-related HTTP endpoints
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod/v4';
import { getDb, getRawDb, generateId } from '../storage/client.js';
import { memories, contexts } from '../storage/schema.js';
import { eq, and, desc, inArray } from 'drizzle-orm';
import type { ErrorResponse, SuccessResponse } from './middleware.js';

// Valid memory types
const memoryTypes = ['note', 'conversation', 'snippet', 'reference', 'task', 'idea'] as const;

/**
 * Create memory schema
 */
const createMemorySchema = z.object({
  contextId: z.string(),
  type: z.enum(memoryTypes),
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

/**
 * Update memory schema
 */
const updateMemorySchema = z.object({
  type: z.enum(memoryTypes).optional(),
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * List memories query schema
 */
const listMemoriesSchema = z.object({
  contextId: z.string().optional(),
  type: z.enum(memoryTypes).optional(),
  limit: z.string().optional().transform((val) => val ? parseInt(val) : 50),
  offset: z.string().optional().transform((val) => val ? parseInt(val) : 0),
});

/**
 * Create memory router
 */
export const memoriesRouter = new Hono();

/**
 * GET /api/memories - List memories with optional filters and pagination
 */
memoriesRouter.get('/', zValidator('query', listMemoriesSchema), async (c) => {
  try {
    const { contextId, type, limit, offset } = c.req.valid('query');
    const db = getDb();

    // Build where conditions
    const conditions = [];

    if (contextId) {
      conditions.push(eq(memories.contextId, contextId));
    }

    if (type) {
      conditions.push(eq(memories.type, type));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get paginated memories
    const paginatedMemories = await db.query.memories.findMany({
      where: whereClause,
      orderBy: [desc(memories.createdAt)],
      limit,
      offset,
    });

    // Get total count for pagination
    const allMemories = await db.query.memories.findMany({
      where: whereClause,
    });
    const total = allMemories.length;

    return c.json<SuccessResponse<{ memories: typeof paginatedMemories; total: number }>>({
      success: true,
      data: {
        memories: paginatedMemories,
        total,
      },
    });
  } catch (error) {
    console.error('[API] Error listing memories:', error);
    return c.json<ErrorResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list memories',
      },
      500
    );
  }
});

/**
 * POST /api/memories - Create a new memory
 */
memoriesRouter.post('/', zValidator('json', createMemorySchema), async (c) => {
  try {
    const input = c.req.valid('json');
    const db = getDb();

    // Verify context exists
    const context = await db.query.contexts.findFirst({
      where: eq(contexts.id, input.contextId),
    });

    if (!context) {
      return c.json<ErrorResponse>(
        {
          success: false,
          error: 'Context not found',
        },
        404
      );
    }

    const memoryId = generateId();
    const ftsId = generateId();
    const now = new Date();

    await db.insert(memories).values({
      id: memoryId,
      contextId: input.contextId,
      type: input.type,
      title: input.title,
      content: input.content,
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
    });

    // Also insert into FTS table for search
    const sqlite = getRawDb();
    const stmt = sqlite.prepare(`
      INSERT INTO memories_fts (id, memory_id, title, content, type, context_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(ftsId, memoryId, input.title, input.content, input.type, input.contextId);
    sqlite.close();

    const memory = await db.query.memories.findFirst({
      where: eq(memories.id, memoryId),
    });

    return c.json<SuccessResponse<{ memory: typeof memory }>>(
      {
        success: true,
        data: { memory },
      },
      201
    );
  } catch (error) {
    console.error('[API] Error creating memory:', error);
    return c.json<ErrorResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create memory',
      },
      500
    );
  }
});

/**
 * GET /api/memories/:id - Get a specific memory
 */
memoriesRouter.get('/:id', async (c) => {
  try {
    const memoryId = c.req.param('id');
    const db = getDb();

    const memory = await db.query.memories.findFirst({
      where: eq(memories.id, memoryId),
    });

    if (!memory) {
      return c.json<ErrorResponse>(
        {
          success: false,
          error: 'Memory not found',
        },
        404
      );
    }

    return c.json<SuccessResponse<{ memory: typeof memory }>>({
      success: true,
      data: { memory },
    });
  } catch (error) {
    console.error('[API] Error getting memory:', error);
    return c.json<ErrorResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get memory',
      },
      500
    );
  }
});

/**
 * PUT /api/memories/:id - Update a memory
 */
memoriesRouter.put('/:id', zValidator('json', updateMemorySchema), async (c) => {
  try {
    const memoryId = c.req.param('id');
    const input = c.req.valid('json');
    const db = getDb();

    // Verify memory exists
    const existing = await db.query.memories.findFirst({
      where: eq(memories.id, memoryId),
    });

    if (!existing) {
      return c.json<ErrorResponse>(
        {
          success: false,
          error: 'Memory not found',
        },
        404
      );
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.type !== undefined) updateData.type = input.type;
    if (input.title !== undefined) updateData.title = input.title;
    if (input.content !== undefined) updateData.content = input.content;
    if (input.metadata !== undefined) updateData.metadata = input.metadata;

    await db.update(memories)
      .set(updateData)
      .where(eq(memories.id, memoryId));

    // Update FTS table if title or content changed
    if (input.title !== undefined || input.content !== undefined) {
      const sqlite = getRawDb();
      const stmt = sqlite.prepare(`
        UPDATE memories_fts
        SET title = ?, content = ?
        WHERE memory_id = ?
      `);
      stmt.run(input.title ?? existing.title, input.content ?? existing.content, memoryId);
      sqlite.close();
    }

    const updated = await db.query.memories.findFirst({
      where: eq(memories.id, memoryId),
    });

    return c.json<SuccessResponse<{ memory: typeof updated }>>({
      success: true,
      data: { memory: updated },
    });
  } catch (error) {
    console.error('[API] Error updating memory:', error);
    return c.json<ErrorResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update memory',
      },
      500
    );
  }
});

/**
 * DELETE /api/memories/:id - Delete a memory
 */
memoriesRouter.delete('/:id', async (c) => {
  try {
    const memoryId = c.req.param('id');
    const db = getDb();

    // Verify memory exists
    const memory = await db.query.memories.findFirst({
      where: eq(memories.id, memoryId),
    });

    if (!memory) {
      return c.json<ErrorResponse>(
        {
          success: false,
          error: 'Memory not found',
        },
        404
      );
    }

    await db.delete(memories).where(eq(memories.id, memoryId));

    return c.json<SuccessResponse<{ message: string }>>({
      success: true,
      data: { message: 'Memory deleted successfully' },
    });
  } catch (error) {
    console.error('[API] Error deleting memory:', error);
    return c.json<ErrorResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete memory',
      },
      500
    );
  }
});
