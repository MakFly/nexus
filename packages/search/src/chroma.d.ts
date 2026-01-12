/**
 * @nexus/search - ChromaDB Wrapper for Vector Search
 * Sprint 8: SQLite + Chroma Hybrid
 *
 * ChromaDB provides HNSW indexing for O(log n) vector similarity search
 * Used when chunk count > 50k for better performance
 */
/**
 * ChromaDB client wrapper
 *
 * Note: This uses the HTTP API for ChromaDB standalone server
 * For embedded Chroma, we'd use chromadb-fs but it's not stable yet
 */
export interface ChromaConfig {
    host?: string;
    port?: number;
    path?: string;
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
export declare class ChromaClient {
    private baseUrl;
    constructor(config?: ChromaConfig);
    /**
     * Get or create a collection
     */
    getOrCreateCollection(config: ChromaCollectionConfig): Promise<string>;
    /**
     * Add embeddings to a collection
     */
    addEmbeddings(collectionName: string, embeddings: ChromaEmbedding[]): Promise<void>;
    /**
     * Query embeddings by similarity
     */
    query(collectionName: string, queryEmbedding: number[], nResults?: number): Promise<ChromaQueryResult[]>;
    /**
     * Delete a collection
     */
    deleteCollection(collectionName: string): Promise<void>;
    /**
     * Check if ChromaDB server is available
     */
    healthCheck(): Promise<boolean>;
}
export declare function getChromaClient(config?: ChromaConfig): ChromaClient;
/**
 * ChromaDB collections for Nexus
 */
export declare const NEXUS_COLLECTIONS: {
    readonly CHUNKS: "nexus_chunks";
    readonly OBSERVATIONS: "nexus_observations";
    readonly MEMORIES: "nexus_memories";
};
//# sourceMappingURL=chroma.d.ts.map