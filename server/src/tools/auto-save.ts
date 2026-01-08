/**
 * Auto-save memory tool
 * Intelligently saves content with duplicate detection
 */

import { z } from 'zod/v4';
import { getDb, getRawDb, generateId } from '../storage/client.js';
import { memories, contexts } from '../storage/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export const AutoSaveMemorySchema = z.object({
  content: z.string().min(1),
  contextId: z.string().optional(),
  type: z.enum(['note', 'conversation', 'snippet', 'reference', 'task', 'idea']).optional(),
  title: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional().default({}),
  checkDuplicates: z.boolean().optional().default(true),
  duplicateThreshold: z.number().optional().default(0.8),
});

/**
 * Tokenize text for comparison
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\sàâäéèêëïîôùûüç]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

/**
 * Calculate similarity between two texts
 */
function calculateSimilarity(text1: string, text2: string): number {
  const terms1 = new Set(tokenize(text1));
  const terms2 = new Set(tokenize(text2));

  const intersection = new Set([...terms1].filter(x => terms2.has(x)));
  const union = new Set([...terms1, ...terms2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Check for duplicates in the database
 */
async function findDuplicates(
  db: any,
  content: string,
  title: string | undefined,
  threshold: number
): Promise<any[]> {
  const recentMemories = await db.query.memories.findMany({
    orderBy: [desc(memories.createdAt)],
    limit: 100,
  });

  const duplicates: any[] = [];

  for (const memory of recentMemories) {
    const contentSimilarity = calculateSimilarity(content, memory.content);

    // If title is provided, also compare titles
    const titleSimilarity = title
      ? calculateSimilarity(title, memory.title)
      : 0;

    // Combined score: 70% content, 30% title (if title provided)
    const combinedSimilarity = title
      ? 0.7 * contentSimilarity + 0.3 * titleSimilarity
      : contentSimilarity;

    if (combinedSimilarity >= threshold) {
      duplicates.push({
        memory,
        similarity: combinedSimilarity,
        contentSimilarity,
        titleSimilarity,
      });
    }
  }

  return duplicates.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Generate a title from content if not provided
 */
function generateTitle(content: string): string {
  const lines = content.split('\n');

  // Try markdown header
  for (const line of lines) {
    const headerMatch = line.match(/^#+\s+(.+)$/);
    if (headerMatch) {
      return headerMatch[1].trim();
    }
  }

  // Try bold header
  for (const line of lines) {
    const boldMatch = line.match(/\*\*([^*]+)\*\*:/);
    if (boldMatch) {
      return boldMatch[1].trim();
    }
  }

  // Use first line, truncated
  const firstLine = lines[0].trim();
  if (firstLine.length > 0 && firstLine.length < 100) {
    return firstLine;
  }

  // Use first few words
  const words = content.split(/\s+/).slice(0, 8);
  return words.join(' ') + (content.split(/\s+/).length > 8 ? '...' : '');
}

/**
 * Detect memory type from content if not provided
 */
function detectMemoryType(content: string): 'note' | 'conversation' | 'snippet' | 'reference' | 'task' | 'idea' {
  const lower = content.toLowerCase();

  // Check for code patterns
  if (content.includes('```') || /function\s+\w+|class\s+\w+|def\s+\w+/.test(content)) {
    return 'snippet';
  }

  // Check for task/todo patterns
  if (/^-\s+\[\s*\]|todo|task|fix|implement/.test(lower)) {
    return 'task';
  }

  // Check for conversation patterns
  if (/^(user|assistant|human|ai):\s*/im.test(content) || content.includes('said:')) {
    return 'conversation';
  }

  // Check for reference/citation patterns
  if (/https?:\/\/|doi:|isbn:|see also|refere/.test(lower)) {
    return 'reference';
  }

  // Check for idea/brainstorm patterns
  if (/idea:?|brainstorm|what if|maybe we could|suggest/.test(lower)) {
    return 'idea';
  }

  // Default to note
  return 'note';
}

/**
 * Auto-save memory with duplicate detection
 */
export async function autoSaveMemory(args: unknown): Promise<CallToolResult> {
  try {
    const input = AutoSaveMemorySchema.parse(args);
    const db = getDb();

    let duplicate: any = null;

    if (input.checkDuplicates) {
      const duplicates = await findDuplicates(
        db,
        input.content,
        input.title,
        input.duplicateThreshold
      );

      if (duplicates.length > 0) {
        duplicate = duplicates[0];
      }
    }

    // If duplicate found, return it instead of creating new memory (compact response)
    if (duplicate) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              duplicate: true,
              memory: {
                id: duplicate.memory.id,
                title: duplicate.memory.title,
                type: duplicate.memory.type,
                contextId: duplicate.memory.contextId,
                createdAt: duplicate.memory.createdAt,
              },
              similarity: duplicate.similarity,
              contentSimilarity: duplicate.contentSimilarity,
              titleSimilarity: duplicate.titleSimilarity,
              message: 'Duplicate memory found, not creating new one',
            }, null, 2),
          },
        ],
      };
    }

    // No duplicate, create new memory
    const title = input.title || generateTitle(input.content);
    const type = input.type || detectMemoryType(input.content);

    let contextId = input.contextId;
    if (!contextId) {
      const recentContexts = await db.query.contexts.findMany({
        orderBy: [desc(contexts.createdAt)],
        limit: 1,
      });

      if (recentContexts.length > 0) {
        contextId = recentContexts[0].id;
      } else {
        const newContextId = generateId();
        await db.insert(contexts).values({
          id: newContextId,
          name: 'General',
          description: 'Auto-created default context',
          tags: ['default'],
          metadata: { autoCreated: true },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        contextId = newContextId;
      }
    }

    // Create the memory
    const memoryId = generateId();
    const now = new Date();

    await db.insert(memories).values({
      id: memoryId,
      contextId,
      type,
      title,
      content: input.content,
      metadata: {
        ...input.metadata,
        autoGenerated: true,
        savedAt: now.toISOString(),
      },
      createdAt: now,
      updatedAt: now,
    });

    // Get the created memory
    const created = await db.query.memories.findFirst({
      where: eq(memories.id, memoryId),
      with: {
        context: true,
      },
    });

    // Update FTS index
    const sqlite = getRawDb();
    sqlite.run(
      'INSERT INTO memories_fts (id, memory_id, title, content, type, context_id) VALUES (?, ?, ?, ?, ?, ?)',
      generateId(),
      memoryId,
      title,
      input.content,
      type,
      contextId
    );
    sqlite.close();

    // Return compact response to save tokens (don't return full content)
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            duplicate: false,
            memory: {
              id: created.id,
              title: created.title,
              type: created.type,
              contextId: created.contextId,
              stack: created.stack,
              difficulty: created.difficulty,
              createdAt: created.createdAt,
            },
            message: 'Memory saved successfully',
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
