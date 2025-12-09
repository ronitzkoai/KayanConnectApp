# Migration 08: Profile Specialization

## Migration Info
- **Filename**: `20251202143050_676a3da9-dd83-4ec0-a6fd-5705cd7aaed5.sql`
- **Timestamp**: December 2, 2025 at 14:30:50 (30 seconds after migration 7)
- **Purpose**: Create dedicated profile tables for contractors and customers, enhance worker profiles with equipment tracking
- **Size**: 71 lines
- **Dependencies**:
  - Migration 1 (worker_profiles table)
  - Migration 3 (has_role() function, user_roles table)
  - Migration 7 (customer role)

## Overview
This migration represents a major architectural shift toward role-specific profile data. Instead of storing all profile information in a single `profiles` table, this creates specialized tables (`contractor_profiles`, `customer_profiles`) and enhances the existing `worker_profiles` with equipment-related fields. This allows each user type to have fields tailored to their specific needs without cluttering a universal profile table.

**Key Changes**:
- Creates `contractor_profiles` table (company info, licensing, verification, ratings)
- Creates `customer_profiles` table (location, project details)
- Adds equipment tracking to `worker_profiles` (owned_equipment, equipment_skills)
- Full RLS policies for both new tables
- Automated timestamp triggers

This migration sets the foundation for a multi-sided marketplace where contractors (job posters), workers (job acceptors), and customers (service requesters) each have specialized profile data.

---

## Line-by-Line Analysis

### Lines 1-16: Contractor Profiles Table Creation
```sql
-- Create contractor_profiles table
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

**What it does**: Creates a dedicated profile table for contractors

**Field-by-Field Breakdown**:
- **id**: UUID primary key generated automatically
  - Why: Independent from user_id allows flexibility in relationships
- **user_id**: References auth.users, UNIQUE constraint
  - Why UNIQUE: Ensures one contractor profile per user (1:1 relationship)
  - Why ON DELETE CASCADE: When user account deleted, profile automatically deleted
- **license_type**: Optional text field
  - Example: "General Contractor", "Electrical", "Plumbing"
  - Why TEXT: Flexible, no enum restriction on license types
- **license_number**: Optional text field
  - Stores official license number for verification
  - ⚠️ Warning: No encryption - sensitive data stored in plain text
- **specializations**: Array of text, defaults to empty array
  - Why array: Contractors can have multiple specializations
  - Example: `['excavation', 'grading', 'paving']`
- **years_experience**: Integer, defaults to 0
  - Used for filtering/sorting experienced contractors
- **company_name**: Optional text
  - Differentiates business contractors from individual contractors
- **service_areas**: Array of text, defaults to empty array
  - Geographic regions contractor operates in
  - Example: `['Tel Aviv', 'Jerusalem', 'Haifa']`
- **is_verified**: Boolean, defaults to false
  - Admin-controlled flag for verified contractors
  - Important for trust/safety features
- **rating**: Numeric, defaults to 0
  - Average rating score (likely 0-5 scale)
  - ⚠️ Note: Separate from worker ratings
- **total_ratings**: Integer, defaults to 0
  - Counter for number of ratings received
  - Used to calculate weighted averages

**Why This Design**:
- Contractors need business-specific fields (company, license, verification)
- Separate ratings system for contractor role vs worker role
- Flexible specializations allows multi-service contractors

**Issues Identified**:
1. ❌ **No CHECK constraint on rating**: Should be `CHECK (rating >= 0 AND rating <= 5)`
2. ⚠️ **Plain text license_number**: Consider encryption for PII
3. ℹ️ **No rating calculation trigger**: Rating must be manually updated (unlike worker_profiles)

---

### Lines 18-27: Customer Profiles Table Creation
```sql
-- Create customer_profiles table
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

**What it does**: Creates minimal profile table for customer user type

**Field-by-Field Breakdown**:
- **id** / **user_id**: Same pattern as contractor_profiles
  - UNIQUE constraint ensures 1:1 relationship with users
  - CASCADE delete maintains referential integrity
- **city**: Optional text
  - General location for service matching
