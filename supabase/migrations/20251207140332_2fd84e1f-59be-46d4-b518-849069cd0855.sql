
-- Add admin SELECT policies for all relevant tables

-- Profiles - admin can view all
CREATE POLICY "Admin can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- User roles - admin can view all
CREATE POLICY "Admin can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Job requests - admin can view and update all
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

-- Materials orders - admin can view and update all
CREATE POLICY "Admin can view all materials orders" 
ON public.materials_orders 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all materials orders" 
ON public.materials_orders 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete materials orders" 
ON public.materials_orders 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Fuel orders - admin can view and update all
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

-- Maintenance requests - admin can view and update all
CREATE POLICY "Admin can view all maintenance requests" 
ON public.maintenance_requests 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all maintenance requests" 
ON public.maintenance_requests 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- Equipment marketplace - admin can view and update all
CREATE POLICY "Admin can view all marketplace items" 
ON public.equipment_marketplace 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all marketplace items" 
ON public.equipment_marketplace 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete marketplace items" 
ON public.equipment_marketplace 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Equipment rentals - admin can view and update all
CREATE POLICY "Admin can view all rental items" 
ON public.equipment_rentals 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all rental items" 
ON public.equipment_rentals 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete rental items" 
ON public.equipment_rentals 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Subscriptions - admin can view all
CREATE POLICY "Admin can view all subscriptions" 
ON public.subscriptions 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all subscriptions" 
ON public.subscriptions 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- Contractor profiles - admin can view and update all
CREATE POLICY "Admin can view all contractor profiles" 
ON public.contractor_profiles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all contractor profiles" 
ON public.contractor_profiles 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- Worker profiles - admin can view and update all
CREATE POLICY "Admin can view all worker profiles" 
ON public.worker_profiles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all worker profiles" 
ON public.worker_profiles 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- Customer profiles - admin can view and update all
CREATE POLICY "Admin can view all customer profiles" 
ON public.customer_profiles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all customer profiles" 
ON public.customer_profiles 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- Maintenance quotes - admin can view all
CREATE POLICY "Admin can view all maintenance quotes" 
ON public.maintenance_quotes 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Ratings - admin can view all
CREATE POLICY "Admin can view all ratings" 
ON public.ratings 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));
