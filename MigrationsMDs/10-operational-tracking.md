# Migration 10: Operational Tracking

## Migration Info
- **Filename**: `20251203100014_183ded1e-1222-4326-8844-e46bb14ef6a6.sql`
- **Timestamp**: December 3, 2025 at 10:00:14 (16 hours after migration 9)
- **Purpose**: Add fuel ordering and equipment maintenance tracking for contractors' operational management
- **Size**: 94 lines
- **Dependencies**:
  - Migration 1 (handle_updated_at() function)
  - Migration 3 (has_role() function, app_role enum)
  - Migration 8 (contractor_profiles - business context)

## Overview
This migration adds operational cost tracking capabilities for contractors, enabling them to manage two critical business expenses: fuel purchases and equipment maintenance. Unlike migration 9's maintenance_requests (which are service marketplace requests),  this creates equipment_maintenance for internal maintenance logs/records.

**Key Additions**:
- 4 new ENUMs for fuel and maintenance tracking
- fuel_orders table (diesel/gasoline purchasing and delivery)
- equipment_maintenance table (maintenance logs and service history)
- Full RLS policies (contractors manage their own data)
- Automated updated_at triggers

This transforms the platform from pure job/service matching into a comprehensive business management tool for contractors.

---

## Line-by-Line Analysis

### Lines 1-11: Enum Definitions

#### Lines 1-2: Fuel Type Enum
```sql
-- Create enum for fuel type
CREATE TYPE public.fuel_type AS ENUM ('diesel', 'gasoline');
```

**What it does**: Defines two fuel types for equipment

**Why these types**:
- **diesel**: Heavy equipment (excavators, backhoes, loaders)
- **gasoline**: Light equipment (generators, small tools)

**Why NOT more types**:
- No 'electric', 'propane', 'natural_gas'
- Focused on construction equipment fuel types
- Can be extended later: `ALTER TYPE fuel_type ADD VALUE 'electric';`

---

#### Lines 4-5: Fuel Order Status Enum
```sql
-- Create enum for fuel order status
CREATE TYPE public.fuel_order_status AS ENUM ('pending', 'confirmed', 'delivered', 'cancelled');
```

**What it does**: Tracks fuel order lifecycle

**Status Flow**:
```
pending → confirmed → delivered
   ↓
cancelled
```

**Status Definitions**:
- **pending**: Order placed, awaiting supplier confirmation
- **confirmed**: Supplier confirmed order, scheduled for delivery
- **delivered**: Fuel delivered and received
- **cancelled**: Order cancelled (by contractor or supplier)

**Missing statuses**:
- No 'in_transit' or 'out_for_delivery'
- No 'failed' or 'refunded'
- Simpler workflow than typical e-commerce

---

#### Lines 7-8: Maintenance Type Enum
```sql
-- Create enum for maintenance type
CREATE TYPE public.maintenance_type AS ENUM ('oil_change', 'tire_change', 'filter_change', 'general_service', 'repair');
```

**What it does**: Categorizes maintenance activities

**Types Explained**:
- **oil_change**: Regular oil/lubrication service
- **tire_change**: Tire replacement or rotation
- **filter_change**: Air/fuel/hydraulic filter replacement
- **general_service**: Routine preventive maintenance
- **repair**: Corrective maintenance (fixing broken components)

**⚠️ Important Note**:
- This enum is for equipment_maintenance table (internal logs)
- Migration 9's maintenance_requests uses TEXT, not this enum
- Creates inconsistency - same concept, different types

**Missing types**:
- No 'inspection', 'calibration', 'warranty_work'
- Could be more granular: 'hydraulic_repair', 'engine_repair', 'electrical_repair'

---

#### Lines 10-11: Maintenance Status Enum
```sql
-- Create enum for maintenance status
CREATE TYPE public.maintenance_status AS ENUM ('scheduled', 'in_progress', 'completed', 'overdue');
```

**What it does**: Tracks maintenance record lifecycle

**Status Definitions**:
- **scheduled**: Maintenance planned for future date
- **in_progress**: Currently being serviced
- **completed**: Service finished
- **overdue**: Passed scheduled date without completion

**Status Flow**:
```
scheduled → in_progress → completed
   ↓
overdue (automatic based on scheduled_date)
```

