/**
 * Nexus API Server
 * v2: FTS5-based search (mgrep-like, local, no cloud)
 */

// Load .env
const envFile = Bun.file('./.env');
if (await envFile.exists()) {
  const content = await envFile.text();
  for (const line of content.split('\n')) {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').trim();
    if (key && value && !key.startsWith('#')) {
      process.env[key.trim()] = value;
    }
  }
}

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { join } from 'path';
import { readFileSync } from 'fs';

// Database
import { createDatabase, initHash } from '@nexus/storage';

// FTS5 search (BM25 ranking)
import { ftsSearch, formatMgrep, type FtsSearchOptions } from '@nexus/search/dist/fts5.js';

// Ripgrep fallback (for live grep without index)
import { rgSearch } from '@nexus/search/dist/ripgrep.js';

// Semantic search (embeddings)
import {
  initEmbeddings,
  semanticSearch,
  hybridSearch,
} from '@nexus/search/dist/embeddings/index.js';

// Routes
import healthRoutes from './routes/health.js';
import { createMemoryRoutes } from './routes/memory.js';
import { createPatternsRoutes } from './routes/patterns.js';
import { createProjectRoutes } from './routes/projects.js';
import { createCaptureRoutes } from './routes/capture.js';
import { createContextRoutes } from './routes/context.js';
import { createWatcherRoutes } from './routes/watcher.js';
import { createSettingsRoutes } from './routes/settings.js';
import { createSessionsRoutes } from './routes/sessions.js';

// Embeddings initialization flag
let embeddingsInitialized = false;

async function ensureEmbeddings() {
  if (!embeddingsInitialized && process.env.MISTRAL_API_KEY) {
    initEmbeddings({
      provider: (process.env.EMBEDDING_PROVIDER as 'mistral' | 'openai' | 'ollama') || 'mistral',
      apiKey: process.env.MISTRAL_API_KEY || process.env.OPENAI_API_KEY,
    });
    embeddingsInitialized = true;
  }
}

// Create Hono app
const app = new Hono();

// Database singleton
let db: Awaited<ReturnType<typeof createDatabase>> | null = null;

async function getDb() {
  if (!db) {
    await initHash();
    // import.meta.dir = apps/api/src/, so we go to parent then nexus.db
    const dbPath = import.meta.dir + '/../nexus.db';
    console.log('[DB] Using database path:', dbPath, 'resolved:', new URL(dbPath, 'file://').pathname);
    db = createDatabase({ path: dbPath, verbose: false });
  }
  return db;
}

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));

// Routes
app.route('/', healthRoutes);
app.route('/memory', createMemoryRoutes(getDb as any));
app.route('/patterns', createPatternsRoutes(getDb as any));
app.route('/projects', createProjectRoutes(getDb as any));
app.route('/capture', createCaptureRoutes(getDb as any));
app.route('/context', createContextRoutes(getDb as any));
app.route('/watcher', createWatcherRoutes(getDb as any));
app.route('/settings', createSettingsRoutes(getDb as any));
app.route('/sessions', createSessionsRoutes());

// Stats route
app.get('/stats', async (c) => {
  const database = await getDb();
  const fileCount = database.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM files');
  const chunkCount = database.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM chunks');
  const embeddingCount = database.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM embeddings');

  return c.json({
    files: fileCount?.count || 0,
    chunks: chunkCount?.count || 0,
    embeddings: embeddingCount?.count || 0,
    engines: {
      keyword: 'fts5',
      semantic: embeddingsInitialized ? 'mistral' : 'not configured',
    },
  });
});

// Search endpoint - FTS5 with BM25 ranking (mgrep-like)
app.post('/search', async (c) => {
  const database = await getDb();
  const body = await c.req.json();
  const { q, limit = 20, offset = 0 } = body;

  if (!q || typeof q !== 'string') {
    return c.json({ error: 'Missing query parameter "q"' }, 400);
  }

  try {
    const options: FtsSearchOptions = {
      limit: Math.min(limit, 100),
      offset,
    };

    const result = ftsSearch(database as any, q, options);

    return c.json({
      query: q,
      hits: result.hits.map(h => ({
        path: h.path,
        startLine: h.startLine,
        endLine: h.endLine,
        content: h.content,
        symbol: h.symbol,
        score: h.score,
        mgrep: formatMgrep(h),  // path:lines [score%]
      })),
      totalHits: result.totalHits,
      processingTimeMs: result.processingTimeMs,
    });
  } catch (e) {
    return c.json({ error: 'Search failed', message: String(e) }, 500);
  }
});

