/**
 * Automation API Endpoints
 *
 * Provides HTTP endpoints for automation features:
 * - Auto-context suggestions
 * - Auto-save content
 * - Smart search
 * - Relationship suggestions
 * - Automation configuration
 */

import { Hono } from 'hono';
import { z } from 'zod/v4';
import { zValidator } from '@hono/zod-validator';
import {
  analyzeAndSuggestContext,
  createAutoContext,
  getActiveContext,
  setActiveContext,
  processPromptWithContext,
} from '../automations/auto-context.js';
import {
  detectImportantContent,
  autoSaveContent,
} from '../automations/auto-save.js';
import {
  smartSearch,
  getSearchSuggestions,
} from '../automations/smart-search.js';
import {
  findSimilarMemories,
  createRelationship,
  autoCreateRelationships,
  getRelationshipGraph,
} from '../automations/auto-relations.js';

export const automationRouter = new Hono();

/**
 * GET /api/automation/suggestions
 * Get automation suggestions based on recent activity
 */
automationRouter.get('/suggestions', async (c) => {
  try {
    // This would analyze recent events and provide suggestions
    // For now, return a basic response
    return c.json({
      success: true,
      suggestions: {
        contexts: [],
        memories: [],
        relationships: [],
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get suggestions',
      },
      500
    );
  }
});

/**
 * POST /api/automation/analyze-context
 * Analyze a conversation and suggest a context
 */
const AnalyzeContextSchema = z.object({
  conversation: z.array(z.string()),
  limit: z.number().optional().default(5),
});

automationRouter.post(
  '/analyze-context',
  zValidator('json', AnalyzeContextSchema),
  async (c) => {
    const input = c.req.valid('json');

    try {
      const result = await analyzeAndSuggestContext(
        input.conversation.join(' '),
        { limit: input.limit }
      );

      return c.json({
        success: true,
        ...result,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Analysis failed',
        },
        500
      );
    }
  }
);

/**
 * POST /api/automation/create-context
 * Create a context from suggestion
 */
const CreateContextFromSuggestionSchema = z.object({
  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()).optional(),
});

automationRouter.post(
  '/create-context',
  zValidator('json', CreateContextFromSuggestionSchema),
  async (c) => {
    const input = c.req.valid('json');

    try {
      const context = await createAutoContext(
        input.name,
        input.description,
        input.tags || []
      );

      return c.json({
        success: true,
        context,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create context',
        },
        500
      );
    }
  }
);

/**
 * GET /api/automation/active-context
 * Get the currently active context
 */
automationRouter.get('/active-context', async (c) => {
  try {
    const activeContextId = getActiveContext();

    return c.json({
      success: true,
      activeContextId,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get active context',
      },
      500
    );
  }
});

/**
 * POST /api/automation/set-active-context
 * Set the active context
 */
const SetActiveContextSchema = z.object({
  contextId: z.string(),
});

automationRouter.post(
  '/set-active-context',
  zValidator('json', SetActiveContextSchema),
  async (c) => {
    const input = c.req.valid('json');

    try {
      setActiveContext(input.contextId);

      return c.json({
        success: true,
        message: 'Active context updated',
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to set active context',
        },
        500
      );
    }
  }
);

/**
 * POST /api/automation/auto-save
 * Auto-save content with duplicate detection
 */
