DROP POLICY IF EXISTS "Anyone can view pix config" ON public.pix_config;
CREATE POLICY "Signed-in users view active pix config" ON public.pix_config FOR SELECT TO authenticated
USING (is_active = true OR public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Anyone can view pricing" ON public.pricing_config;
CREATE POLICY "Anyone can view active pricing" ON public.pricing_config FOR SELECT TO anon, authenticated
USING (is_active = true OR public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Read gift operation" ON public.gift_operations;
CREATE POLICY "Read gift operation" ON public.gift_operations FOR SELECT TO anon, authenticated
USING (id = true);

DROP POLICY IF EXISTS "Anyone can insert analytics" ON public.share_analytics;
CREATE POLICY "Insert own or anonymous analytics" ON public.share_analytics FOR INSERT TO anon, authenticated
WITH CHECK (
  (user_id IS NULL OR user_id = (select auth.uid()))
  AND length(event_type) BETWEEN 1 AND 64
);

DROP POLICY IF EXISTS "Users can upload their own covers" ON storage.objects;
CREATE POLICY "Users can upload their own covers" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'covers' AND (
    (storage.foldername(name))[1] = (select auth.uid())::text
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.user_id = (select auth.uid())
      AND ((storage.foldername(name))[1] = o.id::text OR name LIKE 'custom-' || o.id::text || '-%'))
  )
);