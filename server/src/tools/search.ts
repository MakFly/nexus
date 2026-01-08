/**
 * Search MCP tools
 * Provides full-text search across memories using SQLite FTS5
 */

import { z } from 'zod/v4';
import { getDb, getRawDb } from '../storage/client.js';
import { memories, contexts } from '../storage/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { config } from '../config.js';

// Valid memory types
const memoryTypes = ['note', 'conversation', 'snippet', 'reference', 'task', 'idea'] as const;

// Zod schema for search
export const SearchSchema = z.object({
  query: z.string().min(1),
  contextId: z.string().optional(),
  type: z.enum(memoryTypes).optional(),
  limit: z.number().optional().default(20),
});

/**
 * Full-text search across memories
 */
export async function searchMemories(args: unknown): Promise<CallToolResult> {
  try {
    const input = SearchSchema.parse(args);
    const db = getDb();

    if (config.debug) {
      console.error('[DEBUG] Search input:', input);
    }

    const userMemories = await db.query.memories.findMany({
      columns: { id: true, contextId: true },
    });

    const userMemoryIds = userMemories.map(m => m.id);

    if (config.debug) {
      console.error('[DEBUG] Memory IDs:', userMemoryIds);
    }

    if (userMemoryIds.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              results: [],
              total: 0,
            }, null, 2),
          },
        ],
      };
    }

    // Build FTS5 query
    // Escape special characters in the query
    const escapedQuery = input.query.replace(/["']/g, '');

    if (config.debug) {
      console.error('[DEBUG] Escaped query:', escapedQuery);
    }

    // Execute FTS search using raw SQL
    const sqlite = getRawDb();

    // Build IN clause placeholder string
    const inPlaceholders = userMemoryIds.map(() => '?').join(',');

    // Note: FTS5 requires the table name (not alias) in the MATCH clause
    // Also, Bun SQLite doesn't work well with aliases in SELECT with bm25()
    const query = `
      SELECT
        memory_id,
        title,
        content,
        type,
        context_id,
        bm25(memories_fts) as rank
      FROM memories_fts
      WHERE memory_id IN (${inPlaceholders})
        AND memories_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `;

    if (config.debug) {
      console.error('[DEBUG] FTS query:', query);
      console.error('[DEBUG] Params:', [...userMemoryIds, escapedQuery, input.limit]);
    }

    let ftsResults: Array<{
      memory_id: string;
      title: string;
      content: string;
      type: string;
      context_id: string;
      rank: number;
    }> = [];

    try {
      // Use Bun's native SQL execution
      const params = [...userMemoryIds, escapedQuery, input.limit];
      const rows = sqlite.query(query).all(...params);

      if (config.debug) {
        console.error('[DEBUG] Raw rows:', rows);
      }

      ftsResults = rows as Array<{
        memory_id: string;
        title: string;
        content: string;
        type: string;
        context_id: string;
        rank: number;
      }>;
    } catch (err) {
      if (config.debug) {
        console.error('[DEBUG] FTS query error:', err);
      }
      sqlite.close();
      throw err;
    }

    if (config.debug) {
      console.error('[DEBUG] FTS results:', ftsResults);
    }

    sqlite.close();

    // Filter by contextId and type if specified
    let filteredResults = ftsResults;

    if (input.contextId) {
      filteredResults = filteredResults.filter(r => r.context_id === input.contextId);
    }

    if (input.type) {
      filteredResults = filteredResults.filter(r => r.type === input.type);
    }

    // If no results after filtering, return early
    if (filteredResults.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              results: [],
              total: 0,
              query: input.query,
            }, null, 2),
          },
        ],
      };
    }

    // Get full memory details and context information
    const memoryIds = filteredResults.map(r => r.memory_id);
    const contextIds = filteredResults.map(r => r.context_id);

    const [fullMemories, contextMap] = await Promise.all([
      // Get full memories
      db.query.memories.findMany({
        where: inArray(memories.id, memoryIds),
      }),
      // Get context information
      db.query.contexts.findMany({
        where: inArray(contexts.id, Array.from(new Set(contextIds))),
      }),
    ]);

    // Create a map of contexts for easy lookup
    const contextsById = new Map(contextMap.map(c => [c.id, c]));

    // Combine results
    const results = filteredResults.map(ftsResult => {
      const memory = fullMemories.find(m => m.id === ftsResult.memory_id);
      const context = contextsById.get(ftsResult.context_id);

      return {
        memory,
        context,
        score: ftsResult.rank,
      };
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            results,
            total: results.length,
            query: input.query,
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
 * Simple text search (fallback if FTS is not available)
 * Searches through memory titles and content
 */
export async function simpleSearch(args: unknown): Promise<CallToolResult> {
  try {
    const input = SearchSchema.parse(args);
    const db = getDb();

    const conditions = [];

    if (input.contextId) {
      conditions.push(eq(memories.contextId, input.contextId));
    }

    if (input.type) {
      conditions.push(eq(memories.type, input.type));
    }

    const allMemories = await db.query.memories.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      limit: input.limit * 10,
    });

    // Simple text matching
    const queryLower = input.query.toLowerCase();
    const results = allMemories
      .filter(memory =>
        memory.title.toLowerCase().includes(queryLower) ||
        memory.content.toLowerCase().includes(queryLower)
      )
      .slice(0, input.limit)
      .map(memory => ({
        memory,
        score: 0, // No relevance score for simple search
      }));

    // Get context information
    const contextIds = Array.from(new Set(results.map(r => r.memory.contextId)));
    const contextData = await db.query.contexts.findMany({
      where: inArray(contexts.id, contextIds),
    });

    const contextsById = new Map(contextData.map(c => [c.id, c]));

    // Attach context to results
    const resultsWithContext = results.map(result => ({
      ...result,
      context: contextsById.get(result.memory.contextId),
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            results: resultsWithContext,
            total: resultsWithContext.length,
            query: input.query,
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
 * Fuzzy search schema
 */
export const FuzzySearchSchema = z.object({
  query: z.string().min(1),
  contextId: z.string().optional(),
  type: z.enum(memoryTypes).optional(),
  limit: z.number().optional().default(20),
  tolerance: z.number().min(0).max(10).default(2).optional(),
});

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // Create a matrix
  const matrix: number[][] = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  // Fill the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate fuzzy score (0-1) between query and text
 * Uses Levenshtein distance normalized by string length
 */
function calculateFuzzyScore(query: string, text: string): number {
  const distance = levenshteinDistance(query.toLowerCase(), text.toLowerCase());
  const maxLength = Math.max(query.length, text.length);
  if (maxLength === 0) return 1;
  return 1 - distance / maxLength;
}

/**
 * Fuzzy search across memories using Levenshtein distance
 * Tolerates typos and partial matches
 */
export async function fuzzySearchMemories(args: unknown): Promise<CallToolResult> {
  try {
    const input = FuzzySearchSchema.parse(args);
    const db = getDb();

    if (config.debug) {
      console.error('[DEBUG] Fuzzy search input:', input);
    }

    const conditions = [];

    if (input.contextId) {
      conditions.push(eq(memories.contextId, input.contextId));
    }

    if (input.type) {
      conditions.push(eq(memories.type, input.type));
    }

    // Get all candidate memories
    const allMemories = await db.query.memories.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      limit: input.limit * 20, // Get more candidates for fuzzy matching
    });

    if (config.debug) {
      console.error('[DEBUG] Candidate memories:', allMemories.length);
    }

    // Calculate fuzzy scores for each memory
    const query = input.query.toLowerCase();
    const scoredResults = allMemories
      .map(memory => {
        let bestScore = 0;

        // Search in title
        const titleScore = calculateFuzzyScore(query, memory.title);
        bestScore = Math.max(bestScore, titleScore);

        // Search in content
        const contentScore = calculateFuzzyScore(query, memory.content);
        bestScore = Math.max(bestScore, contentScore);

        // Search in tags (if present)
        if (memory.metadata?.tags && Array.isArray(memory.metadata.tags)) {
          const tags = memory.metadata.tags.join(' ');
          const tagScore = calculateFuzzyScore(query, tags);
          bestScore = Math.max(bestScore, tagScore);
        }

        return {
          memory,
          score: bestScore,
        };
      })
      .filter(result => {
        // Filter results based on tolerance
        // For short terms (< 5 chars), be more strict
        // For longer terms, allow more tolerance
        const maxDistance = query.length < 5 ? input.tolerance : Math.floor(query.length * 0.4);
        const minScore = 1 - (maxDistance / query.length);
        return result.score >= minScore;
      })
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .slice(0, input.limit);

    if (config.debug) {
      console.error('[DEBUG] Scored results:', scoredResults.length);
    }

    // Get context information
    const contextIds = Array.from(new Set(scoredResults.map(r => r.memory.contextId)));
    const contextData = await db.query.contexts.findMany({
      where: inArray(contexts.id, contextIds),
    });

    const contextsById = new Map(contextData.map(c => [c.id, c]));

    // Attach context to results
    const resultsWithContext = scoredResults.map(result => ({
      ...result,
      context: contextsById.get(result.memory.contextId),
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            results: resultsWithContext,
            total: resultsWithContext.length,
            query: input.query,
            algorithm: 'levenshtein',
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
