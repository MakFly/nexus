/**
 * xxhash64 wrapper - Fast non-cryptographic hashing
 * Pattern inspired by mgrep for efficient file change detection
 */

import xxhashModule from 'xxhash-wasm';

let h64Func: ((data: string, seed?: bigint) => string) | null = null;

// Initialize xxhash-wasm module (async, cached)
const initPromise = xxhashModule().then(mod => {
  h64Func = mod.h64ToString;
  return mod;
});

/**
 * Ensure module is initialized before use
 */
async function ensureInitialized(): Promise<(data: string, seed?: bigint) => string> {
  if (h64Func) return h64Func;
  await initPromise;
  return h64Func!;
}

const HASH_PREFIX = 'xxh64:';

/**
 * Calculate xxhash64 of a string/Buffer
 * @param data - Input data to hash
 * @returns Hash in format "xxh64:abc123..."
 */
export async function hash(data: string | Buffer): Promise<string> {
  const fn = await ensureInitialized();
  const input = typeof data === 'string' ? data : data.toString('utf-8');
  const digest = fn(input);
  return `${HASH_PREFIX}${digest}`;
}

/**
 * Synchronous hash (must call initHash() first)
 */
export function hashSync(data: string | Buffer): string {
  if (!h64Func) {
    throw new Error('xxhash-wasm not initialized. Call initHash() first.');
  }
  const input = typeof data === 'string' ? data : data.toString('utf-8');
  const digest = h64Func(input);
  return `${HASH_PREFIX}${digest}`;
}

/**
 * Initialize the hash module (call once at startup)
 */
export async function initHash(): Promise<void> {
  await initPromise;
}

/**
 * Verify if data matches expected hash
 */
export async function verify(data: string | Buffer, expectedHash: string): Promise<boolean> {
  if (!expectedHash.startsWith(HASH_PREFIX)) {
    return false;
  }
  const computed = await hash(data);
  return computed === expectedHash;
}

/**
 * Hash file content for deduplication
 */
export async function hashContent(content: string): Promise<string> {
  return hash(content);
}
