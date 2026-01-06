import * as React from 'react'
import { Activity, Zap, Database, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SystemStatus, OptimizerState } from '@/hooks/use-ralph-files'

interface StatusSectionProps {
  systemStatus: SystemStatus
  optimizerState: OptimizerState | null
  formatRelativeTime: (timestamp: string) => string
}

export function StatusSection({
  systemStatus,
  optimizerState,
  formatRelativeTime,
}: StatusSectionProps) {
  const statusItems = [
    {
      label: 'Hooks Active',
      value: systemStatus.hooksEnabled ? 'Enabled' : 'Disabled',
      icon: systemStatus.hooksEnabled ? (
        <CheckCircle className='h-4 w-4 text-green-500' />
      ) : (
        <AlertCircle className='h-4 w-4 text-yellow-500' />
      ),
      color: systemStatus.hooksEnabled ? 'text-green-500' : 'text-yellow-500',
    },
    {
      label: 'Total Memories',
      value: systemStatus.totalMemories.toString(),
      icon: <Database className='h-4 w-4 text-blue-400' />,
      color: 'text-blue-400',
    },
    {
      label: 'Optimizations',
      value: (optimizerState?.optimization_count || 0).toString(),
      icon: <Zap className='h-4 w-4 text-purple-400' />,
      color: 'text-purple-400',
    },
  ]

  return (
    <div className='space-y-4'>
      {/* Status cards */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
        {statusItems.map((item) => (
          <div
            key={item.label}
            className='flex flex-col items-center justify-center rounded-lg border bg-card p-4'
          >
            <div className='flex items-center gap-2 mb-1'>
              {item.icon}
              <span className='text-xs text-muted-foreground'>{item.label}</span>
            </div>
            <span className={cn('text-2xl font-bold', item.color)}>
              {item.value}
            </span>
          </div>
        ))}
      </div>

      {/* Activity status */}
      <div className='rounded-lg border bg-card p-4'>
        <div className='flex items-center justify-between mb-2'>
          <div className='flex items-center gap-2'>
            <Activity className='h-4 w-4 text-muted-foreground' />
            <span className='text-sm font-medium'>System Status</span>
          </div>
          {systemStatus.isActive ? (
            <span className='inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-medium'>
              <span className='relative flex h-2 w-2'>
                <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75'></span>
                <span className='relative inline-flex rounded-full h-2 w-2 bg-green-500'></span>
              </span>
              Active
            </span>
          ) : (
            <span className='inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-500/10 text-gray-500 text-xs font-medium'>
              Inactive
            </span>
          )}
        </div>

        <div className='space-y-1 text-xs text-muted-foreground'>
          <div className='flex justify-between'>
            <span>Last activity:</span>
            <span className={cn(!systemStatus.lastActivity && 'italic')}>
              {systemStatus.lastActivity
                ? formatRelativeTime(systemStatus.lastActivity)
                : 'Never'}
            </span>
          </div>
          <div className='flex justify-between'>
            <span>Last optimization:</span>
            <span className={cn(!optimizerState?.last_compression && 'italic')}>
              {optimizerState?.last_compression
                ? formatRelativeTime(optimizerState.last_compression)
                : 'Never'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
