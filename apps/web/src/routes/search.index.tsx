import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useNexusStore, type NexusSearchResult } from '@/stores/nexusStore'
import {
  SearchIcon,
  XIcon,
  CodeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ServerOffIcon,
} from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/search/')({
  component: SearchPage,
})

function SearchPage() {
  const {
    isConnected,
    stats,
    search,
    clearError,
    lastError,
  } = useNexusStore()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NexusSearchResult | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [searching, setSearching] = useState(false)

  const handleSearch = async () => {
    if (!query.trim() || !isConnected) return
    setSearching(true)
    try {
      const searchResults = await search({ query, mode: 'keyword', k: 12 })
      setResults(searchResults)
      setHasSearched(true)
    } catch (e) {
      console.error('Search failed:', e)
    } finally {
      setSearching(false)
    }
  }

  const handleClear = () => {
    setQuery('')
    setResults(null)
    setHasSearched(false)
  }

  if (!isConnected) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <ServerOffIcon className="h-10 w-10 text-destructive" />
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">API Server Not Running</h1>
            <p className="text-muted-foreground max-w-md">
              Start the Nexus API server to search your codebase.
            </p>
          </div>
          <code className="bg-muted px-4 py-2 rounded text-sm font-mono">
            cd apps/api && bun src/index.ts
          </code>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry Connection
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Search</h2>
            <p className="text-muted-foreground">Search code with Nexus FTS5</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <CheckCircleIcon className="h-3 w-3 text-green-500" />
              Connected
            </Badge>
            {stats && (
              <span className="text-sm text-muted-foreground">
                {stats.files} files
              </span>
            )}
          </div>
        </div>

        {/* Search Input */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search code..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleSearch} disabled={!query.trim() || searching}>
                <SearchIcon className="mr-2 h-4 w-4" />
                {searching ? 'Searching...' : 'Search'}
              </Button>
              {query && (
                <Button variant="ghost" onClick={handleClear}>
                  <XIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
            {lastError && (
              <div className="mt-3 text-sm text-destructive flex items-center gap-1">
                <XCircleIcon className="h-4 w-4" />
                {lastError}
                <Button variant="ghost" size="sm" className="h-6 px-2" onClick={clearError}>
                  Dismiss
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {!hasSearched ? (
          <Card>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <SearchIcon className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold">Ready to search</h3>
                <p className="text-muted-foreground">
                  Enter a query to search through your codebase
                </p>
              </div>
            </CardContent>
          </Card>
        ) : !results || results.hits.length === 0 ? (
          <Card>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <SearchIcon className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold">No results found</h3>
                <p className="text-muted-foreground">Try adjusting your query</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CodeIcon className="h-5 w-5" />
                Results ({results.hits.length})
                {results.totalCount > results.hits.length && (
                  <span className="text-sm font-normal text-muted-foreground">
                    of {results.totalCount} total
                  </span>
                )}
              </h3>
              <span className="text-sm text-muted-foreground">{results.duration}ms</span>
            </div>
            <div className="grid gap-3">
              {results.hits.map((hit, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <CodeIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <code className="text-sm font-mono text-primary">{hit.snippet}</code>
                          {hit.symbol && <Badge variant="outline" className="text-xs">{hit.symbol}</Badge>}
                          <span className="text-xs text-muted-foreground">{hit.startLine}:{hit.endLine}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">{hit.path}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
