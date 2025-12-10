# Integration Guide: Migration 19
## Message Reactions + Notification Preferences

**Migration File:** `20251207150004_9dfe7417-42ba-452b-bb46-31f4fee96a92.sql`
**Purpose:** Add emoji reactions to messages + user notification preferences
**Complexity:** Simple (2 new tables, no modifications to existing)

---

## Overview

This migration adds **chat enhancements and notification controls**:

1. **message_reactions** - Emoji reactions on messages (like Slack/Discord)
2. **notification_preferences** - Per-user notification settings

**Total Changes:** 2 new tables + 6 RLS policies + 1 realtime subscription

---

## Integration Strategy

**ADD** both tables after messages table policies, before global chat setup.

**Why After Messages?**
- message_reactions references messages table (FK dependency)
- Logical grouping: all messaging-related tables together
- Before global chat INSERT statement (line 811)

---

## CHANGE 1: Add Message Reactions Table

### What This Does
Enables users to react to messages with emojis (👍, ❤️, etc.) like Slack/Discord.

### Integration Method: ADD

**Location:** After messages RLS policies (after line ~809)

**INSERT AFTER LINE 809 (after "Users can update their own messages" policy):**

```sql
-- Create message_reactions table for emoji reactions
CREATE TABLE public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_reactions
CREATE POLICY "Users can view reactions on messages in their conversations"
ON public.message_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_reactions.message_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add reactions to messages in their conversations"
ON public.message_reactions FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_reactions.message_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can remove their own reactions"
ON public.message_reactions FOR DELETE
USING (user_id = auth.uid());
```

**Context - Insert Between:**
```sql
CREATE POLICY "Users can update their own messages" ...
-- (line 809 ends)

-- 👇 INSERT MESSAGE_REACTIONS TABLE HERE

INSERT INTO conversations (id, created_at, updated_at, last_message_at) ...
-- (line 811 starts - global chat setup)
```

### Table Schema

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PRIMARY KEY | Unique reaction identifier |
| `message_id` | UUID | FK to messages, NOT NULL | Which message is being reacted to |
| `user_id` | UUID | NOT NULL | Who reacted (no FK - matches pattern) |
| `emoji` | TEXT | NOT NULL | The emoji used (e.g., "👍", "❤️") |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | When reaction was added |
| **UNIQUE** | - | (message_id, user_id, emoji) | One user can't use same emoji twice on same message |

### RLS Policies (3)

**1. SELECT Policy** - View reactions in your conversations
- Verifies user is a participant of the conversation containing the message
- Uses JOIN through messages → conversation_participants

**2. INSERT Policy** - Add reactions to your conversation's messages
- Must be your own user_id (user_id = auth.uid())
- Must be a conversation participant

**3. DELETE Policy** - Remove your own reactions only
- Simple: user_id = auth.uid()
- Can't delete others' reactions

### Why This Design

**No FK on user_id:**
- Consistent with existing pattern (technician_ratings, etc.)
- Prevents orphaned reactions if user deleted

