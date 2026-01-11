/**
 * Simple Collapsible component with Accordion Group support
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

// Context for accordion group behavior
const CollapsibleGroupContext = React.createContext<{
  openId: string | null
  setOpenId: (id: string | null) => void
  accordion: boolean
} | null>(null)

interface CollapsibleGroupProps {
  children: React.ReactNode
  className?: string
  /**
   * If true, only one collapsible can be open at a time (accordion behavior)
   */
  accordion?: boolean
}

export function CollapsibleGroup({
  children,
  className,
  accordion = false,
}: CollapsibleGroupProps) {
  const [openId, setOpenId] = React.useState<string | null>(null)

  return (
    <CollapsibleGroupContext.Provider value={{ openId, setOpenId, accordion }}>
      <div className={className}>{children}</div>
    </CollapsibleGroupContext.Provider>
  )
}

interface CollapsibleProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  className?: string
  /**
   * Unique ID for accordion behavior (required when inside CollapsibleGroup with accordion=true)
   */
  id?: string
  /**
   * If true, this collapsible ignores accordion behavior and can be opened independently
   */
  independent?: boolean
}

export function Collapsible({
  open,
  onOpenChange,
  children,
  className,
  id,
  independent = false,
}: CollapsibleProps) {
  const groupContext = React.useContext(CollapsibleGroupContext)
  const [internalOpen, setInternalOpen] = React.useState(!!open)

  // Determine if this collapsible is part of an accordion group
  const isInAccordion = groupContext && groupContext.accordion && !independent
  const isOpenInGroup = isInAccordion && id ? groupContext.openId === id : false

  // Use group state if in accordion, otherwise use local or controlled state
  const isOpen = open !== undefined
    ? open
    : isInAccordion
      ? isOpenInGroup
      : internalOpen

  const handleToggle = () => {
    if (isInAccordion && id) {
      // Accordion behavior: toggle this ID, close others
      groupContext.setOpenId(isOpenInGroup ? null : id)
    } else {
      // Independent behavior: toggle local state
      const newState = !isOpen
      setInternalOpen(newState)
      onOpenChange?.(newState)
    }
  }

  return (
    <div className={cn('border rounded-lg', className)}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            isOpen,
            onToggle: handleToggle,
          })
        }
        return child
      })}
    </div>
  )
}

interface CollapsibleTriggerProps {
  isOpen?: boolean
  onToggle?: () => void
  children: React.ReactNode
  className?: string
}

export function CollapsibleTrigger({
  isOpen,
  onToggle,
  children,
  className,
}: CollapsibleTriggerProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors',
        className,
      )}
    >
      {children}
      <svg
        className={cn(
          'size-4 shrink-0 transition-transform duration-200',
          isOpen && 'rotate-180',
        )}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>
  )
}

interface CollapsibleContentProps {
  isOpen?: boolean
  children: React.ReactNode
  className?: string
}

export function CollapsibleContent({
  isOpen,
  children,
  className,
}: CollapsibleContentProps) {
  if (!isOpen) return null

  return <div className={cn('p-4 pt-0 border-t', className)}>{children}</div>
}
