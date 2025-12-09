# Integrate Migration 11: Billing System (Subscriptions)

## Overview

This guide explains how to integrate **Migration 11** (Billing System) into the unified `MigrateUnite.sql` file.

**What This Migration Adds**:
- **Subscription billing table**: Track user subscriptions, plan types, and billing periods
- **Trial system support**: Users can start with trial period before paid subscription
- **Multiple plan types**: Monthly/yearly plans for contractors and workers

**Integration Approach**:
This migration is **fully additive** - only one new table, RLS policies, and trigger. No modifications to existing structures.

**Migration Being Integrated**:
- `20251203105447_941fab5c-e7f8-4560-a3a3-d32542932955.sql` (Migration 11 - 40 lines)

---

## ADD Action 1: Create subscriptions Table

**Location**: After equipment_maintenance table (around line 137, before job_requests table)

**Reason**: Platform monetization. Track which users have active subscriptions:
- **Revenue tracking**: Record subscription plan and amount
- **Access control**: Determine which features users can access based on plan
- **Trial management**: Allow trial periods before requiring payment
- **Billing periods**: Track when subscriptions renew

**Why subscriptions matter**:
- Contractors pay for posting jobs, accessing workers
- Workers pay for premium features (enhanced profiles, priority listings)
- Trial period lets users try platform before committing
- Different plans for different needs (monthly vs yearly, contractor vs worker)

