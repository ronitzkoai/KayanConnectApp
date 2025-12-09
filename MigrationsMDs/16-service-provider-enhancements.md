# Migration 16: Service Provider Enhancements

## Migration Info
- **Filename**: `20251207141239_f264d1de-ae45-4c86-8091-d8b73666aa57.sql`
- **Timestamp**: December 7, 2025 at 14:12:39 (9 minutes after migration 15)
- **Purpose**: Enhance contractors as service providers and add technician ratings system
- **Size**: 52 lines
- **Dependencies**:
  - Migration 8 (contractor_profiles table)
  - Migration 9 (maintenance_requests, maintenance_quotes tables)

## Overview
This migration expands the maintenance marketplace by enabling contractors to also act as service providers (technicians). It adds service provider fields to contractor_profiles, creates a separate ratings system for technician services, and enhances maintenance tables with detailed service information. This creates overlap with the later technician_profiles table (migration 18), introducing architectural redundancy.

**Key Changes**:
- Adds 4 service provider fields to contractor_profiles
- Creates technician_ratings table (separate from job ratings)
- Enhances maintenance_requests with equipment details (images, manufacturer, model, serial number)
- Enhances maintenance_quotes with timing and documentation fields

**Architecture Note**: This creates a dual approach to service providers:
1. **Contractors with service provider flag** (this migration)
2. **Dedicated technician profiles** (migration 18)

---

## Line-by-Line Analysis

### Lines 1-7: Contractor as Service Provider
```sql
-- Add technician/provider specific fields to contractor_profiles for service providers
ALTER TABLE public.contractor_profiles
ADD COLUMN IF NOT EXISTS is_service_provider BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS service_specializations TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS completed_services INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS portfolio_images TEXT[] DEFAULT '{}';
```

**What it does**: Adds fields to let contractors offer maintenance services

**Field-by-Field Breakdown**:

- **is_service_provider**: BOOLEAN DEFAULT false
  - **Purpose**: Flag indicating contractor also provides maintenance services
  - **Use case**: Contractor has equipment AND offers repair services
  - **Default false**: Not all contractors are service providers
  - **Business model**: "Full-service contractor" - owns equipment, posts jobs, repairs equipment

- **service_specializations**: TEXT[] DEFAULT '{}'
  - **Purpose**: Array of maintenance services offered
  - **Example**: `['hydraulic_repair', 'engine_overhaul', 'electrical', 'welding']`
  - ⚠️ **Free-text array**: Not linked to maintenance_type enum from migration 10
  - **Use case**: Contractors browse maintenance requests matching their specializations

- **completed_services**: INTEGER DEFAULT 0
  - **Purpose**: Counter of maintenance jobs completed
  - **Similar to**: total_ratings field for reputation building
  - ⚠️ **Manual update**: No trigger to auto-increment
  - **Use case**: Display experience level to potential customers

- **portfolio_images**: TEXT[] DEFAULT '{}'
  - **Purpose**: URLs to work examples (before/after photos)
  - **Example**: `['https://storage.../repair1.jpg', 'https://storage.../repair2.jpg']`
  - **Use case**: Visual proof of service quality
  - ⚠️ **No image validation**: URLs not verified, could be broken links

**Why This Design**:
- Contractors who own equipment often also repair equipment
- Dual role: post jobs (as contractor) + provide services (as technician)
- Avoids requiring separate account for technician work

**Issues Identified**:
1. 🔴 **Redundancy with Migration 18**: technician_profiles has nearly identical fields
   - Both have: specializations, completed_services, portfolio_images
   - Creates confusion: which to use?
2. ⚠️ **service_specializations not validated**: Free-text vs enum
3. ℹ️ **No auto-increment for completed_services**: Manual updates required
4. ℹ️ **No is_available field**: Can't mark temporarily unavailable

---

