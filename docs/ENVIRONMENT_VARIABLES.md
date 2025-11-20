# Environment Variables Documentation

Complete guide to all environment variables used in Convertfy Client Area.

## Table of Contents

- [Quick Start](#quick-start)
- [Frontend Variables](#frontend-variables)
- [Backend Variables](#backend-variables)
- [Security Best Practices](#security-best-practices)
- [Environment-Specific Configs](#environment-specific-configs)

---

## Quick Start

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in required variables (marked with ⚠️ below)

3. Generate secrets:
   ```bash
   # N8N Webhook Secret
   openssl rand -hex 32

   # Encryption Key (must be exactly 32 bytes)
   openssl rand -base64 32
   ```

4. Never commit `.env` to version control

---

## Frontend Variables

These variables are prefixed with `VITE_` and are bundled into the client-side code. **Do not put secrets here!**

### ⚠️ VITE_SUPABASE_URL

**Required:** Yes
**Type:** URL
**Example:** `https://bsotblbtrshqfiqyzisy.supabase.co`

Your Supabase project URL. Find it in:
- Supabase Dashboard → Settings → API → Project URL

---

### ⚠️ VITE_SUPABASE_PUBLISHABLE_KEY

**Required:** Yes
**Type:** JWT String
**Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

The public anon key for Supabase. This is **safe to expose** in frontend code as Row Level Security (RLS) policies protect your data.

Find it in:
- Supabase Dashboard → Settings → API → Project API keys → `anon` `public`

---

### VITE_SUPABASE_PROJECT_ID

**Required:** No
**Type:** String
**Example:** `bsotblbtrshqfiqyzisy`

Your Supabase project ID. Usually extracted from the URL automatically.

---

### VITE_APP_URL

**Required:** No
**Type:** URL
**Default:** `http://localhost:8080`

The base URL where your app is hosted.

**Examples:**
- Development: `http://localhost:8080`
- Staging: `https://staging.convertfy.com`
- Production: `https://app.convertfy.com`

---

## Backend Variables

These variables are **only available in Edge Functions** and should never be exposed to the frontend.

### ⚠️ SUPABASE_SERVICE_ROLE_KEY

**Required:** Yes (for Edge Functions)
**Type:** JWT String
**Security:** 🔴 **CRITICAL - NEVER EXPOSE**

The service role key bypasses all RLS policies. Only use in trusted Edge Functions.

Find it in:
- Supabase Dashboard → Settings → API → Project API keys → `service_role` `secret`

**⚠️ Warning:** This key has unrestricted database access. Never commit or expose it.

---

### ⚠️ N8N_WEBHOOK_SECRET

**Required:** Yes (if using N8N webhooks)
**Type:** String (64 characters hex)
**Security:** 🔴 **SECRET**

Secret used to validate webhook signatures from N8N.

**Generate:**
```bash
openssl rand -hex 32
```

**Where to set:**
1. Add to Supabase Edge Functions secrets
2. Configure in N8N workflow to send as `X-N8N-Signature` header

---

### ⚠️ ENCRYPTION_KEY

**Required:** Yes (for API key encryption)
**Type:** Base64 String (32 bytes)
**Security:** 🔴 **CRITICAL SECRET**

Used to encrypt Shopify and Klaviyo API keys in the database.

**Generate:**
```bash
openssl rand -base64 32
```

**⚠️ Warning:** If you lose this key, all encrypted API credentials become unrecoverable!

---

### ENVIRONMENT

**Required:** No
**Type:** `development` | `staging` | `production`
**Default:** `development`

Determines CORS allowed origins and other environment-specific behaviors.

**Effects:**
- `development`: Allows localhost origins, debug logging
- `staging`: Allows staging domains, info logging
- `production`: Only production domains, error logging only

---

### LOG_LEVEL

**Required:** No
**Type:** `debug` | `info` | `warn` | `error`
**Default:** `info`

Controls logging verbosity.

**Recommendations:**
- Development: `debug` (see everything)
- Staging: `info` (normal operations)
- Production: `error` (only errors to reduce noise)

---

### ALLOWED_ORIGINS

**Required:** No
**Type:** Comma-separated URLs
**Default:** Based on `ENVIRONMENT`

Manually override CORS allowed origins.

**Example:**
```
ALLOWED_ORIGINS=https://app.convertfy.com,https://admin.convertfy.com
```

**Default values by environment:**
- `production`: `https://clientarea.convertfy.com,https://app.convertfy.com`
- `staging`: `https://staging.convertfy.com,http://localhost:8080`
- `development`: `http://localhost:8080,http://localhost:5173,http://localhost:3000`

---

### SHOPIFY_API_VERSION

**Required:** No
**Type:** String (YYYY-MM format)
**Default:** `2024-10`

Shopify Admin API version to use.

**See:** https://shopify.dev/docs/api/admin-rest#api_versioning

**Upgrade schedule:** Shopify releases quarterly. Update this when migrating to newer API version.

---

### KLAVIYO_API_VERSION

**Required:** No
**Type:** String (YYYY-MM-DD format)
**Default:** `2024-10-15`

Klaviyo API revision date.

**See:** https://developers.klaviyo.com/en/docs/api_versioning_and_deprecation_policy

---

### MAX_CONCURRENT_SYNCS

**Required:** No
**Type:** Integer
**Default:** `3`

Maximum number of sync jobs that can run simultaneously in the background worker.

**Tuning:**
- Too high: May overload Supabase Edge Function concurrency limits
- Too low: Slow sync queue processing
- Recommended: 3-5

---

### RATE_LIMIT_SHOPIFY

**Required:** No
**Type:** Integer (requests per second)
**Default:** `2`

Shopify rate limit to respect. Shopify uses a "bucket leaky" algorithm allowing bursts.

**Shopify limits:**
- Standard: 2 requests/second
- Shopify Plus: 4 requests/second

**⚠️ Warning:** Setting this too high will result in 429 (Too Many Requests) errors.

---

### RATE_LIMIT_KLAVIYO

**Required:** No
**Type:** Integer (requests per second)
**Default:** `3`

Klaviyo rate limit varies by plan tier.

**Klaviyo limits by plan:**
- Free: 3 req/s
- Email: 10 req/s
- Email & SMS: 10 req/s

Check your plan in Klaviyo dashboard.

---

### MAX_ORDERS_PER_SYNC

**Required:** No
**Type:** Integer
**Default:** `5000`

Maximum number of orders to fetch per sync to prevent memory overflow.

**Tuning:**
- Lower: Safer, prevents timeouts
- Higher: Faster for large stores, but risks memory issues
- Recommended: 5000 for Supabase Edge Functions (150s timeout)

---

### SYNC_TIMEOUT_SECONDS

**Required:** No
**Type:** Integer (seconds)
**Default:** `120`

Maximum time allowed for a sync operation.

**Limits:**
- Supabase Edge Functions: 150 seconds hard limit
- Recommended: 120 seconds (leaves buffer)

---

## Feature Flags

Feature flags control rollout of new features.

### FEATURE_STREAMING

**Type:** Boolean (`true` | `false`)
**Default:** `false`

Enable new streaming architecture for Shopify sync (prevents memory overflow).

**Status:** ⚠️ In testing - enable in staging first

---

### FEATURE_OPTIMIZED_QUERIES

**Type:** Boolean
**Default:** `false`

Enable optimized database queries (eliminates N+1 queries).

**Status:** ⚠️ In testing

---

### FEATURE_WEBHOOK_VALIDATION

**Type:** Boolean
**Default:** `false`

Require HMAC signature validation on N8N webhooks.

**Status:** 🔴 **Enable this in production** after configuring `N8N_WEBHOOK_SECRET`

---

## Security Best Practices

### ✅ DO:

1. **Use different values per environment**
   - Separate dev/staging/production secrets
   - Rotate secrets regularly

2. **Store secrets securely**
   - Use Supabase Edge Function secrets (encrypted at rest)
   - Use password manager for local `.env`

3. **Validate on startup**
   - Run `scripts/validate-env.ts` before deploying

4. **Audit access**
   - Limit who can view production secrets
   - Use audit logs for secret access

### ❌ DON'T:

1. **Never commit secrets**
   - Add `.env` to `.gitignore`
   - Use `.env.example` for templates

2. **Never expose service_role key**
   - Don't use in frontend code
   - Don't log or print it

3. **Never share keys via insecure channels**
   - Don't send via email/Slack
   - Use secret sharing tools (1Password, Vault)

---

## Environment-Specific Configs

### Development (`.env.development`)

```bash
ENVIRONMENT=development
LOG_LEVEL=debug
FEATURE_STREAMING=true
FEATURE_WEBHOOK_VALIDATION=false
```

**Purpose:** Testing new features locally

---

### Staging (`.env.staging`)

```bash
ENVIRONMENT=staging
LOG_LEVEL=info
FEATURE_STREAMING=true
FEATURE_WEBHOOK_VALIDATION=true
VITE_APP_URL=https://staging.convertfy.com
```

**Purpose:** Pre-production testing with real (test) data

---

### Production (`.env.production`)

```bash
ENVIRONMENT=production
LOG_LEVEL=error
FEATURE_STREAMING=false  # Only enable after staging validation
FEATURE_WEBHOOK_VALIDATION=true
VITE_APP_URL=https://app.convertfy.com
```

**Purpose:** Live customer environment

---

## Validation Script

Run before deploying:

```bash
deno run --allow-env scripts/validate-env.ts
```

Checks:
- ✅ All required variables present
- ✅ Secrets have sufficient entropy
- ✅ URLs are valid format
- ✅ Feature flags compatible with environment

---

## Troubleshooting

### "Missing SUPABASE_SERVICE_ROLE_KEY"

**Solution:** Add the service_role key from Supabase Dashboard → Settings → API

---

### "CORS error: origin not allowed"

**Solution:**
1. Check `ENVIRONMENT` matches your deployment
2. Manually set `ALLOWED_ORIGINS` if needed
3. Verify frontend origin exactly matches (including protocol)

---

### "Invalid ENCRYPTION_KEY"

**Solution:** Key must be exactly 32 bytes base64-encoded.

```bash
# Generate new key
openssl rand -base64 32
```

---

### "Webhook signature validation failed"

**Solution:**
1. Ensure `N8N_WEBHOOK_SECRET` matches N8N configuration
2. Check N8N sends `X-N8N-Signature` header
3. Verify HMAC algorithm matches (SHA-256)

---

## Support

For questions or issues:
1. Check `.env.example` for correct format
2. Review this documentation
3. Run validation script
4. Contact dev team with specific error message

---

**Last Updated:** January 19, 2025
**Version:** 2.0 (Optimized Plan)
