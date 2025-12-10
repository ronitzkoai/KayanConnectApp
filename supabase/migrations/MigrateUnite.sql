-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create app_role enum (replaces old user_role enum)
CREATE TYPE public.app_role AS ENUM ('contractor', 'worker', 'admin', 'customer', 'technician');

-- Create work types enum
CREATE TYPE work_type AS ENUM (
  'backhoe',
  'loader',
  'bobcat',
  'grader',
  'truck_driver',
  'semi_trailer',
  'laborer',
  'mini_excavator',
  'excavator',
  'mini_backhoe',
  'wheeled_backhoe',
  'telescopic_loader',
  'full_trailer',
  'bathtub',
  'double',
  'flatbed'
);

-- Create urgency levels enum
CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create job status enum
CREATE TYPE job_status AS ENUM ('open', 'accepted', 'completed', 'cancelled');

-- Create service type enum
CREATE TYPE service_type AS ENUM ('operator_with_equipment', 'equipment_only', 'operator_only');

-- Create enum for fuel type
CREATE TYPE public.fuel_type AS ENUM ('diesel', 'gasoline');

-- Create enum for fuel order status
CREATE TYPE public.fuel_order_status AS ENUM ('pending', 'confirmed', 'delivered', 'cancelled');

-- Create enum for maintenance type
CREATE TYPE public.maintenance_type AS ENUM ('oil_change', 'tire_change', 'filter_change', 'general_service', 'repair');

-- Create enum for maintenance status
CREATE TYPE public.maintenance_status AS ENUM ('scheduled', 'in_progress', 'completed', 'overdue');

-- Create profiles table (no role column - moved to user_roles)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table (multi-role support)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create worker profiles table
CREATE TABLE public.worker_profiles (
                                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                                        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
                                        work_type work_type NOT NULL,
                                        experience_years INTEGER DEFAULT 0,
                                        location TEXT,
                                        is_available BOOLEAN DEFAULT true,
                                        is_verified BOOLEAN DEFAULT false,
                                        rating DECIMAL(3,2) DEFAULT 0,
                                        total_ratings INTEGER DEFAULT 0,
                                        owned_equipment TEXT[] DEFAULT '{}',
                                        equipment_skills TEXT[] DEFAULT '{}',
                                        bio TEXT,
                                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                                        UNIQUE(user_id)
);

-- Create contractor profiles table
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
  bio TEXT,
  is_service_provider BOOLEAN DEFAULT false,
  service_specializations TEXT[] DEFAULT '{}',
  completed_services INTEGER DEFAULT 0,
  portfolio_images TEXT[] DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create customer profiles table
CREATE TABLE public.customer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  city text,
  address text,
  project_description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create fuel_orders table
CREATE TABLE public.fuel_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fuel_type fuel_type NOT NULL DEFAULT 'diesel',
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  equipment_type TEXT,
  equipment_name TEXT,
  location TEXT NOT NULL,
  delivery_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status fuel_order_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create equipment_maintenance table
CREATE TABLE public.equipment_maintenance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  equipment_type TEXT NOT NULL,
  equipment_name TEXT,
  maintenance_type maintenance_type NOT NULL,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_date TIMESTAMP WITH TIME ZONE,
  status maintenance_status NOT NULL DEFAULT 'scheduled',
  cost NUMERIC,
  notes TEXT,
  mileage_hours INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'trial',
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create job requests table
CREATE TABLE public.job_requests (
                                     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                                     contractor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
                                     work_type work_type NOT NULL,
                                     location TEXT NOT NULL,
                                     work_date TIMESTAMP WITH TIME ZONE NOT NULL,
                                     urgency urgency_level DEFAULT 'medium',
                                     service_type service_type DEFAULT 'operator_with_equipment' NOT NULL,
                                     notes TEXT,
                                     status job_status DEFAULT 'open',
                                     accepted_by UUID REFERENCES public.worker_profiles(id) ON DELETE SET NULL,
                                     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                                     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ratings table
CREATE TABLE public.ratings (
                                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                                job_id UUID NOT NULL REFERENCES public.job_requests(id) ON DELETE CASCADE,
                                contractor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
                                worker_id UUID NOT NULL REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
                                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                                review TEXT,
                                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                                UNIQUE(job_id)
);

-- Create conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_read_at TIMESTAMPTZ,
  UNIQUE(conversation_id, user_id)
);

-- Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_read BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Enable RLS on messaging tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
                                    USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
                                    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admin oversight
CREATE POLICY "Admin can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own roles during signup"
  ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin oversight
CREATE POLICY "Admin can view all user roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Worker profiles policies
CREATE POLICY "Anyone can view worker profiles"
  ON public.worker_profiles FOR SELECT
                                                  USING (true);

CREATE POLICY "Workers can update own profile"
  ON public.worker_profiles FOR UPDATE
  USING (
    auth.uid() = user_id
    AND public.has_role(auth.uid(), 'worker')
  );

CREATE POLICY "Workers can insert own profile"
  ON public.worker_profiles FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.has_role(auth.uid(), 'worker')
  );

-- Admin oversight
CREATE POLICY "Admin can view all worker profiles"
ON public.worker_profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all worker profiles"
ON public.worker_profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Contractor profiles policies
CREATE POLICY "Anyone can view contractor profiles"
ON public.contractor_profiles FOR SELECT
USING (true);

CREATE POLICY "Contractors can insert own profile"
ON public.contractor_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'contractor'::app_role));

CREATE POLICY "Contractors can update own profile"
ON public.contractor_profiles FOR UPDATE
USING (auth.uid() = user_id AND has_role(auth.uid(), 'contractor'::app_role));

-- Admin oversight
CREATE POLICY "Admin can view all contractor profiles"
ON public.contractor_profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all contractor profiles"
ON public.contractor_profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Customer profiles policies
CREATE POLICY "Anyone can view customer profiles"
ON public.customer_profiles FOR SELECT
USING (true);

CREATE POLICY "Customers can insert own profile"
ON public.customer_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'customer'::app_role));

CREATE POLICY "Customers can update own profile"
ON public.customer_profiles FOR UPDATE
USING (auth.uid() = user_id AND has_role(auth.uid(), 'customer'::app_role));

-- Admin oversight
CREATE POLICY "Admin can view all customer profiles"
ON public.customer_profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all customer profiles"
ON public.customer_profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create technician_profiles table for maintenance service providers
CREATE TABLE public.technician_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- RLS Policies for technician_profiles
CREATE POLICY "Anyone can view technician profiles"
ON public.technician_profiles
FOR SELECT
USING (true);

CREATE POLICY "Technicians can insert their own profile"
ON public.technician_profiles
FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  public.has_role(auth.uid(), 'technician')
);

CREATE POLICY "Technicians can update their own profile"
ON public.technician_profiles
FOR UPDATE
USING (user_id = auth.uid());

-- Admin oversight
CREATE POLICY "Admin can view all technician profiles"
ON public.technician_profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all technician profiles"
ON public.technician_profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Add updated_at trigger for technician_profiles
CREATE TRIGGER update_technician_profiles_updated_at
  BEFORE UPDATE ON public.technician_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- RLS policies for fuel_orders
CREATE POLICY "Contractors can view their fuel orders"
ON public.fuel_orders FOR SELECT
USING (contractor_id = auth.uid());

CREATE POLICY "Contractors can create fuel orders"
ON public.fuel_orders FOR INSERT
WITH CHECK (contractor_id = auth.uid() AND has_role(auth.uid(), 'contractor'::app_role));

CREATE POLICY "Contractors can update their fuel orders"
ON public.fuel_orders FOR UPDATE
USING (contractor_id = auth.uid());

CREATE POLICY "Contractors can delete their fuel orders"
ON public.fuel_orders FOR DELETE
USING (contractor_id = auth.uid());

