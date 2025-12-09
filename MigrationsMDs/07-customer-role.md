# Migration 07: Customer Role

## Migration Info
- **Filename**: `20251202143021_1240260c-b632-40e5-bb97-dca037e3c827.sql`
- **Timestamp**: December 2, 2025 at 14:30:21 (3 days after migration 6)
- **Purpose**: Add 'customer' role to support new user type
- **Size**: 2 lines
- **Dependencies**: Migration 3 (modifies app_role enum)

## Overview
This migration extends the role system to include a fourth user type: 'customer'. This suggests the platform is expanding beyond the contractor-worker marketplace to include general customers.

**New Role System**:
- contractor (posts jobs)
- worker (accepts jobs)
- admin (platform management)
- **customer** (new - purpose unclear from migration alone)

---

## Line-by-Line Analysis

### Lines 1-2: Add Customer Value to Enum
```sql
-- Add 'customer' to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'customer';
```
**What it does**: Adds 'customer' as a new valid value to the app_role enum

**Syntax Breakdown**:
- `ALTER TYPE app_role`: Modifies the existing enum
- `ADD VALUE`: Adds a new enum value
- `IF NOT EXISTS`: Safe idempotency - won't error if 'customer' already exists
- `'customer'`: The new role name

**Why IF NOT EXISTS**:
- ✅ Safe to re-run migration
- ✅ Won't fail if migration run twice
- ✅ Good practice for enum modifications

**PostgreSQL Enum Behavior**:
- New value is appended to end of enum
- Existing values ('contractor', 'worker', 'admin') unchanged
- All existing data remains valid
- New users can now be assigned 'customer' role

---

## Schema Changes Summary

### Modified Enum
1. **app_role**: Now has 4 values instead of 3
   - Before: 'contractor', 'worker', 'admin'
   - After: 'contractor', 'worker', 'admin', 'customer'

### No Other Changes
- No new tables
- No new columns
- No new functions
- No policy changes

---

## Integration Notes

### Dependencies
- **Requires Migration 3**: Modifies app_role enum created there

### Affected Components
**Automatically affected** (because they use app_role enum):
1. **user_roles table**: Can now store 'customer' role
2. **has_role() function**: Can now check for 'customer' role
3. **All RLS policies using has_role()**: Will work with 'customer' role

**Example Policy Usage**:
```sql
-- Now possible
WHERE public.has_role(auth.uid(), 'customer')
```

### No New Policies Defined
**Critical**: While 'customer' role now exists, there are NO policies defining what customers can do:
- ❌ No policy: "Customers can view job requests"
- ❌ No policy: "Customers can create job requests"
- ❌ No explicit customer permissions

**This means**: Customers inherit whatever permissions already exist from shared policies

---

## Use Cases (Hypothetical)

### Use Case 1: Customer as Job Requester
If "customer" is similar to "contractor":
```sql
-- Might want policy like this (not in migration)
CREATE POLICY "Customers can create job requests"
ON public.job_requests
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'customer'));
```

### Use Case 2: Customer as Different Entity
If "customer" is a distinct role (e.g., for a marketplace viewing jobs):
```sql
-- Might want different permissions
CREATE POLICY "Customers can view but not post jobs"
ON public.job_requests
FOR SELECT
USING (public.has_role(auth.uid(), 'customer'));

-- Block customers from posting
-- (No INSERT policy for customers)
```

### Use Case 3: Customer for Equipment Rental
Related to migration 6's 'equipment_only' service type:
```sql
-- Maybe customers rent equipment
CREATE TABLE equipment_rentals (
  customer_id UUID REFERENCES profiles(id),
  equipment_type work_type,
  ...
);

CREATE POLICY "Customers can rent equipment"
ON equipment_rentals FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'customer'));
```

---

## Issues & Recommendations

