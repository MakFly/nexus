import { create } from 'zustand'

interface AutomationConfig {
  autoContext: {
    enabled: boolean
    autoCreateThreshold: number
  }
  autoSave: {
    enabled: boolean
    confidenceThreshold: number
    duplicateThreshold: number
  }
  smartSearch: {
    enabled: boolean
    useQueryExpansion: boolean
    semanticWeight: number
    ftsWeight: number
  }
  autoRelationships: {
    enabled: boolean
    autoCreate: boolean
    similarityThreshold: number
  }
}

interface Suggestion {
  id: string
  type: 'context' | 'memory' | 'relationship'
  title: string
  description: string
  action: () => void
}

interface AutomationState {
  config: AutomationConfig
  suggestions: Suggestion[]
  activeContext: {
    id: string
    name: string
    description: string
  } | null
  isLoading: boolean
  error: string | null

  // Actions
  loadConfig: () => Promise<void>
  updateConfig: (updates: Partial<AutomationConfig>) => Promise<void>
  loadSuggestions: () => Promise<void>
  loadActiveContext: () => Promise<void>
  setActiveContext: (contextId: string) => Promise<void>
  analyzeContext: (conversation: string[]) => Promise<any>
  autoSave: (content: string, options?: any) => Promise<any>
  smartSearch: (query: string, options?: any) => Promise<any>
  createRelationships: (memoryId: string) => Promise<any>
}

const defaultConfig: AutomationConfig = {
  autoContext: {
    enabled: true,
    autoCreateThreshold: 0.5,
  },
  autoSave: {
    enabled: false,
    confidenceThreshold: 0.7,
    duplicateThreshold: 0.85,
  },
  smartSearch: {
    enabled: true,
    useQueryExpansion: true,
    semanticWeight: 0.6,
    ftsWeight: 0.4,
  },
  autoRelationships: {
    enabled: true,
    autoCreate: false,
    similarityThreshold: 0.3,
  },
}

export const useAutomationStore = create<AutomationState>((set, get) => ({
  config: defaultConfig,
  suggestions: [],
  activeContext: null,
  isLoading: false,
  error: null,

  loadConfig: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch('/api/automation/config')
      const data = await response.json()

      if (data.success) {
        set({ config: data.config, isLoading: false })
      } else {
        set({ error: data.error, isLoading: false })
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  updateConfig: async (updates) => {
    set({ isLoading: true, error: null })
    try {
      // Optimistic update
      const newConfig = { ...get().config, ...updates }
      set({ config: newConfig })

      // In a real implementation, this would call an API to persist
      // For now, we'll just simulate success
      set({ isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  loadSuggestions: async () => {
    try {
      const response = await fetch('/api/automation/suggestions')
      const data = await response.json()

      if (data.success) {
        set({ suggestions: data.suggestions || [] })
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error)
    }
  },

  loadActiveContext: async () => {
    try {
      const response = await fetch('/api/automation/active-context')
      const data = await response.json()

      if (data.success && data.activeContextId) {
        // Load full context details
        const contextResponse = await fetch(
          `/api/contexts/${data.activeContextId}`,
        )
        const contextData = await contextResponse.json()

        if (contextData.success) {
          set({
            activeContext: {
              id: contextData.context.id,
              name: contextData.context.name,
              description: contextData.context.description,
            },
          })
        }
      } else {
        set({ activeContext: null })
      }
    } catch (error) {
      console.error('Failed to load active context:', error)
    }
  },

  setActiveContext: async (contextId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch('/api/automation/set-active-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextId }),
      })

      const data = await response.json()

      if (data.success) {
        await get().loadActiveContext()
        set({ isLoading: false })
      } else {
        set({ error: data.error, isLoading: false })
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  analyzeContext: async (conversation: string[]) => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch('/api/automation/analyze-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation }),
      })

      const data = await response.json()
      set({ isLoading: false })

      if (data.success) {
        return data
      } else {
        set({ error: data.error })
        return null
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
      return null
    }
  },

  autoSave: async (content: string, options = {}) => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch('/api/automation/auto-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, ...options }),
      })

      const data = await response.json()
      set({ isLoading: false })

      if (data.success) {
        return data
      } else {
        set({ error: data.error })
        return null
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
      return null
    }
  },

  smartSearch: async (query: string, options = {}) => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch('/api/automation/smart-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, ...options }),
      })

      const data = await response.json()
      set({ isLoading: false })

      if (data.success) {
        return data
      } else {
        set({ error: data.error })
        return null
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
      return null
    }
  },

  createRelationships: async (memoryId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch('/api/automation/auto-relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memoryId }),
      })

      const data = await response.json()
      set({ isLoading: false })

      if (data.success) {
        return data
      } else {
        set({ error: data.error })
        return null
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
      return null
    }
  },
}))
