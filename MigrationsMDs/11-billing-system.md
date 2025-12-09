# Migration 11: Billing System

## Migration Info
- **Filename**: `20251203105447_941fab5c-e7f8-4560-a3a3-d32542932955.sql`
- **Timestamp**: December 3, 2025 at 10:54:47 (54 minutes after migration 10)
- **Purpose**: Add subscription billing infrastructure for monetizing the platform
- **Size**: 40 lines
- **Dependencies**:
  - Migration 1 (handle_updated_at() function)

## Overview
This migration introduces the platform's monetization layer by creating a subscription management system. The subscriptions table tracks user billing plans, trial periods, and subscription lifecycle. With support for both contractor and worker subscriptions, as well as monthly and yearly billing cycles, this enables the platform to generate recurring revenue.

**Key Features**:
- Flexible plan types (contractor/worker, monthly/yearly, trial)
- Trial period tracking
- Billing cycle management (period start/end dates)
- User-controlled subscription management
- Amount tracking for different plan tiers

This marks the transition from a free platform to a commercial SaaS business model.

---

## Line-by-Line Analysis

### Lines 1-13: Subscriptions Table Creation
```sql
-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_type TEXT NOT NULL, -- 'contractor_monthly', 'contractor_yearly', 'worker_monthly', 'worker_yearly', 'trial'
  status TEXT NOT NULL DEFAULT 'trial', -- 'trial', 'active', 'cancelled', 'expired'
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

**What it does**: Creates table to manage user subscriptions and billing

**Field-by-Field Breakdown**:

- **id**: UUID primary key with auto-generation (standard pattern)

- **user_id**: UUID NOT NULL
  - ❌ **Critical Issue**: No foreign key constraint
  - Should be: `REFERENCES auth.users(id) ON DELETE CASCADE`
  - Without FK: Orphaned subscriptions when users deleted

- **plan_type**: TEXT NOT NULL
  - **Values** (from comment):
    - 'contractor_monthly': Monthly subscription for contractors
    - 'contractor_yearly': Annual subscription for contractors
    - 'worker_monthly': Monthly subscription for workers
    - 'worker_yearly': Annual subscription for workers
    - 'trial': Free trial period
  - ⚠️ **Should be ENUM**: Free-text allows typos ('contractor_monthy')
  - **Pricing structure**: Different tiers for different roles
  - **Business model**: Contractors likely pay more (they post jobs)

- **status**: TEXT NOT NULL DEFAULT 'trial'
  - **Values** (from comment):
    - 'trial': User in free trial period
    - 'active': Paid subscription, in good standing
    - 'cancelled': User cancelled, may have remaining time
    - 'expired': Subscription ended, no access
  - ⚠️ **Should be ENUM**: Type safety for status transitions
  - **Default 'trial'**: All users start with trial

**Status Flow**:
```
trial → active (payment received)
  ↓       ↓