**Code to ADD**:
```sql
-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'trial',
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

**Field Breakdown**:

- **id**: UUID primary key
  - Auto-generated unique identifier

- **user_id**: UUID (NOT a foreign key)
  - References user in auth.users
  - **Why no foreign key**: Intentionally loose coupling
  - Allows subscription records to persist even if user account has issues
  - Application layer handles relationship

- **plan_type**: TEXT (required)
  - Plan options (documented in comments):
    - `contractor_monthly`: Monthly contractor subscription
    - `contractor_yearly`: Yearly contractor subscription (usually discounted)
    - `worker_monthly`: Monthly worker subscription
    - `worker_yearly`: Yearly worker subscription
    - `trial`: Free trial period
  - **Why TEXT not enum**: Flexibility to add new plans without schema migration
  - Application enforces valid values

- **status**: TEXT (defaults to 'trial')
  - Subscription state:
    - `trial`: User in free trial period
    - `active`: Paid subscription active
    - `cancelled`: User cancelled, subscription runs until period_end
    - `expired`: Subscription period ended, no renewal
  - **Why default 'trial'**: All new users start with trial
  - **Workflow**: trial → active → (cancelled or expired)

- **trial_ends_at**: TIMESTAMP WITH TIME ZONE (optional)
  - When trial period expires
  - NULL for paid subscriptions (no trial)
  - Application checks: `now() < trial_ends_at` to determine if trial active

- **current_period_start**: TIMESTAMP WITH TIME ZONE (optional)
  - When current billing period started
  - Used to calculate prorated refunds
  - NULL during trial

- **current_period_end**: TIMESTAMP WITH TIME ZONE (optional)
  - When current billing period ends (subscription renews)
  - After this date, subscription needs renewal
  - Application checks: `now() > current_period_end` → subscription expired

- **amount**: NUMERIC (defaults to 0)
  - Subscription price per period
  - 0 for trial subscriptions
  - NUMERIC for financial precision (e.g., 29.99, 299.00)

- **created_at**: Timestamp (auto-generated)
  - When subscription record created

- **updated_at**: Timestamp (auto-generated, auto-updated)
  - When subscription last modified
  - Updated by trigger

**Design Notes**:

**No foreign key on user_id**:
- Intentional design decision
- Allows subscription data to be preserved independently
- Application handles user relationship
- Prevents cascade delete issues with billing records

**TEXT fields instead of enums**:
- plan_type and status use TEXT not ENUMs
- Provides flexibility to add new plans/statuses without ALTER TYPE
- Application validates allowed values
- Trade-off: Less database enforcement, more application logic

**No constraints on valid transitions**:
- Database doesn't enforce status transitions (trial → active → cancelled)
- Application handles business logic
- Simpler schema, more flexible

**Billing period tracking**:
- current_period_start/end track billing cycle
- Essential for subscription renewal logic
- Application checks these dates to determine subscription state

---

## ADD Action 2: Enable RLS on subscriptions

**Location**: After equipment_maintenance RLS enable (around line 201)

**Reason**: Security. Subscription data is sensitive (pricing, billing periods).

**Code to ADD**:
```sql
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
```

---

## ADD Action 3: RLS Policies for subscriptions

**Location**: After equipment_maintenance policies (around line 343)

**Reason**: Define access control for subscription records. Users can fully manage their own subscription (SELECT, INSERT, UPDATE) but not delete.

**Why these permissions**:
- **SELECT**: Users need to see their subscription status, plan, billing dates
- **INSERT**: Users can create subscription (signup flow)
- **UPDATE**: Users can upgrade/downgrade plan, cancel subscription
- **No DELETE**: Subscriptions are never deleted (billing history requirement)

**Code to ADD**:
```sql
-- Users can view their own subscription
CREATE POLICY "Users can view their own subscription"
ON public.subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own subscription
CREATE POLICY "Users can create their own subscription"
ON public.subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscription
CREATE POLICY "Users can update their own subscription"
ON public.subscriptions
FOR UPDATE
USING (auth.uid() = user_id);
```

**Policy Breakdown**:

**Policy 1 - SELECT**: `USING (auth.uid() = user_id)`
- Users can only see their own subscription
- Privacy: Can't see other users' subscription details
- Use case: Display subscription info in account settings

**Policy 2 - INSERT**: `WITH CHECK (auth.uid() = user_id)`
- Can only create subscription for yourself
- Prevents creating subscriptions for other users
- Use case: Signup flow creates initial trial subscription

**Policy 3 - UPDATE**: `USING (auth.uid() = user_id)`
- Can only update your own subscription
- Use cases:
  - Upgrade from trial to paid
  - Change plan (monthly ↔ yearly)
  - Cancel subscription (status → 'cancelled')
  - Renew subscription (update period_end)

**No DELETE policy**:
- Subscriptions are never deleted
- Billing history must be preserved
- Legal/accounting requirement
- Instead: Mark status as 'cancelled' or 'expired'

---

## ADD Action 4: Trigger for updated_at

**Location**: After equipment_maintenance trigger (around line 597)

**Reason**: Automatically update timestamp when subscription modified.

**Code to ADD**:
```sql
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
```

**How it works**:
- Fires before each UPDATE operation
- Sets `NEW.updated_at = NOW()`
- Automatic audit trail

**Use cases for updated_at**:
- Track when user changed plan
- Track when subscription was cancelled
- Track when subscription was renewed

---

## Execution Order

Follow this sequence when applying to `MigrateUnite.sql`:

1. **ADD**: subscriptions table
   - Insert after line 137 (after equipment_maintenance table)

2. **ADD**: Enable RLS on subscriptions
   - Insert after line 201 (with other RLS enable statements)

3. **ADD**: RLS policies for subscriptions (3 policies)
   - Insert after line 343 (after equipment_maintenance policies)

4. **ADD**: Trigger for updated_at
   - Insert after line 597 (with other updated_at triggers)

**Why this order**:
- Table must exist before enabling RLS
- Table must exist before creating policies
- Table must exist before creating triggers
- Keeps related code grouped together

---

## Verification After Integration

### 1. Check Table Exists
```sql
-- Should return subscriptions table
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'subscriptions';
```

### 2. Check Table Structure
```sql
-- Should show all columns
\d subscriptions

-- Should show: id, user_id, plan_type, status, trial_ends_at,
-- current_period_start, current_period_end, amount, created_at, updated_at
```

### 3. Check RLS Enabled
```sql
-- Should return true
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'subscriptions';
```

### 4. Check Policies Created
```sql
-- Should show 3 policies (SELECT, INSERT, UPDATE)
SELECT policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'subscriptions';
```

### 5. Test Subscription Creation (Trial)
```sql
-- Should succeed for authenticated user
INSERT INTO subscriptions (user_id, plan_type, status, trial_ends_at, amount)
VALUES (
  auth.uid(),
  'trial',
  'trial',
  now() + interval '14 days',
  0
);
```

### 6. Test Subscription Upgrade (Trial → Paid)
```sql
-- Should succeed for own subscription
UPDATE subscriptions
SET
  plan_type = 'contractor_monthly',
  status = 'active',
  trial_ends_at = NULL,
  current_period_start = now(),
  current_period_end = now() + interval '1 month',
  amount = 29.99
