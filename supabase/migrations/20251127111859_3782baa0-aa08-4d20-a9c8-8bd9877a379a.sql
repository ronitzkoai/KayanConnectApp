-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('contractor', 'worker', 'admin');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Migrate existing roles from profiles to user_roles (convert via text)
INSERT INTO public.user_roles (user_id, role)
SELECT id, (role::text)::app_role FROM public.profiles;

-- Drop old policies that depend on profiles.role
DROP POLICY IF EXISTS "Contractors can create job requests" ON public.job_requests;
DROP POLICY IF EXISTS "Workers can insert own profile" ON public.worker_profiles;

-- Drop the role column from profiles
ALTER TABLE public.profiles DROP COLUMN role;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own roles during signup"
ON public.user_roles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create new policies using has_role function
CREATE POLICY "Contractors can create job requests"
ON public.job_requests
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'contractor'));

DROP POLICY IF EXISTS "Contractors can update own job requests" ON public.job_requests;
CREATE POLICY "Contractors can update own job requests"
ON public.job_requests
FOR UPDATE
USING (auth.uid() = contractor_id AND public.has_role(auth.uid(), 'contractor'));

-- Update worker_profiles policies
CREATE POLICY "Workers can insert own profile"
ON public.worker_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'worker'));

DROP POLICY IF EXISTS "Workers can update own profile" ON public.worker_profiles;
CREATE POLICY "Workers can update own profile"
ON public.worker_profiles
FOR UPDATE
USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'worker'));

-- Update ratings policies
DROP POLICY IF EXISTS "Contractors can create ratings" ON public.ratings;
CREATE POLICY "Contractors can create ratings"
ON public.ratings
FOR INSERT
WITH CHECK (
  auth.uid() = contractor_id AND 
  public.has_role(auth.uid(), 'contractor') AND
  EXISTS (
    SELECT 1 FROM job_requests
    WHERE job_requests.id = ratings.job_id
    AND job_requests.contractor_id = auth.uid()
    AND job_requests.status = 'completed'
  )
);

-- Update handle_new_user function to use user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Get role from metadata and cast to app_role
  user_role := (NEW.raw_user_meta_data->>'role')::app_role;
  
  -- Insert into profiles (without role)
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone'
  );
  
  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$$;