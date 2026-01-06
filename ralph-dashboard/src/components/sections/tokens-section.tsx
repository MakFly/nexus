import * as React from 'react'
import { Coins, TrendingUp, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TokenSavings {
  savedTokens: number
  savedPercent: number
}

interface TokensSectionProps {
  tokenSavings: TokenSavings
  totalMemories: number
}

export function TokensSection({
  tokenSavings,
  totalMemories,
}: TokensSectionProps) {
  // Format large numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const stats = [
    {
      label: 'Tokens Saved',
      value: formatNumber(tokenSavings.savedTokens),
      icon: <Coins className='h-5 w-5 text-yellow-500' />,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: 'Savings',
      value: `${tokenSavings.savedPercent}%`,
      icon: <TrendingUp className='h-5 w-5 text-green-500' />,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Memories',
      value: totalMemories.toString(),
      icon: <Activity className='h-5 w-5 text-blue-500' />,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
  ]

  return (
    <div className='space-y-4'>
      {/* Main stats */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={cn(
              'flex flex-col items-center justify-center rounded-lg border p-4 transition-all hover:shadow-md',
              stat.bgColor,
            )}
          >
            <div className={cn('mb-2', stat.color)}>{stat.icon}</div>
            <span className={cn('text-3xl font-bold', stat.color)}>
              {stat.value}
            </span>
            <span className='text-xs text-muted-foreground mt-1'>
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* Explanation */}
      <div className='rounded-lg border bg-card p-4'>
        <p className='text-sm text-muted-foreground leading-relaxed'>
          Each memory saves approximately <strong className='text-foreground'>~500 tokens</strong>{' '}
          by avoiding re-reading files. Without Ralph, relisting context would cost{' '}
          <strong className='text-foreground'>~2000 tokens</strong> per memory.
        </p>
        <div className='mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground'>
          <span>Estimated savings based on captured memories</span>
          <span className='flex items-center gap-1'>
            <span className='inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse'></span>
            Live calculation
          </span>
        </div>
      </div>

      {/* Token breakdown */}
      <div className='space-y-2'>
        <h4 className='text-sm font-medium flex items-center gap-2'>
          <Coins className='h-4 w-4 text-muted-foreground' />
          Token Economy
        </h4>
        <div className='grid grid-cols-2 gap-2 text-xs'>
          <div className='rounded border bg-card p-2'>
            <span className='text-muted-foreground'>Without Ralph:</span>
            <span className='ml-2 font-mono font-medium'>
              ~{formatNumber(totalMemories * 2000)}
            </span>
          </div>
          <div className='rounded border bg-card p-2'>
            <span className='text-muted-foreground'>With Ralph:</span>
            <span className='ml-2 font-mono font-medium text-green-500'>
              ~{formatNumber(totalMemories * 1500)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
