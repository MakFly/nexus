/**
 * Find relationships tool
 * Finds connections between memories using content similarity and existing relationships
 */

import { z } from 'zod/v4';
import { getDb } from '../storage/client.js';
import { memories, relationships, contexts } from '../storage/schema.js';
import { eq, and, or, sql } from 'drizzle-orm';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export const FindRelationshipsSchema = z.object({
  memoryId: z.string(),
  threshold: z.number().optional().default(0.3),
  limit: z.number().optional().default(10),
  createRelationships: z.boolean().optional().default(false),
});

/**
 * Tokenize text into terms
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\sàâäéèêëïîôùûüç]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

/**
 * Calculate Jaccard similarity between two texts
 */
function jaccardSimilarity(text1: string, text2: string): number {
  const terms1 = new Set(tokenize(text1));
  const terms2 = new Set(tokenize(text2));

  const intersection = new Set([...terms1].filter(x => terms2.has(x)));
  const union = new Set([...terms1, ...terms2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Find existing relationships for a memory
 */
async function getExistingRelationships(db: any, memoryId: string) {
  return await db.query.relationships.findMany({
    where: or(
      eq(relationships.sourceId, memoryId),
      eq(relationships.targetId, memoryId)
    ),
  });
}

/**
 * Find similar memories based on content
 */
async function findSimilarMemories(
  db: any,
  sourceMemory: any,
  threshold: number,
  limit: number
): Promise<any[]> {
  const allMemories = await db.query.memories.findMany({
    where: sql`${memories.id} != ${sourceMemory.id}`,
    with: {
      context: true,
    },
  });

  // Calculate similarities
  const similarities = allMemories.map(memory => {
    const titleSimilarity = jaccardSimilarity(sourceMemory.title, memory.title);
    const contentSimilarity = jaccardSimilarity(sourceMemory.content, memory.content);

    // Weighted: 30% title, 70% content
    const combinedSimilarity = 0.3 * titleSimilarity + 0.7 * contentSimilarity;

    return {
      memory,
      similarity: combinedSimilarity,
      titleSimilarity,
      contentSimilarity,
    };
  });

  // Filter and sort
  return similarities
    .filter(s => s.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * Create a relationship between two memories
 */
async function createRelationship(
  db: any,
  sourceId: string,
  targetId: string,
  similarity: number
): Promise<any> {
  const { generateId } = await import('../storage/client.js');

  // Determine relationship type based on similarity
  let type = 'related';
  if (similarity > 0.7) type = 'includes';
  else if (similarity > 0.5) type = 'references';

  const relationship = {
    id: generateId(),
    sourceId,
    targetId,
    type,
    strength: Math.round(similarity * 100),
  };

  await db.insert(relationships).values(relationship);
  return relationship;
}

/**
 * Find relationships for a memory
 */
export async function findRelationships(args: unknown): Promise<CallToolResult> {
  try {
    const input = FindRelationshipsSchema.parse(args);
    const db = getDb();

    const sourceMemory = await db.query.memories.findFirst({
      where: eq(memories.id, input.memoryId),
      with: {
        context: true,
      },
    });

    if (!sourceMemory) {
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

    // Get existing relationships
    const existingRels = await getExistingRelationships(db, input.memoryId);

    const similarMemories = await findSimilarMemories(
      db,
      sourceMemory,
      input.threshold,
      input.limit
    );

    // Create new relationships if requested
    const createdRelationships: any[] = [];

    if (input.createRelationships) {
      for (const similar of similarMemories) {
        // Check if relationship already exists
        const exists = existingRels.some(
          (rel: any) =>
            (rel.sourceId === input.memoryId && rel.targetId === similar.memory.id) ||
            (rel.targetId === input.memoryId && rel.sourceId === similar.memory.id)
        );

        if (!exists && similar.similarity > input.threshold) {
          const rel = await createRelationship(
            db,
            input.memoryId,
            similar.memory.id,
            similar.similarity
          );
          createdRelationships.push(rel);
        }
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            memory: {
              id: sourceMemory.id,
              title: sourceMemory.title,
              type: sourceMemory.type,
              context: sourceMemory.context?.name,
            },
            existingRelationships: existingRels.map(rel => {
              const isSource = rel.sourceId === input.memoryId;
              return {
                id: rel.id,
                type: rel.type,
                strength: rel.strength,
                relatedMemoryId: isSource ? rel.targetId : rel.sourceId,
                direction: isSource ? 'outgoing' : 'incoming',
              };
            }),
            suggestedRelationships: similarMemories.map(s => ({
              memory: {
                id: s.memory.id,
                title: s.memory.title,
                type: s.memory.type,
                context: s.memory.context?.name,
              },
              similarity: s.similarity,
              titleSimilarity: s.titleSimilarity,
              contentSimilarity: s.contentSimilarity,
            })),
            createdRelationships: createdRelationships.length > 0 ? createdRelationships : undefined,
            total: existingRels.length + similarMemories.length,
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
