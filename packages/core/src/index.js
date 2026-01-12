/**
 * @nexus/core - Core types and utilities
 * Sprint 1: Indexer + Search (Meilisearch)
 */
export { Database, createDatabase, getDatabase, closeDatabase } from '@nexus/storage';
export { Repository, createRepository } from '@nexus/storage';
export { hash, hashSync, verify, hashContent, initHash } from '@nexus/storage';
export { initSearch, indexChunks, deleteChunksForFile, search, clearIndex, getIndexStats, makeChunkId, formatCompact } from '@nexus/search';
// Re-export crypto utilities
export { encryptApiKey, decryptApiKey, maskApiKey, maskEncryptedApiKey, isEncrypted, encryptSettingValue, decryptSettingValue } from './crypto.js';
// Re-export compression utilities
export { compress, quickCompress, compressWithLLM, compressAlgorithmic } from './compressor/index.js';
// Token counting utility
export function countTokens(text) {
    return Math.ceil(text.length / 4);
}
//# sourceMappingURL=index.js.map