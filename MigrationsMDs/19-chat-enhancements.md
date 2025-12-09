# Migration 19: Chat Enhancements

## Migration Info
- **Filename**: `20251207150004_9dfe7417-42ba-452b-bb46-31f4fee96a92.sql`
- **Timestamp**: December 7, 2025 at 15:00:04 (30 minutes after migration 18)
- **Purpose**: Add emoji reactions to messages and user notification preferences
- **Size**: 70 lines
- **Dependencies**:
  - Migration 4 (messages table, conversation_participants)
  - Migration 5 (realtime configuration)

## Overview
This migration enhances the chat system with two modern messaging features: emoji reactions on messages (like Slack/Discord) and granular notification preferences. These UX improvements make the chat more engaging and give users control over their notification experience.

**Key Changes**:
- message_reactions table for emoji reactions on messages
- notification_preferences table for user notification settings
- Realtime enablement for reactions (live updates)
- Full RLS policies for both tables

---

## Line-by-Line Analysis

### Lines 1-9: Message Reactions Table
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
```

**What it does**: Allows users to react to messages with emojis

**Field Breakdown**:
- **id**: UUID primary key
- **message_id**: UUID with FK to messages
  - ✅ **Good**: Has REFERENCES with CASCADE delete
  - **Effect**: When message deleted, all reactions deleted too
- **user_id**: UUID for who reacted
  - ❌ **Missing FK**: Should REFERENCES auth.users(id) ON DELETE CASCADE
- **emoji**: TEXT for emoji character
  - **Example**: '👍', '❤️', '😂', '🔥'
  - ⚠️ **Free-text**: Could be any text, not validated
  - **Better**: Enum or whitelist of allowed emojis
- **created_at**: Timestamp

**UNIQUE Constraint**:
```sql
UNIQUE(message_id, user_id, emoji)
```
- **Purpose**: User can only react once with same emoji per message
- **Allows**: Multiple different emojis from same user
- **Prevents**: Spam (clicking 👍 repeatedly)

**Example Scenarios**:
```
Message: "Great work on the excavation!"
Reactions:
- Alice: 👍 ✅
- Alice: ❤️ ✅
- Bob: 👍 ✅
- Alice: 👍 again ❌ (UNIQUE constraint prevents)
```

**Similar To**: Slack reactions, Discord reactions, Facebook reactions

---

### Lines 11-12: Enable RLS on Reactions
```sql
-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
```

**Standard RLS enablement**

---

### Lines 14-38: Message Reactions RLS Policies
```sql
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

**Policy 1: View Reactions**
- **Rule**: Can see reactions on messages in conversations you're part of
- **Check**: EXISTS query verifies participation
  1. Get message
  2. Get conversation from message
  3. Check if you're a participant

**Security**: Can't see reactions on private conversations you're not in

**Policy 2: Add Reactions**
- **Rules**:
  1. user_id = auth.uid() (reacting as yourself)
  2. EXISTS check (message is in your conversation)
- **Security**: Can't react to messages you don't have access to

**Policy 3: Remove Reactions**
- **Rule**: Can only delete your own reactions
- **Simple**: No conversation check needed (already can't react to others' conversations)
- **Use case**: Un-react, change reaction

**Missing**:
- ❌ **No UPDATE policy**: Reactions are insert-once, delete to remove (good pattern)
- ❌ **No admin policies**: Admins can't moderate reactions

---

### Lines 40-50: Notification Preferences Table
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
```

**What it does**: Stores user notification settings

**Field Breakdown**:
- **id**: UUID primary key
- **user_id**: UUID UNIQUE
  - ❌ **Missing FK**: Should REFERENCES auth.users(id) ON DELETE CASCADE
  - **UNIQUE**: One settings row per user
- **push_enabled**: BOOLEAN DEFAULT true
  - Master switch for all push notifications
  - **Use case**: Disable all notifications temporarily
- **personal_messages**: BOOLEAN DEFAULT true
  - Notify on direct messages
  - **Default true**: Important messages shouldn't be missed
- **general_chat**: BOOLEAN DEFAULT false
  - Notify on global chat messages
  - **Default false**: Global chat is high-volume, would spam
- **job_updates**: BOOLEAN DEFAULT true
  - Notify on job status changes (accepted, completed, etc.)
  - **Default true**: Critical for business operations
- **maintenance_updates**: BOOLEAN DEFAULT true
  - Notify on maintenance request/quote updates
  - **Default true**: Time-sensitive service requests
- **created_at / updated_at**: Standard timestamps

**Missing Notification Types**:
- No rating_received (when someone rates you)
- No new_quote_received (for maintenance requests)
- No payment_reminders (for subscriptions)
- No admin_announcements

**Better Structure**:
```sql
-- More flexible approach
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY,
  preferences JSONB DEFAULT '{
    "push_enabled": true,
    "email_enabled": true,
    "channels": {
      "personal_messages": true,
      "general_chat": false,
      "job_updates": true,
      "maintenance_updates": true,
      "ratings": true,
      "payments": true
    }
  }'::jsonb
);
```

---

### Lines 52-53: Enable RLS on Preferences
```sql
-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
```

**Standard RLS enablement**

---

### Lines 55-67: Notification Preferences RLS Policies
```sql
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

