import * as React from 'react'
import { FileText, Clock, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RalphMemory } from '@/api/ralph'

interface MemoriesSectionProps {
  memories: RalphMemory[]
  formatRelativeTime: (timestamp: string) => string
  limit?: number
}

const categoryColors: Record<string, string> = {
  backend: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  testing: 'bg-green-500/10 text-green-500 border-green-500/20',
  docs: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  refactor: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  implementation: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  auth: 'bg-red-500/10 text-red-500 border-red-500/20',
  config: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

const typeIcons: Record<string, React.ReactNode> = {
  decision: <FileText className='h-4 w-4 text-blue-400' />,
  action: <Clock className='h-4 w-4 text-green-400' />,
  error: <Clock className='h-4 w-4 text-red-400' />,
}

export function MemoriesSection({
  memories,
  formatRelativeTime,
  limit = 5,
}: MemoriesSectionProps) {
  const displayedMemories = memories.slice(0, limit)

  if (displayedMemories.length === 0) {
    return (
      <div className='rounded-lg border border-dashed p-8 text-center'>
        <FileText className='mx-auto h-12 w-4 text-muted-foreground' />
        <p className='mt-2 text-sm text-muted-foreground'>
          No memories captured yet
        </p>
        <p className='mt-1 text-xs text-muted-foreground/70'>
          Start coding to see automatic context capture
        </p>
      </div>
    )
  }

  return (
    <div className='space-y-3'>
      {displayedMemories.map((memory, index) => (
        <div
          key={`${memory.timestamp}-${index}`}
          className='group flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50'
        >
          {/* Type icon */}
          <div className='mt-0.5'>{typeIcons[memory.type] || typeIcons.decision}</div>

          {/* Content */}
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2 flex-wrap'>
              <span className='font-medium text-sm truncate'>{memory.content}</span>
              {memory.file_path && (
                <code className='text-xs text-muted-foreground truncate max-w-[150px]'>
                  {memory.file_path}
                </code>
              )}
            </div>

            <div className='flex items-center gap-2 mt-1.5'>
              {/* Category badge */}
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
                  categoryColors[memory.category] ||
                    'bg-gray-500/10 text-gray-500 border-gray-500/20',
                )}
              >
                <Tag className='h-3 w-3' />
                {memory.category}
              </span>

              {/* Time */}
              <span className='text-xs text-muted-foreground'>
                {formatRelativeTime(memory.timestamp)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