**Implementation Note**:
- 'overdue' requires application logic or database trigger
- No automatic transition from 'scheduled' to 'overdue'
- Should add function:
```sql
-- Check if maintenance is overdue
CREATE FUNCTION is_maintenance_overdue(scheduled_date timestamptz, status maintenance_status)
RETURNS boolean AS $$
BEGIN
  RETURN scheduled_date < NOW() AND status = 'scheduled';
END;
$$ LANGUAGE plpgsql;
```

---

### Lines 13-28: Fuel Orders Table
```sql
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
```

**Field-by-Field Breakdown**:
- **id**: UUID primary key with auto-generation
- **contractor_id**: References auth.users
  - ✅ **Good**: Has foreign key with CASCADE delete
  - **Why**: Links order to contractor account
- **fuel_type**: Uses fuel_type enum, defaults to diesel
  - ✅ **Good**: Type-safe, prevents invalid values
  - **Why default diesel**: Most heavy equipment uses diesel
- **quantity**: NUMERIC with CHECK constraint
  - ✅ **Good**: CHECK (quantity > 0) prevents negative/zero orders
  - **Unit**: Likely liters or gallons (not specified)
  - ℹ️ **Missing**: No unit field ('liters' vs 'gallons')
- **equipment_type**: TEXT (optional)
  - Which equipment needs fuel
  - Example: 'excavator', 'loader'
  - ℹ️ **Free-text**: Not linked to work_type enum
- **equipment_name**: TEXT (optional)
  - Specific equipment identifier
  - Example: 'CAT 320 Excavator #3'
- **location**: TEXT NOT NULL
  - Delivery address
  - Required for fuel delivery logistics
  - ℹ️ **No structure**: Could be city, address, GPS coordinates
- **delivery_date**: TIMESTAMP WITH TIME ZONE NOT NULL
  - When fuel should be delivered
  - Required for scheduling
- **status**: Uses fuel_order_status enum, defaults to 'pending'
  - ✅ **Good**: Type-safe status tracking
- **notes**: TEXT (optional)
  - Additional instructions or requirements
  - Example: 'Deliver before 8am', 'Call on arrival'
- **price**: NUMERIC (optional)
  - Total cost of order
  - ℹ️ **No CHECK constraint**: Negative prices possible
  - ℹ️ **No currency field**: Assumes single currency
  - **Why optional**: Price confirmed after order placed
- **created_at / updated_at**: Standard timestamps with defaults

**Business Logic**:
- Contractors order fuel for their equipment
- Delivery scheduled to job site or storage location
- Tracks spending on fuel (operational cost tracking)

**Issues Identified**:
1. ℹ️ **No quantity unit**: liters vs gallons ambiguous
2. ℹ️ **No supplier field**: Who supplies the fuel?
3. ℹ️ **No receipt/invoice tracking**: No proof of delivery
4. ⚠️ **Free-text equipment_type**: Not validated against work_type enum

---

### Lines 30-45: Equipment Maintenance Table
```sql
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
```

**What it does**: Logs maintenance activities for contractor's equipment

**Distinction from maintenance_requests (migration 9)**:
- **equipment_maintenance**: Internal logs (I did maintenance on MY equipment)
- **maintenance_requests**: Service requests (I need SOMEONE ELSE to service my equipment)
- Both can exist: Request service → Service completed → Log in equipment_maintenance

**Field-by-Field Breakdown**:
- **id / contractor_id**: Standard UUID pattern with FK
- **equipment_type**: TEXT NOT NULL
  - Which equipment was serviced
  - ℹ️ **Not validated**: Free-text, not enum
- **equipment_name**: TEXT (optional)
  - Specific equipment identifier
- **maintenance_type**: Uses maintenance_type enum
  - ✅ **Good**: Type-safe maintenance categorization
- **scheduled_date**: TIMESTAMP WITH TIME ZONE NOT NULL
  - When maintenance is planned
  - Used to calculate 'overdue' status
- **completed_date**: TIMESTAMP WITH TIME ZONE (optional)
  - When maintenance was actually finished
  - **Null** = not yet completed
  - **Set** = maintenance done
