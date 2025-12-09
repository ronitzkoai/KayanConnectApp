# Integrate Migration 10: Operational Tracking (Fuel Orders & Equipment Maintenance)

## Overview

This guide explains how to integrate **Migration 10** (Operational Tracking) into the unified `MigrateUnite.sql` file.

**What This Migration Adds**:
- **Fuel ordering system**: Contractors can order fuel for their equipment fleet
- **Equipment maintenance tracking**: Schedule and track maintenance for equipment

**Integration Approach**:
This migration is **fully additive** - only new enums, tables, policies, and triggers. No modifications to existing structures.

**Migration Being Integrated**:
- `20251203100014_183ded1e-1222-4326-8844-e46bb14ef6a6.sql` (Migration 10 - 94 lines)

---

## ADD Action 1: Create Operational Tracking Enums

**Location**: After service_type enum (around line 26, before profiles table)

**Reason**: Add 4 new enums to support fuel ordering and maintenance tracking workflows.

**Why these enums**:
- **fuel_type**: Different equipment uses different fuel (diesel excavators vs gasoline generators)
- **fuel_order_status**: Track fuel delivery lifecycle (pending → confirmed → delivered)
- **maintenance_type**: Categorize maintenance work (oil changes, repairs, etc.)
- **maintenance_status**: Track maintenance workflow (scheduled → in_progress → completed)

**Code to ADD**:
```sql
-- Create enum for fuel type
CREATE TYPE public.fuel_type AS ENUM ('diesel', 'gasoline');

-- Create enum for fuel order status
CREATE TYPE public.fuel_order_status AS ENUM ('pending', 'confirmed', 'delivered', 'cancelled');

-- Create enum for maintenance type
CREATE TYPE public.maintenance_type AS ENUM ('oil_change', 'tire_change', 'filter_change', 'general_service', 'repair');

-- Create enum for maintenance status
CREATE TYPE public.maintenance_status AS ENUM ('scheduled', 'in_progress', 'completed', 'overdue');
```

**Enum Breakdown**:

**fuel_type** (2 values):
- `diesel`: Heavy equipment (excavators, loaders, backhoes)
- `gasoline`: Light equipment (generators, small tools)
- Why only 2: Most construction equipment uses these two fuel types

**fuel_order_status** (4 values):
- `pending`: Order submitted, awaiting supplier confirmation
- `confirmed`: Supplier confirmed, delivery scheduled
- `delivered`: Fuel received on site
- `cancelled`: Order cancelled by contractor or supplier
- Workflow: pending → confirmed → delivered

**maintenance_type** (5 values):
- `oil_change`: Regular engine oil service
- `tire_change`: Replace worn tires/tracks
- `filter_change`: Air/fuel/hydraulic filters
- `general_service`: Standard scheduled maintenance
- `repair`: Fix broken component
- Why categorize: Different maintenance types have different costs, schedules, urgency

**maintenance_status** (4 values):
- `scheduled`: Maintenance planned for future date
- `in_progress`: Work currently being performed
- `completed`: Maintenance finished
- `overdue`: Scheduled maintenance date passed, not yet done
- Workflow: scheduled → in_progress → completed (or overdue if missed)

---

## ADD Action 2: Create fuel_orders Table

**Location**: After customer_profiles table (around line 92)

**Reason**: Contractors need to order fuel for their equipment fleet. Managing fuel logistics is critical for construction operations:
- **Equipment runs on fuel**: Excavators, loaders, trucks all need regular refueling
- **Bulk ordering**: Contractors order fuel delivered to job sites in bulk
- **Cost tracking**: Fuel is major operational expense

**Code to ADD**:
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

**Field Breakdown**:

- **contractor_id**: References auth.users(id)
  - Why auth.users not contractor_profiles: Simpler foreign key, user deletion cascades properly
  - ON DELETE CASCADE: Delete fuel orders when user account deleted

- **fuel_type**: diesel or gasoline (defaults to diesel)
  - Why default diesel: Most common for construction equipment

- **quantity**: NUMERIC with CHECK > 0
  - Amount of fuel ordered (liters or gallons)
  - NUMERIC for precision (important for billing)
  - CHECK constraint prevents zero or negative quantities

- **equipment_type**: TEXT (optional)
  - What equipment needs fuel: "Excavator", "Loader", "Truck"
  - Why TEXT not enum: Too many equipment types to enumerate

- **equipment_name**: TEXT (optional)
  - Specific equipment identifier: "CAT 320", "Unit #5"
  - Helps contractor track which equipment was fueled

- **location**: TEXT (required)
  - Where to deliver fuel (job site address)
  - Required: Must know where to send fuel

- **delivery_date**: TIMESTAMP WITH TIME ZONE (required)
  - When contractor needs fuel delivered
  - Timezone aware for multi-region operations

- **status**: fuel_order_status (defaults to 'pending')
  - Current order state in workflow
  - Starts as pending when order created

- **notes**: TEXT (optional)
  - Special instructions: "Deliver before 8am", "Call on arrival"

