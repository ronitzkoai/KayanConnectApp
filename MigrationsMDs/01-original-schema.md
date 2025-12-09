# Migration 01: Original Schema

## Migration Info
- **Filename**: `20251127105427_4d5001c4-e12b-4b66-b789-e306edf53afa.sql`
- **Timestamp**: November 27, 2025 at 10:54:27
- **Purpose**: Initial database schema setup for a job marketplace connecting contractors with workers
- **Size**: 226 lines
- **Dependencies**: None (first migration)

## Overview
This migration establishes the complete foundation for a job marketplace platform where contractors can post job requests and workers can accept them. It includes user profiles, worker specializations, job management, and a rating system.

---

## Line-by-Line Analysis

### Lines 1-2: UUID Extension
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```
**What it does**: Enables PostgreSQL's UUID generation extension
**Why it's needed**: Allows the database to generate UUIDs for primary keys using `uuid_generate_v4()`
**Note**: Modern PostgreSQL (14+) has `gen_random_uuid()` built-in, but `uuid-ossp` is compatible with older versions

---

### Lines 4-5: User Role Enum
```sql
-- Create user roles enum
CREATE TYPE user_role AS ENUM ('contractor', 'worker', 'admin');
```
**What it does**: Creates an enumerated type defining three user roles
**Why it's needed**: Enforces type safety - users can only be contractors (who post jobs), workers (who accept jobs), or admins
**Issues**:
- **REPLACED IN MIGRATION 3**: This enum is replaced by `app_role` but never dropped, creating duplicate types
- In migration 3, this should be dropped with `DROP TYPE user_role;`

---

### Lines 7-16: Work Type Enum
```sql
-- Create work types enum
CREATE TYPE work_type AS ENUM (
  'backhoe',
  'loader',
  'bobcat',
  'grader',
  'truck_driver',
  'semi_trailer',
  'laborer'
);
```
**What it does**: Defines types of construction/heavy equipment work available
**Why it's needed**:
- Standardizes job categories across the platform
- Allows type-safe filtering and matching between jobs and workers
- Prevents typos or invalid work types

**Business Logic**: These represent specialized construction equipment and labor categories

---

### Lines 18-19: Urgency Level Enum
```sql
-- Create urgency levels enum
CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high', 'urgent');
```
**What it does**: Defines priority levels for job requests
**Why it's needed**:
- Helps workers prioritize which jobs to accept
- Could be used for sorting/filtering in the UI
- May affect notification logic or payment rates

---

### Lines 21-22: Job Status Enum
```sql
-- Create job status enum
CREATE TYPE job_status AS ENUM ('open', 'accepted', 'completed', 'cancelled');
```
**What it does**: Tracks the lifecycle of a job request
**Why it's needed**:
- **open**: Job is available for workers to accept
- **accepted**: A worker has claimed the job
- **completed**: Work is done (enables rating)
- **cancelled**: Job was cancelled by contractor

**Business Logic**: Status must be 'completed' before a rating can be created (enforced in ratings policy)

---

### Lines 24-32: Profiles Table
```sql
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
**What it does**: Creates the main user profile table
**Why each column**:
- `id UUID`: Primary key that references Supabase Auth's users table
- `REFERENCES auth.users(id)`: Foreign key ensures profile can only exist if auth user exists
- `ON DELETE CASCADE`: When auth user is deleted, profile is automatically deleted
- `role user_role NOT NULL`: Every user must have exactly one role (CHANGED IN MIGRATION 3)
- `full_name TEXT NOT NULL`: Display name for the user
- `phone TEXT`: Optional phone contact (nullable)
- `created_at` / `updated_at`: Audit timestamps

**Issues**:
- **MODIFIED IN MIGRATION 3**: The `role` column is dropped and moved to a separate `user_roles` table to support multiple roles per user

---

### Lines 34-48: Worker Profiles Table
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
**What it does**: Extends profile information specifically for workers
**Why each column**:
- `id UUID`: Separate primary key (not the user_id) for flexibility
- `user_id UUID`: References the profile - links worker data to user
- `ON DELETE CASCADE`: If profile deleted, worker profile is also deleted
- `work_type work_type NOT NULL`: What kind of work this worker does (backhoe, loader, etc.)
- `experience_years INTEGER`: How many years of experience (default 0)
- `location TEXT`: Where the worker is based (nullable for flexibility)
- `is_available BOOLEAN`: Whether worker is currently accepting jobs (default true)
- `is_verified BOOLEAN`: Admin verification status (default false for safety)
- `rating DECIMAL(3,2)`: Average rating 0.00-5.00 (AUTO-UPDATED by trigger in lines 180-204)
- `total_ratings INTEGER`: Count of ratings received (AUTO-UPDATED by trigger)
- `UNIQUE(user_id)`: Each user can only have one worker profile

