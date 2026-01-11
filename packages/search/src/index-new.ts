/**
 * @nexus/search - Code Search for Nexus
 *
 * NEW ARCHITECTURE: Ripgrep-based search (no indexation)
 * - Zero RAM issues
 * - Instant search via ripgrep
 * - Same approach as VS Code
 *
 * Legacy Meilisearch exports kept for backward compat
 */

// ============================================
// NEW: Ripgrep-based search (RECOMMENDED)
// ============================================
export {
  rgSearch,
  quickSearch,
  searchByType,
  formatMatch,
  formatMatchList,
  type RgSearchOptions,
  type RgMatch,
  type RgSearchResult,
} from './ripgrep.js';

// ============================================
// LEGACY: Meilisearch exports (deprecated)
// ============================================
export {
  initSearch,
  search,
  indexChunk,
  indexChunks,
  deleteChunksForFile,
  clearIndex,
  getIndexStats,
  waitForTask,
  makeChunkId,
  formatCompact,
  getChunk,
  type SearchConfig,
  type ChunkDocument,
  type SearchOptions,
  type SearchResult,
  type SearchHit,
} from './index.js';
