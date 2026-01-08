/**
 * Memory Store - Manages memory state and operations
 * Handles CRUD operations for memories with filtering and organization
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Memory, MemoryFilters, MemoryType } from '@/types'
import { memoriesApi } from '@/lib/api'

/**
 * Memory store state interface
 */
interface MemoryState {
  // State
  memories: Array<Memory>
  loading: boolean
  error: string | null
  selectedMemoryId: string | null
  filters: MemoryFilters
  totalCount: number
  currentPage: number
  pageSize: number
  isFetching: boolean // Prevents duplicate concurrent fetches

  // Actions
  fetchMemories: (contextId?: string) => Promise<void>
  fetchPaginatedMemories: (
    page?: number,
    pageSize?: number,
    filters?: MemoryFilters,
  ) => Promise<void>
  addMemory: (
    data: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>,
  ) => Promise<Memory>
  updateMemory: (id: string, data: Partial<Memory>) => Promise<void>
  deleteMemory: (id: string) => Promise<void>
  bulkDeleteMemories: (ids: Array<string>) => Promise<void>
  selectMemory: (id: string | null) => void
  setFilter: (filters: Partial<MemoryFilters>) => void
  clearFilters: () => void
  clearError: () => void

  // Derived getters (computed values)
  getMemoriesByContext: (contextId: string) => Array<Memory>
  getMemoriesByType: (type: MemoryType) => Array<Memory>
  getFilteredMemories: () => Array<Memory>
  getMemoryById: (id: string) => Memory | undefined
}

/**
 * Create the memory store
 */
