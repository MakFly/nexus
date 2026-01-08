/**
 * Progressive Memory Protocol v2 (PMP2) Tools
 *
 * Token optimization tools for reducing Claude Code context usage:
 * - quick_search: Ultra-compact search (ID + score only)
 * - list_digests: 1-sentence summaries
 * - expand_memory: Full content with delta check
 * - session_stats: Token savings dashboard
 *
 * Target: 80%+ token reduction vs traditional memory access
 */

import { z } from 'zod/v4';
import { getDb, getRawDb, generateId } from '../storage/client.js';
import { memories } from '../storage/schema.js';
import { eq } from 'drizzle-orm';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// ============================================================================
// SESSION STATE MANAGEMENT
// ============================================================================

interface SessionState {
  sessionId: string;
  seenMemories: Set<string>;
  tokensSaved: number;
  totalTokensServed: number;
  searchQueries: number;
  expandRequests: number;
  createdAt: Date;
}

// Global session state (persists across tool calls)
const sessions = new Map<string, SessionState>();

// Default session for single-user mode
let defaultSessionId: string | null = null;

/**
 * Get or create session state
 */
function getSession(sessionId?: string): SessionState {
  const id = sessionId || defaultSessionId || generateId();

  if (!defaultSessionId) {
    defaultSessionId = id;
  }

  if (!sessions.has(id)) {
    sessions.set(id, {
      sessionId: id,
      seenMemories: new Set(),
      tokensSaved: 0,
      totalTokensServed: 0,
      searchQueries: 0,
      expandRequests: 0,
      createdAt: new Date(),
    });
  }

  return sessions.get(id)!;
}

/**
 * Estimate tokens from string length (1 token ≈ 4 chars)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Generate a digest from content (first sentence, max 80 chars)
 */
export function generateDigest(content: string): string {
  // Skip code blocks
  let text = content.replace(/```[\s\S]*?```/g, '').trim();

  // Get first sentence
  const sentenceEnd = text.search(/[.!?]\s/);
  if (sentenceEnd > 0 && sentenceEnd < 100) {
    text = text.substring(0, sentenceEnd + 1);
  } else if (text.length > 80) {
    text = text.substring(0, 77) + '...';
  }

  return text.trim();
}

// ============================================================================
// QUICK SEARCH - Ultra-compact results (~15 tokens/result)
// ============================================================================

const QuickSearchSchema = z.object({
  query: z.string().min(1),
  contextId: z.string().optional(),
  type: z.enum(['note', 'conversation', 'snippet', 'reference', 'task', 'idea']).optional(),
  limit: z.number().optional().default(10),
  sessionId: z.string().optional(),
});

/**
 * Quick search - Returns only IDs, titles, and scores
 * ~15 tokens per result vs ~800 for full memory
 */
