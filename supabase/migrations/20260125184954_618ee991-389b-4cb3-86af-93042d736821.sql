-- Drop overly permissive policies
DROP POLICY IF EXISTS "Service can insert credits" ON public.user_credits;
DROP POLICY IF EXISTS "Service can update credits" ON public.user_credits;

-- The service role key bypasses RLS entirely, so we don't need these policies
-- Edge functions using SUPABASE_SERVICE_ROLE_KEY will have full access
-- Only authenticated user policies remain, which are properly secured