# Migration 15: Admin Oversight

## Migration Info
- **Filename**: `20251207140332_2fd84e1f-59be-46d4-b518-849069cd0855.sql`
- **Timestamp**: December 7, 2025 at 14:03:32 (3 days after migration 14)
- **Purpose**: Grant comprehensive administrative access across all platform tables
- **Size**: 162 lines
- **Dependencies**:
  - Migration 1 (profiles, job_requests, ratings, admin role)
  - Migration 3 (has_role() function, user_roles)
  - Migration 8 (contractor_profiles, customer_profiles)
  - Migration 9 (maintenance_requests, maintenance_quotes)
  - Migration 10 (fuel_orders, equipment_maintenance)
  - Migration 11 (subscriptions)

## Overview
This is a massive administrative infrastructure migration that adds SELECT, UPDATE, and DELETE policies for admin users across 12+ tables. Prior to this migration, admins had no special database privileges - they were treated like regular users. This migration establishes comprehensive admin oversight capabilities for platform management, customer support, content moderation, and dispute resolution.

**Key Changes**:
- Admin SELECT policies on 12 tables (view all data)
- Admin UPDATE policies on 11 tables (modify records)
- Admin DELETE policies on 6 tables (remove content)
- References tables from migrations not yet documented (materials_orders, equipment_marketplace, equipment_rentals)
- Establishes admin as superuser role within the application layer

**Scope**: 39 new RLS policies for admin access

---

## Line-by-Line Analysis

### Section 1: Core User Data (Lines 1-14)

#### Lines 4-8: Profiles Admin Access
```sql
-- Profiles - admin can view all
CREATE POLICY "Admin can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
```

**What it does**: Allows admins to view all user profiles

**Why needed**:
- Customer support: View user information
- User management: Check account status
- Moderation: Review reported users
- Analytics: Platform user demographics

**Security**: Only users with 'admin' role can use this policy

---

#### Lines 10-14: User Roles Admin Access
```sql
-- User roles - admin can view all
CREATE POLICY "Admin can view all user roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
```

**What it does**: Allows admins to view role assignments

**Why needed**:
- User management: See who has which roles
- Role auditing: Track role changes
- Support: Verify user permissions
- Security: Monitor role escalation

**Missing**: No admin UPDATE policy for user_roles
- **Impact**: Admins can't change user roles through database
- **Workaround**: Must use application-level admin functions

---

### Section 2: Job Marketplace (Lines 16-30)

#### Lines 16-30: Job Requests Full Admin Control
```sql
-- Job requests - admin can view and update all
CREATE POLICY "Admin can view all job requests"
ON public.job_requests
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all job requests"
ON public.job_requests
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete job requests"
ON public.job_requests
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
```

**Three Policies**: Full CRUD admin control (SELECT, UPDATE, DELETE)

**Why needed**:
- **View**: Monitor all job activity, identify fraud
- **Update**: Moderate inappropriate content, fix errors
- **Delete**: Remove fraudulent/spam job postings

**Use Cases**:
1. **Moderation**: Remove job with inappropriate requirements
2. **Dispute Resolution**: Update status if contractor/worker dispute
3. **Data Cleanup**: Delete test/spam jobs
4. **Support**: Help contractor edit job details