- **status**: Uses maintenance_status enum, defaults to 'scheduled'
  - ✅ **Good**: Type-safe status tracking
- **cost**: NUMERIC (optional)
  - How much maintenance cost
  - ℹ️ **No CHECK constraint**: Negative possible
  - Tracks operational expenses
- **notes**: TEXT (optional)
  - Maintenance details, findings, parts replaced
  - Example: 'Replaced hydraulic fluid, found leak in line 3'
- **mileage_hours**: INTEGER (optional)
  - Equipment usage at time of maintenance
  - **Mileage**: For wheeled equipment (trucks, loaders)
  - **Hours**: For tracked equipment (excavators, dozers)
  - ℹ️ **Ambiguous**: Single field for two different metrics
  - Better: Separate mileage_km and hours_operated fields
- **created_at / updated_at**: Standard timestamps

**Business Value**:
- Maintenance history for each piece of equipment
- Track maintenance costs over time
- Preventive maintenance scheduling
- Resale value (well-maintained equipment)
- Warranty tracking

**Issues Identified**:
1. ℹ️ **Mileage/hours ambiguity**: One field for two metrics
2. ℹ️ **No equipment inventory**: No FK to equipment table
3. ℹ️ **No service provider tracking**: Who did the maintenance?
4. ℹ️ **No parts tracking**: What parts were replaced?
5. ⚠️ **No automated overdue detection**: Requires application logic

---

### Lines 47-49: Enable RLS
```sql
-- Enable RLS
ALTER TABLE public.fuel_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_maintenance ENABLE ROW LEVEL SECURITY;
```

**Standard RLS enablement** - required for Supabase security model

---

### Lines 51-83: Fuel Orders RLS Policies
```sql
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
```

**Policy Pattern**: Standard owner-only access

**Policy 1: View Own Orders**
- **Rule**: Can only see fuel orders where you're the contractor
- **Privacy**: Other contractors cannot see your fuel purchases

**Policy 2: Create Orders (Contractor Role Required)**
- **Rule**: Must have contractor role AND set contractor_id to yourself
- **Security**: Prevents workers/customers from creating fuel orders
- **Business logic**: Only contractors order fuel (makes sense)

**Policy 3: Update Own Orders**
- **Rule**: Can only update your own orders
- **Use case**: Change delivery date, update status, add notes

**Policy 4: Delete Own Orders**
- **Rule**: Can only delete your own orders
- **Use case**: Cancel order before delivery
- ℹ️ **No status restriction**: Can delete even after 'delivered'
- **Recommendation**: Add `AND status IN ('pending', 'confirmed')`

**Missing Policies**:
- ❌ **No supplier policies**: If suppliers use platform, they need access
- ❌ **No admin policies**: Added in migration 15

---

### Lines 85-94: Equipment Maintenance RLS Policies
```sql
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
```

**Identical Pattern**: Same owner-only access as fuel_orders

**Why This Makes Sense**:
- Maintenance records are private business data
- Competitive advantage (well-maintained equipment)
- Only owner needs to see maintenance history

**Missing Features**:
- ❌ **No technician access**: If maintenance done via platform, technician should be able to update
- ❌ **No admin policies**: Added in migration 15

---

### Lines 86-94: Updated_at Triggers
```sql
-- Add updated_at triggers
CREATE TRIGGER update_fuel_orders_updated_at
BEFORE UPDATE ON public.fuel_orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_equipment_maintenance_updated_at
BEFORE UPDATE ON public.equipment_maintenance
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
```

**What it does**: Automatically updates updated_at timestamp on row changes

**Consistency**: ✅ Follows established pattern from migrations 1, 8

**Function Used**: handle_updated_at() from migration 1 (sets NEW.updated_at = NOW())

---

## Schema Changes Summary

### New ENUMs Created
1. **fuel_type**: 'diesel', 'gasoline'
2. **fuel_order_status**: 'pending', 'confirmed', 'delivered', 'cancelled'
3. **maintenance_type**: 'oil_change', 'tire_change', 'filter_change', 'general_service', 'repair'
4. **maintenance_status**: 'scheduled', 'in_progress', 'completed', 'overdue'

