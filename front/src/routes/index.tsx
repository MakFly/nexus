import React, { useEffect, useMemo, useRef } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  ActivityIcon,
  BrainIcon,
  ClockIcon,
  FolderKanbanIcon,
  PlusIcon,
  TrendingUpIcon,
} from 'lucide-react'

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'
import type { ChartConfig } from '@/components/ui/chart'
import { AppLayout } from '@/components/app-layout'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useContextStore, useMemoryStore } from '@/stores'
import { DebugPanel } from '@/components/debug-panel'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const contextsState = useContextStore()
  const memoriesState = useMemoryStore()

  // Use refs to track if we've already fetched
  const hasFetchedContexts = useRef(false)
  const hasFetchedMemories = useRef(false)

  // Safe defaults to prevent undefined errors
  const contexts = contextsState?.contexts ?? []
  const memories = memoriesState?.memories ?? []
  const fetchContexts = contextsState?.fetchContexts
  const fetchMemories = memoriesState?.fetchMemories
  const isLoadingContexts = contextsState?.loading ?? false
  const isLoadingMemories = memoriesState?.loading ?? false

  useEffect(() => {
    // Only fetch once using ref to prevent duplicate calls
    if (!hasFetchedContexts.current && fetchContexts) {
      hasFetchedContexts.current = true
      fetchContexts()
    }

    if (!hasFetchedMemories.current && fetchMemories) {
      hasFetchedMemories.current = true
      fetchMemories()
    }
  }, [fetchContexts, fetchMemories])

  const isLoading = isLoadingContexts || isLoadingMemories

  const recentMemories = (memories ?? [])
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5)

  const totalContexts = contexts?.length ?? 0
  const totalMemories = memories?.length ?? 0

  // Calculate activity data for the chart
  const activityData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      return date.toISOString().split('T')[0]
    })

    return last7Days.map((day) => {
      const count = (memories || []).filter((mem) => {
        const memDay = new Date(mem.createdAt).toISOString().split('T')[0]
        return memDay === day
      }).length

      return {
        day: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
        memories: count,
      }
    })
  }, [memories])

  const chartConfig = {
    memories: {
      label: 'Memories',
      color: 'hsl(var(--chart-1))',
    },
  } satisfies ChartConfig

  if (isLoading) {
    return (
      <AppLayout>
        <DebugPanel />
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-9 w-40" />
              <Skeleton className="mt-2 h-4 w-80" />
            </div>
            <Skeleton className="h-10 w-36" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="size-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="mt-2 h-3 w-40" />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="mt-1 h-4 w-56" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="mt-1 h-4 w-40" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="size-8 shrink-0 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-5" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                  <Skeleton className="mt-2 h-4 w-56" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-9 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <DebugPanel />
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              Welcome back! Here's an overview of your context management.
            </p>
          </div>
          <Button asChild>
            <Link to="/contexts/new">
              <PlusIcon className="mr-2 size-4" />
              Create Context
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Contexts
              </CardTitle>
              <FolderKanbanIcon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalContexts}</div>
              <p className="text-xs text-muted-foreground">
                Active contexts for organizing memories
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Memories
              </CardTitle>
              <BrainIcon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMemories}</div>
              <p className="text-xs text-muted-foreground">
                Stored across all contexts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Recent Activity
              </CardTitle>
              <ActivityIcon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activityData.reduce((sum, day) => sum + day.memories, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Memories created in the last 7 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
              <TrendingUpIcon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalMemories > 0
                  ? '+' +
                    Math.round(
                      (totalMemories / Math.max(totalContexts, 1)) * 10,
                    ) /
                      10
                  : '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Avg memories per context
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Recent Activity */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Activity Chart */}
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Activity Overview</CardTitle>
              <CardDescription>
                Memory creation activity over the last 7 days
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart accessibilityLayer data={activityData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => value.slice(0, 3)}
                  />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Bar
                    dataKey="memories"
                    fill="var(--color-memories)"
                    radius={8}
                  >
                    <LabelList
                      dataKey="memories"
                      position="top"
                      offset={12}
                      className="fill-foreground text-sm font-bold"
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Recent Memories */}
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Recent Memories</CardTitle>
              <CardDescription>Your latest stored memories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentMemories.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <BrainIcon className="mb-2 size-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      No memories yet
                    </p>
                    <Button variant="link" asChild className="mt-2">
                      <Link to="/contexts/new">Create your first context</Link>
                    </Button>
                  </div>
                ) : (
                  recentMemories.map((memory) => {
                    const context = contexts.find(
                      (c) => c.id === memory.contextId,
                    )
                    return (
                      <div
                        key={memory.id}
                        className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <BrainIcon className="size-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="line-clamp-2 text-sm font-medium">
                            {memory.content}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <ClockIcon className="size-3" />
                            {new Date(memory.createdAt).toLocaleDateString()}
                            {context && (
                              <>
                                <span>•</span>
                                <span className="rounded-full bg-secondary px-1.5 py-0.5">
                                  {context.name}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              {recentMemories.length > 0 && (
                <div className="mt-4">
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/memories">View All Memories</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanbanIcon className="size-5" />
                Create Context
              </CardTitle>
              <CardDescription>
                Organize your thoughts and memories into contexts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full" asChild>
                <Link to="/contexts/new">Get Started</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BrainIcon className="size-5" />
                Add Memory
              </CardTitle>
              <CardDescription>
                Store new information or conversations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="ghost"
                className="w-full"
                asChild
                disabled={contexts.length === 0}
              >
                <Link
                  to={contexts.length > 0 ? `/contexts/${contexts[0].id}` : '#'}
                >
                  Add Memory
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ActivityIcon className="size-5" />
                Search
              </CardTitle>
              <CardDescription>
                Find memories and contexts quickly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full" asChild>
                <Link to="/search">Search Now</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
