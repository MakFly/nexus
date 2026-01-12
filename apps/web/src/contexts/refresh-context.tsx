import * as React from 'react'

interface RefreshContextValue {
  /** Trigger registered by the current page */
  triggerRefresh: () => void
  /** Register a refresh callback from a page */
  registerRefresh: (callback: () => void | Promise<void>) => void
  /** Unregister on unmount */
  unregisterRefresh: () => void
  /** Is currently refreshing */
  isRefreshing: boolean
  /** Set refreshing state */
  setIsRefreshing: (value: boolean) => void
}

const RefreshContext = React.createContext<RefreshContextValue | null>(null)

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const refreshCallbackRef = React.useRef<(() => void | Promise<void>) | null>(null)

  const registerRefresh = React.useCallback((callback: () => void | Promise<void>) => {
    refreshCallbackRef.current = callback
  }, [])

  const unregisterRefresh = React.useCallback(() => {
    refreshCallbackRef.current = null
  }, [])

  const triggerRefresh = React.useCallback(async () => {
    if (refreshCallbackRef.current) {
      setIsRefreshing(true)
      try {
        await refreshCallbackRef.current()
      } finally {
        setIsRefreshing(false)
      }
    } else {
      // Fallback: reload page if no callback registered
      window.location.reload()
    }
  }, [])

  return (
    <RefreshContext.Provider
      value={{
        triggerRefresh,
        registerRefresh,
        unregisterRefresh,
        isRefreshing,
        setIsRefreshing,
      }}
    >
      {children}
    </RefreshContext.Provider>
  )
}

export function useRefresh() {
  const context = React.useContext(RefreshContext)
  if (!context) {
    throw new Error('useRefresh must be used within RefreshProvider')
  }
  return context
}

/**
 * Hook to register a refresh callback for the current page
 * Call this in your page component with your data fetching function
 */
export function usePageRefresh(refreshFn: () => void | Promise<void>) {
  const { registerRefresh, unregisterRefresh } = useRefresh()

  React.useEffect(() => {
    registerRefresh(refreshFn)
    return () => unregisterRefresh()
  }, [refreshFn, registerRefresh, unregisterRefresh])
}
