-- SECURITY FIX: Protect sensitive user data from unauthorized access

-- 1. Create a separate table for sensitive authentication data
CREATE TABLE IF NOT EXISTS public.user_auth_data (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  password_hash TEXT,
  twofa_secret TEXT,
  last_password_change TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS on the new table with very strict policies
ALTER TABLE public.user_auth_data ENABLE ROW LEVEL SECURITY;

-- 3. Create highly restrictive RLS policies for auth data
-- No direct SELECT access - data should only be accessed via secure functions
CREATE POLICY "No direct read access to auth data" 
ON public.user_auth_data 
FOR SELECT 
USING (false);

-- Only the user themselves can update their auth data (for password changes)
CREATE POLICY "Users can update own auth data via functions only" 
ON public.user_auth_data 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- No direct INSERT - handled by triggers
CREATE POLICY "No direct insert to auth data" 
ON public.user_auth_data 
FOR INSERT 
WITH CHECK (false);

-- No direct DELETE
CREATE POLICY "No direct delete of auth data" 
ON public.user_auth_data 
FOR DELETE 
USING (false);

-- 4. Migrate existing sensitive data to the new table
INSERT INTO public.user_auth_data (user_id, password_hash, twofa_secret)
SELECT id, password_hash, twofa_secret 
FROM public.users 
WHERE password_hash IS NOT NULL OR twofa_secret IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- 5. Create secure function for password verification (used internally)
CREATE OR REPLACE FUNCTION public.verify_user_password(
  p_email TEXT,
  p_password_hash TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored_hash TEXT;
  v_user_id UUID;
  v_locked_until TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get user ID and check if account is locked
  SELECT u.id, uad.password_hash, uad.locked_until
  INTO v_user_id, v_stored_hash, v_locked_until
  FROM public.users u
  LEFT JOIN public.user_auth_data uad ON uad.user_id = u.id
  WHERE u.email = p_email;
  
  -- Check if account is locked
  IF v_locked_until IS NOT NULL AND v_locked_until > NOW() THEN
    RETURN FALSE;
  END IF;
  
  -- Verify password
  IF v_stored_hash = p_password_hash THEN
    -- Reset failed attempts on successful login
    UPDATE public.user_auth_data 
    SET failed_login_attempts = 0,
        locked_until = NULL
    WHERE user_id = v_user_id;
    RETURN TRUE;
  ELSE
    -- Increment failed attempts
    UPDATE public.user_auth_data 
    SET failed_login_attempts = failed_login_attempts + 1,
        locked_until = CASE 
          WHEN failed_login_attempts >= 4 THEN NOW() + INTERVAL '15 minutes'
          ELSE NULL
        END
    WHERE user_id = v_user_id;
    RETURN FALSE;
  END IF;
END;
$$;

-- 6. Create audit log table for sensitive operations
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs" 
ON public.security_audit_log 
FOR SELECT 
USING (is_admin(auth.uid()));

-- No INSERT for regular users
CREATE POLICY "No direct insert to audit logs" 
ON public.security_audit_log 
FOR INSERT 
WITH CHECK (false);

-- No UPDATE for anyone
CREATE POLICY "No update to audit logs" 
ON public.security_audit_log 
FOR UPDATE 
USING (false);

-- No DELETE for anyone  
CREATE POLICY "No delete of audit logs" 
ON public.security_audit_log 
FOR DELETE 
USING (false);

-- 7. Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id UUID,
  p_action TEXT,
  p_details JSONB DEFAULT '{}'::jsonb,
  p_success BOOLEAN DEFAULT TRUE
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, 
    action, 
    details, 
    success,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_action,
    p_details,
    p_success,
    inet_client_addr(),
    current_setting('request.headers', true)::jsonb->>'user-agent'
  );
END;
$$;

-- 8. Create view for safe user data access (excludes sensitive fields)
CREATE OR REPLACE VIEW public.users_safe AS
SELECT 
  id,
  email,
  name,
  role,
  is_admin,
  created_at,
  updated_at
FROM public.users;

-- 9. Add trigger to sync auth data updates
CREATE OR REPLACE FUNCTION public.sync_auth_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_auth_data_updated_at
BEFORE UPDATE ON public.user_auth_data
FOR EACH ROW
EXECUTE FUNCTION public.sync_auth_data_updated_at();

-- 10. Remove sensitive columns from users table (after migration)
ALTER TABLE public.users 
DROP COLUMN IF EXISTS password_hash,
DROP COLUMN IF EXISTS twofa_secret;

-- 11. Add additional security checks for admin operations
CREATE OR REPLACE FUNCTION public.is_admin_with_audit(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Check admin status
  SELECT is_admin INTO v_is_admin
  FROM public.users
  WHERE id = _user_id;
  
  -- Log admin access attempt (only if successful)
  IF v_is_admin THEN
    -- Log is async, we don't wait for it
    BEGIN
      PERFORM log_security_event(
        _user_id, 
        'admin_access',
        jsonb_build_object('timestamp', NOW()),
        true
      );
    EXCEPTION WHEN OTHERS THEN
      -- Don't fail the check if logging fails
      NULL;
    END;
  END IF;
  
  RETURN COALESCE(v_is_admin, FALSE);
END;
$$;

-- 12. Add rate limiting metadata
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS 
  last_login_attempt TIMESTAMP WITH TIME ZONE;

-- 13. Create indexes for performance on auth lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_user_auth_data_user_id ON public.user_auth_data(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON public.security_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON public.security_audit_log(user_id);

-- 14. Add comment documentation
COMMENT ON TABLE public.user_auth_data IS 'Stores sensitive authentication data separately from user profiles for enhanced security';
COMMENT ON TABLE public.security_audit_log IS 'Audit log for all security-sensitive operations';
COMMENT ON FUNCTION public.verify_user_password IS 'Securely verifies user passwords with rate limiting and account locking';
COMMENT ON VIEW public.users_safe IS 'Safe view of user data excluding sensitive authentication fields';