- **address**: Optional text
  - Specific location for service delivery
  - ⚠️ Warning: No encryption - address is sensitive PII
- **project_description**: Optional text
  - Free-text field describing customer's needs
  - Used for matching with service providers

**Why This Design**:
- Intentionally minimal - customers don't need extensive profiles
- Focus on location and project needs for service matching
- Can be expanded later without breaking changes

**Issues Identified**:
1. ⚠️ **Plain text address**: Consider using PostGIS or encryption
2. ℹ️ **No verification status**: Unlike contractor_profiles, no is_verified field
3. ❌ **No phone or contact fields**: Relies on profiles.phone (may be insufficient)

**Business Logic**:
- Customer role added in migration 7
- This completes the customer feature by adding profile storage
- Likely used for service request marketplace (maintenance, rentals)

---

### Lines 29-32: Worker Profiles Enhancement
```sql
-- Add new columns to worker_profiles
ALTER TABLE public.worker_profiles
ADD COLUMN IF NOT EXISTS owned_equipment text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS equipment_skills text[] DEFAULT '{}';
```

**What it does**: Adds equipment tracking to existing worker_profiles table

**Why ALTER instead of new table**: worker_profiles already exists from migration 1

**Field Breakdown**:
- **owned_equipment**: Array of text, defaults to empty array
  - Tracks which equipment the worker personally owns
  - Example: `['backhoe', 'bobcat']`
  - Business logic: Affects job matching (equipment_only jobs)
- **equipment_skills**: Array of text, defaults to empty array
  - Tracks which equipment worker is certified/skilled to operate
  - Example: `['backhoe', 'loader', 'excavator', 'grader']`
  - May be broader than owned_equipment

**Why IF NOT EXISTS**: Safe idempotency - won't fail if migration runs twice

**Why Both Fields**:
- **owned_equipment**: Worker can bring their own equipment to job
- **equipment_skills**: Worker can operate employer's equipment
- Supports migration 6's service_type feature:
  - 'operator_with_equipment': Requires owned_equipment
  - 'operator_only': Only needs equipment_skills
  - 'equipment_only': May use owned_equipment for rentals

**Issues Identified**:
1. ℹ️ **No validation**: Arrays are free-text, not linked to work_type enum
2. ℹ️ **No structured data**: Should potentially be separate tables for equipment inventory
3. ⚠️ **Duplication risk**: Equipment types may not match work_type enum values

---

### Lines 34-36: Enable RLS
```sql
-- Enable RLS on new tables
ALTER TABLE public.contractor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
```

**What it does**: Enables Row Level Security on both new tables

**Why it's critical**:
- Without RLS, tables would be accessible to all authenticated users
- Supabase recommendation: ALWAYS enable RLS on public tables
- RLS policies (defined below) control who can see/modify data

**Note**: worker_profiles already has RLS from migration 1

---

### Lines 38-49: Contractor Profile RLS Policies
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

**Policy 1: Public Read Access**
- **Scope**: SELECT operations
- **Rule**: `USING (true)` - allows all authenticated users to read
- **Why public**: Contractors are service providers - their profiles need to be discoverable
- **Use case**: Job seekers, customers browse contractor profiles

**Policy 2: Insert Own Profile**
- **Scope**: INSERT operations
- **Rule**: Must be inserting YOUR OWN profile AND have contractor role
- **Security**:
  - `auth.uid() = user_id`: Prevents creating profiles for other users
  - `has_role(auth.uid(), 'contractor'::app_role)`: Requires contractor role
- **Prevents**: Users creating contractor profiles without contractor role

**Policy 3: Update Own Profile**
- **Scope**: UPDATE operations
- **Rule**: Can only update YOUR OWN profile AND must have contractor role
- **Security**: Same as insert policy

**Missing Policies**:
- ❌ **No DELETE policy**: Contractors cannot delete their own profiles
  - Intentional: Profile deletion should be through account deletion (CASCADE)
- ❌ **No admin policy**: Admins cannot update contractor profiles yet
  - Fixed later in migration 15

---

### Lines 51-62: Customer Profile RLS Policies
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

**Identical Pattern**: Exact same structure as contractor policies

