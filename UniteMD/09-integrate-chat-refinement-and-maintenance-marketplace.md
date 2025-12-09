# Integrate Migration 12: Chat Refinement & Maintenance Marketplace

## Overview

This guide explains how to integrate **Migration 12** into the unified `MigrateUnite.sql` file.

**What This Migration Adds**:
This migration has TWO major components:

**Component 1: Chat System Refinement**
- Further refines conversation_participants policy (third iteration of fixing infinite recursion)
- Adds UPDATE policy for conversations table

**Component 2: Maintenance Marketplace** ⚠️ **THIS IS THE ACTUAL MAINTENANCE MARKETPLACE**
- Creates maintenance_requests table (contractors post equipment maintenance needs)
- Creates maintenance_quotes table (service providers submit quotes/bids)
- Full RLS policies for competitive bidding system

**Integration Approach**:
Mixed migration with 1 REPLACE, multiple ADDs, and 1 SKIP.

**Migration Being Integrated**:
- `20251203110855_ed89110f-fea6-457d-ba62-e03abe0499b8.sql` (Migration 12 - 126 lines)

**IMPORTANT NOTE**: The documentation file `MigrationsMDs/09-maintenance-marketplace.md` is INCORRECT. It claims Migration 09 contains the maintenance marketplace, but that's wrong. Migration 09 only has chat fixes. The ACTUAL maintenance marketplace is HERE in Migration 12.

---

## Component 1: Chat System Refinement

### REPLACE Action: conversation_participants SELECT Policy (Third Iteration)

**Location**: Lines 332-337 in MigrateUnite.sql (conversation_participants policies section)

**Reason**: This is the THIRD attempt to fix the infinite recursion bug:
- **Migration 04**: Original policy with EXISTS (infinite recursion)
- **Migration 09**: Fixed with IN subquery
- **Migration 12**: Simpler fix with hardcoded global chat UUID

**The Evolution**:

**Migration 09 version** (current in MigrateUnite.sql):
```sql
USING (user_id = auth.uid() OR conversation_id IN (
  SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
));
```

**Migration 12 version** (new, simpler):
```sql
USING (
  user_id = auth.uid() OR
  conversation_id = '00000000-0000-0000-0000-000000000001'
);
```

**What changed**:
- Removed IN subquery entirely
- Hardcoded global chat UUID directly
- Simpler, but ONLY works for global chat

**Trade-off**:
- ✅ Simpler query, better performance
- ❌ Doesn't support private conversations properly
- User can see their own participant record, OR see any record in global chat
- **Issue**: In private conversations, users can't see other participants

**FIND this section** (lines 332-337):
```sql
CREATE POLICY "Users can view participants in their conversations"
ON public.conversation_participants
FOR SELECT
USING (user_id = auth.uid() OR conversation_id IN (
  SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
));
```

**REPLACE with**:
```sql
CREATE POLICY "Users can view conversation participants"
ON conversation_participants FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  conversation_id = '00000000-0000-0000-0000-000000000001'
);
```

**Policy name changed**: "Users can view participants in their conversations" → "Users can view conversation participants"

---

### ADD Action: conversations UPDATE Policy

**Location**: After conversations INSERT policy (around line 395, after "Users can create conversations")

**Reason**: Allow participants to update conversation metadata:
- Update `last_message_at` timestamp when message sent
- Update conversation title/settings (if app adds those features)
- Mark conversation as read

**Why needed**:
- Conversations have `updated_at` and `last_message_at` fields
- Application needs to update these when messages sent
- Currently no UPDATE policy exists for conversations

**Code to ADD**:
```sql
CREATE POLICY "Participants can update conversation"
ON conversations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversations.id
    AND cp.user_id = auth.uid()
  )
);
```

**Policy breakdown**:
- Only participants in a conversation can update it
- Uses EXISTS subquery to check participation
- Allows updating conversation metadata (last_message_at, updated_at)

---

### SKIP Action: Ensure Global Conversation Exists

**Location**: N/A (do not add)

**What the migration does**:
```sql
INSERT INTO conversations (id, created_at, updated_at, last_message_at)
VALUES ('00000000-0000-0000-0000-000000000001', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
```

**Why SKIP this**:
- This INSERT is already in MigrateUnite.sql (line 411-413, from Migration 05)
- Adding it again would be redundant (ON CONFLICT does nothing anyway)
- Unified migration already ensures global conversation exists

---

## Component 2: Maintenance Marketplace

### ADD Action 1: Create maintenance_requests Table

**Location**: After subscriptions table (around line 151, before job_requests table)

**Reason**: Platform expansion into equipment maintenance marketplace:
- Contractors post maintenance requests for their equipment
- Service providers browse and bid on requests
- Competitive marketplace for maintenance services

**Different from Migration 10**:
- **Migration 10 equipment_maintenance**: Contractor's OWN maintenance tracking/logs
- **Migration 12 maintenance_requests**: Marketplace where contractors REQUEST services from providers

