import * as React from 'react'
import { Lightbulb, GitBranch, TestTube, FileText, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RalphSuggestion } from '@/api/ralph'

interface SuggestionsSectionProps {
  suggestions: RalphSuggestion[]
}

const suggestionIcons: Record<RalphSuggestion['type'], React.ReactNode> = {
  commit: <GitBranch className='h-4 w-4 text-purple-400' />,
  add_tests: <TestTube className='h-4 w-4 text-green-400' />,
  add_docs: <FileText className='h-4 w-4 text-yellow-400' />,
  compress: <Minimize2 className='h-4 w-4 text-blue-400' />,
  custom: <Lightbulb className='h-4 w-4 text-orange-400' />,
}

const suggestionColors: Record<RalphSuggestion['type'], string> = {
  commit: 'border-purple-500/20 bg-purple-500/5',
  add_tests: 'border-green-500/20 bg-green-500/5',
  add_docs: 'border-yellow-500/20 bg-yellow-500/5',
  compress: 'border-blue-500/20 bg-blue-500/5',
  custom: 'border-orange-500/20 bg-orange-500/5',
}

export function SuggestionsSection({ suggestions }: SuggestionsSectionProps) {
  if (suggestions.length === 0) {
    return (
      <div className='rounded-lg border border-dashed p-8 text-center'>
        <Lightbulb className='mx-auto h-12 w-12 text-muted-foreground' />
        <p className='mt-2 text-sm text-muted-foreground'>
          No suggestions at the moment
        </p>
        <p className='mt-1 text-xs text-muted-foreground/70'>
          Ralph will suggest improvements as you work
        </p>
      </div>
    )
  }

  return (
    <div className='space-y-3'>
      {suggestions.map((suggestion, index) => (
        <div
          key={`${suggestion.type}-${index}`}
          className={cn(
            'group flex items-start gap-3 rounded-lg border p-4 transition-all hover:shadow-md',
            suggestionColors[suggestion.type],
          )}
        >
          {/* Icon */}
          <div className='mt-0.5 flex-shrink-0'>
            {suggestionIcons[suggestion.type] || suggestionIcons.custom}
          </div>

          {/* Content */}
          <div className='flex-1 min-w-0'>
            <h4 className='font-semibold text-sm mb-1'>{suggestion.title}</h4>
            <p className='text-sm text-muted-foreground leading-relaxed'>
              {suggestion.description}
            </p>
          </div>

          {/* Arrow indicator */}
          <div className='flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity'>
            <svg
              className='h-4 w-4 text-muted-foreground'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 5l7 7-7 7'
              />
            </svg>
          </div>
        </div>
      ))}
    </div>
  )
}
