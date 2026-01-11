import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useNexusStore } from '@/stores/nexusStore'
import {
  BrainIcon,
  FolderKanbanIcon,
  SearchIcon,
  BarChart3Icon,
  ArrowRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ServerOffIcon,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AppLayout } from '@/components/app-layout'
import { DashboardSkeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const {
    isConnected,
    stats,
    recallMemories,
  } = useNexusStore()

  const [loading, setLoading] = useState(true)
  const [recentMemories, setRecentMemories] = useState<any[]>([])
  const [totalMemories, setTotalMemories] = useState(0)

  useEffect(() => {
    // Only load memories, connection and stats are loaded by root loader
    const loadMemories = async () => {
      try {
        const result = await recallMemories({ limit: 5 })
        setRecentMemories(result.memories)
        setTotalMemories(result.total)
      } catch (e) {
        console.error('Failed to load memories:', e)
      } finally {
        setLoading(false)
      }
    }
    loadMemories()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const quickActions = [
    { title: 'Memories', description: 'Browse and manage', icon: BrainIcon, href: '/memories', color: 'text-purple-500' },
    { title: 'Search', description: 'Search your code', icon: SearchIcon, href: '/search', color: 'text-green-500' },
    { title: 'Learning', description: 'View patterns', icon: BarChart3Icon, href: '/learning', color: 'text-orange-500' },
    { title: 'Statistics', description: 'View stats', icon: BarChart3Icon, href: '/stats', color: 'text-blue-500' },
  ]

  // Loading state - show skeleton
  if (loading) {
    return <AppLayout><DashboardSkeleton /></AppLayout>
  }

  // API disconnected - show error state
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
              Start the Nexus API server to access your memories, search code, and use all features.
            </p>
          </div>
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-2">Run this command:</p>
              <code className="bg-muted px-4 py-2 rounded text-sm block font-mono">
                cd apps/api && bun src/index.ts
              </code>
            </CardContent>
          </Card>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry Connection
          </Button>
        </div>
      </AppLayout>
    )
  }

  // Connected - show dashboard
  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Welcome to Nexus</p>
          </div>
          <Badge variant="outline" className="gap-1">
            <CheckCircleIcon className="h-3 w-3 text-green-500" />
            Connected
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Indexed Files</CardTitle>
              <FolderKanbanIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.files || 0}</div>
              <p className="text-xs text-muted-foreground">Files in database</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Code Chunks</CardTitle>
              <SearchIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.chunks || 0}</div>
              <p className="text-xs text-muted-foreground">Chunks indexed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Memories</CardTitle>
              <BrainIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMemories}</div>
              <p className="text-xs text-muted-foreground">Memories stored</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <div className="h-2 w-2 rounded-full bg-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Ready</div>
              <p className="text-xs text-muted-foreground">System operational</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Memories */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Memories</CardTitle>
            <CardDescription>Your latest stored memories</CardDescription>
          </CardHeader>
          <CardContent>
            {recentMemories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BrainIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No memories yet</p>
                <Button variant="link" asChild className="mt-2">
                  <Link to="/memories">Create your first memory</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentMemories.map((memory) => (
                  <div
                    key={memory.id}
                    className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <BrainIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="line-clamp-2 text-sm font-medium">{memory.summary}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{new Date(memory.created_at).toLocaleDateString()}</span>
                        <Badge variant="outline" className="text-xs capitalize">{memory.type}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {recentMemories.length > 0 && (
              <div className="mt-4">
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/memories">View All Memories</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Link key={action.href} to={action.href}>
                <Card className="group hover:shadow-md transition-shadow h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-muted ${action.color}`}>
                        <action.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{action.title}</CardTitle>
                        <CardDescription className="text-xs">{action.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
