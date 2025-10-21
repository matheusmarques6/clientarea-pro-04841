#!/bin/bash

# ============================================================================
# Script de Teste para Edge Function process-complete-sync
# ============================================================================

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   Teste da Edge Function: process-complete-sync               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Verificar se SUPABASE_URL está definida
if [ -z "$SUPABASE_URL" ]; then
  echo -e "${RED}❌ ERRO: Variável SUPABASE_URL não está definida${NC}"
  echo ""
  echo "Por favor, defina a variável de ambiente:"
  echo "  export SUPABASE_URL='https://seu-projeto.supabase.co'"
  echo ""
  exit 1
fi

EDGE_FUNCTION_URL="${SUPABASE_URL}/functions/v1/process-complete-sync"

echo -e "${YELLOW}🔗 URL da Edge Function:${NC}"
echo "   $EDGE_FUNCTION_URL"
echo ""

# Criar um job de teste no banco primeiro (você precisará fazer isso manualmente)
echo -e "${YELLOW}⚠️  ATENÇÃO:${NC}"
echo "   Antes de executar este teste, você precisa criar um job de teste no banco:"
echo ""
echo "   INSERT INTO n8n_jobs (id, store_id, period_start, period_end, request_id, status, source, created_at)"
echo "   VALUES ("
echo "     gen_random_uuid(),"
echo "     '00000000-0000-0000-0000-000000000000',"  # Substitua pelo seu store_id real
echo "     '2024-10-15',"
echo "     '2024-10-20',"
echo "     'test_req_1729468800_abc123',"
echo "     'PROCESSING',"
echo "     'klaviyo',"
echo "     NOW()"
echo "   );"
echo ""

read -p "Pressione ENTER quando o job estiver criado no banco..."

echo ""
echo -e "${YELLOW}📤 Enviando payload de teste...${NC}"
echo ""

# Executar request
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$EDGE_FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d @test-payload-example.json)

# Separar body e status code
HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

echo "─────────────────────────────────────────────────────────────────"
echo -e "${YELLOW}📊 Resultado:${NC}"
echo "─────────────────────────────────────────────────────────────────"

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✅ Status Code: $HTTP_CODE (SUCCESS)${NC}"
  echo ""
  echo -e "${YELLOW}Response Body:${NC}"
  echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
  echo ""
  echo -e "${GREEN}✅ Teste concluído com sucesso!${NC}"
  echo ""
  echo "Próximos passos:"
  echo "  1. Verifique os logs: supabase functions logs process-complete-sync"
  echo "  2. Confira o banco: SELECT * FROM klaviyo_summaries ORDER BY updated_at DESC LIMIT 1;"
  echo "  3. Verifique o job: SELECT * FROM n8n_jobs WHERE request_id = 'test_req_1729468800_abc123';"
else
  echo -e "${RED}❌ Status Code: $HTTP_CODE (ERRO)${NC}"
  echo ""
  echo -e "${YELLOW}Response Body:${NC}"
  echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
  echo ""
  echo -e "${RED}❌ Teste falhou!${NC}"
  echo ""
  echo "Para debug:"
  echo "  1. Veja os logs: supabase functions logs process-complete-sync"
  echo "  2. Verifique se o job existe no banco"
  echo "  3. Confirme que o request_id está correto"
fi

echo "─────────────────────────────────────────────────────────────────"
