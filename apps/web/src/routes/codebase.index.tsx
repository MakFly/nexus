import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useMemo, useRef } from 'react'
import hljs from 'highlight.js/lib/core'
import php from 'highlight.js/lib/languages/php'
import typescript from 'highlight.js/lib/languages/typescript'
import javascript from 'highlight.js/lib/languages/javascript'
import python from 'highlight.js/lib/languages/python'
import css from 'highlight.js/lib/languages/css'
import json from 'highlight.js/lib/languages/json'
import yaml from 'highlight.js/lib/languages/yaml'
import bash from 'highlight.js/lib/languages/bash'
import sql from 'highlight.js/lib/languages/sql'
import xml from 'highlight.js/lib/languages/xml'
import markdown from 'highlight.js/lib/languages/markdown'
import {
  FolderIcon,
  FolderOpenIcon,
  FileIcon,
  FileCodeIcon,
  PlusIcon,
  RefreshCwIcon,
  TrashIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ClockIcon,
  TerminalIcon,
  LayersIcon,
  BrainIcon,
  SparklesIcon,
  SearchIcon,
  CommandIcon,
  ZapIcon,
  HardDriveIcon,
  GitBranchIcon,
  XIcon,
  CopyIcon,
  CheckIcon,
  AlertTriangleIcon,
} from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useNexusStore, type Project, type ProjectTreeNode } from '@/stores/nexusStore'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/codebase/')({
  component: CodebasePage,
})

// Language icons mapping
const LANG_ICONS: Record<string, string> = {
  php: 'PHP',
  typescript: 'TS',
  ts: 'TS',
  javascript: 'JS',
  js: 'JS',
  python: 'PY',
  py: 'PY',
  rust: 'RS',
  rs: 'RS',
  go: 'GO',
  java: 'JV',
  css: 'CSS',
  html: 'HTM',
  json: 'JSN',
  yaml: 'YML',
  yml: 'YML',
  markdown: 'MD',
  md: 'MD',
  sql: 'SQL',
  shell: 'SH',
  bash: 'SH',
  sh: 'SH',
}

