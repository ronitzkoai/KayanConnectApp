# Integration Guide: Migration 18
## Technician Profiles Table

**Migration File:** `20251207143020_133e0682-2b11-4b93-9197-043624cb0420.sql`
**Purpose:** Create dedicated technician_profiles table
**Complexity:** Medium
**Size:** 48 lines

---

## Overview

This migration creates a **dedicated profile table for technicians** (service providers), similar to how worker_profiles and contractor_profiles work.

**Why a Separate Table?**
- Technicians have unique fields (portfolio, ratings, availability)
- Follows the existing pattern (worker_profiles, contractor_profiles, customer_profiles)
- Cleaner data model than overloading contractor_profiles

**Relationship to Previous Migrations:**
- Migration 17 added 'technician' to app_role enum ✅
- Migration 16 added service provider fields to contractor_profiles
- **This migration** creates a dedicated technician_profiles table (replaces contractor dual-role approach)

---

## What This Migration Does

Creates the complete technician_profiles infrastructure:

1. **Table:** technician_profiles (17 columns)
2. **RLS:** Enable row-level security
3. **Policies:** 5 RLS policies (public view, self-manage, admin oversight)
4. **Trigger:** updated_at trigger for timestamp management

---

## Integration Method: ADD (Insert New Content)

**Action:** INSERT all content after customer_profiles table

**Why ADD vs EDIT:**
- This is a brand new table that doesn't exist
- Similar to worker_profiles, contractor_profiles, customer_profiles pattern
- Complete standalone table with its own policies

---

## CHANGE: Add technician_profiles Table

### Location: After customer_profiles Table

**Where to Insert:** After line ~380 (after customer_profiles admin policies)

**Context - Insert Between:**
```sql
CREATE POLICY "Admin can update all customer profiles"
ON public.customer_profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- 👇 INSERT TECHNICIAN_PROFILES TABLE HERE

-- RLS policies for fuel_orders
CREATE POLICY "Contractors can view their fuel orders" ...
```

---

### Complete Code to Insert

```sql
-- Create technician_profiles table
CREATE TABLE public.technician_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  specializations TEXT[] DEFAULT '{}'::text[],
  years_experience INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  rating NUMERIC(3,2) DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  portfolio_images TEXT[] DEFAULT '{}'::text[],
  bio TEXT,
  location TEXT,
  completed_services INTEGER DEFAULT 0,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.technician_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view technician profiles"
ON public.technician_profiles FOR SELECT
USING (true);

CREATE POLICY "Technicians can insert own profile"
ON public.technician_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'technician'));

CREATE POLICY "Technicians can update own profile"
ON public.technician_profiles FOR UPDATE
USING (auth.uid() = user_id AND has_role(auth.uid(), 'technician'));

CREATE POLICY "Admin can view all technician profiles"
ON public.technician_profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all technician profiles"
ON public.technician_profiles FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_technician_profiles_updated_at
BEFORE UPDATE ON public.technician_profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
```

---

## Table Schema Breakdown

### technician_profiles Table

| Column | Type | Constraints | Default | Purpose |
|--------|------|-------------|---------|---------|
| `id` | UUID | PRIMARY KEY, NOT NULL | gen_random_uuid() | Unique profile ID |
| `user_id` | UUID | NOT NULL, UNIQUE | - | Links to auth.users |
| `specializations` | TEXT[] | - | '{}' | Services offered (array) |
| `years_experience` | INTEGER | - | 0 | Experience in years |
| `is_verified` | BOOLEAN | - | false | Admin verification status |
| `is_available` | BOOLEAN | - | true | Currently accepting jobs |
| `rating` | NUMERIC(3,2) | - | 0 | Average rating (0.00 to 5.00) |
| `total_ratings` | INTEGER | - | 0 | Count of ratings received |
| `portfolio_images` | TEXT[] | - | '{}' | Work sample image URLs |
| `bio` | TEXT | nullable | null | Profile description |
| `location` | TEXT | nullable | null | Service area/city |
| `completed_services` | INTEGER | - | 0 | Jobs completed counter |
| `phone` | TEXT | nullable | null | Contact phone |
| `created_at` | TIMESTAMPTZ | - | now() | Profile creation time |
| `updated_at` | TIMESTAMPTZ | - | now() | Last update time |

---

## Schema Design Comparison

### Similar to worker_profiles and contractor_profiles

