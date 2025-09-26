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
    console.log('admin-delete-user: Starting request processing')

    // Aceitar tanto POST quanto DELETE para compatibilidade com supabase.functions.invoke
    if (req.method !== 'POST' && req.method !== 'DELETE') {
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
    console.log('admin-delete-user: JWT token extracted')

    // Create service role client
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    
    // Verify caller is admin using the JWT
    const supabaseUser = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } }
    })

    const { data: userRes } = await supabaseUser.auth.getUser(jwt)
    const caller = userRes?.user
    
    if (!caller) {
      console.log('admin-delete-user: User not found')
      return new Response(
        JSON.stringify({ error: 'Unauthorized - user not found' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('admin-delete-user: Caller ID:', caller.id)

    // Verify admin status
    const { data: isAdmin, error: adminErr } = await supabaseAdmin.rpc('is_admin', { _user_id: caller.id })
    
    if (adminErr) {
      console.error('admin-delete-user: Admin check error:', adminErr)
      return new Response(
        JSON.stringify({ error: 'Permission check failed' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!isAdmin) {
      console.log('admin-delete-user: User is not admin')
      return new Response(
        JSON.stringify({ error: 'Forbidden: not admin' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('admin-delete-user: Admin verified')

    const body = await req.json()
    const { user_id } = body

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'ID do usuário é obrigatório' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('admin-delete-user: Deleting user:', user_id)

    // Prevent admin from deleting themselves
    if (user_id === caller.id) {
      return new Response(
        JSON.stringify({ error: 'Você não pode deletar sua própria conta' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // First delete from public.users (will cascade to related tables)
    const { error: publicDeleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', user_id)

    if (publicDeleteError) {
      console.error('admin-delete-user: Error deleting from public.users:', publicDeleteError)
      // Continue to try deleting from auth.users anyway
    }

    // Then delete from auth.users
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id)

    if (authDeleteError) {
      console.error('admin-delete-user: Error deleting from auth.users:', authDeleteError)
      return new Response(
        JSON.stringify({ error: authDeleteError.message || 'Falha ao deletar usuário' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('admin-delete-user: User deleted successfully')

    return new Response(
      JSON.stringify({ success: true, message: 'Usuário deletado com sucesso' }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (e) {
    console.error('admin-delete-user: Unexpected error:', e)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})