-- Admin oversight
CREATE POLICY "Admin can view all fuel orders"
ON public.fuel_orders
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all fuel orders"
ON public.fuel_orders
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete fuel orders"
ON public.fuel_orders
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for equipment_maintenance
CREATE POLICY "Contractors can view their maintenance records"
ON public.equipment_maintenance FOR SELECT
USING (contractor_id = auth.uid());

CREATE POLICY "Contractors can create maintenance records"
ON public.equipment_maintenance FOR INSERT
WITH CHECK (contractor_id = auth.uid() AND has_role(auth.uid(), 'contractor'::app_role));

CREATE POLICY "Contractors can update their maintenance records"
ON public.equipment_maintenance FOR UPDATE
USING (contractor_id = auth.uid());

CREATE POLICY "Contractors can delete their maintenance records"
ON public.equipment_maintenance FOR DELETE
USING (contractor_id = auth.uid());

-- Create maintenance_requests table
CREATE TABLE public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL,
  equipment_type TEXT NOT NULL,
  equipment_name TEXT,
  maintenance_type TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  preferred_date TIMESTAMP WITH TIME ZONE,
  urgency TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  budget_range TEXT,
  images TEXT[] DEFAULT '{}',
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for maintenance_requests
CREATE POLICY "Anyone can view open maintenance requests"
ON maintenance_requests FOR SELECT
TO authenticated
USING (status = 'open' OR contractor_id = auth.uid());

CREATE POLICY "Contractors can create maintenance requests"
ON maintenance_requests FOR INSERT
TO authenticated
WITH CHECK (contractor_id = auth.uid() AND has_role(auth.uid(), 'contractor'));

CREATE POLICY "Contractors can update their requests"
ON maintenance_requests FOR UPDATE
TO authenticated
USING (contractor_id = auth.uid());

CREATE POLICY "Contractors can delete their requests"
ON maintenance_requests FOR DELETE
TO authenticated
USING (contractor_id = auth.uid());

-- Admin oversight
CREATE POLICY "Admin can view all maintenance requests"
ON public.maintenance_requests
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all maintenance requests"
ON public.maintenance_requests
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create maintenance_quotes table
CREATE TABLE public.maintenance_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL,
  price NUMERIC NOT NULL,
  estimated_duration TEXT,
  description TEXT,
  availability TEXT,
  status TEXT DEFAULT 'pending',
  arrival_time TEXT,
  details_pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.maintenance_quotes ENABLE ROW LEVEL SECURITY;

-- RLS policies for maintenance_quotes
CREATE POLICY "Request owners can view quotes"
ON maintenance_quotes FOR SELECT
TO authenticated
USING (
  provider_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM maintenance_requests mr
    WHERE mr.id = maintenance_quotes.request_id
    AND mr.contractor_id = auth.uid()
  )
);

CREATE POLICY "Users can submit quotes"
ON maintenance_quotes FOR INSERT
TO authenticated
WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Providers can update their quotes"
ON maintenance_quotes FOR UPDATE
TO authenticated
USING (provider_id = auth.uid());

CREATE POLICY "Request owners can update quote status"
ON maintenance_quotes FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM maintenance_requests mr
    WHERE mr.id = maintenance_quotes.request_id
    AND mr.contractor_id = auth.uid()
  )
);

CREATE POLICY "Providers can delete their pending quotes"
ON maintenance_quotes FOR DELETE
TO authenticated
USING (provider_id = auth.uid() AND status = 'pending');

-- Admin oversight
CREATE POLICY "Admin can view all maintenance quotes"
ON public.maintenance_quotes
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create technician_ratings table for maintenance service ratings
CREATE TABLE public.technician_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL,
  contractor_id UUID NOT NULL,
  quote_id UUID REFERENCES public.maintenance_quotes(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.technician_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for technician_ratings
CREATE POLICY "Anyone can view technician ratings"
ON public.technician_ratings
FOR SELECT
USING (true);

CREATE POLICY "Contractors can create ratings for their requests"
ON public.technician_ratings
FOR INSERT
WITH CHECK (
  contractor_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.maintenance_requests
    WHERE id = request_id AND contractor_id = auth.uid()
  )
);

