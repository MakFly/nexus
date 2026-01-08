'use client'

import React, { useState, useMemo } from 'react'
import {
  BugIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  Trash2Icon,
  RefreshCwIcon,
  DatabaseIcon,
  ActivityIcon,
  SettingsIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useContextStore, useMemoryStore } from '@/stores'
import type { Context, Memory } from '@/types'

interface DebugSection {
  id: string
  title: string
  icon: React.ReactNode
  data: unknown
}

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['overview']),
  )
  const [autoRefresh, setAutoRefresh] = useState(false)

  const contextsState = useContextStore()
  const memoriesState = useMemoryStore()

  const contexts = contextsState?.contexts ?? []
  const memories = memoriesState?.memories ?? []

  // Auto-refresh effect
  React.useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      contextsState?.fetchContexts?.()
      memoriesState?.fetchMemories?.()
    }, 2000)

    return () => clearInterval(interval)
  }, [autoRefresh, contextsState, memoriesState])

  // Calculate debug data
  const debugData = useMemo(() => {
    const contextStats = {
      byStack: contexts.reduce(
        (acc, c) => {
          const stack = c.stack || 'none'
          acc[stack] = (acc[stack] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ),
      byDifficulty: contexts.reduce(
        (acc, c) => {
          const diff = c.difficulty || 'none'
          acc[diff] = (acc[diff] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ),
    }

    const memoryStats = {
      byType: memories.reduce(
        (acc, m) => {
          acc[m.type] = (acc[m.type] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ),
      byStack: memories.reduce(
        (acc, m) => {
          const stack = m.stack || 'none'
          acc[stack] = (acc[stack] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ),
      byDifficulty: memories.reduce(
        (acc, m) => {
          const diff = m.difficulty || 'none'
          acc[diff] = (acc[diff] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ),
    }

    const recentActivity = memories
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 10)
      .map((m) => ({
        id: m.id,
        title: m.title,
        type: m.type,
        createdAt: m.createdAt,
        contextId: m.contextId,
      }))

    const stateInfo = {
      contexts: {
        count: contexts.length,
        isLoading: contextsState?.isLoading ?? false,
        lastFetched: contextsState?.lastFetched ?? null,
        error: contextsState?.error ?? null,
      },
      memories: {
        count: memories.length,
        isLoading: memoriesState?.isLoading ?? false,
        lastFetched: memoriesState?.lastFetched ?? null,
        error: memoriesState?.error ?? null,
      },
    }

    return {
      overview: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: import.meta.env.MODE,
        apiBase: 'http://localhost:3001/api',
        summary: {
          totalContexts: contexts.length,
          totalMemories: memories.length,
          growthRate:
            contexts.length > 0
              ? (memories.length / contexts.length).toFixed(2)
              : '0',
        },
      },
      state: stateInfo,
      contexts: {
        total: contexts.length,
        stats: contextStats,
        items: contexts.map((c) => ({
          id: c.id,
          name: c.name,
          stack: c.stack,
          difficulty: c.difficulty,
          tags: c.tags,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
      },
      memories: {
        total: memories.length,
        stats: memoryStats,
        recent: recentActivity,
        items: memories.map((m) => ({
          id: m.id,
          title: m.title,
          type: m.type,
          stack: m.stack,
          difficulty: m.difficulty,
          contextId: m.contextId,
          createdAt: m.createdAt,
        })),
      },
    }
  }, [contexts, memories, contextsState, memoriesState])

  const sections: DebugSection[] = [
    {
      id: 'overview',
      title: 'Overview',
      icon: <ActivityIcon className="size-4" />,
      data: debugData.overview,
    },
    {
      id: 'state',
      title: 'Store State',
      icon: <DatabaseIcon className="size-4" />,
      data: debugData.state,
    },
    {
      id: 'contexts',
      title: `Contexts (${contexts.length})`,
      icon: <DatabaseIcon className="size-4" />,
      data: debugData.contexts,
    },
    {
      id: 'memories',
      title: `Memories (${memories.length})`,
      icon: <DatabaseIcon className="size-4" />,
      data: debugData.memories,
    },
  ]

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const copyToClipboard = (data: unknown) => {
    const json = JSON.stringify(data, null, 2)
    navigator.clipboard.writeText(json)
  }

  const copyAll = () => {
    const allData = {
      ...debugData,
      _meta: {
        copiedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
      },
    }
    copyToClipboard(allData)
  }

  const refreshAll = () => {
    contextsState?.fetchContexts?.()
    memoriesState?.fetchMemories?.()
  }

  const formatJson = (data: unknown): string => {
    return JSON.stringify(data, null, 2)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
        title="Open Debug Panel"
      >
        <BugIcon className="size-4" />
        <span className="text-sm font-medium">Debug</span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[80vh] overflow-hidden rounded-lg border bg-background shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-muted px-4 py-2">
        <div className="flex items-center gap-2">
          <BugIcon className="size-4 text-primary" />
          <h3 className="text-sm font-bold">Debug Panel</h3>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {contexts.length}C / {memories.length}M
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? 'Disable Auto-refresh' : 'Enable Auto-refresh'}
          >
            <RefreshCwIcon
              className={`size-3.5 ${autoRefresh ? 'animate-spin' : ''}`}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setIsOpen(false)}
            title="Minimize"
          >
            <ChevronDownIcon className="size-4" />
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          onClick={refreshAll}
        >
          <RefreshCwIcon className="mr-1 size-3" />
          Refresh
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          onClick={copyAll}
        >
          <CopyIcon className="mr-1 size-3" />
          Copy All
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          onClick={() => setExpandedSections(new Set())}
        >
          <ChevronRightIcon className="mr-1 size-3" />
          Collapse
        </Button>
      </div>

      {/* Content */}
      <div className="max-h-[60vh] overflow-y-auto px-4 py-2">
        {sections.map((section) => {
          const isExpanded = expandedSections.has(section.id)
          return (
            <Card key={section.id} className="mb-2">
              <CardHeader
                className="cursor-pointer px-3 py-2"
                onClick={() => toggleSection(section.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {section.icon}
                    <CardTitle className="text-sm">{section.title}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={(e) => {
                      e.stopPropagation()
                      copyToClipboard(section.data)
                    }}
                  >
                    <CopyIcon className="size-3" />
                  </Button>
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="px-3 pb-3">
                  <pre className="overflow-x-auto rounded bg-muted p-2 text-xs">
                    <code>{formatJson(section.data)}</code>
                  </pre>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Footer */}
      <div className="border-t bg-muted px-4 py-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {new Date().toLocaleTimeString()} • {import.meta.env.MODE}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => {
              if (confirm('Clear all data?')) {
                // Implement clear logic if needed
              }
            }}
          >
            <Trash2Icon className="mr-1 size-3" />
            Clear
          </Button>
        </div>
      </div>
    </div>
  )
}
