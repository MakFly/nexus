import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  GitCompareArrowsIcon,
  TrophyIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  XCircleIcon,
  CircleDotIcon,
  TargetIcon,
  RocketIcon,
  ClockIcon,
  StarIcon,
  ZapIcon,
} from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const Route = createFileRoute('/changelog/')({
  component: ChangelogPage,
})

// Matrice comparative - MAINTENIR A JOUR
const COMPARISON_MATRIX = [
  { feature: 'Auto-capture', claudeMem: true, claudeMemNote: '6 hooks', mgrep: false, nexus: true, nexusNote: '4 hooks', status: 'partial' },
  { feature: 'Compression LLM', claudeMem: true, claudeMemNote: '100:1', mgrep: false, nexus: true, nexusNote: '15:1', status: 'inferior' },
  { feature: 'Semantic Search', claudeMem: true, claudeMemNote: 'Chroma', mgrep: true, mgrepNote: 'Mixedbread', nexus: true, nexusNote: 'Mistral', status: 'ok' },
  { feature: 'File Watcher', claudeMem: false, mgrep: true, nexus: true, nexusNote: 'chokidar', status: 'ok' },
  { feature: 'Incremental Index', claudeMem: false, mgrep: true, nexus: true, status: 'ok' },
  { feature: 'Progressive Disclosure', claudeMem: true, claudeMemNote: '3-layer', mgrep: false, nexus: true, nexusNote: '3-layer', status: 'ok' },
  { feature: 'Web UI', claudeMem: true, claudeMemNote: 'Basic', mgrep: false, nexus: true, nexusNote: 'Full React', status: 'superior' },
  { feature: 'Learning Patterns', claudeMem: false, mgrep: false, nexus: true, status: 'unique' },
  { feature: 'Budget Mode', claudeMem: false, mgrep: false, nexus: true, status: 'unique' },
  { feature: 'Multi-Project', claudeMem: true, mgrep: true, mgrepNote: 'Cloud', nexus: true, nexusNote: 'Projects', status: 'ok' },
  { feature: 'Privacy Filters', claudeMem: true, claudeMemNote: '<private>', mgrep: false, nexus: true, status: 'ok' },
  { feature: 'Web Search', claudeMem: false, mgrep: true, mgrepNote: '--web', nexus: false, status: 'missing' },
  { feature: 'Multimodal (PDF/img)', claudeMem: false, mgrep: true, nexus: false, status: 'missing' },
  { feature: 'Vector DB dédié', claudeMem: true, claudeMemNote: 'Chroma', mgrep: true, mgrepNote: 'Cloud', nexus: false, nexusNote: 'SQLite', status: 'inferior' },
]

// Scores - MAINTENIR A JOUR
const SCORES = {
  featureParity: 8.5,
  architecture: 9.5,
  tokenEfficiency: 8.0,
  developerUX: 9.0,
  documentation: 8.5,
  innovation: 9.0,
  global: 8.7,
}

// Recommandations - MAINTENIR A JOUR
const RECOMMENDATIONS = {
  immediate: [
    { id: 1, title: 'Améliorer compression', description: 'Viser ratio 50:1 minimum (actuellement 15:1)', priority: 'P0', sprint: '11' },
    { id: 2, title: 'Endpoint /search/web', description: 'Intégrer Tavily ou SerpAPI pour web search', priority: 'P1', sprint: '11' },
  ],
  shortTerm: [
    { id: 3, title: 'Migration Chroma', description: 'Pour repos > 50k chunks, meilleure performance', priority: 'P2', sprint: '12-13' },
    { id: 4, title: 'Endless Mode', description: 'Compression continue (beta dans claude-mem)', priority: 'P2', sprint: '12-13' },
  ],
  longTerm: [
    { id: 5, title: 'Support PDF/Images', description: 'Chunking multimodal pour docs techniques', priority: 'P3', sprint: 'Q2' },
    { id: 6, title: 'Auto-relationships', description: 'Liens entre mémoires via embeddings', priority: 'P3', sprint: 'Q2' },
  ],
}

