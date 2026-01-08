import React, { useEffect, useState, useRef } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  EditIcon,
  FolderKanbanIcon,
  GridIcon,
  ListIcon,
  PlusIcon,
  SearchIcon,
  TagIcon,
  Trash2Icon,
} from 'lucide-react'

import type { Context } from '@/types'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useContextStore } from '@/stores'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/contexts/')({
  component: ContextsList,
})

function ContextsList() {
  const { contexts, loading, error, fetchContexts, deleteContext } =
    useContextStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  // Use ref to track if we've already fetched
  const hasFetched = useRef(false)

  useEffect(() => {
    // Only fetch once using ref to prevent duplicate calls
    if (!hasFetched.current && fetchContexts) {
      hasFetched.current = true
      fetchContexts().finally(() => {
        setIsInitialLoading(false)
      })
    }
  }, [fetchContexts])

  // Show loading state on first render or when explicitly loading
  const showLoading = isInitialLoading || loading

  const filteredContexts = contexts.filter((context) => {
    const query = searchQuery.toLowerCase()
    return (
      context.name.toLowerCase().includes(query) ||
      context.description.toLowerCase().includes(query) ||
      context.tags.some((tag) => tag.toLowerCase().includes(query))
    )
  })

  const handleDelete = async (contextId: string) => {
    // Validate that contextId exists and is not null/undefined
    if (!contextId) {
      return
    }

    if (
      confirm(
        'Are you sure you want to delete this context? All associated memories will also be deleted.',
      )
    ) {
      try {
        console.log('handleDelete: Deleting context', { contextId })
        await deleteContext(contextId)
      } catch (error) {
        console.error('Failed to delete context:', error)
      }
    }
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Contexts</h2>
            <p className="text-muted-foreground">
              Manage and organize your contexts
            </p>
          </div>
          <Button asChild>
            <Link to="/contexts/new">
              <PlusIcon className="mr-2 size-4" />
              New Context
            </Link>
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search contexts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2 border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <GridIcon className="size-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <ListIcon className="size-4" />
            </Button>
          </div>
        </div>

        {/* Contexts Grid/List */}
        {showLoading ? (
          <div
            className={cn(
              'gap-4',
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                : 'flex flex-col',
            )}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <ContextCardSkeleton key={i} viewMode={viewMode} />
            ))}
          </div>
        ) : filteredContexts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FolderKanbanIcon className="mb-4 size-16 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold">No contexts found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Create your first context to get started'}
            </p>
            {!searchQuery && (
              <Button asChild>
                <Link to="/contexts/new">
                  <PlusIcon className="mr-2 size-4" />
                  Create Context
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div
            className={cn(
              'gap-4',
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                : 'flex flex-col',
            )}
          >
            {filteredContexts.map((context) => (
              <ContextCard
                key={context.id}
                context={context}
                viewMode={viewMode}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function ContextCard({
  context,
  viewMode,
  onDelete,
}: {
  context: Context
  viewMode: 'grid' | 'list'
  onDelete: (id: string) => void
}) {
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex size-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: context.color + '20' }}
            >
              <FolderKanbanIcon
                className="size-5"
                style={{ color: context.color }}
              />
            </div>
            <div>
              <CardTitle className="text-lg">{context.name}</CardTitle>
              <CardDescription className="line-clamp-1">
                {context.description}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" asChild>
              <Link to={`/contexts/${context.id}`}>
                <EditIcon className="size-4" />
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" disabled={!context.id}>
                  <Trash2Icon className="size-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Context</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{context.name}"? All
                    associated memories will also be deleted. This action cannot
                    be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(context.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {context.tags && context.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <TagIcon className="size-3 text-muted-foreground mt-1" />
              {context.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {context.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{context.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{context.memoryCount} memories</span>
            <span>
              Updated {new Date(context.updatedAt).toLocaleDateString()}
            </span>
          </div>
          <Button variant="outline" className="w-full" asChild>
            <Link to={`/contexts/${context.id}`}>View Context</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ContextCardSkeleton({ viewMode }: { viewMode: 'grid' | 'list' }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-14" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-9 w-full" />
        </div>
      </CardContent>
    </Card>
  )
}
