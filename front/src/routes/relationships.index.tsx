import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { AppLayout } from '../components/app-layout'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Slider } from '../components/ui/slider'

export const Route = createFileRoute('/relationships/')({
  component: RelationshipsGraph,
})

function RelationshipsGraph() {
  const [selectedMemory, setSelectedMemory] = useState<string | null>(null)
  const [graph, setGraph] = useState<{
    nodes: Array<{ id: string; title: string; type: string }>
    edges: Array<{
      source: string
      target: string
      type: string
      strength: number
    }>
  }>({ nodes: [], edges: [] })
  const [threshold, setThreshold] = useState([0.3])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (selectedMemory) {
      loadGraph(selectedMemory)
    }
  }, [selectedMemory, threshold])

  const loadGraph = async (memoryId: string) => {
    try {
      const depth = 2
      const response = await fetch(
        `/api/automation/relationship-graph/${memoryId}?depth=${depth}`,
      )
      const data = await response.json()

      if (data.success) {
        // Filter edges by threshold
        const filteredEdges = data.edges.filter(
          (edge: any) => edge.strength / 100 >= threshold[0],
        )

        // Get unique node IDs from edges
        const nodeIds = new Set<string>()
        filteredEdges.forEach((edge: any) => {
          nodeIds.add(edge.source)
          nodeIds.add(edge.target)
        })

        // Filter nodes
        const filteredNodes = data.nodes.filter((node: any) =>
          nodeIds.has(node.id),
        )

        setGraph({ nodes: filteredNodes, edges: filteredEdges })
      }
    } catch (error) {
      console.error('Failed to load graph:', error)
    }
  }

  const drawGraph = () => {
    const canvas = canvasRef.current
    if (!canvas || graph.nodes.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Simple force-directed layout
    const positions = new Map<string, { x: number; y: number }>()
    const nodeRadius = 20

    // Initial positions (circular)
    graph.nodes.forEach((node, i) => {
      const angle = (i / graph.nodes.length) * 2 * Math.PI
      positions.set(node.id, {
        x: width / 2 + Math.cos(angle) * 150,
        y: height / 2 + Math.sin(angle) * 150,
      })
    })

    // Draw edges
    graph.edges.forEach((edge) => {
      const source = positions.get(edge.source)
      const target = positions.get(edge.target)

      if (source && target) {
        ctx.beginPath()
        ctx.moveTo(source.x, source.y)
        ctx.lineTo(target.x, target.y)

        // Color by strength
        const strength = edge.strength / 100
        ctx.strokeStyle = `rgba(100, 100, 255, ${0.2 + strength * 0.6})`
        ctx.lineWidth = 1 + strength * 3
        ctx.stroke()
      }
    })

    // Draw nodes
    graph.nodes.forEach((node) => {
      const pos = positions.get(node.id)
      if (!pos) return

      // Node circle
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, nodeRadius, 0, 2 * Math.PI)

      // Color by type
      const colors: Record<string, string> = {
        note: '#3b82f6',
        conversation: '#8b5cf6',
        snippet: '#f59e0b',
        reference: '#10b981',
        task: '#ef4444',
        idea: '#ec4899',
      }

      ctx.fillStyle = colors[node.type] || '#6b7280'
      ctx.fill()
      ctx.strokeStyle = '#1f2937'
      ctx.lineWidth = 2
      ctx.stroke()

      // Label
      ctx.fillStyle = '#1f2937'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(node.title.substring(0, 15), pos.x, pos.y + nodeRadius + 15)
    })
  }

  useEffect(() => {
    drawGraph()
  }, [graph])

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Graphe de Relations</h1>
          <p className="text-muted-foreground">
            Visualisez les connexions entre vos mémoires
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Controls */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contrôles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">
                    Seuil de similarité: {threshold[0].toFixed(2)}
                  </label>
                  <Slider
                    value={threshold}
                    onValueChange={setThreshold}
                    min={0}
                    max={1}
                    step={0.05}
                    className="mt-2"
                  />
                </div>

                {selectedMemory && (
                  <div className="pt-4 border-t">
                    <div className="text-sm font-medium mb-2">
                      Mémoire sélectionnée
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {graph.nodes.find((n) => n.id === selectedMemory)?.title}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => setSelectedMemory(null)}
                    >
                      Effacer
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Statistiques</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Nœuds :</span>
                  <span className="font-mono">{graph.nodes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Connexions :</span>
                  <span className="font-mono">{graph.edges.length}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Légende</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm">Note</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span className="text-sm">Conversation</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className="text-sm">Snippet</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-sm">Référence</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-sm">Tâche</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                  <span className="text-sm">Idée</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Graph */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Graphe</CardTitle>
                <CardDescription>
                  {selectedMemory
                    ? 'Relations pour la mémoire sélectionnée'
                    : 'Sélectionnez une mémoire pour voir ses relations'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {graph.nodes.length > 0 ? (
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={400}
                    className="border rounded-lg w-full"
                  />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    {selectedMemory
                      ? 'Aucune relation trouvée pour cette mémoire'
                      : 'Sélectionnez une mémoire pour visualiser ses relations'}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
