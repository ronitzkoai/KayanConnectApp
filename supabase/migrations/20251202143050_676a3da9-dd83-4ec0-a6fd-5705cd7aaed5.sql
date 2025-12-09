-- Create contractor_profiles table
CREATE TABLE public.contractor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  license_type text,
  license_number text,
  specializations text[] DEFAULT '{}',
  years_experience integer DEFAULT 0,
  company_name text,
  service_areas text[] DEFAULT '{}',
  is_verified boolean DEFAULT false,
  rating numeric DEFAULT 0,
  total_ratings integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create customer_profiles table
CREATE TABLE public.customer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  city text,
  address text,
  project_description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add new columns to worker_profiles
ALTER TABLE public.worker_profiles 
ADD COLUMN IF NOT EXISTS owned_equipment text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS equipment_skills text[] DEFAULT '{}';

-- Enable RLS on new tables
ALTER TABLE public.contractor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for contractor_profiles
CREATE POLICY "Anyone can view contractor profiles"
ON public.contractor_profiles FOR SELECT
USING (true);

CREATE POLICY "Contractors can insert own profile"
ON public.contractor_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'contractor'::app_role));

CREATE POLICY "Contractors can update own profile"
ON public.contractor_profiles FOR UPDATE
USING (auth.uid() = user_id AND has_role(auth.uid(), 'contractor'::app_role));

-- RLS policies for customer_profiles
CREATE POLICY "Anyone can view customer profiles"
ON public.customer_profiles FOR SELECT
USING (true);

CREATE POLICY "Customers can insert own profile"
ON public.customer_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'customer'::app_role));

CREATE POLICY "Customers can update own profile"
ON public.customer_profiles FOR UPDATE
USING (auth.uid() = user_id AND has_role(auth.uid(), 'customer'::app_role));

-- Add triggers for updated_at
CREATE TRIGGER update_contractor_profiles_updated_at
BEFORE UPDATE ON public.contractor_profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_customer_profiles_updated_at
BEFORE UPDATE ON public.customer_profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();