import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import {
  MonitorIcon,
  RefreshCwIcon,
  TerminalIcon,
  BrainIcon,
  SparklesIcon,
  AlertCircleIcon,
  CircleIcon,
  CheckCircle2Icon,
  DollarSignIcon,
  ClockIcon,
} from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useNexusStore } from '@/stores/nexusStore'
import type { ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/sessions/')({
  component: SessionsPage,
})

// Types
type CliType = 'claude-code' | 'codex' | 'gemini' | 'unknown'
type SessionStatus = 'active' | 'idle' | 'ended'

interface ModelUsage {
  inputTokens: number
  outputTokens: number
  costUSD: number
}

interface CliSession {
  id: string
  cli_type: CliType
  llm_model: string
  llm_provider: string
  project_path: string
  project_name: string
  status: SessionStatus
  started_at: number
  last_activity_at: number
  duration_seconds: number
  tokens_used: number
  cost_usd: number
  model_usage: Record<string, ModelUsage>
  config_source: string
  pid?: number
  tty?: string
}

interface SessionsSummary {
  total: number
  active: number
  by_cli: Record<CliType, number>
  by_model: Record<string, number>
  total_cost: number
}

interface SessionsResponse {
  sessions: CliSession[]
  summary: SessionsSummary
  last_updated: number
  ccs_current?: string
}

// CLI Icons and colors
const CLI_CONFIG: Record<CliType, { icon: typeof TerminalIcon; color: string; bgColor: string; label: string }> = {
  'claude-code': {
    icon: TerminalIcon,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    label: 'Claude Code',
  },
  codex: {
    icon: BrainIcon,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    label: 'Codex',
  },
  gemini: {
    icon: SparklesIcon,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    label: 'Gemini',
  },
  unknown: {
    icon: AlertCircleIcon,
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    label: 'Unknown',
  },
}

// Status badge
function StatusBadge({ status }: { status: SessionStatus }) {
  if (status === 'active') {
    return (
      <Badge variant="default" className="bg-green-500 text-white">
        <CheckCircle2Icon className="h-3 w-3 mr-1" />
        Active
      </Badge>
    )
  }
  if (status === 'idle') {
    return (
      <Badge variant="secondary">
        <CircleIcon className="h-3 w-3 mr-1" />
        Idle
      </Badge>
    )
  }
  return (
    <Badge variant="outline">
      <CircleIcon className="h-3 w-3 mr-1" />
      Ended
    </Badge>
  )
}

// Format duration
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${mins}m`
}

// Format cost
function formatCost(cost: number): string {
  if (cost === 0) return '-'
  if (cost < 0.01) return '<$0.01'
  return `$${cost.toFixed(2)}`
}

// Table columns
const columns: ColumnDef<CliSession>[] = [
  {
    id: 'tty',
    accessorKey: 'tty',
    header: 'TTY',
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.tty || '-'}
      </span>
    ),
  },
  {
    id: 'cli',
    accessorKey: 'cli_type',
    header: 'CLI',
    cell: ({ row }) => {
      const cli = row.original.cli_type
      const config = CLI_CONFIG[cli]
      const Icon = config.icon
      return (
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${config.color}`} />
          <span className="font-medium">{config.label}</span>
        </div>
      )
    },
  },
  {
    id: 'model',
    accessorKey: 'llm_model',
    header: 'Model',
    cell: ({ row }) => {
      const model = row.original.llm_model
      const isGlm = model.includes('glm')
      return (
        <Badge
          variant="outline"
          className={`font-mono text-xs ${isGlm ? 'border-purple-500 text-purple-500' : 'border-orange-500 text-orange-500'}`}
        >
          {model}
        </Badge>
      )
    },
  },
  {
    id: 'project',
    accessorKey: 'project_name',
    header: 'Project',
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.project_name}</span>
        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
          {row.original.project_path}
        </span>
      </div>
    ),
  },
  {
    id: 'cost',
    accessorKey: 'cost_usd',
    header: 'Cost',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatCost(row.original.cost_usd)}</span>
    ),
  },
  {
    id: 'duration',
    accessorKey: 'duration_seconds',
    header: 'Duration',
    cell: ({ row }) => (
      <span className="text-sm">{formatDuration(row.original.duration_seconds)}</span>
    ),
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
]

