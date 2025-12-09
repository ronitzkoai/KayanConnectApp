# Integrate Migration 09: Chat Policy Fix & Data Cleanup

## Overview

This guide explains how to integrate **Migration 09** into the unified `MigrateUnite.sql` file.

**What This Migration Does**:
- **Fixes critical chat bug**: Replaces conversation_participants policy to eliminate infinite recursion
- **Cleans duplicate data**: Removes duplicate user_roles entries (one-time data fix)

**Integration Approach**:
This is a **small bug-fix migration** with 1 REPLACE operation and 1 data cleanup that we'll skip.

**Migration Being Integrated**:
- `20251202181723_543a5e37-5868-45b8-afaf-85a435e80392.sql` (Migration 09 - **17 lines**)

**NOTE**: The migration documentation file (09-maintenance-marketplace.md) is INCORRECT. It describes 126 lines including maintenance marketplace tables that are NOT in this migration file. The actual file only contains chat fixes.

---

## REPLACE Action: Fix conversation_participants Policy

**Location**: Lines 320-329 in MigrateUnite.sql (conversation_participants policies section)

**Reason**: The original policy from Migration 04 caused **infinite recursion**.

**The Problem**:
The original policy likely used an EXISTS subquery that referenced the same table:

```sql
-- PROBLEMATIC VERSION (causes infinite recursion)
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
  )
);
```

When checking if a user can view a conversation_participants row:
1. Policy queries conversation_participants table
2. That query triggers the same policy again
3. Which queries conversation_participants again
4. **Infinite recursion** → database error

**The Fix**:
Replace EXISTS with IN subquery that Postgres can optimize without recursion.

**FIND this section** (lines 320-329):
```sql
CREATE POLICY "Users can view participants in their conversations"
  ON conversation_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
  );
```

**REPLACE with**:
```sql
CREATE POLICY "Users can view participants in their conversations"
ON public.conversation_participants
FOR SELECT
USING (user_id = auth.uid() OR conversation_id IN (
  SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
));
```

**Why this works**:
- **Part 1**: `user_id = auth.uid()`
  - Direct equality check, no recursion
  - You can always see your own participation record

- **Part 2**: `conversation_id IN (SELECT conversation_id FROM ... WHERE user_id = auth.uid())`
  - IN subquery executes once, returns list of conversation IDs where you're a participant
  - Then checks if current row's conversation_id is in that list
  - Postgres optimizes IN differently than EXISTS, avoiding recursion

**Result**:
- User can see all participant records in conversations where they're a participant
- No infinite recursion
- Critical bug fix for chat functionality

---

## SKIP Action: Duplicate User Roles Cleanup

**Location**: N/A (do not add to unified migration)

**What the original migration does**:
```sql
-- Clean up duplicate user roles (keep the first one created)
DELETE FROM public.user_roles a
USING public.user_roles b
WHERE a.id > b.id
  AND a.user_id = b.user_id;
```

**What this does**:
- Finds duplicate user_roles entries (same user_id, different id)
- Keeps the one with the smaller id (created first)
- Deletes the duplicates

**Why SKIP this**:
1. **One-time data fix**: This cleans up duplicates that existed in production at the time
2. **Not a schema change**: This is data manipulation, not structure
3. **Won't have duplicates in unified migration**: Starting from scratch means clean data
4. **Already prevented**: The `UNIQUE (user_id, role)` constraint from Migration 03 prevents duplicates
5. **Harmless but unnecessary**: Would try to DELETE from empty table (no effect)

**Recommendation**: Do NOT add this to unified migration. The constraint prevents duplicates going forward.

---

## Execution Order

Follow this sequence when applying to `MigrateUnite.sql`:

1. **REPLACE**: conversation_participants SELECT policy (fix infinite recursion)
   - Find at lines 320-329
   - Replace the policy with the fixed version

2. **SKIP**: Duplicate user_roles cleanup
   - Do NOT add to unified migration

**Why this order**:
- Only one change to make: the policy fix
- Data cleanup not needed in clean migration

---

## Verification After Integration

### 1. Check Chat Policy Fixed
```sql
-- Should show the new policy definition with IN subquery (not EXISTS)
SELECT policy_name, definition
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'conversation_participants'
AND policy_name = 'Users can view participants in their conversations';
```

Expected result should contain:
- `user_id = auth.uid()`
- `conversation_id IN (SELECT ...)`
- Should NOT contain `EXISTS`

### 2. Test Chat Participants Query
```sql
-- Should NOT cause infinite recursion error
SELECT * FROM conversation_participants
WHERE conversation_id = 'some-conversation-uuid';
```

### 3. Verify No Duplicates in user_roles
```sql
-- Should return 0 (no duplicates)
SELECT user_id, role, COUNT(*) as count
FROM user_roles
GROUP BY user_id, role
HAVING COUNT(*) > 1;
```

---

## Summary

**Migration 09** (Chat Policy Fix & Data Cleanup):
- ✅ REPLACE conversation_participants SELECT policy (fix infinite recursion bug)
- ✅ SKIP duplicate user_roles cleanup (one-time data fix, not needed in unified)

**Total Changes**: 1 action (1 REPLACE, 1 SKIP)

**Migration Size**: 17 lines (NOT 126 lines as documentation claimed)

**Critical Bug Fix**: Eliminates infinite recursion in chat participant queries

**No New Features**: This is purely a bug fix migration

**Result**: MigrateUnite.sql now includes migrations 01-09 (9 of 20 complete)

---

## Important Note About Documentation

The documentation file `MigrationsMDs/09-maintenance-marketplace.md` incorrectly describes this migration as 126 lines including:
- maintenance_requests table
- maintenance_quotes table
- Full RLS policies for maintenance marketplace

**This is WRONG**. The actual migration file `20251202181723_543a5e37-5868-45b8-afaf-85a435e80392.sql` only contains:
- Chat policy fix (11 lines)
- Data cleanup (6 lines)
- **Total: 17 lines**

The maintenance marketplace content described in the documentation is likely in a different migration file, or the documentation was created for a different version of this migration.

---

## Next Migration

After integrating migration 09, the next migration to integrate is:

**Migration 10**: `20251203100014_183ded1e-1222-4326-8844-e46bb14ef6a6.sql`
- Check actual file content to see what it really contains
