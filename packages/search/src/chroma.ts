/**
 * @nexus/search - ChromaDB Wrapper for Vector Search
 * Sprint 8: SQLite + Chroma Hybrid
 *
 * ChromaDB provides HNSW indexing for O(log n) vector similarity search
 * Used when chunk count > 50k for better performance
 */

// Note: mkdir and join can be used for persistence in future versions

/**
 * ChromaDB client wrapper
 *
 * Note: This uses the HTTP API for ChromaDB standalone server
 * For embedded Chroma, we'd use chromadb-fs but it's not stable yet
 */

export interface ChromaConfig {
  host?: string;
  port?: number;
  path?: string;  // For persistence
}

export interface ChromaCollectionConfig {
  name: string;
  metadata?: Record<string, any>;
}

export interface ChromaEmbedding {
  id: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

export interface ChromaQueryResult {
  id: string;
  score: number;
  metadata?: Record<string, any>;
}

/**
 * ChromaDB Client
 */
export class ChromaClient {
  private baseUrl: string;

  constructor(config: ChromaConfig = {}) {
    const host = config.host || 'localhost';
    const port = config.port || 8000;
    this.baseUrl = `http://${host}:${port}`;
  }

  /**
   * Get or create a collection
   */
  async getOrCreateCollection(config: ChromaCollectionConfig): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/v1/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: config.name,
        metadata: config.metadata || {}
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create collection: ${error}`);
    }

    const data = await response.json() as { id: string };
    return data.id;
  }

  /**
   * Add embeddings to a collection
   */
  async addEmbeddings(
    collectionName: string,
    embeddings: ChromaEmbedding[]
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/v1/collections/${collectionName}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: embeddings.map(e => e.id),
        embeddings: embeddings.map(e => e.embedding),
        metadatas: embeddings.map(e => e.metadata || {})
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to add embeddings: ${error}`);
    }
  }

  /**
   * Query embeddings by similarity
   */
  async query(
    collectionName: string,
    queryEmbedding: number[],
    nResults = 10
  ): Promise<ChromaQueryResult[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/collections/${collectionName}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query_embeddings: [queryEmbedding],
        n_results: nResults
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to query collection: ${error}`);
    }

    const data = await response.json() as {
      ids?: string[][];
      distances?: number[][];
      metadatas?: Record<string, any>[][];
    };

    // Format results
    const results: ChromaQueryResult[] = [];
    if (data.ids && data.ids[0]) {
      for (let i = 0; i < data.ids[0].length; i++) {
        results.push({
          id: data.ids[0][i],
          score: data.distances?.[0]?.[i] || 0,
          metadata: data.metadatas?.[0]?.[i] || {}
        });
      }
    }

    return results;
  }

  /**
   * Delete a collection
   */
  async deleteCollection(collectionName: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/v1/collections/${collectionName}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete collection: ${error}`);
    }
  }

  /**
   * Check if ChromaDB server is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/heartbeat`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Singleton ChromaDB client
 */
let chromaClient: ChromaClient | null = null;

export function getChromaClient(config?: ChromaConfig): ChromaClient {
  if (!chromaClient) {
    chromaClient = new ChromaClient(config);
  }
  return chromaClient;
}

/**
 * ChromaDB collections for Nexus
 */
export const NEXUS_COLLECTIONS = {
  CHUNKS: 'nexus_chunks',
  OBSERVATIONS: 'nexus_observations',
  MEMORIES: 'nexus_memories'
} as const;
