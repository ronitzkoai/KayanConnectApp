# Integration Guide: Migration 12
## Chat Policy Fixes + Maintenance Marketplace

**Migration File:** `20251203110855_ed89110f-fea6-457d-ba62-e03abe0499b8.sql`
**Target File:** `supabase/migrations/MigrateUnite.sql`

---

## What This Migration Does

This migration has **2 main purposes**:

1. **Fixes a critical bug** - Infinite recursion in chat RLS policy
2. **Adds new feature** - Maintenance marketplace (requests & quotes)

---

## Integration Steps

### ✅ STEP 1: Fix Chat Policy (Replace)

**Why:** Current policy causes infinite loop when checking conversation participants

**Location in MigrateUnite.sql:** Lines 435-440

**FIND THIS CODE:**
```sql
CREATE POLICY "Users can view participants in their conversations"
ON public.conversation_participants
FOR SELECT
USING (user_id = auth.uid() OR conversation_id IN (
  SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
));
```

**REPLACE WITH THIS:**
```sql
CREATE POLICY "Users can view conversation participants"
ON conversation_participants FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  conversation_id = '00000000-0000-0000-0000-000000000001'
);
```

**What Changed:**
- Policy name simplified
- Removed recursive subquery (causes infinite loop)
- Direct check for global conversation UUID
- Added `TO authenticated` clause

**Why It's Safe:**
- Users can see their own participant records (user_id check)
- Everyone can see global conversation participants (hardcoded UUID)
- No recursion = no infinite loops

---

### ✅ STEP 2: Add UPDATE Policy for Conversations (Insert)

**Why:** Users need to update conversation metadata (like last_message_at timestamp)

**Location in MigrateUnite.sql:** After line 432 (after "Users can create conversations" policy)

**INSERT THIS CODE:**
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

**Context - Insert Between:**
```sql
CREATE POLICY "Users can create conversations"
  ON conversations
  FOR INSERT
  WITH CHECK (true);

-- 👇 INSERT NEW POLICY HERE

-- RLS Policies for conversation_participants
```

**What This Does:**
- Allows conversation participants to update conversation metadata
- Only participants can update (checked via conversation_participants join)
- Prevents non-participants from modifying conversations

---

### ✅ STEP 3: Add Maintenance Tables (Insert)

**Why:** New feature - marketplace where contractors request maintenance and providers submit quotes

**Location in MigrateUnite.sql:** After line 136 (after equipment_maintenance table and its policies)

**INSERT THIS ENTIRE SECTION:**
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

-- Enable RLS
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

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

-- Enable RLS
ALTER TABLE public.maintenance_quotes ENABLE ROW LEVEL SECURITY;

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

**Context - Insert After:**
```sql
-- (existing equipment_maintenance policies end around line 357)

CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 👇 INSERT MAINTENANCE TABLES HERE (all code above)

-- Job requests policies
CREATE POLICY "Anyone can view job requests"
```

**What This Adds:**

**Table: maintenance_requests**
- Contractors post maintenance needs for their equipment
- Anyone can view open requests (marketplace visibility)
- Only contractors can create requests (uses has_role check)
- Owners can update/delete their requests

**Table: maintenance_quotes**
- Service providers submit price quotes for maintenance requests
- Foreign key to maintenance_requests (CASCADE delete)
- Only quote provider and request owner can view quotes (privacy)
- Two UPDATE policies: providers edit their quote, owners accept/reject
- Providers can delete pending quotes only (not accepted/rejected)

---

### ⏭️ STEP 4: Skip Global Conversation Insert

**Why Skip:** This code is already in MigrateUnite.sql at lines 481-483

**Migration lines 28-30:**
```sql
INSERT INTO conversations (id, created_at, updated_at, last_message_at)
VALUES ('00000000-0000-0000-0000-000000000001', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
```

**Already exists in MigrateUnite.sql lines 481-483** - DO NOT add again.

---

## Summary of Changes

| Step | Action | Lines in Migration | Location in MigrateUnite.sql | Type |
|------|--------|-------------------|------------------------------|------|
| 1 | Replace chat policy | 7-13 | Replace lines 435-440 | Bug Fix |
| 2 | Add UPDATE policy | 16-25 | Insert after line 432 | Missing Feature |
| 3 | Add maintenance tables | 32-126 | Insert after line 136 | New Feature |
| 4 | Global conversation | 28-30 | Skip (already at 481-483) | No Action |

---

## Verification Checklist

After integration, verify:

- [ ] No syntax errors when running MigrateUnite.sql
- [ ] Chat participants query doesn't hang (no infinite recursion)
- [ ] Conversations can be updated by participants
- [ ] maintenance_requests table exists with 4 policies
- [ ] maintenance_quotes table exists with 5 policies
- [ ] Foreign key exists: maintenance_quotes.request_id → maintenance_requests.id
- [ ] has_role() function is called in maintenance_requests INSERT policy

---

## Testing

### Test 1: Chat Policy Fix
```sql
-- Should complete without hanging
SELECT * FROM conversation_participants
WHERE conversation_id = '00000000-0000-0000-0000-000000000001';
```

### Test 2: Conversation Update
```sql
-- As a participant in a conversation, should succeed
UPDATE conversations
SET last_message_at = NOW()
WHERE id = '<your-conversation-id>';
```

### Test 3: Maintenance Request
```sql
-- As contractor, should succeed
INSERT INTO maintenance_requests (contractor_id, equipment_type, maintenance_type, location)
VALUES (auth.uid(), 'Excavator', 'Oil Change', 'Job Site A');
```

### Test 4: Submit Quote
```sql
-- As any user, should succeed
INSERT INTO maintenance_quotes (request_id, provider_id, price)
VALUES ('<request-uuid>', auth.uid(), 500.00);
```

---

## Dependencies

**Requires:**
- Migration 3: has_role() function must exist
- Migration 4: Chat tables (conversations, conversation_participants, messages)
- Migration 5: Global conversation UUID ('00000000-0000-0000-0000-000000000001')

---

## Notes

- The infinite recursion bug is **critical** - prioritize Step 1
- Maintenance marketplace is optional if you don't need this feature
- Consider adding foreign keys for contractor_id and provider_id to enforce data integrity
- The two UPDATE policies on maintenance_quotes allow different users to update different columns

---

## Rollback

If you need to undo this migration:

```sql
-- Revert chat policy
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
CREATE POLICY "Users can view participants in their conversations"
ON public.conversation_participants FOR SELECT
USING (user_id = auth.uid() OR conversation_id IN (
  SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
));

-- Remove UPDATE policy
DROP POLICY IF EXISTS "Participants can update conversation" ON conversations;

-- Remove maintenance tables
DROP TABLE IF EXISTS public.maintenance_quotes CASCADE;
DROP TABLE IF EXISTS public.maintenance_requests CASCADE;
```
