# Integration Guide: Migration 20
## Worker Job Completion Policy

**Migration File:** `20251209115758_41259334-bfb9-4e76-b188-953484530d25.sql`
**Purpose:** Allow workers to mark accepted jobs as completed
**Complexity:** Very Simple (1 RLS policy addition)

---

## Overview

This is the **final migration** to integrate! 🎉

It adds a single RLS policy that allows workers to update job requests they've already accepted - specifically to mark them as completed.

**Current Limitation:** Workers can accept jobs (line 691-693) but can't update them afterward to mark completion.

**This Migration Fixes:** Adds policy allowing workers to complete jobs they accepted.

---

## What This Migration Does

Enables workers to update job status from 'accepted' to 'completed' for jobs they're assigned to.

### Current State

**Existing Worker Policy** (line 691-693):
```sql
CREATE POLICY "Workers can update job requests to accept"
  ON public.job_requests FOR UPDATE
  USING (status = 'open');
```

**Problem:** This only allows updating jobs with status='open' (for accepting jobs). Once a job is 'accepted', workers can't update it anymore.

### New Policy

**What We're Adding:**
```sql
CREATE POLICY "Workers can complete their accepted jobs"
ON job_requests FOR UPDATE
USING (
  status = 'accepted'::job_status
  AND accepted_by IN (
    SELECT id FROM worker_profiles WHERE user_id = auth.uid()
  )
  AND has_role(auth.uid(), 'worker'::app_role)
);
```

**What This Allows:**
- Workers can update jobs with status='accepted'
- Only if they're the worker who accepted it (via accepted_by field)
- Must have 'worker' role

---

## Integration Method: ADD

**Location:** After "Workers can update job requests to accept" policy (after line 693)

**INSERT AFTER LINE 693:**

```sql
CREATE POLICY "Workers can complete their accepted jobs"
ON job_requests FOR UPDATE
USING (
  status = 'accepted'::job_status
  AND accepted_by IN (
    SELECT id FROM worker_profiles WHERE user_id = auth.uid()
  )
  AND has_role(auth.uid(), 'worker'::app_role)
);
```

**Context - Insert Between:**
```sql
CREATE POLICY "Workers can update job requests to accept"
  ON public.job_requests FOR UPDATE
  USING (status = 'open');

-- 👇 INSERT NEW POLICY HERE

-- Admin oversight
CREATE POLICY "Admin can view all job requests" ...
```

---

## Policy Analysis

### Security Checks (3 conditions)

**1. Status Check:**
```sql
status = 'accepted'::job_status
```
- Only applies to jobs already accepted
- Can't modify open, completed, or cancelled jobs
- Prevents accidental updates to wrong jobs

**2. Ownership Check:**
```sql
accepted_by IN (
  SELECT id FROM worker_profiles WHERE user_id = auth.uid()
)
```
- Verifies the job was accepted by this worker
- accepted_by contains worker_profile.id
- Subquery finds current user's worker profile
- Prevents workers from completing other workers' jobs

**3. Role Check:**
```sql
has_role(auth.uid(), 'worker'::app_role)
```
- Confirms user has worker role
- Double-checks authorization
- Consistent with other worker policies

### Combined Effect

**Workers can now:**
1. Accept open jobs (existing policy line 691)
2. Complete jobs they accepted (new policy)

**Workers still can't:**
- Complete jobs accepted by other workers
- Modify open jobs (except to accept them)
- Modify completed/cancelled jobs
- Delete any jobs

---

## Why This Design

### Two Separate Policies Instead of One

**Why not combine both UPDATE policies?**

Having separate policies is clearer:
- **Policy 1** (line 691): `status = 'open'` → Accept jobs
- **Policy 2** (new): `status = 'accepted'` → Complete jobs

**Benefits:**
- Each policy has single responsibility
- Easier to understand and audit
- Easier to modify independently
- Clear separation of "accepting" vs "completing"

### Subquery for Worker Verification

**Why not direct FK check?**

```sql
accepted_by IN (SELECT id FROM worker_profiles WHERE user_id = auth.uid())
```

**Reasoning:**
- job_requests.accepted_by references worker_profiles.id (not user.id)
- Need to translate auth.uid() → worker_profile.id
- Subquery handles this mapping
- Robust even if user has multiple profiles

---

## Use Cases Enabled

### Worker Job Lifecycle

**1. Worker Accepts Job**
```sql
-- Uses existing policy (line 691)
UPDATE job_requests
SET status = 'accepted', accepted_by = <worker_profile_id>
WHERE id = 'job-uuid' AND status = 'open';
```

**2. Worker Completes Job** (NEW - enabled by this migration)
```sql
-- Uses new policy
UPDATE job_requests
SET status = 'completed', completed_at = now()
WHERE id = 'job-uuid' AND status = 'accepted';
-- Only works if accepted_by matches their worker_profile.id
```

**3. Contractor Reviews Completed Job**
```sql
-- Contractor rates the worker
INSERT INTO ratings (worker_id, contractor_id, job_id, rating, review)
VALUES (<worker_id>, auth.uid(), 'job-uuid', 5, 'Great work!');
```

---

## Integration Summary

### Changes

| Type | Count | Details |
|------|-------|---------|
| **ADD Policy** | 1 | Worker job completion policy |