**Missing**: No INSERT policy (admins probably shouldn't create jobs for users)

---

### Section 3: Materials & Marketplace (Lines 32-105)

⚠️ **Critical Discovery**: This migration references 3 tables that don't exist in documented migrations:
- materials_orders
- equipment_marketplace
- equipment_rentals

**Analysis**: Either these tables exist in undocumented migrations, or this migration has errors.

#### Lines 32-46: Materials Orders (Table Not Found)
```sql
-- Materials orders - admin can view and update all
CREATE POLICY "Admin can view all materials orders"
ON public.materials_orders
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all materials orders"
ON public.materials_orders
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete materials orders"
ON public.materials_orders
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
```

**Issue**: ❌ **Table materials_orders doesn't exist**
- Not created in migrations 1-14
- This migration will FAIL if table doesn't exist
- Either:
  1. Table created outside migration system
  2. Migration file has errors
  3. Table created in manual SQL not tracked

**Presumed Purpose** (if table existed):
- Contractors order construction materials (cement, rebar, lumber)
- Similar to fuel_orders but for building materials
- Admin oversight for order management

---

#### Lines 48-90: Equipment Marketplace (Table Not Found)
```sql
-- Equipment marketplace - admin can view and update all
CREATE POLICY "Admin can view all marketplace items"
ON public.equipment_marketplace
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all marketplace items"
ON public.equipment_marketplace
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete marketplace items"
ON public.equipment_marketplace
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
```

**Issue**: ❌ **Table equipment_marketplace doesn't exist**

**Presumed Purpose** (if table existed):
- Buy/sell used equipment marketplace
- Similar to job marketplace but for equipment sales
- Listings: equipment for sale, price, condition, location
- Admin moderation of listings

---

#### Lines 76-90: Equipment Rentals (Table Not Found)
```sql
-- Equipment rentals - admin can view and update all
CREATE POLICY "Admin can view all rental items"
ON public.equipment_rentals
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all rental items"
ON public.equipment_rentals
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete rental items"
ON public.equipment_rentals
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
```

**Issue**: ❌ **Table equipment_rentals doesn't exist**

**Presumed Purpose** (if table existed):
- Short-term equipment rental marketplace
- Contractors rent equipment to each other
- Rental periods, rates, availability
- Admin oversight for rental transactions

**⚠️ These 3 table references suggest**:
1. Features planned but not yet implemented
2. Migrations executed out of order
3. Tables created manually outside migration system
4. This SQL file may have been prepared prematurely

---

### Section 4: Operational Tracking (Lines 48-62)

#### Lines 48-62: Fuel Orders Admin Control
```sql
-- Fuel orders - admin can view and update all
CREATE POLICY "Admin can view all fuel orders"
ON public.fuel_orders
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all fuel orders"
ON public.fuel_orders
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete fuel orders"
ON public.fuel_orders
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
```

**What it does**: Full admin control over fuel orders (from migration 10)

**Why needed**:
- **View**: Monitor fuel spending patterns, detect fraud
- **Update**: Fix order errors, update status
- **Delete**: Remove duplicate/test orders

**Use Cases**:
1. **Support**: Help contractor fix incorrect fuel order
2. **Fraud detection**: Review suspicious bulk orders
3. **Analytics**: Platform-wide fuel consumption data

---

### Section 5: Maintenance Services (Lines 64-74)

#### Lines 64-74: Maintenance Requests Admin View/Update
```sql
-- Maintenance requests - admin can view and update all
CREATE POLICY "Admin can view all maintenance requests"
ON public.maintenance_requests
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all maintenance requests"
ON public.maintenance_requests
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));
```

**What it does**: Admin can view and modify maintenance requests (from migration 9)

**Why needed**:
- **Moderation**: Review service request legitimacy
- **Dispute Resolution**: Update status if contractor/provider dispute
- **Support**: Help contractors manage requests

**Missing**: No DELETE policy for maintenance_requests
- **Impact**: Admins can't remove inappropriate/spam requests
- **Recommendation**: Add DELETE policy

---

### Section 6: Billing (Lines 107-116)

#### Lines 107-116: Subscriptions Admin Control
```sql
-- Subscriptions - admin can view all
CREATE POLICY "Admin can view all subscriptions"
ON public.subscriptions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all subscriptions"
ON public.subscriptions
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));
```

**What it does**: Admin can view and modify all subscriptions (from migration 11)

**Why needed**:
- **Billing support**: Help users with subscription issues
- **Refunds**: Adjust subscription status/amounts
- **Trials**: Extend trial periods for users
- **Cancellations**: Process subscription cancellations
- **Analytics**: Revenue tracking, churn analysis

**Critical for Business**:
- Customer support can't function without this
- Billing disputes require admin intervention
- Trial extensions for sales/marketing

**Missing**: No DELETE policy (probably intentional - keep billing history)

---

### Section 7: Profile Management (Lines 118-149)

#### Lines 118-149: All Profile Types Admin Access
```sql
-- Contractor profiles - admin can view and update all
CREATE POLICY "Admin can view all contractor profiles"
ON public.contractor_profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all contractor profiles"
ON public.contractor_profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Worker profiles - admin can view and update all
CREATE POLICY "Admin can view all worker profiles"
ON public.worker_profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all worker profiles"
ON public.worker_profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Customer profiles - admin can view and update all
CREATE POLICY "Admin can view all customer profiles"
ON public.customer_profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all customer profiles"
ON public.customer_profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));
```

**What it does**: Admin VIEW and EDIT access to all specialized profiles

**Why needed**:
- **Verification**: Verify contractor licenses, worker certifications
- **Moderation**: Update/remove inappropriate bio content
- **Support**: Help users fix profile errors
- **Data Quality**: Correct typos, standardize data

**Pattern**: SELECT + UPDATE for each profile type
- contractor_profiles
- worker_profiles
- customer_profiles

**Missing**: No DELETE policies (profiles deleted via CASCADE when user account deleted)

---

### Section 8: Maintenance Marketplace (Lines 151-156)

#### Lines 151-156: Maintenance Quotes Admin View
```sql
-- Maintenance quotes - admin can view all
CREATE POLICY "Admin can view all maintenance quotes"
ON public.maintenance_quotes
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
```

**What it does**: Admin can view all service quotes (from migration 9)

**Why needed**:
- **Dispute resolution**: Review quote details in contractor/provider disputes
- **Fraud detection**: Identify price gouging or fake quotes
- **Analytics**: Market rates for maintenance services

**Missing**:
- ❌ No UPDATE policy: Admins can't modify quotes
- ❌ No DELETE policy: Admins can't remove fraudulent quotes
- **Recommendation**: Add UPDATE/DELETE for moderation

---

### Section 9: Ratings (Lines 158-162)

#### Lines 158-162: Ratings Admin View
```sql
-- Ratings - admin can view all
CREATE POLICY "Admin can view all ratings"
ON public.ratings
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
```

**What it does**: Admin can view all job ratings (from migration 1)

**Why needed**:
- **Moderation**: Review inappropriate reviews
- **Dispute resolution**: Verify rating fairness
- **Fraud detection**: Identify fake/manipulated ratings
- **Appeals**: Review rating disputes

**Missing**:
- ❌ No UPDATE policy: Admins can't modify/hide inappropriate ratings
- ❌ No DELETE policy: Admins can't remove fake ratings
- **Impact**: No way to moderate ratings system
- **Recommendation**: Add UPDATE (for hidden/flagged field) and DELETE (for fraud)

---

## Schema Changes Summary

### New RLS Policies Created: 39 Total

#### SELECT Policies (12 tables):
1. profiles
2. user_roles
3. job_requests
4. materials_orders ❌ (table doesn't exist)
5. fuel_orders
6. maintenance_requests
7. equipment_marketplace ❌ (table doesn't exist)
8. equipment_rentals ❌ (table doesn't exist)
9. subscriptions
10. contractor_profiles
11. worker_profiles
12. customer_profiles
13. maintenance_quotes
14. ratings

#### UPDATE Policies (11 tables):
1. job_requests
2. materials_orders ❌ (table doesn't exist)
3. fuel_orders
4. maintenance_requests
5. equipment_marketplace ❌ (table doesn't exist)
6. equipment_rentals ❌ (table doesn't exist)
7. subscriptions
8. contractor_profiles
9. worker_profiles
10. customer_profiles

#### DELETE Policies (6 tables):
1. job_requests
2. materials_orders ❌ (table doesn't exist)
3. fuel_orders
4. equipment_marketplace ❌ (table doesn't exist)
5. equipment_rentals ❌ (table doesn't exist)

### Tables Without Admin Policies
- conversations (chat system)
- conversation_participants
- messages
- equipment_maintenance (migration 10)
- technician_ratings (migration 16)
- technician_profiles (migration 18)
- message_reactions (migration 19)
- notification_preferences (migration 19)

---

## Integration Notes

### Dependencies
- **Requires Migration 1**: profiles, job_requests, ratings tables
- **Requires Migration 3**: has_role() function
- **Requires Migration 8**: contractor_profiles, customer_profiles
- **Requires Migration 9**: maintenance_requests, maintenance_quotes
- **Requires Migration 10**: fuel_orders
- **Requires Migration 11**: subscriptions

### Missing Table Dependencies
- **Expects but Not Found**:
  - materials_orders
  - equipment_marketplace
  - equipment_rentals
- **Impact**: Policies created but no tables to apply to
- **Resolution Needed**: Either create tables or remove policies

### Modified By Later Migrations
- None - this is the comprehensive admin policy migration

### Admin Capabilities After This Migration

**Can View All**:
- User profiles and roles
- Job requests and ratings
- Fuel orders
- Maintenance requests and quotes
- Subscriptions and billing
- All profile types (contractor, worker, customer)

**Can Modify**:
- Job requests (status, details, moderation)
- Fuel orders (corrections, status updates)
- Maintenance requests (dispute resolution)
- Subscriptions (billing adjustments, extensions)
- All profiles (verification, corrections)

**Can Delete**:
- Job requests (spam/fraud removal)
- Fuel orders (cleanup)

**Cannot Do**:
- Change user roles (no UPDATE policy on user_roles)
- Moderate ratings (no UPDATE/DELETE on ratings)
- Delete maintenance requests/quotes
- Access chat system (no policies on messages)
- Modify equipment maintenance records

---

## Issues & Recommendations

### Critical Issues
1. **🔴 References Non-Existent Tables**
   - materials_orders, equipment_marketplace, equipment_rentals
   - **Impact**: Migration may fail if tables don't exist
   - **Fix**: Either create tables first or remove these policies
   ```sql
   -- Check if tables exist before creating policies
   DO $$
   BEGIN
     IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'materials_orders') THEN
       CREATE POLICY "Admin can view all materials orders" ...
     END IF;
   END $$;
   ```

2. **🔴 Incomplete Admin Coverage**
   - No admin policies for chat system (messages, conversations)
   - No admin policies for equipment_maintenance
   - No admin policies for tables in migrations 16-19
   - **Impact**: Admins blind to chat moderation, equipment tracking

### Security Issues
1. **🟡 No Audit Trail**
   - Admin actions not logged
   - Can't track who changed what
   - **Recommendation**: Add audit_log table
   ```sql
   CREATE TABLE admin_audit_log (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     admin_user_id UUID NOT NULL,
     action TEXT NOT NULL, -- 'SELECT', 'UPDATE', 'DELETE'
     table_name TEXT NOT NULL,
     record_id UUID,
     changes JSONB,
     performed_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. **🟡 Broad Permissions**
   - Single 'admin' role has full access to everything
   - No granular permissions (moderator, support, billing admin)
   - **Recommendation**: Create role hierarchy
   ```sql
   CREATE TYPE admin_role AS ENUM ('super_admin', 'moderator', 'support', 'billing_admin');
   -- Then: has_role(auth.uid(), 'moderator') for content moderation only
   ```

### Missing Features
1. ❌ **No user_roles UPDATE policy**: Admins can't change roles
2. ❌ **No ratings moderation**: Can't update/delete inappropriate ratings
3. ❌ **No chat moderation**: No policies on messages/conversations
4. ❌ **No maintenance_quotes moderation**: Can't delete fraudulent quotes
5. ❌ **No equipment_maintenance access**: Can't help with operational issues

---

## For Unified Migration

### Consolidation Opportunities
1. **Create Admin Policies Immediately After Tables**
   - Don't wait until migration 15
   - Add admin policies when creating each table
   - Pattern:
   ```sql
   CREATE TABLE foo (...);
   -- User policies
   CREATE POLICY "Users can view own" ...
   -- Admin policies
   CREATE POLICY "Admin can view all" ON foo FOR SELECT USING (has_role(auth.uid(), 'admin'));
   CREATE POLICY "Admin can update all" ON foo FOR UPDATE USING (has_role(auth.uid(), 'admin'));
   ```

2. **Remove Non-Existent Table References**
   - Don't create policies for materials_orders, equipment_marketplace, equipment_rentals
   - If implementing these features, create tables first

3. **Add Comprehensive Admin Coverage**
   - Include ALL tables (chat, equipment_maintenance, etc.)
   - Consistent pattern: SELECT, UPDATE, DELETE (where appropriate)

4. **Implement Audit Logging**
   - Create admin_audit_log table
   - Trigger on admin actions
   - Track changes for compliance/security

### Sequencing in Unified Migration
```
For each table:
1. CREATE TABLE
2. ENABLE RLS
3. CREATE user policies (SELECT own, UPDATE own, etc.)
4. CREATE admin policies (SELECT all, UPDATE all, DELETE all)
5. CREATE triggers
```

### Improvements for Unified Version
1. **Comprehensive admin policies**:
   ```sql
   -- Template for each table
   CREATE POLICY "Admin can view all {table}"
   ON {table} FOR SELECT
   USING (has_role(auth.uid(), 'admin'));

   CREATE POLICY "Admin can update all {table}"
   ON {table} FOR UPDATE
   USING (has_role(auth.uid(), 'admin'));

   CREATE POLICY "Admin can delete {table} records"
   ON {table} FOR DELETE
   USING (has_role(auth.uid(), 'admin'));
   ```

2. **Add missing policies**:
   - user_roles UPDATE (role management)
   - ratings UPDATE/DELETE (moderation)
   - messages SELECT/DELETE (chat moderation)
   - maintenance_quotes UPDATE/DELETE

3. **Add audit logging**:
   ```sql
   CREATE TABLE admin_actions (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     admin_id UUID NOT NULL REFERENCES auth.users(id),
     action TEXT NOT NULL,
     table_name TEXT NOT NULL,
     record_id UUID,
     old_data JSONB,
     new_data JSONB,
     reason TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

4. **Granular admin roles**:
   ```sql
   CREATE TYPE admin_permission AS ENUM (
     'view_users', 'edit_users',
     'moderate_content', 'delete_content',
     'manage_billing', 'view_analytics'
   );

   CREATE TABLE admin_permissions (
     user_id UUID REFERENCES auth.users(id),
     permission admin_permission,
     PRIMARY KEY (user_id, permission)
   );
   ```

### Dead Code to Remove
- Policies for materials_orders, equipment_marketplace, equipment_rentals (unless tables created)

---

## Use Cases

### Customer Support
```sql
-- View user's complete profile
SELECT
  p.*,
  cp.* ,
  wp.*,
  (SELECT array_agg(role::text) FROM user_roles WHERE user_id = p.id) as roles
FROM profiles p
LEFT JOIN contractor_profiles cp ON cp.user_id = p.id
LEFT JOIN worker_profiles wp ON wp.user_id = p.id
WHERE p.id = 'user-uuid'
AND has_role(auth.uid(), 'admin');

-- View user's job activity
SELECT * FROM job_requests
WHERE contractor_id = 'user-uuid' OR accepted_by IN (
  SELECT id FROM worker_profiles WHERE user_id = 'user-uuid'
)
AND has_role(auth.uid(), 'admin');

-- View user's subscription
SELECT * FROM subscriptions
WHERE user_id = 'user-uuid'
AND has_role(auth.uid(), 'admin');
```

### Content Moderation
```sql
-- Find jobs pending moderation (reported)
SELECT jr.*, p.full_name as contractor_name
FROM job_requests jr
JOIN profiles p ON p.id = jr.contractor_id
WHERE jr.status = 'flagged' -- If flagged field exists
AND has_role(auth.uid(), 'admin')
ORDER BY jr.created_at DESC;

-- Remove spam job
DELETE FROM job_requests
WHERE id = 'job-uuid'
AND has_role(auth.uid(), 'admin');
```

### Billing Management
```sql
-- Extend trial for user
UPDATE subscriptions
SET trial_ends_at = trial_ends_at + INTERVAL '7 days'
WHERE user_id = 'user-uuid'
  AND status = 'trial'
  AND has_role(auth.uid(), 'admin');

-- Cancel subscription (refund request)
UPDATE subscriptions
SET status = 'cancelled',
    notes = 'Cancelled by admin - refund processed'
WHERE user_id = 'user-uuid'
  AND has_role(auth.uid(), 'admin');

-- View MRR and active subscriptions
SELECT
  COUNT(*) FILTER (WHERE status = 'active') as active_subs,
  SUM(amount) FILTER (WHERE status = 'active' AND plan_type LIKE '%_monthly') as monthly_mrr,
  SUM(amount / 12) FILTER (WHERE status = 'active' AND plan_type LIKE '%_yearly') as yearly_mrr_monthly
FROM subscriptions
WHERE has_role(auth.uid(), 'admin');
```

### Profile Verification
```sql
-- Verify contractor
UPDATE contractor_profiles
SET is_verified = true,
    verification_notes = 'License verified by admin on 2025-12-07'
WHERE user_id = 'contractor-uuid'
  AND has_role(auth.uid(), 'admin');

-- Update worker bio (remove inappropriate content)
UPDATE worker_profiles
SET bio = '[Content removed by moderation]'
WHERE id = 'worker-uuid'
  AND has_role(auth.uid(), 'admin');
```

### Dispute Resolution
```sql
-- View maintenance dispute
SELECT
  mr.*,
  mq.*,
  cp.company_name as contractor_name,
  pp.full_name as provider_name
FROM maintenance_requests mr
JOIN maintenance_quotes mq ON mq.request_id = mr.id
JOIN contractor_profiles cp ON cp.user_id = mr.contractor_id
JOIN profiles pp ON pp.id = mq.provider_id
WHERE mr.id = 'request-uuid'
  AND has_role(auth.uid(), 'admin');

-- Update maintenance request status (resolve dispute)
UPDATE maintenance_requests
SET status = 'resolved',
    admin_notes = 'Dispute resolved - refund issued to contractor'
WHERE id = 'request-uuid'
  AND has_role(auth.uid(), 'admin');
```

---

## Rollback Considerations

### To Rollback This Migration
```sql
-- Drop all 39 admin policies (examples shown, repeat for all)
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can view all user roles" ON user_roles;
DROP POLICY IF EXISTS "Admin can view all job requests" ON job_requests;
DROP POLICY IF EXISTS "Admin can update all job requests" ON job_requests;
DROP POLICY IF EXISTS "Admin can delete job requests" ON job_requests;
-- ... (repeat for all 39 policies)

-- Policies on non-existent tables will error but can be ignored
DROP POLICY IF EXISTS "Admin can view all materials orders" ON materials_orders; -- Fails if table doesn't exist
```

### Data Impact
- ⚠️ Admins lose all oversight capabilities
- ⚠️ Customer support cannot function
- ⚠️ No content moderation possible
- ⚠️ Billing issues cannot be resolved
- ⚠️ Platform becomes unmanageable

### Rollback Blockers
- If customer support tickets depend on admin access
- If subscription management requires admin intervention
- If content moderation in progress
- Critical for any production platform

---

## Testing Checklist

### Admin Access Verification
- [ ] Admin can view all profiles
- [ ] Admin can view all user_roles
- [ ] Admin can view all job_requests
- [ ] Admin can update job_requests
- [ ] Admin can delete job_requests
- [ ] Admin can view/update fuel_orders
- [ ] Admin can view/update subscriptions
- [ ] Admin can view/update all profile types

### Non-Admin Prevention
- [ ] Non-admin cannot view other users' profiles
- [ ] Non-admin cannot update other users' job_requests
- [ ] Non-admin cannot delete job_requests
- [ ] Non-admin cannot view all subscriptions
- [ ] Worker cannot access admin policies
- [ ] Contractor cannot access admin policies

### Missing Table Handling
- [ ] Policies on materials_orders don't break migration (if table missing)
- [ ] Policies on equipment_marketplace don't break migration (if table missing)
- [ ] Policies on equipment_rentals don't break migration (if table missing)
- [ ] Or: Tables exist and policies work

### Admin Use Cases
- [ ] Admin can help user with subscription issue
- [ ] Admin can verify contractor license
- [ ] Admin can remove spam job posting
- [ ] Admin can resolve maintenance dispute
- [ ] Admin can view platform analytics

---

## Conclusion

Migration 15 establishes comprehensive administrative oversight by creating 39 RLS policies across 12+ tables. This transforms admins from regular users into platform superusers with full visibility and control over user data, content, billing, and operations. This is critical infrastructure for customer support, content moderation, billing management, and platform health.

**Key Achievements**:
- ✅ Admin SELECT access to 12 tables (full visibility)
- ✅ Admin UPDATE access to 11 tables (moderation/support)
- ✅ Admin DELETE access to 6 tables (spam/fraud removal)
- ✅ Enables customer support operations
- ✅ Enables content moderation
- ✅ Enables billing management

**Critical Issues**:
- 🔴 References 3 non-existent tables (materials_orders, equipment_marketplace, equipment_rentals)
- 🔴 Incomplete coverage (missing chat, equipment_maintenance, later tables)
- 🟡 No audit logging of admin actions
- 🟡 No granular admin roles (all-or-nothing permissions)

**Missing Admin Capabilities**:
- Cannot change user roles
- Cannot moderate ratings
- Cannot moderate chat messages
- Cannot delete maintenance quotes
- Cannot access equipment maintenance data

**For Production**:
1. Verify all referenced tables exist
2. Add audit logging for admin actions
3. Implement granular admin permissions
4. Add comprehensive coverage for all tables
5. Add ratings and chat moderation policies

**Business Impact**:
This migration is essential for operating a production platform. Without admin policies:
- Customer support is impossible
- Content moderation cannot happen
- Billing disputes cannot be resolved
- Fraud cannot be investigated
- Platform health cannot be monitored

Admin oversight is not optional for a commercial platform - it's foundational infrastructure for operations, compliance, and user trust.
