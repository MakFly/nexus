/**
 * MCP Server configuration and setup
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from './config.js';
import { initializeDatabase } from './storage/client.js';

// Import hook system
import {
  withHooks,
  registerPreHook,
  registerPostHook,
  createLoggingHook,
  createPerformanceHook,
  createMemoryTrackingHook,
  createContextTrackingHook,
} from './hooks/index.js';

// Import auto-memoize hook
import { createAutoMemoizeHook } from './hooks/auto-memoize-hook.js';

// Import tool handlers
import {
  createContext,
  getContext,
  listContexts,
  deleteContext,
  updateContext,
} from './tools/context.js';

import {
  addMemory,
  getMemory,
  listMemories,
  deleteMemory,
  updateMemory,
} from './tools/memory.js';

import { searchMemories, fuzzySearchMemories } from './tools/search.js';
import { searchMemories as searchMemoriesFirst } from './tools/search-first.js';

// Import new automation tools
import { autoAnalyzeContext } from './tools/auto-analyze.js';
import { smartSearch } from './tools/smart-search.js';
import { findRelationships } from './tools/find-relationships.js';
import { autoSaveMemory } from './tools/auto-save.js';
import { mgrep, mgrepFiles } from './tools/mgrep.js';

/**
 * Setup default hooks
 * Registers built-in hooks for logging, performance monitoring, and event tracking
 */
async function setupDefaultHooks() {
  // Register global pre-hook for logging
  registerPreHook(undefined, createLoggingHook(), 10);

  // Register global post-hook for performance monitoring
  registerPostHook(undefined, createPerformanceHook(), 10);

  // Register memory tracking hooks
  registerPostHook(
    ['add_memory', 'update_memory', 'delete_memory'],
    createMemoryTrackingHook(),
    20
  );

  // Register context tracking hooks
  registerPostHook(
    ['create_context', 'update_context', 'delete_context'],
    createContextTrackingHook(),
    20
  );

  // Register auto-memoize hook
  registerPostHook(undefined, createAutoMemoizeHook(), 5);

  if (config.debug) {
    console.error('[DEBUG] Default hooks registered');
    const { hookSystem } = await import('./hooks/index.js');
    const stats = hookSystem.getStats();
    console.error('[DEBUG] Hook stats:', JSON.stringify(stats, null, 2));
  }
}

/**
 * Wrapper to execute tool handlers with hooks
 */
async function executeToolWithHooks(
  toolName: string,
  args: unknown,
  toolHandler: () => Promise<ReturnType<typeof createContext>>
) {
  return withHooks(toolName, args, toolHandler);
}

/**
 * Create and configure the MCP server
 */
