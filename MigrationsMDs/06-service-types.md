# Migration 06: Service Types

## Migration Info
- **Filename**: `20251129132437_68bdfc26-922f-434c-8d4b-ee7eb8f8763a.sql`
- **Timestamp**: November 29, 2025 at 13:24:37 (2 days after migration 5)
- **Purpose**: Add service type options to job requests
- **Size**: 6 lines
- **Dependencies**: Migration 1 (modifies job_requests table)

## Overview
This migration adds flexibility to job postings by allowing contractors to specify whether they need:
1. An operator WITH equipment
2. Equipment only (no operator)
3. An operator only (no equipment)

**Business Logic**: Some jobs require the worker to bring their own equipment (backhoe, loader, etc.), while others provide the equipment and just need a skilled operator.

---

## Line-by-Line Analysis

### Lines 1-2: Create service_type Enum
```sql
-- Add service_type enum
CREATE TYPE service_type AS ENUM ('operator_with_equipment', 'equipment_only', 'operator_only');
```
**What it does**: Creates an enumerated type defining three service options

**Enum Values**:
1. **'operator_with_equipment'**: Worker brings both their skills AND equipment
   - Example: "Need a backhoe operator who has their own backhoe"
   - Most common scenario in construction/heavy equipment work

2. **'equipment_only'**: Just rent/use the equipment, no operator needed
   - Example: "I have an operator, just need to rent a loader"
   - Less common - more like equipment rental

3. **'operator_only'**: Need the skills, equipment is provided
   - Example: "We have a grader onsite, need someone who can operate it"
   - Common for jobs where equipment is already present

**Why Enum**:
- Type safety: Can't have invalid values
- Database-level constraint
- Self-documenting: Values describe the options
- Efficient storage

**Naming Convention**:
- Uses snake_case (consistent with work_type, urgency_level, etc.)
- Descriptive names that explain what's included

---

### Lines 4-6: Add Column to job_requests
```sql
-- Add service_type column to job_requests
ALTER TABLE job_requests
ADD COLUMN service_type service_type DEFAULT 'operator_with_equipment' NOT NULL;
```
**What it does**: Adds service_type column to existing job_requests table