const createMemoryStore = () =>
  create<MemoryState>()(
    devtools(
      (set, get) => ({
        // Initial state
        memories: [],
        loading: true,
        error: null,
        selectedMemoryId: null,
        filters: {},
        totalCount: 0,
        currentPage: 1,
        pageSize: 20,
        isFetching: false,

        /**
         * Fetch all memories, optionally filtered by context
         * Prevents duplicate concurrent fetches with isFetching flag
         */
        fetchMemories: async (contextId?: string) => {
          // Prevent duplicate concurrent fetches
          if (get().isFetching) {
            return
          }

          set(
            { loading: true, error: null, isFetching: true },
            false,
            'fetchMemories/start',
          )
          try {
            const memories = await memoriesApi.getAll(
              contextId ? { contextId } : undefined,
            )
            set(
              {
                memories,
                loading: false,
                totalCount: memories.length,
                isFetching: false,
              },
              false,
              'fetchMemories/success',
            )
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : 'Failed to fetch memories'
            set(
              { error: message, loading: false, isFetching: false },
              false,
              'fetchMemories/error',
            )
          }
        },

        /**
         * Fetch paginated memories with filters
         */
        fetchPaginatedMemories: async (page = 1, pageSize = 20, filters?) => {
          set(
            { loading: true, error: null },
            false,
            'fetchPaginatedMemories/start',
          )
          try {
            const response = await memoriesApi.getPaginated(page, pageSize, {
              ...get().filters,
              ...filters,
            })
            set(
              {
                memories: response.items,
                totalCount: response.total,
                currentPage: response.page,
                pageSize: response.pageSize,
                loading: false,
              },
              false,
              'fetchPaginatedMemories/success',
            )
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : 'Failed to fetch memories'
            set(
              { error: message, loading: false },
              false,
              'fetchPaginatedMemories/error',
            )
          }
        },

        /**
         * Add a new memory
         */
        addMemory: async (data) => {
          set({ loading: true, error: null }, false, 'addMemory/start')
          try {
            const newMemory = await memoriesApi.create(data)
            set(
              (state) => ({
                memories: [newMemory, ...state.memories],
                totalCount: state.totalCount + 1,
                loading: false,
              }),
              false,
              'addMemory/success',
            )
            return newMemory
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Failed to add memory'
            set({ error: message, loading: false }, false, 'addMemory/error')
            throw error
          }
        },

        /**
         * Update an existing memory
         */
        updateMemory: async (id, data) => {
          set({ loading: true, error: null }, false, 'updateMemory/start')
          try {
            const updatedMemory = await memoriesApi.update(id, data)
            set(
              (state) => ({
                memories: state.memories.map((mem) =>
                  mem.id === id ? updatedMemory : mem,
                ),
                loading: false,
              }),
              false,
              'updateMemory/success',
            )
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Failed to update memory'
            set({ error: message, loading: false }, false, 'updateMemory/error')
            throw error
          }
        },

        /**
         * Delete a memory
         */
        deleteMemory: async (id) => {
          set({ loading: true, error: null }, false, 'deleteMemory/start')
          try {
            await memoriesApi.delete(id)
            set(
              (state) => ({
                memories: state.memories.filter((mem) => mem.id !== id),
                selectedMemoryId:
                  state.selectedMemoryId === id ? null : state.selectedMemoryId,
                totalCount: state.totalCount - 1,
                loading: false,
              }),
              false,
              'deleteMemory/success',
            )
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Failed to delete memory'
            set({ error: message, loading: false }, false, 'deleteMemory/error')
            throw error
          }
        },

        /**
         * Bulk delete memories
         */
        bulkDeleteMemories: async (ids) => {
          set({ loading: true, error: null }, false, 'bulkDeleteMemories/start')
          try {
            await memoriesApi.bulkDelete(ids)
            set(
              (state) => ({
                memories: state.memories.filter((mem) => !ids.includes(mem.id)),
                selectedMemoryId: ids.includes(state.selectedMemoryId || '')
                  ? null
                  : state.selectedMemoryId,
                totalCount: state.totalCount - ids.length,
                loading: false,
              }),
              false,
              'bulkDeleteMemories/success',
            )
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : 'Failed to delete memories'
            set(
              { error: message, loading: false },
              false,
              'bulkDeleteMemories/error',
            )
            throw error
          }
        },

        /**
         * Select a memory by ID
         */
        selectMemory: (id) => {
          set({ selectedMemoryId: id }, false, 'selectMemory')
        },

        /**
         * Set filters for memories
         */
        setFilter: (newFilters) => {
          set(
            (state) => ({
              filters: { ...state.filters, ...newFilters },
              currentPage: 1, // Reset to first page when filters change
            }),
            false,
            'setFilter',
          )
        },

        /**
         * Clear all filters
         */
        clearFilters: () => {
          set({ filters: {}, currentPage: 1 }, false, 'clearFilters')
        },

        /**
         * Clear the current error
         */
        clearError: () => {
          set({ error: null }, false, 'clearError')
        },

        /**
         * Get memories by context ID
         */
        getMemoriesByContext: (contextId) => {
          return get().memories.filter((mem) => mem.contextId === contextId)
        },

        /**
         * Get memories by type
         */
        getMemoriesByType: (type) => {
          return get().memories.filter((mem) => mem.type === type)
        },

        /**
         * Get filtered memories based on current filters
         */
        getFilteredMemories: () => {
          const { memories, filters } = get()
          return memories.filter((memory) => {
            // Filter by context
            if (filters.contextId && memory.contextId !== filters.contextId) {
              return false
            }

            // Filter by type
            if (filters.type && memory.type !== filters.type) {
              return false
            }

            // Filter by tags
            if (filters.tags && filters.tags.length > 0) {
              const hasTag = filters.tags.some((tag) =>
                memory.tags.includes(tag),
              )
              if (!hasTag) return false
            }

            // Filter by search query
            if (filters.searchQuery) {
              const query = filters.searchQuery.toLowerCase()
              const matchesTitle = memory.title.toLowerCase().includes(query)
              const matchesContent = memory.content
                .toLowerCase()
                .includes(query)
              if (!matchesTitle && !matchesContent) {
                return false
              }
            }

            // Filter by date range
            if (filters.dateFrom) {
              const memoryDate = new Date(memory.createdAt)
              const fromDate = new Date(filters.dateFrom)
              if (memoryDate < fromDate) return false
            }

            if (filters.dateTo) {
              const memoryDate = new Date(memory.createdAt)
              const toDate = new Date(filters.dateTo)
              if (memoryDate > toDate) return false
            }

            return true
          })
        },

        /**
         * Get a memory by ID
         */
        getMemoryById: (id) => {
          return get().memories.find((mem) => mem.id === id)
        },
      }),
      { name: 'MemoryStore' }, // Devtools name
    ),
  )

export const useMemoryStore = createMemoryStore()

/**
 * Selectors for efficient state access
 */
export const selectMemories = (state: MemoryState) => state.memories
export const selectLoadingMemories = (state: MemoryState) => state.loading
export const selectMemoryError = (state: MemoryState) => state.error
export const selectSelectedMemoryId = (state: MemoryState) =>
  state.selectedMemoryId
export const selectSelectedMemory = (state: MemoryState) =>
  state.selectedMemoryId ? state.getMemoryById(state.selectedMemoryId) : null
export const selectMemoryFilters = (state: MemoryState) => state.filters
export const selectFilteredMemories = (state: MemoryState) =>
  state.getFilteredMemories()
export const selectMemoriesByContext =
  (contextId: string) => (state: MemoryState) =>
    state.getMemoriesByContext(contextId)
export const selectMemoriesByType =
  (type: MemoryType) => (state: MemoryState) =>
    state.getMemoriesByType(type)
export const selectTotalMemoryCount = (state: MemoryState) => state.totalCount
export const selectCurrentPage = (state: MemoryState) => state.currentPage
export const selectPageSize = (state: MemoryState) => state.pageSize
