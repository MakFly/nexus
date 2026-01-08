/**
 * Context management MCP tools
 * Provides create, list, get, and delete operations for contexts
 */

import { z } from 'zod/v4';
import { getDb, generateId } from '../storage/client.js';
import { contexts } from '../storage/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// Zod schemas for validation
export const CreateContextSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  stack: z.enum(['nextjs', 'laravel', 'symfony', 'react19', 'vuejs', 'devops', 'php-api-platform', 'basic', 'search', 'automation', 'advanced']).optional(),
  difficulty: z.enum(['easy', 'normal', 'hard']).optional(),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

export const GetContextSchema = z.object({
  contextId: z.string(),
});

export const ListContextsSchema = z.object({
  limit: z.number().optional().default(50),
  offset: z.number().optional().default(0),
});

export const DeleteContextSchema = z.object({
  contextId: z.string(),
});

export const UpdateContextSchema = z.object({
  contextId: z.string(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  stack: z.enum(['nextjs', 'laravel', 'symfony', 'react19', 'vuejs', 'devops', 'php-api-platform', 'basic', 'search', 'automation', 'advanced']).optional(),
  difficulty: z.enum(['easy', 'normal', 'hard']).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Create a new context
 */
export async function createContext(args: unknown): Promise<CallToolResult> {
  try {
    const input = CreateContextSchema.parse(args);
    const db = getDb();

    const contextId = generateId();
    const now = new Date();

    await db.insert(contexts).values({
      id: contextId,
      name: input.name,
      description: input.description,
      tags: input.tags,
      stack: input.stack,
      difficulty: input.difficulty,
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
    });

    const context = await db.query.contexts.findFirst({
      where: eq(contexts.id, contextId),
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            context,
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
 * Get a context by ID
 */
export async function getContext(args: unknown): Promise<CallToolResult> {
  try {
    const input = GetContextSchema.parse(args);
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

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            context,
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
 * List all contexts for the current user
 */
export async function listContexts(args: unknown): Promise<CallToolResult> {
  try {
    const input = ListContextsSchema.parse(args);
    const db = getDb();

    const allContexts = await db.query.contexts.findMany({
      orderBy: [desc(contexts.updatedAt)],
      limit: input.limit,
      offset: input.offset,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            contexts: allContexts,
            total: allContexts.length,
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
 * Delete a context
 */
export async function deleteContext(args: unknown): Promise<CallToolResult> {
  try {
    const input = DeleteContextSchema.parse(args);
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

    await db.delete(contexts).where(eq(contexts.id, input.contextId));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Context deleted successfully',
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
 * Update an existing context
 */
export async function updateContext(args: unknown): Promise<CallToolResult> {
  try {
    const input = UpdateContextSchema.parse(args);
    const db = getDb();

    const existing = await db.query.contexts.findFirst({
      where: eq(contexts.id, input.contextId),
    });

    if (!existing) {
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

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.tags !== undefined) updateData.tags = input.tags;
    if (input.stack !== undefined) updateData.stack = input.stack;
    if (input.difficulty !== undefined) updateData.difficulty = input.difficulty;
    if (input.metadata !== undefined) updateData.metadata = input.metadata;

    await db.update(contexts)
      .set(updateData)
      .where(eq(contexts.id, input.contextId));

    const updated = await db.query.contexts.findFirst({
      where: eq(contexts.id, input.contextId),
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            context: updated,
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
