/**
 * Central export point for all Zustand stores
 * Provides convenient imports for store hooks and selectors
 */

// Context store
export {
  useContextStore,
  selectContexts,
  selectLoading,
  selectError,
  selectSelectedContextId,
  selectSelectedContext,
  selectContextsByTag,
  selectContextTree,
} from './contextStore'

// Memory store
export {
  useMemoryStore,
  selectMemories,
  selectLoadingMemories,
  selectMemoryError,
  selectSelectedMemoryId,
  selectSelectedMemory,
  selectMemoryFilters,
  selectFilteredMemories,
  selectMemoriesByContext,
  selectMemoriesByType,
  selectTotalMemoryCount,
  selectCurrentPage,
  selectPageSize,
} from './memoryStore'

// Search store
export {
  useSearchStore,
  selectSearchQuery,
  selectSearchResults,
  selectSearchLoading,
  selectSearchError,
  selectSearchFilters,
  selectHasSearched,
  selectRecentSearches,
  selectSearchHistory,
  selectHasResults,
  selectResultCount,
  selectTotalTokens,
  selectAvgTokensPerResult,
  selectSearchResponse,
} from './searchStore'

// UI store
export {
  useUIStore,
  initializeTheme,
  selectSidebarOpen,
  selectSidebarCollapsed,
  selectTheme,
  selectViewMode,
  selectNotifications,
  selectModalOpen,
  selectActiveModal,
  selectHasNotifications,
  selectNotificationCount,
  selectNotificationsByType,
  useNotification,
} from './uiStore'
