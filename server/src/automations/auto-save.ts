/**
 * Auto-Save Automation
 *
 * Automatically detects and saves important content from conversations:
 * - Definitions and explanations
 * - Decisions and action items
 * - Code snippets and examples
 * - Important notes and reminders
 */

import { getDb, generateId, getRawDb } from '../storage/client.js';
import { memories, contexts } from '../storage/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { emitEvent, EventType } from '../events/index.js';
import { getActiveContext } from './auto-context.js';

/**
 * Configuration for auto-save
 */
export interface AutoSaveConfig {
  enabled: boolean;
  minContentLength: number;
  maxContentLength: number;
  confidenceThreshold: number; // Minimum confidence to auto-save
  duplicateThreshold: number; // Similarity threshold for duplicates
}

const DEFAULT_CONFIG: AutoSaveConfig = {
  enabled: true,
  minContentLength: 50,
  maxContentLength: 10000,
  confidenceThreshold: 0.7,
  duplicateThreshold: 0.85,
};

/**
 * Pattern definitions for detecting important content
 */
interface ContentPattern {
  name: string;
  type: 'note' | 'conversation' | 'snippet' | 'reference' | 'task' | 'idea';
  patterns: RegExp[];
  confidence: number;
  extractTitle?: (content: string) => string;
}

