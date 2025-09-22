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
    console.log('admin-create-store: Starting request processing')

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
    console.log('admin-create-store: JWT token extracted')

    // Create service role client
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    
    // Verify caller is admin using the JWT
    const supabaseUser = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } }
    })

    const { data: userRes } = await supabaseUser.auth.getUser(jwt)
    const caller = userRes?.user
    
    if (!caller) {
      console.log('admin-create-store: User not found')
      return new Response(
        JSON.stringify({ error: 'Unauthorized - user not found' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('admin-create-store: Caller ID:', caller.id)

    // Verify admin status
    const { data: isAdmin, error: adminErr } = await supabaseAdmin.rpc('is_admin', { _user_id: caller.id })
    
    if (adminErr) {
      console.error('admin-create-store: Admin check error:', adminErr)
      return new Response(
        JSON.stringify({ error: 'Permission check failed' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!isAdmin) {
      console.log('admin-create-store: User is not admin')
      return new Response(
        JSON.stringify({ error: 'Forbidden: not admin' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('admin-create-store: Admin verified')

    const body = await req.json()
    const { client_id, name, country, currency, status, user_email } = body

    if (!client_id || !name || !currency) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios ausentes' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('admin-create-store: Creating store:', { client_id, name, currency })

    // Create the store
    const { data: storeData, error: storeError } = await supabaseAdmin
      .from('stores')
      .insert({ 
        client_id, 
        name, 
        country: country ?? null, 
        currency, 
        status: status ?? 'connected'
        // Note: customer_id is optional and can be null
      })
      .select()
      .single()

    if (storeError) {
      console.error('admin-create-store: Store creation error:', storeError)
      return new Response(
        JSON.stringify({ error: storeError.message || 'Falha ao criar loja' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('admin-create-store: Store created with ID:', storeData.id)

    // If user_email is provided, associate the user with the store
    if (user_email) {
      console.log('admin-create-store: Associating user to store:', user_email)
      
      // Find the user by email
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', user_email)
        .single()

      if (userError) {
        console.error('admin-create-store: User lookup error:', userError)
        // Don't fail the store creation, just log the error
        console.log('admin-create-store: Continuing without user association')
      } else {
        // Associate user with store
        const { error: associationError } = await supabaseAdmin
          .from('store_members')
          .insert({
            user_id: userData.id,
            store_id: storeData.id,
            role: 'owner'
          })

        // Also ensure v_user_stores contains the mapping used by RLS
        const { error: vusError } = await supabaseAdmin
          .from('v_user_stores')
          .insert({ user_id: userData.id, store_id: storeData.id })

        if (associationError || vusError) {
          console.error('admin-create-store: Association errors:', { associationError, vusError })
          // Don't fail the store creation, just log the error
          console.log('admin-create-store: Store created but user association failed')
        } else {
          console.log('admin-create-store: User associated with store successfully')
        }
      }
    }

    return new Response(
      JSON.stringify({ data: storeData }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (e) {
    console.error('admin-create-store: Unexpected error:', e)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})