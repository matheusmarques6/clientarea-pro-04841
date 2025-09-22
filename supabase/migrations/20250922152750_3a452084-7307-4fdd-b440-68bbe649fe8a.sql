-- Fix recursive RLS by introducing a SECURITY DEFINER function and updating policies

-- 1) Helper function to check admin without triggering RLS recursion
create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = _user_id and is_admin = true
  );
$$;

-- 2) USERS table policies
-- Drop recursive/duplicated admin policies
drop policy if exists "Admins can access all users" on public.users;
drop policy if exists "Admins can insert users" on public.users;
drop policy if exists "Admins can update users" on public.users;
drop policy if exists "Admins can view all users" on public.users;

-- Recreate admin policies using the helper function
create policy "Admins can select users"
on public.users
for select
using (public.is_admin(auth.uid()));

create policy "Admins can insert users"
on public.users
for insert
with check (public.is_admin(auth.uid()));

create policy "Admins can update users"
on public.users
for update
using (public.is_admin(auth.uid()));

create policy "Admins can delete users"
on public.users
for delete
using (public.is_admin(auth.uid()));

-- Keep existing self-view policy ("Users can view their own profile") as-is

-- 3) ADMIN_AUDIT
drop policy if exists "Admins can access all admin_audit" on public.admin_audit;
create policy "Admins can access all admin_audit"
on public.admin_audit
for all
using (public.is_admin(auth.uid()));

-- 4) ADMIN_SESSIONS
drop policy if exists "Admins can access admin_sessions" on public.admin_sessions;
create policy "Admins can access admin_sessions"
on public.admin_sessions
for all
using (public.is_admin(auth.uid()));

-- 5) CLIENTS (dedupe two policies into one)
drop policy if exists "Admins can access all clients" on public.clients;
drop policy if exists "Allow admin access to clients" on public.clients;
create policy "Admins can access all clients"
on public.clients
for all
using (public.is_admin(auth.uid()));

-- 6) INVITES
drop policy if exists "Admins can access all invites" on public.invites;
create policy "Admins can access all invites"
on public.invites
for all
using (public.is_admin(auth.uid()));

-- 7) USER_STORE_ROLES
drop policy if exists "Admins can access all user_store_roles" on public.user_store_roles;
create policy "Admins can access all user_store_roles"
on public.user_store_roles
for all
using (public.is_admin(auth.uid()));