#!/usr/bin/env -S deno run --allow-env

// ============================================================================
// ENVIRONMENT VARIABLES VALIDATION SCRIPT
// Validates that all required environment variables are set and valid
// ============================================================================

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

interface EnvVar {
  name: string
  required: boolean
  type: 'string' | 'url' | 'jwt' | 'base64' | 'integer' | 'boolean' | 'enum'
  enumValues?: string[]
  minLength?: number
  pattern?: RegExp
  description?: string
}

const ENV_SCHEMA: EnvVar[] = [
  // Frontend variables
  {
    name: 'VITE_SUPABASE_URL',
    required: true,
    type: 'url',
    description: 'Supabase project URL'
  },
  {
    name: 'VITE_SUPABASE_PUBLISHABLE_KEY',
    required: true,
    type: 'jwt',
    description: 'Supabase anon/publishable key'
  },
  {
    name: 'VITE_SUPABASE_PROJECT_ID',
    required: false,
    type: 'string',
    minLength: 10,
    description: 'Supabase project ID'
  },

  // Backend secrets
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    type: 'jwt',
    description: 'Supabase service role key (CRITICAL SECRET)'
  },
  {
    name: 'N8N_WEBHOOK_SECRET',
    required: false,
    type: 'string',
    minLength: 32,
    description: 'N8N webhook HMAC secret'
  },
  {
    name: 'ENCRYPTION_KEY',
    required: false,
    type: 'base64',
    minLength: 32,
    description: 'Encryption key for API credentials (32 bytes)'
  },

  // Configuration
  {
    name: 'ENVIRONMENT',
    required: false,
    type: 'enum',
    enumValues: ['development', 'staging', 'production'],
    description: 'Current environment'
  },
  {
    name: 'LOG_LEVEL',
    required: false,
    type: 'enum',
    enumValues: ['debug', 'info', 'warn', 'error'],
    description: 'Logging verbosity'
  },

  // API versions
  {
    name: 'SHOPIFY_API_VERSION',
    required: false,
    type: 'string',
    pattern: /^\d{4}-\d{2}$/,
    description: 'Shopify API version (YYYY-MM)'
  },
  {
    name: 'KLAVIYO_API_VERSION',
    required: false,
    type: 'string',
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    description: 'Klaviyo API version (YYYY-MM-DD)'
  },

  // Performance
  {
    name: 'MAX_CONCURRENT_SYNCS',
    required: false,
    type: 'integer',
    description: 'Max concurrent sync jobs'
  },
  {
    name: 'RATE_LIMIT_SHOPIFY',
    required: false,
    type: 'integer',
    description: 'Shopify requests per second'
  },
  {
    name: 'RATE_LIMIT_KLAVIYO',
    required: false,
    type: 'integer',
    description: 'Klaviyo requests per second'
  },
  {
    name: 'MAX_ORDERS_PER_SYNC',
    required: false,
    type: 'integer',
    description: 'Max orders to process per sync'
  },
  {
    name: 'SYNC_TIMEOUT_SECONDS',
    required: false,
    type: 'integer',
    description: 'Sync timeout in seconds'
  }
]

function validateVariable(envVar: EnvVar): { valid: boolean; error?: string } {
  const value = Deno.env.get(envVar.name)

  // Check if required
  if (envVar.required && !value) {
    return {
      valid: false,
      error: `Missing required variable: ${envVar.name} (${envVar.description})`
    }
  }

  // If not set and not required, skip
  if (!value) {
    return { valid: true }
  }

  // Type-specific validation
  switch (envVar.type) {
    case 'url':
      try {
        new URL(value)
      } catch {
        return {
          valid: false,
          error: `${envVar.name} must be a valid URL, got: ${value}`
        }
      }
      break

    case 'jwt':
      if (!value.startsWith('eyJ')) {
        return {
          valid: false,
          error: `${envVar.name} must be a valid JWT (should start with 'eyJ')`
        }
      }
      if (value.length < 100) {
        return {
          valid: false,
          error: `${envVar.name} appears to be invalid (too short for a JWT)`
        }
      }
      break

    case 'base64':
      if (!/^[A-Za-z0-9+/=]+$/.test(value)) {
        return {
          valid: false,
          error: `${envVar.name} must be valid base64`
        }
      }
      if (envVar.minLength && value.length < envVar.minLength) {
        return {
          valid: false,
          error: `${envVar.name} must be at least ${envVar.minLength} characters`
        }
      }
      break

    case 'integer':
      const num = parseInt(value, 10)
      if (isNaN(num)) {
        return {
          valid: false,
          error: `${envVar.name} must be a valid integer, got: ${value}`
        }
      }
      break

    case 'boolean':
      if (!['true', 'false'].includes(value.toLowerCase())) {
        return {
          valid: false,
          error: `${envVar.name} must be 'true' or 'false', got: ${value}`
        }
      }
      break

    case 'enum':
      if (envVar.enumValues && !envVar.enumValues.includes(value)) {
        return {
          valid: false,
          error: `${envVar.name} must be one of: ${envVar.enumValues.join(', ')}, got: ${value}`
        }
      }
      break

    case 'string':
      if (envVar.minLength && value.length < envVar.minLength) {
        return {
          valid: false,
          error: `${envVar.name} must be at least ${envVar.minLength} characters`
        }
      }
      if (envVar.pattern && !envVar.pattern.test(value)) {
        return {
          valid: false,
          error: `${envVar.name} has invalid format`
        }
      }
      break
  }

  return { valid: true }
}

