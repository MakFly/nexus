/**
 * Budget Mode Middleware - Sprint 6
 *
 * Token budget enforcement for API responses
 * Goal: Achieve x15 token savings through progressive disclosure
 */

// ==================== TYPES ====================

export interface BudgetOptions {
  maxTokens?: number;      // Maximum tokens to return
  compact?: boolean;       // Force compact mode (no full fields)
  estimateOnly?: boolean;  // Return estimate without enforcing
}

export interface BudgetResult<T = unknown> {
  data: T;
  tokensUsed: number;
  tokensRemaining: number;
  truncated: boolean;
  originalSize: number;
}

// ==================== TOKEN ESTIMATION ====================

/**
 * Rough token estimation (1 token ≈ 4 characters for English text)
 * More accurate than word count, less expensive than actual tokenization
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Approximate: 1 token ≈ 4 characters (conservative estimate)
  return Math.ceil(text.length / 4);
}

/**
 * Estimate tokens in JSON object
 */
export function estimateJsonTokens(obj: unknown): number {
  const json = JSON.stringify(obj);
  return estimateTokens(json);
}

// ==================== BUDGET ENFORCEMENT ====================

/**
 * Enforce budget on response data
 */
export function enforceBudget<T>(
  data: T,
  options: BudgetOptions
): BudgetResult<T> {
  const { maxTokens, compact, estimateOnly } = options;

  // No budget limit - return as-is
  if (!maxTokens && !compact) {
    const tokens = estimateJsonTokens(data);
    return {
      data,
      tokensUsed: tokens,
      tokensRemaining: Infinity,
      truncated: false,
      originalSize: tokens,
    };
  }

  // Estimate only mode
  if (estimateOnly) {
    const tokens = estimateJsonTokens(data);
    return {
      data,
      tokensUsed: tokens,
      tokensRemaining: maxTokens ? Math.max(0, maxTokens - tokens) : Infinity,
      truncated: maxTokens ? tokens > maxTokens : false,
      originalSize: tokens,
    };
  }

  // Compact mode - remove verbose fields
  let processed = compact ? compactData(data) : data;
  const compactTokens = estimateJsonTokens(processed);

  // No maxTokens specified but compact requested
  if (!maxTokens) {
    return {
      data: processed as T,
      tokensUsed: compactTokens,
      tokensRemaining: Infinity,
      truncated: false,
      originalSize: estimateJsonTokens(data),
    };
  }

  // Enforce maxTokens
  if (compactTokens <= maxTokens) {
    return {
      data: processed as T,
      tokensUsed: compactTokens,
      tokensRemaining: maxTokens - compactTokens,
      truncated: false,
      originalSize: estimateJsonTokens(data),
    };
  }

  // Over budget - truncate
  processed = truncateToFit(processed, maxTokens) as T;
  const finalTokens = estimateJsonTokens(processed);

  return {
    data: processed as T,
    tokensUsed: finalTokens,
    tokensRemaining: 0,
    truncated: true,
    originalSize: estimateJsonTokens(data),
  };
}

// ==================== DATA COMPACTION ====================

/**
 * Remove verbose fields from data structures
 */
function compactData(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data.map(compactItem);
  }

  if (data && typeof data === 'object') {
    const compacted: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      // Skip verbose fields
      if (['narrative', 'content', 'details', 'description'].includes(key)) {
        continue;
      }

      // Recursively compact nested objects
      if (typeof value === 'object' && value !== null) {
        compacted[key] = compactData(value);
      } else {
        compacted[key] = value;
      }
    }

    return compacted;
  }

  return data;
}

/**
 * Compact individual memory/pattern items
 */
function compactItem(item: unknown): unknown {
  if (!item || typeof item !== 'object') {
    return item;
  }

  const obj = item as Record<string, unknown>;

  // Memory compact format
  if ('id' in obj && 'summary' in obj && 'type' in obj) {
    return {
      id: obj.id,
      summary: obj.summary,
      type: obj.type,
      scope: obj.scope,
      confidence: obj.confidence,
      score: obj.score,
      created_at: obj.created_at,
    };
  }

  // Pattern compact format
  if ('id' in obj && 'intent' in obj && 'title' in obj) {
    return {
      id: obj.id,
      intent: obj.intent,
      title: obj.title,
      tags: obj.tags,
      success_rate: obj.success_rate,
      score: obj.score,
    };
  }

  // Default compaction
  return compactData(item);
}

// ==================== TRUNCATION ====================

/**
 * Truncate data to fit within token budget
 */
function truncateToFit(data: unknown, maxTokens: number): unknown {
  if (Array.isArray(data)) {
    // Truncate array
    const result: unknown[] = [];
    let currentTokens = 2; // Overhead for []

    for (const item of data) {
      const itemTokens = estimateJsonTokens(item);

      if (currentTokens + itemTokens > maxTokens) {
        // Try to fit a partial item
        const remaining = maxTokens - currentTokens - 10; // Reserve space
        if (remaining > 50) {
          result.push(truncateToFit(item, remaining));
        }
        break;
      }

      result.push(item);
      currentTokens += itemTokens;
    }

    return result;
  }

  if (data && typeof data === 'object') {
    // Truncate object fields
    const result: Record<string, unknown> = {};
    let currentTokens = 2; // Overhead for {}

    // Prioritize important fields
    const fieldPriority = ['id', 'summary', 'title', 'intent', 'type', 'scope', 'score'];

    for (const key of fieldPriority) {
      if (key in data) {
        const value = (data as Record<string, unknown>)[key];
        const valueTokens = estimateJsonTokens(value);

        if (currentTokens + valueTokens <= maxTokens) {
          result[key] = value;
          currentTokens += valueTokens;
        }
      }
    }

    // Add remaining fields if space
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (key in result) continue; // Already added

      const valueTokens = estimateJsonTokens(value);

      if (currentTokens + valueTokens <= maxTokens) {
        result[key] = value;
        currentTokens += valueTokens;
      }
    }

    return result;
  }

  // Truncate string
  if (typeof data === 'string') {
    const charsPerToken = 4;
    const maxChars = Math.floor(maxTokens * charsPerToken);
    if (data.length <= maxChars) {
      return data;
    }
    return data.substring(0, maxChars) + '...';
  }

  return data;
}

// ==================== HONO MIDDLEWARE ====================

import { Context, Next } from 'hono';

/**
 * Hono middleware to parse budget options from query params
 */
export async function budgetMiddleware(c: Context, next: Next) {
  const maxTokens = c.req.query('maxTokens');
  const compact = c.req.query('compact') === 'true';
  const estimateOnly = c.req.query('estimateOnly') === 'true';

  // Store budget options in context
  c.set('budget', {
    maxTokens: maxTokens ? parseInt(maxTokens) : undefined,
    compact,
    estimateOnly,
  } as BudgetOptions);

  await next();
}

/**
 * Helper to apply budget to response
 */
export function budgetResponse<T>(
  c: Context,
  data: T,
  options?: BudgetOptions
): Response {
  const budget = options || c.get('budget') as BudgetOptions || {};
  const result = enforceBudget(data, budget);

  // Add budget metadata headers
  c.header('X-Tokens-Used', String(result.tokensUsed));
  c.header('X-Tokens-Remaining', String(result.tokensRemaining));
  c.header('X-Truncated', String(result.truncated));
  c.header('X-Original-Size', String(result.originalSize));

  return c.json(result.data);
}
