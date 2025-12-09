-- Create enum for fuel type
CREATE TYPE public.fuel_type AS ENUM ('diesel', 'gasoline');

-- Create enum for fuel order status
CREATE TYPE public.fuel_order_status AS ENUM ('pending', 'confirmed', 'delivered', 'cancelled');

-- Create enum for maintenance type
CREATE TYPE public.maintenance_type AS ENUM ('oil_change', 'tire_change', 'filter_change', 'general_service', 'repair');

-- Create enum for maintenance status
CREATE TYPE public.maintenance_status AS ENUM ('scheduled', 'in_progress', 'completed', 'overdue');

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

-- Enable RLS
ALTER TABLE public.fuel_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_maintenance ENABLE ROW LEVEL SECURITY;

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

-- Add updated_at triggers
CREATE TRIGGER update_fuel_orders_updated_at
BEFORE UPDATE ON public.fuel_orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_equipment_maintenance_updated_at
BEFORE UPDATE ON public.equipment_maintenance
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();