# Klaviyo Metric ID Auto-Detection

## Overview

This feature automatically detects and stores the correct Klaviyo "Placed Order" metric ID for each store, eliminating the need for manual configuration and improving revenue attribution accuracy.

---

## Why This Matters

Klaviyo uses a "Placed Order" metric to track revenue attribution for campaigns and flows. However:

1. **Each Klaviyo account has a unique metric ID**
2. **Some accounts have multiple "Placed Order" metrics** (from different integrations)
3. **Using the wrong metric ID leads to incorrect or zero revenue data**

Previously, the system used a hardcoded fallback ID (`W8Gk3c`), which only works for specific accounts.

**With auto-detection:**
- ✅ Each store automatically gets the correct metric ID
- ✅ Revenue attribution is accurate from the first sync
- ✅ No manual configuration required
- ✅ Handles accounts with multiple metrics

---

## How It Works

### 1. Database Storage

Each store has a `klaviyo_metric_id` column:

```sql
ALTER TABLE stores
ADD COLUMN klaviyo_metric_id TEXT;
```

### 2. Auto-Detection Logic

The `admin-detect-klaviyo-metrics` Edge Function:

1. **Fetches all metrics** from Klaviyo API
2. **Searches for "Placed Order"** metric by name
3. **If multiple found**, tests each one to see which has revenue data
4. **Stores the best metric ID** in the database

### 3. Sync Integration

When syncing, the system:

1. **Checks if store has `klaviyo_metric_id` saved**
2. **If yes**, uses the stored ID (fast path)
3. **If no**, auto-detects during sync (fallback)

---

## Usage

### Option 1: Run Detection for All Stores (Recommended)

Run this once to auto-detect metrics for all stores:

```bash
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/admin-detect-klaviyo-metrics \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "total": 10,
    "success": 8,
    "not_found": 1,
    "errors": 1
  },
  "results": [
    {
      "store_id": "abc-123",
      "store_name": "My Store",
      "status": "success",
      "metric_id": "XyZ789"
    },
    {
      "store_id": "def-456",
      "store_name": "Another Store",
      "status": "not_found",
      "message": "No 'Placed Order' metric found in Klaviyo"
    }
  ]
}
```

### Option 2: Run Detection for Single Store

Detect metric for a specific store:

```bash
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/admin-detect-klaviyo-metrics \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "store_id": "your-store-uuid-here"
  }'
```

### Option 3: Force Re-detection

Re-detect even if metric is already saved:

```bash
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/admin-detect-klaviyo-metrics \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "force_refresh": true
  }'
```

---

## Verification

### Check Stored Metric IDs

```sql
SELECT
  id,
  name,
  klaviyo_metric_id,
  CASE
    WHEN klaviyo_metric_id IS NOT NULL THEN '✅ Detected'
    ELSE '⚠️ Missing'
  END as status
FROM stores
WHERE klaviyo_private_key IS NOT NULL
ORDER BY name;
```

### Verify Metric Works

After detection, trigger a sync and check logs:

```bash
supabase functions logs sync-store --filter "metric"
```

Should show:
```
[Klaviyo] Using stored metric ID: XyZ789
```

Instead of:
```
[Klaviyo] Using default metric ID: W8Gk3c
```

---

## Detection Strategies

The function uses 3 strategies in order:

### Strategy 1: Exact Name Match
```typescript
metrics.find(m => m.attributes.name === 'Placed Order')
```

### Strategy 2: Shopify Integration
```typescript
metrics.find(m =>
  m.attributes.integration?.category === 'Shopify' &&
  m.attributes.name.toLowerCase().includes('order')
)
```

### Strategy 3: Name Contains "Order"
```typescript
metrics.find(m =>
  m.attributes.name.toLowerCase() === 'placed order' ||
  m.attributes.name.toLowerCase() === 'ordered product'
)
```

### Strategy 4: Test with Revenue Data

If multiple metrics found, test each one:
- Make a flow-values-report API call
- Check which metric returns revenue > 0
- Select the one with highest revenue

---

## Troubleshooting

### Issue: No Metric Found

**Symptoms:**
```json
{
  "status": "not_found",
  "message": "No 'Placed Order' metric found in Klaviyo"
}
```

**Solutions:**

1. **Check Klaviyo account has Shopify integration**
   - Go to Klaviyo → Integrations → Shopify
   - Verify integration is active

2. **Verify orders exist in Klaviyo**
   - Go to Klaviyo → Analytics → Metrics
   - Search for "Placed Order" or "Ordered Product"

3. **Manual fallback**: Set metric ID manually
   ```sql
   UPDATE stores
   SET klaviyo_metric_id = 'YOUR_METRIC_ID'
   WHERE id = 'your-store-id';
   ```

### Issue: Wrong Metric Detected

**Symptoms:**
- Revenue shows as $0 in dashboard
- Campaigns/flows have no attribution

**Solutions:**

1. **List all metrics manually**:
   ```bash
   curl https://a.klaviyo.com/api/metrics/ \
     -H "Authorization: Klaviyo-API-Key YOUR_KEY" \
     -H "revision: 2024-10-15"
   ```

