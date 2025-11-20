// ============================================================================
// ENCRYPTION SERVICE
// Provides AES-256-GCM encryption for sensitive data (API keys, tokens)
// ============================================================================

/**
 * Encryption algorithm: AES-256-GCM
 * - AES: Advanced Encryption Standard (industry standard)
 * - 256-bit key: Maximum security
 * - GCM mode: Galois/Counter Mode (provides both encryption and authentication)
 */

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 12 // GCM recommended IV length
const TAG_LENGTH = 128 // Authentication tag length

/**
 * Get encryption key from environment
 * Must be exactly 32 bytes (base64 encoded)
 */
function getEncryptionKey(): Uint8Array {
  const keyBase64 = Deno.env.get('ENCRYPTION_KEY')

  if (!keyBase64) {
    throw new Error('ENCRYPTION_KEY environment variable not set')
  }

  // Decode base64 to binary
  try {
    const decoded = atob(keyBase64)
    const keyBytes = new Uint8Array(decoded.length)
    for (let i = 0; i < decoded.length; i++) {
      keyBytes[i] = decoded.charCodeAt(i)
    }

    if (keyBytes.length !== 32) {
      throw new Error(`ENCRYPTION_KEY must be exactly 32 bytes, got ${keyBytes.length}`)
    }

    return keyBytes
  } catch (error: any) {
    throw new Error(`Invalid ENCRYPTION_KEY format: ${error.message}`)
  }
}

/**
 * Import encryption key for Web Crypto API
 */
async function importKey(keyBytes: Uint8Array): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt plaintext using AES-256-GCM
 *
 * @param plaintext - The text to encrypt
 * @returns Base64-encoded encrypted data (includes IV and tag)
 *
 * Format: base64(IV + ciphertext + authTag)
 */
export async function encrypt(plaintext: string): Promise<string> {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty string')
  }

  try {
    // Get encryption key
    const keyBytes = getEncryptionKey()
    const key = await importKey(keyBytes)

    // Generate random IV (Initialization Vector)
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))

    // Convert plaintext to bytes
    const encoder = new TextEncoder()
    const plaintextBytes = encoder.encode(plaintext)

    // Encrypt
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv,
        tagLength: TAG_LENGTH
      },
      key,
      plaintextBytes
    )

    // Combine IV + ciphertext (tag is included in ciphertext with GCM)
    const combined = new Uint8Array(iv.length + ciphertext.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(ciphertext), iv.length)

    // Encode to base64
    return btoa(String.fromCharCode(...combined))
  } catch (error: any) {
    throw new Error(`Encryption failed: ${error.message}`)
  }
}

/**
 * Decrypt ciphertext using AES-256-GCM
 *
 * @param ciphertext - Base64-encoded encrypted data
 * @returns Decrypted plaintext
 */
export async function decrypt(ciphertext: string): Promise<string> {
  if (!ciphertext) {
    throw new Error('Cannot decrypt empty string')
  }

  try {
    // Get encryption key
    const keyBytes = getEncryptionKey()
    const key = await importKey(keyBytes)

    // Decode from base64
    const decoded = atob(ciphertext)
    const combined = new Uint8Array(decoded.length)
    for (let i = 0; i < decoded.length; i++) {
      combined[i] = decoded.charCodeAt(i)
    }

    // Extract IV and encrypted data
    const iv = combined.slice(0, IV_LENGTH)
    const encryptedData = combined.slice(IV_LENGTH)

    // Decrypt
    const decryptedBytes = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
        tagLength: TAG_LENGTH
      },
      key,
      encryptedData
    )

    // Convert bytes to string
    const decoder = new TextDecoder()
    return decoder.decode(decryptedBytes)
  } catch (error: any) {
    throw new Error(`Decryption failed: ${error.message}`)
  }
}

/**
 * Hash a string using SHA-256 (for non-reversible hashing)
 * Useful for checksums, integrity verification
 *
 * @param text - Text to hash
 * @returns Hex-encoded SHA-256 hash
 */
export async function hash(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)

  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  return hashHex
}

/**
 * Generate a secure random string
 * Useful for generating secrets, tokens, IDs
 *
 * @param length - Length of random string (in bytes, will be hex encoded to 2x)
 * @returns Hex-encoded random string
 */
export function generateRandomString(length: number = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Constant-time string comparison to prevent timing attacks
 * Use this when comparing secrets, tokens, hashes
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}
