-- Fix chat RLS policies

-- Drop problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;

-- Create simpler policy for viewing participants
CREATE POLICY "Users can view conversation participants"
ON conversation_participants FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  conversation_id = '00000000-0000-0000-0000-000000000001'
);

-- Add UPDATE policy for conversations table
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

-- Ensure global conversation exists
INSERT INTO conversations (id, created_at, updated_at, last_message_at)
VALUES ('00000000-0000-0000-0000-000000000001', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

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