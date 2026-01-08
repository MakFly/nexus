/**
 * Auto-Relationships Automation
 *
 * Automatically detects and creates relationships between memories:
 * - Content similarity analysis
 * - Automatic relationship type detection
 * - Relationship strength calculation
 * - Relationship graph maintenance
 */

import { getDb, generateId } from '../storage/client.js';
import { memories, relationships } from '../storage/schema.js';
import { eq, and, desc, or } from 'drizzle-orm';
import { emitEvent, EventType } from '../events/index.js';

/**
 * Configuration for auto-relationships
 */
export interface AutoRelationshipsConfig {
  enabled: boolean;
  similarityThreshold: number; // Min similarity to create relationship
  maxRelationshipsPerMemory: number;
  autoCreate: boolean; // Auto-create or just suggest
  relationshipTypes: Array<{
    type: 'related' | 'depends_on' | 'blocks' | 'includes' | 'references';
    minScore: number;
  }>;
}

const DEFAULT_CONFIG: AutoRelationshipsConfig = {
  enabled: true,
  similarityThreshold: 0.3,
  maxRelationshipsPerMemory: 10,
  autoCreate: false, // Default to suggestions only
  relationshipTypes: [
    { type: 'includes', minScore: 0.7 },
    { type: 'references', minScore: 0.5 },
    { type: 'related', minScore: 0.3 },
  ],
};

/**
 * Tokenize text for comparison
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\sàâäéèêëïîôùûüç]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

/**
 * Calculate Jaccard similarity between two texts
 */
