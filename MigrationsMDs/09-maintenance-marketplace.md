# Migration 09: Maintenance Marketplace & Chat Fixes

## Migration Info
- **Filename**: `20251202181723_543a5e37-5868-45b8-afaf-85a435e80392.sql`
- **Timestamp**: December 2, 2025 at 18:17:23 (4.5 hours after migration 8)
- **Purpose**: Fix chat policy infinite recursion bug, add maintenance service marketplace
- **Size**: 126 lines
- **Dependencies**:
  - Migration 3 (has_role() function)
  - Migration 4 (conversations, conversation_participants, messages tables)
  - Migration 5 (global chat)
  - Migration 8 (contractor_profiles)

## Overview
This migration serves dual purposes: First, it fixes critical bugs in the chat system (infinite recursion in RLS policies and duplicate user roles). Second, it introduces a complete maintenance service marketplace where contractors can post maintenance requests and service providers can submit quotes.

**Key Changes**:
- Fixes conversation_participants SELECT policy (removes recursion)
- Cleans up duplicate user_roles entries
- Adds conversations UPDATE policy
- Ensures global conversation exists
- Creates maintenance_requests table (contractors post equipment maintenance needs)
- Creates maintenance_quotes table (service providers bid on requests)
- Full RLS policies for marketplace

This migration marks the platform's expansion from job marketplace (contractor ↔ worker) to include service marketplace (contractor ↔ technician/service provider).

---

## Line-by-Line Analysis

### Section 1: Chat System Fixes

### Lines 1-11: Fix Conversation Participants Policy
```sql
-- Fix conversation_participants RLS policy that causes infinite recursion
-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;

-- Create a new policy that doesn't cause recursion
CREATE POLICY "Users can view participants in their conversations"
ON public.conversation_participants
FOR SELECT
USING (user_id = auth.uid() OR conversation_id IN (
  SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
));
```

**The Problem**: Infinite Recursion
The original policy (from migration 4) likely looked like:
```sql
-- PROBLEMATIC (hypothetical original):
USING (
  conversation_id IN (
    SELECT conversation_id FROM conversation_participants
    WHERE user_id = auth.uid()
  )
)
```

**Why it causes recursion**:
1. User queries conversation_participants
2. Policy checks: "Is conversation_id in user's conversations?"
3. To answer that, it queries conversation_participants again
4. That query triggers the same policy check
5. Infinite loop → database hangs or errors

**The Fix**: Two-Part OR Condition
```sql
user_id = auth.uid() OR conversation_id IN (...)
```

**How it works**:
- **Part 1** `user_id = auth.uid()`:
  - Direct match - no subquery needed
  - "Show me rows where I AM the participant"
  - Fast, no recursion

- **Part 2** `conversation_id IN (...)`:
  - "Show me participants in conversations I'm part of"
  - Still uses subquery, but Part 1 prevents recursion
  - When subquery runs, Part 1 catches the recursive call

**Example Scenario**:
```
conversation_participants:
| id | conversation_id | user_id |
|----|-----------------|---------|
| 1  | conv-1          | alice   |
| 2  | conv-1          | bob     |
| 3  | conv-2          | alice   |
| 4  | conv-2          | charlie |

Query as alice:
- Row 1: user_id = alice ✅ (Part 1)
- Row 2: conversation_id = conv-1, alice in conv-1 ✅ (Part 2)
- Row 3: user_id = alice ✅ (Part 1)
- Row 4: conversation_id = conv-2, alice in conv-2 ✅ (Part 2)

Result: Alice can see all participants in conv-1 and conv-2
```

**Issue Identified**:
- ⚠️ This fix is REPLACED in migration 12 (6 hours later)
- Migration 12 simplifies to reference global chat directly
- Shows iterative debugging of chat policies

---

### Lines 13-17: Clean Up Duplicate User Roles
```sql
-- Clean up duplicate user roles (keep the first one created)
DELETE FROM public.user_roles a
USING public.user_roles b
WHERE a.id > b.id
  AND a.user_id = b.user_id;
```

**What it does**: Removes duplicate role assignments for same user

**Why duplicates exist**:
- Migration 3 created user_roles table
- No UNIQUE constraint on (user_id, role) combination
- Application code may have inserted duplicates
- Or migration 3 data migration created duplicates

**How the DELETE works**:
- **USING clause**: Self-join on user_roles table
  - Alias `a` is the table being deleted from
  - Alias `b` is joined to find duplicates
