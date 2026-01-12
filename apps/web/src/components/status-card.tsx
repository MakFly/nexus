"use client"

import * as React from "react"
import { useNexusStore } from "@/stores/nexusStore"
import { cn } from "@/lib/utils"
import { ServerIcon, CpuIcon } from "lucide-react"

interface StatusIndicatorProps {
  label: string
  isConnected: boolean
  isLoading?: boolean
  icon: React.ReactNode
}

function StatusIndicator({ label, isConnected, isLoading, icon }: StatusIndicatorProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      {isLoading ? (
        <div className="h-4 w-8 rounded bg-muted animate-pulse" />
      ) : (
        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              "size-2 rounded-full",
              isConnected ? "bg-emerald-500" : "bg-red-500"
            )}
          />
          <span className={cn(
            "text-xs font-medium",
            isConnected ? "text-emerald-500" : "text-red-500"
          )}>
            {isConnected ? "OK" : "OFF"}
          </span>
        </div>
      )}
    </div>
  )
}

export function StatusCard() {
  const { isConnected, checkConnection, lastConnectionCheck } = useNexusStore()

  // Start loading if no recent check
  const needsCheck = !lastConnectionCheck || Date.now() - lastConnectionCheck > 30000
  const [isLoading, setIsLoading] = React.useState(needsCheck)
  const [mcpStatus, setMcpStatus] = React.useState<boolean | null>(needsCheck ? null : isConnected)
  const hasCheckedRef = React.useRef(false)

  React.useEffect(() => {
    // Only check once if needed
    if (needsCheck && !hasCheckedRef.current) {
      hasCheckedRef.current = true
      checkConnection().then((apiOk) => {
        setMcpStatus(apiOk)
        setIsLoading(false)
      }).catch(() => {
        setIsLoading(false)
      })
    }
  }, []) // Empty deps - only run on mount

  // Sync MCP status with API connection state
  React.useEffect(() => {
    if (!isLoading) {
      setMcpStatus(isConnected)
    }
  }, [isConnected, isLoading])

  return (
    <div className="mx-2 mb-2 rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-3">
      <div className="space-y-2">
        <StatusIndicator
          label="API"
          isConnected={isConnected}
          isLoading={isLoading}
          icon={<ServerIcon className="size-3.5" />}
        />
        <StatusIndicator
          label="MCP"
          isConnected={mcpStatus ?? false}
          isLoading={isLoading}
          icon={<CpuIcon className="size-3.5" />}
        />
      </div>
    </div>
  )
}
