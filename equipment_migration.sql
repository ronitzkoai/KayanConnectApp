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