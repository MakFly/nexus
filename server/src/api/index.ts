/**
 * REST API Server for Free Context MCP
 * Provides HTTP endpoints for the dashboard to interact with the MCP server
 */

import { Hono } from 'hono';
import { serve } from 'bun';
import { initializeDatabase } from '../storage/client.js';
import { config } from '../config.js';
import {
  corsMiddleware,
  errorHandler,
  loggingMiddleware,
  healthCheck,
} from './middleware.js';
import { contextsRouter } from './contexts.js';
import { memoriesRouter } from './memories.js';
import { searchRouter } from './search.js';
import { automationRouter } from './automation.js';
import { createMcpTransport } from '../mcp-transport.js';

/**
 * Create and configure the API server
 */
export async function createApiServer() {
  const app = new Hono();

  // Apply middleware
  app.use('*', corsMiddleware);
  app.use('*', errorHandler);
  app.use('*', loggingMiddleware);

  // Health check endpoint
  app.get('/api/health', (c) => {
    return c.json(healthCheck());
  });

  // API routes
  app.route('/api/contexts', contextsRouter);
  app.route('/api/memories', memoriesRouter);
  app.route('/api/search', searchRouter);
  app.route('/api/automation', automationRouter);

  // MCP Streamable HTTP endpoint
  // Setup MCP transport and add the endpoint
  const mcpHandler = await createMcpTransport();
  app.all('/mcp', async (c) => {
    const response = await mcpHandler(c.req.raw);
    return response;
  });

  // Root endpoint
  app.get('/', (c) => {
    return c.json({
      name: 'Free Context API',
      version: '0.1.0',
      status: 'running',
      endpoints: {
        health: '/api/health',
        contexts: '/api/contexts',
        memories: '/api/memories',
        search: '/api/search',
        automation: '/api/automation',
        mcp: '/mcp',
      },
      mcp: {
        transport: 'streamable-http',
        endpoint: '/mcp',
        usage: 'claude mcp add --transport http https://your-domain.com/mcp',
      },
    });
  });

  // 404 handler
  app.notFound((c) => {
    return c.json(
      {
        success: false,
        error: 'Not found',
      },
      404
    );
  });

  return app;
}

/**
 * Start the HTTP API server
 */
export async function startApiServer(port: number = 3001) {
  // Initialize database
  await initializeDatabase();

  const app = await createApiServer();

  const server = serve({
    fetch: app.fetch,
    port,
  });

  console.log(`[API] Server running on http://localhost:${port}`);
  console.log(`[API] Health check: http://localhost:${port}/api/health`);

  return server;
}
