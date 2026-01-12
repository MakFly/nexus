/**
 * Capture Routes - Nexus API
 * Handles auto-capture from Claude Code hooks
 * Provides endpoints for observation collection, distillation, and SSE streaming
 */

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
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

interface HookObservation {
  id: number;
  session_id: string;
  hook_name: string;
  payload: Record<string, any>;
  timestamp: number;
  created_at?: number;
}

type GetDb = () => Promise<Database>;

// SSE subscriber management
type SseSubscriber = (data: HookObservation) => void;
const sseSubscribers = new Set<SseSubscriber>();

function notifySubscribers(observation: HookObservation) {
  for (const subscriber of sseSubscribers) {
    try {
      subscriber(observation);
    } catch {
      sseSubscribers.delete(subscriber);
    }
  }
}

export function createCaptureRoutes(getDb: GetDb) {
  const app = new Hono();

  // ============================================================
  // GET /capture/stream - SSE stream for real-time hook logs
  // ============================================================
  app.get('/stream', async (c) => {
    return streamSSE(c, async (stream) => {
      console.log('[SSE] Client connected');

      // Send initial connection event
      await stream.writeSSE({
        event: 'connected',
        data: JSON.stringify({
          message: 'Connected to hook stream',
          timestamp: Date.now(),
          subscribers: sseSubscribers.size + 1,
        }),
      });

      // Subscribe to new observations
      const subscriber: SseSubscriber = async (observation) => {
        try {
          await stream.writeSSE({
            event: 'hook',
            data: JSON.stringify(observation),
          });
        } catch {
          sseSubscribers.delete(subscriber);
        }
      };

      sseSubscribers.add(subscriber);
      console.log(`[SSE] Subscribers: ${sseSubscribers.size}`);

      // Heartbeat every 30s
      const heartbeat = setInterval(async () => {
        try {
          await stream.writeSSE({
            event: 'heartbeat',
            data: JSON.stringify({ timestamp: Date.now() }),
          });
        } catch {
          clearInterval(heartbeat);
          sseSubscribers.delete(subscriber);
        }
      }, 30000);

      // Cleanup on disconnect
      stream.onAbort(() => {
        console.log('[SSE] Client disconnected');
        clearInterval(heartbeat);
        sseSubscribers.delete(subscriber);
      });

      // Keep stream open indefinitely
      await new Promise(() => {});
    });
  });

  // ============================================================
  // GET /capture/history - Get recent observations with pagination
  // ============================================================
  app.get('/history', async (c) => {
    const db = await getDb();
    const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
    const offset = parseInt(c.req.query('offset') || '0');
    const session_id = c.req.query('session_id');

    try {
      const params: any[] = [];
      let whereClause = '';

      if (session_id) {
        whereClause = 'WHERE session_id = ?';
        params.push(session_id);
      }

      const observations = db.query(`
        SELECT * FROM hook_observations
        ${whereClause}
        ORDER BY timestamp DESC, id DESC
        LIMIT ? OFFSET ?
      `, ...params, limit, offset);

      const countResult = db.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM hook_observations ${whereClause}`,
        ...params
      );

      return c.json({
        observations: observations.map((o: any) => ({
          ...o,
          payload: typeof o.payload === 'string' ? JSON.parse(o.payload) : o.payload,
        })),
        total: countResult?.count || 0,
        limit,
        offset,
      });
    } catch (e) {
      console.error('[History] Error:', e);
      return c.json({ error: 'Failed to fetch history' }, 500);
    }
  });

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
      const timestamp = payload.timestamp || Date.now();
      const result = db.run(`
        INSERT INTO hook_observations (session_id, hook_name, payload, timestamp)
        VALUES (?, ?, ?, ?)
      `,
        session_id,
        hook_name,
        JSON.stringify(payload),
        timestamp
      );

      const observation: HookObservation = {
        id: Number(result.lastInsertRowid),
        session_id,
        hook_name,
        payload,
        timestamp,
        created_at: Date.now(),
      };

      // Notify SSE subscribers
      notifySubscribers(observation);
      console.log(`[Capture] ${hook_name} from ${session_id} (${sseSubscribers.size} subscribers)`);

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
        const timestamp = obs.payload.timestamp || Date.now();
        const result = stmt.run(
          obs.session_id,
          obs.hook_name,
          JSON.stringify(obs.payload),
          timestamp
        );

        // Notify SSE subscribers for each observation
        notifySubscribers({
          id: Number(result.lastInsertRowid),
          session_id: obs.session_id,
          hook_name: obs.hook_name,
          payload: obs.payload,
          timestamp,
        });
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
        observations: observations.map((o: any) => ({
          ...o,
          payload: typeof o.payload === 'string' ? JSON.parse(o.payload) : o.payload,
        })),
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
