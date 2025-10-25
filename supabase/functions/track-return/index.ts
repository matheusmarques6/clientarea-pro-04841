// Edge Function: track-return
// Priority 1: Public tracking code lookup for customers
// Allows customers to track their return/exchange request status

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrackingResponse {
  success: boolean;
  data?: {
    code: string;
    type: 'return' | 'exchange';
    status: string;
    created_at: string;
    customer_name: string;
    customer_email: string;
    order_code: string;
    tracking_code?: string;
    tracking_carrier?: string;
    tracking_url?: string;
    items: Array<{
      product_name: string;
      variant_title?: string;
      quantity: number;
      image_url?: string;
      exchange_for_product_name?: string;
      exchange_for_variant_title?: string;
    }>;
    timeline: Array<{
      event_type: string;
      description: string;
      created_at: string;
    }>;
  };
  error?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const trackingCode = url.searchParams.get('code');

    if (!trackingCode) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Tracking code is required. Use ?code=RET-YYYY-NNNNNN'
        } as TrackingResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase client with service role (bypass RLS for public lookup)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch request data
    const { data: request, error: requestError } = await supabaseClient
      .from('rm_requests')
      .select('*')
      .eq('code', trackingCode)
      .single();

    if (requestError || !request) {
      console.error('Request not found:', requestError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Tracking code not found. Please verify the code and try again.'
        } as TrackingResponse),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch items
    const { data: items, error: itemsError } = await supabaseClient
      .from('rm_request_items')
      .select('product_name, variant_title, quantity, image_url, exchange_for_product_name, exchange_for_variant_title')
      .eq('request_id', request.id)
      .order('created_at', { ascending: true });

    if (itemsError) {
      console.error('Error fetching items:', itemsError);
    }

    // Fetch timeline events
    const { data: events, error: eventsError } = await supabaseClient
      .from('rm_request_events')
      .select('event_type, description, created_at')
      .eq('request_id', request.id)
      .order('created_at', { ascending: false });

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
    }

    // Build response with only public-safe information
    const response: TrackingResponse = {
      success: true,
      data: {
        code: request.code,
        type: request.type,
        status: request.status,
        created_at: request.created_at,
        customer_name: request.customer_name,
        customer_email: request.customer_email,
        order_code: request.order_code,
        tracking_code: request.tracking_code,
        tracking_carrier: request.tracking_carrier,
        tracking_url: request.tracking_url,
        items: items || [],
        timeline: events || [],
      },
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error. Please try again later.'
      } as TrackingResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
