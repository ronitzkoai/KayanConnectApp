# Migration 02: Security Fix

## Migration Info
- **Filename**: `20251127105452_6974aa1b-423f-4774-86a6-4498c06c2b61.sql`
- **Timestamp**: November 27, 2025 at 10:54:52 (25 minutes after migration 1)
- **Purpose**: Fix security vulnerabilities by setting search_path on SECURITY DEFINER functions
- **Size**: 92 lines
- **Dependencies**: Migration 1 (modifies functions created there)

## Overview
This migration addresses a critical security issue: functions with `SECURITY DEFINER` that don't set an explicit `search_path` are vulnerable to attacks where malicious users can manipulate the search path to hijack function calls. This migration drops and recreates all three functions from migration 1 with proper `SET search_path = public`.

---

## Security Context

### What is the Vulnerability?
**SECURITY DEFINER** functions run with the permissions of the function creator (typically a superuser), not the caller. Without an explicit `search_path`:
- An attacker could create a malicious function in their own schema
- Set their `search_path` to prioritize their schema
- When the SECURITY DEFINER function runs, it might call the attacker's function instead of the intended one
- The attacker's code runs with elevated privileges

### How SET search_path Fixes It
By adding `SET search_path = public`, the function always looks for objects in the `public` schema first, preventing search path manipulation attacks.

**Supabase Recommendation**: All SECURITY DEFINER functions should set an explicit search_path.

---

## Line-by-Line Analysis

### Lines 1-3: Header Comment
```sql
-- Fix security warnings by setting search_path on functions
-- Drop triggers first, then functions, then recreate with search_path
```
**What it does**: Explains the purpose and approach
**Why this order**: Triggers depend on functions, so triggers must be dropped before functions can be dropped

---

### Lines 4-9: Drop All Triggers
```sql
-- Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_rating_created ON public.ratings;
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
DROP TRIGGER IF EXISTS set_updated_at_worker_profiles ON public.worker_profiles;
DROP TRIGGER IF EXISTS set_updated_at_job_requests ON public.job_requests;
```
**What it does**: Removes all five triggers created in migration 1
**Why IF EXISTS**: Safe idempotency - won't error if triggers already gone
**Why needed**: Can't drop functions while triggers reference them

**Triggers being dropped**:
1. `on_auth_user_created` - Triggers on new user signup
2. `on_rating_created` - Triggers when rating is created
3. `set_updated_at_profiles` - Updates profile timestamps
4. `set_updated_at_worker_profiles` - Updates worker profile timestamps
5. `set_updated_at_job_requests` - Updates job request timestamps

---

### Lines 11-14: Drop All Functions
```sql
-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_worker_rating() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
```
**What it does**: Removes the three functions created in migration 1
**Why CASCADE**: Ensures any remaining dependent objects are also dropped
**Why IF EXISTS**: Safe idempotency

**Functions being dropped**:
1. `handle_new_user()` - Creates profile on signup
2. `update_worker_rating()` - Recalculates worker ratings
3. `handle_updated_at()` - Updates timestamps

**Note**: These will be recreated with identical logic but with security fixes

---

### Lines 16-33: Recreate handle_new_user Function
```sql
-- Recreate handle_new_user with search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, phone)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'role')::user_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$;
```
**What it does**: Creates profile for new users (same as migration 1)

**What changed from migration 1**:
- **Line 21: `SET search_path = public`** - NEW! Security fix
- **Line 19: `LANGUAGE plpgsql`** - Moved position for clarity (was after SECURITY DEFINER)
- **Lines 22-33**: Function body identical to migration 1

**Why these changes**:
- Setting search_path prevents attackers from hijacking INSERT, COALESCE, or type casting
- Language specification moved for better readability (conventional ordering)

**How it works**:
1. Triggers after user signs up in auth.users
2. Extracts role, full_name, phone from signup metadata
3. Creates matching profile in public.profiles
4. Now runs with fixed search_path for security

**Issues**:
- **MODIFIED IN MIGRATION 3**: This function is recreated again to handle user_roles table

---

### Lines 35-59: Recreate update_worker_rating Function
```sql
-- Recreate update_worker_rating with search_path
CREATE OR REPLACE FUNCTION public.update_worker_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    updated_at = NOW()
  WHERE id = NEW.worker_id;
  RETURN NEW;
END;
$$;
```
**What it does**: Recalculates worker's average rating (same as migration 1)

**What changed from migration 1**:
- **Line 40: `SET search_path = public`** - NEW! Security fix
- **Line 38: `LANGUAGE plpgsql`** - Moved position for clarity
- **Lines 41-58**: Function body identical to migration 1

**Why these changes**:
- Setting search_path prevents attackers from hijacking UPDATE, SELECT, AVG, COUNT functions
- Ensures queries always target the correct public.worker_profiles and public.ratings tables

**How it works**:
1. Triggers after new rating is inserted
2. Calculates average rating for the worker
3. Counts total ratings
4. Updates worker_profile with new stats
5. Now runs with fixed search_path for security

---

### Lines 61-71: Recreate handle_updated_at Function
```sql
-- Recreate handle_updated_at with search_path
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
```
**What it does**: Auto-updates updated_at timestamps (same as migration 1)

**What changed from migration 1**:
- **Line 65: `SET search_path = public`** - NEW! Security fix
- **Line 64: `LANGUAGE plpgsql`** - Moved position for clarity
- **Lines 66-70**: Function body identical to migration 1

**Why these changes**:
- Setting search_path prevents attackers from hijacking NOW() function
- Ensures consistent timestamp behavior

