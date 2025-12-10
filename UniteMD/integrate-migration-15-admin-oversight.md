# Integration Guide: Migration 15
## Admin Oversight Policies

**Migration File:** `20251207140332_2fd84e1f-59be-46d4-b518-849069cd0855.sql`
**Purpose:** Add admin RLS policies for system oversight
**Complexity:** Simple (just adding policies)

---

## Overview

This migration adds **admin-level RLS policies** to enable administrators to view and manage all records across the system. Each policy uses `has_role(auth.uid(), 'admin')` to restrict access to admin users only.

**Total Policies:** 35 admin policies across 15 tables
**Tables with Missing Base:** 3 tables don't exist yet (skip their policies)

---

## Integration Strategy

**Add policies AFTER existing policies for each table** - this keeps all table-related policies grouped together.

**⚠️ Skip Policies for Missing Tables:**
- `materials_orders` (lines 33-46)
- `equipment_marketplace` (lines 76-89)
- `equipment_rentals` (lines 92-105)

These tables don't exist in MigrateUnite.sql yet. When they're added later, add their admin policies at that time.

---

## Tables & Policy Locations

| Table | Existing Policies End | Add Admin Policies After | Policies to Add |
|-------|----------------------|--------------------------|-----------------|
| profiles | ~Line 279 | After "Users can insert own profile" | 1 SELECT |
| user_roles | ~Line 288 | After "Users can insert their own roles" | 1 SELECT |
| worker_profiles | ~Line 307 | After "Workers can insert own profile" | 2 (SELECT + UPDATE) |
| contractor_profiles | ~Line 320 | After "Contractors can update own profile" | 2 (SELECT + UPDATE) |
| customer_profiles | ~Line 333 | After "Customers can update own profile" | 2 (SELECT + UPDATE) |
| fuel_orders | ~Line 350 | After "Contractors can delete their fuel orders" | 3 (SELECT + UPDATE + DELETE) |
| maintenance_requests | ~Line 408 | After "Contractors can delete their requests" | 2 (SELECT + UPDATE) |
| maintenance_quotes | ~Line 463 | After "Providers can delete their pending quotes" | 1 SELECT |
| subscriptions | ~Line 481 | After "Users can update their own subscription" | 2 (SELECT + UPDATE) |
| job_requests | ~Line 503 | After "Workers can update job requests to accept" | 3 (SELECT + UPDATE + DELETE) |
| ratings | ~Line 521 | After "Contractors can create ratings" | 1 SELECT |

---

## Policies to Add

### 1. Profiles (1 policy)

**Location:** After line ~279

```sql
-- Admin oversight
CREATE POLICY "Admin can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
```

**Why:** Admins need to view all user profiles for system management.

---

### 2. User Roles (1 policy)

**Location:** After line ~288

```sql
-- Admin oversight
CREATE POLICY "Admin can view all user roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
```

**Why:** Admins need to see all user role assignments for access control management.

---

### 3. Worker Profiles (2 policies)

**Location:** After line ~307

```sql
-- Admin oversight
CREATE POLICY "Admin can view all worker profiles"
ON public.worker_profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all worker profiles"
ON public.worker_profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));
```

**Why:** Admins can verify worker credentials, update verification status, and manage worker accounts.

---

### 4. Contractor Profiles (2 policies)

**Location:** After line ~320

```sql
-- Admin oversight
CREATE POLICY "Admin can view all contractor profiles"
ON public.contractor_profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all contractor profiles"
ON public.contractor_profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));
```

**Why:** Admins verify contractor licenses and manage contractor accounts.

---

### 5. Customer Profiles (2 policies)

**Location:** After line ~333

```sql
-- Admin oversight
CREATE POLICY "Admin can view all customer profiles"
ON public.customer_profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all customer profiles"
ON public.customer_profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));
```

**Why:** Admins manage customer accounts and resolve disputes.

---

### 6. Fuel Orders (3 policies)

**Location:** After line ~350

```sql
-- Admin oversight
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

**Why:** Admins monitor fuel orders, handle disputes, and can delete fraudulent orders.

---

### 7. Maintenance Requests (2 policies)

**Location:** After line ~408

```sql
-- Admin oversight
CREATE POLICY "Admin can view all maintenance requests"
ON public.maintenance_requests
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all maintenance requests"
ON public.maintenance_requests
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));
```

**Why:** Admins oversee marketplace activity and can intervene in disputes.

---

### 8. Maintenance Quotes (1 policy)

**Location:** After line ~463

```sql
-- Admin oversight
CREATE POLICY "Admin can view all maintenance quotes"
ON public.maintenance_quotes
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
```

**Why:** Admins monitor pricing and detect fraudulent quotes (view only).

---

### 9. Subscriptions (2 policies)

**Location:** After line ~481

```sql
-- Admin oversight
CREATE POLICY "Admin can view all subscriptions"
ON public.subscriptions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all subscriptions"
ON public.subscriptions
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));
```

**Why:** Admins manage billing, grant trial extensions, and handle subscription issues.

---

### 10. Job Requests (3 policies)

**Location:** After line ~503

```sql
-- Admin oversight
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

**Why:** Admins monitor job marketplace, resolve disputes, and remove fraudulent postings.

---

### 11. Ratings (1 policy)

**Location:** After line ~521

```sql
-- Admin oversight
CREATE POLICY "Admin can view all ratings"
ON public.ratings
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
```

