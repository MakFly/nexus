'use client'

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from '@tanstack/react-router'
import { Search, X, FileText, ChevronDown } from 'lucide-react'
import Fuse from 'fuse.js'
import { testSteps } from '@/lib/test-data'
import type { TestStep, Difficulty } from '@/lib/test-data'

export function GlobalSearch() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<{
    categories?: string[]
    difficulties?: Difficulty[]
  }>({})
  const [visibleCount, setVisibleCount] = useState(5)
  const [isMounted, setIsMounted] = useState(false)

  // Mount state to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Initialize Fuse
  const fuse = useMemo(() => {
    return new Fuse(testSteps, {
      keys: [
        { name: 'title', weight: 3 },
        { name: 'description', weight: 2 },
        { name: 'prompt', weight: 2 },
        { name: 'expected', weight: 1 },
        { name: 'category', weight: 1.5 },
      ],
      threshold: 0.3,
      ignoreLocation: true,
    })
  }, [])

  // Get available filters
  const categories = useMemo(() => {
    const cats = new Set(testSteps.map((s) => s.category))
    return Array.from(cats).sort()
  }, [])

  const difficulties: Difficulty[] = ['easy', 'normal', 'hard']

  // Perform search
  const results = useMemo(() => {
    let filtered = testSteps

    if (query.trim()) {
      const searchResults = fuse.search(query)
      filtered = searchResults.map((r) => r.item)
    }

    if (selectedFilters.categories?.length) {
      filtered = filtered.filter((s) =>
        selectedFilters.categories!.includes(s.category),
      )
    }

    if (selectedFilters.difficulties?.length) {
      filtered = filtered.filter((s) =>
        selectedFilters.difficulties!.includes(s.difficulty),
      )
    }

    return filtered
  }, [query, selectedFilters, fuse])

  const visibleResults = results.slice(0, visibleCount)
  const hasMore = results.length > visibleCount

  // Toggle category filter
  const toggleCategory = useCallback((cat: string) => {
    setSelectedFilters((prev) => {
      const current = prev.categories || []
      const updated = current.includes(cat)
        ? current.filter((c) => c !== cat)
        : [...current, cat]
      return { ...prev, categories: updated.length ? updated : undefined }
    })
  }, [])

  // Toggle difficulty filter
  const toggleDifficulty = useCallback((diff: Difficulty) => {
    setSelectedFilters((prev) => {
      const current = prev.difficulties || []
      const updated = current.includes(diff)
        ? current.filter((d) => d !== diff)
        : [...current, diff]
      return { ...prev, difficulties: updated.length ? updated : undefined }
    })
  }, [])

  // Clear all
  const clearAll = useCallback(() => {
    setQuery('')
    setSelectedFilters({})
    setVisibleCount(5)
  }, [])

  // Load more
  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + 10, results.length))
  }, [results.length])

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Disable body scroll when search is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [open])

  // Reset visible count when search changes
  useEffect(() => {
    setVisibleCount(5)
  }, [query, selectedFilters])

  const hasActiveFilters =
    selectedFilters.categories?.length || selectedFilters.difficulties?.length

  return (
    <>
      {/* Trigger Button */}
      <div
        onClick={() => isMounted && setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-secondary/50 hover:bg-secondary rounded-lg transition-colors border border-transparent hover:border-border min-w-[200px] max-w-[300px] cursor-pointer"
      >
        <Search className="w-4 h-4" />
        <span className="flex-1 text-left truncate">
          {query || 'Rechercher... (⌘K)'}
        </span>
        {isMounted && (query || hasActiveFilters) && (
          <span
            onClick={(e) => {
              e.stopPropagation()
              clearAll()
            }}
            className="p-0.5 rounded-md hover:bg-secondary cursor-pointer"
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </div>

      {/* Search Dialog - Only rendered client-side after mount */}
      {isMounted &&
        typeof document !== 'undefined' &&
        createPortal(
          open ? (
            <>
              {/* Backdrop with blur */}
              <div
                className="fixed inset-0 z-[50] bg-background/80 backdrop-blur-sm"
                onClick={() => setOpen(false)}
              />

              {/* Dialog */}
              <div className="fixed inset-0 z-[50] flex items-start justify-center pt-[15vh] pointer-events-none">
                <div
                  className="relative w-full max-w-2xl mx-4 bg-background rounded-xl shadow-2xl border pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4">
                    {/* Search Input */}
                    <div className="flex items-center gap-3 mb-4">
                      <Search className="w-5 h-5 text-muted-foreground" />
                      <input
                        autoFocus
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Rechercher des tests..."
                        className="flex-1 bg-transparent border-0 outline-none text-lg"
                      />
                      {(query || hasActiveFilters) && (
                        <button
                          onClick={clearAll}
                          className="p-1 rounded-md hover:bg-secondary"
                        >
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      )}
                    </div>

                    {/* Filters */}
                    {(!query || hasActiveFilters) && (
                      <div className="mb-4 space-y-3">
                        {/* Categories */}
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-2">
                            Catégories
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {categories.map((cat) => (
                              <button
                                key={cat}
                                onClick={() => toggleCategory(cat)}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                                  selectedFilters.categories?.includes(cat)
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                }`}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Difficulties */}
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-2">
                            Difficulté
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {difficulties.map((diff) => (
                              <button
                                key={diff}
                                onClick={() => toggleDifficulty(diff)}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                                  selectedFilters.difficulties?.includes(diff)
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                }`}
                              >
                                {diff === 'easy' && '🟢'}
                                {diff === 'normal' && '🟡'}
                                {diff === 'hard' && '🔴'}
                                {diff}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Results */}
                    <div className="max-h-[50vh] overflow-y-auto">
                      {query && results.length === 0 && (
                        <div className="py-8 text-center text-muted-foreground">
                          Aucun résultat pour "{query}"
                        </div>
                      )}

                      {!query && !hasActiveFilters && (
                        <div className="py-8 text-center text-muted-foreground text-sm">
                          Tapez pour rechercher des tests ou utilisez les
                          filtres ci-dessus
                        </div>
                      )}

                      <div className="space-y-1">
                        {visibleResults.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => {
                              navigate({
                                to: '/test-guide/$category',
                                params: { category: result.category },
                              })
                              setOpen(false)
                              clearAll()
                            }}
                            className="w-full text-left p-3 rounded-lg hover:bg-secondary transition-colors text-left"
                          >
                            <div className="flex items-start gap-3">
                              <FileText className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">
                                  {result.title}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                  {result.description}
                                </div>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                                    {result.category}
                                  </span>
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded ${
                                      result.difficulty === 'easy'
                                        ? 'bg-green-500/20 text-green-600'
                                        : result.difficulty === 'normal'
                                          ? 'bg-yellow-500/20 text-yellow-600'
                                          : 'bg-red-500/20 text-red-600'
                                    }`}
                                  >
                                    {result.difficulty}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}

                        {/* Load More Button */}
                        {hasMore && (
                          <button
                            onClick={loadMore}
                            className="w-full py-2 text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 hover:bg-secondary rounded-lg transition-colors"
                          >
                            <span>
                              Afficher{' '}
                              {Math.min(10, results.length - visibleCount)}{' '}
                              autres
                            </span>
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-4 pt-4 border-t text-xs text-muted-foreground flex items-center justify-between">
                      <span>
                        {results.length} test{results.length > 1 ? 's' : ''}{' '}
                        trouvé{results.length > 1 ? 's' : ''}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs">
                            ⌘
                          </kbd>
                          <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs">
                            K
                          </kbd>
                        </span>
                        <span className="flex items-center gap-1">
                          <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs">
                            Esc
                          </kbd>
                        </span>
                      </div>
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