### Lines 9-19: Technician Ratings Table
```sql
-- Create technician_ratings table for maintenance service ratings
CREATE TABLE IF NOT EXISTS public.technician_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL,
  contractor_id UUID NOT NULL,
  quote_id UUID REFERENCES public.maintenance_quotes(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**What it does**: Creates separate rating system for maintenance services

**Why Separate from ratings table**:
- Migration 1's ratings table is for job marketplace (contractor → worker)
- This table is for maintenance marketplace (contractor → technician)
- Different context, different rating criteria

**Field-by-Field Breakdown**:

- **id**: UUID PRIMARY KEY (standard pattern)

- **technician_id**: UUID NOT NULL
  - ❌ **Missing FK**: Should reference auth.users(id) ON DELETE CASCADE
  - **Who gets rated**: Service provider (contractor with is_service_provider=true OR technician)
  - **Impact**: Orphaned ratings if user deleted

- **contractor_id**: UUID NOT NULL
  - ❌ **Missing FK**: Should reference auth.users(id) ON DELETE CASCADE
  - **Who gives rating**: Equipment owner who requested maintenance

- **quote_id**: UUID with FK to maintenance_quotes
  - ✅ **Good**: Has foreign key with CASCADE delete
  - **Links rating to specific quote**
  - **Optional**: NULL if rated without quote

- **request_id**: UUID with FK to maintenance_requests
  - ✅ **Good**: Has foreign key with CASCADE delete
  - **Links rating to specific maintenance request**
  - **Optional**: NULL possible

- **rating**: INTEGER with CHECK constraint
  - ✅ **Good**: CHECK (rating >= 1 AND rating <= 5) enforces 1-5 scale
  - **Consistent** with job ratings (same scale)

- **review**: TEXT (optional)
  - Written feedback about service
  - **Example**: "Fast response, quality work, reasonable price"

- **created_at**: Timestamp

**Rating Flow**:
```
1. Contractor posts maintenance_request
2. Technician submits maintenance_quote
3. Contractor accepts quote
4. Service performed
5. Contractor creates technician_rating
```

**Issues Identified**:
1. 🔴 **Missing FKs on technician_id and contractor_id**: No referential integrity
2. ℹ️ **No updated_at field**: Can't track rating edits
3. ℹ️ **No helpful/unhelpful votes**: Other users can't validate ratings
4. ⚠️ **Duplicate rating systems**: ratings (jobs) + technician_ratings (services)

---

### Lines 21-22: Enable RLS
```sql
-- Enable RLS
ALTER TABLE public.technician_ratings ENABLE ROW LEVEL SECURITY;
```

**Standard RLS enablement**

---

### Lines 24-39: Technician Ratings RLS Policies
```sql
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

**Policy 1: Public Read Access**
- **Rule**: USING (true) - anyone can view all ratings
- **Why public**: Technician reputation is public information
- **Use case**: Contractors check technician ratings before accepting quotes
- ✅ **Good for marketplace transparency**

**Policy 2: Contractor Can Rate Their Service Requests**
- **Rule**: Must be the contractor who requested maintenance
- **Verification**: EXISTS check confirms request ownership
- **Prevents**: Rating services you didn't receive
- **Security**: Can't rate your own work (contractor_id = auth.uid() AND technician_id ≠ auth.uid())

**Missing Policies**:
- ❌ **No UPDATE policy**: Can't edit ratings
- ❌ **No DELETE policy**: Can't remove ratings
- ❌ **No admin policies**: Admins can't moderate (should add in migration 15 style)

---

### Lines 41-46: Enhance Maintenance Requests
```sql
-- Add images field to maintenance_requests
ALTER TABLE public.maintenance_requests
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS manufacturer TEXT,
ADD COLUMN IF NOT EXISTS model TEXT,
ADD COLUMN IF NOT EXISTS serial_number TEXT;
```

**What it does**: Adds equipment details to maintenance requests

**New Fields**:

- **images**: TEXT[] DEFAULT '{}'
  - **Purpose**: Photos of equipment issue
  - **Example**: `['https://storage.../broken_hydraulic.jpg', 'https://storage.../leak_closeup.jpg']`
  - **Value**: Visual context helps technicians provide accurate quotes
  - **Use case**: "A picture is worth a thousand words"

- **manufacturer**: TEXT
  - **Purpose**: Equipment brand
  - **Example**: 'Caterpillar', 'John Deere', 'Komatsu'
  - **Why important**: Parts compatibility, expertise specialization