**Business Logic**:
- Only users with role='worker' can create worker profiles (enforced by RLS policy lines 109-116)
- Rating is automatically recalculated when new ratings are added

---

### Lines 50-63: Job Requests Table
```sql
-- Create job requests table
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
**What it does**: Stores job postings created by contractors
**Why each column**:
- `contractor_id UUID`: Who posted the job (must be a contractor via RLS policy)
- `ON DELETE CASCADE`: If contractor profile deleted, their job requests are deleted
- `work_type work_type NOT NULL`: What kind of worker is needed
- `location TEXT NOT NULL`: Where the job is located (required)
- `work_date TIMESTAMP WITH TIME ZONE NOT NULL`: When the work needs to be done (required)
- `urgency urgency_level`: Priority level (defaults to 'medium')
- `notes TEXT`: Additional job details (nullable)
- `status job_status`: Current state of the job (defaults to 'open')
- `accepted_by UUID`: References the worker who accepted the job
- `ON DELETE SET NULL`: If worker profile deleted, job isn't deleted but accepted_by becomes null

**Business Logic**:
- Only contractors can create job requests (enforced by policy lines 123-132)
- Workers can update to accept jobs when status='open' (policy lines 138-140)

**Issues**:
- **EXTENDED IN MIGRATION 6**: Adds `service_type` column for operator vs equipment options

---

### Lines 65-75: Ratings Table
```sql
-- Create ratings table
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES public.job_requests(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(job_id)
);
```
**What it does**: Stores contractor ratings of workers after job completion
**Why each column**:
- `job_id UUID`: Which job is being rated
- `ON DELETE CASCADE`: If job deleted, rating is deleted
- `contractor_id UUID`: Who is giving the rating (must match job's contractor)
- `worker_id UUID`: Who is being rated (must be the worker who accepted the job)
- `rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5)`: 1-5 star rating (constrained)
- `review TEXT`: Optional written review
- `UNIQUE(job_id)`: Each job can only be rated once (prevents duplicate ratings)

**Business Logic**:
- Only the contractor who posted the job can rate (enforced by policy lines 147-157)
- Job must have status='completed' before rating can be created (enforced by policy)
- When rating is inserted, worker's average rating is auto-updated (trigger lines 202-204)

---

### Lines 77-81: Enable Row Level Security (RLS)
```sql
-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
```
**What it does**: Activates Supabase's Row Level Security on all tables
**Why it's needed**:
- Without RLS, tables are inaccessible even with valid auth token
- RLS policies (defined below) control who can read/write which rows
- Critical for multi-tenant security in Supabase

**Security**: With RLS enabled but no policies, tables are locked down by default

---

### Lines 83-94: Profiles Policies
```sql
-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```
**What it does**: Defines access rules for the profiles table

**Policy 1: View all profiles** (lines 84-86)
- `FOR SELECT`: Applies to read operations
- `USING (true)`: Anyone can read any profile
- **Why**: Profiles are public (contractors need to see workers, workers see contractors)

**Policy 2: Update own profile** (lines 88-90)
- `FOR UPDATE`: Applies to modifications
- `USING (auth.uid() = id)`: Can only update if you own the profile
- `auth.uid()`: Supabase function returning current user's ID
- **Why**: Users should only edit their own information

**Policy 3: Insert own profile** (lines 92-94)
- `FOR INSERT`: Applies to new records
- `WITH CHECK (auth.uid() = id)`: Can only create profile for yourself
- **Why**: Prevents users from creating profiles for other people

**Note**: Profile creation typically happens via trigger (lines 175-177), not direct inserts

---

### Lines 96-116: Worker Profiles Policies
```sql
-- Worker profiles policies
CREATE POLICY "Anyone can view worker profiles"
  ON public.worker_profiles FOR SELECT
  USING (true);

CREATE POLICY "Workers can update own profile"
  ON public.worker_profiles FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.id = worker_profiles.user_id
  ));

CREATE POLICY "Workers can insert own profile"
  ON public.worker_profiles FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.id = worker_profiles.user_id
    AND profiles.role = 'worker'
  ));
