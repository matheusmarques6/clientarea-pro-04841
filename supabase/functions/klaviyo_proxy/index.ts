import { serve } from "https://deno.land/std/http/server.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      }
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const body = await req.json();
    
    // Validate required fields
    if (!body.privateKey || !body.startDate || !body.endDate || !body.storeId) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: privateKey, startDate, endDate, storeId' 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // Get the N8N webhook URL from environment
    const n8nWebhookUrl = Deno.env.get('N8N_KLAVIYO_WEBHOOK_URL');
    
    if (!n8nWebhookUrl) {
      return new Response(JSON.stringify({ 
        error: 'Klaviyo integration not configured',
        hint: 'Configure N8N_KLAVIYO_WEBHOOK_URL environment variable'
      }), {
        status: 503,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // Forward to N8N webhook
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return new Response(JSON.stringify({ 
        error: 'N8N webhook error',
        status: response.status,
        details: errorText.slice(0, 1000)
      }), {
        status: response.status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });

  } catch (error) {
    console.error('Klaviyo proxy error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
});