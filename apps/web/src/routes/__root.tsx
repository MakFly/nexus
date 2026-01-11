import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { useState } from 'react'
import { DebugPanel, DebugToggle } from '@/components/debug-panel'
import { useNexusStore } from '@/stores/nexusStore'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  loader: async () => {
    // Get store instance (not using hook in loader)
    const { checkConnection, fetchStats } = useNexusStore.getState()

    // Check connection and fetch stats once for all routes
    const connected = await checkConnection()
    if (connected) {
      await fetchStats()
    }

    return { connected }
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Dashboard — Context Manager',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
  component: RootComponent,
  notFoundComponent: NotFound,
})

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">Page not found</p>
    </div>
  )
}

function RootComponent() {
  return <Outlet />
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const [showDebug, setShowDebug] = useState(false)

  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
        {/* Script pour éviter le flash de thème au chargement */}
        <script src="/theme-init.js" />
      </head>
      <body>
        {children}
        <Toaster position="bottom-right" richColors />
        <Scripts />
        {/* Debug Panel - only in development */}
        {import.meta.env.DEV && (
          <>
            {showDebug && <DebugPanel onClose={() => setShowDebug(false)} />}
            <DebugToggle onClick={() => setShowDebug(!showDebug)} isVisible={showDebug} />
          </>
        )}
      </body>
    </html>
  )
}
