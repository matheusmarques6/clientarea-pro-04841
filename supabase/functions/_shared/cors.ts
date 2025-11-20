// ============================================================================
// CORS HEADERS HANDLER
// Manages Cross-Origin Resource Sharing with environment-specific whitelisting
// ============================================================================

export interface CorsConfig {
  allowedOrigins: string[]
  allowedMethods: string[]
  allowedHeaders: string[]
  allowCredentials: boolean
  maxAge?: number
}

/**
 * Get allowed origins based on environment
 */
function getAllowedOrigins(): string[] {
  const environment = Deno.env.get('ENVIRONMENT') || 'development'

  const origins: Record<string, string[]> = {
    production: [
      'https://clientarea.convertfy.com',
      'https://app.convertfy.com'
    ],
    staging: [
      'https://staging.convertfy.com',
      'http://localhost:8080',
      'http://localhost:5173'
    ],
    development: [
      'http://localhost:8080',
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:5173'
    ]
  }

  // Allow custom origins via environment variable (comma-separated)
  const customOrigins = Deno.env.get('ALLOWED_ORIGINS')
  if (customOrigins) {
    return customOrigins.split(',').map((o: string) => o.trim())
  }

  return origins[environment] || origins.development
}

/**
 * Default CORS configuration
 */
const DEFAULT_CORS_CONFIG: CorsConfig = {
  allowedOrigins: getAllowedOrigins(),
  allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'authorization',
    'x-client-info',
    'apikey',
    'content-type',
    'x-requested-with'
  ],
  allowCredentials: true,
  maxAge: 86400 // 24 hours
}

/**
 * Get CORS headers for a request
 */
export function getCorsHeaders(
  requestOrigin?: string | null,
  config: Partial<CorsConfig> = {}
): Record<string, string> {
  const finalConfig = { ...DEFAULT_CORS_CONFIG, ...config }

  // Check if origin is allowed
  const origin = requestOrigin || ''
  const isAllowed = finalConfig.allowedOrigins.some(allowed => {
    // Exact match
    if (allowed === origin) return true

    // Wildcard subdomain match (e.g., *.convertfy.com)
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2)
      return origin.endsWith(domain)
    }

    return false
  })

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': finalConfig.allowedMethods.join(', '),
    'Access-Control-Allow-Headers': finalConfig.allowedHeaders.join(', ')
  }

  // Only set origin if it's in whitelist
  if (isAllowed && origin) {
    headers['Access-Control-Allow-Origin'] = origin

    if (finalConfig.allowCredentials) {
      headers['Access-Control-Allow-Credentials'] = 'true'
    }
  } else if (finalConfig.allowedOrigins.includes('*')) {
    // Fallback to wildcard only if explicitly configured
    headers['Access-Control-Allow-Origin'] = '*'
  }

  if (finalConfig.maxAge) {
    headers['Access-Control-Max-Age'] = finalConfig.maxAge.toString()
  }

  return headers
}

/**
 * Handle OPTIONS preflight request
 */
export function handleCorsPreFlight(req: Request): Response {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  return new Response(null, {
    status: 204,
    headers: corsHeaders
  })
}

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false

  const allowedOrigins = getAllowedOrigins()

  return allowedOrigins.some(allowed => {
    if (allowed === origin) return true
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2)
      return origin.endsWith(domain)
    }
    return false
  })
}

/**
 * Add security headers to response
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  }
}

// Legacy export for backward compatibility (will be removed after migration)
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