- **WHERE a.id > b.id**: Keeps the LOWER id (first created)
  - If user has role entries with id=5 and id=10
  - DELETE removes id=10 (higher id)
- **AND a.user_id = b.user_id**: Only matches same user
  - Prevents accidental deletion of different users' roles

**Example**:
```
Before:
| id | user_id | role       |
|----|---------|------------|
| 1  | alice   | contractor |
| 2  | bob     | worker     |
| 3  | alice   | contractor | ← duplicate
| 4  | alice   | worker     |

After:
| id | user_id | role       |
|----|---------|------------|
| 1  | alice   | contractor | ← kept (lower id)
| 2  | bob     | worker     |
| 4  | alice   | worker     |
```

**Issues Identified**:
1. ℹ️ **No UNIQUE constraint added**: Doesn't prevent future duplicates
   - Should add: `ALTER TABLE user_roles ADD CONSTRAINT unique_user_role UNIQUE (user_id, role);`
2. ⚠️ **Data loss possible**: If duplicates have different metadata
   - This migration assumes all role entries are identical except id
3. ❌ **Doesn't handle duplicate roles**: If alice has 'worker' twice, only removes one

**Recommendation for Unified Migration**:
```sql
-- Add UNIQUE constraint to prevent duplicates
ALTER TABLE user_roles ADD CONSTRAINT unique_user_role UNIQUE (user_id, role);
-- Let constraint handle duplicates naturally (will error if exists)
```

---

### Section 2: Chat Enhancement (Lines 18-30)

This section is actually part of migration 12's content that was included here. Migration 12 refines these policies further.

(Analysis continues in migration 12 documentation)

---

### Section 3: Maintenance Marketplace

### Lines 32-47: Maintenance Requests Table
```sql
-- Create maintenance_requests table
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

**What it does**: Creates table for contractors to post equipment maintenance needs

**Field-by-Field Breakdown**:
- **id**: UUID primary key (standard pattern)
- **contractor_id**: UUID NOT NULL
  - ❌ **Missing foreign key**: Should be `REFERENCES auth.users(id) ON DELETE CASCADE`
  - Without FK: orphaned records possible if user deleted
- **equipment_type**: TEXT NOT NULL
  - Equipment category needing maintenance
  - Example: 'backhoe', 'excavator', 'loader'
  - ℹ️ Not linked to work_type enum (free-text)
- **equipment_name**: TEXT (optional)
  - Specific equipment identifier
  - Example: 'CAT 420F Backhoe Unit #3'
- **maintenance_type**: TEXT NOT NULL
  - Type of service needed
  - Example: 'oil change', 'hydraulic repair', 'tire replacement'
  - ℹ️ Free-text, not enum (flexible but inconsistent)
  - Note: Migration 10 creates maintenance_type enum, but this table doesn't use it
- **description**: TEXT (optional)
  - Detailed problem description
  - Example: 'Hydraulic system leaking, needs inspection'
- **location**: TEXT NOT NULL
  - Where equipment is located
  - Required for service provider to assess travel
- **preferred_date**: TIMESTAMP WITH TIME ZONE (optional)
  - When contractor wants service done
  - Allows scheduling flexibility
- **urgency**: TEXT DEFAULT 'medium'
  - Priority level: likely 'low', 'medium', 'high', 'urgent'
  - ℹ️ Free-text, not enum
  - Compare with job_requests.urgency (uses urgency_level enum)
- **status**: TEXT DEFAULT 'open'
  - Request lifecycle: 'open', 'quoted', 'accepted', 'in_progress', 'completed'
  - ℹ️ Free-text, should be enum
- **budget_range**: TEXT (optional)
  - Expected cost range
  - Example: '$500-$1000'
  - ℹ️ Free-text, not structured (could be numeric fields)
- **created_at** / **updated_at**: Standard timestamps
  - ❌ **No updated_at trigger**: Has column but no trigger
  - Inconsistent with other tables

**Business Logic**:
- Contractors post maintenance needs
- Service providers browse open requests
- Similar to job_requests but for equipment maintenance instead of hiring workers

**Issues Identified**:
1. 🔴 **Missing foreign key on contractor_id**: No referential integrity
2. ⚠️ **Free-text enums**: urgency, status, maintenance_type should be ENUMs
3. ❌ **No updated_at trigger**: Column exists but not maintained
4. ⚠️ **Maintenance_type mismatch**: Migration 10 creates enum, but this uses TEXT
5. ℹ️ **No equipment_id field**: Can't link to equipment inventory (if it exists)

---

### Lines 49-50: Enable RLS
```sql
-- Enable RLS
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
```

**Standard RLS enablement** - required for security

---

### Lines 52-71: Maintenance Requests RLS Policies
```sql
CREATE POLICY "Anyone can view open maintenance requests"
ON maintenance_requests FOR SELECT
TO authenticated
USING (status = 'open' OR contractor_id = auth.uid());

