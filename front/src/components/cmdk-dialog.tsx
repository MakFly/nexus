'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { createPortal } from 'react-dom'
import { useSearchStore, useMemoryStore } from '@/stores'
import type { Memory, Context } from '@/types'
import {
  Search,
  FileText,
  MessageSquare,
  Code,
  BookOpen,
  CheckSquare,
  Lightbulb,
  X,
  Clock,
  ArrowRight,
  Plus,
  Loader2,
  type LucideIcon,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface SearchResult {
  id: string
  type: 'memory' | 'context' | 'action'
  title: string
  content?: string
  context?: string
  icon: LucideIcon
  iconColor: string
  memory?: Memory
  contextData?: Context
  action?: 'create' | 'recent'
  score?: number
}

const MEMORY_ICONS: Record<
  Memory['type'],
  { icon: LucideIcon; color: string }
> = {
  note: { icon: FileText, color: 'text-blue-500' },
  conversation: { icon: MessageSquare, color: 'text-green-500' },
  snippet: { icon: Code, color: 'text-purple-500' },
  reference: { icon: BookOpen, color: 'text-orange-500' },
  task: { icon: CheckSquare, color: 'text-red-500' },
  idea: { icon: Lightbulb, color: 'text-yellow-500' },
}

const RECENT_SEARCHES_KEY = 'free-context-recent-searches'

export function CmdkDialog() {
  const navigate = useNavigate()
  const {
    query,
    results,
    loading,
    setSearchQuery,
    executeSearch,
    clearSearch,
    searchHistory,
  } = useSearchStore()

  const [open, setOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [localRecentSearches, setLocalRecentSearches] = useState<string[]>([])
  const [isMounted, setIsMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Load recent searches from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY)
      if (saved) {
        try {
          setLocalRecentSearches(JSON.parse(saved))
        } catch (e) {
          console.error('Failed to load recent searches:', e)
        }
      }
      setIsMounted(true)
    }
  }, [])

  // Save recent searches to localStorage
  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return

    setLocalRecentSearches((prev) => {
      const filtered = prev.filter((s) => s !== searchQuery)
      const updated = [searchQuery, ...filtered].slice(0, 5)

      if (typeof window !== 'undefined') {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
      }

      return updated
    })
  }, [])

  // Convert search results from API to display format
  const searchResults = useMemo(() => {
    const displayResults: SearchResult[] = []
    const q = query.trim()

    if (!q) {
      // Show recent searches and actions when no query
      localRecentSearches.forEach((search, idx) => {
        displayResults.push({
          id: `recent-${idx}`,
          type: 'action',
          title: search,
          icon: Clock,
          iconColor: 'text-muted-foreground',
          action: 'recent',
        })
      })

      // Add "Create new memory" action
      displayResults.push({
        id: 'create-memory',
        type: 'action',
        title: 'Create new memory',
        icon: Plus,
        iconColor: 'text-primary',
        action: 'create',
      })

      return displayResults
    }

    // Transform API results to display format
    results.forEach((result: any) => {
      const memory = result as Memory
      if (memory) {
        const { icon, color } = MEMORY_ICONS[memory.type] || {
          icon: FileText,
          color: 'text-gray-500',
        }
        displayResults.push({
          id: memory.id,
          type: 'memory',
          title: memory.title,
          content: memory.excerpt || memory.content?.substring(0, 100),
          context: result.contextName,
          icon,
          iconColor: color,
          memory,
          score: result.score || 0,
        })
      }
    })

    return displayResults.slice(0, 8)
  }, [query, localRecentSearches, results])

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchResults.length])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open with Cmd/Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }

      // Close with Escape
      if (e.key === 'Escape' && open) {
        setOpen(false)
        clearSearch()
      }

      // Navigate with arrows when open
      if (open) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev < searchResults.length - 1 ? prev + 1 : prev,
          )
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0))
        } else if (e.key === 'Enter') {
          e.preventDefault()
          const selected = searchResults[selectedIndex]
          if (selected) {
            handleResultClick(selected)
          }
        }
      }

      // Edit with Cmd/Ctrl+E
      if (
        open &&
        (e.metaKey || e.ctrlKey) &&
        e.key === 'e' &&
        searchResults[selectedIndex]?.type === 'memory'
      ) {
        e.preventDefault()
        const selected = searchResults[selectedIndex]
        if (selected?.memory) {
          navigate({
            to: '/memories/edit',
            search: { id: selected.memory.id },
          })
          setOpen(false)
          clearSearch()
        }
      }

      // Delete with Cmd/Ctrl+Backspace
      if (
        open &&
        (e.metaKey || e.ctrlKey) &&
        e.key === 'Backspace' &&
        searchResults[selectedIndex]?.type === 'memory'
      ) {
        e.preventDefault()
        const selected = searchResults[selectedIndex]
        if (selected?.memory && confirm('Delete this memory?')) {
          useMemoryStore.getState().deleteMemory(selected.memory.id)
          clearSearch()
          setSelectedIndex(0)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, selectedIndex, searchResults, navigate, clearSearch])

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      })
    }
  }, [selectedIndex])

  // Disable body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [open])

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      if (result.action === 'create') {
        navigate({ to: '/memories/new' })
      } else if (result.action === 'recent') {
        setSearchQuery(result.title)
        return
      } else if (result.type === 'memory' && result.memory) {
        saveRecentSearch(result.title)
        navigate({
          to: '/memories/view',
          search: { id: result.memory.id },
        })
      } else if (result.type === 'context' && result.contextData) {
        saveRecentSearch(result.title)
        navigate({
          to: '/contexts/view',
          search: { id: result.contextData.id },
        })
      }

      setOpen(false)
      clearSearch()
    },
    [navigate, saveRecentSearch, setSearchQuery, clearSearch],
  )

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text

    const regex = new RegExp(`(${query})`, 'gi')
    const parts = text.split(regex)

    return parts.map((part, idx) =>
      regex.test(part) ? (
        <mark
          key={idx}
          className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5"
        >
          {part}
        </mark>
      ) : (
        part
      ),
    )
  }

  const triggerButton = (
    <button
      onClick={() => isMounted && setOpen(true)}
      className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-secondary/50 hover:bg-secondary rounded-lg transition-colors border border-transparent hover:border-border min-w-[200px] max-w-[300px]"
    >
      <Search className="w-4 h-4" />
      <span className="flex-1 text-left truncate">
        {query || 'Search memories... (⌘K)'}
      </span>
      {isMounted && query && (
        <span
          onClick={(e) => {
            e.stopPropagation()
            clearSearch()
          }}
          className="p-0.5 rounded-md hover:bg-secondary cursor-pointer"
        >
          <X className="w-3 h-3" />
        </span>
      )}
    </button>
  )

  if (!isMounted) {
    return triggerButton
  }

  return (
    <>
      {triggerButton}

      {isMounted &&
        typeof document !== 'undefined' &&
        createPortal(
          open ? (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm"
                onClick={() => setOpen(false)}
              />

              {/* Dialog */}
              <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] pointer-events-none">
                <div
                  className="relative w-full max-w-2xl mx-4 bg-background rounded-xl shadow-2xl border pointer-events-auto overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Search Input */}
                  <div className="flex items-center gap-3 p-4 border-b">
                    <Search className="w-5 h-5 text-muted-foreground" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search memories, contexts..."
                      className="flex-1 bg-transparent border-0 outline-none text-lg placeholder:text-muted-foreground"
                    />
                    {query && (
                      <button
                        onClick={() => clearSearch()}
                        className="p-1 rounded-md hover:bg-secondary"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>

                  {/* Results */}
                  <div className="max-h-[50vh] overflow-y-auto">
                    {loading ? (
                      <div className="p-4 space-y-3">
                        {[...Array(5)].map((_, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3">
                            <Skeleton className="size-5 shrink-0 rounded-full" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-3 w-1/2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground">
                        <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No results found for "{query}"</p>
                      </div>
                    ) : (
                      <div className="p-2">
                        {searchResults.map((result, idx) => {
                          const Icon = result.icon
                          const isSelected = idx === selectedIndex

                          return (
                            <button
                              key={result.id}
                              ref={(el) => (itemRefs.current[idx] = el)}
                              onClick={() => handleResultClick(result)}
                              onMouseEnter={() => setSelectedIndex(idx)}
                              className={`w-full text-left p-3 rounded-lg transition-colors flex items-start gap-3 ${
                                isSelected ? 'bg-accent' : 'hover:bg-secondary'
                              }`}
                            >
                              <Icon
                                className={`w-5 h-5 mt-0.5 flex-shrink-0 ${result.iconColor}`}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">
                                  {highlightMatch(result.title, query)}
                                </div>
                                {result.content && (
                                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                    {highlightMatch(result.content, query)}
                                  </div>
                                )}
                                {result.context && (
                                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                    <span className="bg-secondary px-2 py-0.5 rounded">
                                      {result.context}
                                    </span>
                                  </div>
                                )}
                                {result.type === 'memory' &&
                                  result.memory?.tags.length > 0 && (
                                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                      {result.memory.tags.map((tag) => (
                                        <span
                                          key={tag}
                                          className="text-xs bg-secondary px-1.5 py-0.5 rounded text-muted-foreground"
                                        >
                                          #{tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                              </div>
                              <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="p-3 border-t bg-secondary/30">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <kbd className="px-1.5 py-0.5 bg-background rounded text-xs font-medium">
                            ↑↓
                          </kbd>
                          <span>Navigate</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <kbd className="px-1.5 py-0.5 bg-background rounded text-xs font-medium">
                            ↵
                          </kbd>
                          <span>Open</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <kbd className="px-1.5 py-0.5 bg-background rounded text-xs font-medium">
                            ⌘E
                          </kbd>
                          <span>Edit</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <kbd className="px-1.5 py-0.5 bg-background rounded text-xs font-medium">
                            ⌘⌫
                          </kbd>
                          <span>Delete</span>
                        </span>
                      </div>
                      <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-background rounded text-xs font-medium">
                          Esc
                        </kbd>
                        <span>Close</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null,
          document.body,
        )}
    </>
  )
}
