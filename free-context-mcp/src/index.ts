#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { RalphDatabase } from './storage/database.js'
import * as mallocTool from './tools/malloc.js'
import * as freeTool from './tools/free.js'
import * as addMemoryTool from './tools/addMemory.js'
import * as searchTool from './tools/search.js'
import * as checkpointTool from './tools/checkpoint.js'

// Initialize database
const dbPath = process.env.FREE_CONTEXT_DB_PATH || '~/.free-context/database.db'
const db = new RalphDatabase(dbPath)

// Create MCP server
const server = new Server(
  {
    name: 'free-context-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'context_malloc',
        description: 'Initialize a new context management session',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            maxTokens: {
              type: 'number',
              description: 'Maximum token limit (default: 200000)',
            },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'context_free',
        description: 'Terminate a context management session',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'Session identifier to terminate',
            },
          },
          required: ['sessionId'],
        },
      },
      {
        name: 'context_add_memory',
        description: 'Store a memory in the current session',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'Session identifier',
            },
            category: {
              type: 'string',
              enum: ['decision', 'context', 'code', 'error', 'solution'],
              description: 'Memory category',
            },
            content: {
              type: 'string',
              description: 'Memory content',
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata',
            },
          },
          required: ['sessionId', 'category', 'content'],
        },
      },
      {
        name: 'context_search',
        description: 'Search stored memories using full-text search',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 10)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'context_checkpoint',
        description: 'Create a checkpoint of the current context state',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'Session identifier',
            },
            name: {
              type: 'string',
              description: 'Checkpoint name',
            },
            contextSummary: {
              type: 'string',
              description: 'Summary of current context',
            },
            tokenCount: {
              type: 'number',
              description: 'Current token count',
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata',
            },
          },
          required: ['sessionId', 'name', 'contextSummary', 'tokenCount'],
        },
      },
    ],
  }
})

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      case 'context_malloc': {
        const input = mallocTool.MallocInputSchema.parse(args)
        const result = await mallocTool.ralphMalloc(input, db)
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      }

      case 'context_free': {
        const input = freeTool.FreeInputSchema.parse(args)
        const result = await freeTool.ralphFree(input, db)
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      }

      case 'context_add_memory': {
        const input = addMemoryTool.AddMemoryInputSchema.parse(args)
        const result = await addMemoryTool.ralphAddMemory(input, db)
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      }

      case 'context_search': {
        const input = searchTool.SearchInputSchema.parse(args)
        const result = await searchTool.ralphSearch(input, db)
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      }

      case 'context_checkpoint': {
        const input = checkpointTool.CheckpointInputSchema.parse(args)
        const result = await checkpointTool.ralphCheckpoint(input, db)
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (error) {
    if (error instanceof Error) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }],
        isError: true,
      }
    }
    throw error
  }
})

// Start server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Free Context MCP server running on stdio')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
