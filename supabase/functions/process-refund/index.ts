// Edge Function: process-refund
// Priority 4: Shopify refund processing integration
// Handles manual refund approvals and Shopify API integration

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RefundRequest {
  request_id: string;
  refund_amount: number;
  refund_reason?: string;
  notify_customer?: boolean;
  shipping_refund?: {
    amount: number;
    full_refund: boolean;
  };
  restock_items?: boolean;
  line_items?: Array<{
    line_item_id: string;
    quantity: number;
    restock_type?: 'no_restock' | 'cancel' | 'return';
  }>;
}

interface RefundResponse {
  success: boolean;
  data?: {
    refund_id: string;
    shopify_refund_id?: string;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
    transaction_id?: string;
  };
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Method not allowed. Use POST request.'
        }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const refundRequest: RefundRequest = await req.json();

    // Validate required fields
    if (!refundRequest.request_id || !refundRequest.refund_amount) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: request_id, refund_amount'
        } as RefundResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch the return request
    const { data: returnRequest, error: requestError } = await supabaseClient
      .from('rm_requests')
      .select('*')
      .eq('id', refundRequest.request_id)
      .single();

    if (requestError || !returnRequest) {
      console.error('Request not found:', requestError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Return request not found'
        } as RefundResponse),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if request is in a valid status for refund
    const validStatuses = ['approved', 'item_received', 'refund_pending'];
    if (!validStatuses.includes(returnRequest.status)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Cannot process refund. Request status must be 'approved', 'item_received', or 'refund_pending'. Current status: ${returnRequest.status}`
        } as RefundResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch store configuration
    const { data: store, error: storeError } = await supabaseClient
      .from('stores')
      .select('shopify_domain, shopify_access_token')
      .eq('id', returnRequest.store_id)
      .single();

    if (storeError || !store || !store.shopify_domain || !store.shopify_access_token) {
      console.error('Store not found or Shopify not configured:', storeError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Store not found or Shopify integration not configured'
        } as RefundResponse),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract Shopify order ID from the order_id stored in the request
    // Format is typically "gid://shopify/Order/1234567890"
    const shopifyOrderId = returnRequest.shopify_order_id;

    if (!shopifyOrderId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Shopify order ID not found in return request'
        } as RefundResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch return request items for line item refunds
    const { data: requestItems, error: itemsError } = await supabaseClient
      .from('rm_request_items')
      .select('*')
      .eq('request_id', refundRequest.request_id);

    if (itemsError) {
      console.error('Error fetching request items:', itemsError);
    }

    // Build refund line items for Shopify
    const refundLineItems = refundRequest.line_items ||
      (requestItems || []).map((item: any) => ({
        line_item_id: item.shopify_line_item_id,
        quantity: item.quantity,
        restock_type: refundRequest.restock_items ? 'return' : 'no_restock',
      }));

    // Create Shopify refund using GraphQL
    const shopifyMutation = `
      mutation refundCreate($input: RefundInput!) {
        refundCreate(input: $input) {
          refund {
            id
            createdAt
            totalRefundedSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            transactions {
              id
              status
              amount {
                shopMoney {
                  amount
                  currencyCode
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const refundInput: any = {
      orderId: shopifyOrderId,
      note: refundRequest.refund_reason || `Refund processed for return request ${returnRequest.code}`,
      notify: refundRequest.notify_customer !== false,
      refundLineItems: refundLineItems.map((item: any) => ({
        lineItemId: item.line_item_id,
        quantity: item.quantity,
        restockType: item.restock_type?.toUpperCase() || 'NO_RESTOCK',
      })),
    };

    // Add shipping refund if specified
    if (refundRequest.shipping_refund) {
      refundInput.shipping = {
        amount: refundRequest.shipping_refund.amount,
        fullRefund: refundRequest.shipping_refund.full_refund,
      };
    }

    console.log('Creating Shopify refund with input:', JSON.stringify(refundInput, null, 2));

    const shopifyResponse = await fetch(
      `https://${store.shopify_domain}/admin/api/2024-01/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': store.shopify_access_token,
        },
        body: JSON.stringify({
          query: shopifyMutation,
          variables: { input: refundInput },
        }),
      }
    );

    if (!shopifyResponse.ok) {
      throw new Error(`Shopify API error: ${shopifyResponse.status} ${shopifyResponse.statusText}`);
    }

    const shopifyData = await shopifyResponse.json();

    if (shopifyData.errors) {
      console.error('Shopify GraphQL errors:', shopifyData.errors);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Error processing refund in Shopify: ' + JSON.stringify(shopifyData.errors)
        } as RefundResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const refundResult = shopifyData.data?.refundCreate;

    if (refundResult?.userErrors && refundResult.userErrors.length > 0) {
      console.error('Shopify user errors:', refundResult.userErrors);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Shopify refund errors: ' + refundResult.userErrors.map((e: any) => e.message).join(', ')
        } as RefundResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const shopifyRefund = refundResult?.refund;

    if (!shopifyRefund) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Shopify refund creation failed - no refund data returned'
        } as RefundResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert refund record in database
    const { data: refund, error: refundError } = await supabaseClient
      .from('rm_refunds')
      .insert({
        request_id: refundRequest.request_id,
        shopify_refund_id: shopifyRefund.id,
        amount: parseFloat(shopifyRefund.totalRefundedSet.shopMoney.amount),
        currency: shopifyRefund.totalRefundedSet.shopMoney.currencyCode,
        status: 'completed',
        processed_at: new Date().toISOString(),
        transaction_id: shopifyRefund.transactions?.[0]?.id,
        refund_reason: refundRequest.refund_reason,
        metadata: {
          notify_customer: refundRequest.notify_customer,
          restock_items: refundRequest.restock_items,
          shipping_refund: refundRequest.shipping_refund,
          line_items: refundLineItems,
        },
      })
      .select()
      .single();

    if (refundError) {
      console.error('Error creating refund record:', refundError);
      throw new Error('Failed to save refund data');
    }

    // Update request status
    const { error: updateError } = await supabaseClient
      .from('rm_requests')
      .update({
        status: 'refunded',
        refund_amount: parseFloat(shopifyRefund.totalRefundedSet.shopMoney.amount),
      })
      .eq('id', refundRequest.request_id);

    if (updateError) {
      console.error('Error updating request:', updateError);
    }

    // Create event log
    await supabaseClient
      .from('rm_request_events')
      .insert({
        request_id: refundRequest.request_id,
        event_type: 'refund_processed',
        description: `Refund of ${shopifyRefund.totalRefundedSet.shopMoney.amount} ${shopifyRefund.totalRefundedSet.shopMoney.currencyCode} processed successfully via Shopify.${refundRequest.notify_customer !== false ? ' Customer notified.' : ''}`,
      });

    const response: RefundResponse = {
      success: true,
      data: {
        refund_id: refund.id,
        shopify_refund_id: shopifyRefund.id,
        amount: parseFloat(shopifyRefund.totalRefundedSet.shopMoney.amount),
        currency: shopifyRefund.totalRefundedSet.shopMoney.currencyCode,
        status: 'completed',
        created_at: shopifyRefund.createdAt,
        transaction_id: shopifyRefund.transactions?.[0]?.id,
      },
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      } as RefundResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
