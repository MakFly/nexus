/**
 * Central export point for all Zustand stores
 * Provides convenient imports for store hooks and selectors
 */

// UI store (local UI state)
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

// Settings store (local preferences)
export { useSettingsStore } from './settings'
