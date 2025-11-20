#!/bin/bash

# ============================================================================
# AUTOMATED MIGRATION SCRIPT
# Migrates Edge Functions to use shared logger and CORS handlers
# ============================================================================

set -e  # Exit on error

FUNCTIONS_DIR="supabase/functions"
BACKUP_DIR="supabase/functions/.backup_$(date +%Y%m%d_%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Edge Functions Migration Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Create backup
echo -e "${YELLOW}Creating backup...${NC}"
mkdir -p "$BACKUP_DIR"
cp -r "$FUNCTIONS_DIR"/* "$BACKUP_DIR/" 2>/dev/null || true
echo -e "${GREEN}✓ Backup created at: $BACKUP_DIR${NC}"
echo ""

# Count files to migrate
TOTAL_FILES=$(find "$FUNCTIONS_DIR" -name "index.ts" -type f | wc -l)
echo -e "${BLUE}Found $TOTAL_FILES Edge Functions to migrate${NC}"
echo ""

MIGRATED=0
SKIPPED=0
ERRORS=0

# Function to migrate a single file
migrate_file() {
  local file=$1
  local function_name=$(basename $(dirname "$file"))

  echo -e "${YELLOW}Migrating: $function_name${NC}"

  # Skip if already migrated
  if grep -q "import { getCorsHeaders }" "$file" 2>/dev/null; then
    echo -e "  ${BLUE}↪ Already migrated (skipped)${NC}"
    ((SKIPPED++))
    return 0
  fi

  # Skip _shared directory
  if [[ "$file" == *"/_shared/"* ]]; then
    echo -e "  ${BLUE}↪ Shared file (skipped)${NC}"
    ((SKIPPED++))
    return 0
  fi

  # Create temporary file
  local temp_file="${file}.tmp"

  # Add imports if not present
  if ! grep -q "import { createLogger }" "$file" 2>/dev/null; then
    # Find the first import or serve statement
    sed -i '1i import { createLogger } from "../_shared/logger.ts"' "$file" 2>/dev/null || {
      echo -e "  ${RED}✗ Failed to add logger import${NC}"
      ((ERRORS++))
      return 1
    }
  fi

  if ! grep -q "import { getCorsHeaders" "$file" 2>/dev/null; then
    sed -i '1i import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts"' "$file" 2>/dev/null || {
      echo -e "  ${RED}✗ Failed to add CORS import${NC}"
      ((ERRORS++))
      return 1
    }
  fi

  # Replace console.log with logger (preserve existing for now - will be manual review)
  # We don't want to auto-replace all console.log as some may be intentional

  # Replace hardcoded CORS headers (preserve for backward compat)
  if grep -q "const corsHeaders = {" "$file" 2>/dev/null; then
    # Don't remove old corsHeaders yet, add comment
    sed -i '/const corsHeaders = {/i // TODO: Migrate to getCorsHeaders() - legacy export kept for compatibility' "$file" 2>/dev/null || true
  fi

  # Add logger initialization after imports (if serve function exists)
  if grep -q "serve(async (req)" "$file" 2>/dev/null; then
    if ! grep -q "const logger = createLogger(" "$file" 2>/dev/null; then
      # Add logger after serve declaration
      sed -i "/serve(async (req)/a \ \ const logger = createLogger('$function_name')" "$file" 2>/dev/null || {
        echo -e "  ${RED}✗ Failed to add logger initialization${NC}"
        ((ERRORS++))
        return 1
      }
    fi
  fi

  echo -e "  ${GREEN}✓ Migrated successfully${NC}"
  ((MIGRATED++))
  return 0
}

# Migrate all Edge Function files
echo -e "${BLUE}Starting migration...${NC}"
echo ""

while IFS= read -r file; do
  migrate_file "$file"
done < <(find "$FUNCTIONS_DIR" -name "index.ts" -type f)

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Migration Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Total files:     $TOTAL_FILES"
echo -e "${GREEN}Migrated:        $MIGRATED${NC}"
echo -e "${BLUE}Skipped:         $SKIPPED${NC}"
echo -e "${RED}Errors:          $ERRORS${NC}"
echo ""

if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}⚠️  Migration completed with errors!${NC}"
  echo -e "${YELLOW}   Check the output above for details${NC}"
  echo -e "${YELLOW}   Backup available at: $BACKUP_DIR${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Migration completed successfully!${NC}"
  echo ""
  echo -e "${YELLOW}Next steps:${NC}"
  echo -e "  1. Review migrated files manually"
  echo -e "  2. Replace console.log calls with logger methods"
  echo -e "  3. Update CORS handling to use getCorsHeaders(req.headers.get('origin'))"
  echo -e "  4. Test each function"
  echo -e "  5. Remove backup after validation: rm -rf $BACKUP_DIR"
  echo ""
fi
