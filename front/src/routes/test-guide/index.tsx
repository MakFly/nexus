import React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronRightIcon } from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ModernGradient } from '@/components/ui/modern-gradient'
import { testSteps, categoryConfig } from '@/lib/test-data'
import type { TestCategory } from '@/lib/test-data'

export const Route = createFileRoute('/test-guide/')({
  component: TestGuide,
})

const MCP_TEST_COMMAND =
  'echo \'{"jsonrpc":"2.0","id":1,"method":"tools/list"}\' | bun run src/index.ts'

function TestGuide() {
  // Group steps by category
  const groupedSteps = testSteps.reduce(
    (acc, step) => {
      if (!acc[step.category]) {
        acc[step.category] = []
      }
      acc[step.category].push(step)
      return acc
    },
    {} as Record<TestCategory, typeof testSteps>,
  )

  const totalTests = testSteps.length
  const totalCategories = Object.keys(groupedSteps).length

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <ModernGradient>
          <div className="p-8 text-center">
            <h1 className="text-4xl font-bold mb-2">
              Guide de Test Interactif
            </h1>
            <p className="text-muted-foreground mb-6 text-lg">
              Testez toutes les fonctionnalités du MCP Free Context
            </p>
            <div className="bg-background/50 backdrop-blur-sm rounded-xl p-4 max-w-2xl mx-auto border">
              <div className="flex items-center justify-center gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold">{totalCategories}</div>
                  <div className="text-xs text-muted-foreground">
                    catégories
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{totalTests}</div>
                  <div className="text-xs text-muted-foreground">tests</div>
                </div>
              </div>
            </div>
          </div>
        </ModernGradient>

        {/* Prerequisites */}
        <Card className="border-orange-500/20">
          <CardHeader>
            <CardTitle className="text-orange-500">
              Prérequis Importants
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              ⚠️ <strong>Redémarrez Claude Code CLI</strong> pour charger la
              nouvelle configuration
            </p>
            <p>
              📋 Le serveur doit apparaître dans{' '}
              <code className="bg-secondary px-1 py-0.5 rounded">
                claude mcp list
              </code>
            </p>
            <p>
              🤖 <strong>Auto-mémoisation activée</strong> : Le MCP apprend
              automatiquement de vos utilisations
            </p>
          </CardContent>
        </Card>

        {/* Categories Grid */}
        {Object.entries(groupedSteps).map(([category, steps]) => {
          const config = categoryConfig[category as TestCategory]
          const CategoryIcon = config.icon

          return (
            <Link
              key={category}
              to="/test-guide/$category"
              params={{ category }}
            >
              <Card
                className={`transition-all hover:shadow-lg ${config.borderColor} cursor-pointer`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CategoryIcon className={`w-8 h-8 ${config.color}`} />
                      <div>
                        <CardTitle className="text-xl">
                          {config.title}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {steps.length} tests disponibles
                        </p>
                      </div>
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {steps.filter((s) => s.difficulty === 'easy').length >
                      0 && (
                      <Badge
                        variant="outline"
                        className="bg-green-500/10 text-green-600 border-green-500/30"
                      >
                        🟢 {steps.filter((s) => s.difficulty === 'easy').length}{' '}
                        Easy
                      </Badge>
                    )}
                    {steps.filter((s) => s.difficulty === 'normal').length >
                      0 && (
                      <Badge
                        variant="outline"
                        className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
                      >
                        🟡{' '}
                        {steps.filter((s) => s.difficulty === 'normal').length}{' '}
                        Normal
                      </Badge>
                    )}
                    {steps.filter((s) => s.difficulty === 'hard').length >
                      0 && (
                      <Badge
                        variant="outline"
                        className="bg-red-500/10 text-red-600 border-red-500/30"
                      >
                        🔴 {steps.filter((s) => s.difficulty === 'hard').length}{' '}
                        Hard
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}

        {/* Troubleshooting */}
        <Card className="border-orange-500/20">
          <CardHeader>
            <CardTitle className="text-orange-500">Dépannage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="font-medium mb-1">
                L'outil free-context n'est pas disponible ?
              </p>
              <p className="text-muted-foreground">
                Vérifiez la config :{' '}
                <code>cat ~/.claude/.claude.json | grep free-context</code>
              </p>
            </div>
            <div>
              <p className="font-medium mb-1">Erreur de connexion ?</p>
              <p className="text-muted-foreground">
                Testez manuellement :{' '}
                <code className="bg-secondary px-1 py-0.5 rounded text-xs">
                  {MCP_TEST_COMMAND}
                </code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
