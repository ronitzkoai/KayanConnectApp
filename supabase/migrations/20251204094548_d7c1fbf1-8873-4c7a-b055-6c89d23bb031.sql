-- Add bio column to worker_profiles
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add bio column to contractor_profiles
ALTER TABLE public.contractor_profiles ADD COLUMN IF NOT EXISTS bio TEXT;