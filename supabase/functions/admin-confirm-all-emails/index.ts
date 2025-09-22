import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('admin-confirm-all-emails: Starting request processing')

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }), 
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const jwt = authHeader.replace('Bearer ', '')
    console.log('admin-confirm-all-emails: JWT token extracted')

    // Create service role client
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    
    // Verify caller is admin using the JWT
    const supabaseUser = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } }
    })

    const { data: userRes } = await supabaseUser.auth.getUser(jwt)
    const caller = userRes?.user
    
    if (!caller) {
      console.log('admin-confirm-all-emails: User not found')
      return new Response(
        JSON.stringify({ error: 'Unauthorized - user not found' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('admin-confirm-all-emails: Caller ID:', caller.id)

    // Verify admin status
    const { data: isAdmin, error: adminErr } = await supabaseAdmin.rpc('is_admin', { _user_id: caller.id })
    
    if (adminErr) {
      console.error('admin-confirm-all-emails: Admin check error:', adminErr)
      return new Response(
        JSON.stringify({ error: 'Permission check failed' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!isAdmin) {
      console.log('admin-confirm-all-emails: User is not admin')
      return new Response(
        JSON.stringify({ error: 'Forbidden: not admin' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('admin-confirm-all-emails: Admin verified')

    // Iterate over all users and confirm emails where needed
    let page = 1
    const perPage = 100
    let totalConfirmed = 0
    while (true) {
      const { data: usersPage, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
      if (listErr) {
        console.error('admin-confirm-all-emails: listUsers error:', listErr)
        return new Response(
          JSON.stringify({ error: listErr.message || 'Falha ao listar usuários' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const users = usersPage?.users || []
      if (users.length === 0) break

      for (const u of users) {
        const already = (u as any).email_confirmed_at || (u as any).confirmed_at
        if (!already) {
          const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(u.id, {
            email_confirm: true,
            user_metadata: { ...(u.user_metadata || {}), email_verified: true, email_confirmed_at: new Date().toISOString() }
          })
          if (!updErr) totalConfirmed++
          else console.warn('admin-confirm-all-emails: failed confirming', u.id, updErr.message)
        }
      }

      if (users.length < perPage) break
      page++
    }

    console.log(`admin-confirm-all-emails: Confirmed ${totalConfirmed} users`)

    return new Response(
      JSON.stringify({ data: { confirmed: totalConfirmed } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (e) {
    console.error('admin-confirm-all-emails: Unexpected error:', e)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})