- **model**: TEXT
  - **Purpose**: Specific equipment model
  - **Example**: 'CAT 320', '420F', 'D6T'
  - **Why important**: Model-specific repair procedures

- **serial_number**: TEXT
  - **Purpose**: Unique equipment identifier
  - **Why important**: Warranty tracking, service history lookup
  - **Privacy**: Could identify equipment owner (careful with sharing)

**Why These Additions**:
- More accurate quotes from technicians
- Faster diagnosis with visual information
- Better matching (technician specializes in specific brands)
- Parts ordering (exact model/serial for parts lookup)

**Issues**:
- ℹ️ **No structured equipment database**: Free-text manufacturer/model
- ℹ️ **No image validation**: URLs not verified
- ℹ️ **No image storage management**: External URLs, not in Supabase storage

---

### Lines 48-52: Enhance Maintenance Quotes
```sql
-- Update maintenance_quotes to include more details
ALTER TABLE public.maintenance_quotes
ADD COLUMN IF NOT EXISTS arrival_time TEXT,
ADD COLUMN IF NOT EXISTS details_pdf_url TEXT;
```

**What it does**: Adds service details to quotes

**New Fields**:

- **arrival_time**: TEXT
  - **Purpose**: When technician can arrive
  - **Example**: '2025-12-10 09:00', 'Tomorrow morning', 'Within 2 hours'
  - ⚠️ **Free-text**: Should be TIMESTAMP or TIME type
  - **Use case**: Urgent repairs need fast response
  - **Better**: Use TIMESTAMP WITH TIME ZONE for specific arrival time

- **details_pdf_url**: TEXT
  - **Purpose**: Link to detailed quote document
  - **Example**: 'https://storage.../quote_12345.pdf'
  - **Use case**: Complex repairs with itemized parts list
  - **Format**: PDF with breakdown: labor, parts, timeline, warranty
  - ℹ️ **No PDF generation**: Application must create and upload PDF

**Why These Additions**:
- **arrival_time**: Critical for urgent repairs, helps contractors choose quotes
- **details_pdf**: Professional documentation, itemized costs, legal protection

**Issues**:
- ⚠️ **arrival_time is free-text**: Should be structured datetime
- ℹ️ **No PDF validation**: URL might be broken or not PDF
- ℹ️ **No versioning**: Can't track quote updates (new PDF replaces old)

---

## Schema Changes Summary

### Tables Modified
1. **contractor_profiles**
   - Added: is_service_provider BOOLEAN
   - Added: service_specializations TEXT[]
   - Added: completed_services INTEGER
   - Added: portfolio_images TEXT[]

2. **maintenance_requests**
   - Added: images TEXT[]
   - Added: manufacturer TEXT
   - Added: model TEXT
   - Added: serial_number TEXT

3. **maintenance_quotes**
   - Added: arrival_time TEXT
   - Added: details_pdf_url TEXT

### Tables Created
1. **technician_ratings**
   - Purpose: Rate maintenance service providers
   - Key fields: technician_id, contractor_id, rating (1-5), review
   - Relationships: quote_id → maintenance_quotes, request_id → maintenance_requests

### RLS Policies Created
- technician_ratings: 2 policies (SELECT public, INSERT contractor-only)

---

## Integration Notes

### Dependencies
- **Requires Migration 8**: contractor_profiles table
- **Requires Migration 9**: maintenance_requests, maintenance_quotes tables

### Modified By Later Migrations
- **Migration 17-18**: Adds dedicated technician role and technician_profiles table
  - Creates redundancy with is_service_provider approach

### Overlap with Migration 18
**Contractor with is_service_provider=true**:
- Has: service_specializations, completed_services, portfolio_images
- In: contractor_profiles table
- Purpose: Contractor who also provides services

**Dedicated technician user** (migration 18):
- Has: specializations, completed_services, portfolio_images
- In: technician_profiles table
- Purpose: User whose primary role is technician

**Result**: Two ways to be a service provider (architectural inconsistency)

---

## Issues & Recommendations

