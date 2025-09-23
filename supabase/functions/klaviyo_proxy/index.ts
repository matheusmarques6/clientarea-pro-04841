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
      // Return mock data for development
      const mockResponse = {
        klaviyo_v2: {
          revenue_total: 15420.50,
          revenue_campaigns: 8230.25,
          revenue_flows: 7190.25,
          orders_attributed: 145,
          top_campaigns_by_revenue: [
            {
              id: "01HXYZ123",
              nome: "Black Friday 2024",
              receita: 3450.75,
              conversoes: 45,
              data_envio: "2024-11-25",
              status: "Sent"
            },
            {
              id: "01HXYZ124", 
              nome: "Welcome Series",
              receita: 2180.30,
              conversoes: 32,
              data_envio: "2024-11-20",
              status: "Sent"
            },
            {
              id: "01HXYZ125",
              nome: "Product Launch",
              receita: 1890.40,
              conversoes: 28,
              data_envio: "2024-11-18",
              status: "Sent"
            }
          ],
          top_campaigns_by_conversions: [
            {
              id: "01HXYZ123",
              nome: "Black Friday 2024", 
              conversoes: 45,
              receita: 3450.75,
              data_envio: "2024-11-25",
              status: "Sent"
            },
            {
              id: "01HXYZ124",
              nome: "Welcome Series",
              conversoes: 32,
              receita: 2180.30,
              data_envio: "2024-11-20", 
              status: "Sent"
            },
            {
              id: "01HXYZ125",
              nome: "Product Launch",
              conversoes: 28,
              receita: 1890.40,
              data_envio: "2024-11-18",
              status: "Sent"
            }
          ],
          leads_total: 12450,
          leads_engaged: {
            id: "segment_123",
            nome: "Leads Engajados 60d",
            total: 8230
          }
        },
        period: {
          start: body.startDate,
          end: body.endDate
        },
        store: {
          id: body.storeId,
          name: body.storeName || "Store"
        }
      };

      return new Response(JSON.stringify(mockResponse), {
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

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });

  } catch (error) {
    console.error('Klaviyo proxy error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
});