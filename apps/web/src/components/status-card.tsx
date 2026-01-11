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
      <div className="flex items-center gap-1.5">
        {isLoading ? (
          <div className="size-2 rounded-full bg-yellow-500 animate-pulse" />
        ) : (
          <div
            className={cn(
              "size-2 rounded-full",
              isConnected ? "bg-emerald-500" : "bg-red-500"
            )}
          />
        )}
        <span className={cn(
          "text-xs font-medium",
          isLoading ? "text-yellow-500" : isConnected ? "text-emerald-500" : "text-red-500"
        )}>
          {isLoading ? "..." : isConnected ? "OK" : "OFF"}
        </span>
      </div>
    </div>
  )
}

export function StatusCard() {
  const { isConnected, checkConnection } = useNexusStore()
  const [isLoading, setIsLoading] = React.useState(true)
  const [mcpStatus, setMcpStatus] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    const check = async () => {
      setIsLoading(true)
      try {
        const apiOk = await checkConnection(true)
        // MCP depends on API - if API is up, MCP can connect
        setMcpStatus(apiOk)
      } finally {
        setIsLoading(false)
      }
    }

    check()
    // Recheck every 30 seconds
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [checkConnection])

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
