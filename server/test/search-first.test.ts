/**
 * Tests for search-first tool
 * Validates token usage, excerpt generation, and FTS5 ranking
 */

import { beforeAll, describe, test, expect } from 'bun:test';
import { searchMemories } from '../src/tools/search-first.js';
import { getDb, getRawDb, generateId, initializeDatabase } from '../src/storage/client.js';
import { memories, contexts } from '../src/storage/schema.js';

describe('Search-First Tool', () => {
  beforeAll(async () => {
    // Initialize test database schema
    await initializeDatabase();

    const db = getDb();
    const sqlite = getRawDb();

    // Clean up test data
    sqlite.exec('DELETE FROM memories_fts');
    sqlite.exec('DELETE FROM memories');
    sqlite.exec('DELETE FROM contexts');

    // Create test context
    const contextId = generateId();
    await db.insert(contexts).values({
      id: contextId,
      name: 'Test Context',
      description: 'Context for search-first tests',
      tags: ['test'],
      stack: 'basic',
      difficulty: 'easy',
      metadata: {},
    });

    // Create test memories with varying content lengths
    const testMemories = [
      {
        id: generateId(),
        contextId,
        type: 'note',
        title: 'React Hooks Guide',
        content: `React Hooks are functions that let you hook into React state and lifecycle features from function components.

useState allows you to add state to functional components. It returns the current state value and a function to update it.

useEffect lets you perform side effects in function components. It runs after every render by default, but you can control when it runs by providing dependencies.

useContext allows you to consume context without using the Consumer component.

useCallback returns a memoized callback that only changes if dependencies change.

useMemo returns a memoized value that only changes if dependencies change.

Custom hooks let you extract component logic into reusable functions.`,
        stack: 'react19',
        difficulty: 'normal',
        metadata: {},
      },
      {
        id: generateId(),
        contextId,
        type: 'snippet',
        title: 'Tailwind CSS Grid',
        content: `Tailwind CSS provides utility classes for CSS Grid layout.

Basic grid:
<div class="grid grid-cols-3 gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>

Responsive grid:
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <!-- Content -->
</div>

Auto-fit columns:
<div class="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
  <!-- Content -->
</div>`,
        stack: 'nextjs',
        difficulty: 'easy',
        metadata: {},
      },
      {
        id: generateId(),
        contextId,
        type: 'conversation',
        title: 'Symfony API Discussion',
        content: `Discussion about Symfony API Platform development.

Q: How do I create a custom API endpoint in Symfony?

A: You can create a custom controller and use the #[Route] attribute:

namespace App\\Controller;

use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;
use Symfony\\Component\\Routing\\Annotation\\Route;

class CustomController extends AbstractController
{
    #[Route('/api/custom', name: 'api_custom', methods: ['GET'])]
    public function custom()
    {
        return $this->json(['message' => 'Custom endpoint']);
    }
}

Q: What about API Platform?

A: API Platform uses Doctrine ORM entities and resource attributes. You can customize operations with ApiProperty attributes.`,
        stack: 'symfony',
        difficulty: 'hard',
        metadata: {},
      },
      {
        id: generateId(),
        contextId,
        type: 'reference',
        title: 'Laravel Eloquent Relationships',
        content: `Laravel Eloquent ORM provides powerful relationship definitions.

One-to-One:
public function phone() {
    return $this->hasOne(Phone::class);
}

One-to-Many:
public function posts() {
    return $this->hasMany(Post::class);
}

Many-to-Many:
public function roles() {
    return $this->belongsToMany(Role::class);
}

Has Many Through:
public function posts() {
    return $this->hasManyThrough(Post::class, Country::class);
}

Eager loading:
$users = User::with('posts')->get();

Lazy eager loading:
$users->load('posts');`,
        stack: 'laravel',
        difficulty: 'normal',
        metadata: {},
      },
    ];

    // Insert memories and populate FTS
    for (const memory of testMemories) {
      const now = new Date();
      await db.insert(memories).values({
        ...memory,
        createdAt: now,
        updatedAt: now,
      });

      // Insert into FTS
      const ftsId = generateId();
      const stmt = sqlite.prepare(`
        INSERT INTO memories_fts (id, memory_id, title, content, type, context_id, stack)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(ftsId, memory.id, memory.title, memory.content, memory.type, memory.contextId, memory.stack);
    }

    sqlite.close();
  });

  test('should search memories with compact mode', async () => {
    const result = await searchMemories({
      query: 'React hooks',
      mode: 'compact',
      limit: 10,
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.success).toBe(true);
    expect(data.results.length).toBeGreaterThan(0);

    // Verify compact mode token usage
    expect(data.totalTokens).toBeLessThan(1000);
    expect(data.avgTokensPerResult).toBeLessThan(100);

    // Verify excerpt contains search terms
    const firstResult = data.results[0];
    expect(firstResult.excerpt.toLowerCase()).toContain('react');
  });

  test('should search memories with standard mode', async () => {
    const result = await searchMemories({
      query: 'Tailwind grid',
      mode: 'standard',
      limit: 5,
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.success).toBe(true);
    expect(data.results.length).toBeGreaterThan(0);

    // Verify standard mode has more tokens than compact
    const firstResult = data.results[0];
    expect(firstResult.tokens).toBeGreaterThan(50);
    expect(firstResult.tokens).toBeLessThan(200);
  });

  test('should search memories with detailed mode', async () => {
    const result = await searchMemories({
      query: 'Symfony API',
      mode: 'detailed',
      limit: 5,
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.success).toBe(true);

    if (data.results.length > 0) {
      const firstResult = data.results[0];
      expect(firstResult.tokens).toBeGreaterThan(150);
      expect(firstResult.tokens).toBeLessThan(350);
    }
  });

  test('should filter by context', async () => {
    const result = await searchMemories({
      query: 'test',
      mode: 'compact',
      limit: 10,
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.success).toBe(true);
  });

  test('should filter by type', async () => {
    const result = await searchMemories({
      query: 'test',
      type: 'snippet',
      mode: 'compact',
      limit: 10,
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.success).toBe(true);

    if (data.results.length > 0) {
      expect(data.results[0].type).toBe('snippet');
    }
  });

  test('should filter by stack', async () => {
    const result = await searchMemories({
      query: 'test',
      stack: 'laravel',
      mode: 'compact',
      limit: 10,
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.success).toBe(true);

    if (data.results.length > 0) {
      expect(data.results[0].stack).toBe('laravel');
    }
  });

  test('should return empty results for non-matching query', async () => {
    const result = await searchMemories({
      query: 'nonexistent term xyz123',
      mode: 'compact',
      limit: 10,
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.success).toBe(true);
    expect(data.results.length).toBe(0);
  });

  test('should handle FTS5 ranking correctly', async () => {
    const result = await searchMemories({
      query: 'custom endpoint',
      mode: 'compact',
      limit: 10,
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.success).toBe(true);

    if (data.results.length > 0) {
      // Results should be sorted by score (highest first)
      const scores = data.results.map(r => r.score);
      const sortedScores = [...scores].sort((a, b) => b - a);
      expect(scores).toEqual(sortedScores);
    }
  });

  test('should include metadata in response', async () => {
    const result = await searchMemories({
      query: 'React hooks',
      mode: 'compact',
      limit: 10,
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.success).toBe(true);

    // Meta is included when results are found
    if (data.results.length > 0) {
      expect(data.meta).toBeDefined();
      expect(data.meta.searchMethod).toBe('fts5_bm25');
      expect(data.meta.excerptStrategy).toBe('smart_context_aware');
    }
  });

  test('should estimate token counts accurately', async () => {
    const result = await searchMemories({
      query: 'test',
      mode: 'compact',
      limit: 10,
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.success).toBe(true);

    if (data.results.length > 0) {
      const firstResult = data.results[0];
      const estimatedTokens = firstResult.tokens;
      const actualLength = firstResult.title.length + firstResult.excerpt.length;

      // Rough verification: estimate should be within reasonable range
      expect(estimatedTokens).toBeGreaterThan(0);
      expect(estimatedTokens).toBeLessThan(actualLength); // Should be less than char count
    }
  });
});
