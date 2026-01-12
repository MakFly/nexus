/**
 * @nexus/search - Hybrid Router for SQLite + Chroma
 * Sprint 8: Auto-switch based on data size
 *
 * Routes queries to:
 * - SQLite FTS5: < 50k chunks (fast enough)
 * - Chroma HNSW: >= 50k chunks (better scalability)
 */
interface Database {
    queryOne<T>(sql: string, ...params: any[]): T | undefined;
    query<T>(sql: string, ...params: any[]): T[];
}
import type { ChunkDocument } from './index.js';
/**
 * Router configuration
 */
export interface HybridRouterConfig {
    chromaThreshold?: number;
    chromaHost?: string;
    chromaPort?: number;
}
/**
 * Router decision
 */
export type RouterEngine = 'sqlite' | 'chroma';
/**
 * Router result with engine used
 */
export interface RouterResult<T> {
    engine: RouterEngine;
    results: T[];
    queryTimeMs: number;
}
/**
 * Check if we should use Chroma based on chunk count
 */
export declare function shouldUseChroma(db: Database, config?: HybridRouterConfig): boolean;
/**
 * Hybrid search router
 *
 * Automatically routes search queries to SQLite or Chroma based on data size
 */
export declare class HybridRouter {
    private config;
    private chromaAvailable;
    constructor(config?: HybridRouterConfig);
    /**
     * Initialize ChromaDB connection (async check)
     */
    private initChroma;
    /**
     * Determine which engine to use
     */
    decideEngine(db: Database): RouterEngine;
    /**
     * Hybrid semantic search
     */
    semanticSearch(db: Database, queryEmbedding: number[], limit?: number): Promise<RouterResult<ChunkDocument>>;
    /**
     * Search using Chroma HNSW
     */
    private searchChroma;
    /**
     * Search using SQLite embeddings
     */
    private searchSQLite;
    /**
     * Get router statistics
     */
    getStats(db: Database): Promise<{
        engine: RouterEngine;
        chunkCount: number;
        chromaAvailable: boolean;
        threshold: number;
    }>;
}
export declare function getHybridRouter(config?: HybridRouterConfig): HybridRouter;
export {};
//# sourceMappingURL=hybrid-router.d.ts.map