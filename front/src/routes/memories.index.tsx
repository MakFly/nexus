import { useEffect, useState } from 'react'
import { Link as RouterLink, createFileRoute } from '@tanstack/react-router'
import {
  ClockIcon,
  CodeIcon,
  FileIcon,
  FileTextIcon,
  FilterIcon,
  LightbulbIcon,
  MessageSquareIcon,
  TagIcon,
  CheckIcon,
  XIcon,
  CalendarIcon,
  TrashIcon,
  AlertTriangleIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import type { MemoryType } from '@/types'
import { AppLayout } from '@/components/app-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useContextStore, useMemoryStore } from '@/stores'

export const Route = createFileRoute('/memories/')({
  component: MemoriesList,
})

function MemoriesList() {
  const { contexts, fetchContexts } = useContextStore()
  const { memories, fetchMemories, deleteMemory } = useMemoryStore()

  const handleDeleteMemory = async () => {
    if (!selectedMemory) return
    setIsDeleting(true)
    try {
      await deleteMemory(selectedMemory.id)
      toast.success('Mémoire supprimée avec succès', {
        description: `"${selectedMemory.title || 'Untitled'}" a été supprimée`,
      })
      setSelectedMemory(null)
      setDeleteDialogOpen(false)
      setDeleteConfirmText('')
      await fetchMemories()
    } catch (error) {
      console.error('Failed to delete memory:', error)
      toast.error('Échec de la suppression', {
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    fetchContexts()
    fetchMemories()
  }, [fetchContexts, fetchMemories])

  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<MemoryType | 'all'>('all')
  const [filterContext, setFilterContext] = useState<string>('all')
  const [selectedMemory, setSelectedMemory] = useState<
    (typeof memories)[0] | null
  >(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const filteredMemories = memories
    .filter((memory) => {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        memory.content.toLowerCase().includes(query) ||
        (memory.title || '').toLowerCase().includes(query) ||
        (memory.tags || []).some((tag) => tag.toLowerCase().includes(query))

      const matchesType = filterType === 'all' || memory.type === filterType
      const matchesContext =
        filterContext === 'all' || memory.contextId === filterContext

      return matchesSearch && matchesType && matchesContext
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )

  const getMemoryIcon = (type: MemoryType) => {
    switch (type) {
      case 'note':
        return FileTextIcon
      case 'conversation':
        return MessageSquareIcon
      case 'snippet':
        return CodeIcon
      case 'reference':
        return FileIcon
      case 'task':
        return CheckIcon
      case 'idea':
        return LightbulbIcon
      default:
        return FileTextIcon
    }
  }

  const groupedMemories = filteredMemories.reduce(
    (acc, memory) => {
      const date = new Date(memory.createdAt).toLocaleDateString()
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(memory)
      return acc
    },
    {} as Record<string, typeof filteredMemories>,
  )

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Memory Timeline</h2>
          <p className="text-muted-foreground">
            Browse all your memories chronologically
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <FilterIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search memories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select
                value={filterType}
                onValueChange={(value: MemoryType | 'all') =>
                  setFilterType(value)
                }
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by type" />
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

              <Select value={filterContext} onValueChange={setFilterContext}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by context" />
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

              {(filterType !== 'all' ||
                filterContext !== 'all' ||
                searchQuery) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setFilterType('all')
                    setFilterContext('all')
                    setSearchQuery('')
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Timeline with Grid */}
        {filteredMemories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClockIcon className="mb-4 size-16 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold">No memories found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterType !== 'all' || filterContext !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first memory to get started'}
            </p>
            {!searchQuery &&
              filterType === 'all' &&
              filterContext === 'all' &&
              contexts.length > 0 && (
                <Button asChild>
                  <RouterLink to={`/contexts/${contexts[0].id}`}>
                    Add Memory
                  </RouterLink>
                </Button>
              )}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedMemories).map(([date, dayMemories]) => (
              <div key={date} className="relative">
                {/* Date Header */}
                <div className="sticky top-0 z-10 mb-4 bg-background/95 pb-2 backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                      {new Date(date).getDate()}
                    </div>
                    <div>
                      <h3 className="font-semibold">{date}</h3>
                      <p className="text-sm text-muted-foreground">
                        {dayMemories.length}{' '}
                        {dayMemories.length === 1 ? 'memory' : 'memories'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Grid Layout - 4 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ml-5 border-l-2 border-muted pl-8">
                  {dayMemories.map((memory, index) => {
                    const Icon = getMemoryIcon(memory.type)
                    const context = contexts.find(
                      (c) => c.id === memory.contextId,
                    )
                    const truncatedContent =
                      memory.content.length > 150
                        ? memory.content.slice(0, 150) + '...'
                        : memory.content

                    return (
                      <Card
                        key={memory.id}
                        className="cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:border-primary/50 animate-card-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                        onClick={() => setSelectedMemory(memory)}
                      >
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-3">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
                                  <Icon className="size-3.5 text-primary" />
                                </div>
                                <Badge
                                  variant="outline"
                                  className="capitalize text-xs"
                                >
                                  {memory.type}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(memory.createdAt).toLocaleTimeString(
                                  [],
                                  {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  },
                                )}
                              </span>
                            </div>

                            {/* Title */}
                            {memory.title && (
                              <h4 className="font-semibold text-sm line-clamp-1">
                                {memory.title}
                              </h4>
                            )}

                            {/* Content Preview */}
                            <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                              {truncatedContent}
                            </p>

                            {/* Context Badge */}
                            {context && (
                              <Badge
                                variant="secondary"
                                className="text-xs w-fit"
                              >
                                {context.name}
                              </Badge>
                            )}

                            {/* Tags */}
                            {(memory.tags || []).length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {memory.tags!.slice(0, 3).map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                                {memory.tags!.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{memory.tags!.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Memory Detail Dialog */}
      <Dialog
        open={selectedMemory !== null}
        onOpenChange={(open) => !open && setSelectedMemory(null)}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/40">
          {selectedMemory && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 pr-8">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    {(() => {
                      const Icon = getMemoryIcon(selectedMemory.type)
                      return <Icon className="size-5 text-primary" />
                    })()}
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-xl">
                      {selectedMemory.title || 'Untitled Memory'}
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="capitalize">
                        {selectedMemory.type}
                      </Badge>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <CalendarIcon className="size-3" />
                        {new Date(selectedMemory.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Context Info */}
                {(() => {
                  const context = contexts.find(
                    (c) => c.id === selectedMemory.contextId,
                  )
                  return context ? (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Context</h4>
                      <Badge variant="secondary" asChild>
                        <RouterLink
                          to={`/contexts/${context.id}`}
                          className="hover:bg-secondary/80 text-sm"
                        >
                          {context.name}
                        </RouterLink>
                      </Badge>
                    </div>
                  ) : null
                })()}

                {/* Content */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Content</h4>
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <pre className="whitespace-pre-wrap break-words text-sm font-sans">
                      {selectedMemory.content}
                    </pre>
                  </div>
                </div>

                {/* Metadata */}
                {selectedMemory.metadata &&
                  Object.keys(selectedMemory.metadata).length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Metadata</h4>
                      <div className="rounded-lg border bg-muted/50 p-4">
                        <pre className="text-sm text-muted-foreground overflow-x-auto">
                          {JSON.stringify(selectedMemory.metadata, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                {/* Tags */}
                {(selectedMemory.tags || []).length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedMemory.tags!.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          <TagIcon className="size-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Created: </span>
                    <span className="font-medium">
                      {new Date(selectedMemory.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {selectedMemory.updatedAt &&
                    selectedMemory.updatedAt !== selectedMemory.createdAt && (
                      <div>
                        <span className="text-muted-foreground">Updated: </span>
                        <span className="font-medium">
                          {new Date(selectedMemory.updatedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                </div>
              </div>

              {/* Footer with Delete button */}
              <DialogFooter className="border-t pt-4">
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDeleteDialogOpen(true)
                    setDeleteConfirmText('')
                  }}
                  className="ml-auto cursor-pointer"
                >
                  <TrashIcon className="size-4 mr-2" />
                  Supprimer
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangleIcon className="size-5" />
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Cette action est irréversible. Voulez-vous vraiment supprimer cette mémoire ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Tapez <span className="font-mono font-bold text-foreground">SUPPRIMER</span> pour confirmer :
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Tapez SUPPRIMER"
              className="font-mono"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteDialogOpen(false)
                setDeleteConfirmText('')
              }}
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMemory}
              disabled={deleteConfirmText !== 'SUPPRIMER' || isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <div className="size-4 animate-spin rounded-full border-2 border-transparent border-t-current mr-2" />
                  Suppression...
                </>
              ) : (
                <>
                  <TrashIcon className="size-4 mr-2" />
                  Supprimer définitivement
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}
