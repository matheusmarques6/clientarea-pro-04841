# Edge Functions Deployment Guide

## ✅ Implementation Status

### Files Created
- ✅ `supabase/functions/_shared/klaviyo.ts` (359 lines)
- ✅ `supabase/functions/_shared/shopify.ts` (585 lines)
- ✅ `supabase/functions/sync-store/index.ts` (464 lines)
- ✅ `supabase/functions/get-sync-status/index.ts` (134 lines)
- ✅ `EDGE_FUNCTIONS_SYNC.md` (documentation)
- ✅ `API_STRUCTURE_ANALYSIS.md` (API documentation)

### Frontend Integration
- ✅ `src/hooks/useDashboardData.ts` updated to use `sync-store` Edge Function
- ✅ Synchronous pattern implemented (no polling needed)
- ✅ Toast notifications with real-time metrics

### Code Quality
- ✅ Build successful (no TypeScript errors)
- ✅ Committed to Git (commit: 038f344)
- ✅ Pushed to GitHub

---

## 🚀 Deployment Steps

### Option 1: Deploy via Supabase CLI (Recommended)

If you don't have the Supabase CLI installed, install it first:

```bash
# macOS/Linux
brew install supabase/tap/supabase

# Or via npm
npm install -g supabase

# Windows (via scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

Then deploy the Edge Functions:

```bash
cd /home/convertfy/projetos/clientarea-pro-04841

# Deploy both functions
supabase functions deploy sync-store
supabase functions deploy get-sync-status

# Or deploy all functions at once
supabase functions deploy
```

### Option 2: Deploy via Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/bsotblbtrshqfiqyzisy
2. Navigate to **Edge Functions** in the left sidebar
3. Click **Deploy new function**
4. For each function:
   - Name: `sync-store` or `get-sync-status`
   - Upload the respective `index.ts` file
   - Upload the `_shared` folder as well

### Option 3: Deploy via GitHub Actions (Automated)

Create `.github/workflows/deploy-functions.yml`:

```yaml
name: Deploy Edge Functions

on:
  push:
    branches:
      - main
    paths:
      - 'supabase/functions/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Deploy Edge Functions
        run: |
          supabase functions deploy sync-store --project-ref bsotblbtrshqfiqyzisy
          supabase functions deploy get-sync-status --project-ref bsotblbtrshqfiqyzisy
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

---

## 🔐 Environment Variables

The Edge Functions use credentials stored in the `stores` table in Supabase. No additional environment variables needed.

**Required fields in `stores` table:**
- `klaviyo_private_key` - Klaviyo API Key
- `shopify_domain` - Store domain (e.g., `mystore.myshopify.com`)
- `shopify_access_token` - Shopify Admin API token
- `timezone_offset` - Store timezone (e.g., `-03:00`)

---

## 🧪 Testing After Deployment

### Test sync-store function

```bash
curl -X POST \
  'https://bsotblbtrshqfiqyzisy.supabase.co/functions/v1/sync-store' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "store_id": "YOUR_STORE_ID",
    "period_start": "2025-10-01",
    "period_end": "2025-10-21"
  }'
```

Expected response (after ~20-60s):
```json
{
  "success": true,
  "job_id": "uuid-here",
  "request_id": "req_1729485600_abc123",
  "status": "SUCCESS",
  "processing_time_ms": 45230,
  "summary": {
    "klaviyo": {
      "total_revenue": 15234.50,
      "campaigns_revenue": 8120.00,
      "flows_revenue": 7114.50,
      "total_orders": 127,
      "campaigns_count": 18,
      "flows_count": 9
    },
    "shopify": {
      "total_orders": 450,
      "total_sales": 67890.25
    }
  }
}
```

### Test get-sync-status function

```bash
curl -X GET \
  'https://bsotblbtrshqfiqyzisy.supabase.co/functions/v1/get-sync-status?job_id=YOUR_JOB_ID' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'
```

---

## 📊 Expected Performance

| Store Size | Orders/Month | Expected Sync Time |
|-----------|-------------|-------------------|
| Small     | < 500       | 10-20 seconds     |
| Medium    | 500-2000    | 20-40 seconds     |
| Large     | 2000-5000   | 40-70 seconds     |
| Very Large| > 5000      | 70-120 seconds    |

**Maximum timeout:** 150 seconds (Supabase Edge Function limit)

---

## 🔍 Monitoring and Logs

After deployment, monitor function execution:

```bash
# View logs for sync-store
supabase functions logs sync-store --project-ref bsotblbtrshqfiqyzisy

# Or via Dashboard
# https://supabase.com/dashboard/project/bsotblbtrshqfiqyzisy/logs/edge-functions
```

---

## 🐛 Troubleshooting

### Function timeout (> 150s)

**Cause:** Store has too many orders/campaigns
**Solution:** Reduce date range or implement background worker (see Phase 2 in EDGE_FUNCTIONS_SYNC.md)

### Klaviyo API rate limit

**Symptom:** `429 Too Many Requests`
**Auto-handled:** Automatic retry with exponential backoff (up to 5 attempts)

### Shopify API rate limit

**Symptom:** `429 Too Many Requests`
**Auto-handled:** Monitors `x-shopify-shop-api-call-limit` header, pauses when < 5 requests remaining

### Invalid credentials

**Error:** `Failed to fetch store credentials`
**Fix:** Verify `stores` table has correct API keys for the store

---

## ✨ What's New vs. Old Implementation

| Feature | Old (start_klaviyo_job) | New (sync-store) |
|---------|------------------------|------------------|
| **Dependency** | Requires N8N | Self-contained |
| **Execution** | Async + polling | Synchronous |
| **Response time** | Unknown (webhook-based) | Immediate (20-60s) |
| **Shopify data** | Limited | Full recurrence analysis |
| **Customer classification** | Basic | Advanced (canonical keys + hash) |
| **Error handling** | Limited | Comprehensive retry logic |
| **Code location** | External workflow | Version-controlled code |
| **Documentation** | N8N workflow JSON | Detailed markdown docs |

---

## 🎯 Next Steps

1. **Deploy the functions** (choose Option 1, 2, or 3 above)
2. **Test with a real store** to verify sync works end-to-end
3. **Monitor performance** via Supabase dashboard logs
4. **Verify data** in `klaviyo_summaries` and `channel_revenue` tables
5. **Optional:** Set up automated daily sync via cron (see `auto_sync_all_stores` function)

---

## 📞 Support

If you encounter issues:

1. Check Edge Function logs in Supabase Dashboard
2. Verify API credentials in `stores` table
3. Review `n8n_jobs` table for error details
4. Check `API_STRUCTURE_ANALYSIS.md` for API-specific issues

---

**Project ID:** `bsotblbtrshqfiqyzisy`
**Region:** Check Supabase dashboard
**Deployment Date:** Ready to deploy
**Version:** 1.0.0
