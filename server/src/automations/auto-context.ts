/**
 * Auto-Context Automation
 *
 * Automatically analyzes prompts and conversation to:
 * - Extract keywords and topics
 * - Match with existing contexts
 * - Create new contexts when needed
 * - Maintain active context state
 */

import { getDb, generateId } from '../storage/client.js';
import { contexts } from '../storage/schema.js';
import { eq, and, desc, or } from 'drizzle-orm';
import { emitEvent, EventType } from '../events/index.js';

/**
 * Configuration for auto-context
 */
export interface AutoContextConfig {
  enabled: boolean;
  autoCreateThreshold: number; // Min similarity to NOT create new context (0-1)
  keywordExtractionLimit: number;
  maxContextsToCheck: number;
}

const DEFAULT_CONFIG: AutoContextConfig = {
  enabled: true,
  autoCreateThreshold: 0.5,
  keywordExtractionLimit: 10,
  maxContextsToCheck: 20,
};

/**
 * Stopwords for filtering
 */
const STOPWORDS = new Set([
  // French
  'avec', 'pour', 'dans', 'vers', 'mais', 'donc', 'or', 'ni', 'car',
  'que', 'qui', 'quoi', 'dont', 'où', 'lorsque', 'puisque', 'alors',
  'le', 'la', 'les', 'un', 'une', 'des', 'ce', 'cet', 'cette', 'ces',
  'mon', 'ton', 'son', 'ma', 'ta', 'sa', 'mes', 'tes', 'ses',
  'tout', 'tous', 'toute', 'toutes', 'aucun', 'aucune',
  // English
  'this', 'that', 'with', 'from', 'have', 'they', 'will', 'would',
  'there', 'their', 'what', 'when', 'where', 'which', 'while',
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  // Common tech terms
  'use', 'make', 'get', 'can', 'just', 'like', 'want', 'need'
]);

/**
 * Extract keywords from text using TF-IDF approach
 */