function calculateJaccardSimilarity(text1: string, text2: string): number {
  const terms1 = new Set(tokenize(text1));
  const terms2 = new Set(tokenize(text2));

  const intersection = new Set([...terms1].filter(x => terms2.has(x)));
  const union = new Set([...terms1, ...terms2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Calculate detailed similarity between memories
 */
function calculateMemorySimilarity(memory1: any, memory2: any): {
  overall: number;
  title: number;
  content: number;
  type: number;
} {
  const titleSimilarity = calculateJaccardSimilarity(memory1.title, memory2.title);
  const contentSimilarity = calculateJaccardSimilarity(memory1.content, memory2.content);
  const typeSimilarity = memory1.type === memory2.type ? 1 : 0;

  // Weighted: 30% title, 60% content, 10% type
  const overall = 0.3 * titleSimilarity + 0.6 * contentSimilarity + 0.1 * typeSimilarity;

  return {
    overall,
    title: titleSimilarity,
    content: contentSimilarity,
    type: typeSimilarity,
  };
}

/**
 * Determine relationship type based on similarity
 */
function determineRelationshipType(
  similarity: { overall: number; title: number; content: number; type: number },
  config: AutoRelationshipsConfig
): 'related' | 'depends_on' | 'blocks' | 'includes' | 'references' {
  // Check each type's threshold
  for (const { type, minScore } of config.relationshipTypes) {
    if (similarity.overall >= minScore) {
      return type;
    }
  }

  return 'related';
}

/**
 * Calculate relationship strength (0-100)
 */
function calculateRelationshipStrength(
  similarity: { overall: number; title: number; content: number; type: number }
): number {
  return Math.round(similarity.overall * 100);
}

/**
 * Find similar memories for a given memory
 */
export async function findSimilarMemories(
  memoryId: string,
  options: {
    threshold?: number;
    limit?: number;
    includeExisting?: boolean;
    config?: Partial<AutoRelationshipsConfig>;
  } = {}
): Promise<{
  memory: any;
  similar: Array<{
    memory: any;
    similarity: { overall: number; title: number; content: number; type: number };
    suggestedType: 'related' | 'depends_on' | 'blocks' | 'includes' | 'references';
    strength: number;
    existing?: boolean;
  }>;
}> {
  const finalConfig = { ...DEFAULT_CONFIG, ...options.config };

  if (!finalConfig.enabled) {
    return { memory: null, similar: [] };
  }

  const db = getDb();

  // Get the source memory
  const sourceMemory = await db.query.memories.findFirst({
    where: eq(memories.id, memoryId),
    with: {
      context: true,
    },
  });

  if (!sourceMemory) {
    return { memory: null, similar: [] };
  }

  // Get existing relationships
  const existingRels = await db.query.relationships.findMany({
    where: or(
      eq(relationships.sourceId, memoryId),
      eq(relationships.targetId, memoryId)
    ),
  });

  const existingIds = new Set(
    existingRels.map(r => r.sourceId === memoryId ? r.targetId : r.sourceId)
  );

  // Get all other memories for comparison
  const allMemories = await db.query.memories.findMany({
    where: sql`${memories.id} != ${memoryId}`,
    with: {
      context: true,
    },
  });

  // Calculate similarities
  const similar: any[] = [];

  for (const memory of allMemories) {
    const similarity = calculateMemorySimilarity(sourceMemory, memory);
    const threshold = options.threshold ?? finalConfig.similarityThreshold;

    if (similarity.overall >= threshold) {
      const suggestedType = determineRelationshipType(similarity, finalConfig);
      const strength = calculateRelationshipStrength(similarity);

      similar.push({
        memory,
        similarity,
        suggestedType,
        strength,
        existing: existingIds.has(memory.id),
      });
    }
  }

  // Sort by overall similarity and limit
  const limit = options.limit ?? finalConfig.maxRelationshipsPerMemory;
  similar.sort((a, b) => b.similarity.overall - a.similarity.overall);

  return {
    memory: sourceMemory,
    similar: similar.slice(0, limit),
  };
}

/**
 * Create a relationship between two memories
 */
export async function createRelationship(
  sourceId: string,
  targetId: string,
  type: 'related' | 'depends_on' | 'blocks' | 'includes' | 'references',
  strength?: number
): Promise<any> {
  const db = getDb();

  // Check if relationship already exists
  const existing = await db.query.relationships.findFirst({
    where: and(
      eq(relationships.sourceId, sourceId),
      eq(relationships.targetId, targetId)
    ),
  });

  if (existing) {
    return existing;
  }

  // Get memories to calculate strength if not provided
  if (!strength) {
    const [source, target] = await Promise.all([
      db.query.memories.findFirst({
        where: eq(memories.id, sourceId),
      }),
      db.query.memories.findFirst({
        where: eq(memories.id, targetId),
      }),
    ]);

    if (source && target) {
      const similarity = calculateMemorySimilarity(source, target);
      strength = calculateRelationshipStrength(similarity);
    }
  }

  strength = strength ?? 50;

  // Create relationship
  const relationshipId = generateId();
  await db.insert(relationships).values({
    id: relationshipId,
    sourceId,
    targetId,
    type,
    strength,
  });

  const created = await db.query.relationships.findFirst({
    where: eq(relationships.id, relationshipId),
  });

  // Emit event
  emitEvent(
    EventType.RELATIONSHIP_CREATED,
    { relationship: created }
  );

  return created;
}

/**
 * Auto-create relationships for a memory
 */
export async function autoCreateRelationships(
  memoryId: string,
  options: {
    threshold?: number;
    limit?: number;
    config?: Partial<AutoRelationshipsConfig>;
  } = {}
): Promise<{
  created: any[];
  skipped: Array<{ memory: any; reason: string }>;
}> {
  const finalConfig = { ...DEFAULT_CONFIG, ...options.config };

  if (!finalConfig.autoCreate) {
    return { created: [], skipped: [] };
  }

  const { similar } = await findSimilarMemories(memoryId, options);

  const created: any[] = [];
  const skipped: any[] = [];

  for (const item of similar) {
    if (item.existing) {
      skipped.push({
        memory: item.memory,
        reason: 'Relationship already exists',
      });
      continue;
    }

    const relationship = await createRelationship(
      memoryId,
      item.memory.id,
      item.suggestedType,
      item.strength
    );

    created.push({
      relationship,
      targetMemory: item.memory,
      similarity: item.similarity,
    });
  }

  return { created, skipped };
}

/**
 * Get relationship graph for a memory
 */
export async function getRelationshipGraph(
  memoryId: string,
  depth = 2
): Promise<{
  nodes: Array<{ id: string; title: string; type: string }>;
  edges: Array<{
    source: string;
    target: string;
    type: string;
    strength: number;
  }>;
}> {
  const db = getDb();

  const nodes = new Map<string, any>();
  const edges: any[] = [];
  const visited = new Set<string>();
  const queue: Array<{ id: string; currentDepth: number }> = [
    { id: memoryId, currentDepth: 0 },
  ];

  while (queue.length > 0) {
    const { id, currentDepth } = queue.shift()!;

    if (currentDepth > depth || visited.has(id)) {
      continue;
    }

    visited.add(id);

    // Get memory
    const memory = await db.query.memories.findFirst({
      where: eq(memories.id, id),
    });

    if (!memory) continue;

    nodes.set(id, {
      id: memory.id,
      title: memory.title,
      type: memory.type,
    });

    // Get relationships
    const relationships = await db.query.relationships.findMany({
      where: or(eq(relationships.sourceId, id), eq(relationships.targetId, id)),
    });

    for (const rel of relationships) {
      const otherId = rel.sourceId === id ? rel.targetId : rel.sourceId;

      // Add edge
      edges.push({
        source: rel.sourceId,
        target: rel.targetId,
        type: rel.type,
        strength: rel.strength,
      });

      // Add to queue if not visited
      if (!visited.has(otherId)) {
        queue.push({ id: otherId, currentDepth: currentDepth + 1 });
      }
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    edges,
  };
}

/**
 * Suggest relationships for multiple memories
 */
export async function suggestRelationshipsBatch(
  memoryIds: string[],
  options?: {
    threshold?: number;
    limit?: number;
    config?: Partial<AutoRelationshipsConfig>;
  }
): Promise<
  Array<{
    memoryId: string;
    suggestions: any[];
  }>
> {
  const results = [];

  for (const memoryId of memoryIds) {
    const { similar } = await findSimilarMemories(memoryId, options);
    results.push({
      memoryId,
      suggestions: similar,
    });
  }

  return results;
}
