import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { AppLayout } from '../components/app-layout'
import { useAutomationStore } from '../stores/automation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Switch } from '../components/ui/switch'
import { Badge } from '../components/ui/badge'

export const Route = createFileRoute('/automation/')({
  component: AutomationDashboard,
})

function AutomationDashboard() {
  const {
    config,
    suggestions,
    activeContext,
    loadConfig,
    updateConfig,
    loadSuggestions,
  } = useAutomationStore()

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      await Promise.all([loadConfig(), loadSuggestions()])
      setIsLoading(false)
    }
    loadData()
  }, [loadConfig, loadSuggestions])

  const handleToggleAutoSave = async (enabled: boolean) => {
    await updateConfig({ autoSave: { ...config.autoSave, enabled } })
  }

  const handleToggleAutoContext = async (enabled: boolean) => {
    await updateConfig({ autoContext: { ...config.autoContext, enabled } })
  }

  const handleToggleAutoRelationships = async (enabled: boolean) => {
    await updateConfig({
      autoRelationships: { ...config.autoRelationships, enabled },
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Chargement...</div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Automatisations</h1>
          <p className="text-muted-foreground">
            Configurez et gérez les automatisations de Free Context
          </p>
        </div>

        {/* Active Context */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Contexte Actif</CardTitle>
            <CardDescription>
              Le contexte actuellement utilisé pour les opérations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeContext ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{activeContext.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {activeContext.description}
                  </div>
                </div>
                <Badge variant="secondary">Actif</Badge>
              </div>
            ) : (
              <div className="text-muted-foreground">Aucun contexte actif</div>
            )}
          </CardContent>
        </Card>

        {/* Automation Settings */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Auto-Context */}
          <Card>
            <CardHeader>
              <CardTitle>Auto-Contexte</CardTitle>
              <CardDescription>
                Détection automatique du contexte depuis les conversations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Activer</div>
                  <div className="text-sm text-muted-foreground">
                    Analyse automatique des prompts
                  </div>
                </div>
                <Switch
                  checked={config.autoContext?.enabled ?? false}
                  onCheckedChange={handleToggleAutoContext}
                />
              </div>
              {config.autoContext?.enabled && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Seuil de création :</span>
                    <span className="font-mono">
                      {(config.autoContext.autoCreateThreshold ?? 0.5).toFixed(
                        2,
                      )}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Auto-Save */}
          <Card>
            <CardHeader>
              <CardTitle>Auto-Sauvegarde</CardTitle>
              <CardDescription>
                Sauvegarde automatique des contenus importants
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Activer</div>
                  <div className="text-sm text-muted-foreground">
                    Sauvegarde automatique des mémoires
                  </div>
                </div>
                <Switch
                  checked={config.autoSave?.enabled ?? false}
                  onCheckedChange={handleToggleAutoSave}
                />
              </div>
              {config.autoSave?.enabled && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Seuil de confiance :</span>
                    <span className="font-mono">
                      {(config.autoSave.confidenceThreshold ?? 0.7).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Seuil de doublon :</span>
                    <span className="font-mono">
                      {(config.autoSave.duplicateThreshold ?? 0.85).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Smart Search */}
          <Card>
            <CardHeader>
              <CardTitle>Smart Search</CardTitle>
              <CardDescription>
                Recherche hybride avec expansion de requêtes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Expansion de requêtes</div>
                  <div className="text-sm text-muted-foreground">
                    Suggérer des termes similaires
                  </div>
                </div>
                <Switch
                  checked={config.smartSearch?.useQueryExpansion ?? false}
                  onCheckedChange={(checked) =>
                    updateConfig({
                      smartSearch: {
                        ...config.smartSearch,
                        useQueryExpansion: checked,
                      },
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Poids sémantique</div>
                  <div className="text-sm text-muted-foreground">
                    Importance de la similarité sémantique
                  </div>
                </div>
                <Badge variant="outline">
                  {Math.round(
                    (config.smartSearch?.semanticWeight ?? 0.6) * 100,
                  )}
                  %
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Auto-Relationships */}
          <Card>
            <CardHeader>
              <CardTitle>Auto-Relations</CardTitle>
              <CardDescription>
                Détection automatique des relations entre mémoires
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Activer</div>
                  <div className="text-sm text-muted-foreground">
                    Détecter les connexions automatiquement
                  </div>
                </div>
                <Switch
                  checked={config.autoRelationships?.enabled ?? false}
                  onCheckedChange={handleToggleAutoRelationships}
                />
              </div>
              {config.autoRelationships?.enabled && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Création automatique :</span>
                    <Badge
                      variant={
                        config.autoRelationships.autoCreate
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {config.autoRelationships.autoCreate
                        ? 'Oui'
                        : 'Suggestions seulement'}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Suggestions */}
        {suggestions && suggestions.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Suggestions</CardTitle>
              <CardDescription>
                Actions suggérées basées sur votre activité
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{suggestion.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {suggestion.description}
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Appliquer
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