**Common Pattern:**
- `user_id` links to auth.users
- `rating` and `total_ratings` for reputation
- `is_verified` for admin approval
- `bio` for description
- `created_at` / `updated_at` timestamps
- Public SELECT policy (anyone can browse)
- Self-management policies (users update own)
- Admin oversight policies

**Technician-Specific Fields:**
- `portfolio_images` - Visual work samples (array)
- `is_available` - Toggle accepting new jobs
- `completed_services` - Service completion counter
- `phone` - Direct contact (not in worker_profiles)

---

## Why Each Field Exists

### Core Identity
- **user_id:** Links to auth.users account (UNIQUE = one profile per user)
- **id:** Separate UUID for profile-specific operations

### Service Discovery
- **specializations:** What services they offer (e.g., ["engine_repair", "hydraulic_systems"])
- **location:** Service area for local job matching
- **years_experience:** Trust signal for customers
- **phone:** Direct contact for urgent jobs

### Reputation System
- **rating:** Average star rating (calculated from technician_ratings table)
- **total_ratings:** Number of reviews (more = more reliable)
- **is_verified:** Admin-approved/background checked
- **completed_services:** Track record counter

### Availability
- **is_available:** Toggle on/off when busy/vacation
- Enables "Available Now" filtering for customers

### Marketing
- **portfolio_images:** Showcase past work visually
- **bio:** Describe expertise, approach, certifications

### Metadata
- **created_at:** When technician joined
- **updated_at:** Last profile modification (auto-updated by trigger)

---

## RLS Policies Explained

### Policy 1: Public View
```sql
CREATE POLICY "Anyone can view technician profiles"
ON public.technician_profiles FOR SELECT
USING (true);
```

**Who:** Everyone (authenticated or not)
**Action:** SELECT (read)
**Why:** Public marketplace - customers need to browse available technicians

**Security:** Safe because profiles are meant to be public (like business listings)

---

### Policy 2: Self-Insert
```sql
CREATE POLICY "Technicians can insert own profile"
ON public.technician_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'technician'));
```

**Who:** Users with 'technician' role
**Action:** INSERT (create profile)
**Checks:**
1. `auth.uid() = user_id` - Can only create profile for yourself
2. `has_role(auth.uid(), 'technician')` - Must have technician role