### Critical Issue 1: No Defined Permissions for Customer
**Problem**: Role exists but has no explicit permissions
**Impact**:
- Customers can't do anything not covered by existing policies
- OR customers can do things they shouldn't (if policies say `true`)
**Recommendation**: Add customer-specific policies
```sql
-- Define what customers can do
CREATE POLICY "Customers can view job requests"
ON public.job_requests FOR SELECT
USING (public.has_role(auth.uid(), 'customer'));

CREATE POLICY "Customers can create job requests"
ON public.job_requests FOR INSERT
WITH CHECK (
  auth.uid() = contractor_id AND
  public.has_role(auth.uid(), 'customer')
);
```

### Critical Issue 2: Unclear Business Purpose
**Problem**: Migration doesn't explain what "customer" means
**Questions**:
- Is customer the same as contractor?
- Is customer a new type of job requester?
- Is customer just for browsing?
- Is customer for equipment rental?

**Impact**: Can't design proper permissions without understanding the role
**Recommendation**: Document business requirements:
```sql
-- Add comment explaining customer role
COMMENT ON TYPE app_role IS '
Roles:
- contractor: Posts job requests, hires workers
- worker: Accepts jobs, performs work
- admin: Platform management
- customer: [DEFINE PURPOSE HERE - e.g., "Views jobs, different payment model"]
';
```

### Issue 3: Relationship with Contractor Role
**Problem**: Overlap between 'customer' and 'contractor'?
**Questions**:
- Can a user be both customer and contractor?
- Do they post jobs differently?
- Different pricing or terms?

**Current System**: Users can have multiple roles (via user_roles table)
**Implication**: Same person could be customer AND contractor
**Recommendation**: Clarify business rules:
- If mutually exclusive: Add constraint
- If complementary: Document differences

### Issue 4: No UI or Application Changes
**Problem**: Backend supports customer role, but application may not
**Missing**:
- Customer option in signup form
- Customer dashboard/UI
- Customer-specific features
**Recommendation**: Ensure frontend supports new role

### Issue 5: Migration History Inconsistency
**Problem**: Enum evolution is fragmented
**Timeline**:
- Migration 1: user_role enum with 3 values (contractor, worker, admin)
- Migration 3: app_role enum with 3 values (contractor, worker, admin)
- Migration 7: app_role enum with 4 values (adds customer)

**Issue**: user_role enum still exists with only 3 values
**Recommendation**: Clean up in unified migration:
```sql
-- Unified approach: Create app_role with all 4 values from start
CREATE TYPE app_role AS ENUM ('contractor', 'worker', 'admin', 'customer');

-- Don't create user_role at all
```

---

## Rollback Considerations

### Cannot Easily Rollback
**PostgreSQL Limitation**: Cannot remove values from enums easily
**Workaround**: Must recreate enum
```sql
-- Complex rollback process
-- 1. Create new enum without 'customer'
CREATE TYPE app_role_new AS ENUM ('contractor', 'worker', 'admin');

-- 2. Update all tables using app_role
-- This is complex and error-prone

-- 3. Drop old enum and rename new one
DROP TYPE app_role;
ALTER TYPE app_role_new RENAME TO app_role;
```

**Safer Approach**: Leave enum value but don't use it
- Value exists but no users have it
- No policies reference it
- Effectively unused

**Data Consideration**:
- If any users have 'customer' role in user_roles table, rollback fails
- Must delete those assignments first

---

## For Unified Migration

### What to Include
✅ app_role enum with all 4 values from the start:
```sql
CREATE TYPE public.app_role AS ENUM ('contractor', 'worker', 'admin', 'customer');
```

### What to Add
➕ Customer-specific policies
➕ Documentation of what customer role means
➕ Customer-specific tables if needed (e.g., customer_profiles)

### What to Consider
🔧 Should customers use job_requests table or separate table?
🔧 Are customers a fourth type or an alias for contractors?
🔧 Do customers need special UI/features?

### Recommended Additions
```sql
-- Define customer permissions clearly
CREATE POLICY "Customers can view public job requests"
ON public.job_requests FOR SELECT
USING (public.has_role(auth.uid(), 'customer') AND status = 'open');

-- Maybe customer-specific profile fields
CREATE TABLE customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name TEXT,
  billing_address TEXT,
  payment_method TEXT,
  UNIQUE(user_id)
);

-- Or use shared profiles but track in user_roles
```

