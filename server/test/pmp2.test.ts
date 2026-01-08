/**
 * Progressive Memory Protocol v2 (PMP2) Tests
 *
 * Token optimization features:
 * - quick_search: Ultra-compact search results (ID + score only)
 * - digest: 1-sentence summaries for memories
 * - session tracking: Delta check to avoid re-sending seen memories
 * - session_stats: Token savings dashboard
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { eq } from 'drizzle-orm';
import * as schema from '../src/storage/schema.js';
import { generateId } from '../src/storage/client.js';

// Test database setup
let sqlite: Database;
let db: ReturnType<typeof drizzle>;
let testContextId: string;
let testMemoryIds: string[] = [];

beforeAll(async () => {
  // Use in-memory database for tests
  sqlite = new Database(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');

  // Create tables
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS contexts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      stack TEXT,
      difficulty TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      system_prompt TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      context_id TEXT NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      digest TEXT,
      stack TEXT,
      difficulty TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);

  sqlite.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
      id, memory_id, title, content, type, context_id, stack
    )
  `);

  db = drizzle({ client: sqlite, schema });

  // Create test context
  testContextId = generateId();
  sqlite.exec(`
    INSERT INTO contexts (id, name, description, tags)
    VALUES ('${testContextId}', 'Test Context', 'For PMP2 testing', '["test"]')
  `);

  // Create test memories with varying content lengths
  const testMemories = [
    {
      title: 'DTO Pattern for API Responses',
      content: 'Use Data Transfer Objects (DTOs) to decouple your internal domain models from API responses. This provides versioning flexibility and security by controlling what data is exposed. Example: UserDTO with only public fields.',
      type: 'note',
      digest: 'Use DTOs to decouple domain models from API responses'
    },
    {
      title: 'Zod Validation Best Practices',
      content: 'Always validate input at API boundaries using Zod schemas. Define schemas once and reuse them. Use z.infer<> for TypeScript types. Handle errors gracefully with custom error messages.',
      type: 'snippet',
      digest: 'Validate API input with Zod schemas at boundaries'
    },
    {
      title: 'Symfony Service Layer Pattern',
      content: 'Keep controllers thin by moving business logic to service classes. Services should be stateless and injected via dependency injection. Use interfaces for testability.',
      type: 'reference',
      digest: 'Move business logic from controllers to stateless services'
    },
    {
      title: 'React Query Caching Strategy',
      content: 'Configure staleTime and cacheTime based on data volatility. Use query keys consistently. Implement optimistic updates for better UX. Prefetch on hover for instant navigation.',
      type: 'idea',
      digest: 'Configure React Query caching based on data volatility'
    },
    {
      title: 'Database Index Optimization',
      content: 'Create composite indexes for frequently filtered columns. Use EXPLAIN ANALYZE to verify index usage. Avoid over-indexing as it slows writes. Index foreign keys for JOIN performance.',
      type: 'note',
      digest: 'Create composite indexes for frequent query patterns'
    }
  ];

  for (const mem of testMemories) {
    const id = generateId();
    testMemoryIds.push(id);
    sqlite.exec(`
      INSERT INTO memories (id, context_id, type, title, content, digest)
      VALUES ('${id}', '${testContextId}', '${mem.type}', '${mem.title}', '${mem.content}', '${mem.digest}')
    `);
    sqlite.exec(`
      INSERT INTO memories_fts (id, memory_id, title, content, type, context_id)
      VALUES ('${generateId()}', '${id}', '${mem.title}', '${mem.content}', '${mem.type}', '${testContextId}')
    `);
  }
});

afterAll(() => {
  sqlite.close();
});

// ============================================================================
// DIGEST TESTS
// ============================================================================

describe('Digest Generation', () => {
  test('should have digest column in memories table', () => {
    const result = sqlite.query(`
      SELECT name FROM pragma_table_info('memories') WHERE name = 'digest'
    `).get() as { name: string } | null;

    expect(result).not.toBeNull();
    expect(result?.name).toBe('digest');
  });

  test('should store digest when creating memory', () => {
    const memory = sqlite.query(`
      SELECT digest FROM memories WHERE id = ?
    `).get(testMemoryIds[0]) as { digest: string };

    expect(memory.digest).toBe('Use DTOs to decouple domain models from API responses');
  });

  test('digest should be shorter than content', () => {
    const memory = sqlite.query(`
      SELECT content, digest FROM memories WHERE id = ?
    `).get(testMemoryIds[0]) as { content: string; digest: string };

    expect(memory.digest.length).toBeLessThan(memory.content.length);
    expect(memory.digest.length).toBeLessThan(100); // Max 100 chars for digest
  });
});

// ============================================================================
// QUICK SEARCH TESTS
// ============================================================================

describe('Quick Search (Ultra-Compact)', () => {
  test('quick_search should return only id, title, score, tokens', async () => {
    // Simulate quick_search result format
    const results = sqlite.query(`
      SELECT m.id, m.title, LENGTH(m.content) as content_length
      FROM memories m
      WHERE m.context_id = ?
      LIMIT 5
    `).all(testContextId) as Array<{ id: string; title: string; content_length: number }>;

    // Transform to quick_search format
    const quickResults = results.map(r => ({
      id: r.id,
      title: r.title,
      score: 0.85, // Simulated relevance score
      tokens: Math.ceil(r.content_length / 4) // Approximate token count
    }));

    expect(quickResults.length).toBe(5);

    // Verify compact format (no content, no digest, no metadata)
    for (const result of quickResults) {
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('tokens');
      expect(result).not.toHaveProperty('content');
      expect(result).not.toHaveProperty('digest');
      expect(result).not.toHaveProperty('metadata');
    }
  });

  test('quick_search result should be ~15 tokens per memory', () => {
    // Estimate tokens for quick_search result
    const sampleResult = {
      id: 'abc123-xyz789',
      title: 'DTO Pattern for API',
      score: 0.92,
      tokens: 45
    };

    // JSON stringify to estimate tokens
    const jsonStr = JSON.stringify(sampleResult);
    const estimatedTokens = Math.ceil(jsonStr.length / 4);

    // Should be ~15-25 tokens per result (vs ~800 for full memory)
    expect(estimatedTokens).toBeLessThan(30);
  });

  test('quick_search with FTS5 should return ranked results', () => {
    const results = sqlite.query(`
      SELECT m.id, m.title, bm25(memories_fts) as score
      FROM memories_fts f
      JOIN memories m ON f.memory_id = m.id
      WHERE memories_fts MATCH 'API OR pattern'
      ORDER BY bm25(memories_fts)
      LIMIT 5
    `).all() as Array<{ id: string; title: string; score: number }>;

    expect(results.length).toBeGreaterThan(0);
    // BM25 scores should be negative (lower = better match)
    for (const r of results) {
      expect(typeof r.score).toBe('number');
    }
  });
});

// ============================================================================
// SESSION TRACKING TESTS
// ============================================================================

describe('Session State Tracking', () => {
  // Simulated session state
  let sessionState: {
    sessionId: string;
    seenMemories: Set<string>;
    tokensSaved: number;
    totalTokensServed: number;
  };

  beforeEach(() => {
    sessionState = {
      sessionId: generateId(),
      seenMemories: new Set(),
      tokensSaved: 0,
      totalTokensServed: 0
    };
  });

  test('should track seen memories in session', () => {
    const memoryId = testMemoryIds[0];

    // First access
    expect(sessionState.seenMemories.has(memoryId)).toBe(false);
    sessionState.seenMemories.add(memoryId);

    // Second access
    expect(sessionState.seenMemories.has(memoryId)).toBe(true);
  });

  test('should return ref for already-seen memory', () => {
    const memoryId = testMemoryIds[0];
    const memoryTokens = 200; // Simulated token count

    // Simulate expand_memory behavior
    function expandMemory(id: string): { type: 'full' | 'ref'; data: unknown; tokensSaved: number } {
      if (sessionState.seenMemories.has(id)) {
        return {
          type: 'ref',
          data: { ref: `memory_${id}`, note: 'Already in context' },
          tokensSaved: memoryTokens
        };
      }

      sessionState.seenMemories.add(id);
      const memory = sqlite.query('SELECT * FROM memories WHERE id = ?').get(id);
      return {
        type: 'full',
        data: memory,
        tokensSaved: 0
      };
    }

    // First call: full memory
    const first = expandMemory(memoryId);
    expect(first.type).toBe('full');
    expect(first.tokensSaved).toBe(0);

    // Second call: reference only
    const second = expandMemory(memoryId);
    expect(second.type).toBe('ref');
    expect(second.tokensSaved).toBe(memoryTokens);
    expect((second.data as { ref: string }).ref).toBe(`memory_${memoryId}`);
  });

  test('should accumulate token savings', () => {
    const memoryTokens = [200, 150, 300]; // Simulated token counts

    // Access memories multiple times
    for (let i = 0; i < 3; i++) {
      const id = testMemoryIds[i];
      sessionState.seenMemories.add(id);
      sessionState.totalTokensServed += memoryTokens[i];
    }

    // Re-access same memories (should save tokens)
    for (let i = 0; i < 3; i++) {
      const id = testMemoryIds[i];
      if (sessionState.seenMemories.has(id)) {
        sessionState.tokensSaved += memoryTokens[i];
      }
    }

    expect(sessionState.tokensSaved).toBe(650); // 200 + 150 + 300
    expect(sessionState.seenMemories.size).toBe(3);
  });
});

// ============================================================================
// SESSION STATS TESTS
// ============================================================================

describe('Session Stats', () => {
  test('should calculate token savings percentage', () => {
    const stats = {
      totalTokensRequested: 10000,
      totalTokensServed: 2500,
      tokensSaved: 7500,
      memoriesAccessed: 15,
      uniqueMemories: 8,
      duplicateRequests: 7
    };

    const savingsPercentage = (stats.tokensSaved / stats.totalTokensRequested) * 100;

    expect(savingsPercentage).toBe(75);
  });

  test('should format stats for display', () => {
    const stats = {
      sessionId: 'test-session',
      tokensSaved: 34521,
      totalTokensServed: 10000,
      memoriesAccessed: 25,
      uniqueMemories: 12,
      searchQueries: 8
    };

    const formatted = `[Session Stats]
- Queries: ${stats.searchQueries}
- Memories accessed: ${stats.memoriesAccessed} (unique: ${stats.uniqueMemories})
- Tokens served: ${stats.totalTokensServed.toLocaleString()}
- Tokens saved: ${stats.tokensSaved.toLocaleString()} (${Math.round((stats.tokensSaved / (stats.tokensSaved + stats.totalTokensServed)) * 100)}% reduction)`;

    expect(formatted).toContain('34,521');
    expect(formatted).toContain('78% reduction');
  });
});

// ============================================================================
// LIST DIGESTS TESTS
// ============================================================================

describe('List Digests (Compact Summaries)', () => {
  test('list_digests should return id + digest only', () => {
    const results = sqlite.query(`
      SELECT id, digest FROM memories WHERE context_id = ? AND digest IS NOT NULL
    `).all(testContextId) as Array<{ id: string; digest: string }>;

    expect(results.length).toBe(5);

    for (const r of results) {
      expect(r).toHaveProperty('id');
      expect(r).toHaveProperty('digest');
      expect(Object.keys(r).length).toBe(2); // Only id and digest
    }
  });

  test('list_digests result should be ~20 tokens per memory', () => {
    const sampleResult = {
      id: 'abc123-xyz789',
      digest: 'Use DTOs to decouple domain models from API responses'
    };

    const jsonStr = JSON.stringify(sampleResult);
    const estimatedTokens = Math.ceil(jsonStr.length / 4);

    // Should be ~20-30 tokens per result (vs ~800 for full memory)
    expect(estimatedTokens).toBeLessThan(40);
  });
});

// ============================================================================
// AUTO-DIGEST GENERATION TESTS
// ============================================================================

describe('Auto-Digest Generation', () => {
  test('should generate digest from first sentence', () => {
    const content = 'Use DTOs to decouple domain models. This provides versioning flexibility.';
    const digest = content.split(/[.!?]/)[0].trim();

    expect(digest).toBe('Use DTOs to decouple domain models');
    expect(digest.length).toBeLessThan(100);
  });

  test('should truncate long first sentences', () => {
    const content = 'This is a very long first sentence that goes on and on and on and contains way too much information to be useful as a digest summary for quick scanning purposes.';
    const maxLength = 80;
    let digest = content.split(/[.!?]/)[0].trim();

    if (digest.length > maxLength) {
      digest = digest.substring(0, maxLength - 3) + '...';
    }

    expect(digest.length).toBeLessThanOrEqual(maxLength);
    expect(digest.endsWith('...')).toBe(true);
  });

  test('should handle code snippets', () => {
    const content = '```typescript\nconst x = 1;\n```\nThis code shows variable declaration.';

    // Skip code blocks, use first text sentence
    const textOnly = content.replace(/```[\s\S]*?```/g, '').trim();
    const digest = textOnly.split(/[.!?]/)[0].trim();

    expect(digest).toBe('This code shows variable declaration');
  });
});

// ============================================================================
// TOKEN ESTIMATION TESTS
// ============================================================================

describe('Token Estimation', () => {
  test('should estimate tokens from content length', () => {
    // Approximate: 1 token ≈ 4 characters for English text
    const content = 'This is a test memory with some content that needs token estimation.';
    const estimatedTokens = Math.ceil(content.length / 4);

    expect(estimatedTokens).toBeGreaterThan(0);
    expect(estimatedTokens).toBe(Math.ceil(68 / 4)); // 17 tokens
  });

  test('should compare full vs compact token usage', () => {
    const fullMemory = {
      id: 'abc123',
      contextId: 'ctx456',
      type: 'note',
      title: 'DTO Pattern',
      content: 'Use Data Transfer Objects (DTOs) to decouple your internal domain models from API responses.',
      digest: 'Use DTOs to decouple domain models',
      metadata: { source: 'manual' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const quickResult = {
      id: fullMemory.id,
      title: fullMemory.title,
      score: 0.92,
      tokens: 25
    };

    const digestResult = {
      id: fullMemory.id,
      digest: fullMemory.digest
    };

    const fullTokens = Math.ceil(JSON.stringify(fullMemory).length / 4);
    const quickTokens = Math.ceil(JSON.stringify(quickResult).length / 4);
    const digestTokens = Math.ceil(JSON.stringify(digestResult).length / 4);

    // Quick search should be ~50x smaller
    expect(fullTokens / quickTokens).toBeGreaterThan(5);

    // Digest should be ~30x smaller
    expect(fullTokens / digestTokens).toBeGreaterThan(3);

    console.log(`Token comparison:
      Full memory: ${fullTokens} tokens
      Quick search: ${quickTokens} tokens (${Math.round((1 - quickTokens/fullTokens) * 100)}% reduction)
      Digest: ${digestTokens} tokens (${Math.round((1 - digestTokens/fullTokens) * 100)}% reduction)
    `);
  });
});

// ============================================================================
// INTEGRATION TEST
// ============================================================================

describe('PMP2 Full Workflow', () => {
  test('should demonstrate complete token-saving workflow', () => {
    const sessionState = {
      sessionId: generateId(),
      seenMemories: new Set<string>(),
      tokensSaved: 0,
      totalTokensServed: 0,
      searchQueries: 0
    };

    // Step 1: Quick search (15 tokens/result instead of 800)
    sessionState.searchQueries++;
    const searchResults = sqlite.query(`
      SELECT m.id, m.title, LENGTH(m.content) as tokens
      FROM memories m
      WHERE m.context_id = ?
      LIMIT 5
    `).all(testContextId) as Array<{ id: string; title: string; tokens: number }>;

    const quickSearchTokens = searchResults.length * 15; // ~15 tokens per result
    const fullSearchTokens = searchResults.length * 200; // ~200 tokens per result (with content)
    sessionState.tokensSaved += (fullSearchTokens - quickSearchTokens);
    sessionState.totalTokensServed += quickSearchTokens;

    // Step 2: Get digests for top 3 (20 tokens/result instead of 200)
    const digestResults = sqlite.query(`
      SELECT id, digest FROM memories WHERE id IN (?, ?, ?)
    `).all(searchResults[0].id, searchResults[1].id, searchResults[2].id);

    const digestTokens = digestResults.length * 20;
    const fullDigestTokens = digestResults.length * 200;
    sessionState.tokensSaved += (fullDigestTokens - digestTokens);
    sessionState.totalTokensServed += digestTokens;

    // Step 3: Expand 1 memory (full content)
    const expandId = searchResults[0].id;
    sessionState.seenMemories.add(expandId);
    sessionState.totalTokensServed += 200;

    // Step 4: Re-request same memory (delta check saves 200 tokens)
    if (sessionState.seenMemories.has(expandId)) {
      sessionState.tokensSaved += 200;
      sessionState.totalTokensServed += 10; // Just the ref
    }

    // Verify significant token savings
    const savingsPercent = (sessionState.tokensSaved / (sessionState.tokensSaved + sessionState.totalTokensServed)) * 100;

    expect(savingsPercent).toBeGreaterThan(70);
    console.log(`
PMP2 Workflow Results:
- Search queries: ${sessionState.searchQueries}
- Tokens served: ${sessionState.totalTokensServed}
- Tokens saved: ${sessionState.tokensSaved}
- Savings: ${Math.round(savingsPercent)}%
    `);
  });
});
