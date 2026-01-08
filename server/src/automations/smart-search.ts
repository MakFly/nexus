/**
 * Smart Search Automation
 *
 * Provides intelligent search capabilities:
 * - Hybrid FTS5 + TF-IDF search
 * - Context-aware query expansion
 * - Result reranking and filtering
 * - Search analytics and suggestions
 */

import { getDb, getRawDb } from '../storage/client.js';
import { memories, contexts } from '../storage/schema.js';
import { eq, and, desc, or, sql } from 'drizzle-orm';
import { emitEvent, EventType } from '../events/index.js';

/**
 * Configuration for smart search
 */
export interface SmartSearchConfig {
  enabled: boolean;
  defaultLimit: number;
  ftsWeight: number; // Weight for FTS5 score (0-1)
  semanticWeight: number; // Weight for semantic score (0-1)
  minScore: number; // Minimum combined score
  useQueryExpansion: boolean;
  maxQueryExpansions: number;
}

const DEFAULT_CONFIG: SmartSearchConfig = {
  enabled: true,
  defaultLimit: 20,
  ftsWeight: 0.4,
  semanticWeight: 0.6,
  minScore: 0.1,
  useQueryExpansion: true,
  maxQueryExpansions: 3,
};

/**
 * Tokenize text
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\sàâäéèêëïîôùûüç]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

/**
 * Calculate TF-IDF vector
 */
function calculateTFIDF(
  text: string,
  corpusFreq: Map<string, number>,
  corpusSize: number
): Map<string, number> {
  const terms = tokenize(text);
  const termFreq = new Map<string, number>();

  // Calculate term frequency
  terms.forEach(term => {
    termFreq.set(term, (termFreq.get(term) || 0) + 1);
  });

  // Calculate TF-IDF
  const tfidf = new Map<string, number>();
  const maxFreq = Math.max(...termFreq.values());

  for (const [term, freq] of termFreq.entries()) {
    const tf = 0.5 + 0.5 * (freq / maxFreq);
    const idf = Math.log(corpusSize / (corpusFreq.get(term) || 1));
    tfidf.set(term, tf * idf);
  }

  return tfidf;
}

/**
 * Calculate cosine similarity
 */
