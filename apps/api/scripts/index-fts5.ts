#!/usr/bin/env bun
/**
 * FTS5 Indexer - Memory-safe file indexation
 *
 * Key difference from old indexer:
 * - Reads ONE file at a time
 * - Inserts directly into SQLite (triggers sync FTS5)
 * - NO chunking in memory
 * - Simple line-based chunks
 */

import { createDatabase, initHash, hashSync } from '@nexus/storage';
import { join, relative } from 'path';
import { readdirSync, statSync, readFileSync } from 'fs';
import ignoreFactory from 'ignore';

// Config
const ROOT = process.argv[2] || join(import.meta.dir, '../../../packages');
const DB_PATH = join(import.meta.dir, '../nexus.db');
const MAX_FILE_SIZE = 100 * 1024; // 100KB
const CHUNK_LINES = 50; // Lines per chunk
const MAX_FILES = 500;

// Stats
let filesProcessed = 0;
let chunksCreated = 0;
let filesSkipped = 0;

// Ignore patterns
const ig = ignoreFactory();
ig.add([
  'node_modules/**', '.git/**', 'dist/**', 'build/**',
  '*.min.js', '*.min.css', '*.lock', 'package-lock.json',
  '*.db', '*.db-*', 'coverage/**', '.next/**', '.cache/**'
]);

// Binary extensions to skip
const BINARY_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.zip', '.tar', '.gz', '.7z', '.rar',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.exe', '.dll', '.so', '.dylib',
  '.mp3', '.mp4', '.wav', '.avi', '.mov'
]);

function isBinary(path: string): boolean {
  const ext = path.substring(path.lastIndexOf('.')).toLowerCase();
  return BINARY_EXT.has(ext);
}

async function main() {
  console.log('🚀 FTS5 Indexer - Memory Safe');
  console.log(`📍 Root: ${ROOT}`);
  console.log(`📂 DB: ${DB_PATH}`);
  console.log('');

  await initHash();
  const db = createDatabase({ path: DB_PATH, verbose: false });

  const startTime = Date.now();

  // Process files one by one
  await processDirectory(db, ROOT, ROOT);

  const duration = Date.now() - startTime;

  // Stats
  const fileCount = db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM files');
  const chunkCount = db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM chunks');

  console.log('\n' + '='.repeat(50));
  console.log('✅ INDEXATION COMPLETE');
  console.log('='.repeat(50));
  console.log(`Files processed: ${filesProcessed}`);
  console.log(`Files skipped:   ${filesSkipped}`);
  console.log(`Chunks created:  ${chunksCreated}`);
  console.log(`Duration:        ${duration}ms`);
  console.log(`DB Files:        ${fileCount?.count || 0}`);
  console.log(`DB Chunks:       ${chunkCount?.count || 0}`);

  // Memory usage
  const mem = process.memoryUsage();
  console.log(`\n📊 Memory: ${Math.round(mem.heapUsed / 1024 / 1024)}MB heap`);

  db.close();
}

async function processDirectory(db: ReturnType<typeof createDatabase>, rootPath: string, currentPath: string, depth = 0) {
  if (depth > 15 || filesProcessed >= MAX_FILES) return;

  let entries;
  try {
    entries = readdirSync(currentPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (filesProcessed >= MAX_FILES) break;

    const fullPath = join(currentPath, entry.name);
    const relPath = relative(rootPath, fullPath);

    // Check ignore
    if (ig.ignores(relPath) || ig.ignores(entry.name)) continue;

    if (entry.isDirectory()) {
      await processDirectory(db, rootPath, fullPath, depth + 1);
    } else if (entry.isFile()) {
      await processFile(db, fullPath, relPath);
    }
  }
}

async function processFile(db: ReturnType<typeof createDatabase>, fullPath: string, relPath: string) {
  // Skip binary
  if (isBinary(fullPath)) {
    filesSkipped++;
    return;
  }

  let stats;
  try {
    stats = statSync(fullPath);
  } catch {
    filesSkipped++;
    return;
  }

  // Skip large files
  if (stats.size > MAX_FILE_SIZE) {
    filesSkipped++;
    return;
  }

  // Read file
  let content: string;
  try {
    content = readFileSync(fullPath, 'utf-8');
  } catch {
    filesSkipped++;
    return;
  }

  const hash = hashSync(content);

  // Check if already indexed with same hash
  const existing = db.queryOne<{ id: number; hash: string }>(
    'SELECT id, hash FROM files WHERE path = ?',
    [relPath]
  );

  if (existing && existing.hash === hash) {
    filesSkipped++;
    return;
  }

  // Delete old chunks if file exists
  if (existing) {
    db.delete('DELETE FROM chunks WHERE file_id = ?', [existing.id]);
  }

  // Upsert file
  let fileId: number;
  if (existing) {
    db.update(
      'UPDATE files SET hash = ?, mtime = ?, size = ?, indexed_at = ? WHERE id = ?',
      [hash, stats.mtimeMs, stats.size, Date.now(), existing.id]
    );
    fileId = existing.id;
  } else {
    fileId = db.insert(
      'INSERT INTO files (path, hash, mtime, size, indexed_at) VALUES (?, ?, ?, ?, ?)',
      [relPath, hash, stats.mtimeMs, stats.size, Date.now()]
    );
  }

  // Create chunks (simple line-based)
  const lines = content.split('\n');
  let chunkStart = 0;

  while (chunkStart < lines.length) {
    const chunkEnd = Math.min(chunkStart + CHUNK_LINES, lines.length);
    const chunkContent = lines.slice(chunkStart, chunkEnd).join('\n');

    // Insert chunk - FTS5 trigger will sync automatically
    db.insert(
      'INSERT INTO chunks (file_id, start_line, end_line, content) VALUES (?, ?, ?, ?)',
      [fileId, chunkStart + 1, chunkEnd, chunkContent]
    );
    chunksCreated++;

    chunkStart = chunkEnd;
  }

  filesProcessed++;

  // Progress
  if (filesProcessed % 10 === 0) {
    process.stdout.write(`\r  📁 ${filesProcessed} files, ${chunksCreated} chunks`);
  }

  // Let GC breathe every 20 files
  if (filesProcessed % 20 === 0) {
    await new Promise(r => setTimeout(r, 1));
  }
}

main().catch(console.error);
