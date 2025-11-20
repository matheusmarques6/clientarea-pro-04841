#!/usr/bin/env -S deno run --allow-env

// ============================================================================
// CRYPTO SERVICE TESTS
// Manual tests for encryption/decryption functionality
// ============================================================================

import { encrypt, decrypt, hash, generateRandomString, secureCompare } from '../supabase/functions/_shared/crypto.ts'

console.log('🧪 Testing Crypto Service...\n')

// Test 1: Encryption and Decryption
console.log('Test 1: Encrypt/Decrypt')
try {
  // Set test encryption key (32 bytes base64)
  Deno.env.set('ENCRYPTION_KEY', 'dGVzdGtleTEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI=') // "testkey1234567890123456789012" base64

  const plaintext = 'my-secret-api-key-12345'
  console.log('  Original:', plaintext)

  const encrypted = await encrypt(plaintext)
  console.log('  Encrypted:', encrypted.substring(0, 50) + '...')

  const decrypted = await decrypt(encrypted)
  console.log('  Decrypted:', decrypted)

  if (plaintext === decrypted) {
    console.log('  ✅ PASS: Encryption/Decryption works correctly\n')
  } else {
    console.log('  ❌ FAIL: Decrypted text does not match original\n')
  }
} catch (error: any) {
  console.log('  ❌ FAIL:', error.message, '\n')
}

// Test 2: Hash Function
console.log('Test 2: SHA-256 Hash')
try {
  const text = 'hello world'
  const hashed = await hash(text)
  const expectedHash = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'

  console.log('  Input:', text)
  console.log('  Hash:', hashed)
  console.log('  Expected:', expectedHash)

  if (hashed === expectedHash) {
    console.log('  ✅ PASS: Hash function works correctly\n')
  } else {
    console.log('  ❌ FAIL: Hash does not match expected value\n')
  }
} catch (error: any) {
  console.log('  ❌ FAIL:', error.message, '\n')
}

// Test 3: Random String Generation
console.log('Test 3: Random String Generation')
try {
  const random1 = generateRandomString(16)
  const random2 = generateRandomString(16)

  console.log('  Random 1:', random1)
  console.log('  Random 2:', random2)

  if (random1 !== random2 && random1.length === 32 && random2.length === 32) {
    console.log('  ✅ PASS: Random strings are unique and correct length\n')
  } else {
    console.log('  ❌ FAIL: Random strings are not unique or wrong length\n')
  }
} catch (error: any) {
  console.log('  ❌ FAIL:', error.message, '\n')
}

// Test 4: Secure Compare
console.log('Test 4: Secure Compare (constant-time)')
try {
  const str1 = 'secret123'
  const str2 = 'secret123'
  const str3 = 'secret456'

  const result1 = secureCompare(str1, str2)
  const result2 = secureCompare(str1, str3)

  console.log('  Compare equal:', result1)
  console.log('  Compare different:', result2)

  if (result1 === true && result2 === false) {
    console.log('  ✅ PASS: Secure compare works correctly\n')
  } else {
    console.log('  ❌ FAIL: Secure compare failed\n')
  }
} catch (error: any) {
  console.log('  ❌ FAIL:', error.message, '\n')
}

console.log('✅ All crypto tests completed!')