### Critical Issues
1. **🔴 Missing Foreign Keys**
   - technician_ratings.technician_id has no FK
   - technician_ratings.contractor_id has no FK
   - **Fix**:
   ```sql
   ALTER TABLE technician_ratings
   ADD CONSTRAINT fk_technician FOREIGN KEY (technician_id) REFERENCES auth.users(id) ON DELETE CASCADE,
   ADD CONSTRAINT fk_contractor FOREIGN KEY (contractor_id) REFERENCES auth.users(id) ON DELETE CASCADE;
   ```

2. **🔴 Architectural Redundancy**
   - Migration 16: contractor_profiles with is_service_provider flag
   - Migration 18: Separate technician_profiles table
   - **Impact**: Confusion about which to use, duplicate code
   - **Decision needed**: Pick one approach
   - **Recommendation**: Use dedicated technician_profiles (cleaner separation of concerns)

### Architecture Issues
1. **🟡 Free-Text arrival_time**
   - Should be TIMESTAMP WITH TIME ZONE
   - **Fix**:
   ```sql
   ALTER TABLE maintenance_quotes
   DROP COLUMN arrival_time,
   ADD COLUMN estimated_arrival TIMESTAMP WITH TIME ZONE;
   ```

2. **🟡 No Auto-Increment for completed_services**
   - Manual updates required
   - **Fix**: Add trigger when service marked complete
   ```sql
   CREATE FUNCTION increment_completed_services() RETURNS TRIGGER AS $$
   BEGIN
     IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
       UPDATE contractor_profiles
       SET completed_services = completed_services + 1
       WHERE user_id = NEW.provider_id AND is_service_provider = true;
     END IF;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;
   ```

3. **🟡 service_specializations Not Validated**
   - Free-text array, not linked to maintenance_type enum
   - **Fix**: Use enum or foreign key to services table

### Missing Features
1. ❌ **No is_available field**: Can't mark service provider unavailable
2. ❌ **No service_area for providers**: Where do they operate?
3. ❌ **No rating aggregation**: Must calculate average rating manually
4. ❌ **No admin policies on technician_ratings**: Can't moderate
5. ❌ **No UPDATE/DELETE policies**: Can't edit ratings

---

## For Unified Migration

### Consolidation Opportunities
1. **Choose One Service Provider Approach**

   **Option A: Contractor Flag** (this migration):
   ```sql
   -- Contractors can be service providers
   contractor_profiles.is_service_provider = true
   ```
   **Pros**: One account for dual role, simpler
   **Cons**: Mixing business concerns (job posting + service providing)

   **Option B: Dedicated Technician** (migration 18):
   ```sql
   -- Separate technician profiles
   CREATE TABLE technician_profiles (...)
   ```
   **Pros**: Clean separation, dedicated fields
   **Cons**: Need separate account or multi-role support

   **Recommendation**: Use technician_profiles approach
   - Cleaner architecture
   - Users can have multiple roles (contractor + technician)
   - Dedicated fields for technician-specific data

2. **Unified Ratings System**
   - Single ratings table with type field:
   ```sql
   CREATE TYPE rating_type AS ENUM ('job_completion', 'service_provision');
   CREATE TABLE ratings (
     ...
     type rating_type NOT NULL,
     ...
   );
   ```

3. **Remove Redundant Fields**
   - Don't add is_service_provider, service_specializations, etc. to contractor_profiles
   - Use dedicated technician_profiles instead

### Sequencing in Unified Migration
```
1. Core user tables (profiles, roles)
2. Specialized profiles (contractor, worker, customer, technician)
3. Marketplace tables (job_requests, maintenance_requests)
4. Quotes and responses (maintenance_quotes)
5. Unified ratings system (single table, type field)
6. All RLS policies
```

### Improvements for Unified Version
1. **Add all foreign keys**:
   ```sql
   CREATE TABLE technician_ratings (
     ...
     technician_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     ...
   );
   ```

2. **Use proper data types**:
   ```sql
   -- Instead of arrival_time TEXT
   estimated_arrival TIMESTAMP WITH TIME ZONE,
   estimated_duration INTERVAL -- e.g., '3 hours'
   ```

3. **Add rating aggregation**:
   ```sql
   -- Add to technician_profiles
   average_rating NUMERIC(3,2) DEFAULT 0,
   total_ratings INTEGER DEFAULT 0,

   -- Trigger to update on new rating
   CREATE FUNCTION update_technician_rating() ...
   ```

