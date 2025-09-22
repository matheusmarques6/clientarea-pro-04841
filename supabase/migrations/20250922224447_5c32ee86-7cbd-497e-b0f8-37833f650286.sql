-- Function to reconcile public.users with auth user id and cascade memberships
create or replace function public.reconcile_user_profile(_email text, _auth_id uuid, _name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_id uuid;
begin
  -- Find existing row by email
  select id into old_id from public.users where email = _email limit 1;

  if old_id is null then
    -- No row yet: create with correct auth id
    insert into public.users (id, email, name)
    values (_auth_id, _email, coalesce(_name, split_part(_email,'@',1)))
    on conflict (id) do nothing;
  elsif old_id <> _auth_id then
    -- Migrate references from old_id to auth_id
    update public.store_members set user_id = _auth_id where user_id = old_id;
    update public.v_user_stores set user_id = _auth_id where user_id = old_id;

    -- Replace users row with correct id
    delete from public.users where id = old_id;

    insert into public.users (id, email, name)
    values (_auth_id, _email, coalesce(_name, split_part(_email,'@',1)))
    on conflict (id) do update set
      email = excluded.email,
      name = coalesce(excluded.name, public.users.name),
      updated_at = now();
  else
    -- Ensure data is up to date
    update public.users set
      name = coalesce(_name, name),
      updated_at = now()
    where id = _auth_id;
  end if;
end;
$$;

-- Allow authenticated users to execute to reconcile their own profile via client
grant execute on function public.reconcile_user_profile(text, uuid, text) to authenticated;