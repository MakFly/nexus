/**
 * Debug Panel Component
 * Shows real-time logs and API activity in development
 */

import { useState, useEffect } from 'react'
import { XIcon, RefreshCwIcon, DownloadIcon, Trash2Icon, BugIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { logger, getDebugInfo } from '@/lib/logger'

interface DebugPanelProps {
  onClose?: () => void
}

export function DebugPanel({ onClose }: DebugPanelProps) {
  const [logs, setLogs] = useState(logger.getLogs())
  const [filter, setFilter] = useState<'all' | 'api' | 'error'>('all')

  useEffect(() => {
    // Update logs every second
    const interval = setInterval(() => {
      setLogs(logger.getLogs())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true
    if (filter === 'api') return log.context?.includes('API')
    if (filter === 'error') return log.level === 'error'
    return true
  })

  const handleExport = () => {
    const data = logger.exportLogs()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nexus-logs-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClear = () => {
    logger.clearLogs()
    setLogs([])
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'debug': return 'text-gray-500'
      case 'info': return 'text-green-500'
      case 'warn': return 'text-yellow-500'
      case 'error': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'debug': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
      case 'info': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
      case 'warn': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
      case 'error': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[600px] flex flex-col">
      <Card className="shadow-2xl border-2 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <BugIcon className="h-5 w-5 text-primary" />
              Debug Console
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLogs(logger.getLogs())}>
                <RefreshCwIcon className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleExport}>
                <DownloadIcon className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClear}>
                <Trash2Icon className="h-4 w-4" />
              </Button>
              {onClose && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                  <XIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mt-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setFilter('all')}
            >
              All ({logs.length})
            </Button>
            <Button
              variant={filter === 'api' ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setFilter('api')}
            >
              API ({logs.filter(l => l.context?.includes('API')).length})
            </Button>
            <Button
              variant={filter === 'error' ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setFilter('error')}
            >
              Errors ({logs.filter(l => l.level === 'error').length})
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="max-h-[400px] overflow-y-auto px-4 pb-4 space-y-2">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No logs yet
              </div>
            ) : (
              filteredLogs.slice(-50).reverse().map((log, i) => (
                <div
                  key={`${log.timestamp}-${i}`}
                  className="text-xs p-2 rounded bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <Badge className={`text-[10px] px-1 py-0 h-4 ${getLevelBadge(log.level)}`}>
                      {log.level.toUpperCase()}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                      <div className={getLevelColor(log.level)}>
                        {log.context && <span className="font-semibold">[{log.context}]</span>} {log.message}
                      </div>
                      {log.data && typeof log.data === 'object' && (
                        <pre className="mt-1 text-[10px] text-muted-foreground overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Debug toggle button
 */
export function DebugToggle({ onClick, isVisible }: { onClick: () => void; isVisible: boolean }) {
  return (
    <Button
      variant={isVisible ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
      className="fixed bottom-4 right-4 z-40"
    >
      <BugIcon className="h-4 w-4 mr-2" />
      Debug
    </Button>
  )
}
