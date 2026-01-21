-- Add RLS policy for admins to delete orders
CREATE POLICY "Admins can delete orders" 
ON public.orders 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add RLS policy for admins to update orders
CREATE POLICY "Admins can update orders" 
ON public.orders 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));