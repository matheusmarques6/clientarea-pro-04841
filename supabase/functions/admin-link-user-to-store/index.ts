import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const jwt = authHeader.replace('Bearer ', '')

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const supabaseUser = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { global: { headers: { Authorization: `Bearer ${jwt}` } } })

    const { data: userRes } = await supabaseUser.auth.getUser(jwt)
    const caller = userRes?.user
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized - user not found' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: isAdmin, error: adminErr } = await supabaseAdmin.rpc('is_admin', { _user_id: caller.id })
    if (adminErr) {
      return new Response(JSON.stringify({ error: 'Permission check failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: not admin' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json()
    const { user_email, store_id, role = 'viewer' } = body
    if (!user_email || !store_id) {
      return new Response(JSON.stringify({ error: 'user_email e store_id são obrigatórios' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: userRow, error: userErr } = await supabaseAdmin.from('users').select('id').eq('email', user_email).maybeSingle()
    if (userErr || !userRow) {
      return new Response(JSON.stringify({ error: userErr?.message || 'Usuário não encontrado' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Insert into store_members
    const { error: memberErr } = await supabaseAdmin.from('store_members').insert({ user_id: userRow.id, store_id, role })

    // Insert into v_user_stores for RLS visibility
    const { error: vusErr } = await supabaseAdmin.from('v_user_stores').insert({ user_id: userRow.id, store_id })

    if (memberErr && (memberErr as any).code !== '23505') {
      return new Response(JSON.stringify({ error: memberErr.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (vusErr && (vusErr as any).code !== '23505') {
      return new Response(JSON.stringify({ error: vusErr.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('admin-link-user-to-store: Unexpected error:', e)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})