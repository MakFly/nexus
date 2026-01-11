#!/usr/bin/env bun
/**
 * Nexus CLI - Command-line interface for Nexus
 *
 * Usage:
 *   nexus watch [path]          - Start watching directory
 *   nexus watch --pause         - Pause watcher
 *   nexus watch --resume        - Resume watcher
 *   nexus watch --status        - Get watcher status
 *   nexus watch --stop          - Stop watcher
 */

import { readdirSync } from 'fs';

const API_BASE = process.env.NEXUS_API_URL || 'http://localhost:3001';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  dim: '\x1b[2m',
};

function log(message: string, color = 'reset') {
  console.log(`${colors[color as keyof typeof colors]}${message}${colors.reset}`);
}

async function apiRequest(endpoint: string, method = 'GET', body?: any) {
  const url = `${API_BASE}${endpoint}`;

  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (e) {
    throw new Error(`API request failed: ${e}`);
  }
}

async function cmdWatch(args: string[]) {
  const path = args[0] || process.cwd();

  // Check for flags
  if (args.includes('--status')) {
    try {
      const status = await apiRequest('/watcher/status', 'GET');

      if (status.status === 'stopped') {
        log('Watcher not running', 'yellow');
        return;
      }

      log(`Watcher Status:`, 'blue');
      log(`  Status: ${status.status}`, 'green');
      log(`  Queued files: ${status.queuedFiles}`, 'dim');
      log(`  Watched paths: ${status.watchedPaths}`, 'dim');
      log(`  Uptime: ${status.uptime}s`, 'dim');
    } catch (e) {
      log(`Error: ${e}`, 'red');
      process.exit(1);
    }
    return;
  }

  if (args.includes('--pause')) {
    try {
      const result = await apiRequest('/watcher/pause', 'POST');
      log(result.message, 'green');
    } catch (e) {
      log(`Error: ${e}`, 'red');
      process.exit(1);
    }
    return;
  }

  if (args.includes('--resume')) {
    try {
      const result = await apiRequest('/watcher/resume', 'POST');
      log(result.message, 'green');
    } catch (e) {
      log(`Error: ${e}`, 'red');
      process.exit(1);
    }
    return;
  }

  if (args.includes('--stop')) {
    try {
      const result = await apiRequest('/watcher/stop', 'POST');
      log(result.message, 'green');
    } catch (e) {
      log(`Error: ${e}`, 'red');
      process.exit(1);
    }
    return;
  }

  // Default: start watching
  try {
    log(`Starting watcher for: ${path}`, 'blue');
    const result = await apiRequest('/watcher/start', 'POST', {
      path,
      debounceMs: 500,
      batchSize: 10,
    });

    log(result.message, 'green');
    log(`Debounce: ${result.debounceMs}ms`, 'dim');
    log(`Batch size: ${result.batchSize}`, 'dim');
    log('\nPress Ctrl+C to stop...', 'dim');

    // Keep process alive
    process.on('SIGINT', async () => {
      log('\nStopping watcher...', 'yellow');
      await apiRequest('/watcher/stop', 'POST');
      log('Watcher stopped', 'green');
      process.exit(0);
    });

    // Prevent exit
    await new Promise(() => {});
  } catch (e) {
    log(`Error: ${e}`, 'red');
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    showHelp();
    return;
  }

  switch (command) {
    case 'watch':
      await cmdWatch(args.slice(1));
      break;
    default:
      log(`Unknown command: ${command}`, 'red');
      showHelp();
      process.exit(1);
  }
}

function showHelp() {
  log('Nexus CLI - Command-line interface for Nexus\n', 'blue');
  log('Usage:', 'green');
  log('  nexus watch [path]          Start watching directory', 'dim');
  log('  nexus watch --status        Get watcher status', 'dim');
  log('  nexus watch --pause         Pause watcher', 'dim');
  log('  nexus watch --resume        Resume watcher', 'dim');
  log('  nexus watch --stop          Stop watcher', 'dim');
  log('\nEnvironment:', 'green');
  log('  NEXUS_API_URL               API URL (default: http://localhost:3001)', 'dim');
}

main();