export function extractKeywords(text: string, limit = 10): string[] {
  // Tokenize
  const words = text
    .toLowerCase()
    .replace(/[^\w\sàâäéèêëïîôùûüç]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOPWORDS.has(w));

  // Count frequencies
  const freq = new Map<string, number>();
  words.forEach(w => {
    freq.set(w, (freq.get(w) || 0) + 1);
  });

  // Sort by frequency and return top N
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

/**
 * Calculate similarity between two keyword sets
 */
export function calculateKeywordSimilarity(
  keywords1: string[],
  keywords2: string[]
): number {
  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Calculate similarity between text and context
 */
function calculateContextSimilarity(
  text: string,
  context: any
): number {
  const textKeywords = extractKeywords(text);

  // Build context keywords from name, description, tags
  const contextText = [
    context.name,
    context.description || '',
    ...context.tags,
  ].join(' ');

  const contextKeywords = extractKeywords(contextText);

  return calculateKeywordSimilarity(textKeywords, contextKeywords);
}

/**
 * Find matching contexts for given text
 */
async function findMatchingContexts(
  db: any,
  text: string,
  limit: number
): Promise<Array<{ context: any; score: number }>> {
  const allContexts = await db.query.contexts.findMany({
    orderBy: [desc(contexts.updatedAt)],
    limit: limit * 2, // Get more to filter
  });

  const scored = allContexts
    .map(ctx => ({
      context: ctx,
      score: calculateContextSimilarity(text, ctx),
    }))
    .filter(sc => sc.score > 0.2) // Min threshold
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

/**
 * State management for active context
 */
class ActiveContextManager {
  private activeContextId: string | null = null;
  private contextHistory: Array<{ contextId: string; timestamp: Date }> = [];

  setActiveContext(contextId: string): void {
    this.activeContextId = contextId;
    this.contextHistory.push({ contextId, timestamp: new Date() });

    // Keep only last 10
    if (this.contextHistory.length > 10) {
      this.contextHistory.shift();
    }
  }

  getActiveContext(): string | null {
    return this.activeContextId;
  }

  getRecentContexts(limit = 5): string[] {
    return this.contextHistory
      .slice(-limit)
      .reverse()
      .map(h => h.contextId);
  }

  clear(): void {
    this.activeContextId = null;
    this.contextHistory = [];
  }
}

const contextManager = new ActiveContextManager();

/**
 * Suggest or create a context based on text analysis
 */
export async function analyzeAndSuggestContext(
  text: string,
  config: Partial<AutoContextConfig> = {}
): Promise<{
  action: 'existing' | 'new' | 'none';
  context?: any;
  score?: number;
  keywords?: string[];
  suggestion?: {
    name: string;
    description: string;
    tags: string[];
  };
}> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  if (!finalConfig.enabled) {
    return { action: 'none' };
  }

  const db = getDb();

  // Extract keywords
  const keywords = extractKeywords(text, finalConfig.keywordExtractionLimit);

  if (keywords.length === 0) {
    return { action: 'none' };
  }

  // Find matching contexts
  const matches = await findMatchingContexts(
    db,
    text,
    finalConfig.maxContextsToCheck
  );

  // Check if we have a good match
  if (matches.length > 0 && matches[0].score >= finalConfig.autoCreateThreshold) {
    const best = matches[0];

    // Update active context
    contextManager.setActiveContext(best.context.id);

    // Emit event
    emitEvent(
      EventType.CONTEXT_UPDATED,
      { context: best.context, matched: true }
    );

    return {
      action: 'existing',
      context: best.context,
      score: best.score,
      keywords,
    };
  }

  // No good match, suggest creating a new context
  const primaryKeyword = keywords[0];
  const suggestedName = `${primaryKeyword.charAt(0).toUpperCase() + primaryKeyword.slice(1)}`;
  const suggestedDescription = `Auto-generated context based on: ${keywords.slice(0, 5).join(', ')}`;
  const suggestedTags = keywords.slice(0, 5);

  return {
    action: 'new',
    keywords,
    suggestion: {
      name: suggestedName,
      description: suggestedDescription,
      tags: suggestedTags,
    },
    alternatives: matches.slice(0, 3).map(m => ({
      context: m.context,
      score: m.score,
    })),
  };
}

/**
 * Automatically create a context from suggestion
 */
export async function createAutoContext(
  name: string,
  description: string,
  tags: string[] = []
): Promise<any> {
  const db = getDb();

  const contextId = generateId();
  const now = new Date();

  await db.insert(contexts).values({
    id: contextId,
    name,
    description,
    tags: ['auto-generated', ...tags],
    metadata: {
      autoGenerated: true,
      createdAt: now.toISOString(),
    },
    createdAt: now,
    updatedAt: now,
  });

  const created = await db.query.contexts.findFirst({
    where: eq(contexts.id, contextId),
  });

  // Set as active
  contextManager.setActiveContext(contextId);

  // Emit event
  emitEvent(
    EventType.CONTEXT_CREATED,
    { context: created, autoGenerated: true }
  );

  return created;
}

/**
 * Get the currently active context
 */
export function getActiveContext(): string | null {
  return contextManager.getActiveContext();
}

/**
 * Get recent context history
 */
export function getRecentContexts(limit = 5): string[] {
  return contextManager.getRecentContexts(limit);
}

/**
 * Manually set the active context
 */
export function setActiveContext(contextId: string): void {
  contextManager.setActiveContext(contextId);
}

/**
 * Clear active context
 */
export function clearActiveContext(): void {
  contextManager.clear();
}

/**
 * Process a prompt and auto-manage context
 */
export async function processPromptWithContext(
  prompt: string,
  config?: Partial<AutoContextConfig>
): Promise<{
  context?: any;
  action: 'existing' | 'new' | 'none';
  shouldCreate: boolean;
}> {
  const result = await analyzeAndSuggestContext(prompt, config);

  if (result.action === 'existing') {
    return {
      context: result.context,
      action: 'existing',
      shouldCreate: false,
    };
  }

  if (result.action === 'new') {
    return {
      action: 'new',
      shouldCreate: true,
      suggestion: result.suggestion,
    };
  }

  return {
    action: 'none',
    shouldCreate: false,
  };
}
