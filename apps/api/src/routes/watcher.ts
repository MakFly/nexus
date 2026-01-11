/**
 * Watcher Routes - Nexus API
 * Controls file watcher for continuous indexing
 */

import { Hono } from 'hono';
import type { Database } from '@nexus/storage';
import { FileWatcher } from '../services/watcher.js';

type GetDb = () => Promise<Database>;

// Global watcher singleton
let globalWatcher: FileWatcher | null = null;

export function createWatcherRoutes(getDb: GetDb) {
  const app = new Hono();

  // ============================================================
  // POST /watcher/start - Start watching a directory
  // ============================================================
  app.post('/start', async (c) => {
    const { path, debounceMs = 500, batchSize = 10 } = await c.req.json();

    if (!path) {
      return c.json({ error: 'Missing path parameter' }, 400);
    }

    if (globalWatcher) {
      return c.json({ error: 'Watcher already running. Stop it first.' }, 409);
    }

    try {
      const db = await getDb();

      globalWatcher = new FileWatcher({
        rootPath: path,
        debounceMs,
        ignored: [],
        batchSize,
        db,
      });

      globalWatcher.start();

      return c.json({
        message: 'Watcher started',
        path,
        debounceMs,
        batchSize,
        status: globalWatcher.getStatus(),
      });
    } catch (e) {
      globalWatcher = null;
      return c.json({ error: 'Failed to start watcher', message: String(e) }, 500);
    }
  });

  // ============================================================
  // POST /watcher/stop - Stop watching
  // ============================================================
  app.post('/stop', async (c) => {
    if (!globalWatcher) {
      return c.json({ error: 'Watcher not running' }, 404);
    }

    try {
      await globalWatcher.stop();
      const status = globalWatcher.getStatus();
      globalWatcher = null;

      return c.json({
        message: 'Watcher stopped',
        status,
      });
    } catch (e) {
      return c.json({ error: 'Failed to stop watcher', message: String(e) }, 500);
    }
  });

  // ============================================================
  // POST /watcher/pause - Pause watching (events are queued)
  // ============================================================
  app.post('/pause', (c) => {
    if (!globalWatcher) {
      return c.json({ error: 'Watcher not running' }, 404);
    }

    globalWatcher.pause();

    return c.json({
      message: 'Watcher paused',
      status: globalWatcher.getStatus(),
    });
  });

  // ============================================================
  // POST /watcher/resume - Resume watching and flush queue
  // ============================================================
  app.post('/resume', (c) => {
    if (!globalWatcher) {
      return c.json({ error: 'Watcher not running' }, 404);
    }

    globalWatcher.resume();

    return c.json({
      message: 'Watcher resumed',
      status: globalWatcher.getStatus(),
    });
  });

  // ============================================================
  // GET /watcher/status - Get current watcher status
  // ============================================================
  app.get('/status', (c) => {
    if (!globalWatcher) {
      return c.json({
        status: 'stopped',
        isRunning: false,
        message: 'Watcher not running',
      });
    }

    return c.json(globalWatcher.getStatus());
  });

  // ============================================================
  // GET /watcher/queue - Get queued files (debug)
  // ============================================================
  app.get('/queue', (c) => {
    if (!globalWatcher) {
      return c.json({ error: 'Watcher not running' }, 404);
    }

    return c.json({
      files: globalWatcher.getQueue(),
      count: globalWatcher.getQueue().length,
    });
  });

  return app;
}
