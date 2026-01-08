/**
 * Shared TypeScript types for Free Context MCP server
 * User-less architecture - single-user system
 */

/**
 * Represents a context (collection of memories)
 */
export interface Context {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  systemPrompt?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Memory types supported by the system
 */
export type MemoryType = 'note' | 'conversation' | 'snippet' | 'reference' | 'task' | 'idea';

/**
 * Represents a memory stored in a context
 */
export interface Memory {
  id: string;
  contextId: string;
  type: MemoryType;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Relationship types between memories
 */
export type RelationshipType = 'related' | 'depends_on' | 'blocks' | 'includes' | 'references';

/**
 * Represents a relationship between two memories
 */
export interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  strength: number; // 0-100
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Search result with relevance score
 */
export interface SearchResult {
  memory: Memory;
  context: Context;
  score: number;
}

/**
 * Context creation input
 */
export interface CreateContextInput {
  name: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  systemPrompt?: string;
}

/**
 * Memory creation input
 */
export interface CreateMemoryInput {
  contextId: string;
  type: MemoryType;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Relationship creation input
 */
export interface CreateRelationshipInput {
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  strength?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Search filters
 */
export interface SearchFilters {
  contextId?: string;
  type?: MemoryType;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}
