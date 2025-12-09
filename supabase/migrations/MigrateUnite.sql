-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create app_role enum (replaces old user_role enum)
CREATE TYPE public.app_role AS ENUM ('contractor', 'worker', 'admin');

-- Create work types enum
CREATE TYPE work_type AS ENUM (
  'backhoe',
  'loader',
  'bobcat',
  'grader',
  'truck_driver',
  'semi_trailer',
  'laborer'
);

-- Create urgency levels enum
CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create job status enum
CREATE TYPE job_status AS ENUM ('open', 'accepted', 'completed', 'cancelled');

-- Create profiles table (no role column - moved to user_roles)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table (multi-role support)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
                                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                                        UNIQUE(user_id)
);

-- Create job requests table
CREATE TABLE public.job_requests (
                                     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                                     contractor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
                                     work_type work_type NOT NULL,
                                     location TEXT NOT NULL,
                                     work_date TIMESTAMP WITH TIME ZONE NOT NULL,
                                     urgency urgency_level DEFAULT 'medium',
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

-- User roles policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own roles during signup"
  ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

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

-- RLS Policies for conversation_participants
CREATE POLICY "Users can view participants in their conversations"
  ON conversation_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join conversations"
  ON conversation_participants
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own participant record"
  ON conversation_participants
  FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for conversation_participants
CREATE POLICY "Users can view participants in their conversations"
  ON conversation_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
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

-- Create function to handle new user (UPDATED for multi-role)
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

-- Enable Realtime for messaging tables
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;

-- Add all existing users to global conversation
INSERT INTO conversation_participants (conversation_id, user_id)
SELECT '00000000-0000-0000-0000-000000000001', id
FROM profiles
ON CONFLICT (conversation_id, user_id) DO NOTHING;