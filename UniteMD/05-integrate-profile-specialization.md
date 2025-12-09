# Integrate Migration 08: Profile Specialization

## Overview

This guide explains how to integrate **Migration 08** (Profile Specialization) into the unified `MigrateUnite.sql` file.

**What This Migration Adds**:
- **contractor_profiles table**: Dedicated profiles for contractors with company info, licensing, and ratings
- **customer_profiles table**: Dedicated profiles for customers with location and project details
- **Worker profile enhancements**: Add equipment tracking (owned_equipment[], equipment_skills[])

**Integration Approach**:
This migration is **mostly additive** with one table modification. Instead of using `ALTER TABLE` for worker_profiles, we'll add the new columns during the initial table definition.

**Migration Being Integrated**:
- `20251202143050_676a3da9-dd83-4ec0-a6fd-5705cd7aaed5.sql` (Migration 08 - 71 lines)

---

## REPLACE Action: Modify worker_profiles Table

**Location**: Lines 46-60 in MigrateUnite.sql (worker_profiles table definition)

**Reason**: Add equipment tracking capabilities to worker profiles. Workers need to specify:
- **owned_equipment**: What equipment they own (e.g., ['backhoe', 'loader'])
- **equipment_skills**: What equipment they can operate (e.g., ['backhoe', 'loader', 'grader'])

This allows workers to:
- Accept 'equipment_only' jobs (contractor provides operator)
- Accept 'operator_only' jobs (contractor provides equipment)
- Match with jobs requiring specific equipment

**Why modify now vs ALTER TABLE**: In a unified migration, it's cleaner to add columns during initial table creation rather than alter afterward.

**FIND this section** (lines 46-60):
```sql
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
```

**REPLACE with**:
```sql
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
                                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                                        UNIQUE(user_id)
);
```

**What changed**: Added two lines before the timestamp columns:
- `owned_equipment TEXT[] DEFAULT '{}',`
- `equipment_skills TEXT[] DEFAULT '{}',`

**Why TEXT[]**: Arrays allow multiple values. Worker can own/operate multiple equipment types.

---

## ADD Action 1: Create contractor_profiles Table

**Location**: After worker_profiles table (insert around line 62, after line 60)

**Reason**: Contractors need their own specialized profile data:
- **Business info**: company_name, license_type, license_number
- **Capabilities**: specializations[] (services offered), service_areas[] (geographic coverage)
- **Verification**: is_verified (admin approval), years_experience
- **Reputation**: rating, total_ratings (separate from worker ratings)

This enables contractors to:
- Build professional profiles separate from basic user profile
- Get verified by platform admins
- Build contractor-specific reputation (different from worker reputation)
- Advertise specializations and service areas

**Why separate from profiles table**: Contractor-specific fields don't apply to workers/customers. Separate tables keep data clean and typed.

