-- Add pix_receipt_url column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pix_receipt_url text;

-- Create bucket for pix receipts (private)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pix-receipts', 'pix-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload their own receipts
CREATE POLICY "Users can upload own pix receipts" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'pix-receipts' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can view their own receipts
CREATE POLICY "Users can view own pix receipts" ON storage.objects
FOR SELECT USING (
  bucket_id = 'pix-receipts' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Admins can view all receipts
CREATE POLICY "Admins can view all pix receipts" ON storage.objects
FOR SELECT USING (
  bucket_id = 'pix-receipts' AND 
  has_role(auth.uid(), 'admin'::app_role)
);