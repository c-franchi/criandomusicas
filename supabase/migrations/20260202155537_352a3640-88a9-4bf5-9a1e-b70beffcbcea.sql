-- Conceder credito preview retroativo para usuarios existentes que nao possuem
INSERT INTO public.user_credits (user_id, plan_id, total_credits, used_credits, is_active)
SELECT 
  u.id,
  'preview_test',
  1,
  0,
  true
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_credits uc 
  WHERE uc.user_id = u.id AND uc.plan_id = 'preview_test'
);