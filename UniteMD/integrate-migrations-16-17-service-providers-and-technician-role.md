# Integration Guide: Migrations 16 & 17
## Service Provider Enhancements + Technician Role

**Migration 16:** `20251207141239_f264d1de-ae45-4c86-8091-d8b73666aa57.sql`
**Migration 17:** `20251207142851_76957944-c8f8-4a9a-8c86-fa2415aac4fa.sql`
**Purpose:** Add technician role + enhance maintenance marketplace features
**Complexity:** Medium

---

## Overview

These migrations add **service provider/technician capabilities** to the platform:

**Migration 17** (2 lines): Adds 'technician' to app_role enum
**Migration 16** (52 lines): Enhances 3 existing tables + adds new technician_ratings table

---

## Integration Order

**⚠️ IMPORTANT: Integrate Migration 17 FIRST, then Migration 16**

Why? Migration 17 adds the 'technician' role which may be needed by future features in Migration 16.

---

## MIGRATION 17: Add Technician Role

### What This Does
Adds 'technician' as a fifth role type (joining contractor, worker, admin, customer).

### Integration Method: EDIT

**Why Edit vs ALTER?**
- MigrateUnite.sql defines the final schema state
- Editing the enum definition is cleaner than adding ALTER TYPE commands
- Shows complete role list in one place

### Change Required

**Location:** Line 5 (app_role enum definition)

**FIND:**
```sql
CREATE TYPE public.app_role AS ENUM ('contractor', 'worker', 'admin', 'customer');
```

**REPLACE WITH:**
```sql
CREATE TYPE public.app_role AS ENUM ('contractor', 'worker', 'admin', 'customer', 'technician');
```

**What Changed:** Added `'technician'` to the enum values

**Why:** Enables users to register as technicians (maintenance service providers)

---

## MIGRATION 16: Service Provider Enhancements

### What This Does

Enhances the maintenance marketplace with features for service providers (technicians):

1. **Contractor Profiles** - Add fields for service providers
2. **Maintenance Requests** - Add equipment details and photos
3. **Maintenance Quotes** - Add arrival time and PDF details
4. **Technician Ratings** - New table for rating service providers

---

## CHANGE 1: Enhance Contractor Profiles

### Add Service Provider Fields

**Location:** Line 87-102 (contractor_profiles table)

**Action:** EDIT - Add 4 new columns

**FIND:**
```sql
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
  bio TEXT,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

**REPLACE WITH:**
```sql
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
  bio TEXT,
  is_service_provider BOOLEAN DEFAULT false,
  service_specializations TEXT[] DEFAULT '{}',
  completed_services INTEGER DEFAULT 0,
  portfolio_images TEXT[] DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

**Changes:** Added 4 columns after `bio`:
- `is_service_provider BOOLEAN DEFAULT false` - Flag to identify service providers/technicians
- `service_specializations TEXT[] DEFAULT '{}'` - Services offered (e.g., "oil_change", "engine_repair")
- `completed_services INTEGER DEFAULT 0` - Count of completed maintenance jobs
- `portfolio_images TEXT[] DEFAULT '{}'` - Array of image URLs showing past work

**Why:**
- **Dual Role:** Contractors can also be service providers (post jobs AND provide services)
- **Service Discovery:** Specializations help customers find the right technician
- **Trust Building:** Portfolio images showcase work quality
- **Track Record:** Completed services counter builds credibility

---

## CHANGE 2: Add Technician Ratings Table

### Create New Table

**Location:** After maintenance_quotes table (around line 540)

**Action:** ADD - Insert complete table definition

**INSERT AFTER LINE ~540 (after maintenance_quotes policies):**

```sql
-- Create technician_ratings table for maintenance service ratings
CREATE TABLE public.technician_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL,
  contractor_id UUID NOT NULL,
  quote_id UUID REFERENCES public.maintenance_quotes(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.technician_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for technician_ratings
CREATE POLICY "Anyone can view technician ratings"
ON public.technician_ratings
FOR SELECT
USING (true);

CREATE POLICY "Contractors can create ratings for their requests"
ON public.technician_ratings
FOR INSERT
WITH CHECK (
  contractor_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.maintenance_requests
    WHERE id = request_id AND contractor_id = auth.uid()
  )
);
```

**Context - Insert Between:**
```sql
CREATE POLICY "Admin can view all maintenance quotes" ...
-- (admin policies end)

-- 👇 INSERT TECHNICIAN_RATINGS TABLE HERE

-- Users can view their own subscription
CREATE POLICY "Users can view their own subscription" ...
```

**Table Schema:**

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PRIMARY KEY | Unique rating identifier |
| `technician_id` | UUID | NOT NULL | User ID of the service provider being rated |
| `contractor_id` | UUID | NOT NULL | User ID of the customer who posted the request |
| `quote_id` | UUID | FK to maintenance_quotes | Which quote was accepted (CASCADE delete) |
| `request_id` | UUID | FK to maintenance_requests | Which request was completed (CASCADE delete) |
| `rating` | INTEGER | 1-5 CHECK | Star rating |
| `review` | TEXT | nullable | Written review |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | When rating was posted |

