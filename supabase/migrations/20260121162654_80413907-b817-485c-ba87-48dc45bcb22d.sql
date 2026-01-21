-- Add avatar_url column to profiles table for user profile photos
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text DEFAULT NULL;