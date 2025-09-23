-- Fix remaining functions that might not have proper search_path set
-- This should resolve the remaining security linter warnings

-- Update functions to ensure they have proper search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END $function$;