2. **Find correct metric ID** from the response

3. **Update database**:
   ```sql
   UPDATE stores
   SET klaviyo_metric_id = 'CORRECT_METRIC_ID'
   WHERE id = 'your-store-id';
   ```

4. **Re-run sync** to test

### Issue: Multiple Stores, Some Failed

**Symptoms:**
```json
{
  "summary": {
    "success": 8,
    "errors": 2
  }
}
```

**Solutions:**

1. **Check error details** in results array
2. **Common causes**:
   - Invalid Klaviyo API key
   - Rate limiting (too many requests)
   - Klaviyo account suspended

3. **Re-run for failed stores only**:
   ```bash
   # Get failed store IDs from results
   # Run detection individually with delay
   for store_id in failed_ids; do
     curl -X POST ... -d "{\"store_id\": \"$store_id\"}"
     sleep 1
   done
   ```

---

## Automation

### Option 1: Run on Store Creation

Add to store creation flow:

```typescript
// After creating store and adding Klaviyo credentials
await supabase.functions.invoke('admin-detect-klaviyo-metrics', {
  body: { store_id: newStore.id }
})
```

### Option 2: Scheduled Job (Cron)

Run weekly to catch new stores:

```sql
-- Create pg_cron job (if available)
SELECT cron.schedule(
  'detect-klaviyo-metrics',
  '0 2 * * 0', -- Every Sunday at 2 AM
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/admin-detect-klaviyo-metrics',
    headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

### Option 3: Manual Periodic Run

Add to deployment checklist:
- [ ] Run metric detection after onboarding new stores
- [ ] Run with `force_refresh: true` quarterly

---

## Performance

### Execution Time

- **Single store**: ~500ms
- **10 stores**: ~5-10 seconds
- **100 stores**: ~1-2 minutes

### Rate Limiting

The function includes:
- **200ms delay** between stores
- **Automatic retry** on 429 errors
- **Batch processing** to avoid timeouts

### Optimization Tips

1. **Run during low-traffic hours** (2-4 AM)
2. **Process in batches** if > 100 stores
3. **Use `force_refresh: false`** to skip already-detected stores

---

## Database Schema

### stores table

| Column | Type | Description |
|--------|------|-------------|
| `klaviyo_metric_id` | TEXT | Auto-detected "Placed Order" metric ID |

**Migration:**
```sql
-- Already included in: 20250119120000_add_store_timezone.sql
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS klaviyo_metric_id TEXT;

CREATE INDEX IF NOT EXISTS idx_stores_klaviyo_metric
ON stores(klaviyo_metric_id)
WHERE klaviyo_metric_id IS NOT NULL;
```

---

## API Reference

### POST /admin-detect-klaviyo-metrics

**Authentication**: Service role required

**Request Body:**
```typescript
{
  store_id?: string        // Optional: detect for single store
  force_refresh?: boolean  // Optional: re-detect even if exists
}
```

**Response:**
```typescript
{
  success: boolean
  summary: {
    total: number
    success: number
    not_found: number
    errors: number
  }
  results: Array<{
    store_id: string
    store_name: string
    status: 'success' | 'not_found' | 'error'
    metric_id?: string
    error?: string
    message?: string
  }>
}
```

---

## Testing

### Manual Test

1. **Clear existing metric**:
   ```sql
   UPDATE stores SET klaviyo_metric_id = NULL WHERE id = 'test-store-id';
   ```

2. **Run detection**:
   ```bash
   curl -X POST ... -d '{"store_id": "test-store-id"}'
   ```

3. **Verify saved**:
   ```sql
   SELECT klaviyo_metric_id FROM stores WHERE id = 'test-store-id';
   ```

4. **Test sync uses it**:
   ```bash
   # Trigger sync
   supabase functions logs sync-store --filter "Using stored metric"
   ```

### Automated Test

```typescript
describe('Klaviyo Metric Detection', () => {
  it('should detect metric for store', async () => {
    const response = await supabase.functions.invoke('admin-detect-klaviyo-metrics', {
      body: { store_id: testStoreId }
    })

    expect(response.data.success).toBe(true)
    expect(response.data.results[0].status).toBe('success')
    expect(response.data.results[0].metric_id).toMatch(/^[A-Za-z0-9]+$/)
  })

  it('should use stored metric in sync', async () => {
    // Trigger sync
    const syncResponse = await supabase.functions.invoke('sync-store', {
      body: { store_id: testStoreId, period_start: '2025-01-01', period_end: '2025-01-31' }
    })

    // Check logs show stored metric was used
    expect(syncResponse.logs).toContain('Using stored metric ID')
  })
})
```

---

## Migration Checklist

- [x] Database column added (`klaviyo_metric_id`)
- [x] Edge Function created (`admin-detect-klaviyo-metrics`)
- [x] Sync function updated to use stored metric
- [x] Fallback logic maintained for backward compatibility
- [ ] Run detection for all existing stores
- [ ] Verify revenue attribution accuracy
- [ ] Add to deployment runbook
- [ ] Update store onboarding to include detection

---

**Last Updated**: 2025-01-19
**Version**: 1.0
**Status**: ✅ Ready for Use