CREATE POLICY "Contractors can create maintenance requests"
ON maintenance_requests FOR INSERT
TO authenticated
WITH CHECK (contractor_id = auth.uid() AND has_role(auth.uid(), 'contractor'));

CREATE POLICY "Contractors can update their requests"
ON maintenance_requests FOR UPDATE
TO authenticated
USING (contractor_id = auth.uid());

CREATE POLICY "Contractors can delete their requests"
ON maintenance_requests FOR DELETE
TO authenticated
USING (contractor_id = auth.uid());
```

**Policy 1: Selective Read Access**
- **Rule**: Can see if request is 'open' OR you created it
- **Logic**:
  - All authenticated users see 'open' requests (marketplace visibility)
  - Only creator sees their own closed/in-progress requests (privacy)
- **Use case**: Service providers browse open requests, contractors track their own
- ⚠️ **Issue**: Other statuses ('quoted', 'accepted', 'in_progress', 'completed') only visible to creator
  - Service providers can't see requests they quoted on unless request still 'open'
  - Should add: `OR EXISTS (SELECT 1 FROM maintenance_quotes WHERE request_id = maintenance_requests.id AND provider_id = auth.uid())`

**Policy 2: Create Request (Contractors Only)**
- **Rule**: Must be authenticated + contractor role + inserting own ID
- **Security**: Prevents non-contractors from creating maintenance requests
- ℹ️ **Note**: Only contractors can request maintenance (makes sense - they own equipment)

**Policy 3: Update Own Request**
- **Rule**: Can only update requests you created
- **Missing**: No admin update policy (added in migration 15)
- **Use case**: Contractor updates status, changes description, closes request

**Policy 4: Delete Own Request**
- **Rule**: Can only delete requests you created
- **Use case**: Contractor cancels request before quotes received
- ⚠️ **Issue**: Can delete even after quotes submitted
  - Should add: `AND NOT EXISTS (SELECT 1 FROM maintenance_quotes WHERE request_id = maintenance_requests.id)`
  - Or: Status-based deletion: `AND status = 'open'`

---

### Lines 73-84: Maintenance Quotes Table
```sql
-- Create maintenance_quotes table
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

**What it does**: Stores service provider bids on maintenance requests

**Field-by-Field Breakdown**:
- **id**: UUID primary key
- **request_id**: UUID NOT NULL with foreign key
  - ✅ **Good**: Has REFERENCES constraint
  - ✅ **Good**: ON DELETE CASCADE (quotes deleted when request deleted)
- **provider_id**: UUID NOT NULL
  - ❌ **Missing foreign key**: Should reference auth.users(id)
  - Service provider submitting quote
- **price**: NUMERIC NOT NULL
  - Quote amount
  - ℹ️ No CHECK constraint (negative prices possible)
  - ℹ️ No currency field (assumes single currency)
- **estimated_duration**: TEXT (optional)
  - How long service will take
  - Example: '2 hours', '1 day', '3-4 hours'
  - ℹ️ Free-text, not structured (could be INTERVAL type)
- **description**: TEXT (optional)
  - Quote details, what's included
  - Example: 'Includes parts, labor, 90-day warranty'
- **availability**: TEXT (optional)
  - When provider can do the work
  - Example: 'Available tomorrow', 'Next week'
  - ℹ️ Free-text, should be DATE or TIMESTAMP
- **status**: TEXT DEFAULT 'pending'
  - Quote lifecycle: 'pending', 'accepted', 'rejected'
  - ℹ️ Free-text, should be enum
- **created_at**: Timestamp
  - ❌ **No updated_at column**: Can't track quote modifications
  - Different pattern from other tables

**Relationships**:
```
maintenance_requests (1) ←→ (many) maintenance_quotes
contractor posts request → service providers submit quotes
```