**Policy 1: View Own Preferences**
- **Rule**: Can only see your own settings
- **Privacy**: Other users can't see your notification preferences

**Policy 2: Insert Own Preferences**
- **Rule**: Can only create preferences for yourself
- **Use case**: First-time settings creation (likely on signup)

**Policy 3: Update Own Preferences**
- **Rule**: Can only modify your own settings
- **Use case**: Change notification settings in app

**Missing**:
- ❌ **No DELETE policy**: Can't delete preferences (probably intentional)
- ❌ **No admin policies**: Admins can't view/modify user preferences

---

### Lines 69-70: Enable Realtime for Reactions
```sql
-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
```

**What it does**: Enables real-time subscriptions for message_reactions

**Supabase Realtime**:
- **Purpose**: Live updates when reactions added/removed
- **Effect**: UI updates instantly when someone reacts
- **Similar to**: Slack's live reaction updates

**How It Works**:
```javascript
// Application subscribes to reactions
supabase
  .channel('message-reactions')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'message_reactions',
    filter: `message_id=eq.${messageId}`
  }, (payload) => {
    // Update UI with new reaction
    displayReaction(payload.new);
  })
  .subscribe();
```

**Why Realtime for Reactions**:
- ✅ **Better UX**: Reactions appear instantly for all users
- ✅ **Engagement**: See others reacting in real-time
- ✅ **No polling**: Efficient (vs checking for new reactions repeatedly)

**Not Realtime for Preferences**:
- notification_preferences NOT added to realtime
- **Why**: Preferences are personal, no need for live updates to others

---

## Schema Changes Summary

### Tables Created
1. **message_reactions**
   - Purpose: Emoji reactions on chat messages
   - Key fields: message_id, user_id, emoji
   - Relationships: message_id → messages (with FK ✅), user_id → auth.users (no FK ❌)
   - Constraint: UNIQUE(message_id, user_id, emoji)

2. **notification_preferences**
   - Purpose: User notification settings
   - Key fields: user_id (UNIQUE), push_enabled, channel-specific toggles
   - Relationships: user_id → auth.users (no FK ❌)

### RLS Policies Created
- message_reactions: 3 policies (SELECT in conversations, INSERT in conversations, DELETE own)
- notification_preferences: 3 policies (SELECT own, INSERT own, UPDATE own)

### Realtime Configured
- message_reactions table added to supabase_realtime publication

---

## Integration Notes

### Dependencies
- **Requires Migration 4**: messages table, conversation_participants
- **Requires Migration 5**: Realtime configuration (supabase_realtime publication)

### Usage Flow

**Message Reactions**:
```
1. User sends message
2. Other users see message
3. User clicks emoji reaction
4. INSERT into message_reactions
5. Realtime broadcasts to all conversation participants
6. All UIs update instantly with reaction
```

**Notification Preferences**:
```
1. User signs up
2. Default preferences created (or on first access)
3. User navigates to settings
4. Toggles notification preferences
5. UPDATE notification_preferences
6. Application respects preferences when sending notifications
```

---

## Issues & Recommendations

### Critical Issues
1. **🔴 Missing Foreign Keys**
   - message_reactions.user_id has no FK
   - notification_preferences.user_id has no FK
   - **Fix**:
   ```sql
   ALTER TABLE message_reactions
   ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

   ALTER TABLE notification_preferences
   ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
   ```

2. **🔴 emoji Field Not Validated**
   - Could be any text, not actual emoji
   - **Issues**: 'abc', empty string, SQL injection attempts
   - **Fix**: Add CHECK constraint or enum
   ```sql
   -- Option 1: Length check (emojis are short)
   emoji TEXT NOT NULL CHECK (char_length(emoji) <= 10),

   -- Option 2: Whitelist
   CREATE TYPE allowed_emoji AS ENUM ('👍', '❤️', '😂', '🔥', '✅', '❌');
   ALTER TABLE message_reactions ALTER COLUMN emoji TYPE allowed_emoji USING emoji::allowed_emoji;
   ```

