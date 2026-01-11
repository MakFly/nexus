#!/usr/bin/env bun
/**
 * Streaming Indexation Script - Memory-safe
 *
 * Uses generator-based scanning with backpressure
 * Safe alternative to the legacy index.ts
 */

import { scanWithProgress, dryRun, printDryRunReport, type FileInfo } from '@nexus/indexer';
import { createDatabase, hashSync } from '@nexus/storage';
import { initSearch, indexChunks, makeChunkId, type ChunkDocument } from '@nexus/search';
import { chunkFile } from '@nexus/indexer';
import { detectLanguage } from '@nexus/indexer';
import { join } from 'path';
import { readFileSync } from 'fs';

// Config
const ROOT = join(import.meta.dir, '../../../packages');
const DB_PATH = join(import.meta.dir, '../nexus.db');
const MICRO_BATCH_SIZE = 10;

async function main() {
  console.log('🚀 STREAMING INDEXATION - Memory Safe');
  console.log('📍 Target:', ROOT);
  console.log('');

  // Step 1: Dry-run first
  console.log('📊 Step 1: Dry-run analysis...');
  const dryRunResult = dryRun({
    rootPath: ROOT,
    maxFileSize: 100 * 1024,
    maxFiles: 200,
    maxDepth: 15,
  });

  printDryRunReport(dryRunResult);

  // Safety check
  if (dryRunResult.totalFiles > 200) {
    console.log('❌ Too many files. Aborting.');
    process.exit(1);
  }

  // Step 2: Initialize services
  console.log('📊 Step 2: Initializing services...');

  await initSearch({
    host: 'http://localhost:7700',
    apiKey: 'master_key_nexus_dev_only',
    indexName: 'chunks',
  });
  console.log('✅ Meilisearch connected');

  const db = createDatabase({ path: DB_PATH, verbose: false });
  console.log('✅ SQLite ready');

  // Step 3: Stream indexation
  console.log('\n📊 Step 3: Indexing with streaming...');

  let filesIndexed = 0;
  let chunksCreated = 0;
  let microBatch: ChunkDocument[] = [];

  const flushBatch = async () => {
    if (microBatch.length > 0) {
      await indexChunks(microBatch);
      microBatch = [];
    }
  };

  const processFile = async (file: FileInfo) => {
    try {
      // Read content
      const content = readFileSync(file.fullPath, 'utf-8');
      const hash = hashSync(content);
      const lang = detectLanguage(file.fullPath);

      // Check if already indexed
      const existing = db.queryOne<{ id: number; hash: string }>(
        'SELECT id, hash FROM files WHERE path = ?',
        [file.relPath]
      );

      if (existing && existing.hash === hash) {
        return; // Skip unchanged
      }

      // Chunk file
      const chunkResult = chunkFile(file.fullPath, content, { maxLines: 30 });

      // Upsert file record
      let fileId: number;
      if (existing) {
        db.update(
          'UPDATE files SET hash = ?, mtime = ?, size = ?, lang = ?, indexed_at = ? WHERE id = ?',
          [hash, file.mtimeMs, file.size, lang || null, Date.now(), existing.id]
        );
        fileId = existing.id;
      } else {
        fileId = db.insert(
          'INSERT INTO files (path, hash, mtime, size, lang, indexed_at) VALUES (?, ?, ?, ?, ?, ?)',
          [file.relPath, hash, file.mtimeMs, file.size, lang || null, Date.now()]
        );
      }

      // Add chunks to micro-batch
      for (const chunk of chunkResult.chunks) {
        microBatch.push({
          id: makeChunkId(fileId, chunk.startLine, chunk.endLine),
          file_id: fileId,
          path: file.relPath,
          start_line: chunk.startLine,
          end_line: chunk.endLine,
          content: chunk.content,
          symbol: chunk.symbol,
          kind: chunk.kind,
          lang: lang || undefined,
          indexed_at: Date.now(),
        });
        chunksCreated++;

        // Flush when batch is full
        if (microBatch.length >= MICRO_BATCH_SIZE) {
          await flushBatch();
        }
      }

      filesIndexed++;
    } catch (e) {
      console.error(`  ❌ ${file.relPath}: ${e}`);
    }
  };

  const startTime = Date.now();

  const { filesProcessed, errors } = await scanWithProgress(
    {
      rootPath: ROOT,
      maxFileSize: 100 * 1024,
      maxFiles: 200,
      maxDepth: 15,
    },
    (progress) => {
      // Progress callback
      process.stdout.write(`\r  📁 ${progress.currentFile.padEnd(50)} [${progress.memoryUsedMB}MB]`);
    },
    processFile
  );

  // Final flush
  await flushBatch();

  console.log('\n');
  console.log('='.repeat(50));
  console.log('✅ INDEXATION COMPLETE');
  console.log('='.repeat(50));
  console.log(`Files scanned:  ${filesProcessed}`);
  console.log(`Files indexed:  ${filesIndexed}`);
  console.log(`Chunks created: ${chunksCreated}`);
  console.log(`Duration:       ${Date.now() - startTime}ms`);
  console.log(`Errors:         ${errors.length}`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    for (const err of errors.slice(0, 5)) {
      console.log(`  - ${err}`);
    }
  }

  db.close();
}

main().catch((e) => {
  console.error('💥 Fatal error:', e);
  process.exit(1);
});
