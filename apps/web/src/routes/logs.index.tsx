import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ScrollTextIcon,
  RefreshCwIcon,
  CircleIcon,
  WifiIcon,
  WifiOffIcon,
  TrashIcon,
  PauseIcon,
  PlayIcon,
  TerminalIcon,
  FileIcon,
  ZapIcon,
  LoaderIcon,
  SearchIcon,
  ListIcon,
  GlobeIcon,
  DatabaseIcon,
  BrainIcon,
  BookOpenIcon,
  FolderIcon,
} from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNexusStore } from '@/stores/nexusStore'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/logs/')({
  component: LogsPage,
})

// Types
interface HookObservation {
  id: number
  session_id: string
  hook_name: 'sessionStart' | 'postTool' | 'sessionEnd'
  payload: Record<string, any>
  timestamp: number
  created_at?: number
}

// Hook name config
const HOOK_CONFIG: Record<string, { icon: typeof ZapIcon; color: string; label: string; bg: string }> = {
  sessionStart: {
    icon: PlayIcon,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    label: 'Session Start',
  },
  postTool: {
    icon: TerminalIcon,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    label: 'Tool Use',
  },
  sessionEnd: {
    icon: CircleIcon,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    label: 'Session End',
  },
}

// Format timestamp
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// Tool icons mapping
const TOOL_ICONS: Record<string, typeof TerminalIcon> = {
  Bash: TerminalIcon,
  Read: FileIcon,
  Write: FileIcon,
  Edit: FileIcon,
  Grep: SearchIcon,
  Glob: SearchIcon,
  TodoWrite: ListIcon,
  Task: ZapIcon,
  WebFetch: GlobeIcon,
  WebSearch: GlobeIcon,
  mcp__nexus__nexus_code: DatabaseIcon,
  mcp__nexus__nexus_memory: BrainIcon,
  mcp__nexus__nexus_learn: BookOpenIcon,
}

// Extract tool details for display
function getToolDetails(payload: Record<string, any>): { name: string; detail: string; icon: typeof TerminalIcon } {
  const toolName = payload.tool_name || 'Unknown'
  const input = payload.tool_input || {}

  // Get appropriate icon
  const icon = TOOL_ICONS[toolName] || TerminalIcon

  // Extract relevant detail based on tool type
  let detail = ''

  if (toolName === 'Bash') {
    detail = input.command ? `$ ${input.command.slice(0, 80)}${input.command.length > 80 ? '...' : ''}` : ''
  } else if (toolName === 'Read' || toolName === 'Write' || toolName === 'Edit') {
    detail = input.file_path || ''
  } else if (toolName === 'Grep') {
    detail = `"${input.pattern}" ${input.path ? `in ${input.path}` : ''}`
  } else if (toolName === 'Glob') {
    detail = input.pattern || ''
  } else if (toolName === 'TodoWrite') {
    const todos = input.todos || []
    detail = `${todos.length} todo(s)`
  } else if (toolName === 'Task') {
    detail = input.description || input.prompt?.slice(0, 50) || ''
  } else if (toolName.startsWith('mcp__nexus__')) {
    const action = input.action || ''
    const query = input.query || input.path || ''
    detail = `${action}${query ? `: ${query.slice(0, 50)}` : ''}`
  } else if (input.file_path) {
    detail = input.file_path
  } else if (input.query) {
    detail = input.query.slice(0, 60)
  } else if (input.command) {
    detail = input.command.slice(0, 60)
  }

  return { name: toolName, detail, icon }
}

// Format session ID to be more readable
function formatSessionId(sessionId: string): string {
  if (sessionId.startsWith('cc-')) {
    return sessionId.slice(0, 15) + '...'
  }
  if (sessionId.startsWith('unknown-')) {
    // Extract timestamp and make it readable
    const ts = sessionId.replace('unknown-', '')
    if (/^\d+$/.test(ts)) {
      const date = new Date(parseInt(ts))
      return `session-${date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}`
    }
  }
  return sessionId.slice(0, 15) + (sessionId.length > 15 ? '...' : '')
}