export async function createServer() {
  // Initialize database
  await initializeDatabase();

  // Setup default hooks
  setupDefaultHooks();

  // Create server instance
  const server = new Server(
    {
      name: config.serverName,
      version: config.serverVersion,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        // Context tools
        {
          name: 'create_context',
          description: 'Create a new context (collection of memories)',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name of the context',
                minLength: 1,
                maxLength: 200,
              },
              description: {
                type: 'string',
                description: 'Optional description of the context',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional tags for categorization',
              },
              stack: {
                type: 'string',
                description: 'Technology stack (e.g., nextjs, laravel, symfony, react19, vuejs, devops)',
                enum: ['nextjs', 'laravel', 'symfony', 'react19', 'vuejs', 'devops', 'php-api-platform', 'basic', 'search', 'automation', 'advanced'],
              },
              difficulty: {
                type: 'string',
                description: 'Difficulty level (easy, normal, hard)',
                enum: ['easy', 'normal', 'hard'],
              },
              metadata: {
                type: 'object',
                description: 'Optional metadata (key-value pairs)',
              },
            },
            required: ['name'],
          },
        },
        {
          name: 'get_context',
          description: 'Get details of a specific context',
          inputSchema: {
            type: 'object',
            properties: {
              contextId: {
                type: 'string',
                description: 'ID of the context to retrieve',
              },
            },
            required: ['contextId'],
          },
        },
        {
          name: 'list_contexts',
          description: 'List all contexts for the current user',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Maximum number of contexts to return',
                default: 50,
              },
              offset: {
                type: 'number',
                description: 'Number of contexts to skip',
                default: 0,
              },
            },
          },
        },
        {
          name: 'update_context',
          description: 'Update an existing context',
          inputSchema: {
            type: 'object',
            properties: {
              contextId: {
                type: 'string',
                description: 'ID of the context to update',
              },
              name: {
                type: 'string',
                description: 'New name for the context',
                minLength: 1,
                maxLength: 200,
              },
              description: {
                type: 'string',
                description: 'New description for the context',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'New tags for the context',
              },
              stack: {
                type: 'string',
                description: 'Technology stack (e.g., nextjs, laravel, symfony, react19, vuejs, devops)',
                enum: ['nextjs', 'laravel', 'symfony', 'react19', 'vuejs', 'devops', 'php-api-platform', 'basic', 'search', 'automation', 'advanced'],
              },
              difficulty: {
                type: 'string',
                description: 'Difficulty level (easy, normal, hard)',
                enum: ['easy', 'normal', 'hard'],
              },
              metadata: {
                type: 'object',
                description: 'New metadata for the context',
              },
            },
            required: ['contextId'],
          },
        },
        {
          name: 'delete_context',
          description: 'Delete a context and all its memories',
          inputSchema: {
            type: 'object',
            properties: {
              contextId: {
                type: 'string',
                description: 'ID of the context to delete',
              },
            },
            required: ['contextId'],
          },
        },
        // Memory tools
        {
          name: 'add_memory',
          description: 'Add a new memory to a context',
          inputSchema: {
            type: 'object',
            properties: {
              contextId: {
                type: 'string',
                description: 'ID of the context to add the memory to',
              },
              type: {
                type: 'string',
                enum: ['note', 'conversation', 'snippet', 'reference', 'task', 'idea'],
                description: 'Type of memory',
              },
              title: {
                type: 'string',
                description: 'Title of the memory',
                minLength: 1,
                maxLength: 500,
              },
              content: {
                type: 'string',
                description: 'Content of the memory',
                minLength: 1,
              },
              stack: {
                type: 'string',
                description: 'Technology stack (e.g., nextjs, laravel, symfony, react19, vuejs, devops)',
                enum: ['nextjs', 'laravel', 'symfony', 'react19', 'vuejs', 'devops', 'php-api-platform', 'basic', 'search', 'automation', 'advanced'],
              },
              difficulty: {
                type: 'string',
                description: 'Difficulty level (easy, normal, hard)',
                enum: ['easy', 'normal', 'hard'],
              },
              metadata: {
                type: 'object',
                description: 'Optional metadata (key-value pairs)',
              },
            },
            required: ['contextId', 'type', 'title', 'content'],
          },
        },
        {
          name: 'get_memory',
          description: 'Get details of a specific memory',
          inputSchema: {
            type: 'object',
            properties: {
              memoryId: {
                type: 'string',
                description: 'ID of the memory to retrieve',
              },
            },
            required: ['memoryId'],
          },
        },
        {
          name: 'search_memories',
          description: 'Search-First tool: Find memories with compact excerpts. Use this BEFORE list_memories to avoid token overload. Returns lightweight results (~70 tokens per memory vs 1500+). Use get_memory() to retrieve full content only for selected results.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query',
                minLength: 1,
              },
              contextId: {
                type: 'string',
                description: 'Limit search to a specific context',
              },
              type: {
                type: 'string',
                enum: ['note', 'conversation', 'snippet', 'reference', 'task', 'idea'],
                description: 'Limit search to a specific memory type',
              },
              stack: {
                type: 'string',
                enum: ['nextjs', 'laravel', 'symfony', 'react19', 'vuejs', 'devops', 'php-api-platform', 'basic', 'search', 'automation', 'advanced'],
                description: 'Limit search to a specific technology stack',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results to return',
                default: 10,
              },
              mode: {
                type: 'string',
                enum: ['compact', 'standard', 'detailed'],
                description: 'Excerpt length: compact (~60 tokens), standard (~120 tokens), detailed (~250 tokens)',
                default: 'compact',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'list_memories',
          description: '[DEPRECATED] Use search_memories instead for better token efficiency. List memories with optional filters. WARNING: Returns full content which can consume 10k+ tokens.',
          inputSchema: {
            type: 'object',
            properties: {
              contextId: {
                type: 'string',
                description: 'Filter by context ID',
              },
              type: {
                type: 'string',
                enum: ['note', 'conversation', 'snippet', 'reference', 'task', 'idea'],
                description: 'Filter by memory type',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of memories to return',
                default: 50,
              },
              offset: {
                type: 'number',
                description: 'Number of memories to skip',
                default: 0,
              },
            },
          },
        },
        {
          name: 'update_memory',
          description: 'Update an existing memory',
          inputSchema: {
            type: 'object',
            properties: {
              memoryId: {
                type: 'string',
                description: 'ID of the memory to update',
              },
              type: {
                type: 'string',
                enum: ['note', 'conversation', 'snippet', 'reference', 'task', 'idea'],
                description: 'New type for the memory',
              },
              title: {
                type: 'string',
                description: 'New title for the memory',
                minLength: 1,
                maxLength: 500,
              },
              content: {
                type: 'string',
                description: 'New content for the memory',
                minLength: 1,
              },
              stack: {
                type: 'string',
                description: 'Technology stack (e.g., nextjs, laravel, symfony, react19, vuejs, devops)',
                enum: ['nextjs', 'laravel', 'symfony', 'react19', 'vuejs', 'devops', 'php-api-platform', 'basic', 'search', 'automation', 'advanced'],
              },
              difficulty: {
                type: 'string',
                description: 'Difficulty level (easy, normal, hard)',
                enum: ['easy', 'normal', 'hard'],
              },
              metadata: {
                type: 'object',
                description: 'New metadata for the memory',
              },
            },
            required: ['memoryId'],
          },
        },
        {
          name: 'delete_memory',
          description: 'Delete a memory',
          inputSchema: {
            type: 'object',
            properties: {
              memoryId: {
                type: 'string',
                description: 'ID of the memory to delete',
              },
            },
            required: ['memoryId'],
          },
        },
        // Search tool
        {
          name: 'search',
          description: 'Full-text search across all memories',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query',
                minLength: 1,
              },
              contextId: {
                type: 'string',
                description: 'Limit search to a specific context',
              },
              type: {
                type: 'string',
                enum: ['note', 'conversation', 'snippet', 'reference', 'task', 'idea'],
                description: 'Limit search to a specific memory type',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results to return',
                default: 20,
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'fuzzy_search',
          description: 'Fuzzy search using Levenshtein distance to tolerate typos and partial matches. Searches in title, content, and tags. Returns results with a fuzzy score (0-1). Tolerates up to 2 character differences for short terms, more for longer terms.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query',
                minLength: 1,
              },
              contextId: {
                type: 'string',
                description: 'Limit search to a specific context',
              },
              type: {
                type: 'string',
                enum: ['note', 'conversation', 'snippet', 'reference', 'task', 'idea'],
                description: 'Limit search to a specific memory type',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results to return',
                default: 20,
              },
              tolerance: {
                type: 'number',
                description: 'Maximum character differences allowed (0-10, default: 2). For short terms (<5 chars), uses this value directly. For longer terms, allows 40% length tolerance.',
                default: 2,
                minimum: 0,
                maximum: 10,
              },
            },
            required: ['query'],
          },
        },
        // Automation tools
        {
          name: 'auto_analyze_context',
          description: 'Analyze a conversation and suggest an appropriate context based on keywords',
          inputSchema: {
            type: 'object',
            properties: {
              conversation: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of conversation messages to analyze',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of similar contexts to return',
                default: 5,
              },
            },
            required: ['conversation'],
          },
        },
        {
          name: 'smart_search',
          description: 'Hybrid search combining FTS5 and TF-IDF for better relevance ranking',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query',
                minLength: 1,
              },
              contextId: {
                type: 'string',
                description: 'Limit search to a specific context',
              },
              type: {
                type: 'string',
                enum: ['note', 'conversation', 'snippet', 'reference', 'task', 'idea'],
                description: 'Limit search to a specific memory type',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results to return',
                default: 20,
              },
              minScore: {
                type: 'number',
                description: 'Minimum combined score (0-1) to include in results',
                default: 0.1,
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'find_relationships',
          description: 'Find connections between memories based on content similarity',
          inputSchema: {
            type: 'object',
            properties: {
              memoryId: {
                type: 'string',
                description: 'ID of the memory to find relationships for',
              },
              threshold: {
                type: 'number',
                description: 'Minimum similarity threshold (0-1)',
                default: 0.3,
              },
              limit: {
                type: 'number',
                description: 'Maximum number of relationships to return',
                default: 10,
              },
              createRelationships: {
                type: 'boolean',
                description: 'Automatically create relationships for similar memories',
                default: false,
              },
            },
            required: ['memoryId'],
          },
        },
        {
          name: 'auto_save_memory',
          description: 'Intelligently save content with duplicate detection and auto-categorization',
          inputSchema: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                description: 'Content to save',
                minLength: 1,
              },
              contextId: {
                type: 'string',
                description: 'Context ID (uses default if not provided)',
              },
              type: {
                type: 'string',
                enum: ['note', 'conversation', 'snippet', 'reference', 'task', 'idea'],
                description: 'Memory type (auto-detected if not provided)',
              },
              title: {
                type: 'string',
                description: 'Title (auto-generated if not provided)',
              },
              metadata: {
                type: 'object',
                description: 'Optional metadata',
              },
              checkDuplicates: {
                type: 'boolean',
                description: 'Check for duplicates before saving',
                default: true,
              },
              duplicateThreshold: {
                type: 'number',
                description: 'Similarity threshold for duplicate detection (0-1)',
                default: 0.8,
              },
            },
            required: ['content'],
          },
        },
        {
          name: 'mgrep',
          description: 'Ultra-fast file content search optimized for minimal token usage. Uses ripgrep (rg) when available, falls back to grep. Perfect for code exploration and finding specific patterns across files.',
          inputSchema: {
            type: 'object',
            properties: {
              pattern: {
                type: 'string',
                description: 'Regex pattern to search for',
                minLength: 1,
              },
              path: {
                type: 'string',
                description: 'Directory to search in (default: current working directory)',
              },
              glob: {
                type: 'string',
                description: 'File pattern to filter (e.g., "*.ts", "*.tsx")',
              },
              ignoreCase: {
                type: 'boolean',
                description: 'Case-insensitive search',
                default: false,
              },
              contextLines: {
                type: 'number',
                description: 'Number of context lines (0-5, default: 2)',
                default: 2,
                minimum: 0,
                maximum: 5,
              },
              maxResults: {
                type: 'number',
                description: 'Maximum number of matches (default: 50)',
                default: 50,
              },
              outputMode: {
                type: 'string',
                enum: ['concise', 'context', 'files-with-matches'],
                description: 'Output format (concise=default, context=more detail, files-with-matches=just files)',
                default: 'concise',
              },
            },
            required: ['pattern'],
          },
        },
        {
          name: 'mgrep_files',
          description: 'Fast file discovery using glob patterns. Lists files matching a pattern without searching content. Useful for exploring project structure.',
          inputSchema: {
            type: 'object',
            properties: {
              pattern: {
                type: 'string',
                description: 'Glob pattern (default: *)',
                default: '*',
              },
              path: {
                type: 'string',
                description: 'Directory to search (default: current)',
              },
              maxResults: {
                type: 'number',
                description: 'Maximum files to return (default: 100)',
                default: 100,
              },
            },
            required: [],
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (config.debug) {
      console.error(`[DEBUG] Tool call: ${name}`, JSON.stringify(args, null, 2));
    }

    switch (name) {
      // Context tools
      case 'create_context':
        return executeToolWithHooks(name, args, () => createContext(args));
      case 'get_context':
        return executeToolWithHooks(name, args, () => getContext(args));
      case 'list_contexts':
        return executeToolWithHooks(name, args, () => listContexts(args));
      case 'update_context':
        return executeToolWithHooks(name, args, () => updateContext(args));
      case 'delete_context':
        return executeToolWithHooks(name, args, () => deleteContext(args));

      // Memory tools
      case 'add_memory':
        return executeToolWithHooks(name, args, () => addMemory(args));
      case 'get_memory':
        return executeToolWithHooks(name, args, () => getMemory(args));
      case 'list_memories':
        return executeToolWithHooks(name, args, () => listMemories(args));
      case 'update_memory':
        return executeToolWithHooks(name, args, () => updateMemory(args));
      case 'delete_memory':
        return executeToolWithHooks(name, args, () => deleteMemory(args));

      // Search tools
      case 'search':
        return executeToolWithHooks(name, args, () => searchMemories(args));
      case 'search_memories':
        return executeToolWithHooks(name, args, () => searchMemoriesFirst(args));
      case 'fuzzy_search':
        return executeToolWithHooks(name, args, () => fuzzySearchMemories(args));

      // Automation tools
      case 'auto_analyze_context':
        return executeToolWithHooks(name, args, () => autoAnalyzeContext(args));
      case 'smart_search':
        return executeToolWithHooks(name, args, () => smartSearch(args));
      case 'find_relationships':
        return executeToolWithHooks(name, args, () => findRelationships(args));
      case 'auto_save_memory':
        return executeToolWithHooks(name, args, () => autoSaveMemory(args));

      // File search tools
      case 'mgrep':
        return executeToolWithHooks(name, args, () => mgrep(args));
      case 'mgrep_files':
        return executeToolWithHooks(name, args, () => mgrepFiles(args));

      default:
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `Unknown tool: ${name}`,
              }),
            },
          ],
          isError: true,
        };
    }
  });

  return server;
}

/**
 * Start the MCP server with stdio transport
 */
export async function startServer() {
  const server = await createServer();

  const transport = new StdioServerTransport();
  await server.connect(transport);

  if (config.debug) {
    console.error(`[DEBUG] ${config.serverName} v${config.serverVersion} started`);
  }
}
