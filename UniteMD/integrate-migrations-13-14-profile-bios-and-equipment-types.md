# Integration Guide: Migrations 13 & 14
## Profile Bios + Equipment Types Expansion

**Migration 13:** `20251204094548_d7c1fbf1-8873-4c7a-b055-6c89d23bb031.sql` (5 lines)
**Migration 14:** `20251204102852_5e3ff72e-39c7-4256-bae9-5426398ed19d.sql` (10 lines)
**Combined Purpose:** Add bio fields to profiles + Expand equipment types

---

## What These Migrations Do

**Migration 13:** Adds `bio` column to worker_profiles and contractor_profiles
**Migration 14:** Adds 9 new work types to the work_type enum

---

## Integration Method

Since these migrations modify **existing schema definitions**, we integrate them by **editing the original CREATE statements** in MigrateUnite.sql, rather than adding ALTER statements.

**Why?**
- Cleaner schema - avoids migration-style ALTER commands in the unified file
- Reflects final state directly in table/enum definitions
- Reduces file length

---

## CHANGE 1: Add Bio Columns to Profile Tables

### Worker Profiles - Add bio column

**Location:** Line 59-74 (worker_profiles table definition)

**FIND:**
```sql
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

**REPLACE WITH:**
```sql
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
                                        bio TEXT,
                                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                                        UNIQUE(user_id)
);
```

**Change:** Added `bio TEXT,` after `equipment_skills` line

**Why:** Allows workers to add a personal bio/description to their profile

---

### Contractor Profiles - Add bio column

**Location:** Line 77-91 (contractor_profiles table definition)

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
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

**Change:** Added `bio TEXT,` after `total_ratings` line

**Why:** Allows contractors to add company description/bio to their profile

---

## CHANGE 2: Expand Work Type Enum

**Location:** Line 8-16 (work_type enum definition)

**FIND:**
```sql
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

**REPLACE WITH:**
```sql
CREATE TYPE work_type AS ENUM (
  'backhoe',
  'loader',
  'bobcat',
  'grader',
  'truck_driver',
  'semi_trailer',
  'laborer',
  'mini_excavator',
  'excavator',
  'mini_backhoe',
  'wheeled_backhoe',
  'telescopic_loader',
  'full_trailer',
  'bathtub',
  'double',
  'flatbed'
);
```

**Changes:** Added 9 new equipment types

**Why:** Expands equipment catalog to support more specialized equipment types

**New Equipment Types:**
1. `mini_excavator` - Compact excavators for tight spaces
2. `excavator` - Standard excavators
3. `mini_backhoe` - Compact backhoes
4. `wheeled_backhoe` - Wheeled (vs tracked) backhoes
5. `telescopic_loader` - Telehandlers/boom lifts
6. `full_trailer` - Full-size trailers
7. `bathtub` - Dump truck variant
8. `double` - Double-configuration equipment
9. `flatbed` - Flatbed trailers/trucks

---

## Summary

| Migration | Change | Location | Type | Lines Changed |
|-----------|--------|----------|------|---------------|
| 13 | Add bio to worker_profiles | Line 59-74 | Edit | +1 line |
| 13 | Add bio to contractor_profiles | Line 77-91 | Edit | +1 line |
| 14 | Expand work_type enum | Line 8-16 | Edit | +9 lines |

**Total:** 3 edits, +11 lines

---

## Verification

After integration:

```sql
-- Check worker_profiles has bio column
\d public.worker_profiles

-- Check contractor_profiles has bio column
\d public.contractor_profiles

-- Check work_type enum values
SELECT unnest(enum_range(NULL::work_type));
-- Should return 16 values (7 original + 9 new)
```

---

## Why Not Use ALTER Statements?

**We could** just copy the ALTER statements:
```sql
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.contractor_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TYPE work_type ADD VALUE IF NOT EXISTS 'mini_excavator';
-- etc...
```

**But we don't because:**
- MigrateUnite.sql is a **unified schema file**, not a migration history
- Editing the CREATE statements directly shows the **final schema state**
- Cleaner and more maintainable
- Avoids unnecessary ALTER commands

**Exception:** Use ALTER if the unified file has already been deployed to production - in that case, add the ALTER statements to maintain upgrade path.

---

## Notes

- `bio TEXT` is nullable (no NOT NULL constraint) - users don't have to provide a bio
- New work types are compatible with existing `worker_profiles.work_type` column
- No RLS policy changes needed - existing policies cover the new columns
- No triggers needed for the new columns

---

## Testing

```sql
-- Test worker bio
UPDATE worker_profiles SET bio = 'Experienced operator with 10 years' WHERE user_id = auth.uid();

-- Test contractor bio
UPDATE contractor_profiles SET bio = 'Leading construction company' WHERE user_id = auth.uid();

-- Test new work types
INSERT INTO worker_profiles (user_id, work_type) VALUES (auth.uid(), 'mini_excavator');
INSERT INTO job_requests (contractor_id, work_type, location, work_date)
VALUES (auth.uid(), 'telescopic_loader', 'Site A', NOW());
```

---

## Rollback

If needed, remove the changes:

```sql
-- Remove bio columns
ALTER TABLE worker_profiles DROP COLUMN bio;
ALTER TABLE contractor_profiles DROP COLUMN bio;

-- Cannot remove enum values once added - requires recreating the enum
```

**Note:** Enum values cannot be removed in PostgreSQL. Once added, they're permanent unless you recreate the entire enum type (which is complex and risky).
