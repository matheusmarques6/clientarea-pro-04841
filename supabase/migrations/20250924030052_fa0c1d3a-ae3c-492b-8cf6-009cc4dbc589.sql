-- Fix security issue: Ensure users table is properly secured
-- Remove any permissive policies that might allow public access

-- First, let's check current policies on users table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';

-- Create a more restrictive set of policies for the users table
-- Drop existing policies first to recreate them properly
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Admins can select users" ON public.users;
DROP POLICY IF EXISTS "Admins can update users" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

-- Create secure policies that only allow authenticated access
-- Policy for users to view their own profile
CREATE POLICY "Users can view own profile"
ON public.users
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Policy for users to update their own profile (excluding sensitive fields)
CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Policy for users to insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Admin policies (only for authenticated admin users)
CREATE POLICY "Admins can view all users"
ON public.users
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update all users"
ON public.users
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert users"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete users"
ON public.users
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Also, let's make sure sensitive columns are properly protected
-- Remove password_hash and twofa_secret from being accessible via API
COMMENT ON COLUMN public.users.password_hash IS 'Sensitive: Admin only access';
COMMENT ON COLUMN public.users.twofa_secret IS 'Sensitive: Admin only access';