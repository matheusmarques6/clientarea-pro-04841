#!/usr/bin/env -S deno run

// ============================================================================
// TIMEZONE UTILITIES TESTS
// Manual tests for timezone conversion functions
// ============================================================================

import {
  offsetToISO,
  isoToOffset,
  getNowInTimezone,
  formatDateForAPI,
  getDateRangeInTimezone,
  getOffsetByName,
  isValidTimezoneOffset,
  COMMON_TIMEZONES
} from '../supabase/functions/_shared/timezone.ts'

console.log('🧪 Testing Timezone Utilities...\n')

// Test 1: offsetToISO - Convert hours to ISO format
console.log('Test 1: offsetToISO (hours → ISO format)')
const offsetTests = [
  { input: -3, expected: '-03:00', name: 'BRT (Brazil)' },
  { input: 0, expected: '+00:00', name: 'UTC' },
  { input: 5.5, expected: '+05:30', name: 'IST (India)' },
  { input: -8, expected: '-08:00', name: 'PST (US West Coast)' },
  { input: 10, expected: '+10:00', name: 'AEST (Australia)' },
  { input: -12, expected: '-12:00', name: 'Minimum offset' },
  { input: 14, expected: '+14:00', name: 'Maximum offset' },
]

for (const test of offsetTests) {
  try {
    const result = offsetToISO(test.input)
    if (result === test.expected) {
      console.log(`  ✅ ${test.input} → "${result}" (${test.name})`)
    } else {
      console.log(`  ❌ Expected "${test.expected}", got "${result}"`)
    }
  } catch (error: any) {
    console.log(`  ❌ Error: ${error.message}`)
  }
}
console.log('')

// Test 2: isoToOffset - Convert ISO format to hours
console.log('Test 2: isoToOffset (ISO format → hours)')
const isoTests = [
  { input: '-03:00', expected: -3, name: 'BRT' },
  { input: '+00:00', expected: 0, name: 'UTC' },
  { input: '+05:30', expected: 5.5, name: 'IST' },
  { input: '-08:00', expected: -8, name: 'PST' },
]

for (const test of isoTests) {
  try {
    const result = isoToOffset(test.input)
    if (result === test.expected) {
      console.log(`  ✅ "${test.input}" → ${result} (${test.name})`)
    } else {
      console.log(`  ❌ Expected ${test.expected}, got ${result}`)
    }
  } catch (error: any) {
    console.log(`  ❌ Error: ${error.message}`)
  }
}
console.log('')

// Test 3: Round-trip conversion
console.log('Test 3: Round-trip conversion (offset → ISO → offset)')
const roundTripTests = [-3, 0, 5.5, -8, 10]

for (const offset of roundTripTests) {
  try {
    const iso = offsetToISO(offset)
    const backToOffset = isoToOffset(iso)

    if (backToOffset === offset) {
      console.log(`  ✅ ${offset} → "${iso}" → ${backToOffset}`)
    } else {
      console.log(`  ❌ Round-trip failed: ${offset} → "${iso}" → ${backToOffset}`)
    }
  } catch (error: any) {
    console.log(`  ❌ Error: ${error.message}`)
  }
}
console.log('')

// Test 4: Invalid inputs
console.log('Test 4: Invalid inputs (should throw errors)')
const invalidTests = [
  { fn: () => offsetToISO(15), desc: 'Offset too high (15)' },
  { fn: () => offsetToISO(-13), desc: 'Offset too low (-13)' },
  { fn: () => offsetToISO(NaN), desc: 'NaN offset' },
  { fn: () => isoToOffset('invalid'), desc: 'Invalid ISO format' },
  { fn: () => isoToOffset('+15:00'), desc: 'ISO offset out of range' },
]

for (const test of invalidTests) {
  try {
    test.fn()
    console.log(`  ❌ Should have thrown error: ${test.desc}`)
  } catch (error: any) {
    console.log(`  ✅ Correctly rejected: ${test.desc}`)
  }
}
console.log('')

// Test 5: getNowInTimezone
console.log('Test 5: getNowInTimezone')
try {
  const utcNow = new Date()
  const brtNow = getNowInTimezone(-3)
  const istNow = getNowInTimezone(5.5)

  console.log(`  UTC now: ${utcNow.toISOString()}`)
  console.log(`  BRT now: ${brtNow.toISOString()}`)
  console.log(`  IST now: ${istNow.toISOString()}`)
  console.log('  ✅ Timezone conversion working')
} catch (error: any) {
  console.log(`  ❌ Error: ${error.message}`)
}
console.log('')

// Test 6: formatDateForAPI
console.log('Test 6: formatDateForAPI')
try {
  const testDate = new Date('2025-01-19T15:30:00Z')
  const formatted = formatDateForAPI(testDate)
  console.log(`  Input: ${testDate.toISOString()}`)
  console.log(`  Formatted: ${formatted}`)

  if (/^\d{4}-\d{2}-\d{2}$/.test(formatted)) {
    console.log('  ✅ Format correct (YYYY-MM-DD)')
  } else {
    console.log('  ❌ Format incorrect')
  }
} catch (error: any) {
  console.log(`  ❌ Error: ${error.message}`)
}
console.log('')

// Test 7: getDateRangeInTimezone
console.log('Test 7: getDateRangeInTimezone')
try {
  const range30Days = getDateRangeInTimezone(30, -3)
  const range7Days = getDateRangeInTimezone(7, 0)

  console.log(`  30 days (BRT): ${range30Days.start_date} to ${range30Days.end_date}`)
  console.log(`  7 days (UTC): ${range7Days.start_date} to ${range7Days.end_date}`)

  // Verify format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (dateRegex.test(range30Days.start_date) && dateRegex.test(range30Days.end_date)) {
    console.log('  ✅ Date range format correct')
  } else {
    console.log('  ❌ Date range format incorrect')
  }
} catch (error: any) {
  console.log(`  ❌ Error: ${error.message}`)
}
console.log('')

// Test 8: Common timezones
console.log('Test 8: Common timezones lookup')
const timezoneNames = [
  'America/Sao_Paulo',
  'America/New_York',
  'Europe/London',
  'Asia/Tokyo',
  'Invalid/Timezone'
]

for (const name of timezoneNames) {
  const offset = getOffsetByName(name)
  if (offset !== null) {
    const iso = offsetToISO(offset)
    console.log(`  ✅ ${name}: ${offset} hours (${iso})`)
  } else {
    console.log(`  ⚠️  ${name}: Not found (expected for invalid)`)
  }
}
console.log('')

// Test 9: isValidTimezoneOffset
console.log('Test 9: isValidTimezoneOffset')
const validationTests = [
  { offset: -3, expected: true },
  { offset: 0, expected: true },
  { offset: 14, expected: true },
  { offset: -12, expected: true },
  { offset: 15, expected: false },
  { offset: -13, expected: false },
  { offset: NaN, expected: false },
]

for (const test of validationTests) {
  const result = isValidTimezoneOffset(test.offset)
  if (result === test.expected) {
    console.log(`  ✅ ${test.offset}: ${result}`)
  } else {
    console.log(`  ❌ ${test.offset}: expected ${test.expected}, got ${result}`)
  }
}
console.log('')

// Test 10: Display all common timezones
console.log('Test 10: All common timezones')
console.log('  Name → Offset (ISO)')
console.log('  ' + '-'.repeat(50))
for (const [name, offset] of Object.entries(COMMON_TIMEZONES)) {
  const iso = offsetToISO(offset)
  console.log(`  ${name.padEnd(30)} → ${String(offset).padStart(4)} (${iso})`)
}

console.log('')
console.log('✅ All timezone tests completed!')