**Column Details**:
- `service_type service_type`: Column name and type (both called service_type)
- `DEFAULT 'operator_with_equipment'`: Default value for new and existing rows
- `NOT NULL`: Column is required (can't be NULL)

**Why This Default**:
- **Most common scenario**: Usually need both operator and equipment
- **Backwards compatible**: Existing job requests get sensible default
- **Safe assumption**: If not specified, assume full service

**Impact on Existing Data**:
- ✅ All existing job_requests automatically get 'operator_with_equipment'
- ✅ No data loss or errors
- ✅ Existing jobs remain valid

**Migration Safety**:
- Adding column with DEFAULT is instant (doesn't rewrite table in PostgreSQL 11+)
- NOT NULL is safe because of DEFAULT value
- No disruption to existing data

---

## Schema Changes Summary

### New Enum Created
1. **service_type**: 'operator_with_equipment', 'equipment_only', 'operator_only'

### Column Added
1. **job_requests.service_type**: service_type enum, NOT NULL, DEFAULT 'operator_with_equipment'

### No New Tables or Functions
This is a simple schema extension - adds one enum and one column.

---

## Integration Notes

### Dependencies
- **Requires Migration 1**: Modifies job_requests table created there

### Impact on Existing Data
- **All existing job requests**: Automatically set to 'operator_with_equipment'
- **No breaking changes**: All queries continue to work
- **New queries can filter**: `WHERE service_type = 'operator_only'`

### Application Changes Required
**Forms need updating**:
- Job creation form should include service type dropdown
- Job listing should display service type
- Worker filtering should consider service type

**Example Usage**:
```sql
-- Contractor posts job needing operator only
INSERT INTO job_requests (contractor_id, work_type, location, work_date, service_type)
VALUES (contractor_id, 'backhoe', 'Site A', '2025-12-01', 'operator_only');

-- Worker searches for jobs where they need to bring equipment
SELECT * FROM job_requests
WHERE work_type = 'backhoe'
  AND service_type = 'operator_with_equipment';
```

---

## Use Cases

### Use Case 1: Full Service (Operator + Equipment)
**Scenario**: Contractor needs excavation work done
```sql
INSERT INTO job_requests (contractor_id, work_type, service_type, ...)
VALUES (contractor_id, 'backhoe', 'operator_with_equipment', ...);
```
**Worker Requirements**:
- ✅ Must have backhoe skills
- ✅ Must own a backhoe
- ✅ Brings everything to the job site

---

### Use Case 2: Equipment Rental Only
**Scenario**: Contractor has an operator, needs to rent equipment
```sql
INSERT INTO job_requests (contractor_id, work_type, service_type, ...)
VALUES (contractor_id, 'loader', 'equipment_only', ...);
```
**Worker Requirements**:
- ❌ No operator needed
- ✅ Must have equipment available for rent
- 📝 Note: This is more like equipment rental, not really a "job request" for a worker

**Potential Issue**: This use case doesn't quite fit the schema
- Current schema assumes `work_type` refers to worker skills
- `equipment_only` means no worker needed, just equipment
- May need different table or approach for pure equipment rental

---

### Use Case 3: Operator for Provided Equipment
**Scenario**: Construction site has equipment onsite, needs operator
```sql
INSERT INTO job_requests (contractor_id, work_type, service_type, ...)
VALUES (contractor_id, 'grader', 'operator_only', ...);
```
**Worker Requirements**:
- ✅ Must have grader operation skills
- ❌ Equipment provided onsite
- ✅ Just bring expertise

---

## Issues & Recommendations

### Issue 1: equipment_only Doesn't Fit the Model
**Problem**: 'equipment_only' implies no worker needed, but job_requests assumes worker acceptance
**Current Schema**:
- `accepted_by` references worker_profiles
- `ratings` reference workers
- Entire flow assumes a worker performs the job

**Conflict**: 'equipment_only' means no worker is needed
**Implications**:
- Who accepts 'equipment_only' jobs?
- How are they rated?
- Is this really a job request or an equipment rental?

**Recommendation**:
```sql
-- Option 1: Remove equipment_only
ALTER TYPE service_type RENAME TO service_type_old;
CREATE TYPE service_type AS ENUM ('operator_with_equipment', 'operator_only');

-- Option 2: Create separate table for equipment rentals
CREATE TABLE equipment_rentals (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id),
  equipment_type work_type,
  ...
);
```

### Issue 2: No Validation Between work_type and service_type
**Problem**: Some combinations don't make sense
**Examples**:
- `work_type = 'laborer'` + `service_type = 'equipment_only'`
  - Laborers don't use heavy equipment
- `work_type = 'truck_driver'` + `service_type = 'operator_only'`
  - Usually drivers bring their own trucks

**Recommendation**: Add CHECK constraint or application-level validation
```sql
-- Example constraint (if needed)
ALTER TABLE job_requests ADD CONSTRAINT service_type_work_type_valid
CHECK (
  (work_type IN ('laborer', 'truck_driver') AND service_type = 'operator_with_equipment')
  OR
  (work_type NOT IN ('laborer', 'truck_driver'))
);
```

### Issue 3: Pricing May Differ by Service Type
**Problem**: Jobs with equipment should pay more than jobs without
**Current Schema**: No payment or rate fields in job_requests
**Consideration**:
- Should pricing be added to job_requests?
- Different rates for 'operator_with_equipment' vs 'operator_only'?
- Would affect worker decisions on which jobs to accept

**Recommendation**:
```sql
-- Add pricing fields
ALTER TABLE job_requests
ADD COLUMN rate_amount DECIMAL(10, 2),
ADD COLUMN rate_type TEXT CHECK (rate_type IN ('hourly', 'daily', 'per_job'));
```

### Issue 4: Worker Profile Doesn't Indicate Equipment Ownership
**Problem**: worker_profiles stores work_type but not whether they own equipment
**Current**:
- `work_type`: What kind of work they do
- Missing: Whether they own the equipment

**Gap**: Can't filter workers who have their own equipment vs those who don't
**Recommendation**:
```sql
-- Add equipment ownership flag
ALTER TABLE worker_profiles
ADD COLUMN owns_equipment BOOLEAN DEFAULT false;

-- Or more detailed
CREATE TABLE worker_equipment (
  worker_id UUID REFERENCES worker_profiles(id),
  equipment_type work_type,
  owned BOOLEAN DEFAULT true,
  available BOOLEAN DEFAULT true
);
```

---

## Rollback Considerations

### To Rollback This Migration
```sql
-- Remove column
ALTER TABLE job_requests DROP COLUMN service_type;

-- Drop enum
DROP TYPE service_type;
```

**Impact**:
- ✅ Safe if no code depends on service_type yet
- ⚠️ Loses service type information for all jobs
- ⚠️ May break application code expecting this column

---

## For Unified Migration

### What to Include
✅ service_type enum (possibly modified)
✅ service_type column on job_requests

### What to Consider Changing
🔧 Remove 'equipment_only' if it doesn't fit the model
🔧 Add equipment ownership fields to worker_profiles
🔧 Add pricing/rate fields to job_requests
🔧 Add validation between work_type and service_type

### Recommended Enum (Revised)
```sql
-- Option A: Keep both operator options only
CREATE TYPE service_type AS ENUM ('operator_with_equipment', 'operator_only');

-- Option B: More explicit naming
CREATE TYPE service_type AS ENUM ('full_service', 'operator_provided_equipment');

-- Option C: Even more options
CREATE TYPE service_type AS ENUM (
  'operator_with_equipment',  -- Worker brings both
  'operator_only',            -- Equipment provided
  'equipment_rental',         -- Separate from job requests
  'laborer'                   -- No equipment involved
);
```

### Recommended Worker Profile Extension
```sql
-- Track equipment ownership per worker
ALTER TABLE worker_profiles
ADD COLUMN owns_equipment BOOLEAN DEFAULT false,
ADD COLUMN equipment_details JSONB; -- Store equipment specifics

-- Or normalized approach
CREATE TABLE worker_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES worker_profiles(id) ON DELETE CASCADE,
  equipment_type work_type NOT NULL,
  make_model TEXT,
  year INTEGER,
  is_available BOOLEAN DEFAULT true
);
```

---

## Business Logic Implications

### Matching Algorithm
Job matching should now consider service_type:
```sql
-- Old matching: Just work_type
SELECT * FROM worker_profiles
WHERE work_type = 'backhoe';

-- New matching: work_type + service_type compatibility
SELECT * FROM worker_profiles wp
JOIN job_requests jr ON wp.work_type = jr.work_type
WHERE jr.service_type IN ('operator_with_equipment', 'operator_only')
  AND (
    (jr.service_type = 'operator_with_equipment' AND wp.owns_equipment = true)
    OR
    (jr.service_type = 'operator_only')
  );
```

### Payment Differentiation
Service type affects pricing:
- **operator_with_equipment**: Higher rate (includes equipment cost)
- **operator_only**: Lower rate (just labor)
- **equipment_only**: Rental rate (different model entirely)

### Search Filters
UI should allow filtering by service type:
- Workers can filter jobs: "Show me only jobs where I need my equipment"
- Contractors can filter workers: "Show me workers who own their equipment"

---

## Conclusion

This migration adds an **important business feature** that distinguishes between:
- Jobs requiring worker + equipment
- Jobs needing just an operator

**Strengths**:
- ✅ Simple, clean addition
- ✅ Safe migration (good default)
- ✅ Backward compatible
- ✅ Addresses real business need

**Weaknesses**:
- ⚠️ 'equipment_only' doesn't fit the job request model
- ⚠️ Missing worker equipment tracking
- ⚠️ No pricing fields to reflect value difference
- ⚠️ No validation of sensible combinations

**Recommendation for Unified Migration**:
1. Keep service_type enum (maybe revise values)
2. Add equipment ownership tracking to worker_profiles
3. Add pricing fields to job_requests
4. Consider separate table for equipment rentals
5. Add business logic validation

With these enhancements, the service type feature becomes a complete solution for differentiating job types in the construction/heavy equipment marketplace.