// Live grep endpoint - ripgrep for unindexed search
app.post('/grep', async (c) => {
  const body = await c.req.json();
  const { q, path, limit = 20, glob, regex = false } = body;

  if (!q || typeof q !== 'string') {
    return c.json({ error: 'Missing query parameter "q"' }, 400);
  }

  const searchPath = path || join(process.cwd(), 'packages');

  try {
    const result = await rgSearch({
      query: q,
      path: searchPath,
      maxResults: Math.min(limit, 50),
      fileGlob: glob,
      regex,
      contextLines: 2,
    });

    return c.json({
      query: q,
      hits: result.matches.map(m => ({
        path: m.path,
        line: m.lineNumber,
        content: m.content,
      })),
      totalHits: result.totalMatches,
      filesSearched: result.filesSearched,
      processingTimeMs: result.durationMs,
      truncated: result.truncated,
    });
  } catch (e) {
    return c.json({ error: 'Grep failed', message: String(e) }, 500);
  }
});

// Semantic search endpoint - embeddings + cosine similarity
app.post('/search/semantic', async (c) => {
  const database = await getDb();
  await ensureEmbeddings();

  if (!embeddingsInitialized) {
    return c.json({ error: 'Embeddings not configured. Set MISTRAL_API_KEY in .env' }, 503);
  }

  const body = await c.req.json();
  const { q, limit = 10 } = body;

  if (!q || typeof q !== 'string') {
    return c.json({ error: 'Missing query parameter "q"' }, 400);
  }

  try {
    const result = await semanticSearch(database as any, q, Math.min(limit, 50));

    return c.json({
      query: q,
      mode: 'semantic',
      hits: result.hits.map(h => ({
        path: h.path,
        startLine: h.startLine,
        endLine: h.endLine,
        content: h.content,
        symbol: h.symbol,
        similarity: h.similarity,
        mgrep: `./${h.path}:${h.startLine}-${h.endLine} [${(h.similarity * 100).toFixed(0)}%]`,
      })),
      embeddingTimeMs: result.embeddingTimeMs,
      processingTimeMs: result.processingTimeMs,
    });
  } catch (e) {
    return c.json({ error: 'Semantic search failed', message: String(e) }, 500);
  }
});

// Hybrid search endpoint - semantic + keyword
app.post('/search/hybrid', async (c) => {
  const database = await getDb();
  await ensureEmbeddings();

  if (!embeddingsInitialized) {
    return c.json({ error: 'Embeddings not configured. Set MISTRAL_API_KEY in .env' }, 503);
  }

  const body = await c.req.json();
  const { q, limit = 10, semanticWeight = 0.7, keywordWeight = 0.3 } = body;

  if (!q || typeof q !== 'string') {
    return c.json({ error: 'Missing query parameter "q"' }, 400);
  }

  try {
    const result = await hybridSearch(database as any, q, {
      limit: Math.min(limit, 50),
      semanticWeight,
      keywordWeight,
    });

    return c.json({
      query: q,
      mode: 'hybrid',
      weights: { semantic: semanticWeight, keyword: keywordWeight },
      hits: result.hits.map(h => ({
        path: h.path,
        startLine: h.startLine,
        endLine: h.endLine,
        content: h.content,
        symbol: h.symbol,
        score: h.similarity,
        mgrep: `./${h.path}:${h.startLine}-${h.endLine} [${(h.similarity * 100).toFixed(0)}%]`,
      })),
      embeddingTimeMs: result.embeddingTimeMs,
      processingTimeMs: result.processingTimeMs,
    });
  } catch (e) {
    return c.json({ error: 'Hybrid search failed', message: String(e) }, 500);
  }
});