**Policy 1: Public Read**
- **USING (true)**: All authenticated users can view
- ⚠️ **Security Concern**: Customer addresses are publicly visible
  - Should customers' addresses be public?
  - Consider policy: `USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'))`
  - Or: Remove address from public view, share only with accepted service providers

**Policy 2 & 3: Insert/Update Own Profile**
- Same security as contractor profiles
- Requires customer role (from migration 7)

**Missing Policies**:
- ❌ **No DELETE policy**: Same as contractor profiles
- ❌ **No admin policy**: Fixed in migration 15

---

### Lines 64-71: Updated_at Triggers
```sql
-- Add triggers for updated_at
CREATE TRIGGER update_contractor_profiles_updated_at
BEFORE UPDATE ON public.contractor_profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_customer_profiles_updated_at
BEFORE UPDATE ON public.customer_profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

**What it does**: Automatically updates updated_at timestamp on row changes

**How it works**:
1. **BEFORE UPDATE**: Trigger fires before UPDATE completes
2. **FOR EACH ROW**: Runs once per affected row
3. **EXECUTE FUNCTION public.handle_updated_at()**: Calls function from migration 1
   - That function sets `NEW.updated_at = NOW()`

**Why it's important**:
- Tracks when profiles were last modified
- Useful for caching, audit trails, "last updated" UI
- Automatic - developers don't need to remember to set it

**Consistency Note**:
- ✅ Migration 1 created handle_updated_at() function
- ✅ Migration 1 added triggers to profiles, worker_profiles, job_requests
- ✅ This migration adds triggers to contractor_profiles, customer_profiles
- ❌ Migration 4 added conversations table with updated_at but NO TRIGGER
- ❌ Migration 10 will add fuel_orders, equipment_maintenance with triggers

---

## Schema Changes Summary

### New Tables Created
1. **contractor_profiles**
   - Purpose: Store contractor-specific profile data
   - Key fields: company_name, license, specializations, rating
   - Relationships: user_id → auth.users (1:1)

2. **customer_profiles**
   - Purpose: Store customer-specific profile data
   - Key fields: city, address, project_description
   - Relationships: user_id → auth.users (1:1)

### Tables Modified
1. **worker_profiles**
   - Added: owned_equipment text[]
   - Added: equipment_skills text[]

### RLS Policies Created
- contractor_profiles: 3 policies (SELECT public, INSERT own, UPDATE own)
- customer_profiles: 3 policies (SELECT public, INSERT own, UPDATE own)

### Triggers Created
- update_contractor_profiles_updated_at
- update_customer_profiles_updated_at

---

## Integration Notes

### Dependencies
- **Requires Migration 1**:
  - handle_updated_at() function
  - worker_profiles table
- **Requires Migration 3**:
  - has_role() function
  - app_role enum
- **Requires Migration 7**:
  - 'customer' role in app_role enum

### Modified By Later Migrations
- **Migration 13**: Adds bio column to contractor_profiles and worker_profiles
- **Migration 15**: Adds admin SELECT/UPDATE policies for both tables
- **Migration 16**: Adds service provider fields to contractor_profiles
  - is_service_provider, service_specializations, completed_services, portfolio_images
  - Creates overlap/redundancy (see Issues section)

### Data Migration Considerations
- No automatic profile creation for existing users
- Users must manually create contractor/customer profiles
- Worker profiles automatically enhanced (new columns default to '{}')

---

## Issues & Recommendations

### Security Issues
1. **🔴 Critical: Public customer addresses**
   - Problem: Anyone can view customer addresses
   - Impact: Privacy violation, potential security risk
   - Fix: Change SELECT policy to restrict address visibility
   ```sql
   CREATE POLICY "Users can view limited customer profiles"
   ON public.customer_profiles FOR SELECT
   USING (
     auth.uid() = user_id OR has_role(auth.uid(), 'admin')
   );
   ```

2. **⚠️ Unencrypted PII**
   - license_number, address stored in plain text
   - Consider encryption for sensitive fields

### Architecture Issues
1. **🟡 No rating calculation logic**
   - contractor_profiles has rating/total_ratings fields
   - No trigger to automatically update (unlike worker_profiles)
   - Must be updated manually in application code
   - Inconsistent with worker rating pattern from migration 1

2. **🟡 Redundant service provider concept**
   - Migration 16 adds is_service_provider to contractor_profiles
   - Migration 18 creates separate technician_profiles table
   - Results in dual approach:
     - Contractors who are service providers (via flag)
     - Dedicated technician user type
   - **Recommendation**: Choose one approach for unified migration

3. **🟡 Array fields not validated**
   - owned_equipment, equipment_skills are free-text arrays
   - Not constrained to work_type enum values
   - Typos possible: 'backh0e' vs 'backhoe'
   - **Fix**: Consider junction tables or foreign keys

### Missing Features
1. ❌ **No DELETE policies**
   - Users cannot delete their own profiles
   - Intentional?: Relies on CASCADE delete from auth.users

2. ❌ **No contractor rating trigger**
   - Worker ratings auto-update in migration 1
   - Contractor ratings must be updated manually
   - Inconsistent behavior

3. ❌ **No admin policies yet**
   - Added later in migration 15

---

## For Unified Migration

### Consolidation Opportunities
1. **Merge with Migration 7**
   - Migration 7 adds customer role (2 lines)
   - This migration adds customer_profiles table
   - Can be combined into single "Add Customer Role & Profile" section

2. **Integrate rating trigger**
   - Add auto-update rating trigger for contractor_profiles
   - Match the pattern from worker_profiles in migration 1

3. **Standardize service provider concept**
   - Decision point: Use contractor flag OR separate technician_profiles?
   - If using contractor flag: Don't create technician_profiles (skip migration 18)
   - If using technician_profiles: Don't add service provider fields (skip migration 16 additions)

### Sequencing in Unified Migration
```
1. Enums (user_role → app_role with all roles at once)
2. Core tables (profiles, worker_profiles)
3. Extended profiles (contractor_profiles, customer_profiles, technician_profiles)
4. All RLS policies together
5. All triggers together
```

### Improvements for Unified Version
1. **Add CHECK constraints**:
   ```sql
   rating numeric DEFAULT 0 CHECK (rating >= 0 AND rating <= 5)
   ```

2. **Restrict customer address visibility**:
   ```sql
   -- Separate policy for full profile access
   CREATE POLICY "Customers and admins can view full profiles"
   ON customer_profiles FOR SELECT
   USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
   ```

3. **Add contractor rating trigger**:
   ```sql
   CREATE FUNCTION update_contractor_rating() ...
   CREATE TRIGGER on_contractor_rating_created ...
   ```

4. **Equipment validation**:
   - Option A: Add CHECK constraint linking to work_type enum
   - Option B: Create equipment_inventory table with foreign keys

5. **Add admin policies immediately** (don't wait for migration 15):
   ```sql
   CREATE POLICY "Admin can update all contractor profiles"
   ON contractor_profiles FOR UPDATE
   USING (has_role(auth.uid(), 'admin'));
   ```

### Dead Code to Remove
- None in this migration, but creates redundancies resolved in later migrations

---

## Use Cases

### Contractor Profile Use Cases
1. **Company Verification**
   ```sql
   SELECT * FROM contractor_profiles
   WHERE is_verified = true
   AND 'excavation' = ANY(specializations);
   ```

2. **Rating-Based Search**
   ```sql
   SELECT * FROM contractor_profiles
   WHERE rating >= 4.5 AND total_ratings >= 10
   ORDER BY rating DESC;
   ```

3. **Service Area Filtering**
   ```sql
   SELECT * FROM contractor_profiles
   WHERE 'Tel Aviv' = ANY(service_areas);
   ```

### Customer Profile Use Cases
1. **Location-Based Matching**
   ```sql
   SELECT * FROM customer_profiles
   WHERE city = 'Jerusalem';
   ```

2. **Project Matching**
   ```sql
   SELECT * FROM customer_profiles
   WHERE project_description ILIKE '%excavation%';
   ```

### Worker Equipment Use Cases
1. **Find Workers With Own Equipment**
   ```sql
   SELECT * FROM worker_profiles
   WHERE 'backhoe' = ANY(owned_equipment);
   ```

2. **Skill-Based Job Matching**
   ```sql
   -- For 'operator_only' service_type
   SELECT * FROM worker_profiles
   WHERE 'excavator' = ANY(equipment_skills);
   ```

3. **Equipment Owners for Rental**
   ```sql
   -- For 'equipment_only' service_type
   SELECT DISTINCT unnest(owned_equipment) as equipment_type,
          array_agg(user_id) as owners
   FROM worker_profiles
   WHERE array_length(owned_equipment, 1) > 0
   GROUP BY equipment_type;
   ```

---

## Rollback Considerations

### To Rollback This Migration
```sql
-- Drop triggers first
DROP TRIGGER IF EXISTS update_contractor_profiles_updated_at ON public.contractor_profiles;
DROP TRIGGER IF EXISTS update_customer_profiles_updated_at ON public.customer_profiles;