### Architecture Issues
1. **🟡 No updated_at Trigger on notification_preferences**
   - Has updated_at column but no trigger
   - **Fix**:
   ```sql
   CREATE TRIGGER update_notification_preferences_updated_at
   BEFORE UPDATE ON notification_preferences
   FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
   ```

2. **🟡 Limited Notification Channels**
   - Only 5 notification types
   - **Missing**: ratings, payments, announcements, mentions
   - **Better**: JSONB for flexibility

3. **🟡 No Reaction Count Aggregation**
   - Must count reactions in query every time
   - **Enhancement**: Add reaction_counts JSONB to messages table
   ```sql
   ALTER TABLE messages ADD COLUMN reaction_counts JSONB DEFAULT '{}'::jsonb;
   -- Update via trigger when reactions change
   ```

### Missing Features
1. ❌ **No admin policies**: Admins can't moderate reactions or view preferences
2. ❌ **No email preferences**: Only push notifications
3. ❌ **No quiet hours**: Can't set "don't notify 22:00-08:00"
4. ❌ **No per-conversation muting**: Can't mute specific conversations
5. ❌ **No reaction limits**: Could spam thousands of reactions

---

## For Unified Migration

### Consolidation Opportunities
1. **Add Missing Triggers and Constraints from Start**
   ```sql
   CREATE TABLE message_reactions (
     ...
     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     emoji TEXT NOT NULL CHECK (char_length(emoji) <= 10),
     ...
   );

   CREATE TRIGGER update_notification_preferences_updated_at
   BEFORE UPDATE ON notification_preferences
   FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
   ```

2. **Flexible Notification Preferences**
   ```sql
   CREATE TABLE notification_preferences (
     user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
     preferences JSONB NOT NULL DEFAULT '{
       "push": {"enabled": true, "quiet_hours": {"start": "22:00", "end": "08:00"}},
       "email": {"enabled": true, "digest": "daily"},
       "channels": {
         "personal_messages": true,
         "general_chat": false,
         "job_updates": true,
         "maintenance_updates": true,
         "ratings_received": true,
         "payment_reminders": true,
         "admin_announcements": true
       }
     }'::jsonb
   );
   ```

3. **Reaction Count Caching**
   ```sql
   ALTER TABLE messages ADD COLUMN reaction_summary JSONB DEFAULT '{}'::jsonb;
   -- Example: {"👍": 5, "❤️": 3, "😂": 1}

   CREATE FUNCTION update_message_reaction_summary() RETURNS TRIGGER AS $$
   BEGIN
     UPDATE messages SET reaction_summary = (
       SELECT jsonb_object_agg(emoji, count)
       FROM (
         SELECT emoji, COUNT(*)::int as count
         FROM message_reactions
         WHERE message_id = COALESCE(NEW.message_id, OLD.message_id)
         GROUP BY emoji
       ) counts
     )
     WHERE id = COALESCE(NEW.message_id, OLD.message_id);
     RETURN COALESCE(NEW, OLD);
   END;
   $$ LANGUAGE plpgsql;
   ```

### Sequencing in Unified Migration
```
1. Core chat (messages, conversations, participants)
2. Chat enhancements (reactions, read receipts)
3. Notification system (preferences table)
4. Realtime configuration
5. All RLS policies
6. Reaction aggregation triggers
```

### Improvements for Unified Version
1. **Add all FKs and constraints**
2. **Use JSONB for flexible preferences**
3. **Add reaction count caching**
4. **Add emoji validation**
5. **Add updated_at trigger**
6. **Add admin policies**

### Dead Code to Remove
- None (this is additive)

---

## Use Cases

### Message Reactions
```sql
-- React to message
INSERT INTO message_reactions (message_id, user_id, emoji)
VALUES ('message-uuid', auth.uid(), '👍')
ON CONFLICT (message_id, user_id, emoji) DO NOTHING; -- Idempotent

-- Remove reaction
DELETE FROM message_reactions
WHERE message_id = 'message-uuid'
  AND user_id = auth.uid()
  AND emoji = '👍';

-- Get all reactions on message
SELECT
  emoji,
  COUNT(*) as count,
  array_agg(u.full_name) as users
FROM message_reactions mr
JOIN profiles u ON u.id = mr.user_id
WHERE mr.message_id = 'message-uuid'
GROUP BY emoji
ORDER BY count DESC;

-- Check if user reacted
SELECT EXISTS (
  SELECT 1 FROM message_reactions
  WHERE message_id = 'message-uuid'
    AND user_id = auth.uid()
    AND emoji = '👍'
) AS user_reacted;
```