**Why:** Prevents impersonation (can't create profiles for other users)

**Security:** ✅ Secure - requires proper role + ownership verification

---

### Policy 3: Self-Update
```sql
CREATE POLICY "Technicians can update own profile"
ON public.technician_profiles FOR UPDATE
USING (auth.uid() = user_id AND has_role(auth.uid(), 'technician'));
```

**Who:** Technicians
**Action:** UPDATE (edit profile)
**Checks:**
1. `auth.uid() = user_id` - Can only update own profile
2. `has_role(auth.uid(), 'technician')` - Must maintain technician role

**Why:** Profile owners control their information

**Security:** ✅ Secure - ownership verified

---

### Policy 4: Admin View
```sql
CREATE POLICY "Admin can view all technician profiles"
ON public.technician_profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'));
```

**Who:** Admins
**Action:** SELECT (view all)
**Why:** Admins need to review/verify technicians

**Note:** Redundant with Policy 1 (public view), but explicit for clarity

---

### Policy 5: Admin Update
```sql
CREATE POLICY "Admin can update all technician profiles"
ON public.technician_profiles FOR UPDATE
USING (has_role(auth.uid(), 'admin'));
```

**Who:** Admins
**Action:** UPDATE (edit any profile)
**Why:** Admins can verify profiles, moderate content, update ratings

**Use Cases:**
- Set `is_verified = true` after background check
- Moderate inappropriate content in bio/images
- Suspend accounts (`is_available = false`)

---

## Trigger Explained

### updated_at Trigger
```sql
CREATE TRIGGER update_technician_profiles_updated_at
BEFORE UPDATE ON public.technician_profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
```

**What:** Automatically sets `updated_at = NOW()` on every UPDATE
**When:** BEFORE UPDATE (modifies NEW record before saving)
**Function:** Uses existing `handle_updated_at()` function

**Why Needed:**
- Track when profiles were last modified
- Helps with cache invalidation
- Audit trail for changes
- Sort by "recently updated" technicians

**Function Already Exists:** ✅ Yes, created in earlier migrations (used by profiles, worker_profiles, job_requests, etc.)

---

## Missing Foreign Key

### ⚠️ Issue: user_id Has No Foreign Key

**Current:**
```sql
user_id UUID NOT NULL UNIQUE
```

**Should Be:**
```sql
user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE
```

**Why Missing:** Likely oversight in migration file

**Impact:**
- ❌ Orphaned records if user account deleted
- ❌ Can't enforce referential integrity
- ❌ Database won't prevent invalid user_id values

**Recommendation:** Add foreign key when integrating:

```sql
-- Create technician_profiles table
CREATE TABLE public.technician_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  -- ... rest of columns
);
```

**Rationale:**
- Matches pattern from worker_profiles, contractor_profiles, customer_profiles
- CASCADE delete: If user account deleted, profile automatically removed
- Data integrity: Can't create profile for non-existent user

---

## Integration Decision Point

### Option A: Add Foreign Key (Recommended)

**Modify the table definition to include FK:**
```sql
user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
```

**Pros:**
- ✅ Data integrity enforced
- ✅ Matches existing profile tables pattern
- ✅ Prevents orphaned records
- ✅ Standard best practice

**Cons:**
- Deviates from migration file (but improves it)

---

### Option B: Keep As-Is (Migration File Exact)

**Use exact migration content without FK**

**Pros:**
- Matches migration file exactly
- Faster integration (no modification)

**Cons:**
- ❌ Inconsistent with other profile tables
- ❌ No referential integrity
- ❌ Potential orphaned records

---

### Recommendation: Use Option A

**Add the foreign key** - it's clearly an oversight in the migration file, and consistency with other profile tables is more important than exact migration replication.

---

## Comparison with contractor_profiles Service Provider Fields

### Overlap Analysis

In Migration 16, we added service provider fields to `contractor_profiles`:
- `is_service_provider BOOLEAN`
- `service_specializations TEXT[]`
- `completed_services INTEGER`
- `portfolio_images TEXT[]`

**Now in Migration 18, technician_profiles has:**
- `specializations TEXT[]` (similar to service_specializations)
- `completed_services INTEGER` (same)
- `portfolio_images TEXT[]` (same)

### Two Approaches to Service Providers

**Approach 1 (Migration 16):** Dual-role contractors
- Contractors can toggle `is_service_provider = true`
- One user can be customer AND provider
- Uses contractor_profiles with extra fields

**Approach 2 (Migration 18):** Dedicated technician profiles
- Separate user role and profile table
- Cleaner separation of concerns
- Follows existing pattern (worker/contractor/customer)

### Which Approach to Use?

**Both are valid, serving different use cases:**

1. **Contractor as Service Provider (Migration 16):**
   - User posts maintenance requests (as customer)
   - Same user fulfills others' requests (as provider)
   - Single profile, dual role

2. **Dedicated Technician (Migration 18):**
   - User is ONLY a service provider
   - Doesn't post requests (not a customer)
   - Separate profile optimized for provider features

**Recommendation:** Keep both!
- Contractors can be dual-role (post + fulfill requests)
- Technicians are provider-only (cleaner, focused)
- Users choose which profile type when registering

---

## Integration Summary

### Changes Required

| Type | Action | Location | Content |
|------|--------|----------|---------|
| **ADD** | Insert table + policies | After customer_profiles (~line 380) | Complete technician_profiles table definition |
| **ADD** | Enable RLS | With table | ALTER TABLE ENABLE RLS |
| **ADD** | RLS policies | After RLS enable | 5 policies (public, self, admin) |
| **ADD** | Trigger | After policies | updated_at trigger |
| **OPTIONAL** | Add FK constraint | In table definition | REFERENCES auth.users(id) ON DELETE CASCADE |

**Total Lines Added:** ~48 lines

---

## Verification

After integration:

```sql
-- Check table exists
\d public.technician_profiles

-- Should show 15 columns with proper types

-- Check RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'technician_profiles';
-- Should return: technician_profiles | t (true)

-- Check policies exist
SELECT policyname
FROM pg_policies
WHERE tablename = 'technician_profiles';
-- Should return 5 policies

-- Check trigger exists
SELECT trigger_name
FROM information_schema.triggers
WHERE event_object_table = 'technician_profiles';
-- Should return: update_technician_profiles_updated_at
```

---

## Testing

### Test Profile Creation
```sql
-- Create technician profile
INSERT INTO technician_profiles (
  user_id,
  specializations,
  years_experience,
  location,
  bio,
  phone
)
VALUES (
  auth.uid(),
  ARRAY['brake_repair', 'engine_diagnostics', 'welding'],
  8,
  'Dallas, TX',
  'ASE certified technician with 8 years experience in heavy equipment repair.',
  '555-0123'
);
```

### Test Public View
```sql
-- Anyone can view
SELECT id, specializations, rating, is_available, location
FROM technician_profiles
WHERE is_available = true
ORDER BY rating DESC, total_ratings DESC;
```

### Test Self-Update
```sql
-- Technician updates own profile
UPDATE technician_profiles
SET is_available = false,
    portfolio_images = ARRAY['https://example.com/work1.jpg', 'https://example.com/work2.jpg']
WHERE user_id = auth.uid();
```

### Test Admin Verification
```sql
-- Admin verifies technician
UPDATE technician_profiles
SET is_verified = true
WHERE id = 'some-technician-id'
AND has_role(auth.uid(), 'admin');
```

---

## Use Cases Enabled

### 1. Technician Registration
```sql
-- User signs up as technician
INSERT INTO user_roles (user_id, role)
VALUES (auth.uid(), 'technician');

-- Creates profile
INSERT INTO technician_profiles (user_id, specializations, location)
VALUES (auth.uid(), ARRAY['oil_change', 'tire_repair'], 'Austin, TX');
```

### 2. Customer Finds Technician
```sql
-- Search available technicians by specialization
SELECT tp.*, p.full_name, p.avatar_url
FROM technician_profiles tp
JOIN profiles p ON p.id = tp.user_id
WHERE 'hydraulic_systems' = ANY(tp.specializations)
AND tp.is_available = true
AND tp.location LIKE '%Dallas%'
ORDER BY tp.rating DESC, tp.total_ratings DESC;
```

### 3. Rating System Integration
```sql
-- After job completion, rating updates profile
-- (Would need trigger or application logic to update technician_profiles.rating from technician_ratings)
SELECT
  tp.user_id,
  AVG(tr.rating) as avg_rating,
  COUNT(tr.id) as total_ratings
FROM technician_profiles tp
JOIN technician_ratings tr ON tr.technician_id = tp.user_id
GROUP BY tp.user_id;
```

---

## Notes

### Profile Management Pattern

With this migration, we now have **4 profile types:**

1. **profiles** - Base profile (all users)
2. **worker_profiles** - Equipment operators
3. **contractor_profiles** - Job posters (can be dual-role service providers)
4. **customer_profiles** - Customers
5. **technician_profiles** - Service providers (NEW)

**User Journey Examples:**
- Worker: profiles + worker_profiles + user_roles(role='worker')
- Contractor: profiles + contractor_profiles + user_roles(role='contractor')
- Technician: profiles + technician_profiles + user_roles(role='technician')
- Dual-role: profiles + contractor_profiles(is_service_provider=true) + user_roles(role='contractor')

### Relationship to technician_ratings

**technician_ratings.technician_id** should reference users who have technician_profiles:

```sql
-- Find highly rated technicians
SELECT tp.*, COUNT(tr.id) as rating_count
FROM technician_profiles tp
LEFT JOIN technician_ratings tr ON tr.technician_id = tp.user_id
WHERE tp.is_verified = true
GROUP BY tp.id
HAVING COUNT(tr.id) > 5
AND AVG(tr.rating) >= 4.5;
```

### Missing: Rating Update Trigger

**Gap:** technician_profiles has `rating` and `total_ratings`, but no trigger to update them from technician_ratings table.

**Should Add:**
```sql
CREATE OR REPLACE FUNCTION update_technician_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE technician_profiles
  SET
    rating = (
      SELECT AVG(rating)::NUMERIC(3,2)
      FROM technician_ratings
      WHERE technician_id = NEW.technician_id
    ),
    total_ratings = (
      SELECT COUNT(*)
      FROM technician_ratings
      WHERE technician_id = NEW.technician_id
    )
  WHERE user_id = NEW.technician_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_technician_rating_created
AFTER INSERT ON technician_ratings
FOR EACH ROW
EXECUTE FUNCTION update_technician_rating();
```

**Add this manually** if you want automatic rating updates.

---

## Rollback

If issues arise:

```sql
-- Drop trigger
DROP TRIGGER IF EXISTS update_technician_profiles_updated_at ON public.technician_profiles;

-- Drop table (CASCADE removes policies automatically)
DROP TABLE IF EXISTS public.technician_profiles CASCADE;
```

---

## Estimated Integration Time

- **Reading/Understanding:** 5 minutes
- **Adding Table + Policies:** 5 minutes
- **Testing:** 5 minutes
- **Total:** ~15 minutes
