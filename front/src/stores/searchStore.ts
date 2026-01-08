/**
 * Search Store - Manages search state and operations
 * Handles search queries, results, and filters with debouncing
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { SearchFilters, SearchFirstResponse } from '@/types'
import { searchApi } from '@/lib/api'

/**
 * Search store state interface
 */
interface SearchState {
  // State
  query: string
  searchResponse: SearchFirstResponse | null
  results: Array<SearchFirstResponse['results'][0]> // Flattened results
  loading: boolean
  error: string | null
  filters: SearchFilters
  hasSearched: boolean
  recentSearches: Array<{ query: string; timestamp: string }>
  searchHistory: Array<string>

  // Actions
  setSearchQuery: (query: string) => void
  executeSearch: (query?: string, filters?: SearchFilters) => Promise<void>
  clearSearch: () => void
  setFilters: (filters: Partial<SearchFilters>) => void
  clearFilters: () => void
  fetchRecentSearches: () => Promise<void>
  addToHistory: (query: string) => void
  clearError: () => void

  // Derived getters (computed values)
  hasResults: () => boolean
  getResultCount: () => number
  getTotalTokens: () => number
  getAvgTokensPerResult: () => number
}

/**
 * Debounce utility for search queries
 */
function debounce<T extends (...args: Array<unknown>) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Create the search store
 */
export const useSearchStore = create<SearchState>()(
  devtools(
    (set, get) => {
      // Create debounced search function
      const debouncedSearch = debounce(
        async (query: string, filters?: SearchFilters) => {
          if (!query.trim()) {
            set(
              {
                results: [],
                searchResponse: null,
                hasSearched: false,
                loading: false,
              },
              false,
              'search/cleared',
            )
            return
          }

          try {
            const response = await searchApi.searchFirst(query, filters)
            set(
              {
                searchResponse: response,
                results: response.results,
                loading: false,
                hasSearched: true,
                recentSearches: [
                  { query, timestamp: new Date().toISOString() },
                  ...get()
                    .recentSearches.filter((s) => s.query !== query)
                    .slice(0, 9),
                ],
              },
              false,
              'search/success',
            )
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Search failed'
            set({ error: message, loading: false }, false, 'search/error')
          }
        },
        300,
      )

      return {
        // Initial state
        query: '',
        searchResponse: null,
        results: [],
        loading: false,
        error: null,
        filters: {},
        hasSearched: false,
        recentSearches: [],
        searchHistory: [],

        /**
         * Set the search query (triggers debounced search)
         */
        setSearchQuery: (query) => {
          set({ query, loading: true, error: null }, false, 'setQuery')
          if (query.trim()) {
            debouncedSearch(query, get().filters)
          } else {
            set(
              {
                results: [],
                searchResponse: null,
                hasSearched: false,
                loading: false,
              },
              false,
              'clearResults',
            )
          }
        },

        /**
         * Execute search immediately (no debounce)
         */
        executeSearch: async (query?, filters?) => {
          const searchQuery = query ?? get().query
          const searchFilters = filters ?? get().filters

          if (!searchQuery.trim()) {
            set(
              { results: [], searchResponse: null, hasSearched: false },
              false,
              'executeSearch/empty',
            )
            return
          }

          set(
            {
              query: searchQuery,
              filters: searchFilters,
              loading: true,
              error: null,
            },
            false,
            'executeSearch/start',
          )

          try {
            const response = await searchApi.searchFirst(
              searchQuery,
              searchFilters,
            )
            set(
              {
                searchResponse: response,
                results: response.results,
                loading: false,
                hasSearched: true,
                recentSearches: [
                  { query: searchQuery, timestamp: new Date().toISOString() },
                  ...get()
                    .recentSearches.filter((s) => s.query !== searchQuery)
                    .slice(0, 9),
                ],
              },
              false,
              'executeSearch/success',
            )
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Search failed'
            set(
              { error: message, loading: false },
              false,
              'executeSearch/error',
            )
          }
        },

        /**
         * Clear search state
         */
        clearSearch: () => {
          set(
            {
              query: '',
              results: [],
              searchResponse: null,
              hasSearched: false,
              error: null,
              loading: false,
            },
            false,
            'clearSearch',
          )
        },

        /**
         * Set search filters
         */
        setFilters: (newFilters) => {
          set(
            (state) => ({
              filters: { ...state.filters, ...newFilters },
            }),
            false,
            'setFilters',
          )

          // Re-execute search with new filters if there's a query
          const query = get().query
          if (query.trim()) {
            get().executeSearch(query, { ...get().filters, ...newFilters })
          }
        },

        /**
         * Clear all filters
         */
        clearFilters: () => {
          set({ filters: {} }, false, 'clearFilters')

          // Re-execute search without filters if there's a query
          const query = get().query
          if (query.trim()) {
            get().executeSearch(query, {})
          }
        },

        /**
         * Fetch recent searches from API
         */
        fetchRecentSearches: async () => {
          try {
            const recent = await searchApi.recent(10)
            set(
              {
                recentSearches: recent,
                searchHistory: recent.map((r) => r.query),
              },
              false,
              'fetchRecent',
            )
          } catch (error) {
            console.error('Failed to fetch recent searches:', error)
          }
        },

        /**
         * Add a query to search history
         */
        addToHistory: (query) => {
          set(
            (state) => ({
              searchHistory: [
                query,
                ...state.searchHistory.filter((q) => q !== query),
              ].slice(0, 20),
            }),
            false,
            'addToHistory',
          )
        },

        /**
         * Clear the current error
         */
        clearError: () => {
          set({ error: null }, false, 'clearError')
        },

        /**
         * Check if there are any results
         */
        hasResults: () => {
          return get().results.length > 0
        },

        /**
         * Get the total number of results
         */
        getResultCount: () => {
          return get().results.length
        },

        /**
         * Get total tokens used for this search
         */
        getTotalTokens: () => {
          return get().searchResponse?.totalTokens || 0
        },

        /**
         * Get average tokens per result
         */
        getAvgTokensPerResult: () => {
          return get().searchResponse?.avgTokensPerResult || 0
        },
      }
    },
    { name: 'SearchStore' }, // Devtools name
  ),
)

/**
 * Selectors for efficient state access
 */
export const selectSearchQuery = (state: SearchState) => state.query
export const selectSearchResults = (state: SearchState) => state.results
export const selectSearchLoading = (state: SearchState) => state.loading
export const selectSearchError = (state: SearchState) => state.error
export const selectSearchFilters = (state: SearchState) => state.filters
export const selectHasSearched = (state: SearchState) => state.hasSearched
export const selectRecentSearches = (state: SearchState) => state.recentSearches
export const selectSearchHistory = (state: SearchState) => state.searchHistory
export const selectHasResults = (state: SearchState) => state.hasResults()
export const selectResultCount = (state: SearchState) => state.getResultCount()
export const selectTotalTokens = (state: SearchState) => state.getTotalTokens()
export const selectAvgTokensPerResult = (state: SearchState) =>
  state.getAvgTokensPerResult()
export const selectSearchResponse = (state: SearchState) => state.searchResponse
