import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }), 
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { storeId, from, to } = await req.json()
    
    if (!storeId || !from || !to) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters: storeId, from, to' 
        }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Iniciando sincronização Klaviyo para store ${storeId} de ${from} até ${to}`)

    // Verificar se o usuário tem acesso à loja
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Extrair o token do header Authorization
    const token = authHeader.replace('Bearer ', '')
    
    // Verificar o token e obter o usuário
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid token' }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verificar se o usuário tem acesso à loja
    const { data: userStore, error: storeError } = await supabase
      .from('v_user_stores')
      .select('*')
      .eq('user_id', user.id)
      .eq('store_id', storeId)
      .maybeSingle()

    if (storeError || !userStore) {
      console.error('Store access error:', storeError)
      return new Response(
        JSON.stringify({ error: 'Access denied to store' }), 
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // URL do webhook n8n
    const webhookUrl = 'https://n8n-n8n.1fpac5.easypanel.host/webhook/klaviyo/summary'
    
    console.log(`Chamando webhook n8n: ${webhookUrl}`)
    
    // Fazer a chamada para o webhook n8n
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        storeId,
        from,
        to
      })
    })

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text()
      console.error(`Webhook error (${webhookResponse.status}):`, errorText)
      
      return new Response(
        JSON.stringify({ 
          error: `Webhook failed with status ${webhookResponse.status}`,
          details: errorText
        }), 
        { 
          status: 502, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const webhookData = await webhookResponse.json()
    console.log('Webhook response:', webhookData)

    // Se o webhook retornou dados, salvar no cache para fallback
    if (webhookData?.klaviyo) {
      const fromDate = new Date(from).toISOString().split('T')[0]
      const toDate = new Date(to).toISOString().split('T')[0]
      
      try {
        await supabase
          .from('klaviyo_summaries')
          .upsert({
            store_id: storeId,
            period_start: fromDate,
            period_end: toDate,
            revenue_total: Number(webhookData.klaviyo.revenue_total || 0),
            revenue_campaigns: Number(webhookData.klaviyo.revenue_campaigns || 0),
            revenue_flows: Number(webhookData.klaviyo.revenue_flows || 0),
            orders_attributed: Number(webhookData.klaviyo.orders_attributed || 0),
            leads_total: Number(webhookData.klaviyo.leads_total || 0),
            top_campaigns_by_revenue: webhookData.klaviyo.top_campaigns_by_revenue || [],
            top_campaigns_by_conversions: webhookData.klaviyo.top_campaigns_by_conversions || []
          }, { 
            onConflict: 'store_id,period_start,period_end' 
          })
        
        console.log('Dados salvos no cache com sucesso')
      } catch (cacheError) {
        console.error('Erro ao salvar no cache:', cacheError)
        // Não falhar a operação se não conseguir salvar no cache
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: webhookData,
        message: 'Sincronização Klaviyo concluída com sucesso'
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Erro na função:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})