-- Drop tables (CASCADE removes policies)
DROP TABLE IF EXISTS public.contractor_profiles CASCADE;
DROP TABLE IF EXISTS public.customer_profiles CASCADE;

-- Remove columns from worker_profiles
ALTER TABLE public.worker_profiles DROP COLUMN IF EXISTS owned_equipment;
ALTER TABLE public.worker_profiles DROP COLUMN IF EXISTS equipment_skills;
```

### Data Loss Warning
- ⚠️ All contractor profile data lost (company names, licenses, ratings)
- ⚠️ All customer profile data lost (addresses, project descriptions)
- ⚠️ Worker equipment data lost (owned_equipment, equipment_skills)

### Rollback Blockers
- If migration 13 or 16 has run (adds more columns to contractor_profiles)
- If maintenance_requests reference contractor_profiles (migration 9)
- If admin policies reference these tables (migration 15)

---

## Testing Checklist

### Contractor Profiles
- [ ] Contractor can create their own profile
- [ ] Contractor cannot create profile for another user
- [ ] Non-contractor cannot create contractor profile
- [ ] Contractor can update own profile
- [ ] Contractor cannot update another contractor's profile
- [ ] All users can view contractor profiles
- [ ] updated_at changes on UPDATE
- [ ] Profile deleted when user account deleted (CASCADE)

### Customer Profiles
- [ ] Customer can create their own profile
- [ ] Customer cannot create profile for another user
- [ ] Non-customer cannot create customer profile
- [ ] Customer can update own profile
- [ ] Customer cannot update another customer's profile
- [ ] All users can view customer profiles (⚠️ including addresses)
- [ ] updated_at changes on UPDATE
- [ ] Profile deleted when user account deleted (CASCADE)

### Worker Profiles Enhancement
- [ ] Existing worker_profiles gain new columns with default '{}'
- [ ] Can add equipment to owned_equipment array
- [ ] Can add skills to equipment_skills array
- [ ] Array fields accept empty arrays
- [ ] Array fields accept multiple values

### RLS Security
- [ ] Cannot INSERT with mismatched user_id
- [ ] Cannot INSERT without required role
- [ ] Cannot bypass WITH CHECK constraint
- [ ] Cannot UPDATE other users' profiles
- [ ] No DELETE operations possible (intentional)

---

## Conclusion

Migration 08 represents a major architectural advancement, moving from a flat profile structure to role-specific profile specialization. By creating dedicated tables for contractors and customers, and enhancing worker profiles with equipment tracking, this migration enables the platform to support a multi-sided marketplace with distinct user types.

**Key Achievements**:
- ✅ Dedicated contractor profiles with business data
- ✅ Customer profiles for service requests
- ✅ Worker equipment tracking for flexible job matching
- ✅ Full RLS security for all new tables
- ✅ Automated timestamp management

**Critical Issues to Address**:
- 🔴 Customer address privacy (public visibility)
- 🟡 Missing contractor rating automation
- 🟡 Future redundancy with service provider/technician concept

This migration sets the foundation for migrations 9-12 which add marketplace features (maintenance requests, fuel orders, subscriptions) that depend on these specialized profile types.
