/**
 * @nexus/search - SQLite FTS5 Search for Nexus
 *
 * Uses SQLite FTS5 for efficient full-text search with:
 * - BM25 ranking
 * - Native integration (no external dependencies)
 * - Lightweight and fast
 *
 * Sprint 8: Added ChromaDB hybrid support for large datasets
 */
export { ftsSearch, quickFtsSearch, ftsSearchInPath, formatMgrep, formatMgrepList, formatWithPreview, buildAndQuery, buildOrQuery, buildPrefixQuery, type FtsSearchOptions, type FtsMatch, type FtsSearchResult, } from './fts5.js';
export { rgSearch, quickSearch, searchByType, formatMatch, formatMatchList, type RgSearchOptions, type RgMatch, type RgSearchResult, } from './ripgrep.js';
export { ChromaClient, getChromaClient, NEXUS_COLLECTIONS, type ChromaConfig, type ChromaCollectionConfig, type ChromaEmbedding, type ChromaQueryResult } from './chroma.js';
export { HybridRouter, getHybridRouter, shouldUseChroma, type HybridRouterConfig, type RouterResult, type RouterEngine } from './hybrid-router.js';
export interface ChunkDocument {
    id: string;
    file_id: number;
    path: string;
    start_line: number;
    end_line: number;
    content: string;
    symbol?: string;
    kind?: string;
    lang?: string;
    indexed_at: number;
}
export interface SearchOptions {
    limit?: number;
    offset?: number;
    filters?: string;
}
export interface SearchResult {
    hits: SearchHit[];
    totalHits: number;
    limit: number;
    offset: number;
    processingTimeMs: number;
}
export interface SearchHit {
    id: string;
    path: string;
    startLine: number;
    endLine: number;
    content: string;
    symbol?: string;
    kind?: string;
    lang?: string;
    score: number;
}
interface Database {
    run(sql: string, params?: any[]): void;
    query<T>(sql: string, params?: any[]): T[];
    queryOne<T>(sql: string, params?: any[]): T | undefined;
}
/**
 * Initialize search with a database connection
 * Uses SQLite FTS5 - no external dependencies needed
 */
export declare function initSearch(db?: Database): Promise<void>;
/**
 * Check if search is initialized
 */
export declare function isSearchInitialized(): boolean;
/**
 * Get the database (for direct FTS5 queries)
 */
export declare function getSearchDb(): Database | null;
/**
 * Index chunks into SQLite (direct insert, FTS5 auto-syncs via triggers)
 */
export declare function indexChunks(chunks: ChunkDocument[]): Promise<number>;
/**
 * Search chunks using FTS5 with BM25 ranking
 */
export declare function search(query: string, options?: SearchOptions): Promise<SearchResult>;
/**
 * Delete chunks for a specific file
 */
export declare function deleteChunksForFile(fileId: number): Promise<number>;
/**
 * Clear all chunks
 */
export declare function clearIndex(): Promise<number>;
/**
 * Get index stats
 */
export declare function getIndexStats(): Promise<{
    numberOfDocuments: number;
    isIndexing: boolean;
}>;
/**
 * Create a chunk ID from file_id and line range
 */
export declare function makeChunkId(fileId: number, startLine: number, endLine: number): string;
/**
 * Format search hit in compact mgrep style
 */
export declare function formatCompact(hit: SearchHit): string;
//# sourceMappingURL=index.d.ts.map