// Log entry component
function LogEntry({ log }: { log: HookObservation }) {
  const config = HOOK_CONFIG[log.hook_name] || HOOK_CONFIG.postTool
  const HookIcon = config.icon

  // For tool use, get detailed info
  const toolInfo = log.hook_name === 'postTool' ? getToolDetails(log.payload) : null
  const ToolIcon = toolInfo?.icon || TerminalIcon

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 border-b border-border/50 hover:bg-muted/30 transition-colors',
      config.bg
    )}>
      <div className={cn('mt-0.5', config.color)}>
        {log.hook_name === 'postTool' ? (
          <ToolIcon className="h-4 w-4" />
        ) : (
          <HookIcon className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs text-muted-foreground">
            {formatTime(log.timestamp)}
          </span>
          {log.hook_name === 'postTool' && toolInfo ? (
            <Badge variant="default" className="text-xs bg-blue-600">
              {toolInfo.name}
            </Badge>
          ) : (
            <Badge variant="outline" className={cn('text-xs', config.color)}>
              {config.label}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground/60 font-mono">
            {formatSessionId(log.session_id)}
          </span>
        </div>
        <div className="mt-1 text-sm">
          {log.hook_name === 'sessionStart' && (
            <div className="flex items-center gap-2">
              <FolderIcon className="h-3 w-3 text-green-400" />
              <strong className="text-green-400">{log.payload.project}</strong>
              {log.payload.cwd && (
                <span className="text-muted-foreground text-xs truncate max-w-[300px]">
                  {log.payload.cwd}
                </span>
              )}
            </div>
          )}
          {log.hook_name === 'postTool' && toolInfo && (
            <div className="font-mono text-xs text-muted-foreground truncate max-w-[500px]">
              {toolInfo.detail || <span className="italic">no details</span>}
            </div>
          )}
          {log.hook_name === 'sessionEnd' && (
            <div className="flex items-center gap-2">
              <FolderIcon className="h-3 w-3 text-orange-400" />
              <strong className="text-orange-400">{log.payload.project}</strong>
              <span className="text-muted-foreground text-xs">session ended</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function LogsPage() {
  const { apiBaseUrl, isConnected } = useNexusStore()
  const [logs, setLogs] = useState<HookObservation[]>([])
  const [sseStatus, setSseStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')
  const [isPaused, setIsPaused] = useState(false)
  const [activeTab, setActiveTab] = useState('hooks')

  const scrollRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const pausedLogsRef = useRef<HookObservation[]>([])

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [])

  // Load initial history
  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/capture/history?limit=50`)
      if (response.ok) {
        const data = await response.json()
        // Reverse to show oldest first (chronological order)
        setLogs(data.observations.reverse())
        setTimeout(scrollToBottom, 100)
      }
    } catch (e) {
      console.error('Failed to load history:', e)
    }
  }, [apiBaseUrl, scrollToBottom])

  // Connect to SSE
  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    setSseStatus('connecting')
    const es = new EventSource(`${apiBaseUrl}/capture/stream`)
    eventSourceRef.current = es

    es.addEventListener('connected', () => {
      setSseStatus('connected')
      console.log('[SSE] Connected to hook stream')
    })

    es.addEventListener('hook', (event) => {
      const observation = JSON.parse(event.data) as HookObservation

      if (isPaused) {
        pausedLogsRef.current.push(observation)
      } else {
        setLogs((prev) => [...prev, observation])
        setTimeout(scrollToBottom, 50)
      }
    })

    es.addEventListener('heartbeat', () => {
      // Keep alive received
    })

    es.onerror = () => {
      setSseStatus('disconnected')
      console.log('[SSE] Disconnected, will retry in 5s')
      // Attempt reconnection after 5s
      setTimeout(() => {
        if (eventSourceRef.current === es) {
          connectSSE()
        }
      }, 5000)
    }
  }, [apiBaseUrl, isPaused, scrollToBottom])

  // Initial setup
  useEffect(() => {
    if (isConnected) {
      loadHistory()
      connectSSE()
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [isConnected, loadHistory, connectSSE])

  // Handle pause/resume
  const handlePauseToggle = () => {
    if (isPaused) {
      // Resume: add paused logs
      setLogs((prev) => [...prev, ...pausedLogsRef.current])
      pausedLogsRef.current = []
      setTimeout(scrollToBottom, 50)
    }
    setIsPaused(!isPaused)
  }

  // Clear logs
  const clearLogs = () => {
    setLogs([])
    pausedLogsRef.current = []
  }

  // Reconnect
  const handleReconnect = () => {
    connectSSE()
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 h-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <ScrollTextIcon className="h-8 w-8" />
              Logs
            </h1>
            <p className="text-muted-foreground">
              Real-time hook events from Claude Code
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Connection status */}
            <Badge
              variant={sseStatus === 'connected' ? 'default' : 'secondary'}
              className={cn(
                'cursor-pointer',
                sseStatus === 'connected' && 'bg-green-500 hover:bg-green-600',
                sseStatus === 'connecting' && 'bg-yellow-500',
              )}
              onClick={handleReconnect}
            >
              {sseStatus === 'connected' ? (
                <WifiIcon className="h-3 w-3 mr-1" />
              ) : sseStatus === 'connecting' ? (
                <LoaderIcon className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <WifiOffIcon className="h-3 w-3 mr-1" />
              )}
              {sseStatus === 'connected' ? 'Live' : sseStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {logs.length} events
            </span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="hooks">
                <ZapIcon className="h-4 w-4 mr-2" />
                Hooks Logs
              </TabsTrigger>
              <TabsTrigger value="system" disabled>
                <TerminalIcon className="h-4 w-4 mr-2" />
                System Logs
              </TabsTrigger>
            </TabsList>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePauseToggle}
              >
                {isPaused ? (
                  <>
                    <PlayIcon className="h-4 w-4 mr-1" />
                    Resume
                    {pausedLogsRef.current.length > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        +{pausedLogsRef.current.length}
                      </Badge>
                    )}
                  </>
                ) : (
                  <>
                    <PauseIcon className="h-4 w-4 mr-1" />
                    Pause
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={clearLogs}>
                <TrashIcon className="h-4 w-4 mr-1" />
                Clear
              </Button>
              <Button variant="outline" size="sm" onClick={loadHistory}>
                <RefreshCwIcon className="h-4 w-4 mr-1" />
                Reload
              </Button>
            </div>
          </div>

          <TabsContent value="hooks" className="flex-1 mt-4">
            <Card className="h-[calc(100vh-280px)]">
              <CardHeader className="py-3 border-b">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ZapIcon className="h-4 w-4" />
                  Claude Code Hook Events
                  {isPaused && (
                    <Badge variant="outline" className="ml-2 text-yellow-500 border-yellow-500">
                      Paused
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <ScrollArea className="h-[calc(100%-56px)]" ref={scrollRef}>
                <CardContent className="p-0">
                  {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <ScrollTextIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">No hook events yet</p>
                      <p className="text-sm text-muted-foreground">
                        Events will appear here when Claude Code hooks trigger
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/50">
                      {logs.map((log) => (
                        <LogEntry key={`${log.id}-${log.timestamp}`} log={log} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="flex-1 mt-4">
            <Card className="h-[calc(100vh-280px)]">
              <CardContent className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">System logs coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
