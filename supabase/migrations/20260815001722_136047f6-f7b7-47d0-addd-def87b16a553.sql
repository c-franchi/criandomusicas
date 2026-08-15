DROP TRIGGER IF EXISTS on_auth_user_created_grant_preview ON auth.users;
DROP FUNCTION IF EXISTS public.grant_preview_credit();
UPDATE public.user_credits SET is_active = false WHERE plan_id = 'preview_test' AND used_credits < total_credits;