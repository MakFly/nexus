'use client'

import * as React from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  Filter,
  Search,
  Tag,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { useRalphFiles } from '@/hooks/use-ralph-files'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { MemoriesSkeleton } from '@/components/skeletons/memories-skeleton'

// Category configuration with colors
const categoryConfig: Record<
  string,
  { icon: any; color: string; bg: string; label: string }
> = {
  backend: {
    icon: Database,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    label: 'Backend',
  },
  testing: {
    icon: CheckCircle2,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    label: 'Testing',
  },
  docs: {
    icon: FileText,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    label: 'Docs',
  },
  refactor: {
    icon: Tag,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    label: 'Refactor',
  },
  implementation: {
    icon: CheckCircle2,
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    label: 'Implementation',
  },
  auth: {
    icon: AlertCircle,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    label: 'Auth',
  },
  config: {
    icon: Tag,
    color: 'text-gray-500',
    bg: 'bg-gray-500/10',
    label: 'Config',
  },
}

function MemoryCard({
  memory,
  formatRelativeTime,
}: {
  memory: any
  formatRelativeTime: (timestamp: string) => string
}) {
  const config = categoryConfig[memory.category] || categoryConfig.config
  const Icon = config.icon

  return (
    <Link to="/" className="block">
      <div
        className={cn(
          'p-4 rounded-xl border transition-all hover:shadow-md hover:scale-[1.01]',
          config.bg,
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg', config.bg)}>
            <Icon className={cn('w-4 h-4', config.color)} />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">{memory.content}</span>
              {memory.file_path && (
                <code className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded">
                  {memory.file_path}
                </code>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={cn('text-xs', config.color)}>
                {config.label}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  memory.priority === 'high'
                    ? 'text-amber-500 border-amber-500/20'
                    : 'text-muted-foreground',
                )}
              >
                {memory.priority}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatRelativeTime(memory.timestamp)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

export function MemoriesPage() {
  const { memories, categoryCounts, formatRelativeTime, isLoading, error } =
    useRalphFiles()

  const [search, setSearch] = React.useState('')
  const [categoryFilter, setCategoryFilter] = React.useState('all')

  if (isLoading) {
    return <MemoriesSkeleton />
  }

  if (error) {
    return (
      <AppLayout title="Memories">
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <AlertCircle className="w-12 h-12 text-rose-500" />
          <p className="text-lg font-mono text-rose-500">
            Failed to load memories
          </p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </AppLayout>
    )
  }

  // Get unique categories from memories
  const categories = Array.from(new Set(memories.map((m) => m.category))).sort()

  const filteredMemories = memories.filter((m) => {
    const matchesSearch =
      m.content.toLowerCase().includes(search.toLowerCase()) ||
      (m.file_path || '').toLowerCase().includes(search.toLowerCase())
    const matchesCategory =
      categoryFilter === 'all' || m.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // Calculate stats
  const stats = {
    total: memories.length,
    backend: categoryCounts.backend || 0,
    testing: categoryCounts.testing || 0,
    other:
      memories.length -
      (categoryCounts.backend || 0) -
      (categoryCounts.testing || 0),
  }

  return (
    <AppLayout title="Memories">
      <div className="flex flex-col gap-6 p-4 lg:p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 border-violet-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Memories
                  </p>
                  <p className="text-2xl font-bold font-mono text-violet-500">
                    {stats.total}
                  </p>
                </div>
                <Database className="w-8 h-8 text-violet-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Backend</p>
                  <p className="text-2xl font-bold font-mono text-blue-500">
                    {stats.backend}
                  </p>
                </div>
                <Database className="w-8 h-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/5 to-emerald-500/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Testing</p>
                  <p className="text-2xl font-bold font-mono text-green-500">
                    {stats.testing}
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-gray-500/5 to-slate-500/5 border-gray-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Other</p>
                  <p className="text-2xl font-bold font-mono text-gray-500">
                    {stats.other}
                  </p>
                </div>
                <Tag className="w-8 h-8 text-gray-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Memories List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="font-mono">Memory Bank</CardTitle>
                <CardDescription>
                  Auto-captured context from your coding sessions
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search memories..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 w-[200px]"
                  />
                </div>
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger className="w-[140px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-420px)] min-h-[300px]">
              <div className="space-y-3 pr-4">
                {filteredMemories.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-mono">No memories found</p>
                    <p className="text-xs mt-1">
                      {search || categoryFilter !== 'all'
                        ? 'Try adjusting your filters'
                        : 'Start coding to see automatic context capture'}
                    </p>
                  </div>
                ) : (
                  filteredMemories.map((memory, index) => (
                    <MemoryCard
                      key={`${memory.timestamp}-${index}`}
                      memory={memory}
                      formatRelativeTime={formatRelativeTime}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Category breakdown */}
        {Object.keys(categoryCounts).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-mono">
                Category Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(categoryCounts).map(([cat, count]) => {
                  const config = categoryConfig[cat] || categoryConfig.config
                  return (
                    <Badge
                      key={cat}
                      variant="outline"
                      className={cn('px-3 py-1', config.color)}
                    >
                      {cat}: {count}
                    </Badge>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