// Changelog entries - MAINTENIR A JOUR
const CHANGELOG = [
  {
    version: '0.0.1',
    date: '2025-01-11',
    title: 'Initial Release - Monorepo Setup',
    highlights: [
      'Version 0.0.1 - Initial release',
      'Monorepo setup with packages (storage, search, indexer-py, core)',
      'Apps: api, cli, mcp-server, web',
    ],
    score: 10.0,
  },
]

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'ok':
      return <CheckCircle2Icon className="h-4 w-4 text-green-500" />
    case 'superior':
      return <TrophyIcon className="h-4 w-4 text-yellow-500" />
    case 'unique':
      return <StarIcon className="h-4 w-4 text-purple-500" />
    case 'partial':
      return <CircleDotIcon className="h-4 w-4 text-yellow-500" />
    case 'inferior':
      return <AlertTriangleIcon className="h-4 w-4 text-orange-500" />
    case 'missing':
      return <XCircleIcon className="h-4 w-4 text-red-500" />
    default:
      return null
  }
}

function FeatureCell({ has, note }: { has: boolean; note?: string }) {
  return (
    <div className="flex items-center gap-1">
      {has ? (
        <CheckCircle2Icon className="h-4 w-4 text-green-500" />
      ) : (
        <XCircleIcon className="h-4 w-4 text-muted-foreground/30" />
      )}
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
    </div>
  )
}

function ScoreCard({ label, score, icon: Icon }: { label: string; score: number; icon: any }) {
  const getScoreColor = (s: number) => {
    if (s >= 9) return 'text-green-500'
    if (s >= 8) return 'text-yellow-500'
    return 'text-orange-500'
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{label}</span>
      </div>
      <span className={`font-bold ${getScoreColor(score)}`}>{score}/10</span>
    </div>
  )
}

