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
    const { client_id, name, country, currency, status } = body as {
      client_id: string; name: string; country?: string; currency: string; status?: string;
    };

    if (!client_id || !name || !currency) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios ausentes' }), { status: 400 });
    }

    const { data, error } = await supabase
      .from('stores')
      .insert({ client_id, name, country: country ?? null, currency, status: status ?? 'active' })
      .select()
      .single();

    if (error) {
      console.error('stores insert error', error);
      return new Response(JSON.stringify({ error: error.message || 'Falha ao criar loja' }), { status: 400 });
    }

    return new Response(JSON.stringify({ data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('admin-create-store error', e);
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500 });
  }
});