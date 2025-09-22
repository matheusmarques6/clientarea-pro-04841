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
    console.log('admin-confirm-email: Starting request processing')

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
    console.log('admin-confirm-email: JWT token extracted')

    // Create service role client
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    
    // Verify caller is admin using the JWT
    const supabaseUser = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } }
    })

    const { data: userRes } = await supabaseUser.auth.getUser(jwt)
    const caller = userRes?.user
    
    if (!caller) {
      console.log('admin-confirm-email: User not found')
      return new Response(
        JSON.stringify({ error: 'Unauthorized - user not found' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('admin-confirm-email: Caller ID:', caller.id)

    // Verify admin status
    const { data: isAdmin, error: adminErr } = await supabaseAdmin.rpc('is_admin', { _user_id: caller.id })
    
    if (adminErr) {
      console.error('admin-confirm-email: Admin check error:', adminErr)
      return new Response(
        JSON.stringify({ error: 'Permission check failed' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!isAdmin) {
      console.log('admin-confirm-email: User is not admin')
      return new Response(
        JSON.stringify({ error: 'Forbidden: not admin' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('admin-confirm-email: Admin verified')

    const body = await req.json()
    const { email } = body

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email é obrigatório' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('admin-confirm-email: Confirming email for:', email)

    // Get user by email first
    const { data: users, error: getUserError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (getUserError) {
      console.error('admin-confirm-email: Error getting users:', getUserError)
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar usuário' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const targetUser = users.users.find(u => u.email === email)
    
    if (!targetUser) {
      console.error('admin-confirm-email: User not found with email:', email)
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Confirm the user's email
    const { data: updateResult, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUser.id,
      { 
        email_confirm: true,
        user_metadata: {
          ...targetUser.user_metadata,
          email_confirmed_at: new Date().toISOString()
        }
      }
    )

    if (updateError) {
      console.error('admin-confirm-email: Error confirming email:', updateError)
      return new Response(
        JSON.stringify({ error: updateError.message || 'Falha ao confirmar email' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('admin-confirm-email: Email confirmed successfully for user:', targetUser.id)

    return new Response(
      JSON.stringify({ 
        data: {
          message: `Email confirmado com sucesso para ${email}`,
          user_id: targetUser.id
        }
      }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (e) {
    console.error('admin-confirm-email: Unexpected error:', e)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})