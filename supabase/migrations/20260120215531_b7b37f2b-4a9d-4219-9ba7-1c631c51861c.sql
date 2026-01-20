-- Add new payment status value
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'AWAITING_PIX';

-- Add payment_method column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT NULL;