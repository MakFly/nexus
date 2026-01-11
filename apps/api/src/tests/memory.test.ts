/**
 * Memory Routes Tests - Sprint 2
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Hono } from 'hono';
import { createMemoryRoutes } from '../routes/memory';

// In-memory mock database
const mockDb = {
  observations: [] as any[],
  memoryLinks: [] as any[],
  idCounter: 1,
  linkIdCounter: 1,

  reset() {
    this.observations = [];
    this.memoryLinks = [];
    this.idCounter = 1;
    this.linkIdCounter = 1;
  },

  query<T>(sql: string, ...params: unknown[]): T[] {
    // Simple mock implementation
    if (sql.includes('FROM observations_fts')) {
      // FTS search - return all with mock score
      return this.observations.map(o => ({
        ...o,
        summary: o.summary || o.title.substring(0, 50),
        score: -1.0,
      })) as T[];
    }

    if (sql.includes('FROM observations') && sql.includes('WHERE id IN')) {
      const ids = params.slice(0, -0) as number[];
      return this.observations.filter(o => ids.includes(o.id)) as T[];
    }

    if (sql.includes('FROM observations') && !sql.includes('WHERE id =')) {
      // Apply type/scope filters from params if present
      let filtered = this.observations;

      // Check for type filter
      const typeMatch = sql.match(/type = \?/);
      const scopeMatch = sql.match(/scope = \?/);

      if (typeMatch || scopeMatch) {
        const paramIdx = { type: -1, scope: -1, limit: -1, offset: -1 };
        let idx = 0;
        if (typeMatch) paramIdx.type = idx++;
        if (scopeMatch) paramIdx.scope = idx++;

        if (paramIdx.type >= 0) {
          const typeVal = params[paramIdx.type] as string;
          filtered = filtered.filter(o => o.type === typeVal);
        }
        if (paramIdx.scope >= 0) {
          const scopeVal = params[paramIdx.scope] as string;
          filtered = filtered.filter(o => o.scope === scopeVal);
        }
      }

      return filtered.map(o => ({
        ...o,
        summary: o.summary || o.title.substring(0, 50),
        score: null,
      })) as T[];
    }

    if (sql.includes('FROM memory_links')) {
      const obsId = params[0] as number;
      return this.memoryLinks.filter(l => l.observation_id === obsId) as T[];
    }

    if (sql.includes('COUNT(*)')) {
      return [{ total: this.observations.length }] as T[];
    }

    return [] as T[];
  },

  queryOne<T>(sql: string, ...params: unknown[]): T | null {
    if (sql.includes('FROM observations WHERE id =')) {
      const id = params[0] as number;
      return (this.observations.find(o => o.id === id) as T) || null;
    }
    if (sql.includes('SELECT id FROM observations')) {
      const id = params[0] as number;
      const found = this.observations.find(o => o.id === id);
      return found ? ({ id: found.id } as T) : null;
    }
    if (sql.includes('SELECT created_at, session_id')) {
      const id = params[0] as number;
      const found = this.observations.find(o => o.id === id);
      return found ? ({ created_at: found.created_at, session_id: found.session_id } as T) : null;
    }
    if (sql.includes('COUNT(*)')) {
      return { total: this.observations.length } as T;
    }
    return null;
  },

  run(sql: string, ...params: unknown[]): { changes: number; lastInsertRowid: number } {
    if (sql.includes('INSERT INTO observations')) {
      const id = this.idCounter++;
      this.observations.push({
        id,
        session_id: params[0],
        project: params[1],
        type: params[2],
        scope: params[3],
        title: params[4],
        subtitle: params[5],
        summary: params[6],
        narrative: params[7],
        facts_json: params[8],
        concepts_json: params[9],
        tags_json: params[10],
        files_read_json: params[11],
        files_modified_json: params[12],
        confidence: params[13],
        prompt_number: params[14],
        discovery_tokens: params[15],
        created_at: params[16],
      });
      return { changes: 1, lastInsertRowid: id };
    }

    if (sql.includes('INSERT INTO memory_links')) {
      const id = this.linkIdCounter++;
      this.memoryLinks.push({
        id,
        observation_id: params[0],
        file_id: params[1],
        chunk_id: params[2],
        link_type: params[3],
        created_at: params[4],
      });
      return { changes: 1, lastInsertRowid: id };
    }

    if (sql.includes('UPDATE observations')) {
      return { changes: 1, lastInsertRowid: 0 };
    }

    if (sql.includes('DELETE FROM observations')) {
      const id = params[0] as number;
      const idx = this.observations.findIndex(o => o.id === id);
      if (idx >= 0) {
        this.observations.splice(idx, 1);
        return { changes: 1, lastInsertRowid: 0 };
      }
      return { changes: 0, lastInsertRowid: 0 };
    }

    if (sql.includes('DELETE FROM memory_links')) {
      const id = params[0] as number;
      const idx = this.memoryLinks.findIndex(l => l.id === id);
      if (idx >= 0) {
        this.memoryLinks.splice(idx, 1);
        return { changes: 1, lastInsertRowid: 0 };
      }
      return { changes: 0, lastInsertRowid: 0 };
    }

    return { changes: 0, lastInsertRowid: 0 };
  },
};

// Create test app
const getDb = async () => mockDb as any;
const app = new Hono();
app.route('/memory', createMemoryRoutes(getDb));

describe('Memory Routes - Sprint 2', () => {
  beforeAll(() => {
    mockDb.reset();
  });

  afterAll(() => {
    mockDb.reset();
  });

  describe('POST /memory (Create)', () => {
    it('should create a memory', async () => {
      const res = await app.request('/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: 'test-session',
          project: 'nexus',
          type: 'decision',
          scope: 'repo',
          title: 'Test Decision',
          narrative: 'This is a test decision',
          confidence: 0.9,
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.id).toBeDefined();
      expect(data.created).toBe(true);
    });

    it('should reject invalid type', async () => {
      const res = await app.request('/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: 'test',
          project: 'nexus',
          type: 'invalid',
          title: 'Test',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should require title', async () => {
      const res = await app.request('/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: 'test',
          project: 'nexus',
          type: 'note',
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /memory/recall (Progressive Disclosure)', () => {
    beforeAll(async () => {
      // Create some test memories
      await app.request('/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: 'session-1',
          project: 'nexus',
          type: 'fact',
          scope: 'repo',
          title: 'Auth uses JWT',
          confidence: 0.95,
        }),
      });

      await app.request('/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: 'session-1',
          project: 'nexus',
          type: 'preference',
          scope: 'global',
          title: 'Use bun instead of npm',
          confidence: 0.8,
        }),
      });
    });

    it('should return compact index', async () => {
      const res = await app.request('/memory/recall');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.memories).toBeDefined();
      expect(Array.isArray(data.memories)).toBe(true);
      expect(data.total).toBeGreaterThanOrEqual(2);

      // Check compact format
      if (data.memories.length > 0) {
        const first = data.memories[0];
        expect(first.id).toBeDefined();
        expect(first.summary).toBeDefined();
        expect(first.type).toBeDefined();
        expect(first.scope).toBeDefined();
        expect(first.confidence).toBeDefined();
      }
    });

    it('should filter by type', async () => {
      const res = await app.request('/memory/recall?type=fact');
      expect(res.status).toBe(200);

      const data = await res.json();
      // All results should be facts
      for (const memory of data.memories) {
        expect(memory.type).toBe('fact');
      }
    });

    it('should filter by scope', async () => {
      const res = await app.request('/memory/recall?scope=global');
      expect(res.status).toBe(200);

      const data = await res.json();
      for (const memory of data.memories) {
        expect(memory.scope).toBe('global');
      }
    });
  });

  describe('POST /memory/batch (Full Content)', () => {
    it('should return full memories for given IDs', async () => {
      const ids = mockDb.observations.map(o => o.id);

      const res = await app.request('/memory/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });

      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.memories).toBeDefined();
      expect(Array.isArray(data.memories)).toBe(true);
    });

    it('should reject empty ids', async () => {
      const res = await app.request('/memory/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [] }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /memory/:id', () => {
    it('should return single memory', async () => {
      const id = mockDb.observations[0]?.id;
      if (!id) return;

      const res = await app.request(`/memory/${id}`);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.id).toBe(id);
      expect(data.title).toBeDefined();
    });

    it('should return 404 for non-existent', async () => {
      const res = await app.request('/memory/99999');
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /memory/:id', () => {
    it('should update memory', async () => {
      const id = mockDb.observations[0]?.id;
      if (!id) return;

      const res = await app.request(`/memory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confidence: 0.99 }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.updated).toBe(true);
    });

    it('should reject empty update', async () => {
      const id = mockDb.observations[0]?.id;
      if (!id) return;

      const res = await app.request(`/memory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /memory/:id', () => {
    it('should delete memory', async () => {
      // Create a memory to delete
      const createRes = await app.request('/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: 'delete-test',
          project: 'nexus',
          type: 'note',
          title: 'To be deleted',
        }),
      });

      const { id } = await createRes.json();

      const res = await app.request(`/memory/${id}`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.deleted).toBe(true);
    });

    it('should return 404 for non-existent', async () => {
      const res = await app.request('/memory/99999', {
        method: 'DELETE',
      });

      expect(res.status).toBe(404);
    });
  });

  describe('Memory Links', () => {
    it('should add link to memory', async () => {
      const id = mockDb.observations[0]?.id;
      if (!id) return;

      const res = await app.request(`/memory/${id}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_id: 1,
          link_type: 'reference',
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.id).toBeDefined();
    });

    it('should get links for memory', async () => {
      const id = mockDb.observations[0]?.id;
      if (!id) return;

      const res = await app.request(`/memory/${id}/links`);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.links).toBeDefined();
      expect(Array.isArray(data.links)).toBe(true);
    });

    it('should require file_id or chunk_id', async () => {
      const id = mockDb.observations[0]?.id;
      if (!id) return;

      const res = await app.request(`/memory/${id}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link_type: 'reference' }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /memory/:id/timeline', () => {
    it('should return timeline context', async () => {
      const id = mockDb.observations[0]?.id;
      if (!id) return;

      const res = await app.request(`/memory/${id}/timeline?window=3`);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.target_id).toBe(id);
      expect(data.session_id).toBeDefined();
      expect(data.before).toBeDefined();
      expect(data.after).toBeDefined();
    });

    it('should return 404 for non-existent', async () => {
      const res = await app.request('/memory/99999/timeline');
      expect(res.status).toBe(404);
    });
  });
});