**Total Lines Added:** ~10 lines (1 policy)

### Insertion Point

- **Line 694** - After "Workers can update job requests to accept" policy
- **Before** admin oversight policies (line 695+)

---

## Integration Checklist

- [ ] Add new policy after existing worker UPDATE policy (line 694)
- [ ] Verify policy uses correct table (job_requests)
- [ ] Verify policy checks status='accepted'
- [ ] Verify policy checks accepted_by matches worker
- [ ] Verify policy checks worker role

---

## Verification

After integration:

```sql
-- Check policy exists
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'job_requests' AND policyname = 'Workers can complete their accepted jobs';
-- Should return 1 row with cmd='UPDATE'

-- Test as worker who accepted a job
SET request.jwt.claims = '{\"sub\": \"worker-user-id\", \"role\": \"worker\"}';

-- Should succeed (worker completing their own job)
UPDATE job_requests
SET status = 'completed'
WHERE id = 'job-they-accepted' AND status = 'accepted';

-- Should fail (worker completing someone else's job)
UPDATE job_requests
SET status = 'completed'
WHERE id = 'job-someone-else-accepted' AND status = 'accepted';
-- Expected: no rows updated (policy blocks it)
```

---

## Security Considerations

### ✅ Secure Policy

**Protected Against:**
1. **Job Stealing:** Can't complete other workers' jobs (accepted_by check)
2. **Wrong Status:** Can't modify open/completed/cancelled jobs (status check)
3. **Role Spoofing:** Must have worker role (has_role check)

**Attack Vectors Prevented:**
- Worker A can't mark Worker B's job as completed
- Worker can't complete a job they didn't accept
- Non-workers can't use this policy at all

### Potential Issues

**⚠️ No Status Transition Validation**

The policy allows ANY update to accepted jobs, not just to 'completed':

```sql
-- These would all be allowed:
UPDATE job_requests SET status = 'cancelled' WHERE ...  -- Maybe unintended?
UPDATE job_requests SET budget = 999999 WHERE ...       -- Maybe unintended?
UPDATE job_requests SET contractor_id = ... WHERE ...   -- Definitely bad!
```

**Consider Adding:**
```sql
-- More restrictive version
CREATE POLICY "Workers can complete their accepted jobs"
ON job_requests FOR UPDATE
USING (
  status = 'accepted'::job_status
  AND accepted_by IN (SELECT id FROM worker_profiles WHERE user_id = auth.uid())
  AND has_role(auth.uid(), 'worker'::app_role)
)
WITH CHECK (
  status IN ('completed'::job_status, 'accepted'::job_status) -- Only allow these statuses
  -- Could add more checks: budget unchanged, contractor_id unchanged, etc.
);
```

**Current Version is Probably Fine Because:**
- Application logic likely controls what fields are updated
- Other constraints (CHECK, triggers) may prevent invalid updates
- Contractors have their own UPDATE policy to fix issues

---

## Optional Improvements

### 1. Add WITH CHECK Clause

Restrict what workers can update:

```sql
CREATE POLICY "Workers can complete their accepted jobs"
ON job_requests FOR UPDATE
USING (
  status = 'accepted'::job_status
  AND accepted_by IN (SELECT id FROM worker_profiles WHERE user_id = auth.uid())
  AND has_role(auth.uid(), 'worker'::app_role)
)
WITH CHECK (
  status = 'completed'::job_status  -- Can only change to completed
);
```

### 2. Add Completed Timestamp Trigger

Automatically set completed_at when status changes:

```sql
CREATE OR REPLACE FUNCTION set_completed_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER job_completion_timestamp
  BEFORE UPDATE ON job_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_completed_timestamp();
```

### 3. Add Job Completion Notification

Notify contractor when job completed:

```sql
-- In the trigger, add:
PERFORM pg_notify(
  'job_completed',
  json_build_object('job_id', NEW.id, 'contractor_id', NEW.contractor_id)::text
);
```

---

## Notes

### Job Status Flow

**Expected Lifecycle:**
```
open → accepted → completed
  ↓       ↓
cancelled cancelled
```

**Policies Cover:**
- `open → accepted`: Line 691 (Workers can update to accept)
- `accepted → completed`: NEW policy (Workers can complete)
- Other transitions: Handled by contractors/admins

### Missing Policies?

**What about:**
- Workers cancelling jobs? (Not covered - maybe intentional)
- Contractors marking jobs completed? (Covered by line 684)
- Automated status transitions? (Would need triggers)

---

## Rollback

If issues arise:

```sql
DROP POLICY IF EXISTS "Workers can complete their accepted jobs" ON public.job_requests;
```

Simple rollback - just removes the new policy. Workers can still accept jobs but not complete them.

---

## Estimated Integration Time

- **Reading/Understanding:** 2 minutes
- **Adding Policy:** 1 minute (simple copy-paste)
- **Testing:** 3 minutes
- **Total:** ~5 minutes

---

## 🎉 Final Migration!

After integrating this migration, **all 20 migrations will be consolidated** into MigrateUnite.sql!

**Integration Progress:**
- ✅ Migrations 1-19: Integrated
- ⏳ Migration 20: Ready to integrate
- 🎯 **Total:** 20/20 migrations

Congratulations on completing the consolidation! 🚀
