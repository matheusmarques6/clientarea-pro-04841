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
    console.log('admin-create-user: Starting request processing')

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
    console.log('admin-create-user: JWT token extracted')

    // Create service role client
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    
    // Verify caller is admin using the JWT
    const supabaseUser = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } }
    })

    const { data: userRes } = await supabaseUser.auth.getUser(jwt)
    const caller = userRes?.user
    
    if (!caller) {
      console.log('admin-create-user: User not found')
      return new Response(
        JSON.stringify({ error: 'Unauthorized - user not found' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('admin-create-user: Caller ID:', caller.id)

    // Verify admin status
    const { data: isAdmin, error: adminErr } = await supabaseAdmin.rpc('is_admin', { _user_id: caller.id })
    
    if (adminErr) {
      console.error('admin-create-user: Admin check error:', adminErr)
      return new Response(
        JSON.stringify({ error: 'Permission check failed' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!isAdmin) {
      console.log('admin-create-user: User is not admin')
      return new Response(
        JSON.stringify({ error: 'Forbidden: not admin' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('admin-create-user: Admin verified')

    const body = await req.json()
    const { name, email, role = 'viewer', password } = body

    if (!name || !email) {
      return new Response(
        JSON.stringify({ error: 'Nome e email são obrigatórios' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('admin-create-user: Creating user:', { name, email, role })

    // Check if user already exists in public.users table
    const { data: existingUser, error: existingErr } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()

    if (existingErr) {
      console.error('admin-create-user: Error checking existing user:', existingErr)
      return new Response(
        JSON.stringify({ error: 'Falha ao verificar usuário existente' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let authUserId: string | null = existingUser?.id ?? null

    if (!authUserId) {
      // Try to find existing auth user by email and confirm
      let foundAuthUser: any = null
      let page = 1
      const perPage = 100
      while (true) {
        const { data: pageData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
        if (listErr) break
        const match = pageData?.users?.find((u: any) => u.email === email)
        if (match) { foundAuthUser = match; break }
        if (!pageData || pageData.users.length < perPage) break
        page++
      }

      if (foundAuthUser) {
        authUserId = foundAuthUser.id
        const alreadyConfirmed = (foundAuthUser as any).email_confirmed_at
        if (!alreadyConfirmed) {
          await supabaseAdmin.auth.admin.updateUserById(authUserId, {
            email_confirm: true,
            user_metadata: { ...(foundAuthUser.user_metadata || {}), email_verified: true, email_confirmed_at: new Date().toISOString() }
          })
        }
      } else {
        // Create auth user
        const tempPassword = password || crypto.randomUUID().slice(0, 12)
        console.log('admin-create-user: Creating auth user with password length:', tempPassword.length)
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { name }
        })

        if (createErr) {
          console.error('admin-create-user: Auth user creation error:', createErr)
          return new Response(
            JSON.stringify({ error: createErr.message || 'Falha ao criar usuário de autenticação' }), 
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        authUserId = created.user?.id ?? null
        if (!authUserId) {
          console.error('admin-create-user: Auth user ID not returned')
          return new Response(
            JSON.stringify({ error: 'Auth user não retornado' }), 
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('admin-create-user: Auth user created with ID:', authUserId)
      }
    }

    // Upsert into public.users always using authUserId
    const { data: upserted, error: upsertErr } = await supabaseAdmin
      .from('users')
      .upsert({ 
        id: authUserId!, 
        name, 
        email, 
        role, 
        is_admin: false 
      }, { 
        onConflict: 'id' 
      })
      .select()
      .single()

    if (upsertErr) {
      console.error('admin-create-user: Upsert error:', upsertErr)
      return new Response(
        JSON.stringify({ error: upsertErr.message || 'Falha ao salvar perfil do usuário' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('admin-create-user: User created successfully:', upserted.id)

    return new Response(
      JSON.stringify({ data: upserted }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (e) {
    console.error('admin-create-user: Unexpected error:', e)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})