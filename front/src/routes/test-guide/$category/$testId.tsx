import React, { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  CopyIcon,
  CheckCircle2Icon,
  TerminalIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
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

export const Route = createFileRoute('/test-guide/$category/$testId')({
  component: TestDetailPage,
})

function TestDetailPage() {
  const { category, testId } = Route.useParams()
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null)

  const config = categoryConfig[category as TestCategory]
  const CategoryIcon = config.icon

  // Filtrer les tests de la même catégorie
  const categorySteps = testSteps.filter((s) => s.category === category)
  const currentIndex = categorySteps.findIndex((s) => s.id === testId)
  const previousStep = currentIndex > 0 ? categorySteps[currentIndex - 1] : null
  const nextStep =
    currentIndex < categorySteps.length - 1
      ? categorySteps[currentIndex + 1]
      : null

  const step = testSteps.find((s) => s.id === testId)

  if (!step) {
    return (
      <AppLayout>
        <div className="flex flex-col gap-8">
          <Card className="border-red-500/20">
            <CardHeader>
              <CardTitle className="text-red-500">Test non trouvé</CardTitle>
            </CardHeader>
            <CardContent>
              <Link to="/test-guide">
                <Button variant="outline">
                  <ArrowLeftIcon className="w-4 h-4 mr-2" />
                  Retour aux tests
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt)
    setCopiedPrompt('prompt')
    setTimeout(() => setCopiedPrompt(null), 2000)
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedPrompt('code')
    setTimeout(() => setCopiedPrompt(null), 2000)
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <ModernGradient>
          <div className="p-8">
            <Link to="/test-guide/$category" params={{ category }}>
              <Button
                variant="ghost"
                className="mb-4 text-white hover:text-white/80"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Retour à {config.title}
              </Button>
            </Link>
            <div className="flex items-center gap-4 mb-4">
              <CategoryIcon className={`w-10 h-10 ${config.color}`} />
              <div>
                <h1 className="text-3xl font-bold">{step.title}</h1>
                <p className="text-muted-foreground">{config.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
            </div>
          </div>
        </ModernGradient>

        {/* Description */}
        <AnimatedCard className={config.borderColor}>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base">{step.description}</p>
          </CardContent>
        </AnimatedCard>

        {/* Prompt */}
        {step.prompt && (
          <AnimatedCard className={config.borderColor}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TerminalIcon className="w-5 h-5" />
                Prompt à copier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <pre className="bg-secondary/50 p-4 rounded-lg text-sm whitespace-pre-wrap break-words border">
                    <code>{step.prompt}</code>
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyPrompt(step.prompt!)}
                  >
                    {copiedPrompt === 'prompt' ? (
                      <CheckCircle2Icon className="w-4 h-4" />
                    ) : (
                      <CopyIcon className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <div className="flex items-start gap-2 text-sm bg-muted/50 p-4 rounded-lg">
                  <ChevronRightIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                  <div>
                    <p className="font-medium text-primary">
                      Résultat attendu :
                    </p>
                    <p className="text-muted-foreground">{step.expected}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </AnimatedCard>
        )}

        {/* Code */}
        {step.code && (
          <AnimatedCard className={config.borderColor}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TerminalIcon className="w-5 h-5" />
                Commande
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <pre className="bg-secondary/50 p-4 rounded-lg text-sm whitespace-pre-wrap break-words border">
                    <code>{step.code}</code>
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyCode(step.code!)}
                  >
                    {copiedPrompt === 'code' ? (
                      <CheckCircle2Icon className="w-4 h-4" />
                    ) : (
                      <CopyIcon className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <div className="flex items-start gap-2 text-sm bg-muted/50 p-4 rounded-lg">
                  <ChevronRightIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                  <div>
                    <p className="font-medium text-primary">
                      Résultat attendu :
                    </p>
                    <p className="text-muted-foreground">{step.expected}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </AnimatedCard>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center">
          {previousStep ? (
            <Link
              to="/test-guide/$category/$testId"
              params={{ category, testId: previousStep.id }}
            >
              <Button variant="outline">
                <ChevronLeftIcon className="w-4 h-4 mr-2" />
                {previousStep.title}
              </Button>
            </Link>
          ) : (
            <Link to="/test-guide/$category" params={{ category }}>
              <Button variant="outline">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Retour à {config.title}
              </Button>
            </Link>
          )}
          {nextStep ? (
            <Link
              to="/test-guide/$category/$testId"
              params={{ category, testId: nextStep.id }}
            >
              <Button variant="outline">
                {nextStep.title}
                <ChevronRightIcon className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          ) : (
            <Link to="/test-guide/$category" params={{ category }}>
              <Button variant="outline">
                Retour à {config.title}
                <ChevronRightIcon className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