### New Tables Created
1. **fuel_orders**
   - Purpose: Track fuel purchases and deliveries
   - Key fields: fuel_type, quantity, location, delivery_date, status, price
   - Relationships: contractor_id → auth.users (with FK)

2. **equipment_maintenance**
   - Purpose: Log equipment maintenance activities and history
   - Key fields: equipment_type, maintenance_type, scheduled_date, completed_date, status, cost
   - Relationships: contractor_id → auth.users (with FK)

### RLS Policies Created
- fuel_orders: 4 policies (SELECT own, INSERT contractor-only, UPDATE own, DELETE own)
- equipment_maintenance: 4 policies (SELECT own, INSERT contractor-only, UPDATE own, DELETE own)

### Triggers Created
- update_fuel_orders_updated_at
- update_equipment_maintenance_updated_at

---

## Integration Notes

### Dependencies
- **Requires Migration 1**: handle_updated_at() function
- **Requires Migration 3**: has_role() function, app_role enum
- **Requires Migration 8**: contractor_profiles (business context for contractors)

### Modified By Later Migrations
- **Migration 15**: Adds admin SELECT/UPDATE/DELETE policies for both tables

### Data Migration Considerations
- No existing data to migrate
- Empty tables created, contractors start fresh
- No automatic fuel or maintenance record creation

---

## Issues & Recommendations

### Architecture Issues
1. **🟡 No Equipment Inventory Table**
   - equipment_type is free-text in multiple tables
   - Should have central equipment_inventory table:
   ```sql
   CREATE TABLE equipment_inventory (
     id UUID PRIMARY KEY,
     contractor_id UUID REFERENCES auth.users(id),
     equipment_type work_type,
     equipment_name TEXT,
     serial_number TEXT,
     purchase_date DATE,
     current_mileage_hours INTEGER
   );
   -- Then FK from fuel_orders and equipment_maintenance
   ```

2. **🟡 maintenance_type Enum Not Used**
   - Migration 9's maintenance_requests uses TEXT for maintenance_type
   - This migration creates enum but different tables don't share it
   - **Fix**: ALTER maintenance_requests to use the enum

3. **🟡 Mileage/Hours Field Ambiguity**
   - Single field for two different metrics
   - **Fix**: Separate into mileage_km and operating_hours

### Missing Features
1. ❌ **No quantity unit field**: liters vs gallons unclear
2. ❌ **No supplier management**: Who supplies fuel?
3. ❌ **No service provider link**: Who performed maintenance?
4. ❌ **No parts inventory**: What parts used in maintenance?
5. ❌ **No automated overdue detection**: Requires application logic or cron job

### Security Issues
1. **ℹ️ Unrestricted Deletion**
   - Can delete delivered fuel orders (should be immutable)
   - Can delete completed maintenance (audit trail lost)
   - **Fix**: Add status restrictions to DELETE policies

### Data Validation Issues
1. ❌ **No CHECK constraint on fuel price**: Negative prices possible
2. ❌ **No CHECK constraint on maintenance cost**: Negative costs possible
3. ❌ **No CHECK on completed_date**: Could be before scheduled_date

---

## For Unified Migration

### Consolidation Opportunities
1. **Central Equipment Registry**
   - Create equipment_inventory table first
   - Reference it from fuel_orders, equipment_maintenance, job_requests
   - Eliminates free-text equipment_type duplication

2. **Unified Maintenance Concept**
   - Merge maintenance_type enum usage across:
     - equipment_maintenance (this migration)
     - maintenance_requests (migration 9)
   - Single source of truth for maintenance types

3. **Supplier/Provider Management**
   - Add supplier_id to fuel_orders
   - Add service_provider_id to equipment_maintenance
   - Links operational data to service providers

### Sequencing in Unified Migration
```
1. ENUMs (all together including operational enums)
2. Core tables (profiles, roles)
3. Equipment inventory table (new)
4. Operational tables (fuel_orders, equipment_maintenance)
5. All RLS policies
6. All triggers
```

### Improvements for Unified Version
1. **Add CHECK constraints**:
   ```sql
   price NUMERIC CHECK (price >= 0),
   cost NUMERIC CHECK (cost >= 0),
   quantity NUMERIC CHECK (quantity > 0),
   completed_date TIMESTAMP WITH TIME ZONE CHECK (completed_date >= scheduled_date)
   ```

