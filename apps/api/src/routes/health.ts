/**
 * Health check routes
 */

import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'nexus-api',
    version: '0.1.0'
  });
});

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'nexus-api',
    version: '0.1.0'
  });
});

app.get('/ping', (c) => {
  return c.json({ pong: true });
});

export default app;