function ChangelogPage() {
  const [activeTab, setActiveTab] = useState('matrix')

  const okCount = COMPARISON_MATRIX.filter(f => ['ok', 'superior', 'unique'].includes(f.status)).length
  const totalCount = COMPARISON_MATRIX.length
  const parityPercent = Math.round((okCount / totalCount) * 100)

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Changelog & Roadmap</h1>
            <p className="text-muted-foreground">
              Audit comparatif vs claude-mem & mgrep - Feature parity tracking
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-lg px-4 py-2">
              Score: <span className="font-bold ml-1">{SCORES.global}/10</span>
            </Badge>
          </div>
        </div>

        {/* Score Global */}
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TargetIcon className="h-5 w-5" />
              Feature Parity Status
            </CardTitle>
            <CardDescription>
              Progression vers la parité complète avec les concurrents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>{okCount}/{totalCount} features OK</span>
                <span className="font-bold">{parityPercent}%</span>
              </div>
              <Progress value={parityPercent} className="h-3" />
              <div className="flex gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  OK/Superior: {COMPARISON_MATRIX.filter(f => ['ok', 'superior'].includes(f.status)).length}
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                  Unique: {COMPARISON_MATRIX.filter(f => f.status === 'unique').length}
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                  Partial/Inferior: {COMPARISON_MATRIX.filter(f => ['partial', 'inferior'].includes(f.status)).length}
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  Missing: {COMPARISON_MATRIX.filter(f => f.status === 'missing').length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="matrix">
              <GitCompareArrowsIcon className="h-4 w-4 mr-2" />
              Matrice
            </TabsTrigger>
            <TabsTrigger value="scores">
              <TargetIcon className="h-4 w-4 mr-2" />
              Scores
            </TabsTrigger>
            <TabsTrigger value="roadmap">
              <RocketIcon className="h-4 w-4 mr-2" />
              Roadmap
            </TabsTrigger>
            <TabsTrigger value="changelog">
              <ClockIcon className="h-4 w-4 mr-2" />
              Changelog
            </TabsTrigger>
          </TabsList>

          {/* Matrice Comparative */}
          <TabsContent value="matrix" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Matrice Comparative</CardTitle>
                <CardDescription>
                  Nexus vs claude-mem (13.2k stars) vs mgrep (Mixedbread AI)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">Feature</th>
                        <th className="text-center py-3 px-2">claude-mem</th>
                        <th className="text-center py-3 px-2">mgrep</th>
                        <th className="text-center py-3 px-2 bg-primary/10 font-bold">Nexus</th>
                        <th className="text-center py-3 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {COMPARISON_MATRIX.map((row, i) => (
                        <tr key={i} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-2 font-medium">{row.feature}</td>
                          <td className="py-3 px-2 text-center">
                            <FeatureCell has={row.claudeMem} note={row.claudeMemNote} />
                          </td>
                          <td className="py-3 px-2 text-center">
                            <FeatureCell has={row.mgrep} note={row.mgrepNote} />
                          </td>
                          <td className="py-3 px-2 text-center bg-primary/5">
                            <FeatureCell has={row.nexus} note={row.nexusNote} />
                          </td>
                          <td className="py-3 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <StatusIcon status={row.status} />
                              <span className="text-xs capitalize">{row.status}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t text-xs">
                  <div className="flex items-center gap-1">
                    <TrophyIcon className="h-3 w-3 text-yellow-500" />
                    Superior = Nexus fait mieux
                  </div>
                  <div className="flex items-center gap-1">
                    <StarIcon className="h-3 w-3 text-purple-500" />
                    Unique = Seulement Nexus
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2Icon className="h-3 w-3 text-green-500" />
                    OK = Parité
                  </div>
                  <div className="flex items-center gap-1">
                    <CircleDotIcon className="h-3 w-3 text-yellow-500" />
                    Partial = Partiellement
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertTriangleIcon className="h-3 w-3 text-orange-500" />
                    Inferior = Concurrent meilleur
                  </div>
                  <div className="flex items-center gap-1">
                    <XCircleIcon className="h-3 w-3 text-red-500" />
                    Missing = Non implémenté
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scores */}
          <TabsContent value="scores" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Scores par Critère</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ScoreCard label="Feature Parity" score={SCORES.featureParity} icon={GitCompareArrowsIcon} />
                  <ScoreCard label="Architecture" score={SCORES.architecture} icon={ZapIcon} />
                  <ScoreCard label="Token Efficiency" score={SCORES.tokenEfficiency} icon={TargetIcon} />
                  <ScoreCard label="Developer UX" score={SCORES.developerUX} icon={StarIcon} />
                  <ScoreCard label="Documentation" score={SCORES.documentation} icon={ClockIcon} />
                  <ScoreCard label="Innovation" score={SCORES.innovation} icon={RocketIcon} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrophyIcon className="h-5 w-5 text-yellow-500" />
                    Features Uniques Nexus
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg border border-purple-500/30 bg-purple-500/10">
                    <div className="font-medium flex items-center gap-2">
                      <StarIcon className="h-4 w-4 text-purple-500" />
                      Learning Patterns
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Capture de patterns réutilisables avec templates, variables, et feedback loop. Aucun concurrent n'a ça.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border border-purple-500/30 bg-purple-500/10">
                    <div className="font-medium flex items-center gap-2">
                      <StarIcon className="h-4 w-4 text-purple-500" />
                      Budget Mode
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Estimation et enforcement des tokens côté serveur avec mode compact automatique.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border border-primary/30 bg-primary/10">
                    <div className="font-medium flex items-center gap-2">
                      <TrophyIcon className="h-4 w-4 text-primary" />
                      Web UI Complète
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      11 routes, React 19, TanStack Router, shadcn/ui. claude-mem a une UI basique, mgrep n'en a pas.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Roadmap */}
          <TabsContent value="roadmap" className="mt-6">
            <div className="space-y-6">
              {/* Immediate */}
              <Card className="border-red-500/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-500">
                    <ZapIcon className="h-5 w-5" />
                    Immédiat (Sprint 11)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {RECOMMENDATIONS.immediate.map(rec => (
                    <div key={rec.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Badge variant="destructive" className="shrink-0">{rec.priority}</Badge>
                      <div>
                        <div className="font-medium">{rec.title}</div>
                        <div className="text-sm text-muted-foreground">{rec.description}</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Short Term */}
              <Card className="border-yellow-500/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-500">
                    <ClockIcon className="h-5 w-5" />
                    Court Terme (Sprint 12-13)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {RECOMMENDATIONS.shortTerm.map(rec => (
                    <div key={rec.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Badge variant="secondary" className="shrink-0">{rec.priority}</Badge>
                      <div>
                        <div className="font-medium">{rec.title}</div>
                        <div className="text-sm text-muted-foreground">{rec.description}</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Long Term */}
              <Card className="border-green-500/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-500">
                    <RocketIcon className="h-5 w-5" />
                    Long Terme (Q2 2025)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {RECOMMENDATIONS.longTerm.map(rec => (
                    <div key={rec.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Badge variant="outline" className="shrink-0">{rec.priority}</Badge>
                      <div>
                        <div className="font-medium">{rec.title}</div>
                        <div className="text-sm text-muted-foreground">{rec.description}</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Changelog */}
          <TabsContent value="changelog" className="mt-6">
            <div className="space-y-4">
              {CHANGELOG.map((entry, i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          v{entry.version}
                          <Badge variant="outline">{entry.date}</Badge>
                        </CardTitle>
                        <CardDescription>{entry.title}</CardDescription>
                      </div>
                      <Badge className="text-lg px-3 py-1">
                        {entry.score}/10
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {entry.highlights.map((h, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm">
                          <CheckCircle2Icon className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
