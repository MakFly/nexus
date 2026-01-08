/**
 * Smart search tool
 * Combines FTS5 full-text search with TF-IDF similarity for better ranking
 */

import { z } from 'zod/v4';
import { getDb, getRawDb } from '../storage/client.js';
import { memories, contexts } from '../storage/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export const SmartSearchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().optional().default(20),
  contextId: z.string().optional(),
  type: z.enum(['note', 'conversation', 'snippet', 'reference', 'task', 'idea']).optional(),
  minScore: z.number().optional().default(0.1),
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
 * Calculate TF-IDF vector for a text
 */
function calculateTFIDF(text: string, corpusFreq: Map<string, number>, corpusSize: number): Map<string, number> {
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
 * Calculate cosine similarity between two TF-IDF vectors
 */
function cosineSimilarity(vec1: Map<string, number>, vec2: Map<string, number>): number {
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
 * Smart search combining FTS5 and TF-IDF
 */
export async function smartSearch(args: unknown): Promise<CallToolResult> {
  try {
    const input = SmartSearchSchema.parse(args);
    const db = getDb();

    const conditions = [];

    if (input.contextId) {
      conditions.push(eq(memories.contextId, input.contextId));
    }

    if (input.type) {
      conditions.push(eq(memories.type, input.type));
    }

    // Step 1: FTS5 search for initial candidate set
    const sqlite = getRawDb();
    const ftsQuery = input.query.replace(/[^\w\sàâäéèêëïîôùûüç]/g, ' ');

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

    if (input.contextId) {
      sql += ' AND m.context_id = ?';
      params.push(input.contextId);
    }

    if (input.type) {
      sql += ' AND m.type = ?';
      params.push(input.type);
    }

    sql += ' ORDER BY fts_rank LIMIT ?';
    params.push(Math.min(input.limit * 2, 100)); // Get more candidates for re-ranking

    const rows = sqlite.query(sql).all(...params) as any[];
    sqlite.close();

    if (rows.length === 0) {
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

    // Step 2: Calculate corpus frequency for TF-IDF
    const corpusFreq = new Map<string, number>();
    const queryTerms = tokenize(input.query);

    for (const row of rows) {
      const terms = tokenize(`${row.title} ${row.content}`);
      const uniqueTerms = new Set(terms);
      for (const term of uniqueTerms) {
        corpusFreq.set(term, (corpusFreq.get(term) || 0) + 1);
      }
    }

    // Step 3: Calculate TF-IDF for query and each result
    const queryTFIDF = calculateTFIDF(input.query, corpusFreq, rows.length);

    const results = rows.map(row => {
      const memoryText = `${row.title} ${row.content}`;
      const memoryTFIDF = calculateTFIDF(memoryText, corpusFreq, rows.length);
      const semanticScore = cosineSimilarity(queryTFIDF, memoryTFIDF);

      // Combine FTS rank (lower is better) with semantic score
      // Normalize FTS rank to 0-1 range
      const ftsScore = Math.max(0, 1 - (row.fts_rank / 100));

      // Weighted combination: 60% semantic, 40% FTS
      const combinedScore = 0.6 * semanticScore + 0.4 * ftsScore;

      return {
        ...row,
        fts_rank: row.fts_rank,
        semantic_score: semanticScore,
        combined_score: combinedScore,
      };
    });

    // Step 4: Sort by combined score and filter
    const filtered = results
      .filter(r => r.combined_score >= input.minScore)
      .sort((a, b) => b.combined_score - a.combined_score)
      .slice(0, input.limit);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            results: filtered.map(r => ({
              id: r.id,
              title: r.title,
              content: r.content.substring(0, 500),
              type: r.type,
              contextId: r.context_id,
              contextName: r.context_name,
              scores: {
                fts: r.fts_rank,
                semantic: r.semantic_score,
                combined: r.combined_score,
              },
            })),
            total: filtered.length,
            query: input.query,
            method: 'hybrid_fts_tfidf',
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