**Business Flow**:
1. Contractor creates maintenance_request
2. Service providers submit maintenance_quotes
3. Contractor reviews quotes
4. Contractor accepts one quote (status = 'accepted')
5. Service performed
6. (Migration 16 adds technician_ratings for feedback)

**Issues Identified**:
1. 🔴 **Missing FK on provider_id**: No referential integrity
2. ❌ **No updated_at column**: Can't track quote revisions
3. ⚠️ **Free-text fields**: status, estimated_duration, availability should be structured
4. ℹ️ **No CHECK constraint on price**: `CHECK (price >= 0)`
5. ℹ️ **No accepted_at timestamp**: Can't track when quote was accepted

---

### Lines 86-87: Enable RLS on Quotes
```sql
-- Enable RLS
ALTER TABLE public.maintenance_quotes ENABLE ROW LEVEL SECURITY;
```

**Standard RLS enablement**

---

### Lines 89-125: Maintenance Quotes RLS Policies
```sql
-- RLS policies for maintenance_quotes
CREATE POLICY "Request owners can view quotes"
ON maintenance_quotes FOR SELECT
TO authenticated
USING (
  provider_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM maintenance_requests mr
    WHERE mr.id = maintenance_quotes.request_id
    AND mr.contractor_id = auth.uid()
  )
);

CREATE POLICY "Users can submit quotes"
ON maintenance_quotes FOR INSERT
TO authenticated
WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Providers can update their quotes"
ON maintenance_quotes FOR UPDATE
TO authenticated
USING (provider_id = auth.uid());

CREATE POLICY "Request owners can update quote status"
ON maintenance_quotes FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM maintenance_requests mr
    WHERE mr.id = maintenance_quotes.request_id
    AND mr.contractor_id = auth.uid()
  )
);

CREATE POLICY "Providers can delete their pending quotes"
ON maintenance_quotes FOR DELETE
TO authenticated
USING (provider_id = auth.uid() AND status = 'pending');
```

**Policy 1: Dual Read Access**
- **Rule**: Can see quote if you're the provider OR the request owner
- **Part A**: `provider_id = auth.uid()` - providers see their own quotes
- **Part B**: EXISTS subquery - request owners see all quotes on their requests
- **Security**: Third parties cannot see quotes
- ✅ **Good design**: Privacy for both sides

**Policy 2: Create Quote (Anyone)**
- **Rule**: Any authenticated user can submit quote
- **Security**: Must set provider_id to yourself
- ℹ️ **Missing role check**: Unlike maintenance_requests, no role requirement
  - Should contractors be able to quote on maintenance requests?
  - Probably should require 'technician' or 'service_provider' role
- **Recommendation**:
  ```sql
  WITH CHECK (
    provider_id = auth.uid() AND
    (has_role(auth.uid(), 'technician') OR
     EXISTS (SELECT 1 FROM contractor_profiles WHERE user_id = auth.uid() AND is_service_provider = true))
  )
  ```

**Policy 3: Update Own Quote**
- **Rule**: Providers can update their own quotes
- **Use case**: Revise price, change availability, update description
- ℹ️ **No status restriction**: Can update even after accepted
  - Should prevent editing accepted quotes: `AND status = 'pending'`

**Policy 4: Request Owner Updates Status**
- **Rule**: Contractor who owns request can update any quote on that request
- **Use case**: Accept or reject quotes (change status)
- **Security**: Only request owner, not other contractors
- ⚠️ **Overlap with Policy 3**: Two different users can UPDATE same quote
  - Provider updates: price, description, availability
  - Contractor updates: status
  - Potential conflict if both update simultaneously
- **Recommendation**: Split into separate columns or use CHECK constraints
  ```sql
  -- Provider can update quote details
  CREATE POLICY "Providers can update quote details"
  USING (provider_id = auth.uid() AND status = 'pending');

  -- Request owner can update status only
  CREATE POLICY "Request owners can update quote status"
  USING (request owner check)
  WITH CHECK (status IN ('accepted', 'rejected'));
  ```

**Policy 5: Delete Pending Quotes**
- **Rule**: Providers can delete ONLY their own AND ONLY if status = 'pending'
- **Security**: Cannot delete after accepted/rejected
- **Use case**: Provider withdraws quote before contractor decision
- ✅ **Good**: Status restriction prevents deleting accepted quotes

