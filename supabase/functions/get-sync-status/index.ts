// ============================================================================
// GET SYNC STATUS - Edge Function
// Retorna o status de um job de sincronização
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    // Get job_id from query params or body
    let job_id: string | null = null
    let request_id: string | null = null

    if (req.method === 'GET') {
      const url = new URL(req.url)
      job_id = url.searchParams.get('job_id')
      request_id = url.searchParams.get('request_id')
    } else if (req.method === 'POST') {
      const body = await req.json()
      job_id = body.job_id
      request_id = body.request_id
    }

    if (!job_id && !request_id) {
      return new Response(
        JSON.stringify({ error: 'Missing job_id or request_id parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch job from database
    let query = supabase
      .from('n8n_jobs')
      .select('*')

    if (job_id) {
      query = query.eq('id', job_id)
    } else if (request_id) {
      query = query.eq('request_id', request_id)
    }

    const { data: job, error: jobError } = await query.single()

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se usuário tem acesso à loja deste job
    const { data: storeAccess } = await supabase
      .from('v_user_stores')
      .select('store_id')
      .eq('user_id', user.id)
      .eq('store_id', job.store_id)
      .single()

    if (!storeAccess) {
      return new Response('Access denied', { status: 403, headers: corsHeaders })
    }

    // Calcular tempo de processamento
    let processing_time_ms = null
    if (job.finished_at && job.created_at) {
      const start = new Date(job.created_at).getTime()
      const end = new Date(job.finished_at).getTime()
      processing_time_ms = end - start
    } else if (job.status === 'PROCESSING') {
      const start = new Date(job.created_at).getTime()
      const now = Date.now()
      processing_time_ms = now - start
    }

    // Retornar status
    return new Response(
      JSON.stringify({
        job_id: job.id,
        request_id: job.request_id,
        status: job.status,
        store_id: job.store_id,
        period_start: job.period_start,
        period_end: job.period_end,
        created_at: job.created_at,
        finished_at: job.finished_at,
        processing_time_ms,
        error: job.error,
        meta: job.meta,
        payload: job.payload
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('Error in get-sync-status:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
