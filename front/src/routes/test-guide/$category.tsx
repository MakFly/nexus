import React, { useState } from 'react'
import {
  createFileRoute,
  Link,
  Outlet,
  useMatchRoute,
} from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  CopyIcon,
  CheckCircle2Icon,
  TerminalIcon,
  ChevronRightIcon,
} from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AnimatedCard } from '@/components/ui/animated-card'
import { ModernGradient } from '@/components/ui/modern-gradient'
import { testSteps, categoryConfig } from '@/lib/test-data'
import type { TestCategory } from '@/lib/test-data'

export const Route = createFileRoute('/test-guide/$category')({
  component: CategoryPage,
})

function CategoryPage() {
  const { category } = Route.useParams()
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null)
  const matchRoute = useMatchRoute()
  const isTestDetailRoute = matchRoute({ to: '/test-guide/$category/$testId' })

  const config = categoryConfig[category as TestCategory]
  const CategoryIcon = config.icon

  const steps = testSteps.filter((s) => s.category === category)

  const copyPrompt = (prompt: string, id: string) => {
    navigator.clipboard.writeText(prompt)
    setCopiedPrompt(id)
    setTimeout(() => setCopiedPrompt(null), 2000)
  }

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedPrompt(id)
    setTimeout(() => setCopiedPrompt(null), 2000)
  }

  // Si on est sur une route enfant (test detail), rendre seulement l'Outlet
  if (isTestDetailRoute) {
    return <Outlet />
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <ModernGradient>
          <div className="p-8">
            <Link to="/test-guide">
              <Button
                variant="ghost"
                className="mb-4 text-white hover:text-white/80"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Retour aux catégories
              </Button>
            </Link>
            <div className="flex items-center gap-4">
              <CategoryIcon className={`w-12 h-12 ${config.color}`} />
              <div>
                <h1 className="text-4xl font-bold">{config.title}</h1>
                <p className="text-muted-foreground text-lg">
                  {steps.length} tests disponibles
                </p>
              </div>
            </div>
          </div>
        </ModernGradient>

        {/* Difficulty Summary */}
        <div className="flex gap-4 flex-wrap">
          {steps.filter((s) => s.difficulty === 'easy').length > 0 && (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/30 px-3 py-1">
              🟢 {steps.filter((s) => s.difficulty === 'easy').length} Easy
            </Badge>
          )}
          {steps.filter((s) => s.difficulty === 'normal').length > 0 && (
            <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 px-3 py-1">
              🟡 {steps.filter((s) => s.difficulty === 'normal').length} Normal
            </Badge>
          )}
          {steps.filter((s) => s.difficulty === 'hard').length > 0 && (
            <Badge className="bg-red-500/10 text-red-600 border-red-500/30 px-3 py-1">
              🔴 {steps.filter((s) => s.difficulty === 'hard').length} Hard
            </Badge>
          )}
        </div>

        {/* Tests List */}
        <div className="space-y-4">
          {steps.map((step) => (
            <Link
              key={step.id}
              to="/test-guide/$category/$testId"
              params={{ category, testId: step.id }}
            >
              <AnimatedCard
                className={`transition-all hover:shadow-lg ${config.borderColor} cursor-pointer`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className={`${
                            step.difficulty === 'easy'
                              ? 'bg-green-500/10 text-green-600 border-green-500/30'
                              : step.difficulty === 'normal'
                                ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30'
                                : 'bg-red-500/10 text-red-600 border-red-500/30'
                          }`}
                        >
                          {step.difficulty === 'easy' && '🟢 Easy'}
                          {step.difficulty === 'normal' && '🟡 Normal'}
                          {step.difficulty === 'hard' && '🔴 Hard'}
                        </Badge>
                        <CardTitle className="text-xl">{step.title}</CardTitle>
                      </div>
                      <CardDescription className="text-base">
                        {step.description}
                      </CardDescription>
                    </div>
                    <ChevronRightIcon className="w-6 h-6 text-muted-foreground shrink-0 mt-4" />
                  </div>
                </CardHeader>
              </AnimatedCard>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
