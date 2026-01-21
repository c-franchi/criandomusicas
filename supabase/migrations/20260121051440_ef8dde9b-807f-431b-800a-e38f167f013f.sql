-- Permitir admins visualizar todas as tracks
CREATE POLICY "Admins can view all tracks"
  ON public.tracks
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Permitir admins criar tracks para qualquer pedido
CREATE POLICY "Admins can create tracks"
  ON public.tracks
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Permitir admins atualizar qualquer track
CREATE POLICY "Admins can update tracks"
  ON public.tracks
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Permitir admins excluir tracks
CREATE POLICY "Admins can delete tracks"
  ON public.tracks
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));