const AutoSaveSchema = z.object({
  content: z.string(),
  contextId: z.string().optional(),
  type: z.enum(['note', 'conversation', 'snippet', 'reference', 'task', 'idea']).optional(),
  title: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

automationRouter.post(
  '/auto-save',
  zValidator('json', AutoSaveSchema),
  async (c) => {
    const input = c.req.valid('json');

    try {
      const result = await autoSaveContent(input.content, {
        contextId: input.contextId,
        type: input.type,
        title: input.title,
        metadata: input.metadata,
      });

      return c.json({
        success: true,
        ...result,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Auto-save failed',
        },
        500
      );
    }
  }
);

/**
 * POST /api/automation/detect
 * Detect important content without saving
 */
const DetectSchema = z.object({
  content: z.string(),
});

automationRouter.post(
  '/detect',
  zValidator('json', DetectSchema),
  async (c) => {
    const input = c.req.valid('json');

    try {
      const detection = detectImportantContent(input.content);

      return c.json({
        success: true,
        detection,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Detection failed',
        },
        500
      );
    }
  }
);

/**
 * POST /api/automation/smart-search
 * Perform smart search with hybrid ranking
 */
const SmartSearchSchema = z.object({
  query: z.string(),
  contextId: z.string().optional(),
  type: z.enum(['note', 'conversation', 'snippet', 'reference', 'task', 'idea']).optional(),
  limit: z.number().optional().default(20),
  minScore: z.number().optional().default(0.1),
});

automationRouter.post(
  '/smart-search',
  zValidator('json', SmartSearchSchema),
  async (c) => {
    const input = c.req.valid('json');

    try {
      const result = await smartSearch(input.query, {
        contextId: input.contextId,
        type: input.type,
        limit: input.limit,
        minScore: input.minScore,
      });

      return c.json({
        success: true,
        ...result,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Search failed',
        },
        500
      );
    }
  }
);

/**
 * GET /api/automation/search-suggestions
 * Get search suggestions based on partial query
 */
automationRouter.get('/search-suggestions', async (c) => {
  const query = c.req.query('q') || '';

  try {
    const { getSearchSuggestions } = await import('../automations/smart-search.js');
    const suggestions = await getSearchSuggestions(query, 5);

    return c.json({
      success: true,
      suggestions,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get suggestions',
      },
      500
    );
  }
});

/**
 * GET /api/automation/relationships/:memoryId
 * Find relationships for a memory
 */
automationRouter.get('/relationships/:memoryId', async (c) => {
  const memoryId = c.req.param('memoryId');
  const threshold = Number(c.req.query('threshold') || '0.3');
  const limit = Number(c.req.query('limit') || '10');

  try {
    const result = await findSimilarMemories(memoryId, {
      threshold,
      limit,
    });

    return c.json({
      success: true,
      memory: result.memory,
      similar: result.similar,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to find relationships',
      },
      500
    );
  }
});

/**
 * POST /api/automation/relationships
 * Create a relationship between memories
 */
const CreateRelationshipSchema = z.object({
  sourceId: z.string(),
  targetId: z.string(),
  type: z.enum(['related', 'depends_on', 'blocks', 'includes', 'references']),
  strength: z.number().optional(),
});

automationRouter.post(
  '/relationships',
  zValidator('json', CreateRelationshipSchema),
  async (c) => {
    const input = c.req.valid('json');

    try {
      const relationship = await createRelationship(
        input.sourceId,
        input.targetId,
        input.type,
        input.strength
      );

      return c.json({
        success: true,
        relationship,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create relationship',
        },
        500
      );
    }
  }
);

/**
 * POST /api/automation/auto-relationships
 * Auto-create relationships for a memory
 */
const AutoRelationshipsSchema = z.object({
  memoryId: z.string(),
  threshold: z.number().optional().default(0.3),
  limit: z.number().optional().default(10),
});

automationRouter.post(
  '/auto-relationships',
  zValidator('json', AutoRelationshipsSchema),
  async (c) => {
    const input = c.req.valid('json');

    try {
      const result = await autoCreateRelationships(input.memoryId, {
        threshold: input.threshold,
        limit: input.limit,
        config: { autoCreate: true },
      });

      return c.json({
        success: true,
        ...result,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to auto-create relationships',
        },
        500
      );
    }
  }
);

/**
 * GET /api/automation/relationship-graph/:memoryId
 * Get relationship graph for a memory
 */
automationRouter.get('/relationship-graph/:memoryId', async (c) => {
  const memoryId = c.req.param('memoryId');
  const depth = Number(c.req.query('depth') || '2');

  try {
    const graph = await getRelationshipGraph(memoryId, depth);

    return c.json({
      success: true,
      ...graph,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get relationship graph',
      },
      500
    );
  }
});

/**
 * GET /api/automation/config
 * Get current automation configuration
 */
automationRouter.get('/config', async (c) => {
  try {
    return c.json({
      success: true,
      config: {
        autoContext: {
          enabled: true,
          autoCreateThreshold: 0.5,
        },
        autoSave: {
          enabled: false, // Disabled by default
          confidenceThreshold: 0.7,
        },
        smartSearch: {
          enabled: true,
          useQueryExpansion: true,
        },
        autoRelationships: {
          enabled: true,
          autoCreate: false, // Suggestions only by default
        },
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get config',
      },
      500
    );
  }
});