-- Users can view their own subscription
CREATE POLICY "Users can view their own subscription"
ON public.subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own subscription
CREATE POLICY "Users can create their own subscription"
ON public.subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscription
CREATE POLICY "Users can update their own subscription"
ON public.subscriptions
FOR UPDATE
USING (auth.uid() = user_id);

-- Admin oversight
CREATE POLICY "Admin can view all subscriptions"
ON public.subscriptions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all subscriptions"
ON public.subscriptions
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Job requests policies
CREATE POLICY "Anyone can view job requests"
  ON public.job_requests FOR SELECT
                                               USING (true);

CREATE POLICY "Contractors can create job requests"
  ON public.job_requests FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'contractor')
  );

CREATE POLICY "Contractors can update own job requests"
  ON public.job_requests FOR UPDATE
  USING (
    auth.uid() = contractor_id
    AND public.has_role(auth.uid(), 'contractor')
  );

CREATE POLICY "Workers can update job requests to accept"
  ON public.job_requests FOR UPDATE
                                        USING (status = 'open');

CREATE POLICY "Workers can complete their accepted jobs"
ON job_requests FOR UPDATE
USING (
  status = 'accepted'::job_status
  AND accepted_by IN (
    SELECT id FROM worker_profiles WHERE user_id = auth.uid()
  )
  AND has_role(auth.uid(), 'worker'::app_role)
);

-- Admin oversight
CREATE POLICY "Admin can view all job requests"
ON public.job_requests
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all job requests"
ON public.job_requests
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete job requests"
ON public.job_requests
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Ratings policies
CREATE POLICY "Anyone can view ratings"
  ON public.ratings FOR SELECT
                                   USING (true);

CREATE POLICY "Contractors can create ratings"
  ON public.ratings FOR INSERT
  WITH CHECK (
    auth.uid() = contractor_id
    AND public.has_role(auth.uid(), 'contractor')
    AND EXISTS (
      SELECT 1 FROM job_requests
      WHERE job_requests.id = ratings.job_id
      AND job_requests.contractor_id = auth.uid()
      AND job_requests.status = 'completed'
    )
  );

-- Admin oversight
CREATE POLICY "Admin can view all ratings"
ON public.ratings
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for conversations
CREATE POLICY "Users can view their own conversations"
  ON conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations"
  ON conversations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Participants can update conversation"
ON conversations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversations.id
    AND cp.user_id = auth.uid()
  )
);

-- RLS Policies for conversation_participants
CREATE POLICY "Users can view conversation participants"
ON conversation_participants FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  conversation_id = '00000000-0000-0000-0000-000000000001'
);

CREATE POLICY "Users can join conversations"
  ON conversation_participants
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own participant record"
  ON conversation_participants
  FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations"
  ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages"
  ON messages
  FOR UPDATE
  USING (sender_id = auth.uid());

-- Create message_reactions table for emoji reactions
CREATE TABLE public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_reactions
CREATE POLICY "Users can view reactions on messages in their conversations"
ON public.message_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_reactions.message_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add reactions to messages in their conversations"
ON public.message_reactions FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_reactions.message_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can remove their own reactions"
ON public.message_reactions FOR DELETE
USING (user_id = auth.uid());

-- Create notification_preferences table
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  push_enabled BOOLEAN DEFAULT true,
  personal_messages BOOLEAN DEFAULT true,
  general_chat BOOLEAN DEFAULT false,
  job_updates BOOLEAN DEFAULT true,
  maintenance_updates BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_preferences
CREATE POLICY "Users can view their own notification preferences"
ON public.notification_preferences FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own notification preferences"
ON public.notification_preferences FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own notification preferences"
ON public.notification_preferences FOR UPDATE
USING (user_id = auth.uid());

