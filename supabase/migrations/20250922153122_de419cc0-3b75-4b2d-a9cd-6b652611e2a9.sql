-- Allow authenticated users to create their own profile rows and auto-elevate demo admin
begin;

-- 1) Policy: users can insert their own profile (id must match auth.uid())
drop policy if exists "Users can insert their own profile" on public.users;
create policy "Users can insert their own profile"
on public.users
for insert
to authenticated
with check (id = auth.uid());

-- 2) Optional: allow users to select their own profile already exists; keep as-is

-- 3) Trigger to auto-mark demo admin by email
create or replace function public.ensure_admin_for_demo_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email = 'admin@convertfy.dev' then
    new.is_admin := true;
    new.role := coalesce(new.role, 'admin'::role_type);
  end if;
  return new;
end;
$$;

-- Attach trigger for inserts and updates
 drop trigger if exists trg_ensure_admin_for_demo_email on public.users;
create trigger trg_ensure_admin_for_demo_email
before insert or update on public.users
for each row
execute function public.ensure_admin_for_demo_email();

commit;