/**
 * Auto-analyze context tool
 * Analyzes a conversation and suggests an appropriate context
 */

import { z } from 'zod/v4';
import { getDb } from '../storage/client.js';
import { contexts, memories } from '../storage/schema.js';
import { eq, or, like, desc } from 'drizzle-orm';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export const AutoAnalyzeContextSchema = z.object({
  conversation: z.array(z.string()).min(1),
  limit: z.number().optional().default(5),
});

/**
 * Extract keywords using simple TF-IDF-like approach
 */
function extractKeywords(texts: string[]): string[] {
  // Combine all texts
  const combined = texts.join(' ').toLowerCase();

  // Tokenize
  const words = combined
    .replace(/[^\w\sàâäéèêëïîôùûüç]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3);

  // Count frequencies
  const freq = new Map<string, number>();
  words.forEach(w => {
    freq.set(w, (freq.get(w) || 0) + 1);
  });

  // Filter stopwords
  const stopwords = new Set([
    'avec', 'pour', 'dans', 'vers', 'mais', 'donc', 'or', 'ni', 'car',
    'que', 'qui', 'quoi', 'dont', 'où', 'lorsque', 'puisque', 'alors',
    'this', 'that', 'with', 'from', 'have', 'they', 'will', 'would',
    'there', 'their', 'what', 'when', 'where', 'which', 'while',
    'être', 'avoir', 'faire', 'dire', 'voir', 'pouvoir'
  ]);

  // Sort by frequency and return top keywords
  return Array.from(freq.entries())
    .filter(([word]) => !stopwords.has(word))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Calculate Jaccard similarity between two keyword sets
 */
function calculateSimilarity(keywords1: string[], keywords2: string[]): number {
  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Suggest a context based on conversation analysis
 */
export async function autoAnalyzeContext(args: unknown): Promise<CallToolResult> {
  try {
    const input = AutoAnalyzeContextSchema.parse(args);
    const db = getDb();

    const keywords = extractKeywords(input.conversation);

    if (keywords.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              suggestedContext: null,
              message: 'Not enough content to analyze',
            }, null, 2),
          },
        ],
      };
    }

    const allContexts = await db.query.contexts.findMany();

    // Calculate similarity scores
    const scoredContexts = allContexts.map(ctx => {
      const ctxKeywords = [
        ctx.name,
        ctx.description || '',
        ...ctx.tags,
      ].join(' ').toLowerCase().split(/\s+/);

      return {
        context: ctx,
        score: calculateSimilarity(keywords, ctxKeywords),
      };
    });

    // Sort by score and filter
    const matches = scoredContexts
      .filter(sc => sc.score > 0.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, input.limit);

    // If we have a good match, return it
    if (matches.length > 0 && matches[0].score > 0.5) {
      const best = matches[0];
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              suggestedContext: {
                existing: best.context,
                score: best.score,
                keywords,
              },
              alternatives: matches.slice(1).map(m => ({
                context: m.context,
                score: m.score,
              })),
            }, null, 2),
          },
        ],
      };
    }

    // No good match, suggest creating a new context
    const primaryKeyword = keywords[0];
    const suggestedName = `${primaryKeyword.charAt(0).toUpperCase() + primaryKeyword.slice(1)}`;
    const suggestedDescription = `Context based on: ${keywords.slice(0, 5).join(', ')}`;
    const suggestedTags = keywords.slice(0, 5);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            suggestedContext: {
              new: {
                name: suggestedName,
                description: suggestedDescription,
                tags: suggestedTags,
              },
              keywords,
              score: 0,
            },
            similarContexts: matches.map(m => ({
              context: m.context,
              score: m.score,
            })),
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