// Open file endpoint - read file content
app.post('/open', async (c) => {
  const { path: filePath, startLine, endLine, project_id } = await c.req.json();

  if (!filePath || typeof filePath !== 'string') {
    return c.json({ error: 'Missing file path' }, 400);
  }

  try {
    let fullPath = filePath;

    // Resolve path based on project or fallback logic
    if (!filePath.startsWith('/')) {
      if (project_id) {
        // Get project root_path from database
        const database = await getDb();
        const project = database.queryOne<{ root_path: string }>(
          'SELECT root_path FROM projects WHERE id = ?',
          project_id
        );
        if (project?.root_path) {
          fullPath = join(project.root_path, filePath);
        } else {
          // Fallback to packages for backward compatibility
          fullPath = join(process.cwd(), 'packages', filePath);
        }
      } else {
        // Try /tmp first for nexus-symfony-test, fallback to packages
        const tmpPath = join('/tmp', filePath);
        const packagesPath = join(process.cwd(), 'packages', filePath);
        try {
          // Try tmp path first
          readFileSync(tmpPath, 'utf-8');
          fullPath = tmpPath;
        } catch {
          fullPath = packagesPath;
        }
      }
    }

    const content = readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');

    const start = Math.max(0, (startLine || 1) - 1);
    const end = Math.min(lines.length, endLine || lines.length);
    const excerpt = lines.slice(start, end).join('\n');

    return c.json({
      path: filePath,
      startLine: start + 1,
      endLine: end,
      totalLines: lines.length,
      content: excerpt,
    });
  } catch (e) {
    return c.json({ error: 'File not found', message: String(e) }, 404);
  }
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('[API Error]', err);
  return c.json({ error: 'Internal Server Error', message: err.message }, 500);
});

// Server config
const port = parseInt(process.env.PORT || '3001');

// Init embeddings
await ensureEmbeddings();

// Log endpoints on first load
console.log(`[API] Server running on http://localhost:${port}`);
console.log(`[API] Endpoints:`);
console.log(`  POST /search          - Keyword (FTS5 + BM25)`);
console.log(`  POST /search/semantic - Semantic (embeddings)`);
console.log(`  POST /search/hybrid   - Hybrid (70% sem + 30% kw)`);
console.log(`  POST /grep            - Live grep (ripgrep)`);
console.log(`  POST /open            - Read file content`);
console.log(`  GET  /stats           - Database stats`);
console.log(`  GET  /memory/recall   - Memory index (compact)`);
console.log(`  POST /memory/batch    - Memory batch (full)`);
console.log(`  *    /memory/:id      - Memory CRUD`);
console.log(`  POST /patterns/capture  - Capture candidate`);
console.log(`  POST /patterns/distill  - Distill to pattern`);
console.log(`  GET  /patterns/recall   - Pattern recall (compact)`);
console.log(`  *    /patterns/:id      - Pattern CRUD`);
console.log(`  GET  /projects          - List projects`);
console.log(`  GET  /projects/detect   - Detect project by path`);
console.log(`  *    /projects/:id      - Project CRUD`);
console.log(`  GET  /projects/:id/files - Project files tree`);
console.log(`  POST /capture          - Auto-capture single observation`);
console.log(`  POST /capture/batch    - Auto-capture batch`);
console.log(`  POST /capture/distill  - Trigger LLM distillation`);
console.log(`  GET  /capture/session/:id - Get session observations`);
console.log(`  GET  /capture/queue     - Get pending distillation queue`);
console.log(`  GET  /context/inject   - Context injection for hooks`);
console.log(`  POST /watcher/start    - Start file watcher`);
console.log(`  POST /watcher/stop     - Stop file watcher`);
console.log(`  POST /watcher/pause    - Pause file watcher`);
console.log(`  POST /watcher/resume   - Resume file watcher`);
console.log(`  GET  /watcher/status   - Get watcher status`);
console.log(`  GET  /watcher/queue    - Get queued files`);
console.log(`  GET  /sessions         - CLI sessions (Claude, Codex, Gemini)`);
console.log(`  GET  /sessions/summary - Sessions summary`);
console.log(`[API] Semantic search: ${embeddingsInitialized ? 'enabled (Mistral)' : 'disabled (set MISTRAL_API_KEY)'}`);
console.log(`[API] Auto-capture: enabled (hooks compatible)`);
console.log(`[API] File watcher: enabled (chokidar)`);

// Export for Bun.serve with hot reload support
export default {
  port,
  fetch: app.fetch,
};

// Also export app for tests
export { app, port };
