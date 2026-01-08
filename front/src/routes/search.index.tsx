import { useEffect, useRef, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ClockIcon,
  FolderIcon,
  SaveIcon,
  SearchIcon,
  SparklesIcon,
  TagIcon,
  XIcon,
  ZapIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  HelpCircleIcon,
} from 'lucide-react'

import type { MemoryType, SearchMode, SearchFirstResult } from '@/types'
import { AppLayout } from '@/components/app-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useContextStore, useSearchStore, useMemoryStore } from '@/stores'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SearchAutocomplete, type SearchAutocompleteHandle } from "@/components/search-autocomplete"
export const Route = createFileRoute('/search/')({
  component: Search,
})

function Search() {
  const { contexts, fetchContexts } = useContextStore()
  const navigate = useNavigate()
  const {
    query,
    results,
    loading,
    error,
    filters,
    hasSearched,
    setSearchQuery,
    executeSearch,
    setFilters,
    clearSearch,
    getTotalTokens,
    getAvgTokensPerResult,
  } = useSearchStore()
  const { getMemoryById, memories, fetchMemories } = useMemoryStore()

  const searchInputRef = useRef<SearchAutocompleteHandle>(null)
  const [searchMode, setSearchMode] = useState<SearchMode>('compact')
  const [savedSearches, setSavedSearches] = useState<Array<any>>([])
  const [showSaveSearch, setShowSaveSearch] = useState(false)
  const [searchName, setSearchName] = useState('')
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  useEffect(() => {
    fetchContexts()


  useEffect(() => {
    setSelectedIndex(-1)
  }, [results, query])
    setSelectedIndex(-1)
  }, [results, query])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey
      const isInputFocused = document.activeElement instanceof HTMLInputElement
      const isTextAreaFocused = document.activeElement instanceof HTMLTextAreaElement

      if (!isCmdOrCtrl && e.key === '?') {
        e.preventDefault()
        setShowKeyboardHelp((prev) => !prev)
        return
      }

      if (!isCmdOrCtrl && e.key === 'Escape') {
        e.preventDefault()
        if (showKeyboardHelp) {
          setShowKeyboardHelp(false)
        } else if (showSaveSearch) {
          setShowSaveSearch(false)
        } else if (selectedResultId) {
          setSelectedResultId(null)
        } else if (isInputFocused || query) {
          clearFilters()
          searchInputRef.current?.blur()
        }
        return
      }

      if (isCmdOrCtrl && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
        return
      }

      if (isCmdOrCtrl && e.key === 'n') {
        e.preventDefault()
        navigate({ to: '/contexts/new' })
        return
      }

      if (isCmdOrCtrl && e.key === 'e') {
        e.preventDefault()
        if (results.length > 0) {
          const firstResult = results[0]
          navigate({ to: `/contexts/${firstResult.context.id}` })
        }
        return
      }

      if (!isInputFocused && !isTextAreaFocused && results.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : prev,
          )
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
          return
        }
        if (e.key === 'Enter') {
          e.preventDefault()
          if (selectedIndex >= 0) {
            const selectedResult = results[selectedIndex]
            navigate({ to: `/contexts/${selectedResult.context.id}` })
          } else if (results.length > 0) {
            navigate({ to: `/contexts/${results[0].context.id}` })
          }
          return
        }
      }

      if (isInputFocused && e.key === 'Enter') {
        e.preventDefault()
        handleSearch()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    results,
    selectedIndex,
    query,
    showKeyboardHelp,
    showSaveSearch,
    selectedResultId,
    navigate,
  ])

  const handleSearch = () => {
    setFilters({ mode: searchMode })
    executeSearch(query, { ...filters, mode: searchMode })
  }

  const handleSavedSearchClick = (savedSearch: any) => {
    setSearchQuery(savedSearch.query)
    setFilters({
      type: savedSearch.filters.type,
      contextId: savedSearch.filters.contextId,
      mode: savedSearch.filters.mode || 'compact',
    })
    executeSearch(savedSearch.query, savedSearch.filters)
  }

  const handleSaveSearch = () => {
    if (!searchName.trim()) return

    const newSavedSearch = {
      id: Math.random().toString(36).substring(2, 9),
      name: searchName.trim(),
      query,
      filters: { ...filters, mode: searchMode },
      createdAt: new Date(),
    }

    setSavedSearches([...savedSearches, newSavedSearch])
    setSearchName('')
    setShowSaveSearch(false)
  }

  const clearFilters = () => {
    setSearchQuery('')
    clearSearch()
    setSelectedResultId(null)
  }

  const deleteSavedSearch = (id: string) => {
    setSavedSearches(savedSearches.filter((s) => s.id !== id))
  }

  const highlightText = (text: string, query: string) => {
    if (!query) return text

    const regex = new RegExp(
      `(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
      'gi',
    )
    const parts = text.split(regex)

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark
          key={index}
          className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5"
        >
          {part}
        </mark>
      ) : (
        part
      ),
    )
  }

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  const getDatePeriod = (dateString: string): string => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const monthAgo = new Date(today)
    monthAgo.setMonth(monthAgo.getMonth() - 1)

    const dateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const dateOnlyDate = dateOnly(date)
    const dateOnlyToday = dateOnly(today)
    const dateOnlyYesterday = dateOnly(yesterday)

    if (dateOnlyDate.getTime() === dateOnlyToday.getTime()) {
      return 'Today'
    } else if (dateOnlyDate.getTime() === dateOnlyYesterday.getTime()) {
      return 'Yesterday'
    } else if (date >= weekAgo) {
      return 'This Week'
    } else if (date >= monthAgo) {
      return 'This Month'
    } else {
      return 'Older'
    }
  }

  const groupResultsByDateAndType = (
    results: Array<SearchFirstResult>
  ): Record<string, Record<string, Array<SearchFirstResult>>> => {
    const grouped: Record<string, Record<string, Array<SearchFirstResult>>> = {}

    for (const result of results) {
      const period = getDatePeriod(result.memory.createdAt)
      const type = result.memory.type

      if (!grouped[period]) {
        grouped[period] = {}
      }

      if (!grouped[period][type]) {
        grouped[period][type] = []
      }

      grouped[period][type].push(result)
    }

    return grouped
  }

  const activeFiltersCount =
    (query ? 1 : 0) +
    (filters.type ? 1 : 0) +
    (filters.contextId ? 1 : 0)

  const selectedResult = selectedResultId
    ? results.find((r) => r.memory.id === selectedResultId)
    : null
  const selectedMemory = selectedResultId
    ? getMemoryById(selectedResultId)
    : null

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Search</h2>
              <p className="text-muted-foreground">
                Find memories and contexts with powerful search
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowKeyboardHelp(true)}
              title="Keyboard shortcuts (?)"
            >
              <HelpCircleIcon className="size-4" />
            </Button>
          </div>
        </div>

        {/* Search Input */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <SearchIcon className="size-5" />
              Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <SearchAutocomplete
                ref={searchInputRef}
                value={query}
                onChange={setSearchQuery}
                onSearch={handleSearch}
                contexts={contexts}
                memories={memories}
                placeholder="Search in memories... (try type:, context:, or tag:)"
                className="flex-1"
              />
              <Select value={searchMode} onValueChange={(value: SearchMode) => setSearchMode(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact (60t)</SelectItem>
                  <SelectItem value="standard">Standard (120t)</SelectItem>
                  <SelectItem value="detailed">Detailed (250t)</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSearch} disabled={loading}>
                <SparklesIcon className="mr-2 size-4" />
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>

            {/* Token Stats - Show after search */}
            {hasSearched && results.length > 0 && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-1.5">
                  <ZapIcon className="size-4" />
                  <span>{getTotalTokens()} total tokens</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>•</span>
                  <span>{getAvgTokensPerResult()} avg/result</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>•</span>
                  <span>{results.length} results</span>
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                  <Badge variant="outline" className="capitalize">
                    {searchMode}
                  </Badge>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filters</h4>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear all ({activeFiltersCount})
                  </Button>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Type Filter */}
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={filters.type || 'all'}
                    onValueChange={(value: MemoryType | 'all') =>
                      setFilters({
                        type: value === 'all' ? undefined : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="note">Note</SelectItem>
                      <SelectItem value="conversation">Conversation</SelectItem>
                      <SelectItem value="snippet">Snippet</SelectItem>
                      <SelectItem value="reference">Reference</SelectItem>
                      <SelectItem value="task">Task</SelectItem>
                      <SelectItem value="idea">Idea</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Context Filter */}
                <div className="space-y-2">
                  <Label>Context</Label>
                  <Select
                    value={filters.contextId || 'all'}
                    onValueChange={(value) =>
                      setFilters({
                        contextId: value === 'all' ? undefined : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Contexts</SelectItem>
                      {contexts.map((context) => (
                        <SelectItem key={context.id} value={context.id}>
                          {context.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Save Search */}
            <div className="flex justify-end pt-4 border-t">
              <Dialog open={showSaveSearch} onOpenChange={setShowSaveSearch}>
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={activeFiltersCount === 0}>
                    <SaveIcon className="mr-2 size-4" />
                    Save Search
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Save Search</DialogTitle>
                    <DialogDescription>
                      Save this search for quick access later
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="search-name">Search Name</Label>
                      <Input
                        id="search-name"
                        placeholder="e.g., Recent code snippets"
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 text-sm">
                      <Label>Current Filters:</Label>
                      <div className="space-y-1 text-muted-foreground">
                        {query && <div>Query: "{query}"</div>}
                        {filters.type && <div>Type: {filters.type}</div>}
                        {filters.contextId && (
                          <div>
                            Context:{' '}
                            {
                              contexts.find((c) => c.id === filters.contextId)
                                ?.name
                            }
                          </div>
                        )}
                        <div>Mode: {searchMode}</div>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowSaveSearch(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveSearch}
                      disabled={!searchName.trim()}
                    >
                      Save Search
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Saved Searches */}
        {savedSearches.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Saved Searches</CardTitle>
              <CardDescription>
                Quick access to your frequently used searches
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {savedSearches.map((savedSearch) => (
                  <div
                    key={savedSearch.id}
                    className="group flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleSavedSearchClick(savedSearch)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{savedSearch.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {savedSearch.query || 'No query'}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteSavedSearch(savedSearch.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XIcon className="size-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results - Split View */}
        {hasSearched && results.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Results List (40%) */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">
                  Results ({results.length})
                </CardTitle>
                <CardDescription>
                  Click a result to preview full details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-2">
                    {results.map((result) => {
                      const { memory, context, score, tokens } = result
                      const isSelected = selectedResultId === memory.id

                      return (
                        <div
                          key={memory.id}
                          className={cn(
                            'group rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer',
                            isSelected && 'bg-muted border-primary'
                          )}
                          onClick={() => setSelectedResultId(memory.id)}
                        >
                          <div className="flex items-start gap-3">
                            <ChevronRightIcon className="size-4 mt-1 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Badge variant="outline" className="capitalize text-xs">
                                  {memory.type}
                                </Badge>
                                {context && (
                                  <Badge variant="secondary" className="text-xs">
                                    <FolderIcon className="size-3 mr-1" />
                                    {context.name}
                                  </Badge>
                                )}
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <ClockIcon className="size-3" />
                                  {new Date(memory.createdAt).toLocaleDateString()}
                                </div>
                                {score > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {Math.round(score * 100)}%
                                  </Badge>
                                )}
                              </div>

                              <h4 className="font-medium text-sm mb-1 truncate">{memory.title}</h4>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {highlightText(memory.excerpt, query)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Preview Panel (60%) */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Preview</CardTitle>
                    <CardDescription>
                      {selectedResult ? 'Full memory details' : 'Select a result to preview'}
                    </CardDescription>
                  </div>
                  {selectedResult && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedResultId(null)}
                    >
                      <XIcon className="mr-2 size-4" />
                      Close
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!selectedResult ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <SearchIcon className="mb-4 size-12 text-muted-foreground/50" />
                    <h3 className="text-lg font-semibold">No selection</h3>
                    <p className="text-muted-foreground">
                      Click on a result to view full details
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-6">
                      {/* Title and Type */}
                      <div>
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <Badge variant="outline" className="capitalize">
                            {selectedResult.memory.type}
                          </Badge>
                          {selectedResult.context && (
                            <Badge variant="secondary" asChild>
                              <Link
                                to={`/contexts/${selectedResult.context.id}`}
                                className="hover:bg-secondary/80"
                              >
                                <FolderIcon className="size-3 mr-1" />
                                {selectedResult.context.name}
                              </Link>
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-2xl font-bold">{selectedResult.memory.title}</h3>
                      </div>

                      {/* Metadata */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-muted-foreground">Created</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <ClockIcon className="size-4 text-muted-foreground" />
                            <span>{new Date(selectedResult.memory.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                        {selectedMemory?.updatedAt && (
                          <div>
                            <Label className="text-muted-foreground">Updated</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <ClockIcon className="size-4 text-muted-foreground" />
                              <span>{new Date(selectedMemory.updatedAt).toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                        <div>
                          <Label className="text-muted-foreground">Tokens</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <ZapIcon className="size-4 text-muted-foreground" />
                            <span>{selectedResult.tokens}</span>
                          </div>
                        </div>
                        {selectedResult.score > 0 && (
                          <div>
                            <Label className="text-muted-foreground">Relevance</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">
                                {Math.round(selectedResult.score * 100)}% match
                              </Badge>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      {selectedMemory?.tags && selectedMemory.tags.length > 0 && (
                        <div>
                          <Label className="text-muted-foreground mb-2 block">Tags</Label>
                          <div className="flex flex-wrap gap-2">
                            {selectedMemory.tags.map((tag) => (
                              <Badge key={tag} variant="secondary">
                                <TagIcon className="size-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Full Content */}
                      <div>
                        <Label className="text-muted-foreground mb-2 block">Content</Label>
                        <div className="rounded-lg border p-4 bg-muted/30">
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {highlightText(selectedMemory?.content || selectedResult.memory.excerpt, query)}
                          </p>
                        </div>
                      </div>

                      {/* Metadata */}
                      {selectedMemory?.metadata && Object.keys(selectedMemory.metadata).length > 0 && (
                        <div>
                          <Label className="text-muted-foreground mb-2 block">Metadata</Label>
                          <div className="rounded-lg border p-4 bg-muted/30">
                            <pre className="text-xs overflow-x-auto">
                              {JSON.stringify(selectedMemory.metadata, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty States */}
        {!hasSearched && (
          <Card>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <SearchIcon className="mb-4 size-12 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold">Ready to search</h3>
                <p className="text-muted-foreground">
                  Enter a query above to search through your memories
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {hasSearched && results.length === 0 && (
          <Card>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <SearchIcon className="mb-4 size-12 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold">No results found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filters
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mobile Modal for Preview */}
        {isMobile && selectedResult && (
          <Dialog open={!!selectedResult} onOpenChange={() => setSelectedResultId(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedResult.memory.title}</DialogTitle>
                <DialogDescription>
                  <Badge variant="outline" className="capitalize mt-2">
                    {selectedResult.memory.type}
                  </Badge>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Created</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <ClockIcon className="size-4 text-muted-foreground" />
                      <span>{new Date(selectedResult.memory.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  {selectedMemory?.updatedAt && (
                    <div>
                      <Label className="text-muted-foreground">Updated</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <ClockIcon className="size-4 text-muted-foreground" />
                        <span>{new Date(selectedMemory.updatedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {selectedMemory?.tags && selectedMemory.tags.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground mb-2 block">Tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedMemory.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          <TagIcon className="size-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Full Content */}
                <div>
                  <Label className="text-muted-foreground mb-2 block">Content</Label>
                  <div className="rounded-lg border p-4 bg-muted/30">
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {highlightText(selectedMemory?.content || selectedResult.memory.excerpt, query)}
                    </p>
                  </div>
                </div>

                {/* Metadata */}
                {selectedMemory?.metadata && Object.keys(selectedMemory.metadata).length > 0 && (
                  <div>
                    <Label className="text-muted-foreground mb-2 block">Metadata</Label>
                    <div className="rounded-lg border p-4 bg-muted/30">
                      <pre className="text-xs overflow-x-auto">
                        {JSON.stringify(selectedMemory.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayout>
  )
}
