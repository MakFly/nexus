#!/usr/bin/env bun
/**
 * Embeddings Indexer - Generate embeddings for all chunks
 *
 * Uses .env for configuration:
 *   EMBEDDING_PROVIDER=mistral
 *   MISTRAL_API_KEY=xxx
 *
 * Usage:
 *   bun scripts/index-embeddings.ts
 *   bun scripts/index-embeddings.ts --provider openai
 */

import { createDatabase, initHash } from '@nexus/storage';
import { initEmbeddings, embedChunks } from '@nexus/search/dist/embeddings/index.js';
import { join } from 'path';

// Load .env from apps/api/
const envPath = join(import.meta.dir, '../.env');
await import('bun').then(() => Bun.file(envPath).text().then(content => {
  for (const line of content.split('\n')) {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').trim();
    if (key && value && !key.startsWith('#')) {
      process.env[key.trim()] = value;
    }
  }
}).catch(() => console.log('No .env file found, using environment variables')));

const DB_PATH = join(import.meta.dir, '../nexus.db');

// Parse args (override .env if provided)
const args = process.argv.slice(2);
const providerArg = args.find(a => a.startsWith('--provider='))?.split('=')[1]
  || process.env.EMBEDDING_PROVIDER
  || 'mistral';

async function main() {
  console.log('🧠 Embeddings Indexer');
  console.log(`📂 DB: ${DB_PATH}`);
  console.log(`🔌 Provider: ${providerArg}`);
  console.log('');

  // Get API key from env
  let apiKey: string | undefined;
  switch (providerArg) {
    case 'mistral':
      apiKey = process.env.MISTRAL_API_KEY;
      break;
    case 'openai':
      apiKey = process.env.OPENAI_API_KEY;
      break;
    case 'ollama':
      // No API key needed for Ollama
      break;
    default:
      console.error(`Unknown provider: ${providerArg}`);
      process.exit(1);
  }

  if (providerArg !== 'ollama' && !apiKey) {
    console.error(`❌ Missing API key. Set ${providerArg.toUpperCase()}_API_KEY env var`);
    process.exit(1);
  }

  // Initialize embeddings
  initEmbeddings({
    provider: providerArg as 'mistral' | 'openai' | 'ollama',
    apiKey,
    model: providerArg === 'mistral' ? 'mistral-embed' : undefined,
  });
  console.log('✅ Embeddings provider initialized');

  // Open database
  await initHash();
  const db = createDatabase({ path: DB_PATH, verbose: false });

  // Get chunks without embeddings
  const chunks = db.query<{ id: number; content: string }>(`
    SELECT c.id, c.content
    FROM chunks c
    LEFT JOIN embeddings e ON c.id = e.chunk_id
    WHERE e.chunk_id IS NULL
  `);

  console.log(`📊 Found ${chunks.length} chunks without embeddings`);

  if (chunks.length === 0) {
    console.log('✅ All chunks already have embeddings');
    db.close();
    return;
  }

  // Embed chunks with progress
  const startTime = Date.now();
  let lastProgress = 0;

  const { embedded, errors } = await embedChunks(
    db as any, // Type cast for compatibility
    chunks,
    5, // Small batches to avoid rate limits
    (processed, total) => {
      const percent = Math.floor((processed / total) * 100);
      if (percent > lastProgress) {
        process.stdout.write(`\r  📦 ${percent}% (${processed}/${total})`);
        lastProgress = percent;
      }
    }
  );

  const duration = Date.now() - startTime;

  console.log('\n');
  console.log('='.repeat(50));
  console.log('✅ EMBEDDING COMPLETE');
  console.log('='.repeat(50));
  console.log(`Chunks embedded: ${embedded}`);
  console.log(`Errors:          ${errors}`);
  console.log(`Duration:        ${duration}ms`);
  console.log(`Avg per chunk:   ${Math.round(duration / chunks.length)}ms`);

  // Stats
  const embeddingCount = db.queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM embeddings'
  );
  console.log(`\n📊 Total embeddings: ${embeddingCount?.count || 0}`);

  db.close();
}

main().catch(console.error);
