# Migration 03: Role System Refactor

## Migration Info
- **Filename**: `20251127111859_3782baa0-aa08-4d20-a9c8-8bd9877a379a.sql`
- **Timestamp**: November 27, 2025 at 11:18:59 (2.5 hours after migration 1)
- **Purpose**: Major refactor to support multiple roles per user
- **Size**: 120 lines
- **Dependencies**: Migrations 1 & 2 (modifies schema and functions)

## Overview
This migration fundamentally changes how roles work in the application. Instead of each user having a single role stored in `profiles.role`, roles are now stored in a separate `user_roles` table with a many-to-many relationship. This allows users to have multiple roles (e.g., someone could be both a contractor and a worker).

**Major Changes**:
1. Creates new `app_role` enum (separate from `user_role`)
2. Creates new `user_roles` table
3. Migrates existing role data from `profiles.role` to `user_roles`
4. Drops the `role` column from `profiles`
5. Creates `has_role()` helper function
6. Updates all RLS policies to use `has_role()`
7. Updates `handle_new_user()` function

---

## Design Decision: Why Refactor Roles?

### Old System (Migrations 1-2)
- Each user has exactly ONE role stored in `profiles.role`
- Role is a required column: `role user_role NOT NULL`
- Users cannot have multiple roles

### New System (Migration 3+)
- Users can have multiple roles via `user_roles` table
- Roles are stored separately from profiles
- More flexible for real-world use cases

### Real-World Use Case
A person could be:
- A **contractor** (posts jobs)
- AND a **worker** (accepts jobs)
- At the same time

The old system forced them to choose one identity, the new system supports both.

---

## Line-by-Line Analysis

### Lines 1-2: Create New app_role Enum
```sql
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('contractor', 'worker', 'admin');
```
**What it does**: Creates a new enum type with the same three roles as before
**Why a new enum**: Can't easily modify existing `user_role` enum while it's in use
**Values**: 'contractor', 'worker', 'admin' (same as user_role)

**Issues**:
- **DUPLICATE ENUM**: The `user_role` enum from migration 1 still exists and is never dropped
- **NAMING**: Why "app_role" instead of just updating user_role? Likely for cleaner migration
- **EXTENDED IN MIGRATION 7**: 'customer' value added later

**Why This Approach**:
Safer to create new enum and migrate than to try modifying `user_role` while it's actively in use by the profiles table.

---

### Lines 4-11: Create user_roles Table
```sql
-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);
```
**What it does**: Creates a junction table for many-to-many user-role relationships

**Column Breakdown**:
- `id UUID`: Primary key for each role assignment
- `DEFAULT gen_random_uuid()`: Uses modern PostgreSQL UUID generation (not uuid_generate_v4 from uuid-ossp)
- `user_id UUID`: References the auth user
- `REFERENCES auth.users(id)`: Links directly to auth table (not profiles)
- `ON DELETE CASCADE`: When user deleted, all their roles are deleted
- `NOT NULL`: Every role assignment must have a user
- `role app_role NOT NULL`: Which role is assigned
- `created_at TIMESTAMPTZ`: When role was assigned
- `UNIQUE (user_id, role)`: User can't have the same role twice

**Design Decision: Why reference auth.users instead of profiles?**
- More direct relationship
- Roles are fundamental to identity (like auth)
- Profiles could theoretically be optional, roles are not

**How Many-to-Many Works**:
```
User A -> user_roles -> contractor
       -> user_roles -> worker

User B -> user_roles -> admin
```

---

### Lines 13-14: Enable RLS
```sql
-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
```
**What it does**: Activates Row Level Security on the new table
**Why needed**: Without RLS, table is inaccessible in Supabase
**Policies**: Created later in lines 42-51

---

### Lines 16-29: Create has_role Function
```sql
-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```
**What it does**: Helper function to check if a user has a specific role

**Function Breakdown**:
- **Parameters**:
  - `_user_id UUID`: Which user to check
  - `_role app_role`: Which role to look for
