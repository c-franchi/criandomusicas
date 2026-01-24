-- Add DELETE policy for video_orders table so admins can delete video orders
CREATE POLICY "Admins can delete video orders" 
ON public.video_orders 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Also add DELETE policy for video_order_files for cascade delete
CREATE POLICY "Admins can delete video order files" 
ON public.video_order_files 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);