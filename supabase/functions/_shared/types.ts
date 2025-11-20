// ============================================================================
// SHARED TYPES
// Common type definitions used across Edge Functions
// ============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  metadata?: {
    timestamp: string
    requestId?: string
    [key: string]: unknown
  }
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

/**
 * Pagination metadata in response
 */
export interface PaginationMetadata {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

/**
 * Store sync status
 */
export type SyncStatus = 'idle' | 'queued' | 'processing' | 'completed' | 'failed'

/**
 * Sync job metadata
 */
export interface SyncJobMetadata {
  startedAt?: string
  completedAt?: string
  duration?: number
  recordsProcessed?: number
  errors?: Array<{
    message: string
    timestamp: string
  }>
  progress?: {
    current: number
    total: number
    percentage: number
  }
}

/**
 * Environment type
 */
export type Environment = 'production' | 'staging' | 'development'

/**
 * User role types
 */
export type UserRole = 'owner' | 'manager' | 'viewer' | 'admin' | 'super_admin' | 'support'

/**
 * Authentication context
 */
export interface AuthContext {
  userId: string
  email?: string
  role?: UserRole
  storeIds?: string[]
}

/**
 * Rate limiter metrics
 */
export interface RateLimiterMetrics {
  requestsAcquired: number
  requestsThrottled: number
  averageWaitTime: number
  lastResetAt: string
}

/**
 * Error codes
 */
export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  BAD_REQUEST = 'BAD_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  TIMEOUT = 'TIMEOUT',
  CONFLICT = 'CONFLICT'
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: unknown
): ApiResponse<never> {
  return {
    success: false,
    error: {
      code,
      message,
      details
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Create standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  metadata?: Record<string, unknown>
): ApiResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata
    }
  }
}

/**
 * HTTP status codes
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const