**Code to ADD**:
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

**Field breakdown**:

- **contractor_id**: UUID (NOT a foreign key)
  - References user making request
  - Intentionally loose coupling (like subscriptions table)

- **equipment_type**: TEXT (required)
  - What equipment needs maintenance: "Excavator", "Loader", "Backhoe"

- **equipment_name**: TEXT (optional)
  - Specific equipment: "CAT 320 #3", "Unit 5"

- **maintenance_type**: TEXT (required)
  - Type of service needed: "oil_change", "repair", "inspection"
  - Uses TEXT not enum from Migration 10 (different context)

- **description**: TEXT (optional)
  - Detailed problem description
  - Example: "Hydraulic cylinder leaking oil, needs replacement"

- **location**: TEXT (required)
  - Where equipment is located
  - Service provider needs to know where to go

- **preferred_date**: TIMESTAMP (optional)
  - When contractor wants service done
  - Optional: Service provider may offer different dates

- **urgency**: TEXT (default 'medium')
  - Priority level: 'low', 'medium', 'high', 'urgent'
  - Helps providers prioritize

- **status**: TEXT (default 'open')
  - Request state: 'open', 'quoted', 'in_progress', 'completed', 'cancelled'
  - Workflow tracking

- **budget_range**: TEXT (optional)
  - Contractor's budget guidance: "$500-1000", "up to $2000"
  - Helps providers submit realistic quotes

**Design notes**:
- No foreign keys (loose coupling pattern)
- TEXT fields instead of enums (flexibility)
- Marketplace request, not personal tracking

---

### ADD Action 2: Create maintenance_quotes Table

**Location**: After maintenance_requests table (around line 165)

**Reason**: Service providers submit competitive bids:
- Multiple providers can quote same request
- Contractor compares quotes and chooses winner
- Typical service marketplace pattern

**Code to ADD**:
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

**Field breakdown**:

- **request_id**: UUID with foreign key
  - Which maintenance request this quote is for
  - ON DELETE CASCADE: Delete quotes when request deleted

- **provider_id**: UUID (NOT a foreign key)
  - Service provider submitting quote
  - Loose coupling pattern

- **price**: NUMERIC (required)
  - Quote amount
  - NUMERIC for financial precision

- **estimated_duration**: TEXT (optional)
  - How long job will take: "2-3 hours", "1 day", "3 days"

- **description**: TEXT (optional)
  - What's included in quote
  - Service provider's approach/methodology

- **availability**: TEXT (optional)
  - When provider can do work: "Available immediately", "Can start Monday"

- **status**: TEXT (default 'pending')
  - Quote state: 'pending', 'accepted', 'rejected'
  - Only one quote per request gets 'accepted'

**Design notes**:
- Only request_id has foreign key (ensures referential integrity)
- provider_id intentionally loose
- No updated_at (quotes don't change, they're submitted once)

---

### ADD Action 3: Enable RLS on Maintenance Tables

**Location**: After subscriptions RLS enable (around line 216)

**Reason**: Security. Both marketplace tables need RLS enabled.

**Code to ADD**:
```sql
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_quotes ENABLE ROW LEVEL SECURITY;
```

---

### ADD Action 4: RLS Policies for maintenance_requests

**Location**: After subscriptions policies (around line 376)

**Reason**: Define who can view, create, update, delete maintenance requests.

