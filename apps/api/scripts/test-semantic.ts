#!/usr/bin/env bun
/**
 * Test Semantic Search
 */

import { createDatabase, initHash } from '@nexus/storage';
import { initEmbeddings, semanticSearch, hybridSearch } from '@nexus/search/dist/embeddings/index.js';
import { join } from 'path';

// Load .env
const envPath = join(import.meta.dir, '../.env');
const envContent = await Bun.file(envPath).text();
for (const line of envContent.split('\n')) {
  const [key, ...valueParts] = line.split('=');
  const value = valueParts.join('=').trim();
  if (key && value && !key.startsWith('#')) {
    process.env[key.trim()] = value;
  }
}

const DB_PATH = join(import.meta.dir, '../nexus.db');

async function main() {
  console.log('🧠 Testing Semantic Search');
  console.log('');

  // Init
  await initHash();
  const db = createDatabase({ path: DB_PATH, verbose: false });

  initEmbeddings({
    provider: 'mistral',
    apiKey: process.env.MISTRAL_API_KEY!,
  });

  // Test 1: Semantic search - natural language
  console.log('Test 1: "where is the database connection?"');
  const result1 = await semanticSearch(db as any, 'where is the database connection?', 5);
  console.log(`  Found: ${result1.hits.length} results`);
  console.log(`  Embedding: ${result1.embeddingTimeMs}ms`);
  console.log(`  Total: ${result1.processingTimeMs}ms`);
  console.log('  Top results:');
  for (const hit of result1.hits.slice(0, 3)) {
    console.log(`    ./${hit.path}:${hit.startLine}-${hit.endLine} [${(hit.similarity * 100).toFixed(1)}%]`);
  }
  console.log('');

  // Test 2: Semantic search - intent
  console.log('Test 2: "how to create a new file"');
  const result2 = await semanticSearch(db as any, 'how to create a new file', 5);
  console.log(`  Found: ${result2.hits.length} results`);
  console.log(`  Duration: ${result2.processingTimeMs}ms`);
  console.log('  Top result:');
  if (result2.hits[0]) {
    console.log(`    ./${result2.hits[0].path}:${result2.hits[0].startLine} [${(result2.hits[0].similarity * 100).toFixed(1)}%]`);
  }
  console.log('');

  // Test 3: Hybrid search
  console.log('Test 3: Hybrid "export function" (semantic 70% + keyword 30%)');
  const result3 = await hybridSearch(db as any, 'export function', { limit: 5 });
  console.log(`  Found: ${result3.hits.length} results`);
  console.log(`  Duration: ${result3.processingTimeMs}ms`);
  console.log('  Top results:');
  for (const hit of result3.hits.slice(0, 3)) {
    console.log(`    ./${hit.path}:${hit.startLine}-${hit.endLine} [${(hit.similarity * 100).toFixed(1)}%]`);
  }
  console.log('');

  // Test 4: Compare keyword vs semantic
  console.log('Test 4: Compare "initialize the hash system"');
  console.log('  Semantic:');
  const sem = await semanticSearch(db as any, 'initialize the hash system', 3);
  for (const hit of sem.hits) {
    console.log(`    ./${hit.path}:${hit.startLine} [${(hit.similarity * 100).toFixed(1)}%]`);
  }
  console.log('');

  // Memory
  const mem = process.memoryUsage();
  console.log('📊 Memory: ' + Math.round(mem.heapUsed / 1024 / 1024) + 'MB');
  console.log('');
  console.log('✅ Semantic Search working!');

  db.close();
}

main().catch(console.error);
