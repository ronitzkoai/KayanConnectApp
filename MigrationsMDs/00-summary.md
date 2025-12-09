# Migration Summary & Unification Guide

## Executive Summary

This document summarizes 7 Supabase migration files that evolved over 5 days (Nov 27 - Dec 2, 2025) to build a job marketplace platform connecting contractors with workers in the construction/heavy equipment industry.

**Total Migration Size**: ~625 lines of SQL across 7 files

**Core Purpose**: Platform for contractors to post jobs, workers to accept them, with messaging, ratings, and role-based permissions.

---

## Quick Reference

| Migration | Date/Time | Purpose | Lines | Complexity |
|-----------|-----------|---------|-------|------------|
| 01 | Nov 27, 10:54:27 | Original schema - complete foundation | 226 | High |
| 02 | Nov 27, 10:54:52 (+25 min) | Security fix - add search_path | 92 | Low |
| 03 | Nov 27, 11:18:59 (+2.5 hrs) | Role refactor - multi-role support | 120 | High |
| 04 | Nov 27, 17:26:58 (+5 hrs) | Messaging system - chat functionality | 146 | High |
| 05 | Nov 27, 17:35:08 (+9 min) | Global chat - auto-join all users | 33 | Low |
| 06 | Nov 29, 13:24:37 (+2 days) | Service types - equipment options | 6 | Low |
| 07 | Dec 2, 14:30:21 (+3 days) | Customer role - add 4th user type | 2 | Low |

---

## Platform Architecture Overview

### System Purpose
A **two-sided marketplace** connecting:
- **Contractors** (demand side): Post job requests for construction/equipment work
- **Workers** (supply side): Accept jobs, provide skilled labor and/or equipment
- **Platform** (facilitator): Handles matching, messaging, payments, ratings

### Core Components

#### 1. Authentication & Authorization
- **Supabase Auth**: User accounts and authentication
- **profiles**: User information (name, phone, avatar)
- **user_roles**: Many-to-many role assignments (contractor, worker, admin, customer)
- **has_role()**: Helper function for permission checks

#### 2. Job Management
- **job_requests**: Job postings with details (type, location, date, urgency, service type)
- **worker_profiles**: Worker specializations, ratings, availability
- **ratings**: Contractor ratings of workers after job completion

#### 3. Messaging
- **conversations**: Chat thread containers
- **conversation_participants**: User-conversation relationships
- **messages**: Chat content with real-time updates
- **Global chat**: Auto-join community conversation

#### 4. Storage
- **avatars bucket**: Profile picture storage via Supabase Storage

---

## Database Schema Visualization

```
AUTH LAYER (Supabase)
└── auth.users
    └── triggers: on_auth_user_created

PROFILE LAYER
├── profiles (id, full_name, phone, avatar_url)
│   └── triggers: on_profile_created_add_to_global_chat
└── user_roles (user_id, role)
    └── function: has_role(user_id, role)

JOB LAYER
├── worker_profiles (user_id, work_type, rating, experience, is_available)
├── job_requests (contractor_id, work_type, location, work_date, urgency, status, service_type, accepted_by)
└── ratings (job_id, contractor_id, worker_id, rating, review)
    └── triggers: on_rating_created → update_worker_rating()

MESSAGING LAYER
├── conversations (id, created_at, updated_at, last_message_at)
│   └── special: Global chat (00000000-0000-0000-0000-000000000001)
├── conversation_participants (conversation_id, user_id, joined_at, last_read_at)
└── messages (conversation_id, sender_id, content, created_at, is_read)

STORAGE LAYER
└── storage.objects (bucket: 'avatars')
```

---

## Foreign Key Relationships

```
auth.users
  ├─> profiles (id) [CASCADE]
  └─> user_roles (user_id) [CASCADE]

profiles
  ├─> worker_profiles (user_id) [CASCADE]
  ├─> conversation_participants (user_id) [CASCADE]
  ├─> messages (sender_id) [SET NULL]
  ├─> job_requests (contractor_id) [CASCADE]
  └─> ratings (contractor_id) [CASCADE]

worker_profiles
  ├─> job_requests (accepted_by) [SET NULL]
  └─> ratings (worker_id) [CASCADE]

conversations
  ├─> conversation_participants (conversation_id) [CASCADE]
  └─> messages (conversation_id) [CASCADE]

job_requests
  └─> ratings (job_id) [CASCADE]
```