INSERT INTO conversations (id, created_at, updated_at, last_message_at)
VALUES ('00000000-0000-0000-0000-000000000001', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Function to add new users to global conversation
CREATE OR REPLACE FUNCTION public.add_user_to_global_chat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add user to global conversation
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES ('00000000-0000-0000-0000-000000000001', NEW.id)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-add users to global chat when profile is created
CREATE TRIGGER on_profile_created_add_to_global_chat
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.add_user_to_global_chat();

-- Create role checking function (NEW)
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

-- Create function to handle new user (UPDATED for multirole)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Get role from metadata and cast to app_role
  user_role := (NEW.raw_user_meta_data->>'role')::app_role;

  -- Insert into profiles (without role column)
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone'
  );

  -- Insert into user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);

  RETURN NEW;
END;
$$;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update worker rating (SECURED with search_path)
CREATE OR REPLACE FUNCTION public.update_worker_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.worker_profiles
  SET
    rating = (
      SELECT AVG(rating)::DECIMAL(3,2)
      FROM public.ratings
      WHERE worker_id = NEW.worker_id
    ),
    total_ratings = (
      SELECT COUNT(*)
      FROM public.ratings
      WHERE worker_id = NEW.worker_id
    ),
    updated_at = NOW()
  WHERE id = NEW.worker_id;
  RETURN NEW;
END;
$$;

-- Create trigger for rating updates
CREATE TRIGGER on_rating_created
    AFTER INSERT ON public.ratings
    FOR EACH ROW EXECUTE FUNCTION public.update_worker_rating();

-- Create updated_at trigger function (with search_path for best practices)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER set_updated_at_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_worker_profiles
    BEFORE UPDATE ON public.worker_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_job_requests
    BEFORE UPDATE ON public.job_requests
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_contractor_profiles_updated_at
BEFORE UPDATE ON public.contractor_profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_customer_profiles_updated_at
BEFORE UPDATE ON public.customer_profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_fuel_orders_updated_at
BEFORE UPDATE ON public.fuel_orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_equipment_maintenance_updated_at
BEFORE UPDATE ON public.equipment_maintenance
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_maintenance_requests_updated_at
BEFORE UPDATE ON public.maintenance_requests
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Realtime for messaging tables
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;

-- Add all existing users to global conversation
INSERT INTO conversation_participants (conversation_id, user_id)
SELECT '00000000-0000-0000-0000-000000000001', id
FROM profiles
ON CONFLICT (conversation_id, user_id) DO NOTHING;

-- ============================================================================
-- EQUIPMENT MARKETPLACE AND RENTALS TABLES MIGRATION
-- ============================================================================
-- This migration adds two new tables for equipment trading and rental
-- functionality, following the established patterns in MigrateUnite.sql
-- Added: 2025-12-10
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE CREATION
-- ----------------------------------------------------------------------------

-- Create equipment_marketplace table
CREATE TABLE public.equipment_marketplace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  equipment_type work_type NOT NULL,
  brand TEXT,
  model TEXT,
  year INTEGER,
  price NUMERIC NOT NULL CHECK (price > 0),
  condition TEXT,
  hours_used INTEGER CHECK (hours_used >= 0),
  location TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  is_sold BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create equipment_rentals table
CREATE TABLE public.equipment_rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  renter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  equipment_type work_type NOT NULL,
  brand TEXT,
  model TEXT,
  year INTEGER,
  daily_rate NUMERIC NOT NULL CHECK (daily_rate > 0),
  weekly_rate NUMERIC CHECK (weekly_rate >= 0),
  monthly_rate NUMERIC CHECK (monthly_rate >= 0),
  location TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- ENABLE ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

ALTER TABLE public.equipment_marketplace ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_rentals ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RLS POLICIES: EQUIPMENT_MARKETPLACE
-- ----------------------------------------------------------------------------