**Missing Policies**:
- ❌ No admin policies (added in migration 15)
- ❌ No contractor delete policy (contractors can't delete quotes on their requests)

---

## Schema Changes Summary

### Tables Modified
1. **conversation_participants**
   - Policy changed: "Users can view participants in their conversations" (fixed recursion)

2. **user_roles**
   - Data cleaned: Duplicate entries removed

### New Tables Created
1. **maintenance_requests**
   - Purpose: Contractors post equipment maintenance needs
   - Key fields: equipment_type, maintenance_type, location, urgency, status
   - Relationships: contractor_id → auth.users (no FK constraint ❌)

2. **maintenance_quotes**
   - Purpose: Service providers bid on maintenance requests
   - Key fields: request_id, provider_id, price, status
   - Relationships:
     - request_id → maintenance_requests (with FK ✅)
     - provider_id → auth.users (no FK constraint ❌)

### RLS Policies Created
- maintenance_requests: 4 policies (SELECT conditional, INSERT contractor-only, UPDATE own, DELETE own)
- maintenance_quotes: 5 policies (SELECT dual-access, INSERT any, UPDATE dual-access, DELETE restricted)

---

## Integration Notes

### Dependencies
- **Requires Migration 3**: has_role() function, app_role enum
- **Requires Migration 4**: conversation_participants table, messages table
- **Requires Migration 5**: Global chat conversation
- **Requires Migration 8**: contractor_profiles (business context for maintenance requests)

### Modified By Later Migrations
- **Migration 12**: Further refines conversation_participants policy (replaces the fix in this migration)
- **Migration 15**: Adds admin SELECT/UPDATE policies for maintenance tables
- **Migration 16**: Enhances maintenance_requests and maintenance_quotes with additional fields
  - Adds images[], manufacturer, model, serial_number to maintenance_requests
  - Adds arrival_time, details_pdf_url to maintenance_quotes
  - Creates technician_ratings table for rating service providers

### Data Migration Considerations
- Duplicate user_roles entries are permanently deleted (keeps first created)
- No automatic data population for new tables
- No migration of existing data into maintenance marketplace

---

## Issues & Recommendations

### Critical Issues
1. **🔴 Missing Foreign Keys**
   - maintenance_requests.contractor_id has no FK constraint
   - maintenance_quotes.provider_id has no FK constraint
   - **Impact**: Orphaned records possible, no referential integrity
   - **Fix**:
   ```sql
   ALTER TABLE maintenance_requests
   ADD CONSTRAINT fk_contractor
   FOREIGN KEY (contractor_id) REFERENCES auth.users(id) ON DELETE CASCADE;

   ALTER TABLE maintenance_quotes
   ADD CONSTRAINT fk_provider
   FOREIGN KEY (provider_id) REFERENCES auth.users(id) ON DELETE CASCADE;
   ```

2. **🔴 SELECT Policy Gap**
   - Service providers can't see requests they've quoted on unless status='open'
   - **Impact**: Can't track quote status changes
   - **Fix**: Add provider clause to maintenance_requests SELECT policy

### Architecture Issues
1. **🟡 Free-Text Enums**
   - status, urgency, maintenance_type should be ENUMs
   - Creates data inconsistency: 'Open' vs 'open' vs 'OPEN'
   - **Fix**: Create enums like job_requests pattern

2. **🟡 Missing Triggers**
   - maintenance_requests has updated_at but no trigger
   - maintenance_quotes missing updated_at entirely
   - **Fix**: Add triggers for both tables

3. **🟡 maintenance_type Mismatch**
   - This migration uses TEXT for maintenance_type
   - Migration 10 creates maintenance_type enum
   - Tables don't use the enum
   - **Fix**: ALTER COLUMN to use enum type

4. **🟡 Quote Policy Overlap**
   - Two UPDATE policies on maintenance_quotes cause ambiguity
   - Provider and contractor can both update
   - **Fix**: Separate policies with CHECK constraints on specific columns

### Security Issues
1. **⚠️ No Role Requirement for Quotes**
   - Any authenticated user can submit quotes
   - Should require technician role or service_provider flag
   - **Fix**: Add role check to INSERT policy

2. **⚠️ Unrestricted Quote Updates**
   - Providers can edit accepted quotes
   - Request owners can modify all quote fields
   - **Fix**: Add status restrictions and column-specific policies

### Missing Features
1. ❌ **No unique constraint on user_roles**: Doesn't prevent future duplicates
2. ❌ **No CHECK constraint on price**: Negative prices possible
3. ❌ **No accepted_at timestamp**: Can't track when quote was accepted
4. ❌ **No admin policies**: Added in migration 15

---

## For Unified Migration

### Consolidation Opportunities
1. **Combine chat fixes into single section**
   - Migrations 9 and 12 both fix conversation_participants
   - Create correct policy once instead of iterating

2. **Create proper enums upfront**
   - Define maintenance_request_status enum
   - Define maintenance_type enum (coordinate with migration 10)
   - Define quote_status enum

3. **Add all constraints at table creation**
   - Foreign keys on contractor_id and provider_id
   - CHECK constraints on price
   - UNIQUE constraint on user_roles

### Sequencing in Unified Migration
```
1. Enums (all status/type enums together)
2. Core tables (profiles, worker_profiles, contractor_profiles)
3. Marketplace tables (job_requests, maintenance_requests)
4. Related tables (ratings, maintenance_quotes)
5. All RLS policies
6. All triggers
```

### Improvements for Unified Version
1. **Add missing foreign keys immediately**:
   ```sql
   CREATE TABLE maintenance_requests (
     ...
     contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     ...
   );
   ```

2. **Use proper enums**:
   ```sql
   CREATE TYPE maintenance_request_status AS ENUM ('open', 'quoted', 'in_progress', 'completed', 'cancelled');
   CREATE TYPE quote_status AS ENUM ('pending', 'accepted', 'rejected');

   CREATE TABLE maintenance_requests (
     ...
     status maintenance_request_status DEFAULT 'open',
     ...
   );
   ```

3. **Add updated_at triggers**:
   ```sql
   CREATE TRIGGER update_maintenance_requests_updated_at
   BEFORE UPDATE ON maintenance_requests
   FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
   ```

4. **Fix quote policies**:
   ```sql
   -- Separate provider and contractor UPDATE policies with column restrictions
   CREATE POLICY "Providers can update quote details"
   ON maintenance_quotes FOR UPDATE
   USING (provider_id = auth.uid() AND status = 'pending');

   CREATE POLICY "Request owners can accept/reject quotes"
   ON maintenance_quotes FOR UPDATE
   USING (request owner subquery)
   WITH CHECK (status IN ('accepted', 'rejected'));
   ```

5. **Add role requirement for quoting**:
   ```sql
   CREATE POLICY "Service providers can submit quotes"
   ON maintenance_quotes FOR INSERT
   WITH CHECK (
     provider_id = auth.uid() AND
     (has_role(auth.uid(), 'technician') OR
      EXISTS (SELECT 1 FROM contractor_profiles WHERE user_id = auth.uid() AND is_service_provider = true))
   );
   ```

### Dead Code to Remove
- The conversation_participants fix in this migration is superseded by migration 12
- In unified migration, use the final version from migration 12

---

## Use Cases

### Maintenance Request Flow
1. **Contractor posts request**:
   ```sql
   INSERT INTO maintenance_requests (
     contractor_id, equipment_type, maintenance_type,
     description, location, urgency, budget_range
   ) VALUES (
     auth.uid(), 'excavator', 'hydraulic repair',
     'Leak in hydraulic line, needs urgent repair',
     'Tel Aviv', 'high', '$500-$1000'
   );
   ```

2. **Service providers browse open requests**:
   ```sql
   SELECT * FROM maintenance_requests
   WHERE status = 'open'
   AND location = 'Tel Aviv'
   ORDER BY urgency DESC, created_at ASC;
   ```

3. **Provider submits quote**:
   ```sql
   INSERT INTO maintenance_quotes (
     request_id, provider_id, price,
     estimated_duration, description, availability
   ) VALUES (
     'request-uuid', auth.uid(), 750.00,
     '3-4 hours', 'Includes parts and labor',
     'Available tomorrow morning'
   );
   ```

4. **Contractor reviews quotes**:
   ```sql
   SELECT mq.*, u.email, tp.rating
   FROM maintenance_quotes mq
   JOIN profiles u ON u.id = mq.provider_id
   LEFT JOIN technician_profiles tp ON tp.user_id = mq.provider_id
   WHERE mq.request_id = 'request-uuid'
   ORDER BY mq.price ASC;
   ```

5. **Contractor accepts quote**:
   ```sql
   UPDATE maintenance_quotes
   SET status = 'accepted'
   WHERE id = 'quote-uuid';

   UPDATE maintenance_requests
   SET status = 'in_progress'
   WHERE id = 'request-uuid';
   ```

### Chat Fix Verification
```sql
-- Test: User can see participants in their conversations
SELECT cp.*
FROM conversation_participants cp
WHERE cp.user_id = auth.uid() -- Part 1: direct match
   OR cp.conversation_id IN ( -- Part 2: conversations they're in
      SELECT conversation_id
      FROM conversation_participants
      WHERE user_id = auth.uid()
   );
```

### Duplicate Roles Check
```sql
-- Before migration 9: Find duplicates
SELECT user_id, role, COUNT(*) as count
FROM user_roles
GROUP BY user_id, role
HAVING COUNT(*) > 1;

-- After migration 9: Duplicates removed
-- Query returns no results
```

---

## Rollback Considerations

### To Rollback This Migration
```sql
-- Drop new tables (CASCADE removes policies and FK constraints)
DROP TABLE IF EXISTS public.maintenance_quotes CASCADE;
DROP TABLE IF EXISTS public.maintenance_requests CASCADE;

-- Restore original conversation_participants policy
DROP POLICY IF EXISTS "Users can view participants in their conversations"
ON public.conversation_participants;
-- (Would need to recreate original policy from migration 4)

-- Cannot restore deleted duplicate user_roles
-- Data loss is permanent
```

### Data Loss Warning
- ⚠️ All maintenance requests deleted
- ⚠️ All maintenance quotes deleted
- ⚠️ Duplicate user_roles cannot be restored (permanently deleted)
- ⚠️ Chat policy reverts to broken state (infinite recursion)

### Rollback Blockers
- If maintenance_requests referenced by other tables (migration 16 adds technician_ratings)
- If quotes have been accepted and services completed
- If migration 12 has run (policy changes again)

---

## Testing Checklist

### Chat Fixes
- [ ] Conversation participants policy doesn't cause infinite recursion
- [ ] Users can see participants in their conversations
- [ ] Users can see other participants in shared conversations
- [ ] No duplicate user_roles exist after migration
- [ ] Users with multiple roles retain all roles (no accidental deletion)

### Maintenance Requests
- [ ] Contractor can create maintenance request
- [ ] Non-contractor cannot create maintenance request
- [ ] All users can view 'open' requests
- [ ] Only creator can view non-open requests (privacy)
- [ ] Contractor can update own request
- [ ] Contractor can delete own request
- [ ] Cannot create request with contractor_id of another user

### Maintenance Quotes
- [ ] Any authenticated user can submit quote
- [ ] Provider can view their own quotes
- [ ] Request owner can view all quotes on their request
- [ ] Provider can update their own quote
- [ ] Request owner can update quote status
- [ ] Provider cannot delete accepted/rejected quote
- [ ] Provider can delete pending quote
- [ ] Cannot submit quote with negative price (should fail but doesn't - bug)

### Security
- [ ] Third parties cannot see private requests
- [ ] Third parties cannot see quotes on requests they're not involved in
- [ ] Cannot update other users' quotes
- [ ] Cannot delete other users' quotes
- [ ] Foreign key constraint prevents orphaned quotes when request deleted

---

## Conclusion

Migration 09 serves two critical purposes: fixing urgent chat system bugs and launching the maintenance service marketplace. The chat fixes address production issues (infinite recursion, duplicate data) that would have prevented the messaging system from functioning correctly. The maintenance marketplace introduces a new revenue stream by allowing contractors to source equipment repair services through the platform.

**Key Achievements**:
- ✅ Fixed chat policy infinite recursion bug
- ✅ Cleaned duplicate user_roles data
- ✅ Complete maintenance marketplace (requests + quotes)
- ✅ Full RLS security for new tables
- ✅ Dual-access quote visibility (provider and request owner)

**Critical Issues to Address**:
- 🔴 Missing foreign key constraints (data integrity risk)
- 🟡 Free-text enums (should use PostgreSQL ENUMs)
- 🟡 Missing updated_at triggers
- 🟡 Quote policy overlap (ambiguous update permissions)
- ⚠️ No role requirement for submitting quotes

This migration sets the foundation for:
- **Migration 10**: Equipment and fuel tracking for contractors
- **Migration 12**: Further chat policy refinement
- **Migration 16**: Enhanced maintenance marketplace (images, ratings, provider fields)
- **Migration 17-18**: Dedicated technician role and profiles

The maintenance marketplace will be significantly enhanced by later migrations, but this provides the essential foundation for contractors to request services and providers to respond with quotes.
