// ============================================================================
// INPUT SANITIZERS
// Validates and sanitizes user inputs to prevent injection attacks
// ============================================================================

/**
 * Sanitize Shopify domain
 * Prevents SSRF (Server-Side Request Forgery) attacks
 *
 * @param domain - The domain to sanitize (can include .myshopify.com or not)
 * @returns Sanitized domain (without .myshopify.com)
 * @throws Error if domain is invalid
 *
 * @example
 * sanitizeShopifyDomain('my-store.myshopify.com') // 'my-store'
 * sanitizeShopifyDomain('my-store') // 'my-store'
 * sanitizeShopifyDomain('https://my-store.myshopify.com') // 'my-store'
 */
export function sanitizeShopifyDomain(domain: string): string {
  if (!domain || typeof domain !== 'string') {
    throw new Error('Domain is required and must be a string')
  }

  // Remove protocol if present
  let cleaned = domain.replace(/^https?:\/\//, '')

  // Remove .myshopify.com if present
  cleaned = cleaned.replace(/\.myshopify\.com$/, '')

  // Remove trailing slashes and paths
  cleaned = cleaned.split('/')[0]

  // Validate format: only alphanumeric and hyphens
  // Must start and end with alphanumeric
  const validPattern = /^[a-z0-9][a-z0-9\-]*[a-z0-9]$/i

  if (!validPattern.test(cleaned)) {
    throw new Error(
      `Invalid Shopify domain format: "${domain}". ` +
      'Must contain only letters, numbers, and hyphens, ' +
      'and cannot start or end with a hyphen.'
    )
  }

  // Check length (Shopify domains are 3-63 characters)
  if (cleaned.length < 3 || cleaned.length > 63) {
    throw new Error(
      `Invalid Shopify domain length: "${cleaned}". ` +
      'Must be between 3 and 63 characters.'
    )
  }

  // Check for double hyphens (not allowed by Shopify)
  if (cleaned.includes('--')) {
    throw new Error(
      `Invalid Shopify domain: "${cleaned}". ` +
      'Cannot contain consecutive hyphens.'
    )
  }

  return cleaned.toLowerCase()
}

/**
 * Sanitize email address
 * Basic validation to prevent injection
 *
 * @param email - Email to validate
 * @returns Sanitized email (lowercased and trimmed)
 * @throws Error if email is invalid
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    throw new Error('Email is required and must be a string')
  }

  const cleaned = email.trim().toLowerCase()

  // Basic email validation
  const emailPattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i

  if (!emailPattern.test(cleaned)) {
    throw new Error(`Invalid email format: "${email}"`)
  }

  // Check max length (RFC 5321)
  if (cleaned.length > 320) {
    throw new Error('Email is too long (max 320 characters)')
  }

  return cleaned
}

/**
 * Sanitize URL
 * Ensures URL is valid and uses safe protocol
 *
 * @param url - URL to validate
 * @param allowedProtocols - Allowed protocols (default: ['https', 'http'])
 * @returns Sanitized URL object
 * @throws Error if URL is invalid
 */
export function sanitizeUrl(
  url: string,
  allowedProtocols: string[] = ['https', 'http']
): URL {
  if (!url || typeof url !== 'string') {
    throw new Error('URL is required and must be a string')
  }

  let urlObj: URL

  try {
    urlObj = new URL(url)
  } catch {
    throw new Error(`Invalid URL format: "${url}"`)
  }

  // Check protocol
  const protocol = urlObj.protocol.replace(':', '')
  if (!allowedProtocols.includes(protocol)) {
    throw new Error(
      `Invalid URL protocol: "${protocol}". ` +
      `Allowed: ${allowedProtocols.join(', ')}`
    )
  }

  // Check for localhost/private IPs (prevent SSRF)
  const hostname = urlObj.hostname.toLowerCase()
  const privatePatterns = [
    /^localhost$/i,
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^::1$/,
    /^fe80:/i
  ]

  const isPrivate = privatePatterns.some(pattern => pattern.test(hostname))

  if (isPrivate && Deno.env.get('ENVIRONMENT') !== 'development') {
    throw new Error(
      `Cannot access private IP or localhost: "${hostname}". ` +
      'This is blocked for security reasons.'
    )
  }

  return urlObj
}

/**
 * Sanitize UUID
 * Validates UUID format (v4)
 *
 * @param uuid - UUID string to validate
 * @returns Sanitized UUID (lowercased)
 * @throws Error if not a valid UUID
 */
export function sanitizeUuid(uuid: string): string {
  if (!uuid || typeof uuid !== 'string') {
    throw new Error('UUID is required and must be a string')
  }

  const cleaned = uuid.trim().toLowerCase()

  // UUID v4 pattern
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  if (!uuidPattern.test(cleaned)) {
    throw new Error(`Invalid UUID format: "${uuid}"`)
  }

  return cleaned
}

/**
 * Sanitize date string
 * Validates ISO 8601 date format
 *
 * @param dateString - Date string to validate (YYYY-MM-DD)
 * @returns Sanitized date string
 * @throws Error if not a valid date
 */
export function sanitizeDate(dateString: string): string {
  if (!dateString || typeof dateString !== 'string') {
    throw new Error('Date is required and must be a string')
  }

  const cleaned = dateString.trim()

  // ISO date pattern (YYYY-MM-DD)
  const datePattern = /^\d{4}-\d{2}-\d{2}$/

  if (!datePattern.test(cleaned)) {
    throw new Error(`Invalid date format: "${dateString}". Expected YYYY-MM-DD`)
  }

  // Validate it's a real date
  const date = new Date(cleaned)
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: "${dateString}"`)
  }

  return cleaned
}

/**
 * Sanitize integer
 * Ensures value is a valid integer within range
 *
 * @param value - Value to validate (string or number)
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Validated integer
 * @throws Error if not a valid integer or out of range
 */
export function sanitizeInteger(
  value: string | number,
  min?: number,
  max?: number
): number {
  const num = typeof value === 'string' ? parseInt(value, 10) : value

  if (isNaN(num) || !Number.isInteger(num)) {
    throw new Error(`Invalid integer: "${value}"`)
  }

  if (min !== undefined && num < min) {
    throw new Error(`Value ${num} is below minimum ${min}`)
  }

  if (max !== undefined && num > max) {
    throw new Error(`Value ${num} exceeds maximum ${max}`)
  }

  return num
}

/**
 * Sanitize SQL-like input
 * Removes SQL injection patterns
 * NOTE: This is NOT a replacement for parameterized queries!
 * Use Supabase query builders which auto-escape
 *
 * @param input - Input to sanitize
 * @returns Sanitized input
 */
export function sanitizeSqlInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  // Remove common SQL injection patterns
  let cleaned = input
    .replace(/['";]/g, '') // Remove quotes and semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comment start
    .replace(/\*\//g, '') // Remove block comment end
    .replace(/xp_/gi, '') // Remove xp_ commands
    .replace(/exec\s+/gi, '') // Remove exec commands
    .replace(/execute\s+/gi, '') // Remove execute commands
    .replace(/union\s+/gi, '') // Remove union statements
    .replace(/select\s+/gi, '') // Remove select statements
    .replace(/insert\s+/gi, '') // Remove insert statements
    .replace(/update\s+/gi, '') // Remove update statements
    .replace(/delete\s+/gi, '') // Remove delete statements
    .replace(/drop\s+/gi, '') // Remove drop statements

  return cleaned.trim()
}