function checkSecurityWarnings(): string[] {
  const warnings: string[] = []
  const env = Deno.env.get('ENVIRONMENT') || 'development'

  // Check for wildcard CORS in production
  const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS')
  if (env === 'production' && allowedOrigins?.includes('*')) {
    warnings.push(
      '⚠️  WARNING: ALLOWED_ORIGINS contains wildcard (*) in production - this is a security risk!'
    )
  }

  // Check for debug logging in production
  const logLevel = Deno.env.get('LOG_LEVEL') || 'info'
  if (env === 'production' && logLevel === 'debug') {
    warnings.push(
      '⚠️  WARNING: LOG_LEVEL is "debug" in production - this may expose sensitive data'
    )
  }

  // Check for weak secrets
  const webhookSecret = Deno.env.get('N8N_WEBHOOK_SECRET')
  if (webhookSecret && webhookSecret.length < 32) {
    warnings.push(
      '⚠️  WARNING: N8N_WEBHOOK_SECRET is too short (should be at least 32 characters)'
    )
  }

  const encryptionKey = Deno.env.get('ENCRYPTION_KEY')
  if (encryptionKey && encryptionKey.length < 32) {
    warnings.push(
      '⚠️  WARNING: ENCRYPTION_KEY is too short (should be at least 32 characters)'
    )
  }

  // Check feature flags in production
  if (env === 'production') {
    if (Deno.env.get('FEATURE_STREAMING') === 'true') {
      warnings.push(
        '⚠️  INFO: FEATURE_STREAMING is enabled in production (ensure it was tested in staging)'
      )
    }
    if (Deno.env.get('FEATURE_WEBHOOK_VALIDATION') !== 'true') {
      warnings.push(
        '⚠️  WARNING: FEATURE_WEBHOOK_VALIDATION is disabled in production - webhooks are not secure!'
      )
    }
  }

  return warnings
}

function main(): number {
  console.log('🔍 Validating environment variables...\n')

  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  }

  // Validate each variable
  for (const envVar of ENV_SCHEMA) {
    const validation = validateVariable(envVar)
    if (!validation.valid && validation.error) {
      result.valid = false
      result.errors.push(validation.error)
    }
  }

  // Check security warnings
  result.warnings = checkSecurityWarnings()

  // Display results
  if (result.errors.length > 0) {
    console.error('❌ Validation FAILED:\n')
    for (const error of result.errors) {
      console.error(`  ${error}`)
    }
    console.error('')
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️  Warnings:\n')
    for (const warning of result.warnings) {
      console.warn(`  ${warning}`)
    }
    console.warn('')
  }

  if (result.valid && result.warnings.length === 0) {
    console.log('✅ All environment variables are valid!')
    console.log('')
    console.log('Environment:', Deno.env.get('ENVIRONMENT') || 'development')
    console.log('Log Level:', Deno.env.get('LOG_LEVEL') || 'info')
    console.log('')
    return 0
  } else if (result.valid) {
    console.log('✅ All required variables are set, but there are warnings.')
    console.log('')
    return 0
  } else {
    console.error('💡 Tip: Copy .env.example to .env and fill in the required values')
    console.error('')
    return 1
  }
}

// Run validation
Deno.exit(main())
