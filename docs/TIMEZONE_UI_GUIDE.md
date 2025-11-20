# Timezone Configuration UI - Implementation Guide

## Overview

This guide explains how to add timezone selection functionality to the store settings page, allowing each store to configure its own timezone for accurate date-based queries.

---

## Backend Changes (✅ Already Implemented)

The following backend changes have been completed:

1. **Database Migration**: Added `timezone_offset` and `timezone_name` columns to `stores` table
2. **Helper Functions**: Created timezone conversion utilities in `supabase/functions/_shared/timezone.ts`
3. **Sync Integration**: Updated `sync-store` Edge Function to use store's timezone
4. **Dashboard Views**: Updated to include timezone information

---

## Frontend Implementation Required

### 1. Store Settings Page

Add a timezone selector to the store settings/configuration page.

#### Component: `TimezoneSelector.tsx`

```typescript
import { useState, useEffect } from 'react'
import { useSupabase } from '@/hooks/useSupabase'

interface Timezone {
  id: number
  name: string
  offset_hours: number
  display_name: string
  country_code: string
}

interface Props {
  storeId: string
  currentTimezone?: string
  currentOffset?: number
  onUpdate?: () => void
}

export function TimezoneSelector({ storeId, currentTimezone, currentOffset, onUpdate }: Props) {
  const supabase = useSupabase()
  const [timezones, setTimezones] = useState<Timezone[]>([])
  const [selectedTimezone, setSelectedTimezone] = useState(currentTimezone || 'UTC')
  const [loading, setLoading] = useState(false)

  // Load available timezones
  useEffect(() => {
    async function loadTimezones() {
      const { data } = await supabase
        .from('timezones')
        .select('*')
        .order('offset_hours', { ascending: true })

      if (data) {
        setTimezones(data)
      }
    }
    loadTimezones()
  }, [])

  // Save timezone selection
  async function handleSave() {
    setLoading(true)

    const selectedTz = timezones.find(tz => tz.name === selectedTimezone)
    if (!selectedTz) return

    const { error } = await supabase
      .from('stores')
      .update({
        timezone_name: selectedTz.name,
        timezone_offset: selectedTz.offset_hours
      })
      .eq('id', storeId)

    setLoading(false)

    if (!error) {
      onUpdate?.()
      // Show success notification
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Timezone da Loja
        </label>
        <select
          value={selectedTimezone}
          onChange={(e) => setSelectedTimezone(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
        >
          {timezones.map((tz) => (
            <option key={tz.id} value={tz.name}>
              {tz.display_name}
            </option>
          ))}
        </select>
        <p className="text-sm text-gray-500 mt-1">
          Defina o fuso horário correto para cálculos precisos de datas e períodos
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Salvando...' : 'Salvar Timezone'}
      </button>
    </div>
  )
}
```

### 2. Add to Store Settings Page

Update your store settings page to include the timezone selector:

```typescript
// In StoreSettings.tsx or similar

import { TimezoneSelector } from '@/components/TimezoneSelector'

export function StoreSettings({ storeId }: { storeId: string }) {
  const [store, setStore] = useState<any>(null)

  // ... existing code to load store

  return (
    <div className="space-y-6">
      {/* ... other settings sections ... */}

      <section>
        <h3 className="text-lg font-semibold mb-4">Configurações de Data e Hora</h3>
        <TimezoneSelector
          storeId={storeId}
          currentTimezone={store?.timezone_name}
          currentOffset={store?.timezone_offset}
          onUpdate={() => {
            // Reload store data
          }}
        />
      </section>

      {/* ... other settings sections ... */}
    </div>
  )
}
```

### 3. Display Timezone Info in Dashboard

Show the current timezone in the dashboard header or store info section:

```typescript
// In Dashboard.tsx or StoreHeader.tsx

function StoreTimezoneDisplay({ timezone }: { timezone: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <ClockIcon className="w-4 h-4" />
      <span>{timezone}</span>
    </div>
  )
}
```

### 4. Update Store Query to Include Timezone

Ensure your store queries fetch the timezone fields:

```typescript
// In useStore.ts or similar

const { data: store } = await supabase
  .from('stores')
  .select(`
    *,
    timezone_name,
    timezone_offset
  `)
  .eq('id', storeId)
  .single()
```

---

## Usage Examples

### Example 1: Store with BRT Timezone

```typescript
{
  id: 'store-123',
  name: 'My Brazilian Store',
  timezone_name: 'America/Sao_Paulo',
  timezone_offset: -3
}
```

When this store syncs data, all date calculations will use BRT (UTC-3).

### Example 2: Store with PST Timezone

```typescript
{
  id: 'store-456',
  name: 'My US Store',
  timezone_name: 'America/Los_Angeles',
  timezone_offset: -8
}
```

When this store syncs data, all date calculations will use PST (UTC-8).

---

## Testing