- **Returns**: TRUE if user has the role, FALSE otherwise
- `LANGUAGE sql`: Simple SQL function (not plpgsql)
- `STABLE`: Function doesn't modify data and returns same result for same inputs within a transaction
- `SECURITY DEFINER`: Runs with creator's permissions (can read user_roles)
- `SET search_path = public`: Security fix (learned from migration 2)
- `EXISTS`: Efficiently checks if any matching row exists
- `SELECT 1`: Dummy select (EXISTS only cares if row exists, not what's selected)

**Why SECURITY DEFINER**:
RLS policies need to check roles, but they run in the context of the user making the request. SECURITY DEFINER allows policies to query user_roles even if the user couldn't normally access that data.

**Usage in Policies**:
```sql
WHERE public.has_role(auth.uid(), 'contractor')
```

---

### Lines 31-33: Migrate Existing Data
```sql
-- Migrate existing roles from profiles to user_roles (convert via text)
INSERT INTO user_roles (user_id, role)
SELECT id, (role::text)::app_role FROM public.profiles;
```
**What it does**: Copies all existing roles from `profiles.role` to `user_roles` table

**How It Works**:
- `SELECT id, (role::text)::app_role FROM public.profiles`: Gets each user's ID and role
- `(role::text)::app_role`: Double casting:
  1. `user_role::text`: Converts old enum to text string
  2. `::app_role`: Converts text to new enum
- `INSERT INTO user_roles (user_id, role)`: Creates new role assignment

**Why Double Cast**:
Can't directly cast from `user_role` enum to `app_role` enum - must go through text as an intermediate type.

**Data Safety**:
- ✅ Preserves all existing role assignments
- ✅ Creates one user_roles row per user
- ⚠️ Assumes all profiles have valid roles that match app_role values
- ⚠️ If any profiles have NULL or invalid roles, this migration fails

**Result**:
Every existing user gets their current role copied to the new user_roles table.

---

### Lines 35-40: Drop Old Policies
```sql
-- Drop old policies that depend on profiles.role
DROP POLICY IF EXISTS "Contractors can create job requests" ON public.job_requests;
DROP POLICY IF EXISTS "Workers can insert own profile" ON public.worker_profiles;

-- Drop the role column from profiles
ALTER TABLE public.profiles DROP COLUMN role;
```
**What it does**: Removes policies that reference `profiles.role`, then drops the column

**Why Drop Policies First**:
- Policies reference `profiles.role` in their WHERE clauses
- Can't drop a column while policies depend on it
- Must drop policies, drop column, then recreate policies with new logic

**Policies Being Dropped**:
1. **"Contractors can create job requests"**: Checked `profiles.role = 'contractor'`
2. **"Workers can insert own profile"**: Checked `profiles.role = 'worker'`

**Line 40: Drop role column**:
- `ALTER TABLE public.profiles DROP COLUMN role`: Permanently removes the role column
- ⚠️ **IRREVERSIBLE**: This data is gone from profiles (but preserved in user_roles)
- All code/queries referencing `profiles.role` will now break

**Why This Order is Safe**:
1. Data migrated to user_roles (line 32)
2. Policies dropped (lines 36-37)
3. Column dropped (line 40)
4. New policies created (lines 42-91)

---

### Lines 42-51: RLS Policies for user_roles Table
```sql
-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own roles during signup"
ON public.user_roles
FOR INSERT
WITH CHECK (auth.uid() = user_id);
```
**What it does**: Controls access to the user_roles table

**Policy 1: View own roles** (lines 43-46)
- `FOR SELECT`: Applies to read operations
- `USING (auth.uid() = user_id)`: Can only see your own role assignments
- **Why**: Users should see their own roles, but not other users' roles

**Policy 2: Insert own roles during signup** (lines 48-51)
- `FOR INSERT`: Applies to creating new role assignments
- `WITH CHECK (auth.uid() = user_id)`: Can only assign roles to yourself
- **Why**: Prevents users from giving themselves unauthorized roles
- **Note**: "during signup" in the name suggests this is meant for initial role assignment

**Security Consideration**:
These policies allow users to assign themselves ANY role (contractor, worker, admin). This might be intentional for signup, but could allow privilege escalation. Consider:
- Should there be application-level role assignment instead of user self-assignment?
- Should admin role require special approval?

---

### Lines 53-63: Recreate Job Request Insert Policy
```sql
-- Create new policies using has_role function
CREATE POLICY "Contractors can create job requests"
ON public.job_requests
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'contractor'));

DROP POLICY IF EXISTS "Contractors can update own job requests" ON public.job_requests;
CREATE POLICY "Contractors can update own job requests"
ON public.job_requests
FOR UPDATE
USING (auth.uid() = contractor_id AND public.has_role(auth.uid(), 'contractor'));
```
**What it does**: Recreates job request policies using the new `has_role()` function

**Policy 1: Contractors can create** (lines 54-57)
- **Old version** (migration 1): Checked `profiles.role = 'contractor'` via subquery
- **New version**: Uses `public.has_role(auth.uid(), 'contractor')`
- **Simpler**: Single function call instead of EXISTS subquery
- **Behavior**: Only users with contractor role can create job requests

**Policy 2: Contractors can update own jobs** (lines 59-63)
- `DROP POLICY IF EXISTS`: Removes old version first
- **Old version**: Only checked `auth.uid() = contractor_id`
- **New version**: Checks BOTH:
  1. `auth.uid() = contractor_id`: You created the job
  2. `public.has_role(auth.uid(), 'contractor')`: You're still a contractor
- **Why both checks**: Prevents edge case where someone loses contractor role but tries to update old jobs

---

### Lines 65-75: Update Worker Profile Policies
```sql
-- Update worker_profiles policies
CREATE POLICY "Workers can insert own profile"
ON public.worker_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'worker'));

DROP POLICY IF EXISTS "Workers can update own profile" ON public.worker_profiles;
CREATE POLICY "Workers can update own profile"
ON public.worker_profiles
FOR UPDATE
USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'worker'));
```
**What it does**: Recreates worker profile policies using `has_role()`

**Policy 1: Workers can insert profile** (lines 66-69)
- **Old version**: Checked `profiles.role = 'worker'` via subquery
- **New version**: Uses `public.has_role(auth.uid(), 'worker')`
- **Checks**:
  1. `auth.uid() = user_id`: Creating profile for yourself
  2. `public.has_role(auth.uid(), 'worker')`: You have worker role
- **Simpler**: Single function call instead of complex EXISTS

**Policy 2: Workers can update profile** (lines 71-75)
- `DROP POLICY IF EXISTS`: Removes old version
- **Old version**: Only checked profile ownership via subquery
- **New version**: Checks BOTH ownership AND worker role
- **Why**: Ensures you're still a worker when updating worker profile

---

### Lines 77-91: Update Ratings Policy
```sql
-- Update ratings policies
DROP POLICY IF EXISTS "Contractors can create ratings" ON public.ratings;
CREATE POLICY "Contractors can create ratings"
ON public.ratings
FOR INSERT
WITH CHECK (
  auth.uid() = contractor_id AND
  public.has_role(auth.uid(), 'contractor') AND
  EXISTS (
    SELECT 1 FROM job_requests
    WHERE job_requests.id = ratings.job_id
    AND job_requests.contractor_id = auth.uid()
    AND job_requests.status = 'completed'
  )
);
```
**What it does**: Updates ratings policy to use `has_role()`

**Policy: Contractors can create ratings** (lines 79-91)
- `DROP POLICY IF EXISTS`: Removes old version first
- **Checks FOUR conditions**:
  1. `auth.uid() = contractor_id`: Rating is from current user
  2. `public.has_role(auth.uid(), 'contractor')`: User has contractor role
  3. `job_requests.id = ratings.job_id`: Rating is for a real job
  4. `job_requests.contractor_id = auth.uid()`: You were the contractor for that job
  5. `job_requests.status = 'completed'`: Job is completed

**What Changed**:
- **Old version**: Didn't explicitly check contractor role (relied on job_requests.contractor_id matching)
- **New version**: Explicitly verifies contractor role via `has_role()`
- **More secure**: Prevents edge case where user loses contractor role but tries to rate old jobs

---

### Lines 93-120: Update handle_new_user Function
```sql
-- Update handle_new_user function to use user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Get role from metadata and cast to app_role
  user_role := (NEW.raw_user_meta_data->>'role')::app_role;

  -- Insert into profiles (without role)
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone'
  );

  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);

  RETURN NEW;
END;
$$;
```
**What it does**: Updates the signup function to populate both profiles and user_roles

**What Changed from Migration 2**:
- **Line 98: `SET search_path TO 'public'`** - ⚠️ INCONSISTENCY: Uses TO and quotes (migration 2 used = without quotes)
- **Lines 100-101**: New DECLARE block for variable
- **Line 103**: Extracts role to variable instead of inline casting
- **Lines 106-111**: Profile insertion NO LONGER includes role column
- **Lines 114-115**: NEW! Inserts role into user_roles table

**How It Works**:
1. User signs up via Supabase Auth
2. Trigger fires after INSERT on auth.users
3. Function reads role from signup metadata
4. Creates profile record (id, full_name, phone only)
5. Creates user_roles record (links user to their role)
6. Returns NEW to continue

**Data Flow**:
```
Signup Form
  └─> auth.users (Supabase Auth)
      └─> TRIGGER: handle_new_user()
          ├─> profiles (user info)
          └─> user_roles (role assignment)
```

**Issues**:
- ⚠️ **SYNTAX INCONSISTENCY**: Line 98 uses `TO 'public'` instead of `= public`
- ⚠️ **NO ERROR HANDLING**: If role is invalid or missing, function fails
- ⚠️ **SINGLE ROLE**: Only assigns one role during signup (can't assign multiple roles initially)

---

## Schema Changes Summary

### New Objects Created
1. **app_role enum**: 'contractor', 'worker', 'admin'
2. **user_roles table**: Many-to-many user-role relationships
3. **has_role() function**: Helper to check if user has a role

### Modified Objects
1. **profiles table**: `role` column DROPPED
2. **handle_new_user() function**: Updated to populate user_roles
3. **All role-based policies**: Updated to use has_role() function

### Policies Recreated (7 policies)
1. Users can view their own roles (new)
2. Users can insert their own roles during signup (new)
3. Contractors can create job requests (updated)
4. Contractors can update own job requests (updated)
5. Workers can insert own profile (updated)
6. Workers can update own profile (updated)
7. Contractors can create ratings (updated)

---

## Integration Notes

### Dependencies
- **Requires Migrations 1 & 2**: Modifies their schema and functions
- **Data Migration**: Existing role data is preserved

### Modified by Later Migrations
- **Migration 7**: Adds 'customer' value to app_role enum

### Breaking Changes
⚠️ **MAJOR BREAKING CHANGE**:
- Code checking `profiles.role` will fail (column doesn't exist)
- Applications must update to use:
  ```sql
  SELECT * FROM user_roles WHERE user_id = ...
  -- or
  SELECT public.has_role(user_id, 'contractor')
  ```

### Data Integrity
- ✅ All existing roles preserved via data migration (line 32)
- ✅ Foreign keys ensure data consistency
- ✅ UNIQUE constraint prevents duplicate role assignments

---

## Issues & Recommendations

### Critical Issue 1: Orphaned user_role Enum
**Problem**: The original `user_role` enum is never dropped
**Location**: Created in migration 1 line 5, replaced here but not cleaned up
**Impact**: Clutters schema, causes confusion, wastes resources
**Fix for Unified Migration**:
```sql
-- Should add after dropping profiles.role column:
DROP TYPE IF EXISTS user_role;
```

### Critical Issue 2: Inconsistent search_path Syntax
**Problem**: Line 98 uses `SET search_path TO 'public'` (with TO and quotes)
**Comparison**: Migration 2 uses `SET search_path = public` (with = and no quotes)
**Impact**: Inconsistency is confusing, suggests different developers or time periods
**Fix**: Use `SET search_path = public` consistently (both work, but = is more standard)

### Security Issue: Self-Service Role Assignment
**Problem**: Users can insert their own roles (lines 48-51)
**Risk**: Nothing prevents a user from assigning themselves 'admin' role
**Current Policy**:
```sql
WITH CHECK (auth.uid() = user_id)
```
**Better Policy**:
```sql
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('contractor', 'worker')  -- Exclude admin
)
```
**Recommendation**: Admin role should require special approval or be assigned server-side

### Missing: Cleanup for Old Policies
**Issue**: Some old policies are dropped and recreated, but not all
**Inconsistency**:
- Job requests INSERT policy: Recreated without explicit DROP
- Job requests UPDATE policy: Explicitly dropped first (line 59)
- Worker profiles INSERT policy: Recreated without explicit DROP
- Worker profiles UPDATE policy: Explicitly dropped first (line 71)

**Why Inconsistent**: Policies are being replaced/updated at different times
**Recommendation**: Always use `DROP POLICY IF EXISTS` before `CREATE POLICY` for consistency

### Data Migration Risk
**Problem**: Line 32 assumes all profiles have valid roles
**What Could Go Wrong**:
- If any profile has NULL role, migration fails
- If any role value doesn't match app_role values, cast fails
**Mitigation**: Add data validation before migration:
```sql
-- Check for issues first:
SELECT id, role FROM profiles WHERE role IS NULL;
SELECT id, role FROM profiles WHERE role::text NOT IN ('contractor', 'worker', 'admin');
```

---

## Rollback Considerations

### Cannot Easily Rollback
This migration makes IRREVERSIBLE changes:
- ❌ Drops `profiles.role` column
- ❌ Data is moved, not copied

### If You Must Rollback
```sql
-- 1. Re-add role column to profiles
ALTER TABLE public.profiles ADD COLUMN role user_role;

-- 2. Migrate data back from user_roles (takes FIRST role for each user)
UPDATE public.profiles
SET role = (
  SELECT role::text::user_role
  FROM public.user_roles
  WHERE user_roles.user_id = profiles.id
  LIMIT 1
);

-- 3. Make column NOT NULL
ALTER TABLE public.profiles ALTER COLUMN role SET NOT NULL;

-- 4. Drop new objects
DROP FUNCTION IF EXISTS public.has_role(UUID, app_role);
DROP TABLE IF EXISTS public.user_roles;
DROP TYPE IF EXISTS app_role;

-- 5. Recreate old policies (see migration 1)
-- 6. Recreate old handle_new_user function (see migration 2)
```

**Warning**: If users have multiple roles, rollback loses data (only keeps first role).

---

## For Unified Migration

### What to Include
✅ `app_role` enum with all values from the start: 'contractor', 'worker', 'admin', 'customer'
✅ `user_roles` table
✅ `has_role()` function with consistent `SET search_path = public` syntax
✅ All policies using `has_role()` from the start

### What to Skip
❌ Don't create `user_role` enum at all
❌ Don't create `profiles.role` column
❌ Skip the data migration (no data to migrate)
❌ Skip the drop/recreate policy pattern

### What to Fix
🔧 Consistent search_path syntax: `SET search_path = public` (no quotes, use =)
🔧 Add security for admin role assignment
🔧 Add error handling in handle_new_user function
🔧 Consider application-level role management instead of user self-service

### Recommended Approach
In a unified migration:
1. Start with `app_role` enum (not `user_role`)
2. Create `profiles` table WITHOUT role column
3. Create `user_roles` table from the start
4. Create `has_role()` function
5. Create all policies using `has_role()` from day one
6. Create `handle_new_user()` that populates both tables

This avoids all the migration complexity and creates a clean, secure schema from the start.

---

## Design Patterns Demonstrated

### Many-to-Many Relationship Pattern
```
users (1) ←→ (many) user_roles (many) ←→ (1) roles
```
Classic junction table pattern for flexible relationships.

### Security Definer Helper Pattern
Creating a SECURITY DEFINER function to encapsulate permission checks:
- Simplifies policy code
- Centralizes role checking logic
- Allows policies to query restricted tables

### Data Migration Pattern
1. Create new structure
2. Migrate existing data
3. Drop old structure
4. Update dependent code

### Policy Update Pattern
For columns used in policies:
1. Drop policies that reference the column
2. Modify/drop the column
3. Recreate policies with new logic

---

## Conclusion

This is a **major architectural refactor** that changes the fundamental role system from single-role-per-user to multiple-roles-per-user. The migration is well-executed with proper data preservation, but has some inconsistencies:

**Strengths**:
- ✅ Preserves existing data
- ✅ Enables multiple roles per user
- ✅ Uses helper function for cleaner policies
- ✅ Includes security (search_path)

**Weaknesses**:
- ❌ Leaves orphaned user_role enum
- ❌ Inconsistent search_path syntax
- ❌ Potential security issue with self-service admin role
- ❌ No error handling in data migration

For a unified migration, this design is superior to migration 1's single-role approach and should be used from the start.