**Why This Design:**

**No foreign key on technician_id:**
- Flexibility: technician_id references any user (could be contractor, worker, or technician role)
- Prevents orphaned records if the issue is the user doesn't exist

**Both quote_id AND request_id:**
- Links rating to specific job details
- CASCADE delete: if request/quote deleted, ratings go too
- Enables "rated job" history

**Public SELECT policy:**
- Anyone can view ratings (public trust system)
- Helps customers choose service providers

**Strict INSERT policy:**
- Only request owners can rate
- Prevents fake reviews
- Verified through maintenance_requests join

---

## CHANGE 3: Enhance Maintenance Requests

### Add Equipment Details

**Location:** Line 469-484 (maintenance_requests table)

**Action:** EDIT - Add 4 new columns

**FIND:**
```sql
CREATE TABLE public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL,
  equipment_type TEXT NOT NULL,
  equipment_name TEXT,
  maintenance_type TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  preferred_date TIMESTAMP WITH TIME ZONE,
  urgency TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  budget_range TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**REPLACE WITH:**
```sql
CREATE TABLE public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL,
  equipment_type TEXT NOT NULL,
  equipment_name TEXT,
  maintenance_type TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  preferred_date TIMESTAMP WITH TIME ZONE,
  urgency TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  budget_range TEXT,
  images TEXT[] DEFAULT '{}',
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Changes:** Added 4 columns after `budget_range`:
- `images TEXT[] DEFAULT '{}'` - Array of image URLs showing equipment/issue
- `manufacturer TEXT` - Equipment manufacturer (e.g., "Caterpillar")
- `model TEXT` - Model number (e.g., "320D2")
- `serial_number TEXT` - Serial/VIN for precise identification

**Why:**
- **Better Diagnosis:** Photos help technicians understand the issue before quoting
- **Accurate Quotes:** Manufacturer/model helps determine parts/labor costs
- **Equipment History:** Serial number enables maintenance history tracking
- **Trust:** Photos prove equipment exists and condition is as described

---

## CHANGE 4: Enhance Maintenance Quotes

### Add Service Details

**Location:** Line 500-511 (maintenance_quotes table)

**Action:** EDIT - Add 2 new columns

**FIND:**
```sql
CREATE TABLE public.maintenance_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL,
  price NUMERIC NOT NULL,
  estimated_duration TEXT,
  description TEXT,
  availability TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**REPLACE WITH:**
```sql
CREATE TABLE public.maintenance_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL,
  price NUMERIC NOT NULL,
  estimated_duration TEXT,
  description TEXT,
  availability TEXT,
  status TEXT DEFAULT 'pending',
  arrival_time TEXT,
  details_pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Changes:** Added 2 columns after `status`:
- `arrival_time TEXT` - When technician can arrive (e.g., "9:00 AM - 11:00 AM")
- `details_pdf_url TEXT` - URL to detailed quote PDF with parts breakdown

**Why:**
- **Scheduling:** Customers can plan around arrival time
- **Transparency:** Detailed PDF shows parts/labor breakdown
- **Professionalism:** Formal quotes build trust
- **Documentation:** PDF serves as work order/invoice later

---

## Integration Summary

### Changes by Type

| Type | Count | Tables/Enums |
|------|-------|--------------|
| **EDIT Enum** | 1 | app_role (+technician) |
| **EDIT Table** | 3 | contractor_profiles (+4 cols), maintenance_requests (+4 cols), maintenance_quotes (+2 cols) |
| **ADD Table** | 1 | technician_ratings (new) |

**Total Changes:** 5 modifications

### Line Count Impact
- Migration 17: +1 enum value
- Migration 16: +10 new columns + 1 new table = ~30 lines added

---

## Integration Checklist

### Migration 17
- [ ] Edit app_role enum to add 'technician'
- [ ] Verify enum now has 5 values

### Migration 16
- [ ] Add 4 service provider columns to contractor_profiles
- [ ] Add 4 equipment detail columns to maintenance_requests
- [ ] Add 2 quote detail columns to maintenance_quotes
- [ ] Create technician_ratings table after maintenance_quotes
- [ ] Enable RLS on technician_ratings
- [ ] Add 2 RLS policies for technician_ratings

---

## Verification

After integration:

```sql
-- Check app_role enum
SELECT unnest(enum_range(NULL::app_role));
-- Should return: contractor, worker, admin, customer, technician

-- Check contractor_profiles columns
\d public.contractor_profiles
-- Should include: is_service_provider, service_specializations, completed_services, portfolio_images

-- Check maintenance_requests columns
\d public.maintenance_requests
-- Should include: images, manufacturer, model, serial_number

-- Check maintenance_quotes columns
\d public.maintenance_quotes
-- Should include: arrival_time, details_pdf_url

-- Check technician_ratings table exists
\d public.technician_ratings
-- Should show 8 columns with proper constraints
```

---

## Use Cases Enabled

