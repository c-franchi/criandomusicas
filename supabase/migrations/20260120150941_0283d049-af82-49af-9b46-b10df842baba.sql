-- Create function to auto-assign admin role for specific email
CREATE OR REPLACE FUNCTION public.handle_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user email is in admin list
  IF NEW.email = 'neizao.franchi@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for auto admin assignment
DROP TRIGGER IF EXISTS on_auth_user_admin ON auth.users;
CREATE TRIGGER on_auth_user_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_admin_role();