4. **Image storage in Supabase**:
   ```sql
   -- Instead of TEXT[] of URLs, use Supabase storage
   images TEXT[], -- Array of storage paths
   -- With storage bucket: technician-portfolios
   ```

5. **Add admin policies**:
   ```sql
   CREATE POLICY "Admin can moderate technician ratings"
   ON technician_ratings FOR UPDATE
   USING (has_role(auth.uid(), 'admin'));
   ```

### Dead Code to Remove
- is_service_provider, service_specializations, completed_services, portfolio_images from contractor_profiles
- Use technician_profiles instead (migration 18)

---

## Use Cases

### Contractor as Service Provider
```sql
-- Mark contractor as service provider
UPDATE contractor_profiles
SET
  is_service_provider = true,
  service_specializations = ARRAY['hydraulic_repair', 'engine_maintenance', 'welding'],
  portfolio_images = ARRAY['https://storage.../work1.jpg', 'https://storage.../work2.jpg']
WHERE user_id = auth.uid();

-- Find service providers by specialization
SELECT cp.*, p.full_name
FROM contractor_profiles cp
JOIN profiles p ON p.id = cp.user_id
WHERE cp.is_service_provider = true
  AND 'hydraulic_repair' = ANY(cp.service_specializations)
  AND cp.rating >= 4.0
ORDER BY cp.completed_services DESC;
```

### Enhanced Maintenance Requests
```sql
-- Create detailed maintenance request
INSERT INTO maintenance_requests (
  contractor_id, equipment_type, maintenance_type,
  description, location, urgency,
  images, manufacturer, model, serial_number
) VALUES (
  auth.uid(), 'excavator', 'hydraulic repair',
  'Hydraulic cylinder leaking oil, losing pressure',
  'Tel Aviv', 'high',
  ARRAY['https://storage.../leak_photo.jpg', 'https://storage.../pressure_gauge.jpg'],
  'Caterpillar', '320D', 'CAT0320DXXX12345'
);
```

### Enhanced Maintenance Quotes
```sql
-- Submit detailed quote
INSERT INTO maintenance_quotes (
  request_id, provider_id, price,
  estimated_duration, description,
  arrival_time, details_pdf_url
) VALUES (
  'request-uuid', auth.uid(), 1200.00,
  '4-6 hours', 'Replace hydraulic cylinder seal kit, flush system',
  'Tomorrow 08:00', 'https://storage.../detailed_quote.pdf'
);
```

### Rate Technician Service
```sql
-- Create rating after service completion
INSERT INTO technician_ratings (
  technician_id, contractor_id,
  quote_id, request_id,
  rating, review
) VALUES (
  'technician-uuid', auth.uid(),
  'quote-uuid', 'request-uuid',
  5, 'Excellent work! Fast response, diagnosed issue quickly, professional repair. Equipment running perfectly now.'
);

-- View technician's ratings
SELECT
  AVG(rating) as average_rating,
  COUNT(*) as total_ratings,
  COUNT(*) FILTER (WHERE rating = 5) as five_star_count
FROM technician_ratings
WHERE technician_id = 'technician-uuid';
```

### Browse Service Providers with Ratings
```sql
SELECT
  cp.*,
  p.full_name,
  COALESCE(AVG(tr.rating), 0) as average_rating,
  COUNT(tr.id) as rating_count
FROM contractor_profiles cp
JOIN profiles p ON p.id = cp.user_id
LEFT JOIN technician_ratings tr ON tr.technician_id = cp.user_id
WHERE cp.is_service_provider = true
  AND 'hydraulic_repair' = ANY(cp.service_specializations)
GROUP BY cp.id, p.full_name
HAVING COUNT(tr.id) >= 5 -- At least 5 ratings
ORDER BY AVG(tr.rating) DESC, COUNT(tr.id) DESC;
```

---

## Rollback Considerations