2. **Add missing fields**:
   ```sql
   ALTER TABLE fuel_orders ADD COLUMN quantity_unit TEXT DEFAULT 'liters' CHECK (quantity_unit IN ('liters', 'gallons'));
   ALTER TABLE fuel_orders ADD COLUMN supplier_id UUID REFERENCES service_providers(id);
   ```

3. **Separate mileage and hours**:
   ```sql
   ALTER TABLE equipment_maintenance
   ADD COLUMN mileage_km INTEGER CHECK (mileage_km >= 0),
   ADD COLUMN operating_hours INTEGER CHECK (operating_hours >= 0);
   ALTER TABLE equipment_maintenance DROP COLUMN mileage_hours;
   ```

4. **Status-based deletion restrictions**:
   ```sql
   CREATE POLICY "Contractors can delete pending fuel orders"
   ON fuel_orders FOR DELETE
   USING (contractor_id = auth.uid() AND status IN ('pending', 'confirmed'));
   ```

5. **Create equipment inventory**:
   ```sql
   CREATE TABLE equipment_inventory (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     contractor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     equipment_type work_type NOT NULL,
     equipment_name TEXT NOT NULL,
     serial_number TEXT,
     purchase_date DATE,
     mileage_km INTEGER DEFAULT 0,
     operating_hours INTEGER DEFAULT 0,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- Then add FK:
   ALTER TABLE fuel_orders ADD COLUMN equipment_id UUID REFERENCES equipment_inventory(id);
   ALTER TABLE equipment_maintenance ADD COLUMN equipment_id UUID REFERENCES equipment_inventory(id);
   ```

### Dead Code to Remove
- None in this migration specifically
- But equipment_type fields could be replaced with equipment_id FKs

---

## Use Cases

### Fuel Order Management
1. **Create fuel order**:
   ```sql
   INSERT INTO fuel_orders (
     contractor_id, fuel_type, quantity,
     equipment_type, location, delivery_date
   ) VALUES (
     auth.uid(), 'diesel', 500,
     'excavator', 'Tel Aviv Construction Site A',
     '2025-12-05 08:00:00+00'
   );
   ```

2. **Track fuel spending**:
   ```sql
   SELECT
     fuel_type,
     SUM(quantity) as total_quantity,
     SUM(price) as total_cost,
     COUNT(*) as order_count
   FROM fuel_orders
   WHERE contractor_id = auth.uid()
     AND created_at >= '2025-12-01'
     AND status = 'delivered'
   GROUP BY fuel_type;
   ```

3. **Pending deliveries**:
   ```sql
   SELECT * FROM fuel_orders
   WHERE contractor_id = auth.uid()
     AND status IN ('pending', 'confirmed')
   ORDER BY delivery_date ASC;
   ```

### Equipment Maintenance Management
1. **Schedule preventive maintenance**:
   ```sql
   INSERT INTO equipment_maintenance (
     contractor_id, equipment_type, equipment_name,
     maintenance_type, scheduled_date, status
   ) VALUES (
     auth.uid(), 'excavator', 'CAT 320 #1',
     'oil_change', '2025-12-10 09:00:00+00', 'scheduled'
   );
   ```

2. **Complete maintenance record**:
   ```sql
   UPDATE equipment_maintenance
   SET
     status = 'completed',
     completed_date = NOW(),
     cost = 450.00,
     mileage_hours = 1250,
     notes = 'Oil changed, filters replaced, hydraulic fluid topped off'
   WHERE id = 'maintenance-uuid'
     AND contractor_id = auth.uid();
   ```

3. **Maintenance history for equipment**:
   ```sql
   SELECT
     maintenance_type,
     scheduled_date,
     completed_date,
     cost,
     notes
   FROM equipment_maintenance
   WHERE contractor_id = auth.uid()
     AND equipment_name = 'CAT 320 #1'
   ORDER BY scheduled_date DESC;
   ```

4. **Find overdue maintenance**:
   ```sql
   SELECT * FROM equipment_maintenance
   WHERE contractor_id = auth.uid()
     AND status = 'scheduled'
     AND scheduled_date < NOW()
   ORDER BY scheduled_date ASC;
   ```

