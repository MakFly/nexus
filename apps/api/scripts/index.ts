#!/usr/bin/env bun
/**
 * Index script - MEILISEARCH OPTIMIZED
 *
 * Uses Meilisearch for efficient full-text search
 * Memory-safe: small batches, streaming to Meilisearch
 */
import { scanWorkspace } from '@nexus/indexer';
import { createDatabase } from '@nexus/storage';
import { initHash } from '@nexus/storage';
import { initSearch } from '@nexus/search';
import { join } from 'path';

// Target ONLY packages/ for indexing (safe default)
const ROOT = join(import.meta.dir, '../../../packages');
const DB_PATH = join(import.meta.dir, '../nexus.db');

async function main() {
  console.log('🚀 SAFE MODE - Indexing with Meilisearch');
  console.log('📍 Target:', ROOT);

  // Initialize Meilisearch
  console.log('🔌 Connecting to Meilisearch...');
  await initSearch({
    host: 'http://localhost:7700',
    apiKey: 'master_key_nexus_dev_only',
    indexName: 'chunks'
  });
  console.log('✅ Meilisearch connected');

  console.log('Initializing hash...');
  await initHash();

  console.log('Opening database:', DB_PATH);
  const db = createDatabase({ path: DB_PATH, verbose: false });

  console.log('Scanning with ULTRA-SAFE limits:');
  console.log('  - maxFiles: 50 (ultra strict)');
  console.log('  - maxFileSize: 50KB (skip large files)');
  console.log('  - batchSize: 3 (tiny batches)');
  console.log('  - maxChunkLines: 20 (tiny chunks)');
  console.log('  - GC forcing enabled between files');

  const result = await scanWorkspace({
    rootPath: ROOT,
    db,
    maxFiles: 50,         // ULTRA STRICT - only 50 files
    maxFileSize: 50 * 1024,   // 50KB max per file (was 500KB)
    batchSize: 3,         // Tiny batches for memory safety
    maxChunkLines: 20,    // Smaller chunks = less memory
    // Ignore node_modules, dist, build, etc.
    ignorePatterns: [
      'node_modules',
      'dist',
      'build',
      '.git',
      '.next',
      'coverage',
      '*.min.js',
      '*.min.css',
    ],
  });

  console.log('\n✅ Indexing Complete ===');
  console.log(`Files scanned: ${result.filesScanned}`);
  console.log(`Files skipped: ${result.filesSkipped}`);
  console.log(`Files indexed: ${result.filesIndexed}`);
  console.log(`Chunks created: ${result.chunksCreated}`);
  console.log(`Duration: ${result.duration}ms`);
  if (result.stoppedEarly) {
    console.log('⚠️  Stopped early (hit maxFiles limit)');
  }
  if (result.errors.length > 0) {
    console.log(`⚠️  Errors: ${result.errors.length}`);
    for (const err of result.errors.slice(0, 5)) {
      console.log(`   - ${err.path}: ${err.error}`);
    }
  }

  // Get stats
  const files = db.queryOne('SELECT COUNT(*) as count FROM files') as { count: number };
  console.log(`\n📊 SQLite: ${files?.count || 0} files`);
  console.log(`📊 Chunks sent to Meilisearch`);

  db.close();
}

main().catch(console.error);
