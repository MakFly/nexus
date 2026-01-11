/**
 * Logger System for Nexus Frontend
 * Debug utility for TanStack Router with fetch interception
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  data?: any
  context?: string
}

/**
 * Logger class with levels and context support
 */
class Logger {
  private logs: LogEntry[] = []
  private maxLogs = 500
  private isDevelopment = import.meta.env.DEV

  private formatTimestamp(): string {
    return new Date().toISOString()
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.isDevelopment) return level === 'error' || level === 'warn'
    return true
  }

  private addLog(entry: LogEntry) {
    if (!this.shouldLog(entry.level)) return

    this.logs.push(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }
  }

  private log(level: LogLevel, message: string, data?: any, context?: string) {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      message,
      data,
      context,
    }

    this.addLog(entry)

    const prefix = context ? `[${context}]` : ''
    const timestamp = new Date(entry.timestamp).toLocaleTimeString()

    switch (level) {
      case 'debug':
        console.debug(`%c[${timestamp}]${prefix} DEBUG`, 'color: #888', message, data || '')
        break
      case 'info':
        console.info(`%c[${timestamp}]${prefix} INFO`, 'color: #28a745', message, data || '')
        break
      case 'warn':
        console.warn(`%c[${timestamp}]${prefix} WARN`, 'color: #ffc107; font-weight: bold', message, data || '')
        break
      case 'error':
        console.error(`%c[${timestamp}]${prefix} ERROR`, 'color: #dc3545; font-weight: bold', message, data || '')
        break
    }
  }

  debug(message: string, data?: any, context?: string) {
    this.log('debug', message, data, context)
  }

  info(message: string, data?: any, context?: string) {
    this.log('info', message, data, context)
  }

  warn(message: string, data?: any, context?: string) {
    this.log('warn', message, data, context)
  }

  error(message: string, data?: any, context?: string) {
    this.log('error', message, data, context)
  }

  getLogs(filter?: { level?: LogLevel; context?: string }): LogEntry[] {
    let filtered = [...this.logs]

    if (filter?.level) {
      filtered = filtered.filter(log => log.level === filter.level)
    }

    if (filter?.context) {
      filtered = filtered.filter(log => log.context === filter.context)
    }

    return filtered
  }

  clearLogs() {
    this.logs = []
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }
}

export const logger = new Logger()

/**
 * Fetch interceptor for API request/response logging
 */
export interface FetchLogEntry extends LogEntry {
  type: 'request' | 'response'
  requestMethod?: string
  requestUrl?: string
  responseStatus?: number
  responseStatusText?: string
  duration?: number
}

class FetchLogger {
  private logs: FetchLogEntry[] = []
  private logger = logger

  private extractBaseUrl(url: string): string {
    try {
      const urlObj = new URL(url)
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`
    } catch {
      return url
    }
  }

  async fetch<T = any>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
    const startTime = performance.now()
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const method = init?.method || 'GET'

    this.logger.debug(`→ ${method} ${url}`, init?.body, 'API Request')

    try {
      const response = await fetch(input, init)
      const duration = performance.now() - startTime

      // Log response
      const status = response.status
      const statusText = response.statusText
      const isSuccess = status >= 200 && status < 300

      if (isSuccess) {
        this.logger.info(`← ${method} ${url} ${status} (${duration.toFixed(0)}ms)`, undefined, 'API Response')
      } else {
        this.logger.error(`← ${method} ${url} ${status} ${statusText} (${duration.toFixed(0)}ms)`, { status, statusText }, 'API Error')
      }

      // Try to log response body for debugging
      if (this.logger['isDevelopment']) {
        const contentType = response.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          try {
            const clone = response.clone()
            const data = await clone.json()
            if (!isSuccess) {
              this.logger.debug(`Response body:`, data, 'API Debug')
            }
          } catch {
            // Ignore JSON parse errors
          }
        }
      }

      return response as unknown as T
    } catch (error) {
      const duration = performance.now() - startTime
      this.logger.error(`✗ ${method} ${url} - Network error (${duration.toFixed(0)}ms)`, error, 'API Network')
      throw error
    }
  }
}

export const fetchLogger = new FetchLogger()

/**
 * Hook to expose logger to components for debugging
 */
export function useLogger() {
  return {
    logger,
    fetchLogger,
    getLogs: logger.getLogs.bind(logger),
    clearLogs: logger.clearLogs.bind(logger),
    exportLogs: logger.exportLogs.bind(logger),
  }
}

/**
 * Debug panel component for development
 */
export function getDebugInfo() {
  return {
    logs: logger.getLogs(),
    logCount: logger['logs'].length,
    exported: logger.exportLogs(),
  }
}
