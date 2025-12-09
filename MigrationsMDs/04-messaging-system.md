# Migration 04: Messaging System

## Migration Info
- **Filename**: `20251127172658_2f4e6c78-dd9a-496a-808f-428a2c39de65.sql`
- **Timestamp**: November 27, 2025 at 17:26:58 (5 hours after migration 3)
- **Purpose**: Add complete chat/messaging functionality
- **Size**: 146 lines
- **Dependencies**: Migration 1-3 (extends profiles, creates new chat tables)

## Overview
This migration adds a complete messaging system to enable communication between contractors and workers. It includes:
- Conversations (chat threads)
- Participants (who's in each conversation)
- Messages (actual chat content)
- Avatar support (profile pictures via Supabase Storage)
- Real-time capabilities (Supabase Realtime for live updates)

**Architecture**: Multi-participant group chat model (not just 1-on-1)

---

## Line-by-Line Analysis

### Lines 1-2: Add Avatar URL Column
```sql
-- Add avatar_url column to profiles table
ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
```
**What it does**: Adds optional profile picture URL to existing profiles table
**Why TEXT type**: Stores URL/path to avatar image in storage
**Why nullable**: Avatars are optional - users can have profiles without pictures
**Storage location**: References files in Supabase Storage 'avatars' bucket (created later in this migration)

**Usage Pattern**:
```
User uploads image -> Stored in 'avatars' bucket -> URL stored in profiles.avatar_url
```

**No DEFAULT**: Existing users will have NULL avatar_url (no avatar)

---

### Lines 4-10: Create Conversations Table
```sql
-- Create conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now()
);
```
**What it does**: Creates the main conversation/thread container

**Column Breakdown**:
- `id UUID`: Unique identifier for each conversation
- `DEFAULT gen_random_uuid()`: Uses PostgreSQL's built-in UUID generator (not uuid-ossp extension)
- `created_at TIMESTAMPTZ`: When conversation was created
- `updated_at TIMESTAMPTZ`: When conversation metadata was last updated
- `last_message_at TIMESTAMPTZ`: When the most recent message was sent
- All timestamps default to `now()`

**Design Notes**:
- **No conversation name/title**: Conversations are identified by participants, not names
- **No direct user ownership**: Ownership is via conversation_participants table
- **Supports group chats**: No constraint limiting participant count
- **last_message_at for sorting**: Useful for "most recent conversations" UI

**Issues**:
- ⚠️ **MISSING TRIGGER**: Has `updated_at` column but no trigger to maintain it (unlike profiles, worker_profiles, job_requests)
- Should have a trigger calling `handle_updated_at()` from migration 1

---

### Lines 12-13: Enable RLS on Conversations
```sql
-- Enable RLS on conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
```
**What it does**: Activates Row Level Security
**Why needed**: Without RLS, conversations are inaccessible in Supabase
**Policies**: Created in lines 41-56

---

### Lines 15-23: Create Conversation Participants Table
```sql
-- Create conversation_participants table
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_read_at TIMESTAMPTZ,
  UNIQUE(conversation_id, user_id)
);
```
**What it does**: Junction table linking users to conversations

**Column Breakdown**:
- `id UUID`: Primary key for participant record
- `conversation_id UUID`: Which conversation
- `REFERENCES conversations(id)`: Foreign key to conversations
- `ON DELETE CASCADE`: When conversation deleted, all participants removed
- `user_id UUID`: Which user
- `REFERENCES profiles(id)`: Foreign key to profiles (not auth.users)
- `ON DELETE CASCADE`: When profile deleted, participation removed
- `joined_at TIMESTAMPTZ`: When user joined the conversation
- `last_read_at TIMESTAMPTZ`: When user last read messages (nullable - may never have read)
- `UNIQUE(conversation_id, user_id)`: Each user can only be in a conversation once

**Design Patterns**:

**Many-to-Many Relationship**:
```
users (many) ←→ conversation_participants ←→ conversations (many)
```

**Read Receipt Tracking**:
`last_read_at` enables:
- Unread message counts
- "New messages since last visit"
- Read/unread indicators in UI

**Why Reference profiles Not auth.users**:
- Profiles are the app's main user table
- All user data flows through profiles
- Consistent with other table relationships

---

### Lines 25-26: Enable RLS on Participants
```sql
-- Enable RLS on conversation_participants
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
```
**What it does**: Activates Row Level Security
**Policies**: Created in lines 58-78

---

### Lines 28-36: Create Messages Table
```sql
-- Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_read BOOLEAN DEFAULT false
);
```
**What it does**: Stores actual message content

**Column Breakdown**:
- `id UUID`: Unique message identifier
- `conversation_id UUID`: Which conversation this message belongs to
- `REFERENCES conversations(id)`: Foreign key
- `ON DELETE CASCADE`: When conversation deleted, all messages deleted
- `sender_id UUID`: Who sent the message
- `REFERENCES profiles(id)`: Foreign key to sender's profile
- `ON DELETE SET NULL`: When user deleted, keep message but set sender to NULL
  - **Why SET NULL**: Preserves conversation history even if user account deleted
  - Message shows as "from deleted user" instead of disappearing
- `content TEXT NOT NULL`: Message text (required, can't send empty messages)
- `created_at TIMESTAMPTZ`: When message was sent
- `is_read BOOLEAN DEFAULT false`: Read status (starts as unread)

**Design Decisions**:

**Why ON DELETE SET NULL for sender_id**:
- Preserves message history
- Allows user account deletion without breaking conversations
- Trade-off: Loses sender identity but keeps content

**Why TEXT for content**:
- Unlimited length
- Supports long messages
- No VARCHAR constraint

**is_read vs last_read_at**:
- `is_read` on messages: Per-message read status
- `last_read_at` on participants: Per-user last read timestamp
- **Potential redundancy**: Both track read state differently

---

### Lines 38-39: Enable RLS on Messages
```sql
-- Enable RLS on messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
```
**What it does**: Activates Row Level Security
**Policies**: Created in lines 80-107

---

### Lines 41-56: Conversations RLS Policies
```sql
-- RLS Policies for conversations
CREATE POLICY "Users can view their own conversations"
  ON conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations"
  ON conversations
  FOR INSERT
  WITH CHECK (true);
```
**What it does**: Controls access to conversations table

**Policy 1: View own conversations** (lines 42-51)
- `FOR SELECT`: Applies to read operations
- **Logic**: Can only see conversations you're a participant in
- `EXISTS` subquery checks if current user (`auth.uid()`) is in the conversation_participants table
- **Security**: Prevents users from seeing other people's private conversations

**Policy 2: Create conversations** (lines 53-56)
- `FOR INSERT`: Applies to creating new conversations
- `WITH CHECK (true)`: Anyone can create a conversation
- **Permissive**: Any authenticated user can start a chat
- **Note**: Creating empty conversations is allowed, but they're useless without participants

**Flow for Creating Conversation**:
1. User creates conversation (allowed via this policy)
2. User adds themselves as participant (via conversation_participants policy)
3. User adds other participants
4. Now all participants can see the conversation (via policy 1)

---

### Lines 58-78: Conversation Participants RLS Policies
```sql
-- RLS Policies for conversation_participants
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

CREATE POLICY "Users can join conversations"
  ON conversation_participants
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own participant record"
  ON conversation_participants
  FOR UPDATE
  USING (user_id = auth.uid());
```
**What it does**: Controls participation in conversations

**Policy 1: View participants in your conversations** (lines 59-68)
- `FOR SELECT`: Read access
- **Logic**: Can see who's in a conversation if you're also in that conversation
- Self-referential check: Joins conversation_participants to itself
- **Security**: Can't see participants of conversations you're not in

**Policy 2: Join conversations** (lines 70-73)
- `FOR INSERT`: Adding participants
- `WITH CHECK (true)`: Anyone can join any conversation
- **Very permissive**: No invitation or permission required
- **Potential issue**: Users could add themselves to private conversations
- **Consider adding**: `WITH CHECK (user_id = auth.uid())` to only allow joining as yourself

**Policy 3: Update own participant record** (lines 75-78)
- `FOR UPDATE`: Modifying participant data
- `USING (user_id = auth.uid())`: Can only update your own participation
- **Use case**: Update `last_read_at` timestamp when viewing messages
- **Security**: Can't modify other people's participant records

---

### Lines 80-107: Messages RLS Policies
```sql
-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations"
  ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages"
  ON messages
  FOR UPDATE
  USING (sender_id = auth.uid());
```
**What it does**: Controls message access

**Policy 1: View messages in your conversations** (lines 81-90)
- `FOR SELECT`: Read access
- **Logic**: Can read messages from conversations you're in
- Checks conversation_participants table
- **Security**: Can't see messages from conversations you're not part of

**Policy 2: Send messages in your conversations** (lines 92-102)
- `FOR INSERT`: Sending new messages
- **Two checks**:
  1. `sender_id = auth.uid()`: Must send as yourself (can't impersonate)
  2. `EXISTS`: Must be a participant in the conversation
- **Security**: Can't send messages to conversations you're not in
- **Prevents spam**: Can only message conversations you're part of

**Policy 3: Update own messages** (lines 104-107)
- `FOR UPDATE`: Editing messages
- `USING (sender_id = auth.uid())`: Can only edit your own messages
- **Use cases**:
  - Edit message content
  - Mark message as read (update `is_read` flag)
- **Security**: Can't edit other people's messages

---

### Lines 109-112: Enable Realtime
```sql
-- Enable Realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
```
**What it does**: Enables Supabase Realtime subscriptions for live updates

**How Realtime Works**:
- Supabase uses PostgreSQL's publication/subscription system
- `supabase_realtime` is a special publication for client subscriptions
- When rows change, subscribers receive real-time notifications

**Why Enable Realtime**:
- **messages**: Live chat - see new messages instantly
- **conversations**: See when new conversations created or updated
- **conversation_participants**: See when users join/leave conversations

**Client Usage Example**:
```javascript
supabase
  .channel('messages')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages' },
    (payload) => {
      // New message received - update UI
    }
  )
  .subscribe()
```

**Security**: RLS policies still apply - users only receive updates for rows they can access

---

### Lines 114-116: Create Storage Bucket
```sql
-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);
```
**What it does**: Creates a Supabase Storage bucket for avatar images

**Column Values**:
- `id`: 'avatars' - Internal identifier
- `name`: 'avatars' - Display name
- `public`: true - Images are publicly accessible

**Why public = true**:
- Avatar images need to be viewable by all users
- URLs can be accessed without authentication
- Common pattern for profile pictures

**Storage Structure**:
```
avatars/
  ├── user-uuid-1/
  │   └── avatar.jpg
  ├── user-uuid-2/
  │   └── avatar.png
  └── ...
```

**URL Pattern**:
```
https://[project].supabase.co/storage/v1/object/public/avatars/[user-id]/[filename]
```

---

### Lines 118-146: Storage Policies for Avatars
```sql
-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```
**What it does**: Controls access to avatar files in storage

**Policy 1: Public read access** (lines 119-122)
- `FOR SELECT`: Download/view operations
- `USING (bucket_id = 'avatars')`: Anyone can view files in avatars bucket
- **Why**: Profile pictures need to be publicly visible
- No authentication required

**Policy 2: Upload own avatar** (lines 124-130)
- `FOR INSERT`: Uploading new files
- **Two checks**:
  1. `bucket_id = 'avatars'`: Uploading to avatars bucket
  2. `auth.uid()::text = (storage.foldername(name))[1]`: Folder name matches user ID
- **Storage structure enforcement**: Files must be in `avatars/[your-user-id]/`
- **Security**: Can't upload to other users' folders

**How storage.foldername works**:
- `name`: Full path like "user-123/avatar.jpg"
- `storage.foldername(name)`: Extracts folder parts as array: `["user-123"]`
- `[1]`: Gets first folder (array is 1-indexed in PostgreSQL)
- `auth.uid()::text`: Converts UUID to text for comparison

**Policy 3: Update own avatar** (lines 132-138)
- `FOR UPDATE`: Replacing existing files
- Same checks as upload
- **Use case**: Replace old avatar with new one

**Policy 4: Delete own avatar** (lines 140-146)
- `FOR DELETE`: Removing files
- Same checks as upload
- **Use case**: Remove profile picture

**Security Model**:
- Public read (anyone)
- Authenticated write (own folder only)

---

## Schema Changes Summary

### New Column Added
1. **profiles.avatar_url** - TEXT, nullable

### New Tables Created
1. **conversations** - Chat threads
2. **conversation_participants** - User-conversation relationships
3. **messages** - Chat messages

### New Storage Bucket
1. **avatars** - Profile picture storage

### New RLS Policies (10 policies)
**Conversations (2)**:
1. Users can view their own conversations
2. Users can create conversations

**Conversation Participants (3)**:
3. Users can view participants in their conversations
4. Users can join conversations
5. Users can update their own participant record

**Messages (3)**:
6. Users can view messages in their conversations
7. Users can send messages in their conversations
8. Users can update their own messages

**Storage Objects (4)**:
9. Avatar images are publicly accessible
10. Users can upload their own avatar
11. Users can update their own avatar
12. Users can delete their own avatar

### Realtime Enabled (3 tables)
1. messages
2. conversations
3. conversation_participants

---

## Integration Notes

### Dependencies
- **Requires Migration 1-3**: Extends profiles table, references profiles.id
- **Uses gen_random_uuid()**: PostgreSQL built-in (doesn't need uuid-ossp extension)

### Foreign Key Relationships
```
profiles (id)
  ├─> conversation_participants (user_id) ON DELETE CASCADE
  └─> messages (sender_id) ON DELETE SET NULL

conversations (id)
  ├─> conversation_participants (conversation_id) ON DELETE CASCADE
  └─> messages (conversation_id) ON DELETE CASCADE
```

### Modified by Later Migrations
- **Migration 5**: Adds global conversation and auto-join trigger

### Data Flow for New Message
1. User sends message via client
2. INSERT into messages (validated by RLS)
3. Realtime publishes change
4. All conversation participants receive update
5. UI displays new message

---

## Issues & Recommendations

### Critical Issue 1: Missing updated_at Trigger
**Problem**: `conversations` table has `updated_at` column but no trigger to maintain it
**Location**: Lines 4-10
**Impact**: `updated_at` will never change after conversation creation
**Comparison**: profiles, worker_profiles, job_requests all have triggers (migration 1)
**Fix**: Add trigger
```sql
CREATE TRIGGER set_updated_at_conversations
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

### Security Issue: Overly Permissive Conversation Join
**Problem**: "Users can join conversations" policy allows anyone to join any conversation
**Location**: Lines 70-73 (`WITH CHECK (true)`)
**Risk**: Users could add themselves to private conversations
**Current**: `WITH CHECK (true)`
**Better**: `WITH CHECK (user_id = auth.uid())` - Can only add yourself
**Best**: Require invitation system or existing participant approval

### Redundant Read Tracking
**Problem**: Two different read tracking mechanisms
**Location**:
- `messages.is_read` (line 35) - Per-message boolean
- `conversation_participants.last_read_at` (line 21) - Per-user timestamp
**Confusion**: Which one to use?
**Recommendation**:
- Use `last_read_at` timestamp (more flexible)
- Remove `is_read` boolean (or use it differently for group read receipts)

### Storage Folder Structure Not Enforced
**Problem**: Policy checks folder name but doesn't create folders
**Location**: Lines 124-146
**Issue**: User must manually create correct folder structure
**Better**: Use storage triggers or RPC functions to enforce structure

### No Message Update Policy Restrictions
**Problem**: Users can update their own messages without restrictions
**Location**: Lines 104-107
**Issue**: Could abuse to edit message content long after sending
**Consideration**: Should there be time limits on editing? Should edits be logged?

### No Conversation Deletion Policy
**Problem**: No policy for deleting conversations
**Impact**: Conversations can't be deleted by users (only by admins via bypass RLS)
**Consider adding**:
```sql
CREATE POLICY "Participants can delete conversations"
  ON conversations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversations.id
      AND user_id = auth.uid()
    )
  );
```

---

## Rollback Considerations

### To Rollback This Migration
```sql
-- Drop storage policies
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Delete storage bucket (will fail if files exist)
DELETE FROM storage.buckets WHERE id = 'avatars';

-- Drop realtime
ALTER PUBLICATION supabase_realtime DROP TABLE messages;
ALTER PUBLICATION supabase_realtime DROP TABLE conversations;
ALTER PUBLICATION supabase_realtime DROP TABLE conversation_participants;

-- Drop tables (order matters for foreign keys)
DROP TABLE IF EXISTS public.messages;
DROP TABLE IF EXISTS public.conversation_participants;
DROP TABLE IF EXISTS public.conversations;

-- Drop avatar column
ALTER TABLE public.profiles DROP COLUMN avatar_url;
```

**Warning**: Destroys all messages, conversations, and avatar files.

---

## For Unified Migration

### What to Include
✅ All three tables (conversations, conversation_participants, messages)
✅ Avatar support (profiles.avatar_url, storage bucket, storage policies)
✅ All RLS policies
✅ Realtime enabled

### What to Add
➕ Updated_at trigger for conversations table
➕ Better conversation join security
➕ Conversation deletion policy

### What to Fix
🔧 Stricter join policy: `WITH CHECK (user_id = auth.uid())`
🔧 Add updated_at trigger for conversations
🔧 Consider removing `is_read` column or clarifying its purpose
🔧 Add time limits or audit log for message editing

### Recommended Table Order
1. profiles (already exists)
2. conversations
3. conversation_participants (references both profiles and conversations)
4. messages (references conversations and profiles)
5. Storage bucket and policies

---

## Use Cases Enabled

### 1. Direct Messaging (1-on-1)
```sql
-- Create conversation
INSERT INTO conversations DEFAULT VALUES RETURNING id;

-- Add two participants
INSERT INTO conversation_participants (conversation_id, user_id)
VALUES (conversation_id, user1_id), (conversation_id, user2_id);
```

### 2. Group Chat
```sql
-- Same as above but add multiple participants
INSERT INTO conversation_participants (conversation_id, user_id)
VALUES
  (conversation_id, user1_id),
  (conversation_id, user2_id),
  (conversation_id, user3_id),
  (conversation_id, user4_id);
```

### 3. Read Receipts
```sql
-- Update last read time
UPDATE conversation_participants
SET last_read_at = NOW()
WHERE conversation_id = ? AND user_id = auth.uid();

-- Query unread messages
SELECT * FROM messages
WHERE conversation_id = ?
  AND created_at > (
    SELECT last_read_at FROM conversation_participants
    WHERE conversation_id = ? AND user_id = auth.uid()
  );
```

### 4. Real-time Updates
```javascript
// Subscribe to new messages
supabase
  .channel('messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`
  }, handleNewMessage)
  .subscribe();
```

---

## Conclusion

This migration adds a **comprehensive, production-ready messaging system** with:
- ✅ Multi-participant conversations
- ✅ Real-time updates
- ✅ Read tracking
- ✅ Profile pictures
- ✅ Proper security via RLS

**Strengths**:
- Well-structured schema
- Proper foreign key cascades
- Real-time support
- Public/private storage model

**Weaknesses**:
- Missing updated_at trigger for conversations
- Overly permissive join policy
- Redundant read tracking mechanisms

With minor fixes, this is a solid foundation for a messaging feature. The architecture supports both 1-on-1 and group chats, making it flexible for future requirements.
