/**
 * Context API Routes
 * Handles all context-related HTTP endpoints
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod/v4';
import { getDb } from '../storage/client.js';
import { contexts } from '../storage/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import type { ErrorResponse, SuccessResponse } from './middleware.js';

/**
 * Create context schema
 */
const createContextSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

/**
 * Update context schema
 */
const updateContextSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * List contexts query schema
 */
const listContextsSchema = z.object({
  limit: z.string().optional().transform((val) => val ? parseInt(val) : 50),
  offset: z.string().optional().transform((val) => val ? parseInt(val) : 0),
});

/**
 * Create context router
 */
export const contextsRouter = new Hono();

/**
 * GET /api/contexts - List all contexts
 */
contextsRouter.get('/', zValidator('query', listContextsSchema), async (c) => {
  try {
    const { limit, offset } = c.req.valid('query');
    const db = getDb();

    const allContexts = await db.query.contexts.findMany({
      orderBy: [desc(contexts.updatedAt)],
      limit,
      offset,
    });

    return c.json<SuccessResponse<{ contexts: typeof allContexts; total: number }>>({
      success: true,
      data: {
        contexts: allContexts,
        total: allContexts.length,
      },
    });
  } catch (error) {
    console.error('[API] Error listing contexts:', error);
    return c.json<ErrorResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list contexts',
      },
      500
    );
  }
});

/**
 * POST /api/contexts - Create a new context
 */
contextsRouter.post('/', zValidator('json', createContextSchema), async (c) => {
  try {
    const input = c.req.valid('json');
    const db = getDb();

    const contextId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();

    await db.insert(contexts).values({
      id: contextId,
      name: input.name,
      description: input.description,
      tags: input.tags,
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
    });

    const context = await db.query.contexts.findFirst({
      where: eq(contexts.id, contextId),
    });

    return c.json<SuccessResponse<{ context: typeof context }>>(
      {
        success: true,
        data: { context },
      },
      201
    );
  } catch (error) {
    console.error('[API] Error creating context:', error);
    return c.json<ErrorResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create context',
      },
      500
    );
  }
});

/**
 * GET /api/contexts/:id - Get a specific context
 */
contextsRouter.get('/:id', async (c) => {
  try {
    const contextId = c.req.param('id');
    const db = getDb();

    const context = await db.query.contexts.findFirst({
      where: eq(contexts.id, contextId),
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

    return c.json<SuccessResponse<{ context: typeof context }>>({
      success: true,
      data: { context },
    });
  } catch (error) {
    console.error('[API] Error getting context:', error);
    return c.json<ErrorResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get context',
      },
      500
    );
  }
});

/**
 * PUT /api/contexts/:id - Update a context
 */
contextsRouter.put('/:id', zValidator('json', updateContextSchema), async (c) => {
  try {
    const contextId = c.req.param('id');
    const input = c.req.valid('json');
    const db = getDb();

    // Verify context exists
    const existing = await db.query.contexts.findFirst({
      where: eq(contexts.id, contextId),
    });

    if (!existing) {
      return c.json<ErrorResponse>(
        {
          success: false,
          error: 'Context not found',
        },
        404
      );
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.tags !== undefined) updateData.tags = input.tags;
    if (input.metadata !== undefined) updateData.metadata = input.metadata;

    await db.update(contexts)
      .set(updateData)
      .where(eq(contexts.id, contextId));

    const updated = await db.query.contexts.findFirst({
      where: eq(contexts.id, contextId),
    });

    return c.json<SuccessResponse<{ context: typeof updated }>>({
      success: true,
      data: { context: updated },
    });
  } catch (error) {
    console.error('[API] Error updating context:', error);
    return c.json<ErrorResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update context',
      },
      500
    );
  }
});

/**
 * DELETE /api/contexts/:id - Delete a context
 */
contextsRouter.delete('/:id', async (c) => {
  try {
    const contextId = c.req.param('id');
    const db = getDb();

    // Verify context exists
    const context = await db.query.contexts.findFirst({
      where: eq(contexts.id, contextId),
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

    await db.delete(contexts).where(eq(contexts.id, contextId));

    return c.json<SuccessResponse<{ message: string }>>({
      success: true,
      data: { message: 'Context deleted successfully' },
    });
  } catch (error) {
    console.error('[API] Error deleting context:', error);
    return c.json<ErrorResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete context',
      },
      500
    );
  }
});
