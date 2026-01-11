/**
 * Settings Routes - Database management
 */

import { Hono } from 'hono';

type Database = {
  exec: (sql: string, ...params: unknown[]) => void;
  run: (sql: string, ...params: unknown[]) => { changes: number; lastInsertRowid: number | bigint };
  query: <T>(sql: string, ...params: unknown[]) => T[];
  queryOne: <T>(sql: string, ...params: unknown[]) => T | null;
};

export function createSettingsRoutes(getDb: () => Promise<Database>) {
  const app = new Hono();

  // ==================== GET SETTINGS INFO ====================
  app.get('/', async (c) => {
    const db = await getDb();

    // Get database stats
    const stats = db.queryOne<{
      files: number;
      chunks: number;
      memories: number;
      patterns: number;
      projects: number;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM files) as files,
        (SELECT COUNT(*) FROM chunks) as chunks,
        (SELECT COUNT(*) FROM observations) as memories,
        (SELECT COUNT(*) FROM candidates) as patterns,
        (SELECT COUNT(*) FROM projects) as projects
    `);

    return c.json({
      database: {
        files: stats?.files || 0,
        chunks: stats?.chunks || 0,
        memories: stats?.memories || 0,
        patterns: stats?.patterns || 0,
        projects: stats?.projects || 0,
      }
    });
  });

  // ==================== RESET DATABASE ====================
  app.post('/reset', async (c) => {
    const db = await getDb();

    // Confirm with password-like confirmation
    const body = await c.req.json();
    const { confirm } = body;

    if (confirm !== 'RESET_DATABASE_CONFIRM') {
      return c.json({ error: 'Confirmation required. Use "RESET_DATABASE_CONFIRM"' }, 400);
    }

    try {
      // Delete all data from tables (in specific order for foreign keys)
      db.exec('DELETE FROM chunks');  // Will cascade due to FK
      db.exec('DELETE FROM files');
      db.exec('DELETE FROM observations');
      db.exec('DELETE FROM candidates');
      db.exec('DELETE FROM hook_observations');
      db.exec('DELETE FROM hook_candidates');
      db.exec('DELETE FROM projects');

      // Reset sequences
      db.exec("DELETE FROM sqlite_sequence WHERE name IN ('files', 'chunks', 'observations', 'candidates', 'projects')");

      return c.json({
        success: true,
        message: 'Database reset successfully. All data has been cleared.'
      });
    } catch (error) {
      console.error('[Settings] Reset error:', error);
      return c.json({ error: 'Failed to reset database' }, 500);
    }
  });

  return app;
}