5. **Monthly maintenance costs**:
   ```sql
   SELECT
     DATE_TRUNC('month', completed_date) as month,
     SUM(cost) as total_cost,
     COUNT(*) as maintenance_count
   FROM equipment_maintenance
   WHERE contractor_id = auth.uid()
     AND status = 'completed'
     AND completed_date >= NOW() - INTERVAL '12 months'
   GROUP BY month
   ORDER BY month DESC;
   ```

---

## Rollback Considerations

### To Rollback This Migration
```sql
-- Drop triggers first
DROP TRIGGER IF EXISTS update_fuel_orders_updated_at ON public.fuel_orders;
DROP TRIGGER IF EXISTS update_equipment_maintenance_updated_at ON public.equipment_maintenance;

-- Drop tables (CASCADE removes policies)
DROP TABLE IF EXISTS public.fuel_orders CASCADE;
DROP TABLE IF EXISTS public.equipment_maintenance CASCADE;

-- Drop enums
DROP TYPE IF EXISTS public.maintenance_status;
DROP TYPE IF EXISTS public.maintenance_type;
DROP TYPE IF EXISTS public.fuel_order_status;
DROP TYPE IF EXISTS public.fuel_type;
```

### Data Loss Warning
- ⚠️ All fuel order history deleted
- ⚠️ All equipment maintenance records deleted
- ⚠️ Operational cost tracking data lost permanently

### Rollback Blockers
- If migration 15 has run (admin policies reference these tables)
- If business reports depend on this data

---

## Testing Checklist

### Fuel Orders
- [ ] Contractor can create fuel order
- [ ] Non-contractor cannot create fuel order
- [ ] Contractor can view only their own orders
- [ ] Contractor cannot view other contractors' orders
- [ ] Can create order with valid fuel_type enum value
- [ ] Cannot create order with invalid fuel_type
- [ ] CHECK constraint prevents quantity <= 0
- [ ] updated_at changes on UPDATE
- [ ] Status transitions work (pending → confirmed → delivered)
- [ ] Contractor can delete their own order
- [ ] Contractor cannot delete other's orders

### Equipment Maintenance
- [ ] Contractor can create maintenance record
- [ ] Non-contractor cannot create maintenance record
- [ ] Contractor can view only their own records
- [ ] Can use all maintenance_type enum values
- [ ] Cannot use invalid maintenance_type
- [ ] Can set scheduled_date in future
- [ ] Can set completed_date when maintenance done
- [ ] Status transitions correctly
- [ ] updated_at changes on UPDATE
- [ ] Can track mileage_hours

### ENUMs
- [ ] All enum values work correctly
- [ ] Cannot insert invalid enum values
- [ ] Enum comparisons work in queries

### Security
- [ ] RLS prevents cross-contractor data access
- [ ] Role check on INSERT prevents non-contractors
- [ ] Cannot update another contractor's data
- [ ] Cannot delete another contractor's data

---

## Conclusion

Migration 10 transforms the platform into a comprehensive business management tool by adding operational tracking for contractors. The fuel_orders and equipment_maintenance tables enable contractors to track two major operational costs: fuel purchases and equipment servicing. Combined with the job marketplace (migrations 1-7) and maintenance service marketplace (migration 9), contractors now have an integrated platform for managing their entire business operations.

**Key Achievements**:
- ✅ Complete fuel ordering and tracking system
- ✅ Equipment maintenance logging and history
- ✅ Type-safe ENUMs for fuel and maintenance types
- ✅ Full RLS security (contractor data privacy)
- ✅ Automated timestamp management
- ✅ Cost tracking for operational expenses

**Areas for Improvement**:
- 🟡 Need central equipment inventory table
- 🟡 Maintenance_type enum not used by maintenance_requests
- 🟡 Mileage/hours field ambiguity
- ℹ️ Missing supplier/service provider tracking
- ℹ️ No quantity units for fuel orders

This migration, combined with migration 11's billing system, provides contractors with complete financial tracking: revenue (jobs), expenses (fuel, maintenance), and billing (subscriptions). The operational data also enables preventive maintenance scheduling and equipment lifecycle management.
