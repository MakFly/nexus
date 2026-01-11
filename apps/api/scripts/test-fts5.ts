#!/usr/bin/env bun
/**
 * Test FTS5 Search with BM25 ranking
 */

import { createDatabase, initHash } from '@nexus/storage';
import { ftsSearch, formatMgrep, formatMgrepList } from '@nexus/search/dist/fts5.js';
import { join } from 'path';

const DB_PATH = join(import.meta.dir, '../nexus.db');

async function main() {
  console.log('🔍 Testing FTS5 Search with BM25');
  console.log(`📂 DB: ${DB_PATH}`);
  console.log('');

  await initHash();
  const db = createDatabase({ path: DB_PATH, verbose: false });

  // Test 1: Simple search
  console.log('Test 1: Search for "export function"');
  const result1 = ftsSearch(db, 'export function', { limit: 5 });
  console.log(`  Found: ${result1.totalHits} total, showing ${result1.hits.length}`);
  console.log(`  Duration: ${result1.processingTimeMs}ms`);
  console.log('  Results (mgrep format):');
  console.log(formatMgrepList(result1.hits).split('\n').map(l => '    ' + l).join('\n'));
  console.log('');

  // Test 2: Search for "interface"
  console.log('Test 2: Search for "interface"');
  const result2 = ftsSearch(db, 'interface', { limit: 5 });
  console.log(`  Found: ${result2.totalHits} total`);
  console.log(`  Duration: ${result2.processingTimeMs}ms`);
  console.log('  Top result:');
  if (result2.hits[0]) {
    console.log(`    ${formatMgrep(result2.hits[0])}`);
  }
  console.log('');

  // Test 3: Search for "Database"
  console.log('Test 3: Search for "Database"');
  const result3 = ftsSearch(db, 'Database', { limit: 5 });
  console.log(`  Found: ${result3.totalHits} total`);
  console.log(`  Duration: ${result3.processingTimeMs}ms`);
  console.log('');

  // Test 4: Phrase search
  console.log('Test 4: Phrase search "create database"');
  const result4 = ftsSearch(db, 'create database', { limit: 5 });
  console.log(`  Found: ${result4.totalHits} total`);
  console.log(`  Duration: ${result4.processingTimeMs}ms`);
  console.log('');

  // Memory check
  const mem = process.memoryUsage();
  console.log('📊 Memory Usage:');
  console.log(`  Heap Used: ${Math.round(mem.heapUsed / 1024 / 1024)}MB`);
  console.log('');

  console.log('✅ FTS5 Search working!');

  db.close();
}

main().catch(console.error);
