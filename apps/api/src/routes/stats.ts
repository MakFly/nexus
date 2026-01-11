/**
 * Stats routes (mock for now)
 */

import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => {
  // Mock stats for Sprint 0
  // In future sprints, this will query the database
  return c.json({
    database: {
      status: 'connected',
      files: 0,
      chunks: 0,
      observations: 0,
      patterns: 0,
      candidates: 0
    },
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: process.platform,
      nodeVersion: process.version
    }
  });
});

export default app;