expired   cancelled → expired (after period ends)
```

- **trial_ends_at**: TIMESTAMP WITH TIME ZONE (optional)
  - When free trial expires
  - **Null if**: Not in trial (active paid subscription)
  - **Business logic**: When NOW() > trial_ends_at, require payment

- **current_period_start**: TIMESTAMP WITH TIME ZONE (optional)
  - Start of current billing cycle
  - Example: '2025-12-01 00:00:00' for December billing
  - Used to calculate pro-rated charges

- **current_period_end**: TIMESTAMP WITH TIME ZONE (optional)
  - End of current billing cycle
  - Example: '2025-12-31 23:59:59' for monthly
  - Example: '2026-12-01 00:00:00' for yearly
  - **Business logic**: When NOW() > current_period_end, renew or expire

- **amount**: NUMERIC NOT NULL DEFAULT 0
  - Subscription price for current period
  - Default 0 for trial accounts
  - ℹ️ **No currency field**: Assumes single currency (ILS? USD?)
  - ℹ️ **No CHECK constraint**: Negative amounts possible
  - **Examples**:
    - Trial: 0
    - Worker monthly: 49.99
    - Contractor monthly: 199.99
    - Worker yearly: 499.99 (2 months free)
    - Contractor yearly: 1999.99 (2 months free)

- **created_at / updated_at**: Standard timestamp fields

**Business Logic**:
- Each user has ONE subscription row (enforced by policies, not DB)
- Subscription determines platform access
- Trial → Payment required → Active
- Cancelled subscriptions may have remaining access until period_end

**Issues Identified**:
1. 🔴 **Missing FK on user_id**: No referential integrity
2. 🔴 **No UNIQUE constraint on user_id**: User could have multiple subscriptions
3. ⚠️ **Free-text plan_type and status**: Should be ENUMs
4. ℹ️ **No payment_method_id**: How is payment processed?
5. ℹ️ **No stripe_subscription_id**: If using Stripe, need to link
6. ℹ️ **No currency field**: International pricing unclear
7. ℹ️ **No billing_email**: May differ from account email

---

### Lines 15-16: Enable RLS
```sql
-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
```

**Standard RLS enablement** - required for security

---

### Lines 18-34: RLS Policies
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

**Policy 1: View Own Subscription**
- **Rule**: Can only see subscription where you're the user
- **Privacy**: Users cannot see others' billing information
- **Use case**: Display subscription status in user settings

**Policy 2: Create Own Subscription**
- **Rule**: Can only create subscription for yourself
- **Security**: Prevents creating subscriptions for other users
- ⚠️ **Issue**: No role restriction - any authenticated user can create
- ⚠️ **Issue**: No validation of plan_type matching user role
  - Worker could create 'contractor_monthly' subscription
- **Recommendation**:
  ```sql
  WITH CHECK (
    auth.uid() = user_id AND
    (
      (has_role(auth.uid(), 'contractor') AND plan_type LIKE 'contractor_%') OR
      (has_role(auth.uid(), 'worker') AND plan_type LIKE 'worker_%') OR
      (plan_type = 'trial')
    )
  )
  ```

**Policy 3: Update Own Subscription**
- **Rule**: Can only update your own subscription
- **Use cases**:
  - Upgrade from monthly to yearly
  - Cancel subscription
  - Update payment method (if field existed)
- ⚠️ **Security concern**: Users can change their own amount
  - Should restrict: Only allow status changes, not amount changes
  - Amount should only be set by backend/admin

**Missing Policies**:
- ❌ **No DELETE policy**: Users cannot delete subscriptions
  - Good: Maintain billing history
  - Alternative: Change status to 'cancelled'
- ❌ **No admin policies**: Admins need full access (added in migration 15)

---

### Lines 36-40: Updated_at Trigger
```sql
-- Create trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
```

**Standard pattern**: Automatically updates updated_at on changes

**Tracks**:
- When plan changed
- When status changed
- When user cancelled/renewed
- Useful for audit trail and lifecycle tracking

---

## Schema Changes Summary

### New Tables Created
1. **subscriptions**
   - Purpose: Manage user subscription billing and access control
   - Key fields: user_id, plan_type, status, amount, trial_ends_at, current_period_start/end
   - Relationships: user_id → auth.users (no FK constraint ❌)

### RLS Policies Created
- subscriptions: 3 policies (SELECT own, INSERT own, UPDATE own)

### Triggers Created
- update_subscriptions_updated_at

---

## Integration Notes

### Dependencies
- **Requires Migration 1**: handle_updated_at() function
- **Optional**: Migration 3 (has_role() function for role-based plan validation)

### Modified By Later Migrations
- **Migration 15**: Adds admin SELECT/UPDATE policies

### Integration with Other Features
- **Job posting**: Could require active contractor subscription
- **Job applications**: Could require active worker subscription
- **Feature gating**: Premium features based on plan_type
- **Trial expiration**: Limit access after trial_ends_at

### Data Migration Considerations
- No automatic subscription creation for existing users
- Application logic must create subscription on signup
- Likely creates 'trial' subscription by default

---

## Issues & Recommendations

### Critical Issues
1. **🔴 Missing Foreign Key**
   - user_id has no FK constraint to auth.users
   - **Impact**: Orphaned subscriptions when users deleted
   - **Fix**:
   ```sql
   ALTER TABLE subscriptions
   ADD CONSTRAINT fk_user
   FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
   ```

2. **🔴 No Unique Constraint on user_id**
   - Users could have multiple active subscriptions
   - **Impact**: Ambiguous billing, access control confusion
   - **Fix**:
   ```sql
   ALTER TABLE subscriptions
   ADD CONSTRAINT unique_user_subscription UNIQUE (user_id);
   ```

3. **🔴 Users Can Change Their Own Amount**
   - UPDATE policy allows modifying amount field
   - **Impact**: Users could set subscription price to $0
   - **Fix**: Restrict UPDATE to specific columns
   ```sql
   -- Drop existing policy, create restricted version
   CREATE POLICY "Users can cancel their subscription"
   ON subscriptions FOR UPDATE
   USING (auth.uid() = user_id)
   WITH CHECK (
     -- Only allow changing status to 'cancelled'
     status = 'cancelled' AND
     OLD.plan_type = NEW.plan_type AND
     OLD.amount = NEW.amount
   );
   ```

### Architecture Issues
1. **🟡 Free-Text Enums**
   - plan_type and status should be PostgreSQL ENUMs
   - **Fix**:
   ```sql
   CREATE TYPE subscription_plan_type AS ENUM (
     'contractor_monthly', 'contractor_yearly',
     'worker_monthly', 'worker_yearly',
     'trial'
   );
   CREATE TYPE subscription_status AS ENUM (
     'trial', 'active', 'cancelled', 'expired'
   );
   ```

2. **🟡 No Payment Integration Fields**
   - Missing stripe_customer_id, stripe_subscription_id
   - Missing payment_method_id
   - Missing last_payment_date, next_payment_date
   - **Impact**: Must track in application layer or separate table

3. **🟡 No Role Validation**
   - Workers can create contractor subscriptions and vice versa
   - **Fix**: Add role check to INSERT policy

### Missing Features
1. ❌ **No billing history**: Only current subscription, no payment log
2. ❌ **No proration logic**: Upgrade/downgrade mid-cycle
3. ❌ **No grace period**: Immediate expiration
4. ❌ **No failed payment tracking**: No retry logic
5. ❌ **No currency field**: International pricing unclear
6. ❌ **No tax tracking**: VAT, sales tax not stored
7. ❌ **No coupon/discount support**: No promotional pricing

### Data Validation Issues
1. ❌ **No CHECK constraint on amount**: `CHECK (amount >= 0)`
2. ❌ **No date validation**: trial_ends_at could be in past
3. ❌ **No period validation**: period_end should be > period_start

---

## For Unified Migration

### Consolidation Opportunities
1. **Create Proper ENUMs**
   - Define subscription_plan_type enum
   - Define subscription_status enum
   - Use at table creation

2. **Add Payment Integration Fields**
   - Prepare for Stripe/payment gateway integration
   - stripe_customer_id, stripe_subscription_id
   - payment_method_id for stored cards

3. **Separate Billing History**
   - Create subscription_payments table for payment log
   - Link to subscriptions via subscription_id

### Sequencing in Unified Migration
```
1. ENUMs (including subscription enums)
2. Core tables (profiles, roles)
3. Business tables (job_requests, maintenance_requests)
4. Billing infrastructure (subscriptions, payments)
5. All RLS policies
6. All triggers
```

### Improvements for Unified Version
1. **Add all constraints at creation**:
   ```sql
   CREATE TABLE subscriptions (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
     plan_type subscription_plan_type NOT NULL,
     status subscription_status NOT NULL DEFAULT 'trial',
     amount NUMERIC NOT NULL DEFAULT 0 CHECK (amount >= 0),
     trial_ends_at TIMESTAMPTZ CHECK (trial_ends_at > created_at),
     current_period_start TIMESTAMPTZ,
     current_period_end TIMESTAMPTZ CHECK (current_period_end > current_period_start),
     ...
   );
   ```

2. **Restrict user UPDATE permissions**:
   ```sql
   -- Users can only cancel, not modify pricing
   CREATE POLICY "Users can cancel subscription"
   ON subscriptions FOR UPDATE
   USING (auth.uid() = user_id)
   WITH CHECK (
     status IN ('cancelled') AND
     NEW.amount = OLD.amount AND
     NEW.plan_type = OLD.plan_type
   );
   ```

3. **Add payment integration fields**:
   ```sql
   stripe_customer_id TEXT,
   stripe_subscription_id TEXT,
   payment_method_id UUID,
   last_payment_at TIMESTAMPTZ,
   next_billing_at TIMESTAMPTZ,
   currency TEXT DEFAULT 'ILS' CHECK (currency IN ('ILS', 'USD', 'EUR'))
   ```

4. **Create billing history table**:
   ```sql
   CREATE TABLE subscription_payments (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     subscription_id UUID NOT NULL REFERENCES subscriptions(id),
     amount NUMERIC NOT NULL CHECK (amount >= 0),
     currency TEXT NOT NULL,
     status TEXT NOT NULL, -- 'pending', 'succeeded', 'failed'
     stripe_payment_intent_id TEXT,
     paid_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

### Dead Code to Remove
- None in this migration specifically
- But UPDATE policy needs restrictions on amount field

---

## Use Cases

### Subscription Lifecycle

1. **New user signs up (application creates trial)**:
   ```sql
   INSERT INTO subscriptions (
     user_id, plan_type, status,
     trial_ends_at, amount
   ) VALUES (
     auth.uid(), 'trial', 'trial',
     NOW() + INTERVAL '14 days', 0
   );
   ```

2. **Check if user has active subscription**:
   ```sql
   SELECT
     CASE
       WHEN status = 'trial' AND trial_ends_at > NOW() THEN true
       WHEN status = 'active' AND current_period_end > NOW() THEN true
       ELSE false
     END AS has_access
   FROM subscriptions
   WHERE user_id = auth.uid();
   ```

3. **Upgrade from trial to paid (monthly contractor)**:
   ```sql
   UPDATE subscriptions
   SET
     plan_type = 'contractor_monthly',
     status = 'active',
     amount = 199.99,
     current_period_start = NOW(),
     current_period_end = NOW() + INTERVAL '1 month',
     trial_ends_at = NULL
   WHERE user_id = auth.uid()
     AND status = 'trial';
   ```

4. **Cancel subscription (keep access until period ends)**:
   ```sql
   UPDATE subscriptions
   SET status = 'cancelled'
   WHERE user_id = auth.uid();

   -- Application logic checks:
   -- IF current_period_end > NOW() THEN allow_access ELSE deny_access
   ```

5. **Expire subscription (cron job/background worker)**:
   ```sql
   UPDATE subscriptions
   SET status = 'expired'
   WHERE status IN ('active', 'cancelled')
     AND current_period_end < NOW();
   ```

6. **Upgrade from monthly to yearly**:
   ```sql
   UPDATE subscriptions
   SET
     plan_type = 'contractor_yearly',
     amount = 1999.99,
     current_period_start = NOW(),
     current_period_end = NOW() + INTERVAL '1 year'
   WHERE user_id = auth.uid()
     AND plan_type = 'contractor_monthly';
   ```

### Feature Gating Examples

```sql
-- Check if contractor can post job
CREATE FUNCTION can_post_job(contractor_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = contractor_user_id
      AND (
        (status = 'trial' AND trial_ends_at > NOW()) OR
        (status = 'active' AND current_period_end > NOW())
      )
      AND plan_type LIKE 'contractor_%'
  );
$$ LANGUAGE SQL;

-- Use in job_requests INSERT policy
CREATE POLICY "Active contractors can create jobs"
ON job_requests FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'contractor') AND
  can_post_job(auth.uid())
);
```

### Billing Reports

```sql
-- Monthly recurring revenue (MRR)
SELECT
  COUNT(*) FILTER (WHERE status = 'active' AND plan_type LIKE '%_monthly') AS monthly_subs,
  SUM(amount) FILTER (WHERE status = 'active' AND plan_type LIKE '%_monthly') AS monthly_mrr,
  COUNT(*) FILTER (WHERE status = 'active' AND plan_type LIKE '%_yearly') AS yearly_subs,
  SUM(amount / 12) FILTER (WHERE status = 'active' AND plan_type LIKE '%_yearly') AS yearly_mrr_normalized
FROM subscriptions;

-- Churn rate (subscriptions cancelled this month)
SELECT
  COUNT(*) FILTER (WHERE status = 'cancelled' AND updated_at >= DATE_TRUNC('month', NOW())) AS cancelled_this_month,
  COUNT(*) FILTER (WHERE status = 'active') AS active_subscriptions,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'cancelled' AND updated_at >= DATE_TRUNC('month', NOW())) /
    NULLIF(COUNT(*) FILTER (WHERE status IN ('active', 'cancelled')), 0),
    2
  ) AS churn_rate_percent
FROM subscriptions;

-- Trial conversion rate
SELECT
  COUNT(*) FILTER (WHERE status = 'active' AND plan_type != 'trial') AS converted,
  COUNT(*) FILTER (WHERE status = 'expired' AND created_at >= NOW() - INTERVAL '60 days') AS expired_trials,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'active' AND plan_type != 'trial') /
    NULLIF(COUNT(*), 0),
    2
  ) AS conversion_rate_percent
FROM subscriptions
WHERE created_at >= NOW() - INTERVAL '60 days';
```

---

## Rollback Considerations

### To Rollback This Migration
```sql
-- Drop trigger first
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;

-- Drop table (CASCADE removes policies)
DROP TABLE IF EXISTS public.subscriptions CASCADE;
```

### Data Loss Warning
- ⚠️ All subscription data deleted
- ⚠️ All billing history lost
- ⚠️ All trial period tracking lost
- ⚠️ Cannot restore cancelled/expired subscriptions

### Rollback Blockers
- If payment processing relies on this table
- If feature gating checks subscriptions table
- If migration 15 has run (admin policies reference this table)
- If external systems (Stripe) have linked subscription IDs

---

## Testing Checklist

### Subscription Creation
- [ ] User can create trial subscription
- [ ] User cannot create subscription for another user
- [ ] Cannot create subscription with invalid user_id
- [ ] Default status is 'trial'
- [ ] Default amount is 0
- [ ] created_at and updated_at set automatically

### Subscription Reading
- [ ] User can view their own subscription
- [ ] User cannot view other users' subscriptions
- [ ] Query works with all plan_type values
- [ ] Query works with all status values

### Subscription Updates
- [ ] User can update their own subscription
- [ ] User cannot update other users' subscriptions
- [ ] Can change status from trial to active
- [ ] Can change status from active to cancelled
- [ ] Can upgrade plan_type (monthly to yearly)
- [ ] updated_at changes on UPDATE
- [ ] ⚠️ BUG: User can change amount (should fail but doesn't)

### Business Logic
- [ ] Trial period can be set to future date
- [ ] Current period start/end can be set
- [ ] Amount can be set for paid plans
- [ ] Status transitions work correctly
- [ ] Subscription survives user profile updates

### Security
- [ ] RLS prevents cross-user data access
- [ ] Cannot bypass user_id check on INSERT
- [ ] Cannot bypass user_id check on UPDATE
- [ ] No DELETE operations possible

---

## Conclusion

Migration 11 introduces the platform's monetization infrastructure through a subscription billing system. This enables the transition from a free service to a commercial SaaS business with recurring revenue. The flexible plan structure supports different user types (contractors vs workers) and billing cycles (monthly vs yearly), with built-in trial period support for user acquisition.

**Key Achievements**:
- ✅ Complete subscription management table
- ✅ Trial period support for freemium model
- ✅ Multiple plan types and billing cycles
- ✅ User-managed subscriptions (view, create, update)
- ✅ Automated timestamp tracking
- ✅ Foundation for feature gating and access control

**Critical Issues to Address**:
- 🔴 Missing foreign key on user_id (data integrity risk)
- 🔴 No unique constraint (multiple subscriptions per user possible)
- 🔴 Users can modify their own billing amount (security risk)
- 🟡 Free-text plan_type and status (should be ENUMs)
- 🟡 Missing payment integration fields (Stripe IDs)
- 🟡 No role validation (workers can subscribe to contractor plans)

**Missing Features for Production**:
- Payment integration (Stripe/payment gateway)
- Billing history/payment log table
- Failed payment retry logic
- Proration for mid-cycle changes
- Currency and tax support
- Coupon/discount system

This migration should be integrated with:
- **Feature gating**: Require active subscriptions for premium features
- **Payment processing**: Stripe/payment gateway integration
- **Background jobs**: Trial expiration, subscription renewal, payment retries
- **Admin dashboard** (migration 15): Monitor subscriptions, handle disputes

The subscription system enables sustainable business growth while providing value to users through the job marketplace, maintenance services, and operational tracking features built in earlier migrations.
