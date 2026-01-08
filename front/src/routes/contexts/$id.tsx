import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  EditIcon,
  PlusIcon,
  TagIcon,
  Trash2Icon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  AlertTriangleIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import type { FormEvent } from 'react'

import type { MemoryType, Memory, Context } from '@/types'
import { AppLayout } from '@/components/app-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import { Markdown } from '@/components/ui/code-block'
import { Skeleton } from '@/components/ui/skeleton'
import { memoriesApi, contextsApi } from '@/lib/api'
import { useContextStore } from '@/stores'

const MEMORIES_PER_PAGE = 10

export const Route = createFileRoute('/contexts/$id')({
  component: ContextDetail,
})

function ContextDetail() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { deleteContext } = useContextStore()

  // Context state
  const [context, setContext] = useState<Context | null>(null)
  const [contextLoading, setContextLoading] = useState(true)

  // Pagination state
  const [page, setPage] = useState(1)
  const [totalMemories, setTotalMemories] = useState(0)
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(false)

  // Add memory dialog state
  const [showAddMemory, setShowAddMemory] = useState(false)

  // Delete context dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeletingContext, setIsDeletingContext] = useState(false)

  const [newMemory, setNewMemory] = useState({
    content: '',
    type: 'note' as MemoryType,
    tags: [] as Array<string>,
  })
  const [tagInput, setTagInput] = useState('')

  // Track fetched IDs to prevent React Strict Mode double-fetching
  const lastFetchedContextId = useRef<string | null>(null)
  const lastFetchedMemoriesId = useRef<string | null>(null)
  const lastFetchedMemoriesPage = useRef<number>(1)

  // Fetch context from API
  const fetchContext = useCallback(async () => {
    // Skip if we already fetched this context
    if (lastFetchedContextId.current === id) {
      return
    }
    lastFetchedContextId.current = id

    setContextLoading(true)
    try {
      const ctx = await contextsApi.getById(id)
      setContext(ctx)
    } catch (error) {
      console.error('Failed to fetch context:', error)
    } finally {
      setContextLoading(false)
    }
  }, [id])

  // Fetch paginated memories
  const fetchMemories = useCallback(
    async (pageNum: number) => {
      // Skip if we already fetched this page for this context
      if (
        lastFetchedMemoriesId.current === id &&
        lastFetchedMemoriesPage.current === pageNum
      ) {
        return
      }
      lastFetchedMemoriesId.current = id
      lastFetchedMemoriesPage.current = pageNum

      setLoading(true)
      try {
        const offset = (pageNum - 1) * MEMORIES_PER_PAGE
        const response = await memoriesApi.getPaginated(
          pageNum,
          MEMORIES_PER_PAGE,
          { contextId: id },
        )
        setMemories(response.items)
        setTotalMemories(response.total)
      } catch (error) {
        console.error('Failed to fetch memories:', error)
      } finally {
        setLoading(false)
      }
    },
    [id],
  )

  useEffect(() => {
    fetchContext()
  }, [fetchContext])

  useEffect(() => {
    fetchMemories(page)
  }, [fetchMemories, page])

  // Create memory
  const addMemory = async (
    data: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>,
  ) => {
    try {
      await memoriesApi.create(data)
      // Refresh current page
      fetchMemories(page)
    } catch (error) {
      console.error('Failed to add memory:', error)
      throw error
    }
  }

  // Delete memory
  const deleteMemory = async (memoryId: string) => {
    try {
      await memoriesApi.delete(memoryId)
      // Refresh current page
      fetchMemories(page)
    } catch (error) {
      console.error('Failed to delete memory:', error)
    }
  }

  // Pagination helpers
  const totalPages = Math.ceil(totalMemories / MEMORIES_PER_PAGE)
  const hasNextPage = page < totalPages
  const hasPrevPage = page > 1

  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
  }

  if (contextLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col gap-6">
          {/* Header Skeleton */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="size-12 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
              </div>
            </div>
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-28" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-28" />
              </CardContent>
            </Card>
          </div>

          {/* Memories Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  if (!context) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h2 className="text-2xl font-bold">Context not found</h2>
          <p className="text-muted-foreground mb-4">
            The context you're looking for doesn't exist.
          </p>
          <Button asChild>
            <Link to="/contexts">Back to Contexts</Link>
          </Button>
        </div>
      </AppLayout>
    )
  }

  const handleAddMemory = async (e: FormEvent) => {
    e.preventDefault()
    if (!newMemory.content.trim()) return

    try {
      await addMemory({
        content: newMemory.content.trim(),
        type: newMemory.type,
        contextId: id,
        tags: newMemory.tags,
      })
      setNewMemory({ content: '', type: 'note', tags: [] })
      setShowAddMemory(false)
    } catch (error) {
      console.error('Failed to add memory:', error)
    }
  }

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !newMemory.tags.includes(tag)) {
      setNewMemory({ ...newMemory, tags: [...newMemory.tags, tag] })
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setNewMemory({
      ...newMemory,
      tags: newMemory.tags.filter((tag) => tag !== tagToRemove),
    })
  }

  const handleDeleteContext = async () => {
    setIsDeletingContext(true)
    try {
      await deleteContext(id)
      toast.success('Contexte supprimé avec succès', {
        description: `"${context?.name || 'Contexte'}" et toutes ses mémoires ont été supprimés`,
      })
      closeDeleteDialog()
      navigate({ to: '/contexts' })
    } catch (error) {
      console.error('Failed to delete context:', error)
      toast.error('Échec de la suppression', {
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
      })
    } finally {
      setIsDeletingContext(false)
    }
  }

  const openDeleteDialog = () => {
    setDeleteConfirmText('')
    setShowDeleteDialog(true)
  }

  const closeDeleteDialog = () => {
    setShowDeleteDialog(false)
    setDeleteConfirmText('')
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/contexts">
                <ArrowLeftIcon className="size-4" />
              </Link>
            </Button>
            <div
              className="flex size-12 items-center justify-center rounded-lg"
              style={{ backgroundColor: context.color + '20' }}
            >
              <EditIcon className="size-6" style={{ color: context.color }} />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                {context.name}
              </h2>
              <p className="text-muted-foreground">{context.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showAddMemory} onOpenChange={setShowAddMemory}>
              <DialogTrigger asChild>
                <Button>
                  <PlusIcon className="mr-2 size-4" />
                  Add Memory
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Add New Memory</DialogTitle>
                  <DialogDescription>
                    Store a new memory in "{context.name}"
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddMemory} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="content">Content *</Label>
                    <Textarea
                      id="content"
                      placeholder="Enter the memory content..."
                      value={newMemory.content}
                      onChange={(e) =>
                        setNewMemory({ ...newMemory, content: e.target.value })
                      }
                      rows={5}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={newMemory.type}
                      onValueChange={(value: MemoryType) =>
                        setNewMemory({ ...newMemory, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="note">Note</SelectItem>
                        <SelectItem value="conversation">
                          Conversation
                        </SelectItem>
                        <SelectItem value="snippet">Snippet</SelectItem>
                        <SelectItem value="reference">Reference</SelectItem>
                        <SelectItem value="task">Task</SelectItem>
                        <SelectItem value="idea">Idea</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags</Label>
                    <div className="flex gap-2">
                      <Input
                        id="tags"
                        placeholder="Add tags and press Enter"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addTag()
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={addTag}
                      >
                        <PlusIcon className="size-4" />
                      </Button>
                    </div>
                    {newMemory.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {newMemory.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="gap-1"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="ml-1 hover:text-destructive"
                            >
                              <Trash2Icon className="size-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddMemory(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={!newMemory.content.trim()}>
                      Add Memory
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Button variant="outline" size="icon" onClick={openDeleteDialog} className="cursor-pointer">
              <Trash2Icon className="size-4 text-destructive" />
            </Button>

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangleIcon className="size-5 text-destructive" />
                    Supprimer le contexte
                  </DialogTitle>
                  <DialogDescription>
                    Cette action est irréversible. Toutes les mémoires associées
                    seront supprimées définitivement.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    Pour confirmer la suppression, tapez{' '}
                    <span className="font-bold text-foreground">SUPPRIMER</span>{' '}
                    ci-dessous :
                  </p>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Tapez SUPPRIMER"
                    className="font-mono"
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeDeleteDialog}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={deleteConfirmText !== 'SUPPRIMER' || isDeletingContext}
                    onClick={handleDeleteContext}
                    className="cursor-pointer"
                  >
                    {isDeletingContext ? (
                      <>
                        <div className="size-4 animate-spin rounded-full border-2 border-transparent border-t-current mr-2" />
                        Suppression...
                      </>
                    ) : (
                      <>
                        <Trash2Icon className="size-4 mr-2" />
                        Supprimer le contexte
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Context Info */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Memories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMemories}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Created
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Date(context.createdAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Last Updated
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Date(context.updatedAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tags */}
        {context.tags.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TagIcon className="size-4" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {context.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Memories List with Pagination */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Memories</CardTitle>
                <CardDescription>
                  Page {page} of {totalPages || 1} • {totalMemories}{' '}
                  {totalMemories === 1 ? 'memory' : 'memories'} in total
                </CardDescription>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => goToPage(1)}
                    disabled={!hasPrevPage}
                  >
                    <ChevronsLeftIcon className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => goToPage(page - 1)}
                    disabled={!hasPrevPage}
                  >
                    <ChevronLeftIcon className="size-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => goToPage(page + 1)}
                    disabled={!hasNextPage}
                  >
                    <ChevronRightIcon className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => goToPage(totalPages)}
                    disabled={!hasNextPage}
                  >
                    <ChevronsRightIcon className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-16 rounded" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : memories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  No memories yet. Add your first memory to get started.
                </p>
                <Button onClick={() => setShowAddMemory(true)}>
                  <PlusIcon className="mr-2 size-4" />
                  Add Memory
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {memories.map((memory, index) => (
                  <Collapsible
                    key={memory.id}
                    defaultOpen={false}
                    className="border rounded-lg overflow-hidden"
                  >
                    <CollapsibleTrigger className="hover:bg-muted/50">
                      <div className="flex items-center gap-3 flex-1">
                        <Badge variant="outline" className="capitalize">
                          {memory.type}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ClockIcon className="size-3" />
                          {new Date(memory.createdAt).toLocaleString()}
                        </div>
                        <span className="text-sm text-muted-foreground flex-1 truncate">
                          {memory.content.substring(0, 80)}...
                        </span>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <Markdown content={memory.content} />
                          {(memory.tags || []).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {(memory.tags || []).map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMemory(memory.id)}
                        >
                          <Trash2Icon className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
