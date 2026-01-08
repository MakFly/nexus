/**
 * Context Store - Manages context state and operations
 * Handles CRUD operations for contexts and provides derived state
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Context } from '@/types'
import { contextsApi } from '@/lib/api'

/**
 * Context store state interface
 */
interface ContextState {
  // State
  contexts: Array<Context>
  loading: boolean
  error: string | null
  selectedContextId: string | null
  isFetching: boolean // Prevents duplicate concurrent fetches

  // Actions
  fetchContexts: () => Promise<void>
  createContext: (
    data: Omit<Context, 'id' | 'createdAt' | 'updatedAt'>,
  ) => Promise<Context>
  updateContext: (id: string, data: Partial<Context>) => Promise<void>
  deleteContext: (id: string) => Promise<void>
  selectContext: (id: string | null) => void
  clearError: () => void

  // Derived getters (computed values)
  getContextById: (id: string) => Context | undefined
  getContextsByTag: (tag: string) => Array<Context>
  getContextTree: () => ContextTree
}

/**
 * Context tree structure for hierarchical view
 */
interface ContextTree {
  root: Array<Context>
  byTag: Record<string, Array<Context>>
  tagCounts: Record<string, number>
}

/**
 * Create the context store
 */
const createContextStore = () =>
  create<ContextState>()(
    devtools(
      (set, get) => ({
        // Initial state
        contexts: [],
        loading: true,
        error: null,
        selectedContextId: null,
        isFetching: false,

        /**
         * Fetch all contexts from the API
         * Prevents duplicate concurrent fetches with isFetching flag
         */
        fetchContexts: async () => {
          // Prevent duplicate concurrent fetches
          if (get().isFetching) {
            return
          }

          set(
            { loading: true, error: null, isFetching: true },
            false,
            'fetchContexts/start',
          )
          try {
            const contexts = await contextsApi.getAll()
            set(
              { contexts, loading: false, isFetching: false },
              false,
              'fetchContexts/success',
            )
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : 'Failed to fetch contexts'
            set(
              { error: message, loading: false, isFetching: false },
              false,
              'fetchContexts/error',
            )
          }
        },

        /**
         * Create a new context
         */
        createContext: async (data) => {
          set({ loading: true, error: null }, false, 'createContext/start')
          try {
            const newContext = await contextsApi.create(data)
            set(
              (state) => ({
                contexts: [...state.contexts, newContext],
                loading: false,
              }),
              false,
              'createContext/success',
            )
            return newContext
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : 'Failed to create context'
            set(
              { error: message, loading: false },
              false,
              'createContext/error',
            )
            throw error
          }
        },

        /**
         * Update an existing context
         */
        updateContext: async (id, data) => {
          set({ loading: true, error: null }, false, 'updateContext/start')
          try {
            const updatedContext = await contextsApi.update(id, data)
            set(
              (state) => ({
                contexts: state.contexts.map((ctx) =>
                  ctx.id === id ? updatedContext : ctx,
                ),
                loading: false,
              }),
              false,
              'updateContext/success',
            )
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : 'Failed to update context'
            set(
              { error: message, loading: false },
              false,
              'updateContext/error',
            )
            throw error
          }
        },

        /**
         * Delete a context
         */
        deleteContext: async (id) => {
          // Validate ID before making API call
          if (!id) {
            const error = new Error('Invalid context ID: ID is required')
            set({ error: error.message }, false, 'deleteContext/error')
            throw error
          }

          set({ loading: true, error: null }, false, 'deleteContext/start')
          try {
            await contextsApi.delete(id)
            set(
              (state) => ({
                contexts: state.contexts.filter((ctx) => ctx.id !== id),
                selectedContextId:
                  state.selectedContextId === id
                    ? null
                    : state.selectedContextId,
                loading: false,
              }),
              false,
              'deleteContext/success',
            )
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : 'Failed to delete context'
            set(
              { error: message, loading: false },
              false,
              'deleteContext/error',
            )
            throw error
          }
        },

        /**
         * Select a context by ID
         */
        selectContext: (id) => {
          set({ selectedContextId: id }, false, 'selectContext')
        },

        /**
         * Clear the current error
         */
        clearError: () => {
          set({ error: null }, false, 'clearError')
        },

        /**
         * Get a context by ID
         */
        getContextById: (id) => {
          return get().contexts.find((ctx) => ctx.id === id)
        },

        /**
         * Get all contexts with a specific tag
         */
        getContextsByTag: (tag) => {
          return get().contexts.filter((ctx) => ctx.tags.includes(tag))
        },

        /**
         * Get context tree structure
         */
        getContextTree: () => {
          const contexts = get().contexts
          const byTag: Record<string, Array<Context>> = {}
          const tagCounts: Record<string, number> = {}

          contexts.forEach((context) => {
            context.tags.forEach((tag) => {
              if (!byTag[tag]) {
                byTag[tag] = []
              }
              byTag[tag].push(context)
              tagCounts[tag] = (tagCounts[tag] || 0) + 1
            })
          })

          return {
            root: contexts,
            byTag,
            tagCounts,
          }
        },
      }),
      { name: 'ContextStore' }, // Devtools name
    ),
  )

export const useContextStore = createContextStore()

/**
 * Selectors for efficient state access
 */
export const selectContexts = (state: ContextState) => state.contexts
export const selectLoading = (state: ContextState) => state.loading
export const selectError = (state: ContextState) => state.error
export const selectSelectedContextId = (state: ContextState) =>
  state.selectedContextId
export const selectSelectedContext = (state: ContextState) =>
  state.selectedContextId ? state.getContextById(state.selectedContextId) : null
export const selectContextsByTag = (tag: string) => (state: ContextState) =>
  state.getContextsByTag(tag)
export const selectContextTree = (state: ContextState) => state.getContextTree()
