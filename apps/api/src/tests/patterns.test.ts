/**
 * Patterns Routes Tests - Sprint 3 Learning Core
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Hono } from 'hono';
import { createPatternsRoutes } from '../routes/patterns';

// In-memory mock database
const mockDb = {
  patterns: [] as any[],
  candidates: [] as any[],
  feedback: [] as any[],
  chunks: [] as any[],
  files: [] as any[],
  idCounter: { patterns: 1, candidates: 1, feedback: 1 },

  reset() {
    this.patterns = [];
    this.candidates = [];
    this.feedback = [];
    this.chunks = [
      { id: 1, file_id: 1, content: 'class UserController { }', start_line: 1, end_line: 10 },
    ];
    this.files = [
      { id: 1, path: 'src/controllers/user.ts' },
    ];
    this.idCounter = { patterns: 1, candidates: 1, feedback: 1 };
  },

  query<T>(sql: string, ...params: unknown[]): T[] {
    // Patterns FTS search
    if (sql.includes('FROM patterns_fts')) {
      return this.patterns.map(p => ({ ...p, score: -1.0 })) as T[];
    }

    // Patterns with stats
    if (sql.includes('FROM patterns_with_stats') || sql.includes('FROM patterns')) {
      if (sql.includes('WHERE id =')) {
        const id = params[0] as number;
        const found = this.patterns.find(p => p.id === id);
        return found ? [found as T] : [];
      }
      return this.patterns.map(p => ({
        ...p,
        success_rate: p.success_count + p.fail_count > 0
          ? p.success_count / (p.success_count + p.fail_count)
          : 0.5,
      })) as T[];
    }

    // Candidates
    if (sql.includes('FROM candidates')) {
      if (sql.includes('WHERE id =')) {
        const id = params[0] as number;
        const found = this.candidates.find(c => c.id === id);
        return found ? [found as T] : [];
      }
      let filtered = this.candidates;
      if (sql.includes('WHERE status =')) {
        const status = params[0] as string;
        filtered = filtered.filter(c => c.status === status);
      }
      return filtered as T[];
    }

    // Chunks
    if (sql.includes('FROM chunks')) {
      if (sql.includes('WHERE id =')) {
        const id = params[0] as number;
        const found = this.chunks.find(c => c.id === id);
        return found ? [found as T] : [];
      }
      if (sql.includes('WHERE file_id =')) {
        const fileId = params[0] as number;
        return this.chunks.filter(c => c.file_id === fileId) as T[];
      }
    }

    // Files
    if (sql.includes('FROM files')) {
      if (sql.includes('WHERE id =')) {
        const id = params[0] as number;
        const found = this.files.find(f => f.id === id);
        return found ? [found as T] : [];
      }
    }

    // Count
    if (sql.includes('COUNT(*)')) {
      return [{ count: this.patterns.length }] as T[];
    }

    return [] as T[];
  },

  queryOne<T>(sql: string, ...params: unknown[]): T | null {
    const results = this.query<T>(sql, ...params);
    return results[0] || null;
  },

  run(sql: string, ...params: unknown[]): { changes: number; lastInsertRowid: number | bigint } {
    // Insert pattern
    if (sql.includes('INSERT INTO patterns')) {
      const id = this.idCounter.patterns++;
      this.patterns.push({
        id,
        intent: params[0],
        title: params[1],
        tags_json: params[2],
        constraints_json: params[3],
        variables_json: params[4],
        templates_json: params[5],
        checklist_json: params[6],
        gotchas_json: params[7],
        sources_json: params[8],
        usage_count: params[9] || 0,
        success_count: params[10] || 0,
        fail_count: params[11] || 0,
        created_at: params[12] || Date.now(),
        updated_at: params[13] || Date.now(),
      });
      return { changes: 1, lastInsertRowid: id };
    }

    // Insert candidate
    if (sql.includes('INSERT INTO candidates')) {
      const id = this.idCounter.candidates++;
      this.candidates.push({
        id,
        kind: params[0],
        sources_json: params[1],
        label: params[2],
        tags_json: params[3],
        status: params[4] || 'pending',
        created_at: params[5] || Date.now(),
      });
      return { changes: 1, lastInsertRowid: id };
    }

    // Insert feedback
    if (sql.includes('INSERT INTO feedback')) {
      const id = this.idCounter.feedback++;
      this.feedback.push({
        id,
        pattern_id: params[0],
        outcome: params[1],
        notes: params[2],
        patch_id: params[3],
        created_at: params[4],
      });
      return { changes: 1, lastInsertRowid: id };
    }

    // Update pattern
    if (sql.includes('UPDATE patterns SET')) {
      if (sql.includes('success_count = success_count + 1')) {
        const id = params[0] as number;
        const pattern = this.patterns.find(p => p.id === id);
        if (pattern) {
          pattern.success_count++;
          pattern.usage_count++;
        }
      } else if (sql.includes('fail_count = fail_count + 1')) {
        const id = params[0] as number;
        const pattern = this.patterns.find(p => p.id === id);
        if (pattern) {
          pattern.fail_count++;
          pattern.usage_count++;
        }
      }
      return { changes: 1, lastInsertRowid: 0 };
    }

    // Update candidate status
    if (sql.includes('UPDATE candidates SET status')) {
      const status = params[0] as string;
      const id = params[1] as number;
      const candidate = this.candidates.find(c => c.id === id);
      if (candidate) {
        candidate.status = status;
      }
      return { changes: 1, lastInsertRowid: 0 };
    }

    // Delete pattern
    if (sql.includes('DELETE FROM patterns')) {
      const id = params[0] as number;
      const idx = this.patterns.findIndex(p => p.id === id);
      if (idx >= 0) {
        this.patterns.splice(idx, 1);
        return { changes: 1, lastInsertRowid: 0 };
      }
      return { changes: 0, lastInsertRowid: 0 };
    }

    // Delete candidate
    if (sql.includes('DELETE FROM candidates')) {
      const id = params[0] as number;
      const idx = this.candidates.findIndex(c => c.id === id);
      if (idx >= 0) {
        this.candidates.splice(idx, 1);
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
app.route('/patterns', createPatternsRoutes(getDb));

describe('Patterns Routes - Sprint 3', () => {
  beforeAll(() => {
    mockDb.reset();
  });

  afterAll(() => {
    mockDb.reset();
  });

  describe('POST /patterns/capture', () => {
    it('should capture a candidate', async () => {
      const res = await app.request('/patterns/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'chunks',
          sources: [{ chunkId: 1 }],
          label: 'User Controller Pattern',
          tags: ['controller', 'typescript'],
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.id).toBeDefined();
      expect(data.status).toBe('pending');
    });

    it('should reject invalid kind', async () => {
      const res = await app.request('/patterns/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'invalid',
          sources: [{ chunkId: 1 }],
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject empty sources', async () => {
      const res = await app.request('/patterns/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'chunks',
          sources: [],
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /patterns/candidates', () => {
    it('should list pending candidates', async () => {
      const res = await app.request('/patterns/candidates?status=pending');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.candidates).toBeDefined();
      expect(Array.isArray(data.candidates)).toBe(true);
    });
  });

  describe('POST /patterns/distill', () => {
    it('should distill candidate to pattern', async () => {
      // First capture a candidate
      const captureRes = await app.request('/patterns/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'chunks',
          sources: [{ chunkId: 1 }],
          label: 'Test Pattern',
        }),
      });

      const { id: candidateId } = await captureRes.json();

      // Distill it
      const res = await app.request('/patterns/distill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          intent: 'Create a user controller',
          title: 'User Controller Pattern',
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.id).toBeDefined();
      expect(data.intent).toBe('Create a user controller');
    });

    it('should require candidateId, intent, title', async () => {
      const res = await app.request('/patterns/distill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: 999,
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /patterns/recall', () => {
    beforeAll(async () => {
      // Create some patterns
      await app.request('/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'Create REST API endpoint',
          title: 'REST Endpoint Pattern',
          tags: ['api', 'rest'],
          constraints: { lang: 'typescript', framework: 'express' },
        }),
      });
    });

    it('should return compact pattern cards', async () => {
      const res = await app.request('/patterns/recall');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.patterns).toBeDefined();
      expect(Array.isArray(data.patterns)).toBe(true);

      if (data.patterns.length > 0) {
        const pattern = data.patterns[0];
        expect(pattern.id).toBeDefined();
        expect(pattern.intent).toBeDefined();
        expect(pattern.title).toBeDefined();
        expect(pattern.success_rate).toBeDefined();
        // Should NOT include templates (on-demand)
        expect(pattern.templates).toBeUndefined();
      }
    });

    it('should limit results to max 3 by default', async () => {
      const res = await app.request('/patterns/recall?limit=3');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.patterns.length).toBeLessThanOrEqual(3);
    });
  });

  describe('GET /patterns/:id/templates', () => {
    it('should return templates on-demand', async () => {
      const pattern = mockDb.patterns[0];
      if (!pattern) return;

      const res = await app.request(`/patterns/${pattern.id}/templates`);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.variables).toBeDefined();
      expect(data.templates).toBeDefined();
      expect(data.checklist).toBeDefined();
      expect(data.gotchas).toBeDefined();
    });

    it('should return 404 for non-existent pattern', async () => {
      const res = await app.request('/patterns/99999/templates');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /patterns (Create)', () => {
    it('should create pattern directly', async () => {
      const res = await app.request('/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'Create a React component',
          title: 'React Component Pattern',
          tags: ['react', 'component'],
          constraints: { lang: 'typescript', framework: 'react' },
          templates: [
            { path: 'src/components/{{ComponentName}}.tsx', content: 'export function {{ComponentName}}() { }' },
          ],
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.id).toBeDefined();
    });

    it('should require intent and title', async () => {
      const res = await app.request('/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tags: ['test'],
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /patterns/:id', () => {
    it('should return full pattern', async () => {
      const pattern = mockDb.patterns[0];
      if (!pattern) return;

      const res = await app.request(`/patterns/${pattern.id}`);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.id).toBe(pattern.id);
      expect(data.intent).toBeDefined();
      expect(data.templates).toBeDefined();
    });

    it('should return 404 for non-existent', async () => {
      const res = await app.request('/patterns/99999');
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /patterns/:id', () => {
    it('should update pattern', async () => {
      const pattern = mockDb.patterns[0];
      if (!pattern) return;

      const res = await app.request(`/patterns/${pattern.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.updated).toBe(true);
    });
  });

  describe('DELETE /patterns/:id', () => {
    it('should delete pattern', async () => {
      // Create one to delete
      const createRes = await app.request('/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'To be deleted',
          title: 'Delete Me',
        }),
      });

      const { id } = await createRes.json();

      const res = await app.request(`/patterns/${id}`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.deleted).toBe(true);
    });
  });

  describe('POST /patterns/:id/feedback', () => {
    it('should record success feedback', async () => {
      const pattern = mockDb.patterns[0];
      if (!pattern) return;

      const res = await app.request(`/patterns/${pattern.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome: 'success' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.recorded).toBe(true);
    });

    it('should record fail feedback', async () => {
      const pattern = mockDb.patterns[0];
      if (!pattern) return;

      const res = await app.request(`/patterns/${pattern.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome: 'fail', notes: 'Did not work' }),
      });

      expect(res.status).toBe(200);
    });

    it('should reject invalid outcome', async () => {
      const pattern = mockDb.patterns[0];
      if (!pattern) return;

      const res = await app.request(`/patterns/${pattern.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome: 'maybe' }),
      });

      expect(res.status).toBe(400);
    });
  });
});