```
**What it does**: Controls access to worker profile data

**Policy 1: View all worker profiles** (lines 97-99)
- `USING (true)`: Public read access
- **Why**: Contractors need to browse available workers

**Policy 2: Update own worker profile** (lines 101-107)
- Uses subquery to verify: `auth.uid()` matches the worker_profile's `user_id`
- **Why**: Workers can only edit their own profiles

**Policy 3: Insert worker profile** (lines 109-116)
- Checks three conditions:
  1. `profiles.id = auth.uid()`: You're logged in
  2. `profiles.id = worker_profiles.user_id`: The profile belongs to you
  3. `profiles.role = 'worker'`: You have the worker role
- **Why**: Only users with role='worker' can create worker profiles

**Issues**:
- **MODIFIED IN MIGRATION 3**: Policies updated to use `has_role()` function instead of checking profiles.role directly

---

### Lines 118-140: Job Requests Policies
```sql
-- Job requests policies
CREATE POLICY "Anyone can view job requests"
  ON public.job_requests FOR SELECT
  USING (true);

CREATE POLICY "Contractors can create job requests"
  ON public.job_requests FOR INSERT
  WITH CHECK (
    auth.uid() = contractor_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'contractor'
    )
  );

CREATE POLICY "Contractors can update own job requests"
  ON public.job_requests FOR UPDATE
  USING (auth.uid() = contractor_id);

CREATE POLICY "Workers can update job requests to accept"
  ON public.job_requests FOR UPDATE
  USING (status = 'open');
```
**What it does**: Controls job request access

**Policy 1: View all jobs** (lines 119-121)
- `USING (true)`: Public read access
- **Why**: Workers need to see available jobs

**Policy 2: Contractors create jobs** (lines 123-132)
- `auth.uid() = contractor_id`: Must set yourself as contractor
- `profiles.role = 'contractor'`: Must have contractor role
- **Why**: Only contractors can post jobs

**Policy 3: Contractors update own jobs** (lines 134-136)
- `auth.uid() = contractor_id`: Can only update jobs you created
- **Why**: Contractors manage their own job postings

**Policy 4: Workers can accept jobs** (lines 138-140)
- `status = 'open'`: Can only update jobs that are still open
- **Why**: Allows workers to accept open jobs (but not modify completed/cancelled jobs)
- **Note**: This is permissive - ANY authenticated user can update open jobs (not just workers)

**Issues**:
- Policy 4 doesn't verify the user is a worker or set the `accepted_by` field correctly
- **MODIFIED IN MIGRATION 3**: Policies updated to use `has_role()` function

---

### Lines 142-157: Ratings Policies
```sql
-- Ratings policies
CREATE POLICY "Anyone can view ratings"
  ON public.ratings FOR SELECT
  USING (true);

CREATE POLICY "Contractors can create ratings"
  ON public.ratings FOR INSERT
  WITH CHECK (
    auth.uid() = contractor_id
    AND EXISTS (
      SELECT 1 FROM public.job_requests
      WHERE job_requests.id = ratings.job_id
      AND job_requests.contractor_id = auth.uid()
      AND job_requests.status = 'completed'
    )
  );
```
**What it does**: Controls rating creation and viewing

**Policy 1: View all ratings** (lines 143-145)
- `USING (true)`: Public read access
- **Why**: Ratings are public reputation indicators

**Policy 2: Contractors create ratings** (lines 147-157)
- Checks four conditions:
  1. `auth.uid() = contractor_id`: Rating must be from current user
  2. `job_requests.id = ratings.job_id`: Rating must be for an actual job
  3. `job_requests.contractor_id = auth.uid()`: You must be the contractor for that job
  4. `job_requests.status = 'completed'`: Job must be completed before rating
- **Why**: Only the contractor who hired the worker can rate them, and only after work is done

**Issues**:
- **MODIFIED IN MIGRATION 3**: Policy updated to use `has_role()` function

---

### Lines 159-177: Handle New User Function & Trigger
```sql
-- Create function to handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, phone)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'role')::user_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```
**What it does**: Automatically creates a profile when a user signs up

**Function Breakdown** (lines 160-172):
- `RETURNS TRIGGER`: Special return type for trigger functions
- `NEW.id`: The ID of the newly created auth user
- `NEW.raw_user_meta_data->>'role'`: Extracts role from signup metadata (JSON field)
- `::user_role`: Casts the string to the user_role enum
- `COALESCE(NEW.raw_user_meta_data->>'full_name', '')`: Gets full_name or empty string if null
- `SECURITY DEFINER`: Function runs with creator's permissions, not caller's

**Trigger** (lines 175-177):
- `AFTER INSERT ON auth.users`: Fires after new user is created in Supabase Auth
- `FOR EACH ROW`: Runs once per new user

**Why it's needed**:
- Keeps profiles table in sync with auth.users automatically
- User provides role/full_name/phone during signup, and they're stored in the profile

**Issues**:
- **MISSING SECURITY FIX**: Should include `SET search_path` (fixed in migration 2)
- **MODIFIED IN MIGRATION 3**: Updated to also create user_roles entry

---

### Lines 179-204: Update Worker Rating Function & Trigger
```sql
-- Create function to update worker rating
CREATE OR REPLACE FUNCTION public.update_worker_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.worker_profiles
  SET
    rating = (
      SELECT AVG(rating)::DECIMAL(3,2)
      FROM public.ratings
      WHERE worker_id = NEW.worker_id
    ),
    total_ratings = (
      SELECT COUNT(*)
      FROM public.ratings
      WHERE worker_id = NEW.worker_id
    ),
    updated_at = NOW()
  WHERE id = NEW.worker_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for rating updates
