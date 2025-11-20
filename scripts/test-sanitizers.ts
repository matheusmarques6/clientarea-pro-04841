#!/usr/bin/env -S deno run

// ============================================================================
// SANITIZERS TESTS
// Manual tests for input sanitization functions
// ============================================================================

import {
  sanitizeShopifyDomain,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeUuid,
  sanitizeDate,
  sanitizeInteger
} from '../supabase/functions/_shared/sanitizers.ts'

console.log('🧪 Testing Sanitizers...\n')

// Test 1: Shopify Domain Sanitization
console.log('Test 1: Shopify Domain Sanitization')
const domainTests = [
  { input: 'my-store.myshopify.com', expected: 'my-store', shouldPass: true },
  { input: 'my-store', expected: 'my-store', shouldPass: true },
  { input: 'https://my-store.myshopify.com', expected: 'my-store', shouldPass: true },
  { input: 'invalid..domain', expected: null, shouldPass: false },
  { input: '-invalid', expected: null, shouldPass: false },
  { input: 'ab', expected: null, shouldPass: false }, // Too short
]

for (const test of domainTests) {
  try {
    const result = sanitizeShopifyDomain(test.input)
    if (test.shouldPass && result === test.expected) {
      console.log(`  ✅ "${test.input}" → "${result}"`)
    } else if (test.shouldPass) {
      console.log(`  ❌ Expected "${test.expected}", got "${result}"`)
    } else {
      console.log(`  ❌ Should have failed: "${test.input}"`)
    }
  } catch (error: any) {
    if (!test.shouldPass) {
      console.log(`  ✅ Correctly rejected: "${test.input}"`)
    } else {
      console.log(`  ❌ Unexpected error: ${error.message}`)
    }
  }
}
console.log('')

// Test 2: Email Sanitization
console.log('Test 2: Email Sanitization')
const emailTests = [
  { input: 'user@example.com', expected: 'user@example.com', shouldPass: true },
  { input: 'USER@EXAMPLE.COM', expected: 'user@example.com', shouldPass: true },
  { input: '  user@example.com  ', expected: 'user@example.com', shouldPass: true },
  { input: 'invalid-email', expected: null, shouldPass: false },
  { input: '@example.com', expected: null, shouldPass: false },
]

for (const test of emailTests) {
  try {
    const result = sanitizeEmail(test.input)
    if (test.shouldPass && result === test.expected) {
      console.log(`  ✅ "${test.input}" → "${result}"`)
    } else if (test.shouldPass) {
      console.log(`  ❌ Expected "${test.expected}", got "${result}"`)
    } else {
      console.log(`  ❌ Should have failed: "${test.input}"`)
    }
  } catch (error: any) {
    if (!test.shouldPass) {
      console.log(`  ✅ Correctly rejected: "${test.input}"`)
    } else {
      console.log(`  ❌ Unexpected error: ${error.message}`)
    }
  }
}
console.log('')

// Test 3: URL Sanitization
console.log('Test 3: URL Sanitization')
const urlTests = [
  { input: 'https://example.com', shouldPass: true },
  { input: 'http://example.com', shouldPass: true },
  { input: 'ftp://example.com', shouldPass: false }, // Invalid protocol
  { input: 'not-a-url', shouldPass: false },
]

for (const test of urlTests) {
  try {
    const result = sanitizeUrl(test.input)
    if (test.shouldPass) {
      console.log(`  ✅ "${test.input}" → Valid URL`)
    } else {
      console.log(`  ❌ Should have failed: "${test.input}"`)
    }
  } catch (error: any) {
    if (!test.shouldPass) {
      console.log(`  ✅ Correctly rejected: "${test.input}"`)
    } else {
      console.log(`  ❌ Unexpected error: ${error.message}`)
    }
  }
}
console.log('')

// Test 4: UUID Validation
console.log('Test 4: UUID Validation')
const uuidTests = [
  { input: '550e8400-e29b-41d4-a716-446655440000', shouldPass: true },
  { input: 'invalid-uuid', shouldPass: false },
  { input: '550e8400-e29b-31d4-a716-446655440000', shouldPass: false }, // v3, not v4
]

for (const test of uuidTests) {
  try {
    const result = sanitizeUuid(test.input)
    if (test.shouldPass) {
      console.log(`  ✅ "${test.input}" → Valid UUID`)
    } else {
      console.log(`  ❌ Should have failed: "${test.input}"`)
    }
  } catch (error: any) {
    if (!test.shouldPass) {
      console.log(`  ✅ Correctly rejected: "${test.input}"`)
    } else {
      console.log(`  ❌ Unexpected error: ${error.message}`)
    }
  }
}
console.log('')

// Test 5: Date Validation
console.log('Test 5: Date Validation')
const dateTests = [
  { input: '2025-01-19', shouldPass: true },
  { input: '2025-13-01', shouldPass: false }, // Invalid month
  { input: '2025/01/19', shouldPass: false }, // Wrong format
  { input: 'not-a-date', shouldPass: false },
]

for (const test of dateTests) {
  try {
    const result = sanitizeDate(test.input)
    if (test.shouldPass) {
      console.log(`  ✅ "${test.input}" → Valid date`)
    } else {
      console.log(`  ❌ Should have failed: "${test.input}"`)
    }
  } catch (error: any) {
    if (!test.shouldPass) {
      console.log(`  ✅ Correctly rejected: "${test.input}"`)
    } else {
      console.log(`  ❌ Unexpected error: ${error.message}`)
    }
  }
}
console.log('')

// Test 6: Integer Validation
console.log('Test 6: Integer Validation with Range')
const intTests = [
  { input: '42', min: 0, max: 100, shouldPass: true },
  { input: 42, min: 0, max: 100, shouldPass: true },
  { input: '-5', min: 0, max: 100, shouldPass: false }, // Below min
  { input: '150', min: 0, max: 100, shouldPass: false }, // Above max
  { input: '3.14', min: 0, max: 100, shouldPass: false }, // Not integer
  { input: 'abc', min: 0, max: 100, shouldPass: false },
]

for (const test of intTests) {
  try {
    const result = sanitizeInteger(test.input, test.min, test.max)
    if (test.shouldPass) {
      console.log(`  ✅ "${test.input}" → ${result}`)
    } else {
      console.log(`  ❌ Should have failed: "${test.input}"`)
    }
  } catch (error: any) {
    if (!test.shouldPass) {
      console.log(`  ✅ Correctly rejected: "${test.input}"`)
    } else {
      console.log(`  ❌ Unexpected error: ${error.message}`)
    }
  }
}
console.log('')

console.log('✅ All sanitizer tests completed!')
