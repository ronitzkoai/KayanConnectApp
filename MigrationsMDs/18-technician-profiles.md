# Migration 18: Technician Profiles

## Migration Info
- **Filename**: `20251207143020_133e0682-2b11-4b93-9197-043624cb0420.sql`
- **Timestamp**: December 7, 2025 at 14:30:20 (90 seconds after migration 17)
- **Purpose**: Create dedicated profile table for technician users
- **Size**: 48 lines
- **Dependencies**:
  - Migration 1 (handle_updated_at() function)
  - Migration 3 (has_role() function)
  - Migration 17 (technician role in app_role enum)

## Overview
This migration creates the technician_profiles table, providing dedicated storage for equipment maintenance service providers. This completes the architectural shift from using contractor_profiles.is_service_provider (migration 16) to having a dedicated technician user type with specialized fields. However, this creates overlap with migration 16's service provider fields, highlighting architectural evolution and redundancy that should be resolved.

**Key Changes**:
- Creates technician_profiles table with service provider fields
- Full RLS policies (SELECT public, INSERT/UPDATE own, admin access)
- Automated updated_at trigger
- Similar structure to worker_profiles but specialized for maintenance services

**Redundancy Note**: Fields overlap with migration 16's contractor_profiles additions (specializations, completed_services, portfolio_images)

---

## Line-by-Line Analysis