const IMPORTANT_PATTERNS: ContentPattern[] = [
  {
    name: 'definition',
    type: 'note',
    patterns: [
      /^(?:(?:defined?|définit?)\s+(?:as|comme|:)|.+?\s+(?:is|est)\s+(?:defined?|définit?)\s+(?:as|comme|:))/im,
      /^(?:important|note|rappel|remember|to-do|action)\s*:/im,
    ],
    confidence: 0.8,
    extractTitle: (content) => {
      const match = content.match(/^(.+?)(?:\s+(?:is|est)\s+(?:defined?|définit?)|:)/im);
      return match ? `Definition: ${match[1].trim()}` : 'Definition';
    },
  },
  {
    name: 'task',
    type: 'task',
    patterns: [
      /^\s*[-*]\s+\[[\s ]\]\s+/im, // Task list item
      /^(?:todo|task|action|fix|implement)\s*[:\[]/im,
      /^\s*[-*]\s+\*\*[^*]+\*\*\s*:/im, // Bold task
    ],
    confidence: 0.85,
    extractTitle: (content) => {
      const match = content.match(/^\s*[-*]\s+\*\*([^*]+)\*\*/m);
      return match ? match[1].trim() : 'Task';
    },
  },
  {
    name: 'code',
    type: 'snippet',
    patterns: [
      /```[\s\S]*?```/,
      /(?:function|class|const|let|var)\s+\w+\s*=/,
      /def\s+\w+\s*\(/,
      /^\s*(public|private|protected)\s+(?:static\s+)?(?:class|function|method)/m,
    ],
    confidence: 0.9,
    extractTitle: (content) => {
      const fnMatch = content.match(/(?:function|def|class)\s+(\w+)/);
      if (fnMatch) return `${fnMatch[1]}`;
      return 'Code Snippet';
    },
  },
  {
    name: 'decision',
    type: 'note',
    patterns: [
      /^(?:decision|décision|resolved|résolu|solution)\s*:/im,
      /^(?:we|on|je|I)\s+(?:decided?|a décidé|will|va)\s+/im,
      /^going\s+to\s/im,
    ],
    confidence: 0.75,
    extractTitle: (content) => {
      const match = content.match(/^(?:decision|décision)\s*:\s*(.+)$/im);
      return match ? `Decision: ${match[1].trim()}` : 'Decision';
    },
  },
  {
    name: 'list',
    type: 'note',
    patterns: [
      /^\s*[-*]\s+\*\*[^*]+\*\*\s*:/m,
      /^\d+\.\s+\*\*[^*]+\*\*\s*:/m,
    ],
    confidence: 0.6,
    extractTitle: (content) => {
      const match = content.match(/^\s*[-*\d]+\.\s+\*\*([^*]+)\*\*/m);
      return match ? match[1].trim() : 'List';
    },
  },
  {
    name: 'idea',
    type: 'idea',
    patterns: [
      /^(?:idea|brainstorm|suggestion|suggest)\s*:/im,
      /^(?:what if|maybe we could|pourquoi pas|et si)\s/im,
    ],
    confidence: 0.7,
    extractTitle: (content) => {
      const match = content.match(/^(?:idea|brainstorm)\s*:\s*(.+)$/im);
      return match ? `Idea: ${match[1].trim()}` : 'Idea';
    },
  },
];

/**
 * Tokenize text for similarity comparison
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
function calculateSimilarity(text1: string, text2: string): number {
  const terms1 = new Set(tokenize(text1));
  const terms2 = new Set(tokenize(text2));

  const intersection = new Set([...terms1].filter(x => terms2.has(x)));
  const union = new Set([...terms1, ...terms2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Check for duplicate memories
 */
async function findDuplicate(
  db: any,
  content: string,
  threshold: number
): Promise<any | null> {
  const recentMemories = await db.query.memories.findMany({
    orderBy: [desc(memories.createdAt)],
    limit: 100,
  });

  for (const memory of recentMemories) {
    const similarity = calculateSimilarity(content, memory.content);
    if (similarity >= threshold) {
      return { memory, similarity };
    }
  }

  return null;
}

/**
 * Detect important content and its type
 */
export function detectImportantContent(
  text: string
): {
  detected: boolean;
  type?: 'note' | 'conversation' | 'snippet' | 'reference' | 'task' | 'idea';
  confidence: number;
  pattern?: ContentPattern;
  suggestedTitle?: string;
} {
  if (text.length < 50) {
    return { detected: false, confidence: 0 };
  }

  // Check each pattern
  for (const pattern of IMPORTANT_PATTERNS) {
    for (const regex of pattern.patterns) {
      if (regex.test(text)) {
        const title = pattern.extractTitle
          ? pattern.extractTitle(text)
          : undefined;

        return {
          detected: true,
          type: pattern.type,
          confidence: pattern.confidence,
          pattern,
          suggestedTitle: title,
        };
      }
    }
  }

  // No pattern matched, but content is substantial
  if (text.length > 200) {
    return {
      detected: true,
      type: 'note',
      confidence: 0.4, // Low confidence
    };
  }

  return { detected: false, confidence: 0 };
}

/**
 * Extract a title from content
 */
export function extractTitle(
  content: string,
  detection: ReturnType<typeof detectImportantContent>
): string {
  // Use pattern title if available
  if (detection.suggestedTitle) {
    return detection.suggestedTitle;
  }

  // Try markdown header
  const headerMatch = content.match(/^#+\s+(.+)$/m);
  if (headerMatch) {
    return headerMatch[1].trim();
  }

  // Try bold header
  const boldMatch = content.match(/^\*\*([^*]+)\*\*\s*:/m);
  if (boldMatch) {
    return boldMatch[1].trim();
  }

  // Use first line
  const firstLine = content.split('\n')[0].trim();
  if (firstLine.length > 5 && firstLine.length < 100) {
    return firstLine;
  }

  // Truncated first line
  return firstLine.substring(0, 60) + '...';
}

/**
 * Auto-save content as a memory
 */
export async function autoSaveContent(
  content: string,
  options: {
    contextId?: string;
    type?: 'note' | 'conversation' | 'snippet' | 'reference' | 'task' | 'idea';
    title?: string;
    metadata?: Record<string, unknown>;
    config?: Partial<AutoSaveConfig>;
  } = {}
): Promise<{
  saved: boolean;
  memory?: any;
  duplicate?: any;
  reason?: string;
}> {
  const finalConfig = { ...DEFAULT_CONFIG, ...options.config };

  if (!finalConfig.enabled) {
    return { saved: false, reason: 'Auto-save is disabled' };
  }

  // Validate content length
  if (content.length < finalConfig.minContentLength) {
    return { saved: false, reason: 'Content too short' };
  }

  if (content.length > finalConfig.maxContentLength) {
    return { saved: false, reason: 'Content too long' };
  }

  const db = getDb();

  // Detect content type and confidence
  const detection = detectImportantContent(content);

  if (!detection.detected) {
    return { saved: false, reason: 'No important pattern detected' };
  }

  if (detection.confidence < finalConfig.confidenceThreshold) {
    return {
      saved: false,
      reason: `Confidence too low (${detection.confidence} < ${finalConfig.confidenceThreshold})`,
    };
  }

  // Check for duplicates
  const duplicate = await findDuplicate(
    db,
    content,
    finalConfig.duplicateThreshold
  );

  if (duplicate) {
    return {
      saved: false,
      duplicate: duplicate.memory,
      reason: `Duplicate found (${Math.round(duplicate.similarity * 100)}% similar)`,
    };
  }

  // Determine context
  let contextId = options.contextId;

  if (!contextId) {
    // Try active context
    contextId = getActiveContext();

    // If no active context, get most recent
    if (!contextId) {
      const recentContexts = await db.query.contexts.findMany({
        orderBy: [desc(contexts.updatedAt)],
        limit: 1,
      });

      if (recentContexts.length > 0) {
        contextId = recentContexts[0].id;
      }
    }
  }

  // Still no context, create default
  if (!contextId) {
    const newContextId = generateId();
    await db.insert(contexts).values({
      id: newContextId,
      name: 'General',
      description: 'Auto-created default context',
      tags: ['default', 'auto-created'],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    contextId = newContextId;
  }

  // Extract title
  const title = options.title || extractTitle(content, detection);

  // Determine type
  const type = options.type || detection.type || 'note';

  // Create memory
  const memoryId = generateId();
  const now = new Date();

  await db.insert(memories).values({
    id: memoryId,
    contextId,
    type,
    title,
    content,
    metadata: {
      ...options.metadata,
      autoGenerated: true,
      detection: {
        confidence: detection.confidence,
        pattern: detection.pattern?.name,
      },
      savedAt: now.toISOString(),
    },
    createdAt: now,
    updatedAt: now,
  });

  // Update FTS index
  const sqlite = getRawDb();
  sqlite.query(
    'INSERT INTO memories_fts (id, memory_id, title, content, type, context_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(generateId(), memoryId, title, content, type, contextId);
  sqlite.close();

  // Get created memory
  const created = await db.query.memories.findFirst({
    where: eq(memories.id, memoryId),
    with: {
      context: true,
    },
  });

  // Emit event
  emitEvent(
    EventType.MEMORY_CREATED,
    { memory: created, autoSaved: true }
  );

  return {
    saved: true,
    memory: created,
  };
}

/**
 * Process multiple items from a conversation
 */
export async function processConversationForAutoSave(
  messages: Array<{ role: string; content: string }>,
  config?: Partial<AutoSaveConfig>
): Promise<Array<{
  saved: boolean;
  memory?: any;
  reason?: string;
}>> {
  const results = [];

  for (const message of messages) {
    const result = await autoSaveContent(message.content, { config });
    results.push(result);
  }

  return results;
}
