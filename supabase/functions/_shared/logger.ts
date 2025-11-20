// ============================================================================
// STRUCTURED LOGGER
// Provides consistent logging across all Edge Functions
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogMetadata {
  [key: string]: unknown
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  service: string
  message: string
  metadata?: LogMetadata
  error?: {
    name: string
    message: string
    stack?: string
  }
}

export class Logger {
  private readonly service: string
  private readonly level: LogLevel
  private readonly levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  }

  constructor(service: string, level: LogLevel = 'info') {
    this.service = service
    this.level = level
  }

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.level]
  }

  /**
   * Format and output log entry
   */
  private log(level: LogLevel, message: string, metadata?: LogMetadata, error?: Error): void {
    if (!this.shouldLog(level)) {
      return
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      message,
      metadata
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    }

    // In production, this could be sent to external service (Sentry, LogTail, etc)
    const logString = JSON.stringify(entry)

    switch (level) {
      case 'debug':
      case 'info':
        console.log(logString)
        break
      case 'warn':
        console.warn(logString)
        break
      case 'error':
        console.error(logString)
        break
    }
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string, metadata?: LogMetadata): void {
    this.log('debug', message, metadata)
  }

  /**
   * Log info message
   */
  info(message: string, metadata?: LogMetadata): void {
    this.log('info', message, metadata)
  }

  /**
   * Log warning message
   */
  warn(message: string, metadata?: LogMetadata): void {
    this.log('warn', message, metadata)
  }

  /**
   * Log error message
   */
  error(message: string, error: Error, metadata?: LogMetadata): void {
    this.log('error', message, metadata, error)
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogMetadata): Logger {
    const childLogger = new Logger(this.service, this.level)

    // Override log method to include parent context
    const originalLog = childLogger.log.bind(childLogger)
    childLogger.log = (level: LogLevel, message: string, metadata?: LogMetadata, error?: Error) => {
      originalLog(level, message, { ...context, ...metadata }, error)
    }

    return childLogger
  }
}

/**
 * Create a logger instance with service name and log level from environment
 */
export function createLogger(service: string): Logger {
  const logLevel = (Deno.env.get('LOG_LEVEL') || 'info') as LogLevel
  return new Logger(service, logLevel)
}