### Notification Preferences
```sql
-- Create default preferences on signup
INSERT INTO notification_preferences (user_id)
VALUES (auth.uid())
ON CONFLICT (user_id) DO NOTHING;

-- Update notification settings
UPDATE notification_preferences
SET
  push_enabled = true,
  general_chat = false,
  job_updates = true
WHERE user_id = auth.uid();

-- Disable all notifications
UPDATE notification_preferences
SET push_enabled = false
WHERE user_id = auth.uid();

-- Get user's preferences for notification service
SELECT * FROM notification_preferences
WHERE user_id = 'user-uuid';

-- Check if user wants job notifications
SELECT job_updates FROM notification_preferences
WHERE user_id = auth.uid();
```

### Realtime Reactions
```javascript
// Subscribe to reactions on message
const reactionSubscription = supabase
  .channel(`reactions:${messageId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'message_reactions',
    filter: `message_id=eq.${messageId}`
  }, (payload) => {
    console.log('New reaction:', payload.new.emoji);
    addReactionToUI(payload.new);
  })
  .on('postgres_changes', {
    event: 'DELETE',
    schema: 'public',
    table: 'message_reactions',
    filter: `message_id=eq.${messageId}`
  }, (payload) => {
    console.log('Reaction removed:', payload.old.emoji);
    removeReactionFromUI(payload.old);
  })
  .subscribe();
```

---

## Rollback Considerations

### To Rollback This Migration
```sql
-- Remove from realtime
ALTER PUBLICATION supabase_realtime DROP TABLE public.message_reactions;

-- Drop tables (CASCADE removes policies)
DROP TABLE IF EXISTS public.notification_preferences CASCADE;
DROP TABLE IF EXISTS public.message_reactions CASCADE;
```

### Data Loss Warning
- ⚠️ All message reactions permanently deleted
- ⚠️ All notification preferences reset to defaults
- ⚠️ Users must reconfigure notification settings

### Rollback Blockers
- If users rely on notification preferences
- If reactions are displayed in chat UI
- If realtime subscriptions active

---

## Testing Checklist

### Message Reactions
- [ ] Can add reaction to message in own conversation
- [ ] Cannot add reaction to message in conversation not part of
- [ ] UNIQUE constraint prevents duplicate reactions
- [ ] Can add multiple different emojis to same message
- [ ] Can remove own reactions
- [ ] Cannot remove others' reactions
- [ ] Reactions display in message view
- [ ] Realtime updates when reaction added/removed

### Notification Preferences
- [ ] Can create preferences on first access
- [ ] Can view own preferences
- [ ] Cannot view others' preferences
- [ ] Can update own preferences
- [ ] Cannot update others' preferences
- [ ] Toggles work for each notification type
- [ ] Master push_enabled switch works
- [ ] Preferences persist across sessions

### Realtime
- [ ] Reactions update live for all conversation participants
- [ ] New reactions appear instantly
- [ ] Removed reactions disappear instantly
- [ ] No lag or delay in updates

---

## Conclusion

Migration 19 enhances the chat system with modern messaging features: emoji reactions and granular notification preferences. These UX improvements make the platform more engaging and give users control over their notification experience. The realtime enablement for reactions provides instant feedback, creating a more interactive chat experience similar to modern messaging platforms.

**Key Achievements**:
- ✅ Emoji reactions on messages (like Slack/Discord)
- ✅ Realtime reaction updates for instant UX
- ✅ Granular notification preferences (5 channels)
- ✅ Full RLS security for both features
- ✅ UNIQUE constraint prevents reaction spam
- ✅ Simple remove-to-unreact pattern

**Critical Issues**:
- 🔴 Missing foreign keys on user_id fields (data integrity risk)
- 🔴 emoji field not validated (could be non-emoji text)
- 🟡 No updated_at trigger on notification_preferences
- 🟡 Limited notification channels (missing ratings, payments, etc.)

**Missing Features**:
- No admin moderation policies
- No email notification preferences
- No quiet hours or do-not-disturb
- No per-conversation muting
- No reaction count caching

**For Production**:
1. Add missing foreign key constraints
2. Validate emoji field (CHECK constraint or enum)
3. Add updated_at trigger for notification_preferences
4. Expand notification channels (use JSONB for flexibility)
5. Add reaction count caching for performance
6. Add admin moderation policies
7. Consider quiet hours and per-conversation muting

This migration demonstrates good UX thinking (reactions, preferences) but needs additional constraints and features for production readiness. The realtime integration is well-executed and provides the instant feedback users expect from modern chat applications.
