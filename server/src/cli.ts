#!/usr/bin/env bun
/**
 * Free Context MCP Server CLI
 *
 * Usage:
 *   free-context-mcp                    # Start MCP server (stdio)
 *   free-context-mcp api                # Start HTTP API server
 *   free-context-mcp both               # Start both MCP + API
 *   free-context-mcp --version          # Show version
 *   free-context-mcp --help             # Show help
 */

import { startServer } from './server.js';
import { startApiServer } from './api/index.js';
import { createWebSocketServer } from './api/websocket.js';
import { config } from './config.js';

// Parse CLI arguments
const args = process.argv.slice(2);
const command = args[0]?.toLowerCase();

/**
 * Show version
 */
function showVersion() {
  console.log(`Free Context MCP Server v${config.serverVersion}`);
}

/**
 * Show help
 */
function showHelp() {
  console.log(`
Free Context MCP Server v${config.serverVersion}

USAGE:
  free-context-mcp [command]

COMMANDS:
  mcp, (none)     Start MCP server (stdio transport)
  api             Start HTTP API server (port 3001)
  both            Start both MCP + API servers

OPTIONS:
  --version       Show version
  --help          Show this help

ENVIRONMENT:
  SERVER_MODE     Override command (MCP|API|BOTH)
  API_PORT        API server port (default: 3001)
  WS_PORT         WebSocket port (default: 3002)
  DEBUG           Enable debug logging (true/false)
  DATABASE_PATH   Path to SQLite database

EXAMPLES:
  free-context-mcp                 # MCP mode (for Claude Desktop)
  free-context-mcp api             # API mode
  free-context-mcp both            # Both modes
  API_PORT=8080 free-context-mcp   # Custom API port

For more information, see: https://github.com/yourusername/free-context
  `);
}

/**
 * Get server mode from CLI args or environment
 */
function getServerMode(): 'MCP' | 'API' | 'BOTH' {
  // Environment variable takes precedence
  const envMode = process.env.SERVER_MODE?.toUpperCase();
  if (envMode === 'MCP' || envMode === 'API' || envMode === 'BOTH') {
    return envMode;
  }

  // CLI argument
  switch (command) {
    case 'api':
      return 'API';
    case 'both':
      return 'BOTH';
    case 'mcp':
    case '':
    case undefined:
      return 'MCP';
    case '--version':
    case '-v':
      showVersion();
      process.exit(0);
    case '--help':
    case '-h':
      showHelp();
      process.exit(0);
    default:
      console.error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

/**
 * Main entry point
 */
async function main() {
  const mode = getServerMode();

  if (config.debug) {
    console.error(`[DEBUG] Starting Free Context MCP Server in ${mode} mode`);
  }

  if (mode === 'MCP') {
    // MCP mode - stdio transport for Claude Desktop
    await startServer();
  } else if (mode === 'API') {
    // API mode - HTTP REST API
    const port = parseInt(process.env.API_PORT || '3001', 10);
    await startApiServer(port);
  } else if (mode === 'BOTH') {
    // Both modes - MCP stdio + HTTP API + WebSocket
    const port = parseInt(process.env.API_PORT || '3001', 10);
    const wsPort = parseInt(process.env.WS_PORT || '3002', 10);

    // Start WebSocket server
    createWebSocketServer({ port: wsPort });

    // Start API server (non-blocking)
    startApiServer(port).catch((error) => {
      console.error('[API] Failed to start:', error);
    });

    // Start MCP server (blocking - main process)
    await startServer();
  }
}

// Handle errors
main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