function CodebasePage() {
  const {
    projects,
    activeProject,
    isConnected,
    fetchProjects,
    setActiveProject,
    getProjectTree,
    createProject,
    deleteProject,
    open,
  } = useNexusStore()

  const [loading, setLoading] = useState(true)
  const [tree, setTree] = useState<ProjectTreeNode | null>(null)
  const [treeLoading, setTreeLoading] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectPath, setNewProjectPath] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())

  // File viewer state
  const [viewingFile, setViewingFile] = useState<{
    path: string
    content: string
    language?: string
  } | null>(null)
  const [fileLoading, setFileLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // Delete confirmation state
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')

  // Register highlight.js languages
  useEffect(() => {
    hljs.registerLanguage('php', php)
    hljs.registerLanguage('typescript', typescript)
    hljs.registerLanguage('javascript', javascript)
    hljs.registerLanguage('python', python)
    hljs.registerLanguage('css', css)
    hljs.registerLanguage('json', json)
    hljs.registerLanguage('yaml', yaml)
    hljs.registerLanguage('bash', bash)
    hljs.registerLanguage('sql', sql)
    hljs.registerLanguage('xml', xml)
    hljs.registerLanguage('markdown', markdown)
    hljs.registerLanguage('html', xml)
  }, [])

  // Initial load - connection checked by root loader
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      if (isConnected) {
        await fetchProjects()
      }
      setLoading(false)
    }
    init()
  }, [isConnected])

  // Load tree when active project changes
  useEffect(() => {
    if (activeProject) {
      setTreeLoading(true)
      setExpandedDirs(new Set())
      getProjectTree(activeProject.id)
        .then((t) => {
          setTree(t)
          // Auto-expand first level
          if (t?.children) {
            const firstLevel = t.children
              .filter((c) => c.type === 'directory')
              .slice(0, 3)
              .map((c) => c.path)
            setExpandedDirs(new Set(firstLevel))
          }
        })
        .catch(() => setTree(null))
        .finally(() => setTreeLoading(false))
    } else {
      setTree(null)
    }
  }, [activeProject])

  const handleCreateProject = async () => {
    if (!newProjectName || !newProjectPath) return
    try {
      await createProject(newProjectName, newProjectPath, newProjectDesc)
      setShowAddDialog(false)
      setNewProjectName('')
      setNewProjectPath('')
      setNewProjectDesc('')
    } catch (e) {
      // Error handled by store
    }
  }

  const handleDeleteProject = async () => {
    if (!projectToDelete) return
    await deleteProject(projectToDelete.id)
    setProjectToDelete(null)
    setDeleteConfirmation('')
  }

  const handleOpenFile = async (path: string, language?: string) => {
    setFileLoading(true)
    setViewingFile({ path, content: '', language })
    try {
      const result = await open(path)
      if (result) {
        setViewingFile({ path, content: result.content, language })
      } else {
        setViewingFile({ path, content: '// File not found or empty', language })
      }
    } catch (e) {
      setViewingFile({ path, content: '// Error loading file', language })
    } finally {
      setFileLoading(false)
    }
  }

  const handleCopyCode = async () => {
    if (!viewingFile?.content) return
    await navigator.clipboard.writeText(viewingFile.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toString()
  }

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return 'never'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-[oklch(0.12_0.01_260)] p-6">
          <div className="space-y-6">
            <Skeleton className="h-12 w-64 bg-white/5" />
            <div className="grid lg:grid-cols-[320px_1fr] gap-6">
              <Skeleton className="h-[500px] bg-white/5" />
              <Skeleton className="h-[500px] bg-white/5" />
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!isConnected) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-[oklch(0.12_0.01_260)] flex items-center justify-center">
          <div className="text-center space-y-6 animate-stagger stagger-1">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center border border-red-500/30">
              <TerminalIcon className="w-10 h-10 text-red-400" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-white mb-2">CONNECTION LOST</h2>
              <p className="font-mono-code text-sm text-white/50">
                API server unreachable at localhost:3001
              </p>
            </div>
            <Button
              onClick={() => window.location.reload()}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-mono-code"
            >
              <RefreshCwIcon className="w-4 h-4 mr-2" />
              RETRY CONNECTION
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-[oklch(0.12_0.01_260)] noise-overlay">
        <div className="p-6 space-y-6">
          {/* Header */}
          <header className="flex items-center justify-between animate-stagger stagger-1">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center border border-emerald-500/30 glow-emerald-subtle">
                <CommandIcon className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-white flex items-center gap-2">
                  CODEBASE
                  <span className="text-emerald-400 cursor-blink">_</span>
                </h1>
                <p className="font-mono-code text-xs text-white/40">
                  {projects.length} project{projects.length !== 1 ? 's' : ''} indexed
                </p>
              </div>
            </div>

            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-mono-code glow-emerald-subtle transition-all hover:glow-emerald">
                  <PlusIcon className="w-4 h-4 mr-2" />
                  NEW PROJECT
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[oklch(0.16_0.01_260)] border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle className="font-display text-xl">Initialize Project</DialogTitle>
                  <DialogDescription className="font-mono-code text-white/50">
                    Configure a new codebase for indexing
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="font-mono-code text-xs text-white/60 uppercase tracking-wider">
                      Project Name
                    </label>
                    <Input
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="my-awesome-project"
                      className="bg-white/5 border-white/10 text-white font-mono-code placeholder:text-white/30 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-mono-code text-xs text-white/60 uppercase tracking-wider">
                      Root Path
                    </label>
                    <Input
                      value={newProjectPath}
                      onChange={(e) => setNewProjectPath(e.target.value)}
                      placeholder="/home/user/projects/..."
                      className="bg-white/5 border-white/10 text-white font-mono-code placeholder:text-white/30 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-mono-code text-xs text-white/60 uppercase tracking-wider">
                      Description <span className="text-white/30">(optional)</span>
                    </label>
                    <Input
                      value={newProjectDesc}
                      onChange={(e) => setNewProjectDesc(e.target.value)}
                      placeholder="A brief description..."
                      className="bg-white/5 border-white/10 text-white font-mono-code placeholder:text-white/30 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddDialog(false)}
                    className="border-white/10 text-white/60 hover:text-white hover:bg-white/5 font-mono-code"
                  >
                    CANCEL
                  </Button>
                  <Button
                    onClick={handleCreateProject}
                    disabled={!newProjectName || !newProjectPath}
                    className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-mono-code disabled:opacity-30"
                  >
                    <ZapIcon className="w-4 h-4 mr-2" />
                    INITIALIZE
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </header>

          {/* Main Grid */}
          <div className="grid lg:grid-cols-[320px_1fr] gap-6">
            {/* Projects Sidebar */}
            <aside className="space-y-4 animate-stagger stagger-2">
              <div className="flex items-center justify-between">
                <h2 className="font-mono-code text-xs text-white/40 uppercase tracking-wider">
                  Projects
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fetchProjects()}
                  className="w-6 h-6 text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10"
                >
                  <RefreshCwIcon className="w-3 h-3" />
                </Button>
              </div>

              {projects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
                  <HardDriveIcon className="w-10 h-10 mx-auto text-white/20 mb-4" />
                  <p className="font-mono-code text-sm text-white/40">No projects yet</p>
                  <p className="font-mono-code text-xs text-white/20 mt-1">
                    Click "NEW PROJECT" to start
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {projects.map((project, idx) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      isActive={activeProject?.id === project.id}
                      onClick={() => setActiveProject(project)}
                      onDelete={() => setProjectToDelete(project)}
                      formatTime={formatRelativeTime}
                      formatNumber={formatNumber}
                      staggerIndex={idx + 3}
                    />
                  ))}
                </div>
              )}
            </aside>

            {/* Main Content */}
            <main className="space-y-4 animate-stagger stagger-3">
              {/* Project Header */}
              {activeProject ? (
                <>
                  <div className="rounded-xl bg-gradient-to-r from-[oklch(0.16_0.01_260)] to-[oklch(0.14_0.01_260)] border border-white/5 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                          <GitBranchIcon className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="font-display text-lg font-semibold text-white">
                            {activeProject.name}
                          </h3>
                          <p className="font-mono-code text-xs text-white/40 truncate max-w-md">
                            {activeProject.root_path}
                          </p>
                        </div>
                      </div>

                      {/* Stats Pills */}
                      <div className="flex items-center gap-2">
                        <StatPill
                          icon={FileIcon}
                          value={formatNumber(activeProject.file_count)}
                          label="files"
                          color="emerald"
                        />
                        <StatPill
                          icon={LayersIcon}
                          value={formatNumber(activeProject.chunk_count)}
                          label="chunks"
                          color="cyan"
                        />
                        <StatPill
                          icon={BrainIcon}
                          value={formatNumber(activeProject.memory_count)}
                          label="memories"
                          color="violet"
                        />
                        <StatPill
                          icon={SparklesIcon}
                          value={formatNumber(activeProject.pattern_count)}
                          label="patterns"
                          color="amber"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tree View */}
                  <div className="rounded-xl bg-[oklch(0.14_0.01_260)] border border-white/5 overflow-hidden">
                    {/* Search Bar */}
                    <div className="p-3 border-b border-white/5">
                      <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search files..."
                          className="pl-10 bg-white/5 border-white/10 text-white font-mono-code text-sm placeholder:text-white/30 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                        />
                      </div>
                    </div>

                    {/* Tree Content */}
                    <div className="p-3 max-h-[500px] overflow-y-auto scrollbar-command">
                      {treeLoading ? (
                        <div className="space-y-2">
                          {[...Array(12)].map((_, i) => (
                            <Skeleton
                              key={i}
                              className="h-6 bg-white/5"
                              style={{ marginLeft: `${(i % 4) * 16}px`, width: `${70 - (i % 3) * 10}%` }}
                            />
                          ))}
                        </div>
                      ) : tree ? (
                        <TreeView
                          node={tree}
                          level={0}
                          expandedDirs={expandedDirs}
                          toggleDir={toggleDir}
                          searchQuery={searchQuery}
                          onFileClick={handleOpenFile}
                        />
                      ) : (
                        <div className="py-12 text-center">
                          <FileIcon className="w-10 h-10 mx-auto text-white/20 mb-4" />
                          <p className="font-mono-code text-sm text-white/40">No files indexed</p>
                          <p className="font-mono-code text-xs text-white/20 mt-1">
                            Run the Python indexer for this project
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-xl bg-[oklch(0.14_0.01_260)] border border-white/5 p-12 text-center">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                    <FolderIcon className="w-8 h-8 text-white/20" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-white/80 mb-2">
                    Select a Project
                  </h3>
                  <p className="font-mono-code text-sm text-white/40 max-w-sm mx-auto">
                    Choose a project from the sidebar to explore its codebase structure
                  </p>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>

      {/* File Viewer Modal */}
      <Dialog open={!!viewingFile} onOpenChange={(open) => !open && setViewingFile(null)}>
        <DialogContent className="bg-[oklch(0.12_0.01_260)] border-white/10 text-white max-w-5xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <FileCodeIcon className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <DialogTitle className="font-mono-code text-sm text-white">
                    {viewingFile?.path}
                  </DialogTitle>
                  <DialogDescription className="font-mono-code text-xs text-white/40">
                    {viewingFile?.language?.toUpperCase() || 'TEXT'}
                  </DialogDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyCode}
                className="w-8 h-8 text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10"
              >
                {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {fileLoading ? (
              <div className="p-6 space-y-2">
                {[...Array(15)].map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-4 bg-white/5"
                    style={{ width: `${60 + Math.random() * 35}%` }}
                  />
                ))}
              </div>
            ) : viewingFile?.content ? (
              <div className="relative">
                {/* Line numbers */}
                <div className="absolute left-0 top-0 bottom-0 w-12 bg-[oklch(0.10_0.01_260)] border-r border-white/5 text-white/20 text-sm font-mono-code text-right pr-3 pt-4 select-none overflow-hidden z-10">
                  {viewingFile.content.split('\n').map((_, i) => (
                    <div key={i} className="leading-[1.6]">
                      {i + 1}
                    </div>
                  ))}
                </div>
                {/* Highlighted code */}
                <div className="pl-14">
                  <SyntaxHighlighter
                    code={viewingFile.content}
                    language={viewingFile.language || 'text'}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!projectToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setProjectToDelete(null)
            setDeleteConfirmation('')
          }
        }}
      >
        <AlertDialogContent className="bg-[oklch(0.16_0.01_260)] border-white/10 text-white">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
                <AlertTriangleIcon className="w-5 h-5 text-red-400" />
              </div>
              <AlertDialogTitle className="font-display text-lg">
                Delete Project
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="font-mono-code text-white/60 space-y-3">
              <div>
                Are you sure you want to delete <span className="text-white font-semibold">"{projectToDelete?.name}"</span>?
              </div>
              <div className="text-red-400/80">
                This will remove all indexed files and cannot be undone.
              </div>
              <div className="pt-2">
                Type <span className="text-red-400 font-bold">DELETE</span> to confirm:
              </div>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value.toUpperCase())}
                placeholder="DELETE"
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white font-mono-code text-sm focus:outline-none focus:border-red-500/50 placeholder:text-white/20"
                autoComplete="off"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setProjectToDelete(null)
                setDeleteConfirmation('')
              }}
              className="border-white/10 text-white/60 hover:text-white hover:bg-white/5 font-mono-code"
            >
              CANCEL
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              disabled={deleteConfirmation !== 'DELETE'}
              className={`font-mono-code ${
                deleteConfirmation === 'DELETE'
                  ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                  : 'bg-white/5 text-white/30 border border-white/10 cursor-not-allowed'
              }`}
            >
              <TrashIcon className="w-4 h-4 mr-2" />
              DELETE
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}