- **price**: NUMERIC (optional)
  - Total order cost
  - Optional: May not know price until supplier confirms
  - NUMERIC for financial precision

**Design Notes**:
- No foreign key to equipment table (equipment_type/name are free text)
- References auth.users not contractor_profiles (simpler)
- Supports both bulk orders and equipment-specific orders

---

## ADD Action 3: Create equipment_maintenance Table

**Location**: After fuel_orders table (around line 106)

**Reason**: Contractors must track equipment maintenance to:
- **Prevent breakdowns**: Regular maintenance reduces equipment failures
- **Regulatory compliance**: Some maintenance is legally required
- **Warranty requirements**: Manufacturers require maintenance records
- **Resale value**: Well-maintained equipment worth more
- **Cost tracking**: Maintenance is major operational expense

**Code to ADD**:
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

**Field Breakdown**:

- **contractor_id**: References auth.users(id)
  - Same pattern as fuel_orders
  - ON DELETE CASCADE: Delete maintenance records when user deleted

- **equipment_type**: TEXT (required)
  - What equipment: "Excavator", "Backhoe", "Loader"
  - Required: Must know what equipment is being maintained

- **equipment_name**: TEXT (optional)
  - Specific equipment identifier: "CAT 320 #3", "Unit 5"
  - Helps when contractor has multiple units of same type

- **maintenance_type**: maintenance_type enum (required)
  - oil_change, tire_change, filter_change, general_service, repair
  - Required: Must know what type of maintenance

- **scheduled_date**: TIMESTAMP WITH TIME ZONE (required)
  - When maintenance is planned
  - Required: Always need target date (even for unscheduled repairs, this is "when discovered")

- **completed_date**: TIMESTAMP WITH TIME ZONE (optional)
  - When maintenance was actually finished
  - NULL until maintenance completed
  - Used to calculate: actual vs scheduled (was it on time?)

- **status**: maintenance_status (defaults to 'scheduled')
  - scheduled, in_progress, completed, overdue
  - Workflow tracking

- **cost**: NUMERIC (optional)
  - What maintenance cost
  - Optional: May not know cost until completed
  - NUMERIC for financial precision

- **notes**: TEXT (optional)
  - Details: "Replaced hydraulic hose", "Oil filter was very dirty"
  - Service notes, technician observations

- **mileage_hours**: INTEGER (optional)
  - Equipment hours or miles at time of service
  - Important for maintenance intervals: "Change oil every 500 hours"
  - Equipment uses hours, vehicles use miles

**Design Notes**:
- No foreign key to equipment table (free text equipment tracking)
- Supports both scheduled and reactive maintenance
- Tracks both planned and actual dates (can identify overdue maintenance)
- Cost tracking for operational expense analysis

---

## ADD Action 4: Enable RLS on Operational Tables

**Location**: After customer_profiles RLS enable (around line 155)

**Reason**: Security requirement. All tables with user data must have Row Level Security enabled.

**Code to ADD**:
```sql
ALTER TABLE public.fuel_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_maintenance ENABLE ROW LEVEL SECURITY;
```

---

## ADD Action 5: RLS Policies for fuel_orders

**Location**: After customer_profiles policies (around line 262)

**Reason**: Define access control for fuel orders. Contractors can fully manage their own fuel orders (SELECT, INSERT, UPDATE, DELETE).

**Why full CRUD access**:
- Contractors own their operational data
- May need to cancel orders (DELETE)
- May need to correct mistakes (UPDATE)
- Pattern: Own operational data = full control

**Code to ADD**:
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

**Policy Breakdown**:

**Policy 1 - SELECT**: `USING (contractor_id = auth.uid())`
- Contractors can only see their own fuel orders
- No public visibility (unlike job_requests or worker_profiles)
- Why private: Fuel orders are internal operational data

**Policy 2 - INSERT**: `WITH CHECK (contractor_id = auth.uid() AND has_role(auth.uid(), 'contractor'))`
- Must be creating order for yourself (contractor_id = auth.uid())
- Must have contractor role (has_role check)
- Prevents non-contractors from creating fuel orders
- Prevents creating orders for other contractors

**Policy 3 - UPDATE**: `USING (contractor_id = auth.uid())`
- Can only update your own orders
- Typical uses: Change delivery date, update status, adjust quantity

**Policy 4 - DELETE**: `USING (contractor_id = auth.uid())`
- Can only delete your own orders
- Use case: Cancel order before delivery
- Pattern: Operational data can be deleted by owner

---

## ADD Action 6: RLS Policies for equipment_maintenance

**Location**: After fuel_orders policies (around line 276)

**Reason**: Define access control for maintenance records. Same pattern as fuel_orders - full CRUD for owners.

**Code to ADD**:
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

**Policy Breakdown**: Same pattern as fuel_orders
- SELECT: View own records only
- INSERT: Must be contractor, creating for self
- UPDATE: Own records only
- DELETE: Own records only

**Use cases for DELETE**:
- Remove duplicate entry
- Delete test data
- Remove mistakenly created record

---

## ADD Action 7: Triggers for updated_at