**Code to ADD**:
```sql
-- RLS policies for maintenance_requests
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

**Policy breakdown**:

**Policy 1 - SELECT**: `USING (status = 'open' OR contractor_id = auth.uid())`
- **Part A**: Anyone can see 'open' requests (marketplace discovery)
- **Part B**: Contractors can always see their own requests (any status)
- **Why**: Service providers need to browse open requests; contractors manage own requests

**Policy 2 - INSERT**: `WITH CHECK (contractor_id = auth.uid() AND has_role(..., 'contractor'))`
- Must be creating request for yourself
- Must have contractor role
- **Prevents**: Non-contractors from posting requests

**Policy 3 - UPDATE**: `USING (contractor_id = auth.uid())`
- Can only update your own requests
- Use cases: Change status, update description, adjust budget

**Policy 4 - DELETE**: `USING (contractor_id = auth.uid())`
- Can only delete your own requests
- Use case: Cancel request before any quotes submitted

---

### ADD Action 5: RLS Policies for maintenance_quotes

**Location**: After maintenance_requests policies (around line 392)

**Reason**: Define who can view, create, update, delete quotes. More complex due to two UPDATE policies.

**Code to ADD**:
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

**Policy breakdown**:

**Policy 1 - SELECT**: Two-part OR condition
- **Part A**: Providers can see their own quotes
- **Part B**: Request owners can see all quotes on their requests
- **Result**: Competitive bidding (providers can't see competitors' quotes)

**Policy 2 - INSERT**: `WITH CHECK (provider_id = auth.uid())`
- Can only submit quotes as yourself
- Anyone (workers, contractors, other users) can be service providers
- Prevents submitting quotes on behalf of others

**Policy 3 - UPDATE**: `USING (provider_id = auth.uid())`
- Providers can update their own quotes
- Use case: Adjust price, change availability before contractor accepts

**Policy 4 - UPDATE** (second one!): Request owner can update quote status
- Contractor can mark quote as 'accepted' or 'rejected'
- EXISTS check ensures you own the request
- **Why two UPDATE policies**: Different users can update different fields
  - Provider updates quote content (price, description)
  - Contractor updates quote status (accepted/rejected)

**Policy 5 - DELETE**: `USING (provider_id = auth.uid() AND status = 'pending')`
- Can only delete your own quotes
- **AND status = 'pending'**: Can't delete accepted/rejected quotes
- Use case: Provider withdraws quote before contractor decides

---

## Execution Order

Follow this sequence when applying to `MigrateUnite.sql`:

1. **REPLACE**: conversation_participants SELECT policy
   - Find and replace at lines 332-337

2. **ADD**: conversations UPDATE policy
   - Insert after line 395 (after conversations INSERT policy)

3. **SKIP**: Global conversation INSERT (already exists)

4. **ADD**: maintenance_requests table
   - Insert after line 151 (after subscriptions table)

5. **ADD**: maintenance_quotes table
   - Insert after maintenance_requests table

6. **ADD**: Enable RLS on both maintenance tables
   - Insert after line 216 (with other RLS enable statements)

7. **ADD**: RLS policies for maintenance_requests (4 policies)
   - Insert after line 376 (after subscriptions policies)

8. **ADD**: RLS policies for maintenance_quotes (5 policies)
   - Insert after maintenance_requests policies

**Why this order**:
- Chat fixes first (bug fixes take priority)
- Tables before RLS
- Tables before policies
- Keeps related code grouped

---

## Verification After Integration

### 1. Check Chat Policy Updated
```sql
-- Should show new simpler policy with hardcoded UUID
SELECT policy_name, definition
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'conversation_participants'
AND policy_name = 'Users can view conversation participants';
```

### 2. Check Conversations UPDATE Policy Exists
```sql
-- Should return the new UPDATE policy
SELECT policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'conversations'
AND policyname = 'Participants can update conversation';
```

### 3. Check Maintenance Tables Exist
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('maintenance_requests', 'maintenance_quotes');
```

### 4. Check Foreign Key on maintenance_quotes
```sql
SELECT constraint_name, table_name, column_name
FROM information_schema.key_column_usage
WHERE table_schema = 'public'
AND table_name = 'maintenance_quotes'
AND column_name = 'request_id';
```

### 5. Check RLS Policies Count
```sql
-- Should show 4 for maintenance_requests, 5 for maintenance_quotes
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('maintenance_requests', 'maintenance_quotes')
GROUP BY tablename;
```

### 6. Test Maintenance Request Creation
```sql
-- Should succeed for contractor
INSERT INTO maintenance_requests (
  contractor_id, equipment_type, maintenance_type, location
)
VALUES (
  auth.uid(),
  'Excavator CAT 320',
  'hydraulic_repair',
  'Job Site A'
);
```

### 7. Test Quote Submission
```sql
-- Should succeed for any authenticated user
INSERT INTO maintenance_quotes (
  request_id, provider_id, price, description
)
VALUES (
  'request-uuid',
  auth.uid(),
  1500.00,
  'Can repair hydraulic system, 2-day turnaround'
);
```

---

## Summary

**Migration 12** (Chat Refinement & Maintenance Marketplace):

**Chat Component**:
- ✅ REPLACE conversation_participants policy (third iteration of infinite recursion fix)
- ✅ ADD conversations UPDATE policy
- ✅ SKIP global conversation INSERT (already exists)

**Maintenance Marketplace Component**:
- ✅ ADD maintenance_requests table (contractors post maintenance needs)
- ✅ ADD maintenance_quotes table (providers submit competitive bids)
- ✅ ADD RLS enable (2 tables)
- ✅ ADD RLS policies (4 for requests, 5 for quotes = 9 total)

**Total Changes**: 11 actions (1 REPLACE, 9 ADD, 1 SKIP)

**Result**: MigrateUnite.sql now includes migrations 01-12 (12 of 20 complete)

**Platform Features Added**:
- **Refined chat system**: Simpler policy, conversations can be updated
- **Maintenance marketplace**: Contractors request equipment maintenance services
- **Competitive bidding**: Service providers submit quotes, contractor chooses
- **Full CRUD**: Contractors and providers fully manage their marketplace activity

**Business Value**:
- **New revenue stream**: Maintenance marketplace fees
- **Contractor convenience**: One platform for jobs AND maintenance
- **Service provider opportunities**: New user type can earn on platform
- **Competitive pricing**: Multiple quotes drive better pricing

---

## Next Migration

After integrating migration 12, the next migration to integrate is:

**Migration 13**: Check the next migration file to see what it contains
