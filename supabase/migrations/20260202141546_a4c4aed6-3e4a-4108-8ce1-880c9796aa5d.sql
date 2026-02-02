-- 1. Adicionar coluna is_preview na tabela orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_preview BOOLEAN DEFAULT FALSE;

-- 2. Criar funcao para conceder credito preview automaticamente em novos cadastros
CREATE OR REPLACE FUNCTION public.grant_preview_credit()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verificar se usuario ja tem credito preview
  IF NOT EXISTS (
    SELECT 1 FROM user_credits 
    WHERE user_id = NEW.id AND plan_id = 'preview_test'
  ) THEN
    INSERT INTO user_credits (user_id, plan_id, total_credits, is_active)
    VALUES (NEW.id, 'preview_test', 1, true);
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Criar trigger para novos usuarios (apenas novos cadastros a partir de agora)
DROP TRIGGER IF EXISTS on_auth_user_created_grant_preview ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_preview
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_preview_credit();