**Location**: After customer_profiles triggers (around line 512)

**Reason**: Automatically update timestamps when records change.

**Code to ADD**:
```sql
CREATE TRIGGER update_fuel_orders_updated_at
BEFORE UPDATE ON public.fuel_orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_equipment_maintenance_updated_at
BEFORE UPDATE ON public.equipment_maintenance
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
```

**How it works**:
- BEFORE UPDATE: Fires before each update operation
- FOR EACH ROW: Applies to every row being updated
- handle_updated_at(): Sets `NEW.updated_at = NOW()`

**Why important**: Automatic audit trail of last modification time

---

## Execution Order

Follow this sequence when applying to `MigrateUnite.sql`:

1. **ADD**: 4 operational enums
   - Insert after line 26 (after service_type enum)

2. **ADD**: fuel_orders table
   - Insert after line 92 (after customer_profiles table)

3. **ADD**: equipment_maintenance table
   - Insert after fuel_orders table

4. **ADD**: Enable RLS on both tables
   - Insert after line 155 (with other RLS enable statements)

5. **ADD**: RLS policies for fuel_orders (4 policies)
   - Insert after line 262 (after customer profiles policies)

6. **ADD**: RLS policies for equipment_maintenance (4 policies)
   - Insert after fuel_orders policies

7. **ADD**: Triggers for updated_at (2 triggers)
   - Insert after line 512 (with other updated_at triggers)

**Why this order**:
- Enums must exist before tables use them
- Tables must exist before enabling RLS
- Tables must exist before creating policies
- Tables must exist before creating triggers
- Keeps related code grouped together

---

## Verification After Integration

### 1. Check Enums Created
```sql
-- Should show 2 values: diesel, gasoline
SELECT unnest(enum_range(NULL::fuel_type));

-- Should show 4 values: pending, confirmed, delivered, cancelled
SELECT unnest(enum_range(NULL::fuel_order_status));

-- Should show 5 values
SELECT unnest(enum_range(NULL::maintenance_type));

-- Should show 4 values: scheduled, in_progress, completed, overdue
SELECT unnest(enum_range(NULL::maintenance_status));
```

### 2. Check Tables Exist
```sql
-- Should return both tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('fuel_orders', 'equipment_maintenance');
```

### 3. Check RLS Enabled
```sql
-- Should return true for both
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('fuel_orders', 'equipment_maintenance');
```

### 4. Check Policies Created
```sql
-- Should show 4 policies per table (SELECT, INSERT, UPDATE, DELETE)
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('fuel_orders', 'equipment_maintenance')
GROUP BY tablename;
```

### 5. Test Fuel Order Creation
```sql
-- Should succeed for contractor
INSERT INTO fuel_orders (
  contractor_id, fuel_type, quantity, location, delivery_date
)
VALUES (
  auth.uid(),
  'diesel',
  500.00,
  'Construction Site A',
  '2025-12-15 08:00:00+00'
);
```

### 6. Test Maintenance Record Creation
```sql
-- Should succeed for contractor
INSERT INTO equipment_maintenance (
  contractor_id, equipment_type, maintenance_type, scheduled_date
)
VALUES (
  auth.uid(),
  'Excavator CAT 320',
  'oil_change',
  '2025-12-20 10:00:00+00'
);
```

### 7. Test Full CRUD Operations
```sql
-- Should all succeed for own records
SELECT * FROM fuel_orders WHERE contractor_id = auth.uid();
UPDATE fuel_orders SET status = 'confirmed' WHERE contractor_id = auth.uid();
DELETE FROM fuel_orders WHERE contractor_id = auth.uid() AND status = 'cancelled';
```

---

## Summary

**Migration 10** (Operational Tracking):
- ✅ ADD 4 enums (fuel_type, fuel_order_status, maintenance_type, maintenance_status)
- ✅ ADD fuel_orders table (12 columns)
- ✅ ADD equipment_maintenance table (11 columns)
- ✅ ADD RLS enable (2 tables)
- ✅ ADD RLS policies (8 policies: 4 per table with full CRUD)
- ✅ ADD triggers (2 updated_at triggers)

**Total Changes**: 7 actions (all ADD)

**No Modifications**: Fully additive migration

**Result**: MigrateUnite.sql now includes migrations 01-10 (10 of 20 complete)

**Platform Features Added**:
- **Fuel ordering**: Contractors can order fuel delivered to job sites
- **Maintenance tracking**: Schedule and track equipment maintenance
- **Cost tracking**: Record fuel and maintenance expenses
- **Workflow management**: Track order and maintenance status through lifecycle

**Business Value**:
- Operational efficiency: Centralize fuel ordering and maintenance scheduling
- Cost control: Track all operational expenses
- Equipment uptime: Prevent breakdowns through maintenance tracking
- Compliance: Maintain maintenance records for regulations/warranties

---

## Next Migration

After integrating migration 10, the next migration to integrate is:

**Migration 11**: `20251203105447_941fab5c-e7f8-4560-a3a3-d32542932955.sql`
- Check actual file content to see what it contains