export async function quickSearch(args: unknown): Promise<CallToolResult> {
  try {
    const input = QuickSearchSchema.parse(args);
    const session = getSession(input.sessionId);
    session.searchQueries++;

    const sqlite = getRawDb();

    // Build FTS5 query
    let query = `
      SELECT
        m.id,
        m.title,
        m.type,
        bm25(memories_fts) as score,
        LENGTH(m.content) / 4 as tokens
      FROM memories_fts f
      JOIN memories m ON f.memory_id = m.id
      WHERE memories_fts MATCH ?
    `;

    const params: unknown[] = [input.query];

    if (input.contextId) {
      query += ` AND f.context_id = ?`;
      params.push(input.contextId);
    }

    if (input.type) {
      query += ` AND f.type = ?`;
      params.push(input.type);
    }

    query += ` ORDER BY bm25(memories_fts) LIMIT ?`;
    params.push(input.limit);

    const results = sqlite.prepare(query).all(...params) as Array<{
      id: string;
      title: string;
      type: string;
      score: number;
      tokens: number;
    }>;

    sqlite.close();

    // Calculate token savings
    const quickResultTokens = results.length * 15; // ~15 tokens per compact result
    const fullResultTokens = results.reduce((sum, r) => sum + r.tokens + 50, 0); // Full content + metadata
    session.tokensSaved += (fullResultTokens - quickResultTokens);
    session.totalTokensServed += quickResultTokens;

    // Normalize scores (BM25 returns negative values, lower = better)
    const normalizedResults = results.map(r => ({
      id: r.id,
      title: r.title,
      type: r.type,
      score: Math.round((1 / (1 + Math.abs(r.score))) * 100) / 100, // Normalize to 0-1
      tokens: r.tokens,
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            results: normalizedResults,
            count: results.length,
            tokensSaved: fullResultTokens - quickResultTokens,
            hint: 'Use list_digests(ids) for summaries, expand_memory(id) for full content',
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
            error: error instanceof Error ? error.message : 'Search failed',
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}

// ============================================================================
// LIST DIGESTS - 1-sentence summaries (~20 tokens/result)
// ============================================================================

const ListDigestsSchema = z.object({
  ids: z.array(z.string()).min(1).max(20),
  sessionId: z.string().optional(),
});

/**
 * List digests - Returns only IDs and 1-sentence summaries
 * ~20 tokens per result vs ~800 for full memory
 */
export async function listDigests(args: unknown): Promise<CallToolResult> {
  try {
    const input = ListDigestsSchema.parse(args);
    const session = getSession(input.sessionId);

    const sqlite = getRawDb();

    const placeholders = input.ids.map(() => '?').join(', ');
    const results = sqlite.prepare(`
      SELECT id, title, digest, LENGTH(content) / 4 as tokens
      FROM memories
      WHERE id IN (${placeholders})
    `).all(...input.ids) as Array<{
      id: string;
      title: string;
      digest: string | null;
      tokens: number;
    }>;

    sqlite.close();

    // Generate digests on-the-fly if missing
    const digests = results.map(r => ({
      id: r.id,
      title: r.title,
      digest: r.digest || `[No digest - ${r.tokens} tokens]`,
    }));

    // Calculate token savings
    const digestTokens = digests.length * 20;
    const fullTokens = results.reduce((sum, r) => sum + r.tokens + 50, 0);
    session.tokensSaved += (fullTokens - digestTokens);
    session.totalTokensServed += digestTokens;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            digests,
            count: digests.length,
            tokensSaved: fullTokens - digestTokens,
            hint: 'Use expand_memory(id) to get full content for selected memories',
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
            error: error instanceof Error ? error.message : 'Failed to list digests',
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}

// ============================================================================
// EXPAND MEMORY - Full content with delta check
// ============================================================================

const ExpandMemorySchema = z.object({
  id: z.string(),
  sessionId: z.string().optional(),
  force: z.boolean().optional().default(false), // Force re-fetch even if seen
});

/**
 * Expand memory - Returns full content, or reference if already seen
 * Delta check saves ~200+ tokens per duplicate request
 */
export async function expandMemory(args: unknown): Promise<CallToolResult> {
  try {
    const input = ExpandMemorySchema.parse(args);
    const session = getSession(input.sessionId);
    session.expandRequests++;

    // Delta check: return reference if already seen
    if (!input.force && session.seenMemories.has(input.id)) {
      const refTokens = 15; // Reference is ~15 tokens
      const savedTokens = 200; // Average memory is ~200 tokens
      session.tokensSaved += savedTokens;
      session.totalTokensServed += refTokens;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              type: 'reference',
              ref: `memory_${input.id}`,
              note: 'Already in context - use previous content',
              tokensSaved: savedTokens,
            }, null, 2),
          },
        ],
      };
    }

    // Fetch full memory
    const db = getDb();
    const memory = await db.query.memories.findFirst({
      where: eq(memories.id, input.id),
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

    // Mark as seen
    session.seenMemories.add(input.id);

    // Calculate tokens
    const memoryTokens = estimateTokens(JSON.stringify(memory));
    session.totalTokensServed += memoryTokens;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            type: 'full',
            memory: {
              id: memory.id,
              title: memory.title,
              content: memory.content,
              type: memory.type,
              digest: memory.digest,
              contextId: memory.contextId,
              stack: memory.stack,
              createdAt: memory.createdAt,
            },
            tokens: memoryTokens,
            note: 'Memory marked as seen - future requests will return reference',
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
            error: error instanceof Error ? error.message : 'Failed to expand memory',
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}

// ============================================================================
// SESSION STATS - Token savings dashboard
// ============================================================================

const SessionStatsSchema = z.object({
  sessionId: z.string().optional(),
  reset: z.boolean().optional().default(false),
});

/**
 * Session stats - Shows token savings for the current session
 */
export async function sessionStats(args: unknown): Promise<CallToolResult> {
  try {
    const input = SessionStatsSchema.parse(args);
    const session = getSession(input.sessionId);

    if (input.reset) {
      session.seenMemories.clear();
      session.tokensSaved = 0;
      session.totalTokensServed = 0;
      session.searchQueries = 0;
      session.expandRequests = 0;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'Session stats reset',
            }, null, 2),
          },
        ],
      };
    }

    const totalTokens = session.tokensSaved + session.totalTokensServed;
    const savingsPercent = totalTokens > 0
      ? Math.round((session.tokensSaved / totalTokens) * 100)
      : 0;

    const durationMs = Date.now() - session.createdAt.getTime();
    const durationMins = Math.round(durationMs / 60000);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            stats: {
              sessionId: session.sessionId,
              duration: `${durationMins} minutes`,
              searchQueries: session.searchQueries,
              expandRequests: session.expandRequests,
              uniqueMemoriesSeen: session.seenMemories.size,
              tokensServed: session.totalTokensServed,
              tokensSaved: session.tokensSaved,
              savingsPercent: `${savingsPercent}%`,
            },
            summary: `[PMP2] ${session.tokensSaved.toLocaleString()} tokens saved (${savingsPercent}% reduction)`,
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
            error: error instanceof Error ? error.message : 'Failed to get session stats',
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}

// ============================================================================
// CLEAR SESSION - Reset session state
// ============================================================================

const ClearSessionSchema = z.object({
  sessionId: z.string().optional(),
});

/**
 * Clear session - Resets session state for a fresh start
 */
export async function clearSession(args: unknown): Promise<CallToolResult> {
  try {
    const input = ClearSessionSchema.parse(args);
    const sessionId = input.sessionId || defaultSessionId;

    if (sessionId && sessions.has(sessionId)) {
      sessions.delete(sessionId);
    }

    if (sessionId === defaultSessionId) {
      defaultSessionId = null;
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Session cleared',
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
            error: error instanceof Error ? error.message : 'Failed to clear session',
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}

// Export all tools
export const pmp2Tools = {
  quickSearch,
  listDigests,
  expandMemory,
  sessionStats,
  clearSession,
};
