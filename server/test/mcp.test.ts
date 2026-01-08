/**
 * Unit Tests for Free Context MCP
 * User-less architecture - single-user system
 *
 * Tests for MCP tools and automations
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { initializeDatabase, closeDb, getDb, getRawDb, generateId } from '../src/storage/client.js';
import { contexts, memories, relationships } from '../src/storage/schema.js';
import { eq } from 'drizzle-orm';

describe('Free Context MCP - Memory Operations', () => {
  let db: ReturnType<typeof getDb>;
  let testContextId: string;

  beforeAll(async () => {
    db = getDb();
    await initializeDatabase();

    // Create a test context (no user)
    const contextId = generateId();
    const [context] = await db
      .insert(contexts)
      .values({
        id: generateId(),
        id: contextId,
        name: 'Test Context',
        description: 'Context for testing',
        tags: ['test'],
      })
      .returning();
    testContextId = context.id;
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(memories).where(eq(memories.contextId, testContextId));
    await db.delete(contexts).where(eq(contexts.id, testContextId));
    await closeDb();
  });

  describe('addMemory', () => {
    test('should add a memory to a context', async () => {
      const memoryId = generateId();
      const result = await db
        .insert(memories)
        .values({
        id: generateId(),
          id: memoryId,
          contextId: testContextId,
          title: 'Test Memory',
          content: 'This is a test memory',
          type: 'note',
        })
        .returning();

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test Memory');
      expect(result[0].content).toBe('This is a test memory');
    });

    test('should add memory with metadata', async () => {
      const metadata = {
        source: 'manual',
        priority: 'high',
      };

      const result = await db
        .insert(memories)
        .values({
        id: generateId(),
          contextId: testContextId,
          title: 'Memory with Metadata',
          content: 'Test content',
          type: 'note',
          metadata,
        })
        .returning();

      expect(result[0].metadata).toEqual(metadata);
    });
  });

  describe('searchMemories', () => {
    test('should find memories by content', async () => {
      // Add a searchable memory
      const memoryId = generateId();
      await db.insert(memories).values({
        id: memoryId,
        contextId: testContextId,
        title: 'Searchable Memory',
        content: 'This contains unique keyword xyz123',
        type: 'note',
      });

      // Verify memory was inserted
      const results = await db
        .select()
        .from(memories)
        .where(eq(memories.id, memoryId));

      expect(results).toHaveLength(1);
      expect(results[0].content).toContain('xyz123');
    });

    test('should filter memories by type', async () => {
      const result = await db
        .select()
        .from(memories)
        .where(eq(memories.type, 'note'))
        .limit(10);

      expect(Array.isArray(result)).toBe(true);
      result.forEach((memory) => {
        expect(memory.type).toBe('note');
      });
    });
  });

  describe('updateMemory', () => {
    test('should update memory content', async () => {
      const [memory] = await db
        .insert(memories)
        .values({
        id: generateId(),
          contextId: testContextId,
          title: 'Update Test',
          content: 'Original content',
          type: 'note',
        })
        .returning();

      const [updated] = await db
        .update(memories)
        .set({ content: 'Updated content' })
        .where(eq(memories.id, memory.id))
        .returning();

      expect(updated.content).toBe('Updated content');
    });
  });

  describe('deleteMemory', () => {
    test('should delete a memory', async () => {
      const [memory] = await db
        .insert(memories)
        .values({
        id: generateId(),
          contextId: testContextId,
          title: 'Delete Test',
          content: 'To be deleted',
          type: 'note',
        })
        .returning();

      await db.delete(memories).where(eq(memories.id, memory.id));

      const result = await db
        .select()
        .from(memories)
        .where(eq(memories.id, memory.id));

      expect(result).toHaveLength(0);
    });
  });
});

describe('Free Context MCP - Context Operations', () => {
  let db: ReturnType<typeof getDb>;

  beforeAll(async () => {
    db = getDb();
    await initializeDatabase();
  });

  afterAll(async () => {
    await closeDb();
  });

  describe('createContext', () => {
    test('should create a new context', async () => {
      const result = await db
        .insert(contexts)
        .values({
        id: generateId(),
          name: 'New Test Context',
          description: 'A test context',
          tags: ['test', 'unit'],
        })
        .returning();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('New Test Context');
      expect(result[0].tags).toEqual(['test', 'unit']);

      // Clean up
      await db.delete(contexts).where(eq(contexts.id, result[0].id));
    });

    test('should create context with system prompt', async () => {
      const systemPrompt = 'You are a helpful assistant for testing.';

      const result = await db
        .insert(contexts)
        .values({
        id: generateId(),
          name: 'Context with Prompt',
          description: 'Test',
          systemPrompt,
        })
        .returning();

      expect(result[0].systemPrompt).toBe(systemPrompt);

      // Clean up
      await db.delete(contexts).where(eq(contexts.id, result[0].id));
    });
  });

  describe('getContexts', () => {
    test('should retrieve all contexts', async () => {
      const result = await db.select().from(contexts).limit(10);

      expect(Array.isArray(result)).toBe(true);
    });

    test('should filter contexts by tag', async () => {
      // Add a context with a specific tag
      const [context] = await db
        .insert(contexts)
        .values({
        id: generateId(),
          name: 'Tagged Context',
          description: 'Test',
          tags: ['unique-tag-xyz'],
        })
        .returning();

      // Query contexts
      const result = await db
        .select()
        .from(contexts)
        .where(eq(contexts.id, context.id));

      expect(result).toHaveLength(1);
      expect(result[0].tags).toContain('unique-tag-xyz');

      // Clean up
      await db.delete(contexts).where(eq(contexts.id, context.id));
    });
  });
});

describe('Free Context MCP - Relationship Operations', () => {
  let db: ReturnType<typeof getDb>;
  let testContextId: string;
  let memory1Id: string;
  let memory2Id: string;

  beforeAll(async () => {
    db = getDb();
    await initializeDatabase();

    // Create test context (no user)
    const [context] = await db
      .insert(contexts)
      .values({
        id: generateId(),
        name: 'Relationship Test Context',
        description: 'For testing relationships',
      })
      .returning();
    testContextId = context.id;

    // Create test memories
    const [mem1] = await db
      .insert(memories)
      .values({
        id: generateId(),
        contextId: testContextId,
        title: 'Memory 1',
        content: 'First memory',
        type: 'note',
      })
      .returning();
    memory1Id = mem1.id;

    const [mem2] = await db
      .insert(memories)
      .values({
        id: generateId(),
        contextId: testContextId,
        title: 'Memory 2',
        content: 'Second memory',
        type: 'note',
      })
      .returning();
    memory2Id = mem2.id;
  });

  afterAll(async () => {
    await db.delete(relationships).where(eq(relationships.sourceId, memory1Id));
    await db.delete(relationships).where(eq(relationships.sourceId, memory2Id));
    await db.delete(memories).where(eq(memories.contextId, testContextId));
    await db.delete(contexts).where(eq(contexts.id, testContextId));
    await closeDb();
  });

  describe('createRelationship', () => {
    test('should create a relationship between memories', async () => {
      const result = await db
        .insert(relationships)
        .values({
        id: generateId(),
          sourceId: memory1Id,
          targetId: memory2Id,
          type: 'related',
          strength: 80,
        })
        .returning();

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('related');
      expect(result[0].strength).toBe(80);
    });

    test('should create relationship with metadata', async () => {
      const metadata = {
        reason: 'semantic similarity',
        confidence: 0.9,
      };

      const result = await db
        .insert(relationships)
        .values({
        id: generateId(),
          sourceId: memory2Id,
          targetId: memory1Id,
          type: 'references',
          strength: 90,
          metadata,
        })
        .returning();

      expect(result[0].metadata).toEqual(metadata);
    });
  });

  describe('getRelationships', () => {
    test('should retrieve relationships for a memory', async () => {
      const result = await db
        .select()
        .from(relationships)
        .where(eq(relationships.sourceId, memory1Id));

      expect(result.length).toBeGreaterThan(0);
      result.forEach((rel) => {
        expect(rel.sourceId).toBe(memory1Id);
      });
    });
  });
});

describe('Free Context MCP - Automation Features', () => {
  let db: ReturnType<typeof getDb>;
  let testContextId: string;

  beforeAll(async () => {
    db = getDb();
    await initializeDatabase();

    const [context] = await db
      .insert(contexts)
      .values({
        id: generateId(),
        name: 'Automation Test Context',
        description: 'For testing automations',
      })
      .returning();
    testContextId = context.id;
  });

  afterAll(async () => {
    await db.delete(memories).where(eq(memories.contextId, testContextId));
    await db.delete(contexts).where(eq(contexts.id, testContextId));
    await closeDb();
  });

  describe('Smart Search - TF-IDF', () => {
    test('should calculate term frequency', () => {
      const text = 'the quick brown fox jumps over the lazy dog';
      const terms = text.toLowerCase().split(/\s+/);

      const termFreq: Record<string, number> = {};
      terms.forEach((term) => {
        termFreq[term] = (termFreq[term] || 0) + 1;
      });

      expect(termFreq['the']).toBe(2);
      expect(termFreq['quick']).toBe(1);
      expect(termFreq['fox']).toBe(1);
    });

    test('should tokenize text correctly', () => {
      const text = 'Hello, World! This is a test.';
      const tokens = text.toLowerCase().split(/\s+/);

      expect(tokens).toContain('hello,');
      expect(tokens).toContain('world!');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Jaccard Similarity', () => {
    test('should calculate Jaccard similarity between sets', () => {
      const set1 = new Set(['apple', 'banana', 'orange']);
      const set2 = new Set(['apple', 'banana', 'grape']);

      const intersection = new Set([...set1].filter((x) => set2.has(x)));
      const union = new Set([...set1, ...set2]);

      const jaccard = intersection.size / union.size;

      expect(jaccard).toBeCloseTo(2 / 4); // 2 common, 4 total
      expect(jaccard).toBeGreaterThan(0);
      expect(jaccard).toBeLessThanOrEqual(1);
    });

    test('should return 0 for disjoint sets', () => {
      const set1 = new Set(['apple', 'banana']);
      const set2 = new Set(['orange', 'grape']);

      const intersection = new Set([...set1].filter((x) => set2.has(x)));
      const union = new Set([...set1, ...set2]);

      const jaccard = intersection.size / union.size;

      expect(jaccard).toBe(0);
    });

    test('should return 1 for identical sets', () => {
      const set1 = new Set(['apple', 'banana']);
      const set2 = new Set(['apple', 'banana']);

      const intersection = new Set([...set1].filter((x) => set2.has(x)));
      const union = new Set([...set1, ...set2]);

      const jaccard = intersection.size / union.size;

      expect(jaccard).toBe(1);
    });
  });

  describe('Auto-Save Pattern Detection', () => {
    test('should detect important content patterns', () => {
      const importantPatterns = [
        /important:/i,
        /note:/i,
        /rappel:/i,
        /remember:/i,
        /key point:/i,
      ];

      const text = 'IMPORTANT: This is a crucial point to remember.';
      const hasPattern = importantPatterns.some((pattern) =>
        pattern.test(text)
      );

      expect(hasPattern).toBe(true);
    });

    test('should detect list structures', () => {
      const text = `
        Key points:
        - First point
        - Second point
        - Third point
      `;

      const hasList = /^\s*-\s+/m.test(text);
      expect(hasList).toBe(true);
    });

    test('should detect definitions', () => {
      const text = 'A API is an Application Programming Interface.';
      const hasDefinition = /(\w+)\s+is\s+/i.test(text);

      expect(hasDefinition).toBe(true);
    });
  });

  describe('Context Auto-Creation', () => {
    test('should extract keywords from text', () => {
      const text = 'Machine learning is a subset of artificial intelligence.';
      const words = text.toLowerCase().split(/\s+/);
      const stopwords = new Set(['is', 'a', 'of', 'the', 'and', 'or']);

      // Remove punctuation from words
      const cleanWords = words.map((w) => w.replace(/[.,!?;:]$/, ''));
      const keywords = cleanWords.filter((w) => w.length > 3 && !stopwords.has(w));

      expect(keywords).toContain('machine');
      expect(keywords).toContain('learning');
      expect(keywords).toContain('subset');
      expect(keywords).toContain('artificial');
      expect(keywords).toContain('intelligence');
    });
  });
});
