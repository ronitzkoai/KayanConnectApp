# Integrate Migrations 06 & 07: Service Types and Customer Role

## Overview

This guide explains how to integrate **Migration 06** (Service Types) and **Migration 07** (Customer Role) into the unified `MigrateUnite.sql` file.

**What These Migrations Add**:
- **Migration 06**: Service type flexibility for job requests (operator_with_equipment, equipment_only, operator_only)
- **Migration 07**: Customer role as 4th role option (contractor, worker, admin, customer)

**Integration Approach**:
Both migrations are **ADDITIVE** (no deletions or replacements). Instead of using `ALTER TYPE` and `ALTER TABLE` commands, we'll add these features during initial structure creation.

**Migrations Being Integrated**:
- `20251129132437_68bdfc26-922f-434c-8d4b-ee7eb8f8763a.sql` (Migration 06 - 6 lines)
- `20251202143021_1240260c-b632-40e5-bb97-dca037e3c827.sql` (Migration 07 - 2 lines)

---

## Migration 06 Actions: Service Types

### ADD 1: Create service_type Enum

**Location**: After `job_status` enum (line 22), before `profiles` table (line 24)

**Reason**: Job requests need flexibility for different service offerings:
- `operator_with_equipment`: Worker brings equipment and operates it
- `equipment_only`: Contractor needs just the equipment (no operator)
- `operator_only`: Contractor has equipment, needs operator

**Code to ADD**:
```sql
-- Create service type enum
CREATE TYPE service_type AS ENUM ('operator_with_equipment', 'equipment_only', 'operator_only');
```

**Why here**: Enum types must be created before tables that use them. Placing after `job_status` keeps all job-related enums together.

---

### ADD 2: service_type Column to job_requests Table

**Location**: In `job_requests` table definition (around line 67, after `urgency` column)

**Reason**: Every job request needs to specify what type of service is being requested. Default is `operator_with_equipment` (most common case).

**FIND this section** (lines 60-72):
```sql
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
```

**REPLACE with**:
```sql
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
```

**What changed**: Added `service_type service_type DEFAULT 'operator_with_equipment' NOT NULL,` after the `urgency` line.

**Why NOT NULL with default**: Every job must have a service type. Default ensures backward compatibility.

---

## Migration 07 Actions: Customer Role

### REPLACE: app_role Enum Definition

**Location**: Line 5 (app_role enum definition)

**Reason**: Add 'customer' as 4th role option. Customers can view services but may have different permissions than contractors.

**FIND this line** (line 5):
```sql
CREATE TYPE public.app_role AS ENUM ('contractor', 'worker', 'admin');
```

**REPLACE with**:
```sql
CREATE TYPE public.app_role AS ENUM ('contractor', 'worker', 'admin', 'customer');
```

**What changed**: Added `'customer'` as 4th enum value.

**Why in unified migration**: Instead of `ALTER TYPE ADD VALUE`, we include it from the start. This is cleaner and avoids enum modification issues.

**Impact**:
- `user_roles` table can now store 'customer' role
- `has_role()` function will work with 'customer' role
- Application can assign customer role during signup

---

## Execution Order

Follow this sequence when applying to `MigrateUnite.sql`:

1. **First**: Update `app_role` enum (Migration 07 action)
   - Modify line 5 to include 'customer'

2. **Second**: Add `service_type` enum (Migration 06 action 1)
   - Insert after line 22 (`job_status` enum)

3. **Third**: Update `job_requests` table (Migration 06 action 2)
   - Add `service_type` column to table definition (around line 67)

**Why this order**:
- Enums must exist before tables use them
- app_role comes first (line 5) so update it first
- service_type enum created before job_requests table uses it

---

## Verification After Integration

### 1. Check Enums Created
```sql
-- Should show 4 values: contractor, worker, admin, customer
SELECT unnest(enum_range(NULL::app_role));

-- Should show 3 values: operator_with_equipment, equipment_only, operator_only
SELECT unnest(enum_range(NULL::service_type));
```

### 2. Check job_requests Table Structure
```sql
-- Should include service_type column with default
\d job_requests
```

### 3. Test Customer Role Assignment
```sql
-- Should succeed
INSERT INTO user_roles (user_id, role)
VALUES ('some-uuid', 'customer');
```

### 4. Test Service Type on Job
```sql
-- Should succeed with all three service types
INSERT INTO job_requests (contractor_id, work_type, location, work_date, service_type)
VALUES
  ('contractor-uuid', 'backhoe', 'Site A', NOW(), 'operator_with_equipment'),
  ('contractor-uuid', 'loader', 'Site B', NOW(), 'equipment_only'),
  ('contractor-uuid', 'bobcat', 'Site C', NOW(), 'operator_only');
```

---

## Summary

**Migration 06** (Service Types):
- ✅ ADD service_type enum (3 values)
- ✅ ADD service_type column to job_requests table

**Migration 07** (Customer Role):
- ✅ REPLACE app_role enum (add 'customer' value)

**Total Changes**: 3 actions (1 REPLACE, 2 ADD)

**No Dead Code**: Both migrations are purely additive

**Result**: `MigrateUnite.sql` now includes migrations 01-07 (7 of 20 complete)

---

## Next Migration

After integrating migrations 06 & 07, the next migration to integrate is:

**Migration 08**: Equipment Maintenance System (`20251202151132_...`)
- Adds equipment_maintenance table
- Tracks maintenance schedules and records
