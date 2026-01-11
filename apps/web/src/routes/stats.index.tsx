import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  BarChart3Icon,
  TrendingUpIcon,
  DatabaseIcon,
  SearchIcon,
  BrainIcon,
  FileCodeIcon,
  RefreshCwIcon,
  CheckCircle2Icon,
  XCircleIcon,
  AlertCircleIcon,
} from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNexusStore } from '@/stores/nexusStore'
import { logger } from '@/lib/logger'

export const Route = createFileRoute('/stats/')({
  component: StatsPage,
})

function StatsPage() {
  const { stats, isConnected, fetchStats, lastError, clearError } = useNexusStore()
  const [isLoading, setIsLoading] = useState(false)

  const handleRefresh = async () => {
    clearError()
    logger.info('Refreshing stats', {}, 'Stats')
    setIsLoading(true)
    try {
      await fetchStats(true)  // Force refresh, bypass cache
    } finally {
      setIsLoading(false)
    }
  }

  const getEngineStatus = (engine: string | null) => {
    if (!engine || engine === 'not configured') {
      return { status: 'warning', icon: AlertCircleIcon, text: 'Not configured', color: 'text-yellow-500' }
    }
    return { status: 'success', icon: CheckCircle2Icon, text: engine, color: 'text-green-500' }
  }

  const keywordEngine = getEngineStatus(stats?.engines?.keyword || null)
  const semanticEngine = getEngineStatus(stats?.engines?.semantic || null)

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Indexation & Statistics</h1>
            <p className="text-muted-foreground">
              Track your codebase indexing and search engines status
            </p>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Connection Status */}
        {!isConnected && (
          <Card className="border-yellow-500 bg-yellow-500/10">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertCircleIcon className="h-5 w-5 text-yellow-500" />
                <div>
                  <CardTitle className="text-sm">API Not Connected</CardTitle>
                  <CardDescription className="text-sm">
                    Configure your API URL in settings to see real-time statistics
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Error Display */}
        {lastError && (
          <Card className="border-red-500 bg-red-500/10">
            <CardHeader>
              <div className="flex items-center gap-3">
                <XCircleIcon className="h-5 w-5 text-red-500" />
                <div>
                  <CardTitle className="text-sm">Error Loading Stats</CardTitle>
                  <CardDescription className="text-sm">{lastError}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Main Metrics */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Files Metric */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Indexed Files</CardTitle>
              <FileCodeIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.files?.toLocaleString() || '-'}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Source files indexed
              </p>
            </CardContent>
          </Card>

          {/* Chunks Metric */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Code Chunks</CardTitle>
              <DatabaseIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.chunks?.toLocaleString() || '-'}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Searchable blocks (80 lines each)
              </p>
            </CardContent>
          </Card>

          {/* Embeddings Metric */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Embeddings</CardTitle>
              <BrainIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.embeddings?.toLocaleString() || '-'}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Semantic search vectors
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search Engines Status */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <SearchIcon className="h-5 w-5" />
            Search Engines
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Keyword Search */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Keyword Search</CardTitle>
                    <CardDescription>FTS5 full-text search with BM25 ranking</CardDescription>
                  </div>
                  <keywordEngine.icon className={`h-6 w-6 ${keywordEngine.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`font-medium ${keywordEngine.color}`}>
                    {keywordEngine.text}
                  </span>
                  {keywordEngine.status === 'success' && (
                    <CheckCircle2Icon className="h-4 w-4 text-green-500" />
                  )}
                  {keywordEngine.status === 'warning' && (
                    <AlertCircleIcon className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Supports regex, glob filters, and context-aware search
                </p>
              </CardContent>
            </Card>

            {/* Semantic Search */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Semantic Search</CardTitle>
                    <CardDescription>Vector embeddings with cosine similarity</CardDescription>
                  </div>
                  <semanticEngine.icon className={`h-6 w-6 ${semanticEngine.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`font-medium ${semanticEngine.color}`}>
                    {semanticEngine.text}
                  </span>
                  {semanticEngine.status === 'success' && (
                    <CheckCircle2Icon className="h-4 w-4 text-green-500" />
                  )}
                  {semanticEngine.status === 'warning' && (
                    <AlertCircleIcon className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Requires MISTRAL_API_KEY or OPENAI_API_KEY in .env
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Indexing Commands */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DatabaseIcon className="h-5 w-5" />
              Index Your Codebase
            </CardTitle>
            <CardDescription>
              Use the Python indexer to scan and index your project files
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Command Example */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Index current directory:</div>
              <div className="bg-muted rounded-md p-3 font-mono text-sm">
                <code>python3 packages/indexer-py/main.py index .</code>
              </div>
            </div>

            {/* More Commands */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <div className="text-sm font-medium">Check status:</div>
                <div className="bg-muted rounded-md p-2 font-mono text-xs">
                  <code>python3 packages/indexer-py/main.py status</code>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">Clear index:</div>
                <div className="bg-muted rounded-md p-2 font-mono text-xs">
                  <code>python3 packages/indexer-py/main.py clear</code>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500 rounded-md p-3">
              <div className="flex items-start gap-2">
                <AlertCircleIcon className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-500 dark:text-blue-400">
                  <span className="font-medium">Indexing happens offline</span> - The Python indexer scans your
                  codebase and stores results in SQLite. The API then uses this index for fast search.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features Overview */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Indexing Features</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <FileCodeIcon className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-base">60+ Languages</CardTitle>
                <CardDescription>
                  TypeScript, Python, Rust, Go, Java, and many more
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <TrendingUpIcon className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-base">Smart Chunking</CardTitle>
                <CardDescription>
                  80-line blocks with overlap for better context
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <BarChart3Icon className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-base">Symbol Extraction</CardTitle>
                <CardDescription>
                  Functions, classes, and interfaces detection
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
