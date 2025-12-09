-- Create technician_profiles table
CREATE TABLE public.technician_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  specializations TEXT[] DEFAULT '{}'::text[],
  years_experience INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  rating NUMERIC(3,2) DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  portfolio_images TEXT[] DEFAULT '{}'::text[],
  bio TEXT,
  location TEXT,
  completed_services INTEGER DEFAULT 0,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.technician_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view technician profiles"
ON public.technician_profiles FOR SELECT
USING (true);

CREATE POLICY "Technicians can insert own profile"
ON public.technician_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'technician'));

CREATE POLICY "Technicians can update own profile"
ON public.technician_profiles FOR UPDATE
USING (auth.uid() = user_id AND has_role(auth.uid(), 'technician'));

CREATE POLICY "Admin can view all technician profiles"
ON public.technician_profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all technician profiles"
ON public.technician_profiles FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_technician_profiles_updated_at
BEFORE UPDATE ON public.technician_profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();