function SessionsPage() {
  const { apiBaseUrl, isConnected } = useNexusStore()
  const [data, setData] = useState<SessionsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterCli, setFilterCli] = useState<string>('all')
  const [filterModel, setFilterModel] = useState<string>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchSessions = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`${apiBaseUrl}/sessions`)
      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.status}`)
      }
      const result = await response.json()
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [apiBaseUrl])

  // Initial fetch
  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // Auto-refresh every 30s
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(fetchSessions, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchSessions])

  // Filter sessions
  const filteredSessions = data?.sessions.filter((s) => {
    if (filterCli !== 'all' && s.cli_type !== filterCli) return false
    if (filterModel !== 'all' && s.llm_model !== filterModel) return false
    return true
  }) || []

  // Get unique models for filter
  const uniqueModels = [...new Set(data?.sessions.map((s) => s.llm_model) || [])]

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <MonitorIcon className="h-8 w-8" />
              Sessions CLI
            </h1>
            <p className="text-muted-foreground">
              Monitor active AI coding agents across Claude Code, Codex, and Gemini
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <ClockIcon className="h-4 w-4 mr-2" />
              {autoRefresh ? 'Auto: 30s' : 'Auto: Off'}
            </Button>
            <Button onClick={fetchSessions} variant="outline" size="sm" disabled={isLoading}>
              <RefreshCwIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Connection Warning */}
        {!isConnected && (
          <Card className="border-yellow-500 bg-yellow-500/10">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertCircleIcon className="h-5 w-5 text-yellow-500" />
                <div>
                  <CardTitle className="text-sm">API Not Connected</CardTitle>
                  <CardDescription className="text-sm">
                    Configure your API URL in settings to detect CLI sessions
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Card className="border-red-500 bg-red-500/10">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertCircleIcon className="h-5 w-5 text-red-500" />
                <div>
                  <CardTitle className="text-sm">Error</CardTitle>
                  <CardDescription className="text-sm">{error}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* CCS Provider Indicator */}
        {data?.ccs_current && (
          <Card className="border-blue-500 bg-blue-500/10">
            <CardHeader className="py-3">
              <div className="flex items-center gap-3">
                <SparklesIcon className="h-5 w-5 text-blue-500" />
                <div>
                  <CardTitle className="text-sm">CCS Active Provider</CardTitle>
                  <CardDescription className="text-sm">
                    Currently using <Badge variant="secondary">{data.ccs_current}</Badge> via Claude Code Switcher
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Claude Code Card */}
          <Card className={CLI_CONFIG['claude-code'].bgColor}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Claude Code</CardTitle>
              <TerminalIcon className={`h-5 w-5 ${CLI_CONFIG['claude-code'].color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {data?.summary.by_cli['claude-code'] || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {data?.sessions
                  .filter((s) => s.cli_type === 'claude-code')
                  .filter((s) => s.status === 'active').length || 0} active
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {[...new Set(data?.sessions.filter((s) => s.cli_type === 'claude-code').map((s) => s.llm_model))].map(
                  (model) => (
                    <Badge key={model} variant="outline" className="text-xs">
                      {model}
                    </Badge>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          {/* Codex Card */}
          <Card className={CLI_CONFIG.codex.bgColor}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Codex</CardTitle>
              <BrainIcon className={`h-5 w-5 ${CLI_CONFIG.codex.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data?.summary.by_cli.codex || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {data?.sessions.filter((s) => s.cli_type === 'codex').filter((s) => s.status === 'active').length || 0}{' '}
                active
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {[...new Set(data?.sessions.filter((s) => s.cli_type === 'codex').map((s) => s.llm_model))].map(
                  (model) => (
                    <Badge key={model} variant="outline" className="text-xs">
                      {model}
                    </Badge>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          {/* Gemini Card */}
          <Card className={CLI_CONFIG.gemini.bgColor}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Gemini</CardTitle>
              <SparklesIcon className={`h-5 w-5 ${CLI_CONFIG.gemini.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data?.summary.by_cli.gemini || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {data?.sessions.filter((s) => s.cli_type === 'gemini').filter((s) => s.status === 'active').length || 0}{' '}
                active
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {[...new Set(data?.sessions.filter((s) => s.cli_type === 'gemini').map((s) => s.llm_model))].map(
                  (model) => (
                    <Badge key={model} variant="outline" className="text-xs">
                      {model}
                    </Badge>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Total Cost Summary */}
        {data && data.summary.total_cost > 0 && (
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DollarSignIcon className="h-5 w-5 text-green-500" />
                  <div>
                    <CardTitle className="text-sm">Total Session Cost</CardTitle>
                    <CardDescription className="text-sm">
                      Across {data.summary.total} sessions
                    </CardDescription>
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-500">${data.summary.total_cost.toFixed(2)}</div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Filters */}
        <div className="flex items-center gap-4">
          <Select value={filterCli} onValueChange={setFilterCli}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All CLIs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All CLIs</SelectItem>
              <SelectItem value="claude-code">Claude Code</SelectItem>
              <SelectItem value="codex">Codex</SelectItem>
              <SelectItem value="gemini">Gemini</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterModel} onValueChange={setFilterModel}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Models" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Models</SelectItem>
              {uniqueModels.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1" />

          <span className="text-sm text-muted-foreground">
            {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Sessions Table */}
        <DataTable
          columns={columns}
          data={filteredSessions}
          searchKey="project"
          searchPlaceholder="Search by project..."
          showColumnToggle={true}
        />

        {/* Last Updated */}
        {data && (
          <p className="text-xs text-muted-foreground text-center">
            Last updated: {new Date(data.last_updated).toLocaleTimeString()}
          </p>
        )}
      </div>
    </AppLayout>
  )
}
