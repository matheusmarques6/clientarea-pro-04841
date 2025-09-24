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
    console.log('admin-create-user-and-store: Starting request processing')

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
    console.log('admin-create-user-and-store: JWT token extracted')

    // Create service role client
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    
    // Verify caller is admin using the JWT
    const supabaseUser = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } }
    })

    const { data: userRes } = await supabaseUser.auth.getUser(jwt)
    const caller = userRes?.user
    
    if (!caller) {
      console.log('admin-create-user-and-store: User not found')
      return new Response(
        JSON.stringify({ error: 'Unauthorized - user not found' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('admin-create-user-and-store: Caller ID:', caller.id)

    // Verify admin status
    const { data: isAdmin, error: adminErr } = await supabaseAdmin.rpc('is_admin', { _user_id: caller.id })
    
    if (adminErr) {
      console.error('admin-create-user-and-store: Admin check error:', adminErr)
      return new Response(
        JSON.stringify({ error: 'Permission check failed' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!isAdmin) {
      console.log('admin-create-user-and-store: User is not admin')
      return new Response(
        JSON.stringify({ error: 'Forbidden: not admin' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('admin-create-user-and-store: Admin verified')

    const body = await req.json()
    const { 
      user_name, 
      user_email, 
      user_password, 
      user_role = 'owner',
      store_name,
      store_client_id,
      store_country,
      store_currency,
      store_status = 'connected'
    } = body

    if (!user_name || !user_email || !user_password || !store_name || !store_client_id || !store_currency) {
      return new Response(
        JSON.stringify({ error: 'Todos os campos obrigatórios devem ser preenchidos' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('admin-create-user-and-store: Creating user and store for:', user_email)

    // STEP 1: Ensure auth user exists and is confirmed
    console.log('admin-create-user-and-store: Step 1 - Ensuring auth user (confirm email)')
    let authUserId: string | null = null
    // Search existing auth user by email
    let page = 1
    const perPage = 100
    let foundAuthUser: any = null
    while (true) {
      const { data: pageData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
      if (listErr) break
      const match = pageData?.users?.find((u: any) => u.email === user_email)
      if (match) { foundAuthUser = match; break }
      if (!pageData || pageData.users.length < perPage) break
      page++
    }

    if (foundAuthUser) {
      authUserId = foundAuthUser.id
      const alreadyConfirmed = (foundAuthUser as any).email_confirmed_at
      if (!alreadyConfirmed && authUserId) {
        await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          email_confirm: true,
          user_metadata: { ...(foundAuthUser.user_metadata || {}), name: user_name, email_verified: true, email_confirmed_at: new Date().toISOString() }
        })
      }
    } else {
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user_email,
        password: user_password,
        email_confirm: true,
        user_metadata: { name: user_name }
      })

      if (authError) {
        console.error('admin-create-user-and-store: Auth user creation error:', authError)
        return new Response(
          JSON.stringify({ error: authError.message || 'Falha ao criar usuário de autenticação' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      authUserId = authUser.user?.id ?? null
      if (!authUserId) {
        console.error('admin-create-user-and-store: Auth user ID not returned')
        return new Response(
          JSON.stringify({ error: 'Auth user não retornado' }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    console.log('admin-create-user-and-store: Auth user ensured with ID:', authUserId)

    // STEP 2: Create user in public.users table
    console.log('admin-create-user-and-store: Step 2 - Creating public user record')
    const { data: publicUser, error: publicUserError } = await supabaseAdmin
      .from('users')
      .insert({ 
        id: authUserId, 
        name: user_name, 
        email: user_email, 
        role: user_role, 
        is_admin: false 
      })
      .select()
      .single()

    if (publicUserError) {
      console.error('admin-create-user-and-store: Public user creation error:', publicUserError)
      // Rollback: delete auth user
      if (authUserId) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
      }
      return new Response(
        JSON.stringify({ error: publicUserError.message || 'Falha ao salvar perfil do usuário' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('admin-create-user-and-store: Public user created successfully')

    // STEP 3: Create store
    console.log('admin-create-user-and-store: Step 3 - Creating store')
    const { data: storeData, error: storeError } = await supabaseAdmin
      .from('stores')
      .insert({ 
        client_id: store_client_id, 
        name: store_name, 
        country: store_country ?? null, 
        currency: store_currency, 
        status: store_status,
        customer_id: store_client_id  // Set customer_id to client_id for permissions
      })
      .select()
      .single()

    if (storeError) {
      console.error('admin-create-user-and-store: Store creation error:', storeError)
      // Rollback: delete user and auth user
      if (authUserId) {
        await supabaseAdmin.from('users').delete().eq('id', authUserId)
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
      }
      return new Response(
        JSON.stringify({ error: storeError.message || 'Falha ao criar loja' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('admin-create-user-and-store: Store created with ID:', storeData.id)

    // STEP 4: Associate user with store
    console.log('admin-create-user-and-store: Step 4 - Associating user with store')
    const { error: associationError } = await supabaseAdmin
      .from('store_members')
      .insert({
        user_id: authUserId,
        store_id: storeData.id,
        role: user_role
      })

    // Also ensure v_user_stores contains the mapping used by RLS
    const { error: vusError } = await supabaseAdmin
      .from('v_user_stores')
      .insert({ user_id: authUserId, store_id: storeData.id })

    if (associationError || vusError) {
      console.error('admin-create-user-and-store: Association errors:', { associationError, vusError })
      // Rollback: delete store, user, and auth user
      await supabaseAdmin.from('stores').delete().eq('id', storeData.id)
      if (authUserId) {
        await supabaseAdmin.from('users').delete().eq('id', authUserId)
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
      }
      return new Response(
        JSON.stringify({ error: (associationError || vusError)?.message || 'Falha ao associar usuário à loja' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('admin-create-user-and-store: User associated with store successfully')

    return new Response(
      JSON.stringify({ 
        data: {
          user: publicUser,
          store: storeData,
          message: 'Usuário e loja criados e associados com sucesso'
        }
      }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (e) {
    console.error('admin-create-user-and-store: Unexpected error:', e)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})