**Code to ADD**:
```sql
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
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

**Key design notes**:
- `user_id UNIQUE`: One contractor profile per user (1:1 relationship)
- `specializations[]`: Array supports multi-service contractors
- `service_areas[]`: Array supports multiple geographic regions
- `is_verified`: Admin-controlled trust signal
- `rating/total_ratings`: Separate rating system from worker role

---

## ADD Action 2: Create customer_profiles Table

**Location**: After contractor_profiles table (insert around line 78)

**Reason**: Customers (service requesters) need their own profile data:
- **Location**: city, address (for service delivery)
- **Context**: project_description (what they're building/doing)

Customers are different from contractors:
- Contractors post jobs for workers
- Customers request services from contractors
- Separate role, separate profile needs

**Why simpler than contractor_profiles**: Customers don't need licensing, ratings, or verification. They're service requesters, not service providers.

**Code to ADD**:
```sql
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
```

**Key design notes**:
- `user_id UNIQUE`: One customer profile per user
- Minimal fields: Just location and project context
- No ratings: Customers don't provide services (not rated)
- No verification: Lower trust requirements for customers vs providers

---

## ADD Action 3: Enable RLS on New Tables

**Location**: After existing RLS enable statements (around line 120, after `ratings` RLS enable)

**Reason**: Security requirement. All tables with user data must have Row Level Security enabled to prevent unauthorized access.

**Code to ADD**:
```sql
-- Enable RLS on new profile tables
ALTER TABLE public.contractor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
```

**Why critical**: Without RLS, any authenticated user could read/modify any contractor/customer profile. RLS enforcement + policies = secure access control.

---

## ADD Action 4: RLS Policies for contractor_profiles

**Location**: After existing worker_profiles policies (around line 200, after the worker INSERT/UPDATE policies)

**Reason**: Define who can view, create, and update contractor profiles:
- **SELECT policy**: Anyone can view (public profiles for marketplace)
- **INSERT policy**: Only contractors can create their own profile
- **UPDATE policy**: Only contractors can update their own profile

This follows the same pattern as worker_profiles policies.

**Code to ADD**:
```sql
-- RLS policies for contractor_profiles
CREATE POLICY "Anyone can view contractor profiles"
ON public.contractor_profiles FOR SELECT
USING (true);

CREATE POLICY "Contractors can insert own profile"
ON public.contractor_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'contractor'::app_role));

CREATE POLICY "Contractors can update own profile"
ON public.contractor_profiles FOR UPDATE
USING (auth.uid() = user_id AND has_role(auth.uid(), 'contractor'::app_role));
```

**Policy breakdown**:

**Policy 1 - SELECT**: `USING (true)`
- Anyone (including anonymous users) can view contractor profiles
- **Why**: Marketplace needs public profiles for discovery

**Policy 2 - INSERT**: `WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'contractor'::app_role))`
- Can only create profile for yourself (`auth.uid() = user_id`)
- Must have contractor role (`has_role(auth.uid(), 'contractor')`)
- **Why**: Prevents creating profiles for other users or without proper role

**Policy 3 - UPDATE**: `USING (auth.uid() = user_id AND has_role(auth.uid(), 'contractor'::app_role))`
- Can only update your own profile
- Must still have contractor role
- **Why**: Profile ownership + role verification

---

## ADD Action 5: RLS Policies for customer_profiles

**Location**: After contractor_profiles policies (around line 212)

**Reason**: Define who can view, create, and update customer profiles. Same security pattern as contractor_profiles but checking for 'customer' role instead.

**Code to ADD**:
```sql
-- RLS policies for customer_profiles
CREATE POLICY "Anyone can view customer profiles"
ON public.customer_profiles FOR SELECT
USING (true);

CREATE POLICY "Customers can insert own profile"
ON public.customer_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'customer'::app_role));

CREATE POLICY "Customers can update own profile"
ON public.customer_profiles FOR UPDATE
USING (auth.uid() = user_id AND has_role(auth.uid(), 'customer'::app_role));
```

**Policy breakdown**: Same pattern as contractor_profiles but for customer role

**Note**: Uses `has_role()` function from Migration 03 (already integrated) and 'customer' role from Migration 07 (already integrated).

---

## ADD Action 6: Triggers for updated_at

**Location**: After existing updated_at triggers (around line 438, after job_requests trigger)

**Reason**: Automatically update the `updated_at` timestamp whenever a contractor or customer profile is modified. This provides automatic audit trail of last modification time.

Uses existing `handle_updated_at()` function from Migration 01 (already integrated).

**Code to ADD**:
```sql
-- Add updated_at triggers for new profile tables
CREATE TRIGGER update_contractor_profiles_updated_at
BEFORE UPDATE ON public.contractor_profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_customer_profiles_updated_at
BEFORE UPDATE ON public.customer_profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

**How it works**:
- `BEFORE UPDATE`: Fires before each update operation
- `FOR EACH ROW`: Applies to every row being updated
- `handle_updated_at()`: Sets `NEW.updated_at = NOW()`