### 1. Dual-Role Users
**Scenario:** A contractor who also provides maintenance services

```sql
-- Register as contractor
INSERT INTO contractor_profiles (user_id, company_name, is_service_provider, service_specializations)
VALUES (auth.uid(), 'Smith Equipment', true, ARRAY['engine_repair', 'hydraulic_systems']);

-- Post a job request (as customer)
INSERT INTO maintenance_requests (contractor_id, equipment_type, manufacturer, model, images)
VALUES (auth.uid(), 'Excavator', 'Caterpillar', '320D2', ARRAY['https://.../photo1.jpg']);

-- Submit a quote (as service provider)
INSERT INTO maintenance_quotes (request_id, provider_id, price, arrival_time, details_pdf_url)
VALUES ('request-uuid', auth.uid(), 500.00, '2:00 PM', 'https://.../quote.pdf');
```

### 2. Service Provider Portfolio
```sql
-- Technician adds portfolio images
UPDATE contractor_profiles
SET portfolio_images = ARRAY[
  'https://.../work1.jpg',
  'https://.../work2.jpg',
  'https://.../work3.jpg'
],
service_specializations = ARRAY['oil_change', 'tire_repair', 'welding']
WHERE user_id = auth.uid();
```

### 3. Customer Rates Service
```sql
-- After job completion, customer leaves rating
INSERT INTO technician_ratings (technician_id, contractor_id, quote_id, request_id, rating, review)
VALUES (
  'tech-user-id',
  auth.uid(),
  'completed-quote-id',
  'completed-request-id',
  5,
  'Excellent work! Arrived on time and fixed the issue quickly.'
);
```

---

## Security Considerations

### technician_ratings Policies

**✅ Secure:**
- Public SELECT: Ratings are meant to be public (like Yelp reviews)
- Strict INSERT: Only request owners can rate their own jobs
- Prevents fake reviews through maintenance_requests verification

**⚠️ Consider Adding:**
- Admin SELECT policy (if not already covered by "Anyone can view")
- Constraint to prevent duplicate ratings per request
- Time limit (can only rate within X days of completion)

**Suggested Constraint:**
```sql
ALTER TABLE technician_ratings
ADD CONSTRAINT unique_rating_per_request UNIQUE (request_id, contractor_id);
```

### Service Provider Fields

**Safe:**
- All new columns are nullable or have defaults
- No security-sensitive data (portfolio URLs are intentionally public)
- is_service_provider flag doesn't grant extra RLS permissions

---

## Notes

### Missing Foreign Key
**technician_id in technician_ratings** has no FK constraint. Consider adding:
```sql
ALTER TABLE public.technician_ratings
ADD CONSTRAINT fk_technician
FOREIGN KEY (technician_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

**Why it's missing:** Flexibility - any user can be rated as a technician (contractor, worker, or technician role).

### Enum Value Cannot Be Removed
Once 'technician' is added to app_role, it **cannot be removed** without recreating the entire enum (complex and risky).

### Backward Compatibility
All new columns have DEFAULT values or are nullable, so existing records are compatible.

---

## Testing

### Test Technician Role
```sql
-- Create technician user
INSERT INTO user_roles (user_id, role)
VALUES (auth.uid(), 'technician');

-- Create service provider profile
INSERT INTO contractor_profiles (user_id, is_service_provider, service_specializations)
VALUES (auth.uid(), true, ARRAY['brake_repair', 'engine_diagnostics']);
```

### Test Rating System
```sql
-- As contractor, create and complete a request
-- Then rate the technician
INSERT INTO technician_ratings (technician_id, contractor_id, request_id, rating, review)
VALUES ('tech-id', auth.uid(), 'request-id', 5, 'Great service!');

-- Verify rating is visible
SELECT * FROM technician_ratings WHERE technician_id = 'tech-id';
```

---

## Rollback

If issues arise:

```sql
-- Migration 17 Rollback (CANNOT remove enum value directly)
-- Would require recreating the enum - complex, not recommended

-- Migration 16 Rollback
DROP TABLE IF EXISTS public.technician_ratings CASCADE;

ALTER TABLE public.contractor_profiles
DROP COLUMN IF EXISTS is_service_provider,
DROP COLUMN IF EXISTS service_specializations,
DROP COLUMN IF EXISTS completed_services,
DROP COLUMN IF EXISTS portfolio_images;

ALTER TABLE public.maintenance_requests
DROP COLUMN IF EXISTS images,
DROP COLUMN IF EXISTS manufacturer,
DROP COLUMN IF EXISTS model,
DROP COLUMN IF EXISTS serial_number;

ALTER TABLE public.maintenance_quotes
DROP COLUMN IF EXISTS arrival_time,
DROP COLUMN IF EXISTS details_pdf_url;
```

---

## Estimated Integration Time

- **Migration 17:** 2 minutes (edit 1 enum)
- **Migration 16:** 15 minutes (edit 3 tables + add 1 table)
- **Testing:** 5 minutes
- **Total:** ~20-25 minutes