// Syntax Highlighter Component
function SyntaxHighlighter({ code, language }: { code: string; language: string }) {
  const preRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    if (preRef.current) {
      const result = hljs.highlight(code, { language: language.toLowerCase() || 'plaintext' })
      preRef.current.innerHTML = result.value
    }
  }, [code, language])

  return (
    <pre ref={preRef} className="hljs p-4 m-0 text-sm leading-relaxed">
      <code>{code}</code>
    </pre>
  )
}

// Project Card Component
function ProjectCard({
  project,
  isActive,
  onClick,
  onDelete,
  formatTime,
  formatNumber,
  staggerIndex,
}: {
  project: Project
  isActive: boolean
  onClick: () => void
  onDelete: () => void
  formatTime: (date?: string) => string
  formatNumber: (n: number) => string
  staggerIndex: number
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative rounded-xl p-4 cursor-pointer transition-all duration-200 animate-stagger',
        `stagger-${Math.min(staggerIndex, 8)}`,
        isActive
          ? 'bg-gradient-to-r from-emerald-500/10 to-cyan-500/5 border border-emerald-500/30 glow-emerald-subtle'
          : 'bg-[oklch(0.14_0.01_260)] border border-white/5 hover:border-white/10 hover:bg-[oklch(0.16_0.01_260)]'
      )}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-400 rounded-r-full" />
      )}

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors',
              isActive
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-white/5 text-white/40 group-hover:text-white/60'
            )}
          >
            {isActive ? (
              <FolderOpenIcon className="w-5 h-5" />
            ) : (
              <FolderIcon className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0">
            <h3
              className={cn(
                'font-display font-medium truncate transition-colors',
                isActive ? 'text-emerald-400' : 'text-white/80 group-hover:text-white'
              )}
            >
              {project.name}
            </h3>
            <p className="font-mono-code text-[10px] text-white/30 truncate">
              {project.root_path}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="w-7 h-7 opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <TrashIcon className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5">
        <div className="flex items-center gap-1.5 font-mono-code text-[10px]">
          <FileIcon className="w-3 h-3 text-white/30" />
          <span className="text-white/50">{formatNumber(project.file_count)}</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono-code text-[10px]">
          <LayersIcon className="w-3 h-3 text-white/30" />
          <span className="text-white/50">{formatNumber(project.chunk_count)}</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono-code text-[10px] ml-auto">
          <ClockIcon className="w-3 h-3 text-white/30" />
          <span className="text-white/40">{formatTime(project.last_indexed_at)}</span>
        </div>
      </div>
    </div>
  )
}

