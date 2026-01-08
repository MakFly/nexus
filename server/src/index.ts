/**
 * Free Context MCP Server
 * Entry point for the Model Context Protocol server and HTTP API
 *
 * Modes:
 * - MCP (default): Runs MCP server over stdio for Claude Desktop integration
 * - API: Runs HTTP REST API server for dashboard communication
 * - BOTH: Runs both servers concurrently
 */

import { startServer } from './server.js';
import { startApiServer } from './api/index.js';
import { createWebSocketServer } from './api/websocket.js';
import { config } from './config.js';

/**
 * Server mode enum
 */
type ServerMode = 'MCP' | 'API' | 'BOTH';

/**
 * Get server mode from environment variable
 */
function getServerMode(): ServerMode {
  const mode = process.env.SERVER_MODE?.toUpperCase();
  if (mode === 'API' || mode === 'BOTH') {
    return mode;
  }
  return 'MCP'; // Default to MCP mode
}

/**
 * Start the appropriate server(s) based on mode
 */
async function main() {
  const mode = getServerMode();

  if (mode === 'MCP') {
    // Start only MCP server (stdio transport)
    if (config.debug) {
      console.error('[DEBUG] Starting in MCP mode (stdio transport)');
    }
    await startServer();
  } else if (mode === 'API') {
    // Start only HTTP API server
    const port = parseInt(process.env.API_PORT || '3001', 10);
    if (config.debug) {
      console.error(`[DEBUG] Starting in API mode (port ${port})`);
    }
    await startApiServer(port);
  } else if (mode === 'BOTH') {
    // Start both MCP and API servers concurrently
    const port = parseInt(process.env.API_PORT || '3001', 10);
    const wsPort = parseInt(process.env.WS_PORT || '3002', 10);
    if (config.debug) {
      console.error(`[DEBUG] Starting in BOTH mode (MCP stdio + API port ${port} + WS port ${wsPort})`);
    }

    // Start WebSocket server in background
    const wsServer = createWebSocketServer({ port: wsPort });
    if (config.debug) {
      console.error(`[DEBUG] WebSocket server started on port ${wsPort}`);
    }

    // Start API server in background
    startApiServer(port).catch((error) => {
      console.error('[API] Failed to start API server:', error);
    });

    // Start MCP server (blocking - this is the main process)
    await startServer();
  }
}

// Start the server(s)
main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
