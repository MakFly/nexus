/**
 * Embeddings Module - Multi-provider semantic search
 */

export {
  // Provider interface and factory
  initEmbeddings,
  getEmbeddingProvider,
  embed,
  embedBatch,
  type EmbeddingProvider,
  type EmbeddingResult,
  type ProviderConfig,
  // Providers
  MistralProvider,
  OpenAIProvider,
  OllamaProvider,
} from './provider.js';

export {
  // Semantic search
  semanticSearch,
  hybridSearch,
  // Embedding storage
  storeEmbedding,
  getEmbedding,
  embedChunks,
  // Vector utils
  cosineSimilarity,
  vectorToBlob,
  blobToVector,
  // Types
  type SemanticMatch,
  type SemanticSearchResult,
} from './semantic.js';
