/**
 * Ralph V3 API Client
 * Queries SQLite database directly
 */

import { createServerFn } from '@tanstack/react-start'
import Database from 'better-sqlite3'
import path from 'path'
import os from 'os'

// Direct SQLite connection
const RALPH_DB_PATH = path.join(os.homedir(), '.ralph', 'ralph-mcp.db')
let db: Database.Database | null = null

function getDb(): Database.Database {
  if (!db) {
    db = new Database(RALPH_DB_PATH, { readonly: true })
  }
  return db
}

// Types for API responses
export interface RalphMemory {
  id: string
  session_id: string
  content: string
  category: string
  priority: string
  created_at: string
}

export interface RalphInsight {
  id: number
  session_id: string
  project_path: string
  timestamp: string
  type: 'pattern' | 'decision' | 'error' | 'architecture' | 'summary'
  title: string
  content: string
  category?: string
  confidence?: number
  tokens_saved?: number
}

export interface RalphSuggestion {
  title: string
  description: string
  type: 'commit' | 'add_tests' | 'add_docs' | 'compress' | 'custom'
}

export interface OptimizerState {
  last_check: string | null
  memory_count: number
  optimization_count: number
  last_compression: string | null
  last_curation: string | null
}

export interface SystemStatus {
  isActive: boolean
  totalMemories: number
  lastActivity: string | null
  optimizationCount: number
  lastOptimization: string | null
  hooksEnabled: boolean
}

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

// Server function: Get memories from SQLite
export const getMemories = createServerFn({ method: 'GET' }).handler(
  async () => {
    try {
      const database = getDb()

      // Get recent memories
      const memories = database
        .prepare(
          `SELECT id, session_id, content, category, priority, created_at
           FROM memories
           ORDER BY created_at DESC
           LIMIT 100`,
        )
        .all() as RalphMemory[]

      const lastActivity =
        memories.length > 0 ? memories[0].created_at : null

      return {
        memories,
        totalMemories: memories.length,
        lastActivity,
      }
    } catch (error) {
      console.error('Failed to fetch memories:', error)
      return { memories: [], totalMemories: 0, lastActivity: null }
    }
  },
)

// Server function: Get suggestions (placeholder - will be implemented with hooks)
export const getSuggestions = createServerFn({ method: 'GET' }).handler(
  async () => {
    // For now, return empty suggestions
    // This will be populated by the hooks system
    return { suggestions: [] }
  },
)

// Server function: Get optimizer state (placeholder)
export const getOptimizerState = createServerFn({ method: 'GET' }).handler(
  async () => {
    // For now, return default state
    // This will be populated by the compression system
    return {
      state: {
        last_check: null,
        memory_count: 0,
        optimization_count: 0,
        last_compression: null,
        last_curation: null,
      },
    }
  },
)

// Server function: Get system status
export const getSystemStatus = createServerFn({ method: 'GET' }).handler(
  async () => {
    // Backend API removed - return default inactive status
    return {
      isActive: false,
      totalMemories: 0,
      lastActivity: null,
      optimizationCount: 0,
      lastOptimization: null,
      hooksEnabled: false,
    }
  },
)

// Server function: Search memories
export const searchMemoriesFn = createServerFn({ method: 'POST' })
  .handler(async (query: string) => {
    try {
      const database = getDb()

      // Use LIKE search on content
      const results = database
        .prepare(
          `SELECT id, session_id, content, category, priority, created_at
           FROM memories
           WHERE content LIKE ?
           ORDER BY created_at DESC
           LIMIT 20`,
        )
        .all(`%${query}%`) as RalphMemory[]

      return results
    } catch (error) {
      console.error('Search failed:', error)
      return []
    }
  })

// Wrapper for backward compatibility
export async function searchMemories(
  query: string,
  limit = 20,
): Promise<RalphMemory[]> {
  return searchMemoriesFn(query)
}

// Server function: Get insights
export const getInsightsFn = createServerFn({ method: 'POST' })
  .handler(async (projectPath: string) => {
    try {
      const database = getDb()

      const insights = database
        .prepare(
          `SELECT id, session_id, project_path, timestamp, type,
                  title, content, category, confidence, tokens_saved
           FROM insights
           WHERE project_path = ?
           ORDER BY timestamp DESC
           LIMIT 10`,
        )
        .all(projectPath) as RalphInsight[]

      return insights
    } catch (error) {
      console.error('Failed to fetch insights:', error)
      return []
    }
  })

// Wrapper for backward compatibility
export async function getInsights(
  projectPath: string,
  limit = 10,
): Promise<RalphInsight[]> {
  return getInsightsFn(projectPath)
}

function inferSuggestionType(title: string): RalphSuggestion['type'] {
  const lower = title.toLowerCase()
  if (lower.includes('commit') || lower.includes('git')) return 'commit'
  if (lower.includes('test')) return 'add_tests'
  if (lower.includes('doc')) return 'add_docs'
  if (lower.includes('compress') || lower.includes('fold')) return 'compress'
  return 'custom'
}
