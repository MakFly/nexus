/**
 * File Watcher Service - Nexus
 * Monitors filesystem for changes and maintains FTS5 index
 * Inspired by mgrep watch functionality
 */

import chokidar from 'chokidar';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import type { Database } from '@nexus/storage';
import { IncrementalIndexer } from './incremental-indexer.js';

interface WatcherConfig {
  rootPath: string;
  debounceMs: number;
  ignored: string[];
  batchSize: number;
  db: Database;
}

// FileChangeEvent interface is unused

export class FileWatcher {
  private watcher: any = null;
  private queue: Map<string, number> = new Map();
  private debounceTimer: NodeJS.Timeout | null = null;
  private isPaused = false;
  private status: 'running' | 'paused' | 'stopped' = 'stopped';
  private startTime: number = 0;
  private pausedAt: number = 0;
  private readonly config: WatcherConfig;
  private readonly indexer: IncrementalIndexer;

  constructor(config: WatcherConfig) {
    this.config = config;
    this.indexer = new IncrementalIndexer();
  }

  /**
   * Load ignore patterns from .gitignore and .nexusignore
   */
  private loadIgnorePatterns(): string[] {
    const defaults = [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/*.min.js',
      '**/*.min.css',
      '**/.cache/**',
      '**/.turbo/**',
      '**/.vercel/**',
    ];

    // Load .gitignore
    const gitignorePath = join(this.config.rootPath, '.gitignore');
    let gitignorePatterns: string[] = [];
    if (existsSync(gitignorePath)) {
      const content = readFileSync(gitignorePath, 'utf-8');
      gitignorePatterns = this.parseGitignore(content);
    }

    // Load .nexusignore (local override)
    const nexusignorePath = join(this.config.rootPath, '.nexusignore');
    let nexusignorePatterns: string[] = [];
    if (existsSync(nexusignorePath)) {
      const content = readFileSync(nexusignorePath, 'utf-8');
      nexusignorePatterns = content
        .split('\n')
        .filter(line => line && !line.startsWith('#'))
        .map(line => line.trim());
    }

    return [...defaults, ...gitignorePatterns, ...nexusignorePatterns, ...this.config.ignored];
  }

  /**
   * Parse .gitignore content into glob patterns
   */
  private parseGitignore(content: string): string[] {
    const patterns: string[] = [];
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Convert gitignore pattern to glob
      let pattern = trimmed;
      if (pattern.endsWith('/')) {
        pattern = pattern.slice(0, -1); // Remove trailing slash
      }
      if (!pattern.includes('*')) {
        pattern = `**/${pattern}/**`; // Match anywhere
      }
      patterns.push(pattern);
    }
    return patterns;
  }

  /**
   * Start watching files
   */
  start(): void {
    if (this.watcher) {
      console.log('[Watcher] Already running');
      return;
    }

    this.status = 'running';
    this.startTime = Date.now();

    const ignorePatterns = this.loadIgnorePatterns();

    this.watcher = chokidar.watch(this.config.rootPath, {
      ignored: ignorePatterns,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100,
      },
      persistent: true,
    });

    this.watcher
      .on('add', (path: string) => this.onFileChange(path, 'add'))
      .on('change', (path: string) => this.onFileChange(path, 'change'))
      .on('unlink', (path: string) => this.onFileChange(path, 'unlink'))
      .on('error', (error: any) => console.error('[Watcher] Error:', error))
      .on('ready', () => this.onReady());

    console.log(`[Watcher] ▶ Started watching ${this.config.rootPath}`);
  }

  /**
   * Handle file change event
   */
  private onFileChange(path: string, _eventType: 'add' | 'change' | 'unlink'): void {
    if (this.isPaused) {
      // Queue but don't schedule flush when paused
      this.queue.set(path, Date.now());
      return;
    }

    this.queue.set(path, Date.now());
    this.scheduleFlush();
  }

  /**
   * Schedule debounced flush
   */
  private scheduleFlush(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.flush().catch((e) => console.error('[Watcher] Flush error:', e));
    }, this.config.debounceMs);
  }

  /**
   * Flush queued files to indexer
   */
  private async flush(): Promise<void> {
    const files = Array.from(this.queue.entries());
    this.queue.clear();

    if (files.length === 0) return;

    const filePaths = files.map(([path]) => path);
    console.log(`[Watcher] 🔄 Indexing ${filePaths.length} files...`);

    const startTime = Date.now();
    const results = await this.indexer.updateFiles(
      this.config.db,
      filePaths,
      this.config.rootPath,
      this.config.batchSize
    );

    const successCount = results.filter(r => r.success).length;
    const duration = Date.now() - startTime;

    console.log(`[Watcher] ✓ Processed ${successCount}/${filePaths.length} files in ${duration}ms`);

    // Log failures
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      console.log(`[Watcher] ✗ Failed to index ${failures.length} files:`);
      for (const failure of failures) {
        console.log(`  - ${failure.path}: ${failure.error}`);
      }
    }
  }

  /**
   * Pause watching (events are queued)
   */
  pause(): void {
    this.isPaused = true;
    this.status = 'paused';
    this.pausedAt = Date.now();
    console.log(`[Watcher] ⏸ Paused (queue: ${this.queue.size} files)`);
  }

  /**
   * Resume watching and flush queue
   */
  resume(): void {
    const queuedCount = this.queue.size;
    this.isPaused = false;
    this.status = 'running';

    console.log(`[Watcher] ▶ Resumed (processing ${queuedCount} queued files...)`);

    if (queuedCount > 0) {
      this.flush().catch((e) => console.error('[Watcher] Resume flush error:', e));
    }
  }

  /**
   * Stop watching
   */
  async stop(): Promise<void> {
    if (!this.watcher) return;

    this.status = 'stopped';

    console.log('[Watcher] Shutting down...');

    // Flush remaining queue
    if (this.queue.size > 0) {
      console.log(`[Watcher] Processing ${this.queue.size} remaining files...`);
      await this.flush();
    }

    // Close watcher
    await this.watcher.close();

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    console.log('[Watcher] ✓ Stopped');
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      status: this.status,
      isRunning: this.watcher !== null,
      isPaused: this.isPaused,
      queuedFiles: this.queue.size,
      watchedPaths: this.watcher?.getWatched().size || 0,
      uptime: this.status === 'running'
        ? Math.floor((Date.now() - this.startTime) / 1000)
        : 0,
      pausedDuration: this.status === 'paused'
        ? Math.floor((Date.now() - this.pausedAt) / 1000)
        : 0,
    };
  }

  /**
   * Get queued files (for testing/debugging)
   */
  getQueue(): string[] {
    return Array.from(this.queue.keys());
  }

  private onReady(): void {
    const watchedCount = this.watcher?.getWatched().size || 0;
    console.log(`[Watcher] 🔄 Watching ${watchedCount} paths`);
  }
}
