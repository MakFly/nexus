import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import {
  useNexusStore,
  type PatternCompact,
  type PatternFull,
  type CandidateCompact,
} from '@/stores/nexusStore'
import {
  BookOpenIcon,
  PackageIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  EditIcon,
  CheckCircleIcon,
  ZapIcon,
  CodeIcon,
  FolderIcon,
  GitCommitIcon,
  ChevronRightIcon,
  TagIcon,
  TargetIcon,
  ListChecksIcon,
  AlertTriangleIcon,
  FileCodeIcon,
  ServerOffIcon,
} from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

import { LearningSkeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/learning/')({
  component: LearningPage,
  pendingComponent: () => <AppLayout><LearningSkeleton /></AppLayout>,
})

function LearningPage() {
  const {
    isConnected,
    recallPatterns,
    getPattern,
    getPatternTemplates,
    createPattern,
    deletePattern,
    listCandidates,
    distillCandidate,
    recordFeedback,
  } = useNexusStore()

  // Patterns state
  const [patterns, setPatterns] = useState<PatternCompact[]>([])
  const [selectedPattern, setSelectedPattern] = useState<PatternFull | null>(null)
  const [patternTemplates, setPatternTemplates] = useState<{
    variables: any[]
    templates: any[]
    checklist: string[]
    gotchas: string[]
  } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  // Candidates state
  const [candidates, setCandidates] = useState<CandidateCompact[]>([])
  const [candidatesLoading, setCandidatesLoading] = useState(false)

  // Dialog state
  const [isPatternDialogOpen, setIsPatternDialogOpen] = useState(false)
  const [isDistillDialogOpen, setIsDistillDialogOpen] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateCompact | null>(null)
  const [distillForm, setDistillForm] = useState({
    intent: '',
    title: '',
  })

  // Load patterns
  const loadPatterns = useCallback(async () => {
    setLoading(true)
    try {
      const result = await recallPatterns(searchQuery || undefined)
      setPatterns(result)
    } catch (e) {
      console.error('Failed to load patterns:', e)
    } finally {
      setLoading(false)
    }
  }, [recallPatterns, searchQuery])

  // Load candidates
  const loadCandidates = useCallback(async () => {
    setCandidatesLoading(true)
    try {
      const result = await listCandidates('pending')
      setCandidates(result)
    } catch (e) {
      console.error('Failed to load candidates:', e)
    } finally {
      setCandidatesLoading(false)
    }
  }, [listCandidates])

  // Initial load - connection checked by root loader
  useEffect(() => {
    if (isConnected) {
      loadPatterns()
      loadCandidates()
    } else {
      setLoading(false)
    }
  }, [isConnected])

  // Reload patterns on search change
  useEffect(() => {
    if (isConnected) {
      const timer = setTimeout(() => {
        loadPatterns()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [searchQuery, isConnected, loadPatterns])

  // Load pattern details
  const loadPatternDetails = async (id: number) => {
    try {
      const pattern = await getPattern(id)
      setSelectedPattern(pattern)

      const templates = await getPatternTemplates(id)
      setPatternTemplates(templates)
    } catch (e) {
      toast.error('Failed to load pattern details')
    }
  }

  // Handle distill
  const handleDistill = async () => {
    if (!selectedCandidate || !distillForm.intent || !distillForm.title) {
      toast.error('Intent and title are required')
      return
    }

    try {
      await distillCandidate({
        candidateId: selectedCandidate.id,
        intent: distillForm.intent,
        title: distillForm.title,
      })
      toast.success('Pattern created from candidate')
      setIsDistillDialogOpen(false)
      setSelectedCandidate(null)
      setDistillForm({ intent: '', title: '' })
      loadPatterns()
      loadCandidates()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Distill failed')
    }
  }

  // Handle delete pattern
  const handleDeletePattern = async (id: number) => {
    try {
      await deletePattern(id)
      toast.success('Pattern deleted')
      loadPatterns()
      if (selectedPattern?.id === id) {
        setSelectedPattern(null)
        setPatternTemplates(null)
      }
    } catch (e) {
      toast.error('Failed to delete pattern')
    }
  }

  // Handle feedback
  const handleFeedback = async (patternId: number, outcome: 'success' | 'fail') => {
    try {
      await recordFeedback(patternId, outcome)
      toast.success(`Feedback recorded: ${outcome}`)
      loadPatterns()
    } catch (e) {
      toast.error('Failed to record feedback')
    }
  }

  const getCandidateIcon = (kind: string) => {
    switch (kind) {
      case 'diff':
        return GitCommitIcon
      case 'chunks':
        return CodeIcon
      case 'folder':
        return FolderIcon
      default:
        return PackageIcon
    }
  }

  // Loading state - show skeleton
  if (loading) {
    return <AppLayout><LearningSkeleton /></AppLayout>
  }

  // API disconnected - show error
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
              Start the Nexus API server to manage patterns.
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Learning</h2>
            <p className="text-muted-foreground">
              Patterns and templates for code generation
            </p>
          </div>
        </div>

        <Tabs defaultValue="patterns" className="space-y-4">
          <TabsList>
            <TabsTrigger value="patterns" className="gap-2">
              <BookOpenIcon className="h-4 w-4" />
              Patterns ({patterns.length})
            </TabsTrigger>
            <TabsTrigger value="candidates" className="gap-2">
              <PackageIcon className="h-4 w-4" />
              Candidates ({candidates.length})
            </TabsTrigger>
          </TabsList>

          {/* PATTERNS TAB */}
          <TabsContent value="patterns" className="space-y-4">
            {/* Search */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search patterns by intent..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Patterns Grid */}
            {!loading && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Patterns List */}
                <div className="lg:col-span-1 space-y-2">
                  {patterns.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <BookOpenIcon className="mb-4 h-12 w-12 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No patterns found</p>
                    </div>
                  ) : (
                    patterns.map((pattern) => (
                      <Card
                        key={pattern.id}
                        className={cn(
                          'cursor-pointer transition-all hover:shadow-md',
                          selectedPattern?.id === pattern.id && 'border-primary'
                        )}
                        onClick={() => loadPatternDetails(pattern.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm truncate">
                                {pattern.title}
                              </h4>
                              <p className="text-xs text-muted-foreground truncate">
                                {pattern.intent}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleFeedback(pattern.id, 'success')
                                }}
                              >
                                <CheckCircleIcon className="h-3 w-3 text-green-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleFeedback(pattern.id, 'fail')
                                }}
                              >
                                <XCircleIcon className="h-3 w-3 text-red-500" />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <Progress
                              value={pattern.success_rate * 100}
                              className="h-1.5 flex-1"
                            />
                            <span className="text-xs text-muted-foreground">
                              {Math.round(pattern.success_rate * 100)}%
                            </span>
                          </div>
                          {pattern.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {pattern.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>

                {/* Pattern Detail */}
                <div className="lg:col-span-2">
                  {selectedPattern && patternTemplates ? (
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div>
                          <CardTitle>{selectedPattern.title}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {selectedPattern.intent}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePattern(selectedPattern.id)}
                        >
                          <Trash2Icon className="h-4 w-4 text-destructive" />
                        </Button>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Constraints */}
                        {Object.keys(selectedPattern.constraints).length > 0 && (
                          <div>
                            <h5 className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-2">
                              <TargetIcon className="h-3 w-3" /> Constraints
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {selectedPattern.constraints.lang && (
                                <Badge variant="secondary">
                                  lang: {selectedPattern.constraints.lang}
                                </Badge>
                              )}
                              {selectedPattern.constraints.framework && (
                                <Badge variant="secondary">
                                  framework: {selectedPattern.constraints.framework}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Variables */}
                        {patternTemplates.variables.length > 0 && (
                          <div>
                            <h5 className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-2">
                              <TagIcon className="h-3 w-3" /> Variables
                            </h5>
                            <div className="space-y-1">
                              {patternTemplates.variables.map((v: any, i: number) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 text-sm bg-muted/50 px-2 py-1 rounded"
                                >
                                  <code className="text-primary">{`{{${v.name}}}`}</code>
                                  <span className="text-muted-foreground">
                                    ({v.type}
                                    {v.transform && `, ${v.transform}`})
                                  </span>
                                  {v.default && (
                                    <span className="text-xs">default: {v.default}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Templates */}
                        {patternTemplates.templates.length > 0 && (
                          <div>
                            <h5 className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-2">
                              <FileCodeIcon className="h-3 w-3" /> Templates (
                              {patternTemplates.templates.length})
                            </h5>
                            <div className="space-y-2">
                              {patternTemplates.templates.map((t: any, i: number) => (
                                <div
                                  key={i}
                                  className="border rounded-lg overflow-hidden"
                                >
                                  <div className="bg-muted px-3 py-1.5 text-xs font-mono">
                                    {t.path}
                                  </div>
                                  <pre className="p-3 text-xs overflow-x-auto max-h-40">
                                    {t.content.substring(0, 500)}
                                    {t.content.length > 500 && '...'}
                                  </pre>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Checklist */}
                        {patternTemplates.checklist.length > 0 && (
                          <div>
                            <h5 className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-2">
                              <ListChecksIcon className="h-3 w-3" /> Checklist
                            </h5>
                            <ul className="space-y-1">
                              {patternTemplates.checklist.map((item: string, i: number) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-sm"
                                >
                                  <ChevronRightIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Gotchas */}
                        {patternTemplates.gotchas.length > 0 && (
                          <div>
                            <h5 className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-2">
                              <AlertTriangleIcon className="h-3 w-3" /> Gotchas
                            </h5>
                            <ul className="space-y-1">
                              {patternTemplates.gotchas.map((item: string, i: number) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-sm text-orange-600"
                                >
                                  <AlertTriangleIcon className="h-4 w-4 shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Stats */}
                        <div className="flex items-center gap-4 pt-2 border-t text-xs text-muted-foreground">
                          <span>Usage: {selectedPattern.usage_count}</span>
                          <span>
                            Success: {Math.round(selectedPattern.success_rate * 100)}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <BookOpenIcon className="mb-4 h-12 w-12 text-muted-foreground/50" />
                      <p className="text-muted-foreground">
                        Select a pattern to view details
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* CANDIDATES TAB */}
          <TabsContent value="candidates" className="space-y-4">
            {candidatesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : candidates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <PackageIcon className="mb-4 h-16 w-16 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold">No pending candidates</h3>
                <p className="text-muted-foreground">
                  Capture code examples to create patterns
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {candidates.map((candidate) => {
                  const Icon = getCandidateIcon(candidate.kind)
                  return (
                    <Card key={candidate.id} className="group">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                              <Icon className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm">
                                {candidate.label || `Candidate #${candidate.id}`}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {candidate.kind} - {candidate.sources.length} sources
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant={
                              candidate.status === 'pending'
                                ? 'outline'
                                : candidate.status === 'distilled'
                                  ? 'default'
                                  : 'secondary'
                            }
                          >
                            {candidate.status}
                          </Badge>
                        </div>

                        {candidate.tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {candidate.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="mt-4 flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setSelectedCandidate(candidate)
                              setDistillForm({ intent: '', title: candidate.label || '' })
                              setIsDistillDialogOpen(true)
                            }}
                          >
                            <ZapIcon className="h-3 w-3 mr-1" />
                            Distill
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Distill Dialog */}
      <Dialog open={isDistillDialogOpen} onOpenChange={setIsDistillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Distill to Pattern</DialogTitle>
            <DialogDescription>
              Transform this candidate into a reusable pattern
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Intent</label>
              <Input
                placeholder="What does this pattern do? e.g., 'Create a new API endpoint'"
                value={distillForm.intent}
                onChange={(e) =>
                  setDistillForm({ ...distillForm, intent: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="Pattern name e.g., 'REST Endpoint Pattern'"
                value={distillForm.title}
                onChange={(e) =>
                  setDistillForm({ ...distillForm, title: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDistillDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDistill}>
              <ZapIcon className="h-4 w-4 mr-2" />
              Distill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