// Stat Pill Component
function StatPill({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  value: string
  label: string
  color: 'emerald' | 'cyan' | 'violet' | 'amber'
}) {
  const colorClasses = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono-code text-xs',
        colorClasses[color]
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="font-semibold">{value}</span>
      <span className="text-white/30 hidden sm:inline">{label}</span>
    </div>
  )
}

// Tree View Component
function TreeView({
  node,
  level,
  expandedDirs,
  toggleDir,
  searchQuery,
  onFileClick,
}: {
  node: ProjectTreeNode
  level: number
  expandedDirs: Set<string>
  toggleDir: (path: string) => void
  searchQuery: string
  onFileClick: (path: string, language?: string) => void
}) {
  const isExpanded = expandedDirs.has(node.path)

  // Filter logic for search
  const matchesSearch = useMemo(() => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    if (node.name.toLowerCase().includes(query)) return true
    if (node.type === 'directory' && node.children) {
      return node.children.some((child) => {
        if (child.name.toLowerCase().includes(query)) return true
        if (child.type === 'directory' && child.children) {
          return child.children.some((c) => c.name.toLowerCase().includes(query))
        }
        return false
      })
    }
    return false
  }, [node, searchQuery])

  if (!matchesSearch) return null

  if (node.type === 'file') {
    const lang = node.language?.toLowerCase() || 'default'
    const langLabel = LANG_ICONS[lang] || lang.toUpperCase().slice(0, 3)

    return (
      <div
        onClick={() => onFileClick(node.path, node.language)}
        className="group flex items-center gap-2 py-1 px-2 hover:bg-white/5 rounded cursor-pointer transition-colors"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        <FileCodeIcon className="w-4 h-4 text-white/30 shrink-0" />
        <span className="font-mono-code text-sm text-white/70 group-hover:text-white truncate">
          {node.name}
        </span>
        {node.language && (
          <span
            className={cn(
              'ml-auto px-1.5 py-0.5 rounded text-[9px] font-mono-code font-semibold shrink-0',
              `lang-${lang}`
            )}
            style={{
              backgroundColor: 'var(--lang-color, oklch(0.6 0.05 260))',
              color: 'oklch(0.98 0 0)',
              opacity: 0.8,
            }}
          >
            {langLabel}
          </span>
        )}
        {node.chunk_count !== undefined && node.chunk_count > 0 && (
          <span className="font-mono-code text-[10px] text-white/20 shrink-0">
            {node.chunk_count}
          </span>
        )}
      </div>
    )
  }

  // Directory
  return (
    <Collapsible open={isExpanded} onOpenChange={() => toggleDir(node.path)}>
      <CollapsibleTrigger asChild>
        <div
          className="group flex items-center gap-2 py-1 px-2 hover:bg-white/5 rounded cursor-pointer transition-colors"
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4 text-white/30 shrink-0" />
          ) : (
            <ChevronRightIcon className="w-4 h-4 text-white/30 shrink-0" />
          )}
          {isExpanded ? (
            <FolderOpenIcon className="w-4 h-4 text-amber-400/80 shrink-0" />
          ) : (
            <FolderIcon className="w-4 h-4 text-amber-400/60 shrink-0" />
          )}
          <span className="font-mono-code text-sm text-white/80 group-hover:text-white font-medium truncate">
            {node.name}
          </span>
          {node.file_count !== undefined && node.file_count > 0 && (
            <span className="font-mono-code text-[10px] text-white/20 ml-auto shrink-0">
              {node.file_count}
            </span>
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="tree-line ml-4">
          {node.children?.map((child, i) => (
            <TreeView
              key={`${child.path}-${i}`}
              node={child}
              level={level + 1}
              expandedDirs={expandedDirs}
              toggleDir={toggleDir}
              searchQuery={searchQuery}
              onFileClick={onFileClick}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