**Why:** Admins monitor rating system integrity and detect fake reviews (view only).

---

## Policies to SKIP

### ⏭️ Materials Orders (Lines 33-46)

**Table:** `materials_orders`
**Status:** ❌ Table doesn't exist in MigrateUnite.sql
**Action:** Skip these 3 policies

```sql
-- SKIP - Table doesn't exist yet
CREATE POLICY "Admin can view all materials orders" ...
CREATE POLICY "Admin can update all materials orders" ...
CREATE POLICY "Admin can delete materials orders" ...
```

---

### ⏭️ Equipment Marketplace (Lines 76-89)

**Table:** `equipment_marketplace`
**Status:** ❌ Table doesn't exist in MigrateUnite.sql
**Action:** Skip these 3 policies

```sql
-- SKIP - Table doesn't exist yet
CREATE POLICY "Admin can view all marketplace items" ...
CREATE POLICY "Admin can update all marketplace items" ...
CREATE POLICY "Admin can delete marketplace items" ...
```

---

### ⏭️ Equipment Rentals (Lines 92-105)

**Table:** `equipment_rentals`
**Status:** ❌ Table doesn't exist in MigrateUnite.sql
**Action:** Skip these 3 policies

```sql
-- SKIP - Table doesn't exist yet
CREATE POLICY "Admin can view all rental items" ...
CREATE POLICY "Admin can update all rental items" ...
CREATE POLICY "Admin can delete rental items" ...
```

**Note:** When these tables are added in future migrations, add their admin policies at that time.

---

## Summary

**Policies to Add:** 22 policies across 11 tables
**Policies to Skip:** 9 policies (3 tables don't exist)
**Total in Migration:** 31 policies

### Policy Breakdown by Operation

| Operation | Count | Tables |
|-----------|-------|--------|
| **SELECT** | 11 | All 11 tables |
| **UPDATE** | 9 | worker/contractor/customer profiles, fuel_orders, maintenance_requests, subscriptions, job_requests |
| **DELETE** | 2 | fuel_orders, job_requests |

### Admin Capabilities After Integration

✅ **View** all records across all tables
✅ **Update** user profiles, orders, requests, subscriptions, jobs
✅ **Delete** fuel orders and job requests (fraud prevention)
❌ **Cannot delete** ratings, quotes, or profiles (data integrity)

---

## Security Considerations

**Why Admin Policies are Safe:**
1. **Role-gated:** All policies check `has_role(auth.uid(), 'admin')`
2. **Explicit permissions:** Each operation (SELECT/UPDATE/DELETE) explicitly granted
3. **Audit trail:** Admin actions use auth.uid(), so they're traceable
4. **No INSERT policies:** Admins can't create records on behalf of users (prevents impersonation)
5. **Selective DELETE:** Only orders/jobs can be deleted (not profiles/ratings)

**What Admins CAN'T Do:**
- Create profiles/orders/jobs as other users (no INSERT policies)
- Delete user profiles (prevents accidental data loss)
- Delete ratings (preserves review integrity)
- Bypass RLS entirely (still bound by policies)

---

## Integration Method

For each table, **INSERT the admin policies AFTER the existing policies** for that table.

**Pattern:**
```sql
-- Existing policies for table_name
CREATE POLICY "Users can..." ON table_name ...
CREATE POLICY "Owners can..." ON table_name ...

-- Admin oversight (ADD HERE)
CREATE POLICY "Admin can view all..." ON table_name FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update all..." ON table_name FOR UPDATE USING (has_role(auth.uid(), 'admin'));
-- etc.

-- Next table's policies start here
```

---

## Verification

After integration:

```sql
-- Test as admin user
SET request.jwt.claims = '{"sub": "admin-user-id", "role": "admin"}';

-- Should see all records
SELECT COUNT(*) FROM profiles;
SELECT COUNT(*) FROM job_requests;
SELECT COUNT(*) FROM fuel_orders;

-- Should be able to update
UPDATE worker_profiles SET is_verified = true WHERE id = 'some-worker-id';
UPDATE subscriptions SET status = 'active' WHERE user_id = 'some-user-id';

-- Should be able to delete (only specific tables)
DELETE FROM job_requests WHERE id = 'fraudulent-job-id';
DELETE FROM fuel_orders WHERE id = 'suspicious-order-id';
```

---

## Rollback

```sql
-- Remove all admin policies
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view all user roles" ON public.user_roles;
-- ... (drop all 22 policies)
```

---

## Notes

- **Equipment Maintenance:** The migration doesn't include admin policies for `equipment_maintenance` table - consider adding them manually:
  ```sql
  CREATE POLICY "Admin can view all maintenance records" ON equipment_maintenance FOR SELECT USING (has_role(auth.uid(), 'admin'));
  CREATE POLICY "Admin can update all maintenance records" ON equipment_maintenance FOR UPDATE USING (has_role(auth.uid(), 'admin'));
  ```

- **Conversations/Messages:** No admin policies for chat system - intentional for user privacy. Add only if needed for moderation.

- **Future Tables:** When adding `materials_orders`, `equipment_marketplace`, or `equipment_rentals`, remember to add their admin policies from this migration.

---

## Estimated Integration Time

- **Reading/Understanding:** 5 minutes
- **Adding Policies:** 10 minutes (copy-paste 22 policies)
- **Testing:** 5 minutes
- **Total:** ~20 minutes