### Manual Testing Steps

1. **Set Timezone**
   - Go to store settings
   - Select a timezone (e.g., "America/Sao_Paulo")
   - Save changes
   - Verify database update:
     ```sql
     SELECT id, name, timezone_name, timezone_offset
     FROM stores
     WHERE id = 'your-store-id';
     ```

2. **Verify Sync Uses Correct Timezone**
   - Trigger a sync for the store
   - Check Edge Function logs:
     ```bash
     supabase functions logs sync-store
     ```
   - Should show: `[Shopify] Period: 2025-01-19T00:00:00-03:00 to 2025-01-19T23:59:59-03:00`

3. **Check Dashboard Data**
   - View dashboard for the store
   - Verify data is accurate for the selected timezone
   - Compare with Shopify/Klaviyo admin panel

### Automated Tests

```typescript
// In StoreSettings.test.tsx

describe('TimezoneSelector', () => {
  it('should load available timezones', async () => {
    render(<TimezoneSelector storeId="test-id" />)
    await waitFor(() => {
      expect(screen.getByText(/America\/Sao_Paulo/)).toBeInTheDocument()
    })
  })

  it('should save timezone selection', async () => {
    const onUpdate = jest.fn()
    render(<TimezoneSelector storeId="test-id" onUpdate={onUpdate} />)

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'America/Sao_Paulo' } })

    const saveButton = screen.getByText('Salvar Timezone')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalled()
    })
  })
})
```

---

## Backend Functions Available

The following functions are available in `supabase/functions/_shared/timezone.ts`:

### `offsetToISO(offsetHours: number): string`

Convert timezone offset in hours to ISO 8601 format.

```typescript
import { offsetToISO } from '@/shared/timezone'

offsetToISO(-3)   // "-03:00"
offsetToISO(5.5)  // "+05:30"
```

### `isoToOffset(isoTimezone: string): number`

Convert ISO 8601 timezone string to offset in hours.

```typescript
import { isoToOffset } from '@/shared/timezone'

isoToOffset("-03:00")  // -3
isoToOffset("+05:30")  // 5.5
```

### `getDateRangeInTimezone(days: number, offsetHours: number)`

Get date range for last N days in store's timezone.

```typescript
import { getDateRangeInTimezone } from '@/shared/timezone'

getDateRangeInTimezone(30, -3)
// { start_date: "2025-01-20", end_date: "2025-02-19" }
```

---

## Database Schema

### `stores` table

| Column | Type | Description |
|--------|------|-------------|
| `timezone_offset` | INTEGER | Timezone offset in hours (e.g., -3, 0, +5) |
| `timezone_name` | TEXT | Human-readable timezone name (e.g., "America/Sao_Paulo") |

### `timezones` table (reference)

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `name` | TEXT | IANA timezone name |
| `offset_hours` | INTEGER | Offset in hours from UTC |
| `display_name` | TEXT | Human-readable display name |
| `country_code` | TEXT | ISO country code (e.g., "BR", "US") |

---

## Common Timezones

| Name | Offset | Display Name |
|------|--------|--------------|
| UTC | 0 | UTC (Coordinated Universal Time) |
| America/Sao_Paulo | -3 | BRT (Brasília Time) UTC-3 |
| America/New_York | -5 | EST (Eastern Time) UTC-5 |
| America/Los_Angeles | -8 | PST (Pacific Time) UTC-8 |
| Europe/London | 0 | GMT (Greenwich Mean Time) UTC+0 |
| Asia/Tokyo | 9 | JST (Japan Standard Time) UTC+9 |
| Australia/Sydney | 10 | AEST (Australian Eastern Time) UTC+10 |

---

## Troubleshooting

### Issue: Timezone not updating

**Solution**: Check RLS policies allow updates to `timezone_offset` and `timezone_name` columns.

```sql
-- Verify RLS policy
SELECT * FROM pg_policies WHERE tablename = 'stores';
```

### Issue: Incorrect date ranges

**Solution**: Verify the store's `timezone_offset` is set correctly:

```sql
SELECT id, name, timezone_offset, timezone_name
FROM stores
WHERE id = 'your-store-id';
```

### Issue: Sync using wrong timezone

**Solution**: Check Edge Function logs to see what timezone is being used:

```bash
supabase functions logs sync-store --filter "Period:"
```

---

## Migration Checklist

- [ ] Backend migration applied (`20250119120000_add_store_timezone.sql`)
- [ ] Timezone utilities tested (`scripts/test-timezone.ts`)
- [ ] TimezoneSelector component created
- [ ] Component added to store settings page
- [ ] Store queries updated to fetch timezone fields
- [ ] Timezone display added to dashboard
- [ ] Manual testing completed
- [ ] Documentation reviewed

---

**Last Updated**: 2025-01-19
**Version**: 1.0
**Status**: ✅ Backend Ready, Frontend Pending