function cosineSimilarity(
  vec1: Map<string, number>,
  vec2: Map<string, number>
): number {
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  const allTerms = new Set([...vec1.keys(), ...vec2.keys()]);

  for (const term of allTerms) {
    const v1 = vec1.get(term) || 0;
    const v2 = vec2.get(term) || 0;
    dotProduct += v1 * v2;
    norm1 += v1 * v1;
    norm2 += v2 * v2;
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  return denominator > 0 ? dotProduct / denominator : 0;
}

/**
 * Expand query with related terms
 */
function expandQuery(query: string, context?: string): string[] {
  const expansions = [query];

  // Add context-related terms if provided
  if (context) {
    const contextTerms = tokenize(context).slice(0, 5);
    if (contextTerms.length > 0) {
      expansions.push(`${query} ${contextTerms.join(' ')}`);
    }
  }

  // Add synonyms/expansions for common terms
  const synonyms: Record<string, string[]> = {
    'code': ['snippet', 'function', 'implementation'],
    'bug': ['error', 'issue', 'problem', 'fix'],
    'api': ['endpoint', 'service', 'interface'],
    'test': ['testing', 'spec', 'verify'],
  };

  const terms = tokenize(query);
  for (const term of terms) {
    if (synonyms[term]) {
      const synonymQuery = query.replace(term, synonyms[term].join(' '));
      expansions.push(synonymQuery);
    }
  }

  return expansions.slice(0, 3); // Max 3 expansions
}

/**
 * Smart search with hybrid ranking
 */
export async function smartSearch(
  query: string,
  options: {
    contextId?: string;
    type?: 'note' | 'conversation' | 'snippet' | 'reference' | 'task' | 'idea';
    limit?: number;
    minScore?: number;
    config?: Partial<SmartSearchConfig>;
  } = {}
): Promise<{
  results: Array<{
    memory: any;
    scores: {
      fts: number;
      semantic: number;
      combined: number;
    };
  }>;
  total: number;
  query: string;
  expanded: boolean;
}> {
  const finalConfig = { ...DEFAULT_CONFIG, ...options.config };

  if (!finalConfig.enabled) {
    return { results: [], total: 0, query, expanded: false };
  }

  const db = getDb();
  const limit = options.limit || finalConfig.defaultLimit;
  const minScore = options.minScore ?? finalConfig.minScore;

  // Build query conditions
  const conditions = [];

  if (options.contextId) {
    conditions.push(eq(memories.contextId, options.contextId));
  }

  if (options.type) {
    conditions.push(eq(memories.type, options.type));
  }

  // Query expansion
  const queries = finalConfig.useQueryExpansion
    ? expandQuery(query)
    : [query];

  // Execute FTS5 searches for each query
  const sqlite = getRawDb();
  const allResults: any[] = [];

  for (const q of queries) {
    const ftsQuery = q.replace(/[^\w\sàâäéèêëïîôùûüç]/g, ' ');

    let sql = `
      SELECT DISTINCT m.id, m.title, m.content, m.type, m.context_id,
             bm25(memories_fts) as fts_rank,
             c.name as context_name
      FROM memories m
      JOIN memories_fts ON m.id = memories_fts.memory_id
      LEFT JOIN contexts c ON m.context_id = c.id
      WHERE memories_fts MATCH ?
    `;

    const params = [ftsQuery];

    if (options.contextId) {
      sql += ' AND m.context_id = ?';
      params.push(options.contextId);
    }

    if (options.type) {
      sql += ' AND m.type = ?';
      params.push(options.type);
    }

    sql += ' ORDER BY fts_rank LIMIT ?';
    params.push(Math.min(limit * 2, 100));

    const rows = sqlite.query(sql).all(...params);
    allResults.push(...rows);
  }

  sqlite.close();

  if (allResults.length === 0) {
    return { results: [], total: 0, query, expanded: queries.length > 1 };
  }

  // Calculate corpus frequency for TF-IDF
  const corpusFreq = new Map<string, number>();
  const queryTerms = tokenize(query);

  for (const row of allResults) {
    const terms = tokenize(`${row.title} ${row.content}`);
    const uniqueTerms = new Set(terms);
    for (const term of uniqueTerms) {
      corpusFreq.set(term, (corpusFreq.get(term) || 0) + 1);
    }
  }

  // Calculate TF-IDF for query
  const queryTFIDF = calculateTFIDF(query, corpusFreq, allResults.length);

  // Calculate scores and deduplicate
  const resultScores = new Map<string, any>();

  for (const row of allResults) {
    // Skip if already processed
    if (resultScores.has(row.id)) continue;

    const memoryText = `${row.title} ${row.content}`;
    const memoryTFIDF = calculateTFIDF(memoryText, corpusFreq, allResults.length);
    const semanticScore = cosineSimilarity(queryTFIDF, memoryTFIDF);

    // Normalize FTS rank to 0-1
    const ftsScore = Math.max(0, 1 - (row.fts_rank / 100));

    // Combined score
    const combinedScore =
      finalConfig.semanticWeight * semanticScore +
      finalConfig.ftsWeight * ftsScore;

    resultScores.set(row.id, {
      ...row,
      fts_rank: row.fts_rank,
      semantic_score: semanticScore,
      combined_score: combinedScore,
    });
  }

  // Filter, sort, and limit
  const results = Array.from(resultScores.values())
    .filter(r => r.combined_score >= minScore)
    .sort((a, b) => b.combined_score - a.combined_score)
    .slice(0, limit);

  // Format results
  const formatted = results.map(r => ({
    memory: {
      id: r.id,
      title: r.title,
      content: r.content.substring(0, 500),
      type: r.type,
      contextId: r.context_id,
      contextName: r.context_name,
    },
    scores: {
      fts: r.fts_rank,
      semantic: r.semantic_score,
      combined: r.combined_score,
    },
  }));

  // Emit search event
  emitEvent(
    EventType.SEARCH_PERFORMED,
    {
      query,
      resultsCount: formatted.length,
      contextId: options.contextId,
      type: options.type,
    }
  );

  return {
    results: formatted,
    total: formatted.length,
    query,
    expanded: queries.length > 1,
  };
}

/**
 * Get search suggestions based on recent searches
 */
export async function getSearchSuggestions(
  partialQuery: string,
  limit = 5
): Promise<string[]> {
  const db = getDb();

  // Get recent memories
  const recentMemories = await db.query.memories.findMany({
    orderBy: [desc(memories.createdAt)],
    limit: 50,
  });

  // Extract terms from titles
  const terms = new Set<string>();
  for (const memory of recentMemories) {
    const titleTerms = tokenize(memory.title);
    for (const term of titleTerms) {
      if (term.startsWith(partialQuery.toLowerCase())) {
        terms.add(term);
      }
    }
  }

  // Convert to array and limit
  return Array.from(terms).slice(0, limit);
}

/**
 * Get search analytics
 */
export async function getSearchAnalytics(): Promise<{
  totalSearches: number;
  avgResultsCount: number;
  topQueries: Array<{ query: string; count: number }>;
  recentQueries: Array<{ query: string; timestamp: Date }>;
}> {
  // This would require storing search history in the database
  // For now, return placeholder data
  return {
    totalSearches: 0,
    avgResultsCount: 0,
    topQueries: [],
    recentQueries: [],
  };
}