CREATE TRIGGER on_rating_created
  AFTER INSERT ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_worker_rating();
```
**What it does**: Auto-updates worker's average rating when a new rating is added

**Function Breakdown** (lines 180-199):
- `NEW.worker_id`: The worker who was just rated
- `AVG(rating)::DECIMAL(3,2)`: Calculates average of all ratings for this worker (rounded to 2 decimals)
- `COUNT(*)`: Counts total number of ratings
- `updated_at = NOW()`: Updates timestamp
- `WHERE id = NEW.worker_id`: Updates the specific worker's profile

**Trigger** (lines 202-204):
- `AFTER INSERT ON public.ratings`: Fires after a new rating is created
- `FOR EACH ROW`: Runs once per rating

**Why it's needed**:
- Maintains denormalized rating data for performance
- Avoids calculating averages on every profile query
- Real-time rating updates

**Issues**:
- **MISSING SECURITY FIX**: Should include `SET search_path` (fixed in migration 2)

---

### Lines 206-226: Updated At Trigger Function & Triggers
```sql
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_worker_profiles
  BEFORE UPDATE ON public.worker_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_job_requests
  BEFORE UPDATE ON public.job_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```
**What it does**: Automatically updates `updated_at` timestamp when rows are modified

**Function Breakdown** (lines 207-213):
- `NEW.updated_at = NOW()`: Sets the updated_at field to current timestamp
- `RETURN NEW`: Returns the modified row
- `BEFORE UPDATE`: Runs before the update is saved
- **Note**: This function is NOT `SECURITY DEFINER` (runs with caller's permissions)

**Triggers** (lines 216-226):
- Three identical triggers for profiles, worker_profiles, and job_requests
- `BEFORE UPDATE`: Modifies the row before it's saved
- `FOR EACH ROW`: Runs once per updated row

**Why it's needed**:
- Audit trail - track when records were last modified
- Common pattern for updated_at maintenance

**Issues**:
- **MISSING SECURITY FIX**: Should include `SET search_path` (fixed in migration 2)
- **NOT APPLIED TO CONVERSATIONS TABLE**: Migration 4 adds conversations table with updated_at but no trigger

---

## Schema Changes Summary

### New Enums Created
1. **user_role**: contractor, worker, admin (REPLACED in migration 3)
2. **work_type**: backhoe, loader, bobcat, grader, truck_driver, semi_trailer, laborer
3. **urgency_level**: low, medium, high, urgent
4. **job_status**: open, accepted, completed, cancelled

### New Tables Created
1. **profiles**: User profile information (role, name, phone)
2. **worker_profiles**: Worker-specific data (work_type, experience, ratings)
3. **job_requests**: Job postings from contractors
4. **ratings**: Worker ratings from contractors

### New Functions Created
1. **handle_new_user()**: Auto-creates profile when user signs up
2. **update_worker_rating()**: Auto-updates worker rating when rated
3. **handle_updated_at()**: Auto-updates updated_at timestamps

### New Triggers Created
1. **on_auth_user_created**: Calls handle_new_user() on signup
2. **on_rating_created**: Calls update_worker_rating() after rating
3. **set_updated_at_profiles**: Updates profiles.updated_at
4. **set_updated_at_worker_profiles**: Updates worker_profiles.updated_at
5. **set_updated_at_job_requests**: Updates job_requests.updated_at

---

## Integration Notes

### Dependencies
- **Supabase Auth**: Relies on `auth.users` table and `auth.uid()` function
- **PostgreSQL Extensions**: Requires `uuid-ossp` extension

### Foreign Key Relationships
```
auth.users (Supabase)
    └─> profiles (id)
        ├─> worker_profiles (user_id)
        │   └─> job_requests (accepted_by)
        │   └─> ratings (worker_id)
        ├─> job_requests (contractor_id)
        └─> ratings (contractor_id)