WHERE user_id = auth.uid();
```

### 7. Test Subscription Cancellation
```sql
-- Should succeed for own subscription
UPDATE subscriptions
SET status = 'cancelled'
WHERE user_id = auth.uid();
```

### 8. Check Cannot View Other Subscriptions
```sql
-- Should return only own subscription (not all subscriptions)
SELECT * FROM subscriptions;
```

---

## Business Logic & Use Cases

### Subscription Lifecycle

**1. New User Signup (Trial)**:
```sql
-- Create trial subscription
INSERT INTO subscriptions (user_id, plan_type, status, trial_ends_at, amount)
VALUES (
  'user-uuid',
  'trial',
  'trial',
  now() + interval '14 days',
  0
);
```

**2. Trial → Paid Conversion**:
```sql
-- User chooses contractor monthly plan
UPDATE subscriptions
SET
  plan_type = 'contractor_monthly',
  status = 'active',
  trial_ends_at = NULL,
  current_period_start = now(),
  current_period_end = now() + interval '1 month',
  amount = 29.99
WHERE user_id = 'user-uuid';
```

**3. Plan Change (Monthly → Yearly)**:
```sql
-- User upgrades to yearly plan
UPDATE subscriptions
SET
  plan_type = 'contractor_yearly',
  current_period_end = now() + interval '1 year',
  amount = 299.00
WHERE user_id = 'user-uuid';
```

**4. Subscription Cancellation**:
```sql
-- User cancels (but subscription runs until period_end)
UPDATE subscriptions
SET status = 'cancelled'
WHERE user_id = 'user-uuid';

-- Subscription remains active until current_period_end
-- Application checks: status != 'cancelled' OR now() < current_period_end
```

**5. Subscription Expiry**:
```sql
-- Cron job checks for expired subscriptions
UPDATE subscriptions
SET status = 'expired'
WHERE current_period_end < now()
  AND status = 'active';
```

### Application Queries

**Check if user has active subscription**:
```sql
SELECT EXISTS (
  SELECT 1 FROM subscriptions
  WHERE user_id = auth.uid()
  AND (
    -- Trial active
    (status = 'trial' AND trial_ends_at > now())
    OR
    -- Paid subscription active
    (status = 'active' AND current_period_end > now())
    OR
    -- Cancelled but not expired yet
    (status = 'cancelled' AND current_period_end > now())
  )
) AS has_active_subscription;
```

**Get subscription details for display**:
```sql
SELECT
  plan_type,
  status,
  CASE
    WHEN status = 'trial' THEN trial_ends_at
    ELSE current_period_end
  END as expires_at,
  amount
FROM subscriptions
WHERE user_id = auth.uid();
```

**List subscriptions expiring soon (admin/cron)**:
```sql
-- Requires admin policy or service role
SELECT user_id, plan_type, current_period_end
FROM subscriptions
WHERE status = 'active'
  AND current_period_end < now() + interval '7 days'
ORDER BY current_period_end;
```

---

## Summary

**Migration 11** (Billing System):
- ✅ ADD subscriptions table (10 columns)
- ✅ ADD RLS enable
- ✅ ADD RLS policies (3 policies: SELECT, INSERT, UPDATE, no DELETE)
- ✅ ADD trigger (updated_at)

**Total Changes**: 4 actions (all ADD)

**No Modifications**: Fully additive migration

**Result**: MigrateUnite.sql now includes migrations 01-11 (11 of 20 complete)

**Platform Features Added**:
- **Subscription tracking**: Record user subscriptions and billing periods
- **Trial system**: Users start with free trial before paid subscription
- **Multiple plans**: Support monthly/yearly plans for contractors and workers
- **Billing periods**: Track when subscriptions renew
- **Status tracking**: Trial, active, cancelled, expired states

**Business Value**:
- **Revenue tracking**: Record subscription amounts and periods
- **Access control**: Determine feature access based on subscription status
- **Trial conversion**: Convert trial users to paid subscribers
- **Subscription management**: Users can upgrade, downgrade, cancel plans
- **Billing history**: Never delete subscription records (legal requirement)

**Design Decisions**:
- **No foreign key on user_id**: Loose coupling for billing data independence
- **TEXT instead of ENUM**: Flexible plan/status additions without schema changes
- **No DELETE policy**: Subscriptions preserved for billing history
- **Trial defaults**: New subscriptions start as trial

---

## Next Migration

After integrating migration 11, the next migration to integrate is:

**Migration 12**: `20251203110855_ed89110f-fea6-457d-ba62-e03abe0499b8.sql`
- Check actual file content to see what it contains
