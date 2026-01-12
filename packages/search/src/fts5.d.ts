/**
 * FTS5 Search - SQLite full-text search with BM25 ranking
 *
 * Features:
 * - BM25 relevance scoring (like mgrep)
 * - Native SQLite (no external dependencies)
 * - Instant search on indexed content
 */
interface Database {
    query<T>(sql: string, params?: any[]): T[];
    queryOne<T>(sql: string, params?: any[]): T | undefined;
}
export interface FtsSearchOptions {
    limit?: number;
    offset?: number;
    highlight?: boolean;
}
export interface FtsMatch {
    chunkId: number;
    fileId: number;
    path: string;
    startLine: number;
    endLine: number;
    content: string;
    symbol?: string;
    score: number;
}
export interface FtsSearchResult {
    query: string;
    hits: FtsMatch[];
    totalHits: number;
    processingTimeMs: number;
}
/**
 * Search chunks using FTS5 with BM25 ranking
 */
export declare function ftsSearch(db: Database, query: string, options?: FtsSearchOptions): FtsSearchResult;
/**
 * Quick search with default options
 */
export declare function quickFtsSearch(db: Database, query: string, limit?: number): FtsMatch[];
/**
 * Search with path filter
 */
export declare function ftsSearchInPath(db: Database, query: string, pathPattern: string, options?: FtsSearchOptions): FtsSearchResult;
/**
 * Format match in mgrep compact style: path:lines [score%]
 */
export declare function formatMgrep(match: FtsMatch): string;
/**
 * Format all matches in mgrep style
 */
export declare function formatMgrepList(matches: FtsMatch[]): string;
/**
 * Format match with content preview
 */
export declare function formatWithPreview(match: FtsMatch, maxLines?: number): string;
/**
 * Build FTS5 query for multiple terms (AND)
 */
export declare function buildAndQuery(terms: string[]): string;
/**
 * Build FTS5 query for multiple terms (OR)
 */
export declare function buildOrQuery(terms: string[]): string;
/**
 * Build prefix query for autocomplete
 */
export declare function buildPrefixQuery(prefix: string): string;
export {};
//# sourceMappingURL=fts5.d.ts.map