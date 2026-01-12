/**
 * @nexus/search - Hybrid Router for SQLite + Chroma
 * Sprint 8: Auto-switch based on data size
 *
 * Routes queries to:
 * - SQLite FTS5: < 50k chunks (fast enough)
 * - Chroma HNSW: >= 50k chunks (better scalability)
 */

// Database type - simplified interface for router
interface Database {
  queryOne<T>(sql: string, ...params: any[]): T | undefined;
  query<T>(sql: string, ...params: any[]): T[];
}
import { getChromaClient, NEXUS_COLLECTIONS } from './chroma.js';
import type { ChunkDocument } from './index.js';

/**
 * Router configuration
 */
export interface HybridRouterConfig {
  chromaThreshold?: number;  // Default: 50k chunks
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
export function shouldUseChroma(
  db: Database,
  config: HybridRouterConfig = {}
): boolean {
  const threshold = config.chromaThreshold || 50000;

  const result = db.queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM chunks'
  );

  return (result?.count || 0) >= threshold;
}

/**
 * Hybrid search router
 *
 * Automatically routes search queries to SQLite or Chroma based on data size
 */
export class HybridRouter {
  private config: HybridRouterConfig;
  private chromaAvailable: boolean = false;

  constructor(config: HybridRouterConfig = {}) {
    this.config = config;
    this.initChroma();
  }

  /**
   * Initialize ChromaDB connection (async check)
   */
  private async initChroma(): Promise<void> {
    try {
      const client = getChromaClient({
        host: this.config.chromaHost,
        port: this.config.chromaPort
      });
      this.chromaAvailable = await client.healthCheck();
    } catch {
      this.chromaAvailable = false;
    }
  }

  /**
   * Determine which engine to use
   */
  decideEngine(db: Database): RouterEngine {
    // Use Chroma if available and chunk count is high
    if (this.chromaAvailable && shouldUseChroma(db, this.config)) {
      return 'chroma';
    }
    return 'sqlite';
  }

  /**
   * Hybrid semantic search
   */
  async semanticSearch(
    db: Database,
    queryEmbedding: number[],
    limit = 10
  ): Promise<RouterResult<ChunkDocument>> {
    const startTime = Date.now();
    const engine = this.decideEngine(db);

    if (engine === 'chroma') {
      return await this.searchChroma(queryEmbedding, limit, startTime);
    } else {
      return await this.searchSQLite(db, queryEmbedding, limit, startTime);
    }
  }

  /**
   * Search using Chroma HNSW
   */
  private async searchChroma(
    queryEmbedding: number[],
    limit: number,
    startTime: number
  ): Promise<RouterResult<ChunkDocument>> {
    const client = getChromaClient();

    const results = await client.query(
      NEXUS_COLLECTIONS.CHUNKS,
      queryEmbedding,
      limit
    );

    // Map Chroma results to ChunkDocument format
    const chunks: ChunkDocument[] = results.map(r => ({
      id: r.id,
      file_id: r.metadata?.file_id || 0,
      path: r.metadata?.path || '',
      start_line: r.metadata?.start_line || 0,
      end_line: r.metadata?.end_line || 0,
      content: '',
      indexed_at: r.metadata?.indexed_at || Date.now()
    }));

    return {
      engine: 'chroma',
      results: chunks,
      queryTimeMs: Date.now() - startTime
    };
  }

  /**
   * Search using SQLite embeddings
   */
  private async searchSQLite(
    db: Database,
    queryEmbedding: number[],
    limit: number,
    startTime: number
  ): Promise<RouterResult<ChunkDocument>> {
    // Calculate cosine similarity using SQL
    const chunks = db.query<ChunkDocument>(`
      SELECT
        c.id,
        c.file_id,
        f.path,
        c.start_line,
        c.end_line,
        c.content,
        c.symbol,
        c.kind,
        (
          SELECT SUM(e.vector * ?) / (
            SQRT(SUM(e.vector * e.vector)) * SQRT(SUM(? * ?))
          )
          FROM embeddings e
          WHERE e.chunk_id = c.id
        ) as score
      FROM chunks c
      JOIN files f ON f.id = c.file_id
      LEFT JOIN embeddings e ON e.chunk_id = c.id
      WHERE e.chunk_id IS NOT NULL
      ORDER BY score DESC
      LIMIT ?
    `, ...queryEmbedding, ...queryEmbedding, ...queryEmbedding, limit);

    return {
      engine: 'sqlite',
      results: chunks,
      queryTimeMs: Date.now() - startTime
    };
  }

  /**
   * Get router statistics
   */
  async getStats(db: Database): Promise<{
    engine: RouterEngine;
    chunkCount: number;
    chromaAvailable: boolean;
    threshold: number;
  }> {
    const chunkCount = db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM chunks'
    );

    return {
      engine: this.decideEngine(db),
      chunkCount: chunkCount?.count || 0,
      chromaAvailable: this.chromaAvailable,
      threshold: this.config.chromaThreshold || 50000
    };
  }
}

/**
 * Singleton router instance
 */
let hybridRouter: HybridRouter | null = null;

export function getHybridRouter(config?: HybridRouterConfig): HybridRouter {
  if (!hybridRouter) {
    hybridRouter = new HybridRouter(config);
  }
  return hybridRouter;
}