---

## Testing Considerations

### Tests Needed for Customer Role

**1. Role Assignment**
```sql
-- Can create customer users
INSERT INTO user_roles (user_id, role)
VALUES (test_user_id, 'customer');

-- has_role works
SELECT public.has_role(test_user_id, 'customer');
-- Should return true
```

**2. Permission Checks**
```sql
-- Customers can do X
-- Customers cannot do Y
-- Test all expected permissions
```

**3. Multi-Role Users**
```sql
-- User can be customer AND contractor
INSERT INTO user_roles (user_id, role)
VALUES
  (test_user_id, 'customer'),
  (test_user_id, 'contractor');

-- Both has_role checks return true
```

---

## Documentation Needed

### For Unified Migration
Must document:

1. **Purpose of Customer Role**
   - What can customers do?
   - How do they differ from contractors?

2. **Permission Matrix**
   ```
   | Action              | Contractor | Worker | Admin | Customer |
   |---------------------|-----------|--------|-------|----------|
   | View jobs           | ✅        | ✅     | ✅    | ✅       |
   | Post jobs           | ✅        | ❌     | ✅    | ?        |
   | Accept jobs         | ❌        | ✅     | ✅    | ❌       |
   | Create worker prof  | ❌        | ✅     | ✅    | ❌       |
   | Rate workers        | ✅        | ❌     | ✅    | ?        |
   ```

3. **Business Logic**
   - When should users be customers?
   - Can one person have multiple roles?
   - Pricing differences?

---

## Possible Interpretations

### Interpretation 1: Customer = Simpler Contractor
- Customers post jobs like contractors
- Maybe simplified UI or different terms
- Same permissions as contractors

### Interpretation 2: Customer = Different Entity
- Customers browse jobs but don't post
- Different business model (subscriptions?)
- Different payment structure

### Interpretation 3: Customer = Equipment Rental
- Customers rent equipment ('equipment_only' from migration 6)
- Don't hire workers, just rent tools
- Separate workflow from job requests

### Interpretation 4: Customer = Future Feature
- Added in anticipation of future feature
- Not yet implemented
- Role exists but unused

**Without more context, interpretation is unclear**

---

## Comparison with Other Roles

### Existing Roles (from Migration 3)

**Contractor**:
- Posts job requests
- Hires workers
- Rates workers after job completion
- Has policies defining these permissions

**Worker**:
- Creates worker profile
- Accepts jobs
- Gets rated
- Has policies defining these permissions

**Admin**:
- Platform management
- Can bypass restrictions
- No explicit policies (assumed superuser)

**Customer (New)**:
- ??? No policies defined
- Purpose unclear
- Permissions unknown

---

## Conclusion

This migration performs a **simple technical change** (adding enum value) but raises **important business questions**:

**Technical Aspects**:
- ✅ Simple, clean migration
- ✅ Safe with IF NOT EXISTS
- ✅ Backward compatible
- ✅ No breaking changes

**Business Aspects**:
- ❌ Purpose undefined
- ❌ No permissions set
- ❌ No documentation
- ❌ Unclear relationship to existing roles

**Recommendation for Unified Migration**:
1. **Include customer role** in app_role enum from start
2. **Document purpose** clearly in comments
3. **Define permissions** with appropriate policies
4. **Create customer-specific features** if needed (tables, UI, etc.)
5. **Clarify relationship** with contractor role

**This migration is incomplete** - it adds the role but doesn't define what it means or what customers can do. A production-ready unified migration should address these gaps with clear business logic and appropriate permissions.

---

## Follow-Up Questions for Project Owner

Before finalizing unified migration:
1. What is the customer role for?
2. Should customers be able to post jobs?
3. How do customers differ from contractors?
4. Can a user be both customer and contractor?
5. Are there customer-specific features planned?
6. Should there be customer-specific pricing or terms?

Answers to these questions will determine:
- Which policies to create
- Whether new tables are needed
- How to structure the unified migration
- What documentation to include
