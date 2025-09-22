// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const jwt = authHeader.replace('Bearer ', '');

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const { data: userRes } = await supabase.auth.getUser(jwt);
    const caller = userRes?.user;
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Verify admin via RPC
    const { data: isAdmin, error: adminErr } = await supabase.rpc('is_admin', { _user_id: caller.id });
    if (adminErr) {
      console.error('is_admin rpc error', adminErr);
      return new Response(JSON.stringify({ error: 'Permission check failed' }), { status: 500 });
    }
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: not admin' }), { status: 403 });
    }

    const body = await req.json();
    const { name, email, role = 'viewer', password } = body as { name: string; email: string; role?: 'owner'|'manager'|'viewer'; password?: string };
    if (!name || !email) {
      return new Response(JSON.stringify({ error: 'Nome e email são obrigatórios' }), { status: 400 });
    }

    // Check if user already exists in our public.users table
    const { data: existingUser, error: existingErr } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (existingErr) {
      console.error('users lookup error', existingErr);
      return new Response(JSON.stringify({ error: 'Falha ao verificar usuário existente' }), { status: 500 });
    }

    let authUserId: string | null = existingUser?.id ?? null;

    if (!authUserId) {
      // Create auth user using service role
      const tempPassword = password || crypto.randomUUID().slice(0, 12);
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
      });
      if (createErr) {
        console.error('auth createUser error', createErr);
        return new Response(JSON.stringify({ error: createErr.message || 'Falha ao criar usuário de autenticação' }), { status: 400 });
      }
      authUserId = created.user?.id ?? null;
      if (!authUserId) {
        return new Response(JSON.stringify({ error: 'Auth user não retornado' }), { status: 500 });
      }
    }

    // Upsert into public.users ensuring id matches auth user id
    const { data: upserted, error: upsertErr } = await supabase
      .from('users')
      .upsert({ id: authUserId, name, email, role, is_admin: false }, { onConflict: 'id' })
      .select()
      .single();

    if (upsertErr) {
      // If conflict on id but email exists, try update by id
      console.error('users upsert error', upsertErr);
      return new Response(JSON.stringify({ error: upsertErr.message || 'Falha ao salvar perfil do usuário' }), { status: 400 });
    }

    return new Response(JSON.stringify({ data: upserted }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('admin-create-user error', e);
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500 });
  }
});