**Unique constraint on (message_id, user_id, emoji):**
- Prevents duplicate reactions (can't add 👍 twice)
- But user can add multiple different emojis to same message

**CASCADE delete on message_id:**
- If message deleted, all reactions automatically deleted
- Clean data integrity

---

## CHANGE 2: Add Notification Preferences Table

### What This Does
Allows users to control which notifications they receive (push, message types, job updates, etc.).

### Integration Method: ADD

**Location:** After message_reactions table and policies (after previous insertion)

**INSERT AFTER message_reactions policies:**

```sql
-- Create notification_preferences table
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  push_enabled BOOLEAN DEFAULT true,
  personal_messages BOOLEAN DEFAULT true,
  general_chat BOOLEAN DEFAULT false,
  job_updates BOOLEAN DEFAULT true,
  maintenance_updates BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_preferences
CREATE POLICY "Users can view their own notification preferences"
ON public.notification_preferences FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own notification preferences"
ON public.notification_preferences FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own notification preferences"
ON public.notification_preferences FOR UPDATE
USING (user_id = auth.uid());
```

### Table Schema

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `id` | UUID | gen_random_uuid() | Primary key |
| `user_id` | UUID | NOT NULL UNIQUE | User these preferences belong to |
| `push_enabled` | BOOLEAN | true | Master switch for push notifications |
| `personal_messages` | BOOLEAN | true | Notify on direct messages |
| `general_chat` | BOOLEAN | false | Notify on general/global chat (off by default) |
| `job_updates` | BOOLEAN | true | Notify on job request changes |
| `maintenance_updates` | BOOLEAN | true | Notify on maintenance request/quote updates |
| `created_at` | TIMESTAMPTZ | now() | When preferences created |
| `updated_at` | TIMESTAMPTZ | now() | Last update time |

### RLS Policies (3)

**1. SELECT** - View own preferences only
**2. INSERT** - Create own preferences only
**3. UPDATE** - Update own preferences only

All three use `user_id = auth.uid()` - standard self-only pattern.

### Why This Design

**UNIQUE constraint on user_id:**
- Each user has exactly one preferences record
- Prevents duplicate preference rows

**No FK on user_id:**
- Matches existing pattern in codebase
- Consider adding: `REFERENCES auth.users(id) ON DELETE CASCADE`

**Boolean flags with sensible defaults:**
- General chat OFF by default (to avoid spam)
- Personal messages, job/maintenance updates ON (important notifications)
- Push notifications ON by default

**Missing: updated_at trigger**
- This table has updated_at column but no trigger
- Consider adding trigger like other tables:
  ```sql
  CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  ```

---

## CHANGE 3: Add Realtime Subscription

### Enable Real-time Updates for Reactions

**Location:** After existing realtime subscriptions (~line 967-969)

**FIND:**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
```

**ADD AFTER:**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
```

**Why:**
- Reactions should update in real-time (see reactions appear instantly)
- Matches pattern of other messaging tables
- notification_preferences doesn't need realtime (settings changes are local)

---

## Integration Summary

### Changes by Type

| Type | Count | Tables |
|------|-------|--------|
| **ADD Table** | 2 | message_reactions, notification_preferences |
| **ADD Policies** | 6 | 3 for message_reactions, 3 for notification_preferences |
| **ADD Realtime** | 1 | message_reactions |

**Total Lines Added:** ~60 lines

### Insertion Points

1. **Line ~810** - Insert message_reactions table + policies (after messages policies)
2. **Line ~810+35** - Insert notification_preferences table + policies (after reactions)
3. **Line ~970** - Add realtime subscription (after existing realtime)

---

## Integration Checklist

- [ ] Add message_reactions table after messages policies
- [ ] Enable RLS on message_reactions
- [ ] Add 3 RLS policies for message_reactions
- [ ] Add notification_preferences table after message_reactions
- [ ] Enable RLS on notification_preferences
- [ ] Add 3 RLS policies for notification_preferences
- [ ] Add realtime subscription for message_reactions

---

## Verification

After integration:

```sql
-- Check message_reactions table exists
\d public.message_reactions
-- Should show 5 columns with UNIQUE constraint

-- Check notification_preferences table exists
\d public.notification_preferences
-- Should show 9 columns with UNIQUE on user_id

-- Check RLS enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('message_reactions', 'notification_preferences');
-- Both should show rowsecurity = true

-- Check realtime enabled
SELECT schemaname, tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND tablename = 'message_reactions';
-- Should return 1 row
```

---

## Use Cases Enabled

### 1. Message Reactions
**Scenario:** User reacts to a message in a conversation

```sql
-- Add reaction to a message
INSERT INTO message_reactions (message_id, user_id, emoji)
VALUES ('message-uuid', auth.uid(), '👍');

-- View all reactions on a message
SELECT user_id, emoji, created_at
FROM message_reactions
WHERE message_id = 'message-uuid'
ORDER BY created_at;

-- Remove your reaction
DELETE FROM message_reactions
WHERE message_id = 'message-uuid'
AND user_id = auth.uid()
AND emoji = '👍';
```

### 2. Notification Preferences
```sql
-- Create preferences on first app launch
INSERT INTO notification_preferences (user_id)
VALUES (auth.uid());
-- Uses defaults: push=true, personal=true, general=false, etc.

-- User disables general chat notifications
UPDATE notification_preferences
SET general_chat = false
WHERE user_id = auth.uid();

-- User turns off all notifications
UPDATE notification_preferences
SET push_enabled = false
WHERE user_id = auth.uid();

-- Retrieve preferences for settings screen
SELECT * FROM notification_preferences WHERE user_id = auth.uid();
```

---

## Security Considerations

### message_reactions Policies

**✅ Secure:**
- Users can only view reactions in conversations they're part of
- Users can only add reactions with their own user_id
- Users can only delete their own reactions
- Prevents viewing private conversation reactions

**RLS Logic:**
- SELECT/INSERT policies verify conversation participation through JOIN
- DELETE policy ensures self-ownership only

### notification_preferences Policies

**✅ Secure:**
- All policies enforce `user_id = auth.uid()`
- No user can view/modify another user's preferences
- Standard self-only pattern

**⚠️ Consider Adding:**
- Admin SELECT policy (for support purposes):
  ```sql
  CREATE POLICY "Admin can view all notification preferences"
  ON public.notification_preferences FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
  ```

---

## Optional Improvements

### 1. Add Foreign Key to notification_preferences
```sql
ALTER TABLE public.notification_preferences
ADD CONSTRAINT fk_notification_user
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```
**Why:** Ensures referential integrity, auto-deletes preferences when user deleted

### 2. Add updated_at Trigger to notification_preferences
```sql
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```
**Why:** Table has updated_at column but no trigger to maintain it

### 3. Add Reaction Count Aggregation
```sql
-- Create view for reaction counts per message
CREATE VIEW message_reaction_counts AS
SELECT
  message_id,
  emoji,
  COUNT(*) as count,
  ARRAY_AGG(user_id) as user_ids
FROM message_reactions
GROUP BY message_id, emoji;
```
**Why:** Efficient queries for "5 people reacted with 👍"

---

## Notes

### Missing Foreign Keys
Both tables are missing FK constraints on user_id:
- **message_reactions.user_id** - no FK to auth.users
- **notification_preferences.user_id** - no FK to auth.users

This matches the pattern from other tables (technician_ratings, etc.) but is worth noting.

### Emoji Storage
The `emoji` column is TEXT type. Consider:
- **Pros:** Flexible, supports any Unicode emoji
- **Cons:** No validation, could store invalid values
- **Alternative:** Create emoji enum or constraint

### Real-time Performance
Reactions table will have high write frequency. Monitor:
- Real-time subscription performance
- Index on message_id for efficient lookups

---

## Rollback

If issues arise:

```sql
-- Drop tables (CASCADE removes policies automatically)
DROP TABLE IF EXISTS public.notification_preferences CASCADE;
DROP TABLE IF EXISTS public.message_reactions CASCADE;

-- Remove realtime subscription
ALTER PUBLICATION supabase_realtime DROP TABLE public.message_reactions;
```

---

## Estimated Integration Time

- **Reading/Understanding:** 3 minutes
- **Adding Tables + Policies:** 5 minutes (copy-paste)
- **Adding Realtime:** 1 minute
- **Testing:** 5 minutes
- **Total:** ~15 minutes