**Note**: This function is NOT `SECURITY DEFINER` (unlike the other two), but setting search_path is still good practice for consistency

**How it works**:
1. Triggers before UPDATE on profiles, worker_profiles, or job_requests
2. Sets updated_at to current timestamp
3. Returns modified row
4. Now runs with fixed search_path

---

### Lines 73-92: Recreate All Triggers
```sql
-- Recreate triggers
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
```
**What it does**: Recreates all five triggers with identical definitions from migration 1
**Why needed**: Functions were dropped and recreated, so triggers need to be recreated to call the new functions
**What changed**: Nothing - triggers are identical to migration 1

**Triggers recreated**:
1. **on_auth_user_created** (lines 74-76): Calls handle_new_user() after user signup
2. **on_rating_created** (lines 78-80): Calls update_worker_rating() after rating created
3. **set_updated_at_profiles** (lines 82-84): Calls handle_updated_at() before profile update
4. **set_updated_at_worker_profiles** (lines 86-88): Calls handle_updated_at() before worker profile update
5. **set_updated_at_job_requests** (lines 90-92): Calls handle_updated_at() before job request update

---

## Schema Changes Summary

### Modified Functions (All 3)
1. **handle_new_user()** - Added `SET search_path = public`
2. **update_worker_rating()** - Added `SET search_path = public`
3. **handle_updated_at()** - Added `SET search_path = public`

### Recreated Triggers (All 5)
1. **on_auth_user_created**
2. **on_rating_created**
3. **set_updated_at_profiles**
4. **set_updated_at_worker_profiles**
5. **set_updated_at_job_requests**

### No New Objects Created
This migration only modifies existing functions and triggers - no new tables, columns, or enums.

---

## Integration Notes

### Dependencies
- **Requires Migration 1**: All functions and triggers being modified were created in migration 1
- **Safe to Apply**: No data changes, only function security improvements

### Modified by Later Migrations
- **Migration 3**: Drops and recreates `handle_new_user()` again to support user_roles table

### Impact on Existing Data
- **No data impact**: Functions work identically from user perspective
- **No downtime**: Functions are dropped and recreated atomically
- **Backwards compatible**: No changes to function signatures or behavior

---

## Issues & Recommendations

### Issue: This Should Have Been Part of Migration 1

**Problem**: Security best practices should be applied from the start
**Timeline**: Created only 25 minutes after migration 1
**Why it happened**: Likely Supabase CLI or dashboard showed security warnings after running migration 1
**Recommendation**: In unified migration, include `SET search_path` on all functions from the beginning

### Issue: Inconsistency with Migration 3

**Problem**: Migration 3 uses `SET search_path TO 'public'` (with TO and quotes) while this uses `SET search_path = public` (with = and no quotes)
**Location**: Compare line 21 here vs migration 3 line 98
**Impact**: Both syntaxes work, but inconsistency is confusing
**Recommendation**: Use `SET search_path = public` consistently (no quotes, use =)

### Best Practice: All SECURITY DEFINER Functions Need search_path

**Applies to**:
- `handle_new_user()` - SECURITY DEFINER (needs fix)
- `update_worker_rating()` - SECURITY DEFINER (needs fix)
- `handle_updated_at()` - NOT SECURITY DEFINER (but fixed anyway for consistency)

**Future migrations**: Always add `SET search_path` when creating SECURITY DEFINER functions

---

## Rollback Considerations

### To Rollback This Migration
This migration is a security fix, so rollback means reverting to insecure functions. **Not recommended unless you're reverting everything to before migration 1.**

If you must rollback:
```sql
-- Would need to recreate functions from migration 1 (without search_path)
-- See migration 1 rollback script
```

**Better approach**: Don't rollback security fixes - always keep them applied.

---

## For Unified Migration

### What to Include
✅ All three functions with `SET search_path = public`
✅ All five triggers

### What to Change
🔧 Include search_path from the start - don't create insecure versions first
🔧 Use consistent syntax: `SET search_path = public` (no quotes, use =)

### What to Skip
❌ Don't drop and recreate - just create functions correctly the first time

### Recommended Order in Unified Migration
1. Create all tables and enums
2. Create all functions (with search_path included)
3. Create all triggers
4. Create all policies

This avoids the drop/recreate pattern entirely.

---

## Security Impact

### Before This Migration
- ⚠️ Functions vulnerable to search_path hijacking
- ⚠️ Attacker could potentially:
  - Intercept profile creation
  - Manipulate rating calculations
  - Interfere with timestamp updates

### After This Migration
- ✅ Functions explicitly use public schema
- ✅ Search path manipulation attacks prevented
- ✅ Follows Supabase security best practices

### Real-World Risk Assessment
**Likelihood**: Low (requires authenticated user + ability to create schemas)
**Impact**: High (SECURITY DEFINER runs with elevated privileges)
**Severity**: Medium (theoretical vulnerability, but Supabase's RLS limits schema creation)

**Conclusion**: This is a critical fix that should be applied. While the exploit is difficult, the fix is trivial and has no downsides.

---

## Conclusion

This migration is a straightforward security hardening pass. It demonstrates the importance of:
1. Setting `search_path` on all SECURITY DEFINER functions
2. Following security best practices from the start
3. Responding quickly to security warnings (fixed 25 minutes after initial migration)

For a unified migration, incorporate these security fixes from the beginning to avoid this drop/recreate pattern. The migration is well-executed and addresses the security concerns properly, though the syntax becomes inconsistent with migration 3's approach.