### Lines 1-18: Technician Profiles Table Creation
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
```

**What it does**: Creates dedicated profile for technician role

**Field-by-Field Breakdown**:

- **id**: UUID PRIMARY KEY with auto-generation

- **user_id**: UUID NOT NULL UNIQUE
  - ❌ **Missing FK**: Should REFERENCES auth.users(id) ON DELETE CASCADE
  - **UNIQUE constraint**: Ensures 1:1 relationship (one profile per user)
  - **Impact without FK**: Orphaned profiles if users deleted

- **specializations**: TEXT[] DEFAULT '{}'::text[]
  - Service types offered
  - **Example**: `['hydraulic_repair', 'engine_overhaul', 'electrical_systems', 'welding']`
  - **Same as** migration 16: contractor_profiles.service_specializations
  - ⚠️ **Free-text**: Not linked to maintenance_type enum

- **years_experience**: INTEGER DEFAULT 0
  - Years in maintenance/repair work
  - **Use case**: Filtering by experience level
  - **Similar to**: contractor_profiles.years_experience, worker_profiles.years_experience

- **is_verified**: BOOLEAN DEFAULT false
  - Admin verification of credentials/certifications
  - **Similar to**: contractor_profiles.is_verified
  - **Use case**: Trust indicator, filter verified technicians

- **is_available**: BOOLEAN DEFAULT true
  - Current availability status
  - **New field**: Not in contractor/worker profiles
  - **Use case**: Technician can mark unavailable (vacation, fully booked)
  - **Better UX** than deleting account when temporarily unavailable

- **rating**: NUMERIC(3,2) DEFAULT 0
  - Average rating (0.00 to 5.00 scale)
  - **Precision**: 3 digits total, 2 after decimal (allows 0.00 to 9.99, but capped at 5.00 via application)
  - ⚠️ **No CHECK constraint**: Could theoretically be > 5.00 or negative
  - **Should be**: `CHECK (rating >= 0 AND rating <= 5)`

- **total_ratings**: INTEGER DEFAULT 0
  - Count of ratings received
  - **Use case**: Weighted averages, minimum rating threshold
  - ⚠️ **No auto-update**: Must be manually maintained (see issues)

- **portfolio_images**: TEXT[] DEFAULT '{}'::text[]
  - URLs to work examples
  - **Same as** migration 16: contractor_profiles.portfolio_images
  - **Example**: `['https://storage.../repair1.jpg', 'https://storage.../repair2.jpg']`

- **bio**: TEXT
  - Professional description
  - **Same as** migration 13: Added to worker/contractor profiles
  - **Use case**: "20 years experience in heavy equipment hydraulics..."

- **location**: TEXT
  - Operating area or base location
  - **Example**: 'Tel Aviv', 'Central Israel', 'Nationwide'
  - ⚠️ **Free-text**: Not structured (city, region, country)
  - **Use case**: Location-based matching

- **completed_services**: INTEGER DEFAULT 0
  - Count of services completed
  - **Same as** migration 16: contractor_profiles.completed_services
  - ⚠️ **No auto-increment**: Manual updates required

- **phone**: TEXT
  - Contact phone number
  - **Note**: profiles table also has phone (duplication)
  - **Why here**: Technician may want separate business phone

- **created_at / updated_at**: Standard timestamps

**Comparison with Other Profiles**:

| Field | worker_profiles | contractor_profiles | technician_profiles |
|-------|----------------|---------------------|---------------------|
| specializations | work_types[] | specializations[] (M16) | specializations[] |
| years_experience | ✓ | ✓ | ✓ |
| is_verified | ✗ | ✓ | ✓ |
| is_available | ✓ (available) | ✗ | ✓ (is_available) |
| rating | ✓ | ✓ | ✓ |
| total_ratings | ✓ | ✓ | ✓ |
| portfolio_images | ✗ | ✓ (M16) | ✓ |
| bio | ✓ (M13) | ✓ (M13) | ✓ |
| location | ✗ | ✗ | ✓ |
| completed_services | ✗ | ✓ (M16) | ✓ |
| phone | ✗ | ✗ | ✓ |

**Redundancy Analysis**:
- Migration 16 added service_specializations, completed_services, portfolio_images to contractor_profiles
- Migration 18 adds specializations, completed_services, portfolio_images to technician_profiles
- **Same fields, different tables** - architectural overlap

---

### Lines 20-21: Enable RLS
```sql
-- Enable RLS
ALTER TABLE public.technician_profiles ENABLE ROW LEVEL SECURITY;
```

**Standard RLS enablement** - required for security

---

### Lines 23-42: RLS Policies
```sql
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
```

**Policy 1: Public Read Access**
- **Rule**: USING (true) - anyone can view
- **Why**: Technicians are service providers - profiles must be discoverable
- **Use case**: Contractors browse technician profiles for maintenance needs
- ✅ **Good for marketplace**

**Policy 2: Technicians Create Own Profile**
- **Rules**:
  1. auth.uid() = user_id (creating YOUR profile)
  2. has_role(auth.uid(), 'technician') (must have technician role)
- **Security**: Can't create profiles for others, must have correct role

**Policy 3: Technicians Update Own Profile**
- **Rules**: Same as insert - own profile + technician role
- **Use case**: Update bio, specializations, availability, portfolio

**Policy 4 & 5: Admin Full Access**
- **SELECT**: Admins can view all profiles (already possible via policy 1)
- **UPDATE**: Admins can update any profile
- **Use case**: Verification, moderation, corrections
- ✅ **Good**: Follows migration 15 admin pattern

**Missing Policies**:
- ❌ **No DELETE policy**: Technicians can't delete profiles
  - **Intentional**: Profiles deleted via CASCADE when user account deleted

**Policy Count**: 5 policies (matches contractor/worker patterns)

---

### Lines 44-48: Updated_at Trigger
```sql
-- Add trigger for updated_at
CREATE TRIGGER update_technician_profiles_updated_at
BEFORE UPDATE ON public.technician_profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
```

**Standard pattern**: Auto-updates updated_at timestamp on changes

**Consistency**: ✅ Matches worker_profiles, contractor_profiles, customer_profiles

---

## Schema Changes Summary

### Tables Created
1. **technician_profiles**
   - Purpose: Store technician service provider profiles
   - Key fields: specializations, rating, portfolio_images, is_available
   - Relationships: user_id → auth.users (no FK ❌)

### RLS Policies Created
- technician_profiles: 5 policies (SELECT public, SELECT admin, INSERT own, UPDATE own, UPDATE admin)

### Triggers Created
- update_technician_profiles_updated_at

---

## Integration Notes

### Dependencies
- **Requires Migration 1**: handle_updated_at() function
- **Requires Migration 3**: has_role() function
- **Requires Migration 17**: 'technician' value in app_role enum

### Overlap with Migration 16
**Migration 16**: contractor_profiles with is_service_provider flag
- Fields added: is_service_provider, service_specializations, completed_services, portfolio_images

**Migration 18**: Dedicated technician_profiles table
- Fields: specializations, completed_services, portfolio_images

**Result**: Two ways to be a service provider
1. Contractor with is_service_provider=true
2. User with technician role + technician_profiles

**Decision Point**: Which approach to use?

---

## Issues & Recommendations

### Critical Issues
1. **🔴 Missing Foreign Key on user_id**
   - No CASCADE delete when user removed
   - **Fix**:
   ```sql
   ALTER TABLE technician_profiles
   ADD CONSTRAINT fk_user
   FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
   ```

2. **🔴 Architectural Redundancy with Migration 16**
   - Same fields in contractor_profiles and technician_profiles
   - **Impact**: Confusion, duplicate code, inconsistent data
   - **Decision needed**: Pick one approach
   - **Recommendation**: Use technician_profiles (this migration)
     - Remove is_service_provider, service_specializations, completed_services, portfolio_images from contractor_profiles
     - Cleaner separation: contractors post jobs, technicians provide services
     - Users can have both roles if needed (multi-role via user_roles)

### Architecture Issues
1. **🟡 No Rating Auto-Update Trigger**
   - rating and total_ratings must be manually maintained
   - **Fix**: Add trigger when technician_rating created
   ```sql
   CREATE FUNCTION update_technician_rating() RETURNS TRIGGER AS $$
   BEGIN
     UPDATE technician_profiles SET
       total_ratings = total_ratings + 1,
       rating = (
         SELECT AVG(rating)::NUMERIC(3,2)
         FROM technician_ratings
         WHERE technician_id = NEW.technician_id
       )
     WHERE user_id = NEW.technician_id;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   CREATE TRIGGER on_technician_rating_created
   AFTER INSERT ON technician_ratings
   FOR EACH ROW EXECUTE FUNCTION update_technician_rating();
   ```

2. **🟡 specializations Not Validated**
   - Free-text array vs maintenance_type enum
   - **Fix**: Link to enum or create services table

3. **🟡 Phone Field Duplication**
   - profiles.phone AND technician_profiles.phone
   - **Confusion**: Which to use?
   - **Better**: Remove from technician_profiles, use profiles.phone

### Missing Features
1. ❌ **No CHECK constraint on rating**: Should be `CHECK (rating >= 0 AND rating <= 5)`
2. ❌ **No service_area field**: Where does technician operate?
3. ❌ **No certifications field**: Professional credentials
4. ❌ **No hourly_rate field**: Pricing information
5. ❌ **No completed_services trigger**: Manual updates error-prone

---

## For Unified Migration

### Consolidation Opportunities
1. **Remove Migration 16's Service Provider Fields**
   - Don't add is_service_provider, service_specializations, etc. to contractor_profiles
   - Use only technician_profiles for service providers
   - Contractors who want to provide services create technician account via user_roles

2. **Standardize Profile Structure**
   ```sql
   -- Common fields across all profile types
   CREATE TABLE base_profile_fields (
     id UUID PRIMARY KEY,
     user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
     bio TEXT,
     years_experience INTEGER DEFAULT 0,
     rating NUMERIC(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
     total_ratings INTEGER DEFAULT 0,
     is_verified BOOLEAN DEFAULT false,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

3. **Add Rating Triggers Immediately**
   - Don't wait for manual updates
   - Create triggers when rating tables created

### Sequencing in Unified Migration
```
1. Core tables (profiles, user_roles)
2. Specialized profiles (worker, contractor, customer, technician) with common structure
3. Rating tables (single table with type field OR separate tables)
4. Rating update triggers
5. All RLS policies
```

### Improvements for Unified Version
1. **Add foreign key**:
   ```sql
   CREATE TABLE technician_profiles (
     ...
     user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
     ...
   );
   ```

2. **Add constraints**:
   ```sql
   rating NUMERIC(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
   years_experience INTEGER DEFAULT 0 CHECK (years_experience >= 0),
   completed_services INTEGER DEFAULT 0 CHECK (completed_services >= 0)
   ```

3. **Add rating trigger**:
   ```sql
   CREATE TRIGGER on_technician_rating_created
   AFTER INSERT ON technician_ratings
   FOR EACH ROW EXECUTE FUNCTION update_technician_rating();
   ```

4. **Remove phone duplication**:
   ```sql
   -- Use profiles.phone instead
   -- Don't include phone in specialized profiles
   ```

5. **Add useful fields**:
   ```sql
   service_area TEXT, -- or TEXT[] for multiple areas
   hourly_rate NUMERIC CHECK (hourly_rate > 0),
   certifications TEXT[],
   insurance_verified BOOLEAN DEFAULT false,
   response_time_hours INTEGER -- Average response time
   ```

### Dead Code to Remove
- Migration 16's contractor_profiles additions:
  - is_service_provider
  - service_specializations
  - completed_services
  - portfolio_images
- Use technician_profiles instead

---

## Use Cases

### Create Technician Profile
```sql
-- User with technician role creates profile
INSERT INTO technician_profiles (
  user_id, specializations, years_experience,
  bio, location, phone, portfolio_images
) VALUES (
  auth.uid(),
  ARRAY['hydraulic_repair', 'engine_overhaul', 'welding'],
  15,
  'Certified heavy equipment technician with 15 years experience. Specialized in Caterpillar and John Deere equipment.',
  'Tel Aviv',
  '+972-50-1234567',
  ARRAY['https://storage.../work1.jpg', 'https://storage.../work2.jpg']
);
```

### Browse Available Technicians
```sql
-- Find technicians by specialization and availability
SELECT tp.*, p.full_name
FROM technician_profiles tp
JOIN profiles p ON p.id = tp.user_id
WHERE 'hydraulic_repair' = ANY(tp.specializations)
  AND tp.is_available = true
  AND tp.is_verified = true
  AND tp.rating >= 4.0
ORDER BY tp.rating DESC, tp.completed_services DESC;
```

### Update Availability
```sql
-- Technician marks unavailable (vacation)
UPDATE technician_profiles
SET is_available = false
WHERE user_id = auth.uid();

-- Mark available again
UPDATE technician_profiles
SET is_available = true
WHERE user_id = auth.uid();
```

### Top Rated Technicians
```sql
-- Leaderboard of top technicians
SELECT
  tp.*,
  p.full_name,
  tp.rating,
  tp.total_ratings,
  tp.completed_services
FROM technician_profiles tp
JOIN profiles p ON p.id = tp.user_id
WHERE tp.total_ratings >= 10 -- Minimum ratings for credibility
ORDER BY tp.rating DESC, tp.total_ratings DESC
LIMIT 10;
```

### Admin Verification
```sql
-- Admin verifies technician credentials
UPDATE technician_profiles
SET is_verified = true
WHERE user_id = 'technician-uuid'
  AND has_role(auth.uid(), 'admin');
```

---

## Rollback Considerations

### To Rollback This Migration
```sql
-- Drop trigger
DROP TRIGGER IF EXISTS update_technician_profiles_updated_at ON public.technician_profiles;

-- Drop table (CASCADE removes policies)
DROP TABLE IF EXISTS public.technician_profiles CASCADE;
```

### Data Loss Warning
- ⚠️ All technician profiles permanently deleted
- ⚠️ Specializations, portfolios, ratings data lost
- ⚠️ Service provider information gone

### Rollback Blockers
- If migration 16's is_service_provider fields were removed (recommended)
- If maintenance_quotes reference technician_profiles
- If technician_ratings rely on technicians having profiles

---

## Testing Checklist

### Profile Creation
- [ ] Technician can create profile
- [ ] Non-technician cannot create technician profile
- [ ] Cannot create profile for another user
- [ ] UNIQUE constraint prevents duplicate profiles
- [ ] Profile linked to auth.users (via user_id)

### Profile Access
- [ ] Anyone can view all technician profiles
- [ ] Technician can update own profile
- [ ] Technician cannot update other's profiles
- [ ] Admin can update any profile
- [ ] Cannot delete profiles (no policy)

### Fields
- [ ] Can set all profile fields
- [ ] specializations array works
- [ ] portfolio_images array works
- [ ] is_available boolean toggle works
- [ ] rating displays correctly (2 decimal places)
- [ ] bio text field accepts long text

### Availability
- [ ] Can mark unavailable
- [ ] Unavailable technicians filterable
- [ ] Can mark available again

### Integration
- [ ] Profile displays in technician browse
- [ ] Ratings from technician_ratings table
- [ ] Can submit quotes on maintenance_requests
- [ ] updated_at changes on UPDATE

---

## Conclusion

Migration 18 creates the technician_profiles table, completing the dedicated service provider user type architecture. This provides a clean separation between contractors (equipment owners who post jobs) and technicians (service providers who repair equipment). However, this creates redundancy with migration 16's contractor service provider fields, highlighting architectural evolution that needs resolution.

**Key Achievements**:
- ✅ Dedicated profile table for technician role
- ✅ Comprehensive service provider fields (specializations, portfolio, ratings)
- ✅ Availability toggle (is_available field)
- ✅ Full RLS policies (public view, own edit, admin oversight)
- ✅ Automated timestamp management
- ✅ Matches established profile patterns

**Critical Issues**:
- 🔴 Missing foreign key on user_id (data integrity risk)
- 🔴 Architectural redundancy with migration 16 (two service provider approaches)
- 🟡 No auto-update trigger for ratings
- 🟡 specializations not validated against enum
- 🟡 Phone field duplication with profiles table

**Architectural Decision Needed**:
Choose ONE service provider approach:
1. ❌ **Contractor flag** (migration 16): Remove this approach
2. ✅ **Dedicated technician** (migration 18): Use this approach

**Recommendation**: Use technician_profiles approach
- Cleaner separation of concerns
- Dedicated fields for service provision
- Users can have multiple roles (contractor + technician) via user_roles
- Remove migration 16's service provider fields from contractor_profiles

**For Production**:
1. Add foreign key constraint on user_id
2. Remove redundant fields from contractor_profiles (migration 16)
3. Add rating auto-update trigger
4. Add CHECK constraints on rating, years_experience, completed_services
5. Consider removing phone field (use profiles.phone)
6. Add service_area, hourly_rate, certifications fields
7. Validate specializations against maintenance_type enum

This migration demonstrates good architectural patterns for role-specific profiles, but also highlights the challenge of evolving architecture (migration 16 → migration 18) and the need for consolidation in a unified migration.
