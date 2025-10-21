// ============================================================================
// N8N WORKFLOW - SCRIPT FINAL CONSOLIDADO
// ============================================================================
// Este script deve ser o ÚLTIMO nó do workflow
// Ele recebe dados de campanhas, flows e shopify e envia tudo junto pro callback
// ============================================================================

const campanhasData = $node["Buscar Campanhas Klaviyo"].json;
const flowsData = $node["Buscar Flows Klaviyo"].json;
const shopifyData = $node["Buscar Dados Shopify"].json;

// Dados básicos que vieram do início do workflow
const baseData = campanhasData || flowsData || shopifyData || {};

const payload = {
  // Identificação
  request_id: baseData.request_id,
  storeId: baseData.storeId,
  startDate: baseData.startDate,
  endDate: baseData.endDate,

  // Dados Klaviyo
  campanhas: campanhasData?.campanhas || [],
  flows: flowsData?.flows || [],
  metricaId: campanhasData?.metricaId || 'W8Gk3c',

  // Dados Shopify
  shopify: shopifyData?.summary || null,

  // Metadados
  processed_at: new Date().toISOString(),
  workflow_version: '2.0-consolidated'
};

console.log('='.repeat(80));
console.log('PAYLOAD CONSOLIDADO PARA ENVIO');
console.log('='.repeat(80));
console.log('Request ID:', payload.request_id);
console.log('Store ID:', payload.storeId);
console.log('Period:', payload.startDate, 'to', payload.endDate);
console.log('Campanhas:', payload.campanhas.length);
console.log('Flows:', payload.flows.length);
console.log('Shopify:', payload.shopify ? 'YES' : 'NO');
console.log('='.repeat(80));

return [{ json: payload }];
