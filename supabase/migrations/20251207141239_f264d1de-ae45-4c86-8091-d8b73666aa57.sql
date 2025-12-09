
-- Add technician/provider specific fields to contractor_profiles for service providers
ALTER TABLE public.contractor_profiles
ADD COLUMN IF NOT EXISTS is_service_provider BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS service_specializations TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS completed_services INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS portfolio_images TEXT[] DEFAULT '{}';

-- Create technician_ratings table for maintenance service ratings
CREATE TABLE IF NOT EXISTS public.technician_ratings (
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

-- Add images field to maintenance_requests
ALTER TABLE public.maintenance_requests
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS manufacturer TEXT,
ADD COLUMN IF NOT EXISTS model TEXT,
ADD COLUMN IF NOT EXISTS serial_number TEXT;

-- Update maintenance_quotes to include more details
ALTER TABLE public.maintenance_quotes
ADD COLUMN IF NOT EXISTS arrival_time TEXT,
ADD COLUMN IF NOT EXISTS details_pdf_url TEXT;
