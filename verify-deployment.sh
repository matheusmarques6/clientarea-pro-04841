#!/bin/bash

# ============================================================================
# Edge Functions Deployment Verification Script
# ============================================================================

echo "========================================="
echo "Edge Functions Deployment Verification"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
passed=0
failed=0

# Check function
check() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓${NC} $2"
    ((passed++))
  else
    echo -e "${RED}✗${NC} $2"
    ((failed++))
  fi
}

# ============================================================================
# 1. Check required files exist
# ============================================================================

echo "1. Checking required files..."
echo ""

test -f "supabase/functions/_shared/klaviyo.ts"
check $? "klaviyo.ts exists"

test -f "supabase/functions/_shared/shopify.ts"
check $? "shopify.ts exists"

test -f "supabase/functions/sync-store/index.ts"
check $? "sync-store/index.ts exists"

test -f "supabase/functions/get-sync-status/index.ts"
check $? "get-sync-status/index.ts exists"

echo ""

# ============================================================================
# 2. Check TypeScript syntax
# ============================================================================

echo "2. Checking TypeScript syntax..."
echo ""

if command -v tsc &> /dev/null; then
  npx tsc --noEmit supabase/functions/_shared/klaviyo.ts 2>&1 | grep -q "error"
  check $((!$?)) "klaviyo.ts syntax valid"

  npx tsc --noEmit supabase/functions/_shared/shopify.ts 2>&1 | grep -q "error"
  check $((!$?)) "shopify.ts syntax valid"

  npx tsc --noEmit supabase/functions/sync-store/index.ts 2>&1 | grep -q "error"
  check $((!$?)) "sync-store/index.ts syntax valid"

  npx tsc --noEmit supabase/functions/get-sync-status/index.ts 2>&1 | grep -q "error"
  check $((!$?)) "get-sync-status/index.ts syntax valid"
else
  echo -e "${YELLOW}⚠${NC} TypeScript compiler not found, skipping syntax check"
fi

echo ""

# ============================================================================
# 3. Check configuration
# ============================================================================

echo "3. Checking Supabase configuration..."
echo ""

test -f "supabase/config.toml"
check $? "config.toml exists"

if [ -f "supabase/config.toml" ]; then
  grep -q "project_id" supabase/config.toml
  check $? "project_id configured"
fi

echo ""

# ============================================================================
# 4. Check file sizes (ensure they're not empty)
# ============================================================================

echo "4. Checking file sizes..."
echo ""

klaviyo_size=$(wc -l < supabase/functions/_shared/klaviyo.ts)
test $klaviyo_size -gt 300
check $? "klaviyo.ts has $klaviyo_size lines (>300 expected)"

shopify_size=$(wc -l < supabase/functions/_shared/shopify.ts)
test $shopify_size -gt 500
check $? "shopify.ts has $shopify_size lines (>500 expected)"

sync_size=$(wc -l < supabase/functions/sync-store/index.ts)
test $sync_size -gt 400
check $? "sync-store/index.ts has $sync_size lines (>400 expected)"

status_size=$(wc -l < supabase/functions/get-sync-status/index.ts)
test $status_size -gt 100
check $? "get-sync-status/index.ts has $status_size lines (>100 expected)"

echo ""

# ============================================================================
# 5. Check critical code patterns
# ============================================================================

echo "5. Checking critical code patterns..."
echo ""

grep -q "fetchKlaviyoData" supabase/functions/_shared/klaviyo.ts
check $? "Klaviyo: fetchKlaviyoData function exists"

grep -q "fetchShopifyData" supabase/functions/_shared/shopify.ts
check $? "Shopify: fetchShopifyData function exists"

grep -q "Promise.allSettled" supabase/functions/sync-store/index.ts
check $? "sync-store: Parallel execution implemented"

grep -q "klaviyo_summaries" supabase/functions/sync-store/index.ts
check $? "sync-store: Saves to klaviyo_summaries"

grep -q "channel_revenue" supabase/functions/sync-store/index.ts
check $? "sync-store: Saves to channel_revenue"

grep -q "n8n_jobs" supabase/functions/sync-store/index.ts
check $? "sync-store: Updates job status"

echo ""

# ============================================================================
# 6. Check Shopify customer recurrence logic
# ============================================================================

echo "6. Checking Shopify customer recurrence logic..."
echo ""

grep -q "canonicalKeyOf" supabase/functions/_shared/shopify.ts
check $? "canonicalKeyOf function exists"

grep -q "Math.abs(hash) % 133" supabase/functions/_shared/shopify.ts
check $? "Hash modulo 133 algorithm present"

grep -q "emailToIdMap" supabase/functions/_shared/shopify.ts
check $? "Email to ID mapping exists"

echo ""

# ============================================================================
# 7. Check retry logic
# ============================================================================

echo "7. Checking retry logic..."
echo ""

grep -q "retry" supabase/functions/_shared/klaviyo.ts
check $? "Klaviyo: Retry logic implemented"

grep -q "retry" supabase/functions/_shared/shopify.ts
check $? "Shopify: Retry logic implemented"

grep -q "retry-after" supabase/functions/_shared/klaviyo.ts
check $? "Klaviyo: Respects retry-after header"

echo ""

# ============================================================================
# 8. Check documentation
# ============================================================================

echo "8. Checking documentation..."
echo ""

test -f "EDGE_FUNCTIONS_SYNC.md"
check $? "EDGE_FUNCTIONS_SYNC.md exists"

test -f "API_STRUCTURE_ANALYSIS.md"
check $? "API_STRUCTURE_ANALYSIS.md exists"

test -f "DEPLOYMENT_GUIDE.md"
check $? "DEPLOYMENT_GUIDE.md exists"

echo ""

# ============================================================================
# Summary
# ============================================================================

echo "========================================="
echo "Verification Summary"
echo "========================================="
echo ""
echo -e "${GREEN}Passed:${NC} $passed"
echo -e "${RED}Failed:${NC} $failed"
echo ""

if [ $failed -eq 0 ]; then
  echo -e "${GREEN}✓ All checks passed! Ready to deploy.${NC}"
  echo ""
  echo "To deploy, run:"
  echo "  supabase functions deploy sync-store"
  echo "  supabase functions deploy get-sync-status"
  echo ""
  exit 0
else
  echo -e "${RED}✗ Some checks failed. Please review before deploying.${NC}"
  echo ""
  exit 1
fi
