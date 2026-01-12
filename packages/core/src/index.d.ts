/**
 * @nexus/core - Core types and utilities
 * Sprint 1: Indexer + Search (Meilisearch)
 */
export type { SqlValue, SqlRow, SqlParams, DatabaseOptions } from '@nexus/storage';
export { Database, createDatabase, getDatabase, closeDatabase } from '@nexus/storage';
export { Repository, createRepository } from '@nexus/storage';
export { hash, hashSync, verify, hashContent, initHash } from '@nexus/storage';
export type { ChunkDocument, SearchOptions, SearchResult, SearchHit } from '@nexus/search';
export { initSearch, indexChunks, deleteChunksForFile, search, clearIndex, getIndexStats, makeChunkId, formatCompact } from '@nexus/search';
/**
 * File metadata from indexing
 */
export interface File {
    id: number;
    path: string;
    hash: string;
    mtime: number;
    size: number;
    lang?: string;
    ignored: boolean;
    indexed_at: number;
}
/**
 * Code chunk for search
 */
export interface Chunk {
    id: number;
    file_id: number;
    start_line: number;
    end_line: number;
    content: string;
    symbol?: string;
    kind?: string;
    token_count?: number;
}
/**
 * Memory observation (Sprint 2 - Memory System)
 */
export type MemoryType = 'decision' | 'bugfix' | 'feature' | 'refactor' | 'discovery' | 'change' | 'preference' | 'fact' | 'note';
export type MemoryScope = 'repo' | 'branch' | 'ticket' | 'feature' | 'global';
export interface Observation {
    id: number;
    session_id: string;
    project: string;
    type: MemoryType;
    scope: MemoryScope;
    title: string;
    subtitle?: string;
    summary?: string;
    narrative?: string;
    facts_json?: string;
    concepts_json?: string;
    tags_json?: string;
    files_read_json?: string;
    files_modified_json?: string;
    confidence: number;
    prompt_number?: number;
    discovery_tokens: number;
    created_at: number;
}
/**
 * Memory alias (Sprint 2)
 */
export type Memory = Observation;
/**
 * Compact memory for Progressive Disclosure (~50 tokens)
 */
export interface MemoryCompact {
    id: number;
    summary: string;
    type: MemoryType;
    scope: MemoryScope;
    confidence: number;
    score?: number;
    created_at: number;
}
/**
 * Memory link to source code
 */
export type MemoryLinkType = 'reference' | 'origin' | 'example';
export interface MemoryLink {
    id: number;
    observation_id: number;
    file_id?: number;
    chunk_id?: number;
    link_type: MemoryLinkType;
    path?: string;
    start_line?: number;
    end_line?: number;
    created_at: number;
}
/**
 * Full memory with parsed JSON and links
 */
export interface MemoryFull extends Omit<Observation, 'facts_json' | 'concepts_json' | 'tags_json' | 'files_read_json' | 'files_modified_json'> {
    facts: string[];
    concepts: string[];
    tags: string[];
    files_read: string[];
    files_modified: string[];
    links: MemoryLink[];
}
/**
 * Learning pattern
 */
export interface Pattern {
    id: number;
    intent: string;
    title: string;
    tags_json: string;
    constraints_json: string;
    variables_json: string;
    templates_json: string;
    checklist_json: string;
    gotchas_json: string;
    sources_json: string;
    usage_count: number;
    success_count: number;
    fail_count: number;
    created_at: number;
    updated_at: number;
}
export { encryptApiKey, decryptApiKey, maskApiKey, maskEncryptedApiKey, isEncrypted, encryptSettingValue, decryptSettingValue } from './crypto.js';
export { compress, quickCompress, compressWithLLM, compressAlgorithmic, type CompressionMode, type CompressorConfig, type CompressionResult } from './compressor/index.js';
export declare function countTokens(text: string): number;
export type SettingCategory = 'general' | 'compression' | 'search' | 'ui' | 'api';
export interface Setting {
    key: string;
    value: string;
    encrypted: number;
    category: SettingCategory;
    updated_at: string;
}
export type CompressionProvider = 'anthropic' | 'mistral' | 'openai' | 'ollama';
export interface CompressionSettings {
    mode: 'auto' | 'llm' | 'algo';
    provider: CompressionProvider;
    maxTokens: number;
    llmModel: string;
}
//# sourceMappingURL=index.d.ts.map