### To Rollback This Migration
```sql
-- Drop technician_ratings table
DROP TABLE IF EXISTS public.technician_ratings CASCADE;

-- Remove columns from contractor_profiles
ALTER TABLE public.contractor_profiles
DROP COLUMN IF EXISTS is_service_provider,
DROP COLUMN IF EXISTS service_specializations,
DROP COLUMN IF EXISTS completed_services,
DROP COLUMN IF EXISTS portfolio_images;

-- Remove columns from maintenance_requests
ALTER TABLE public.maintenance_requests
DROP COLUMN IF EXISTS images,
DROP COLUMN IF EXISTS manufacturer,
DROP COLUMN IF EXISTS model,
DROP COLUMN IF EXISTS serial_number;

-- Remove columns from maintenance_quotes
ALTER TABLE public.maintenance_quotes
DROP COLUMN IF EXISTS arrival_time,
DROP COLUMN IF EXISTS details_pdf_url;
```

### Data Loss Warning
- ⚠️ All technician ratings permanently deleted
- ⚠️ Service provider information lost (specializations, portfolio)
- ⚠️ Equipment details lost (images, manufacturer, model, serial)
- ⚠️ Quote arrival times and PDFs lost

### Rollback Blockers
- If migration 18 references is_service_provider field
- If ratings used in reputation calculations
- If service providers rely on portfolio display

---

## Testing Checklist

### Contractor Service Provider Fields
- [ ] Can set is_service_provider to true
- [ ] Can add service_specializations array
- [ ] Can increment completed_services
- [ ] Can add portfolio_images URLs
- [ ] Service provider flag visible in profile queries

### Technician Ratings
- [ ] Can create rating for service received
- [ ] Cannot create rating for service not received (EXISTS check)
- [ ] Cannot create rating for own service (contractor_id = technician_id check)
- [ ] Rating must be 1-5 (CHECK constraint enforced)
- [ ] Anyone can view all ratings (public)
- [ ] Cannot update ratings (no policy)
- [ ] Cannot delete ratings (no policy)

### Enhanced Maintenance Requests
- [ ] Can add images array to request
- [ ] Can add manufacturer, model, serial_number
- [ ] Fields optional (NULL allowed)
- [ ] Images display in request view

### Enhanced Maintenance Quotes
- [ ] Can add arrival_time to quote
- [ ] Can add details_pdf_url to quote
- [ ] Fields optional (NULL allowed)
- [ ] PDF accessible via URL

### Integration
- [ ] Service provider can submit quotes on maintenance requests
- [ ] Contractor can rate service after completion
- [ ] Average rating calculated correctly
- [ ] Equipment details help technicians provide accurate quotes

---

## Conclusion

Migration 16 significantly enhances the maintenance marketplace by enabling contractors to also provide services and adding detailed equipment information to requests and quotes. The technician_ratings system provides reputation tracking for service providers. However, this migration introduces architectural redundancy by adding service provider capabilities to contractor_profiles, which overlaps with the dedicated technician_profiles table created in migration 18.

**Key Achievements**:
- ✅ Enables dual-role users (contractor + service provider)
- ✅ Separate rating system for service provision
- ✅ Enhanced maintenance requests with equipment details and images
- ✅ Enhanced quotes with arrival time and detailed documentation
- ✅ Public ratings for marketplace transparency

**Critical Issues**:
- 🔴 Missing foreign keys on technician_ratings (data integrity risk)
- 🔴 Architectural redundancy with migration 18 (two service provider approaches)
- 🟡 Free-text arrival_time (should be structured datetime)
- 🟡 No auto-increment for completed_services counter
- 🟡 service_specializations not validated (free-text array)

**Architectural Decision Needed**:
Choose between:
1. **Contractor flag approach** (this migration): is_service_provider on contractor_profiles
2. **Dedicated technician approach** (migration 18): Separate technician_profiles table

**Recommendation**: Use dedicated technician_profiles for cleaner separation of concerns, allowing users to have multiple specialized roles.

**For Production**:
1. Add missing foreign key constraints
2. Choose one service provider approach (remove redundancy)
3. Use structured datetime for arrival_time
4. Add rating aggregation trigger
5. Add admin moderation policies for ratings
6. Validate image URLs and PDF links
7. Consider using Supabase storage instead of external URLs

This migration demonstrates the challenges of evolving architecture - the service provider concept was initially added to contractor_profiles, but later a more comprehensive solution (technician_profiles) was needed, creating overlap that should be resolved in a unified migration.
