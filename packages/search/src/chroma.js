/**
 * @nexus/search - ChromaDB Wrapper for Vector Search
 * Sprint 8: SQLite + Chroma Hybrid
 *
 * ChromaDB provides HNSW indexing for O(log n) vector similarity search
 * Used when chunk count > 50k for better performance
 */
/**
 * ChromaDB Client
 */
export class ChromaClient {
    baseUrl;
    constructor(config = {}) {
        const host = config.host || 'localhost';
        const port = config.port || 8000;
        this.baseUrl = `http://${host}:${port}`;
    }
    /**
     * Get or create a collection
     */
    async getOrCreateCollection(config) {
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
        const data = await response.json();
        return data.id;
    }
    /**
     * Add embeddings to a collection
     */
    async addEmbeddings(collectionName, embeddings) {
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
    async query(collectionName, queryEmbedding, nResults = 10) {
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
        const data = await response.json();
        // Format results
        const results = [];
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
    async deleteCollection(collectionName) {
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
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/heartbeat`);
            return response.ok;
        }
        catch {
            return false;
        }
    }
}
/**
 * Singleton ChromaDB client
 */
let chromaClient = null;
export function getChromaClient(config) {
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
};
//# sourceMappingURL=chroma.js.map