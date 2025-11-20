// ============================================================================
// WEBHOOK SIGNATURE VALIDATOR
// Validates HMAC SHA-256 signatures for incoming webhooks
// ============================================================================

import { secureCompare } from './crypto.ts'

/**
 * Compute HMAC SHA-256 signature
 *
 * @param payload - The webhook payload (as string)
 * @param secret - The shared secret
 * @returns Hex-encoded signature
 */
async function computeSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(payload)

  // Import secret as HMAC key
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  // Compute HMAC
  const signature = await crypto.subtle.sign('HMAC', key, messageData)

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(signature))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  return hashHex
}

/**
 * Validate webhook signature
 *
 * @param payload - The webhook payload (as JSON string)
 * @param receivedSignature - The signature from the webhook header
 * @param secret - The shared secret
 * @returns true if signature is valid, false otherwise
 *
 * @example
 * ```typescript
 * const payload = await req.text()
 * const signature = req.headers.get('x-webhook-signature')
 * const secret = Deno.env.get('WEBHOOK_SECRET')!
 *
 * if (!await validateWebhookSignature(payload, signature, secret)) {
 *   return new Response('Invalid signature', { status: 403 })
 * }
 * ```
 */
export async function validateWebhookSignature(
  payload: string,
  receivedSignature: string | null,
  secret: string
): Promise<boolean> {
  if (!receivedSignature) {
    return false
  }

  if (!secret) {
    throw new Error('Webhook secret not configured')
  }

  try {
    const expectedSignature = await computeSignature(payload, secret)

    // Use constant-time comparison to prevent timing attacks
    return secureCompare(receivedSignature.toLowerCase(), expectedSignature.toLowerCase())
  } catch (error) {
    console.error('Signature validation error:', error)
    return false
  }
}

/**
 * Generate signature for outgoing webhooks
 *
 * @param payload - The payload to sign (as JSON string)
 * @param secret - The shared secret
 * @returns Hex-encoded signature
 *
 * @example
 * ```typescript
 * const payload = JSON.stringify({ event: 'sync.completed', data: {...} })
 * const signature = await generateWebhookSignature(payload, secret)
 *
 * await fetch(webhookUrl, {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'X-Webhook-Signature': signature
 *   },
 *   body: payload
 * })
 * ```
 */
export async function generateWebhookSignature(
  payload: string,
  secret: string
): Promise<string> {
  return await computeSignature(payload, secret)
}

/**
 * Validate N8N webhook specifically
 * N8N sends signature in 'x-n8n-signature' header
 *
 * @param req - The incoming request
 * @returns true if valid, false otherwise
 */
export async function validateN8NWebhook(req: Request): Promise<boolean> {
  const signature = req.headers.get('x-n8n-signature')
  const secret = Deno.env.get('N8N_WEBHOOK_SECRET')

  if (!secret) {
    console.warn('N8N_WEBHOOK_SECRET not configured - webhook validation disabled')
    // In development, allow without validation if secret not set
    return Deno.env.get('ENVIRONMENT') === 'development'
  }

  const payload = await req.text()

  return await validateWebhookSignature(payload, signature, secret)
}

/**
 * Middleware to validate webhook before processing
 * Throws error if validation fails
 */
export async function requireValidWebhook(
  req: Request,
  secret: string
): Promise<string> {
  const signature = req.headers.get('x-webhook-signature') ||
                    req.headers.get('x-n8n-signature')
  const payload = await req.text()

  const isValid = await validateWebhookSignature(payload, signature, secret)

  if (!isValid) {
    throw new Error('Invalid webhook signature')
  }

  return payload
}