---

## Enum Types

### user_role (Migration 1) - DEPRECATED
**Values**: 'contractor', 'worker', 'admin'
**Status**: ⚠️ Created but replaced by app_role, never dropped
**Issue**: Orphaned enum clutters schema

### app_role (Migration 3, 7)
**Values**: 'contractor', 'worker', 'admin', 'customer'
**Usage**: Primary role enum used throughout schema
**Storage**: user_roles table

### work_type (Migration 1)
**Values**: 'backhoe', 'loader', 'bobcat', 'grader', 'truck_driver', 'semi_trailer', 'laborer'
**Usage**: Categorizes worker skills and job requirements

### urgency_level (Migration 1)
**Values**: 'low', 'medium', 'high', 'urgent'
**Usage**: Job priority/urgency

### job_status (Migration 1)
**Values**: 'open', 'accepted', 'completed', 'cancelled'
**Usage**: Job lifecycle tracking

### service_type (Migration 6)
**Values**: 'operator_with_equipment', 'equipment_only', 'operator_only'
**Usage**: Distinguishes equipment ownership requirements

---

## Migration Evolution Timeline

### Phase 1: Foundation (Nov 27, 10:54 - 11:18)
**Migrations 1-3** established core schema with rapid iteration:

1. **Migration 1** (10:54:27): Complete schema - profiles, jobs, workers, ratings
2. **Migration 2** (10:54:52, +25 min): Security fix after warnings detected
3. **Migration 3** (11:18:59, +2.5 hrs): Major refactor for multi-role support

**Pattern**: Fast iteration, security-conscious, willingness to refactor

### Phase 2: Communication (Nov 27, 17:26 - 17:35)
**Migrations 4-5** added messaging capabilities:

4. **Migration 4** (17:26:58): Full messaging system with real-time
5. **Migration 5** (17:35:08, +9 min): Global chat room added immediately

**Pattern**: Related features deployed together

### Phase 3: Enhancements (Nov 29 - Dec 2)
**Migrations 6-7** refined business logic:

6. **Migration 6** (Nov 29, 13:24:37, +2 days): Service type distinctions
7. **Migration 7** (Dec 2, 14:30:21, +3 days): Customer role addition

**Pattern**: Slower pace, incremental improvements

---

## Core Concepts Explained

### 1. Row Level Security (RLS)
**What**: PostgreSQL feature that restricts row access based on user
**How**: Policies define WHO can do WHAT on which rows
**Example**:
```sql
-- Users can only view messages from their conversations
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );
```

### 2. Security Definer Functions
**What**: Functions that run with creator's permissions (not caller's)
**Why**: Allow controlled access to restricted data
**Example**: `has_role()` function lets policies check roles without exposing user_roles table
**Security**: Must set `search_path` to prevent hijacking

### 3. Triggers
**What**: Automatic actions when database events occur
**Types**:
- **AFTER INSERT**: handle_new_user() - Auto-create profile on signup
- **AFTER INSERT**: on_rating_created - Update worker rating averages
- **BEFORE UPDATE**: handle_updated_at() - Maintain updated_at timestamps

### 4. Many-to-Many Relationships
**user_roles**: Users can have multiple roles (contractor AND worker)
**conversation_participants**: Multiple users per conversation, multiple conversations per user

