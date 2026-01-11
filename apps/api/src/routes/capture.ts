/**
 * Capture Routes - Nexus API
 * Handles auto-capture from Claude Code hooks
 * Provides endpoints for observation collection and distillation
 */

import { Hono } from 'hono';
import type { Database } from '@nexus/storage';

interface CapturePayload {
  session_id: string;
  hook_name: 'sessionStart' | 'postTool' | 'sessionEnd';
  payload: Record<string, any>;
}

interface BatchCaptureRequest {
  observations: CapturePayload[];
}

interface DistillRequest {
  session_id: string;
}

type GetDb = () => Promise<Database>;

export function createCaptureRoutes(getDb: GetDb) {
  const app = new Hono();

  // ============================================================
  // POST /capture - Capture single observation
  // ============================================================
  app.post('/', async (c) => {
    const db = await getDb();
    const { session_id, hook_name, payload } = await c.req.json<CapturePayload>();

    if (!session_id || !hook_name || !payload) {
      return c.json({ error: 'Missing required fields: session_id, hook_name, payload' }, 400);
    }

    try {
      const result = db.run(`
        INSERT INTO hook_observations (session_id, hook_name, payload, timestamp)
        VALUES (?, ?, ?, ?)
      `,
        session_id,
        hook_name,
        JSON.stringify(payload),
        payload.timestamp || Math.floor(Date.now() / 1000)
      );

      return c.json({
        id: result.lastInsertRowid,
        session_id,
      }, 201);
    } catch (e) {
      console.error('[Capture] Error:', e);
      return c.json({ error: 'Failed to capture observation', message: String(e) }, 500);
    }
  });

  // ============================================================
  // POST /capture/batch - Batch capture multiple observations
  // ============================================================
  app.post('/batch', async (c) => {
    const db = await getDb();
    const { observations } = await c.req.json<BatchCaptureRequest>();

    if (!Array.isArray(observations) || observations.length === 0) {
      return c.json({ error: 'observations must be a non-empty array' }, 400);
    }

    try {
      const stmt = db.prepare(`
        INSERT INTO hook_observations (session_id, hook_name, payload, timestamp)
        VALUES (?, ?, ?, ?)
      `);

      for (const obs of observations) {
        stmt.run(
          obs.session_id,
          obs.hook_name,
          JSON.stringify(obs.payload),
          obs.payload.timestamp || Math.floor(Date.now() / 1000)
        );
      }

      return c.json({
        count: observations.length,
        message: `Captured ${observations.length} observations`,
      });
    } catch (e) {
      console.error('[Capture Batch] Error:', e);
      return c.json({ error: 'Failed to capture batch', message: String(e) }, 500);
    }
  });

  // ============================================================
  // POST /distill - Trigger LLM distillation for a session
  // ============================================================
  app.post('/distill', async (c) => {
    const db = await getDb();
    const { session_id } = await c.req.json<DistillRequest>();

    if (!session_id) {
      return c.json({ error: 'Missing session_id' }, 400);
    }

    try {
      // Fetch unprocessed observations for this session
      const observations = db.query(`
        SELECT * FROM hook_observations
        WHERE session_id = ? AND processed = FALSE
        ORDER BY timestamp ASC
      `, session_id);

      if (observations.length === 0) {
        return c.json({
          session_id,
          candidates_count: 0,
          message: 'No unprocessed observations found',
        });
      }

      // Check if Mistral API is available
      if (!process.env.MISTRAL_API_KEY || process.env.MISTRAL_API_KEY.length < 10) {
        // Fallback: create raw candidates
        db.run(`
          INSERT INTO hook_candidates (session_id, kind, sources, status, metadata)
          VALUES (?, 'raw', ?, 'pending', ?)
        `,
          session_id,
          JSON.stringify(observations.map((o: any) => o.id)),
          JSON.stringify({
            reason: 'LLM not configured',
            observation_count: observations.length,
          })
        );

        // Mark observations as processed
        db.run(`UPDATE hook_observations SET processed = TRUE WHERE session_id = ?`, session_id);

        return c.json({
          session_id,
          candidates_count: 1,
          kind: 'raw',
          message: 'LLM not configured - stored as raw candidates',
        });
      }

      // Call LLM for distillation
      let candidates;
      try {
        candidates = await distillWithLLM(observations);
      } catch (llmError) {
        // LLM failed - create raw candidates
        console.error('[Distill] LLM error, falling back to raw:', llmError);
        db.run(`
          INSERT INTO hook_candidates (session_id, kind, sources, status, metadata)
          VALUES (?, 'raw', ?, 'pending', ?)
        `,
          session_id,
          JSON.stringify(observations.map((o: any) => o.id)),
          JSON.stringify({
            reason: 'LLM failed',
            error: String(llmError),
            observation_count: observations.length,
          })
        );

        // Mark observations as processed
        db.run(`UPDATE hook_observations SET processed = TRUE WHERE session_id = ?`, session_id);

        return c.json({
          session_id,
          candidates_count: 1,
          kind: 'raw',
          message: 'LLM failed - stored as raw candidates',
        });
      }

      // Store candidates
      for (const candidate of candidates) {
        db.run(`
          INSERT INTO hook_candidates (session_id, kind, sources, status, tags, metadata)
          VALUES (?, 'distilled', ?, 'pending', ?, ?)
        `,
          session_id,
          JSON.stringify(candidate.source_ids),
          JSON.stringify(candidate.tags),
          JSON.stringify(candidate)
        );
      }

      // Mark observations as processed
      db.run(`UPDATE hook_observations SET processed = TRUE WHERE session_id = ?`, session_id);

      // Calculate compression ratio
      const rawSize = JSON.stringify(observations).length;
      const distilledSize = JSON.stringify(candidates).length;
      const compressionRatio = rawSize / distilledSize;

      return c.json({
        session_id,
        candidates_count: candidates.length,
        compression_ratio: Math.round(compressionRatio * 10) / 10,
      });

    } catch (e) {
      console.error('[Distill] Error:', e);
      return c.json({ error: 'Distillation failed', message: String(e) }, 500);
    }
  });

  // ============================================================
  // GET /capture/session/:id - Get observations for a session
  // ============================================================
  app.get('/session/:id', async (c) => {
    const db = await getDb();
    const sessionId = c.req.param('id');

    try {
      const observations = db.query(`
        SELECT * FROM hook_observations
        WHERE session_id = ?
        ORDER BY timestamp ASC
      `, sessionId);

      return c.json({
        session_id: sessionId,
        observations,
        count: observations.length,
      });
    } catch (e) {
      return c.json({ error: 'Failed to fetch observations' }, 500);
    }
  });

  // ============================================================
  // GET /capture/queue - Get pending distillation sessions
  // ============================================================
  app.get('/queue', async (c) => {
    const db = await getDb();

    try {
      const pending = db.query(`
        SELECT
          session_id,
          COUNT(*) as observation_count,
          MIN(timestamp) as first_observation,
          MAX(timestamp) as last_observation
        FROM hook_observations
        WHERE processed = FALSE
        GROUP BY session_id
        ORDER BY last_observation DESC
      `);

      return c.json({
        sessions: pending,
        count: pending.length,
      });
    } catch (e) {
      return c.json({ error: 'Failed to fetch queue' }, 500);
    }
  });

  // ============================================================
  // Helper: LLM Distillation
  // ============================================================
  async function distillWithLLM(observations: any[]): Promise<any[]> {
    const MISTRAL_API = 'https://api.mistral.ai/v1/chat/completions';

    const prompt = `You are a technical distillation engine. Given raw observations from a coding session, extract 1-3 concise memories.

Rules:
1. Output ONLY valid JSON array
2. Each memory must have: type, title, narrative, tags, confidence
3. Types: decision, bugfix, discovery, change, preference
4. Title: < 50 characters, descriptive
5. Narrative: < 500 characters, factual, remove fluff
6. Tags: 3-5 relevant technical tags
7. Confidence: 0.0-1.0 based on clarity
8. Skip trivial operations (file reads, status checks)

Input observations:
${JSON.stringify(observations, null, 2)}

Output format:
[
  {
    "type": "decision",
    "title": "Used SQLite for persistent storage",
    "narrative": "Chose SQLite over PostgreSQL for local development. Rationale: zero config, embedded, sufficient for single-server use case.",
    "tags": ["database", "sqlite", "storage"],
    "confidence": 0.9
  }
]`;

    const response = await fetch(MISTRAL_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-medium',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const data = await response.json() as any;
    const content = data.choices[0].message.content;

    // Parse JSON response
    const memories = JSON.parse(content);

    // Add source_ids to each memory
    return memories.map((m: any) => ({
      ...m,
      source_ids: observations.map((o: any) => o.id),
    }));
  }

  return app;
}