-- SELECT Policy: Users see items that are available, or they own/bought
CREATE POLICY "Users can view available marketplace items or their own listings"
ON public.equipment_marketplace
FOR SELECT
TO authenticated
USING (
  is_sold = false
  OR seller_id = auth.uid()
  OR buyer_id = auth.uid()
);

-- INSERT Policy: All authenticated users can create listings as themselves
CREATE POLICY "All users can create marketplace listings"
ON public.equipment_marketplace
FOR INSERT
TO authenticated
WITH CHECK (seller_id = auth.uid());

-- UPDATE Policy: Users can only update their own listings
CREATE POLICY "Users can update their own marketplace listings"
ON public.equipment_marketplace
FOR UPDATE
TO authenticated
USING (seller_id = auth.uid())
WITH CHECK (seller_id = auth.uid());

-- DELETE Policy: Users can only delete their own listings
CREATE POLICY "Users can delete their own marketplace listings"
ON public.equipment_marketplace
FOR DELETE
TO authenticated
USING (seller_id = auth.uid());

-- Admin oversight: SELECT
CREATE POLICY "Admin can view all marketplace listings"
ON public.equipment_marketplace
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admin oversight: UPDATE
CREATE POLICY "Admin can update all marketplace listings"
ON public.equipment_marketplace
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Admin oversight: DELETE
CREATE POLICY "Admin can delete marketplace listings"
ON public.equipment_marketplace
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- ----------------------------------------------------------------------------
-- RLS POLICIES: EQUIPMENT_RENTALS
-- ----------------------------------------------------------------------------

-- SELECT Policy: Users see items that are available, or they own/rent
CREATE POLICY "Users can view available rental items or their own listings"
ON public.equipment_rentals
FOR SELECT
TO authenticated
USING (
  is_available = true
  OR owner_id = auth.uid()
  OR renter_id = auth.uid()
);

-- INSERT Policy: All authenticated users can create listings as themselves
CREATE POLICY "All users can create rental listings"
ON public.equipment_rentals
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- UPDATE Policy: Users can only update their own listings
CREATE POLICY "Users can update their own rental listings"
ON public.equipment_rentals
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- DELETE Policy: Users can only delete their own listings
CREATE POLICY "Users can delete their own rental listings"
ON public.equipment_rentals
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- Admin oversight: SELECT
CREATE POLICY "Admin can view all rental listings"
ON public.equipment_rentals
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admin oversight: UPDATE
CREATE POLICY "Admin can update all rental listings"
ON public.equipment_rentals
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Admin oversight: DELETE
CREATE POLICY "Admin can delete rental listings"
ON public.equipment_rentals
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- ----------------------------------------------------------------------------
-- TRIGGERS: UPDATED_AT TIMESTAMP MANAGEMENT
-- ----------------------------------------------------------------------------

-- Add updated_at trigger for equipment_marketplace
CREATE TRIGGER update_equipment_marketplace_updated_at
BEFORE UPDATE ON public.equipment_marketplace
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add updated_at trigger for equipment_rentals
CREATE TRIGGER update_equipment_rentals_updated_at
BEFORE UPDATE ON public.equipment_rentals
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- STORAGE BUCKET FOR EQUIPMENT IMAGES
-- ----------------------------------------------------------------------------

-- Create storage bucket for equipment images
INSERT INTO storage.buckets (id, name, public)
VALUES ('equipment-images', 'equipment-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for equipment images
CREATE POLICY "Equipment images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'equipment-images');

CREATE POLICY "Authenticated users can upload equipment images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'equipment-images');

CREATE POLICY "Users can update their equipment images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'equipment-images');

CREATE POLICY "Users can delete their equipment images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'equipment-images');

-- ----------------------------------------------------------------------------
-- REALTIME PUBLICATION (OPTIONAL)
-- ----------------------------------------------------------------------------

-- Enable realtime for equipment marketplace (useful for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.equipment_marketplace;

-- Enable realtime for equipment rentals (useful for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.equipment_rentals;