### 5. Enum Types
**Benefits**: Type safety, self-documenting, efficient storage
**Limitation**: Hard to modify (can add values, can't remove easily)

---

## Identified Issues Across All Migrations

### Critical Issues

#### 1. Orphaned user_role Enum
- **Location**: Migration 1 creates, Migration 3 replaces with app_role
- **Problem**: user_role enum never dropped
- **Impact**: Schema clutter, confusion
- **Fix**: `DROP TYPE user_role;` in cleanup migration

#### 2. Inconsistent search_path Syntax
- **Migration 2**: `SET search_path = public` (no quotes)
- **Migration 3**: `SET search_path TO 'public'` (with quotes)
- **Problem**: Inconsistent style, both work but confusing
- **Fix**: Standardize on `SET search_path = public`

#### 3. Missing updated_at Trigger for Conversations
- **Location**: Migration 4 creates conversations with updated_at column
- **Problem**: No trigger to maintain it (unlike profiles, worker_profiles, job_requests)
- **Fix**: Add trigger:
```sql
CREATE TRIGGER set_updated_at_conversations
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
```

#### 4. Undefined Customer Role Permissions
- **Location**: Migration 7 adds 'customer' role
- **Problem**: No policies define what customers can do
- **Impact**: Role exists but has no clear purpose
- **Fix**: Define customer-specific policies and document purpose

### Security Issues

#### 5. Overly Permissive Conversation Join
- **Location**: Migration 4, line 72
- **Policy**: `WITH CHECK (true)` - anyone can join any conversation
- **Risk**: Users could add themselves to private conversations
- **Fix**: `WITH CHECK (user_id = auth.uid())` - only add yourself

#### 6. Self-Service Admin Role Assignment
- **Location**: Migration 3, lines 48-51
- **Policy**: Users can assign themselves any role including admin
- **Risk**: Privilege escalation
- **Fix**: Exclude admin from self-service or require approval

### Business Logic Issues

#### 7. Equipment_only Service Type Doesn't Fit
- **Location**: Migration 6
- **Problem**: 'equipment_only' implies no worker needed, but schema assumes worker acceptance
- **Conflict**: Who accepts equipment-only jobs? How are they rated?
- **Fix**: Either remove this value or create separate equipment rental table

#### 8. Hardcoded Global Chat UUID
- **Location**: Migration 5
- **Problem**: '00000000-0000-0000-0000-000000000001' is a magic constant
- **Fragility**: Not self-documenting, could conflict
- **Fix**: Use metadata table or flag in conversations

#### 9. Redundant Read Tracking
- **Location**: Migration 4
- **Problem**: Both `messages.is_read` and `conversation_participants.last_read_at`
- **Confusion**: Which to use for determining unread messages?
- **Fix**: Pick one approach and remove the other

### Missing Features

#### 10. No Worker Equipment Ownership Tracking
- **Related to**: Migration 6 service_type
- **Problem**: Can't filter workers who own equipment
- **Impact**: Matching jobs requiring equipment is difficult
- **Fix**: Add `worker_profiles.owns_equipment` or `worker_equipment` table

#### 11. No Pricing/Payment Fields
- **Problem**: Platform handles job matching but no payment information
- **Impact**: How do users know what jobs pay?
- **Fix**: Add rate/payment fields to job_requests

---

## Complete Issues Summary Table

| # | Issue | Severity | Migration | Fix Complexity |
|---|-------|----------|-----------|----------------|
| 1 | Orphaned user_role enum | Medium | 1, 3 | Low |
| 2 | Inconsistent search_path syntax | Low | 2, 3 | Low |
| 3 | Missing updated_at trigger | Medium | 4 | Low |
| 4 | Undefined customer permissions | High | 7 | Medium |
| 5 | Permissive conversation join | High | 4 | Low |
| 6 | Self-service admin assignment | Critical | 3 | Medium |
| 7 | equipment_only misfit | Medium | 6 | High |
| 8 | Hardcoded global chat UUID | Low | 5 | Medium |
| 9 | Redundant read tracking | Low | 4 | Medium |
| 10 | No equipment ownership | Medium | 6 | Medium |
| 11 | No pricing fields | High | 1, 6 | Medium |

---

## Unification Strategy

### Recommended Approach: Single Unified Migration

Since you're in development, the cleanest approach is **one comprehensive migration** that:
1. Incorporates all features from migrations 1-7
2. Fixes all identified issues
3. Uses consistent syntax and patterns
4. Removes redundant/deprecated elements

**Benefits**:
- ✅ Clean, optimized single source of truth
- ✅ No migration history baggage
- ✅ All fixes applied from day one
- ✅ Consistent style throughout
- ✅ Easier to understand and maintain

**Process**:
1. Start fresh with new migration file
2. Include all schema elements in optimal order
3. Apply all fixes and improvements
4. Test thoroughly before deployment

---

## Unified Migration Structure

### Recommended Order

```sql
-- ========================================
-- SECTION 1: EXTENSIONS & ENUMS
-- ========================================

-- Extension (for compatibility)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums (all values from start)
CREATE TYPE app_role AS ENUM ('contractor', 'worker', 'admin', 'customer');
CREATE TYPE work_type AS ENUM ('backhoe', 'loader', 'bobcat', 'grader', 'truck_driver', 'semi_trailer', 'laborer');
CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE job_status AS ENUM ('open', 'accepted', 'completed', 'cancelled');
CREATE TYPE service_type AS ENUM ('operator_with_equipment', 'operator_only');  -- Fixed: removed equipment_only

-- ========================================
-- SECTION 2: CORE TABLES
-- ========================================

-- Profiles (no role column)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,  -- From migration 4
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User roles (multi-role support from start)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Worker profiles
CREATE TABLE public.worker_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_type work_type NOT NULL,
  experience_years INTEGER DEFAULT 0,
  location TEXT,
  is_available BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  rating DECIMAL(3,2) DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  owns_equipment BOOLEAN DEFAULT false,  -- Fixed: added equipment tracking
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Job requests
CREATE TABLE public.job_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_type work_type NOT NULL,
  service_type service_type DEFAULT 'operator_with_equipment' NOT NULL,  -- From migration 6
  location TEXT NOT NULL,
  work_date TIMESTAMPTZ NOT NULL,
  urgency urgency_level DEFAULT 'medium',
  notes TEXT,
  status job_status DEFAULT 'open',
  accepted_by UUID REFERENCES public.worker_profiles(id) ON DELETE SET NULL,
  rate_amount DECIMAL(10, 2),  -- Fixed: added pricing
  rate_type TEXT CHECK (rate_type IN ('hourly', 'daily', 'per_job')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ratings
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.job_requests(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(job_id)
);

-- ========================================
-- SECTION 3: MESSAGING TABLES
-- ========================================

-- Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_global BOOLEAN DEFAULT false,  -- Fixed: added flag for global chat
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now()
);

-- Conversation participants
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_read_at TIMESTAMPTZ,
  UNIQUE(conversation_id, user_id)
);

-- Messages (removed is_read for consistency)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- SECTION 4: FUNCTIONS
-- ========================================

-- Has role helper
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public  -- Fixed: consistent syntax
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- Fixed: consistent syntax
AS $$
DECLARE
  user_role app_role;
BEGIN
  user_role := (NEW.raw_user_meta_data->>'role')::app_role;

  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone'
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);

  RETURN NEW;
END;
$$;

-- Update worker rating
CREATE OR REPLACE FUNCTION public.update_worker_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- Fixed: consistent syntax
AS $$
BEGIN
  UPDATE public.worker_profiles
  SET
    rating = (
      SELECT AVG(rating)::DECIMAL(3,2)
      FROM public.ratings
      WHERE worker_id = NEW.worker_id
    ),
    total_ratings = (
      SELECT COUNT(*)
      FROM public.ratings
      WHERE worker_id = NEW.worker_id
    ),
    updated_at = now()
  WHERE id = NEW.worker_id;
  RETURN NEW;
END;
$$;

-- Update timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public  -- Fixed: consistent syntax
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add user to global chat
CREATE OR REPLACE FUNCTION add_user_to_global_chat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- Fixed: consistent syntax
AS $$
DECLARE
  global_conv_id UUID;
BEGIN
  -- Get global conversation ID dynamically
  SELECT id INTO global_conv_id FROM conversations WHERE is_global = true LIMIT 1;

  IF global_conv_id IS NOT NULL THEN
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (global_conv_id, NEW.id)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- ========================================
-- SECTION 5: TRIGGERS
-- ========================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_rating_created
  AFTER INSERT ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_worker_rating();

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_worker_profiles
  BEFORE UPDATE ON public.worker_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_job_requests
  BEFORE UPDATE ON public.job_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_conversations  -- Fixed: added missing trigger
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_profile_created_add_to_global_chat
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION add_user_to_global_chat();

-- ========================================
-- SECTION 6: ROW LEVEL SECURITY
-- ========================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles policies (fixed: exclude admin from self-service)
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own roles during signup"
  ON public.user_roles FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND role IN ('contractor', 'worker', 'customer')  -- Fixed: exclude admin
  );

-- Worker profiles policies
CREATE POLICY "Anyone can view worker profiles"
  ON public.worker_profiles FOR SELECT USING (true);

CREATE POLICY "Workers can update own profile"
  ON public.worker_profiles FOR UPDATE
  USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'worker'));

CREATE POLICY "Workers can insert own profile"
  ON public.worker_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'worker'));

-- Job requests policies
CREATE POLICY "Anyone can view job requests"
  ON public.job_requests FOR SELECT USING (true);

CREATE POLICY "Contractors can create job requests"
  ON public.job_requests FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'contractor'));

CREATE POLICY "Customers can create job requests"  -- Fixed: added customer policy
  ON public.job_requests FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'customer'));

CREATE POLICY "Contractors can update own job requests"
  ON public.job_requests FOR UPDATE
  USING (auth.uid() = contractor_id AND public.has_role(auth.uid(), 'contractor'));

CREATE POLICY "Workers can update job requests to accept"
  ON public.job_requests FOR UPDATE
  USING (status = 'open' AND public.has_role(auth.uid(), 'worker'));

-- Ratings policies
CREATE POLICY "Anyone can view ratings"
  ON public.ratings FOR SELECT USING (true);

CREATE POLICY "Contractors can create ratings"
  ON public.ratings FOR INSERT
  WITH CHECK (
    auth.uid() = contractor_id AND
    public.has_role(auth.uid(), 'contractor') AND
    EXISTS (
      SELECT 1 FROM job_requests
      WHERE job_requests.id = ratings.job_id
      AND job_requests.contractor_id = auth.uid()
      AND job_requests.status = 'completed'
    )
  );

-- Conversations policies
CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT WITH CHECK (true);

-- Conversation participants policies
CREATE POLICY "Users can view participants in their conversations"
  ON conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join conversations as themselves"  -- Fixed: stricter policy
  ON conversation_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own participant record"
  ON conversation_participants FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can leave conversations"  -- Fixed: added delete policy
  ON conversation_participants FOR DELETE
  USING (user_id = auth.uid() AND conversation_id NOT IN (
    SELECT id FROM conversations WHERE is_global = true  -- Can't leave global chat
  ));

-- Messages policies
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE USING (sender_id = auth.uid());

-- ========================================
-- SECTION 7: REALTIME
-- ========================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;

-- ========================================
-- SECTION 8: STORAGE
-- ========================================

-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Storage policies
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ========================================
-- SECTION 9: INITIAL DATA
-- ========================================

-- Create global conversation
INSERT INTO conversations (is_global, created_at, updated_at, last_message_at)
VALUES (true, now(), now(), now());
```

---

## Key Improvements in Unified Migration

### ✅ All Issues Fixed
1. ✅ No orphaned user_role enum
2. ✅ Consistent search_path syntax throughout
3. ✅ updated_at trigger for conversations
4. ✅ Customer role documented with policies
5. ✅ Stricter conversation join policy
6. ✅ Admin role excluded from self-service
7. ✅ equipment_only removed (or handled separately)
8. ✅ is_global flag instead of hardcoded UUID
9. ✅ Removed redundant is_read field
10. ✅ Added owns_equipment to worker_profiles
11. ✅ Added pricing fields to job_requests

### ✅ Additional Enhancements
- Leave conversation policy (except global)
- Dynamic global chat lookup (via is_global flag)
- Customer role policies defined
- Consistent code style
- Better organization with sections
- Comments throughout

---

## Testing Checklist for Unified Migration

### Basic Functionality
- [ ] Users can sign up with each role
- [ ] Profiles created automatically
- [ ] Roles assigned correctly
- [ ] Workers can create worker profiles
- [ ] Contractors can post jobs
- [ ] Workers can accept jobs
- [ ] Contractors can rate completed jobs
- [ ] Rating averages update correctly

### Messaging
- [ ] Users can create conversations
- [ ] Users can send messages
- [ ] Real-time updates work
- [ ] Global chat exists and all users in it
- [ ] New users auto-join global chat
- [ ] Read receipts work

### Storage
- [ ] Users can upload avatars
- [ ] Avatars publicly accessible
- [ ] Users can't upload to other users' folders

### Security
- [ ] RLS prevents unauthorized access
- [ ] Users can't assign themselves admin role
- [ ] Users can't join conversations they're not invited to
- [ ] SECURITY DEFINER functions work correctly

### Performance
- [ ] Queries are efficient
- [ ] Indexes created where needed
- [ ] No N+1 query problems

---

## Rollout Plan

### Step 1: Preparation
1. Back up current database
2. Test unified migration on staging environment
3. Verify all features work
4. Run performance tests

### Step 2: Migration
1. Drop existing schema (development only!)
2. Run unified migration
3. Verify schema created correctly
4. Seed test data

### Step 3: Validation
1. Run test suite
2. Manual testing of critical flows
3. Check for any errors in logs

### Step 4: Documentation
1. Update API documentation
2. Document all enum values
3. Create ERD diagram
4. Write developer onboarding guide

---

## Maintenance Recommendations

### Regular Tasks
1. **Monitor RLS policy performance**: Slow policies can affect response times
2. **Review trigger execution**: Ensure triggers aren't causing bottlenecks
3. **Clean up old data**: Archive completed jobs, old messages
4. **Monitor enum usage**: Track which work_types are most common

### Future Enhancements
1. **Payment processing**: Add payment tables and workflows
2. **Job history**: Track job lifecycle events
3. **Notifications**: Add notification preferences and delivery
4. **Reviews/Disputes**: More comprehensive rating system
5. **Equipment catalog**: Detailed equipment tracking
6. **Scheduling**: Calendar integration for work_date
7. **Location services**: Geocoding and distance calculations

---

## Conclusion

The 7 migrations evolved a job marketplace platform from scratch to a feature-complete system with:
- ✅ User authentication and multi-role authorization
- ✅ Job posting and worker matching
- ✅ Messaging and real-time communication
- ✅ Rating system for quality control
- ✅ Equipment service type distinctions

**Current State**: Functional but has inconsistencies and missing pieces

**Recommended Path**: Create unified migration that consolidates all features, fixes issues, and provides clean foundation for future development

**Estimated Effort**:
- Creating unified migration: 4-6 hours
- Testing: 2-4 hours
- Documentation: 2-3 hours
- **Total**: 1-2 days for complete migration unification

**Risk Level**: Low (development environment, no production data)

**Benefits**: Clean schema, consistent patterns, all issues resolved, easier maintenance

---

## Additional Resources

### Documentation Files Created
1. **01-original-schema.md**: Comprehensive analysis of initial schema (226 lines)
2. **02-security-fix.md**: Security hardening details (92 lines)
3. **03-role-refactor.md**: Multi-role architecture (120 lines)
4. **04-messaging-system.md**: Chat functionality deep dive (146 lines)
5. **05-global-chat.md**: Global conversation implementation (33 lines)
6. **06-service-types.md**: Equipment service options (6 lines)
7. **07-customer-role.md**: Customer role addition (2 lines)
8. **00-summary.md**: This overview document

### Total Documentation
- **Migration SQL**: ~625 lines across 7 files
- **Documentation**: ~2,500 lines across 8 markdown files
- **Analysis depth**: Line-by-line with explanations, issues, and recommendations

---

## Questions to Consider

Before finalizing unified migration:
1. What exactly should the customer role do?
2. Should equipment_only be removed or handled differently?
3. What pricing model should be used?
4. Are there any other business rules not captured in schema?
5. What's the expected scale (users, jobs, messages)?
6. Are there any compliance requirements (data retention, privacy)?
7. What's the deployment timeline?

**Next Steps**: Review this documentation, answer questions above, then proceed with creating unified migration using the template provided.