job_requests (id)
    └─> ratings (job_id)
```

### Modified by Later Migrations
- **Migration 2**: Adds `SET search_path` to all functions for security
- **Migration 3**:
  - Drops `profiles.role` column
  - Replaces `user_role` enum with `app_role` enum
  - Creates `user_roles` table for many-to-many relationships
  - Updates all policies to use `has_role()` function
  - Updates `handle_new_user()` function
- **Migration 6**: Adds `service_type` column to `job_requests`

---

## Issues & Recommendations

### Critical Issues

1. **User Role Enum Becomes Unused**
   - **Problem**: The `user_role` enum is replaced by `app_role` in migration 3 but never dropped
   - **Location**: Line 5
   - **Impact**: Clutters schema, causes confusion
   - **Fix**: Add to unified migration: Don't create `user_role` at all, use `app_role` from the start

2. **Missing Search Path in Functions**
   - **Problem**: Functions lack `SET search_path` for security
   - **Locations**: Lines 160, 180, 207
   - **Security Risk**: Functions could be vulnerable to search_path manipulation attacks
   - **Fix**: Fixed in migration 2 (add `SET search_path = public` to all SECURITY DEFINER functions)

3. **Worker Job Acceptance Policy Too Permissive**
   - **Problem**: "Workers can update job requests to accept" policy (line 139) allows ANY authenticated user to modify open jobs
   - **Location**: Lines 138-140
   - **Security Risk**: Contractors or admins could accept jobs
   - **Fix**: Should verify user has worker role and properly set accepted_by field

### Minor Issues

4. **Profile Creation Depends on Metadata**
   - **Problem**: Assumes signup provides role, full_name, phone in metadata
   - **Location**: Lines 163-169
   - **Risk**: If metadata is missing or malformed, profile creation fails
   - **Recommendation**: Add error handling or default values

5. **UUID Extension is Legacy**
   - **Problem**: Uses `uuid-ossp` extension which is older
   - **Location**: Line 2
   - **Recommendation**: PostgreSQL 14+ has `gen_random_uuid()` built-in, but `uuid-ossp` works for compatibility

---

## Rollback Considerations

### To Rollback This Migration
```sql
-- Drop triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_rating_created ON public.ratings;
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
DROP TRIGGER IF EXISTS set_updated_at_worker_profiles ON public.worker_profiles;
DROP TRIGGER IF EXISTS set_updated_at_job_requests ON public.job_requests;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_worker_rating();
DROP FUNCTION IF EXISTS public.handle_updated_at();

-- Drop tables (order matters for foreign keys)
DROP TABLE IF EXISTS public.ratings;
DROP TABLE IF EXISTS public.job_requests;
DROP TABLE IF EXISTS public.worker_profiles;
DROP TABLE IF EXISTS public.profiles;

-- Drop enums
DROP TYPE IF EXISTS job_status;
DROP TYPE IF EXISTS urgency_level;
DROP TYPE IF EXISTS work_type;
DROP TYPE IF EXISTS user_role;

-- Drop extension
DROP EXTENSION IF EXISTS "uuid-ossp";
```

**Warning**: Rollback destroys all data. Only safe in development.

---

## For Unified Migration

### What to Include
✅ All table structures
✅ All enums EXCEPT `user_role` (use `app_role` from migration 3 instead)
✅ All RLS policies (but with `has_role()` function from migration 3)
✅ All functions with `SET search_path = public` security fix
✅ All triggers

### What to Change
🔧 Use `app_role` enum with values: 'contractor', 'worker', 'admin', 'customer'
🔧 Skip creating `profiles.role` column (use `user_roles` table approach from migration 3)
🔧 Add `SET search_path = public` to all SECURITY DEFINER functions
🔧 Include `service_type` column in `job_requests` from the start (migration 6)
🔧 Use consistent `SET search_path = public` syntax (no quotes)

### What to Add
➕ Updated_at trigger for conversations table (missing in migration 4)
➕ Better error handling in handle_new_user function
➕ Stricter policy for worker job acceptance

---

## Conclusion

This migration establishes a solid foundation for a job marketplace platform. The schema is well-structured with proper foreign keys, RLS policies, and automated triggers. However, it has security issues (fixed in migration 2) and undergoes significant refactoring (migration 3) shortly after creation.

For a unified migration, combine this with migrations 2-3 to create a clean, secure schema from the start.