**Why important**: Automatic timestamp management prevents manual errors and provides consistent audit trail.

---

## Execution Order

Follow this sequence when applying to `MigrateUnite.sql`:

1. **REPLACE**: worker_profiles table definition (add 2 equipment columns)
   - Modify lines 46-60

2. **ADD**: contractor_profiles table
   - Insert after line 60

3. **ADD**: customer_profiles table
   - Insert after contractor_profiles

4. **ADD**: Enable RLS on new tables
   - Insert after line 120 (with other RLS enable statements)

5. **ADD**: RLS policies for contractor_profiles (3 policies)
   - Insert after line 200 (with other profile policies)

6. **ADD**: RLS policies for customer_profiles (3 policies)
   - Insert after contractor_profiles policies

7. **ADD**: Triggers for updated_at (2 triggers)
   - Insert after line 438 (with other updated_at triggers)

**Why this order**:
- Tables must exist before enabling RLS
- Tables must exist before creating policies
- Tables must exist before creating triggers
- Keeps related code grouped together (tables, RLS, policies, triggers)

---

## Verification After Integration

### 1. Check New Tables Exist
```sql
-- Should show contractor_profiles and customer_profiles
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('contractor_profiles', 'customer_profiles');
```

### 2. Check worker_profiles Has New Columns
```sql
-- Should show owned_equipment and equipment_skills
\d worker_profiles
```

### 3. Check RLS Enabled
```sql
-- Should return true for both tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('contractor_profiles', 'customer_profiles');
```

### 4. Check Policies Created
```sql
-- Should show 3 policies per table (SELECT, INSERT, UPDATE)
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('contractor_profiles', 'customer_profiles')
ORDER BY tablename, policyname;
```

### 5. Check Triggers Created
```sql
-- Should show update triggers for both tables
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table IN ('contractor_profiles', 'customer_profiles');
```

### 6. Test Contractor Profile Creation
```sql
-- Should succeed for user with contractor role
INSERT INTO contractor_profiles (user_id, company_name, specializations)
VALUES (auth.uid(), 'ABC Construction', ARRAY['excavation', 'grading']);
```

### 7. Test Customer Profile Creation
```sql
-- Should succeed for user with customer role
INSERT INTO customer_profiles (user_id, city, project_description)
VALUES (auth.uid(), 'Tel Aviv', 'Building a new house');
```

### 8. Test Worker Equipment Update
```sql
-- Should succeed for worker
UPDATE worker_profiles
SET owned_equipment = ARRAY['backhoe', 'loader'],
    equipment_skills = ARRAY['backhoe', 'loader', 'grader']
WHERE user_id = auth.uid();
```

---

## Summary

**Migration 08** (Profile Specialization):
- ✅ REPLACE worker_profiles table (add 2 equipment columns)
- ✅ ADD contractor_profiles table (15 columns)
- ✅ ADD customer_profiles table (6 columns)
- ✅ ADD RLS enable statements (2 tables)
- ✅ ADD RLS policies (6 policies total: 3 per table)
- ✅ ADD updated_at triggers (2 triggers)

**Total Changes**: 7 actions (1 REPLACE, 6 ADD)

**No Dead Code**: All additions are new functionality

**Result**: MigrateUnite.sql now includes migrations 01-08 (8 of 20 complete)

**Architecture Impact**: Platform now supports three distinct user types with specialized profiles:
- **Workers**: Job acceptors (now with equipment tracking)
- **Contractors**: Job posters (with business profiles)
- **Customers**: Service requesters (with project context)

---

## Next Migration

After integrating migration 08, the next migration to integrate is:

**Migration 09**: Maintenance Marketplace (`20251202151132_...`)
- Adds maintenance marketplace for equipment repair services
- Creates maintenance_requests and technician_profiles tables
