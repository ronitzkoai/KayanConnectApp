# Migration 17: Technician Role

## Migration Info
- **Filename**: `20251207142851_76957944-c8f8-4a9a-8c86-fa2415aac4fa.sql`
- **Timestamp**: December 7, 2025 at 14:28:51 (16 minutes after migration 16)
- **Purpose**: Add 'technician' role to the app_role enum
- **Size**: 2 lines
- **Dependencies**:
  - Migration 3 (app_role enum creation)

## Overview
This is a simple but important migration that adds the fifth user role to the platform: 'technician'. This role represents dedicated maintenance service providers who are distinct from contractors (who post jobs and may provide services) and workers (who accept jobs). The technician role will be used with the technician_profiles table created in the next migration.

**Role Evolution**:
- Migration 1: contractor, worker, admin (3 roles)
- Migration 3: Refactored to app_role enum with same 3 roles
- Migration 7: Added 'customer' (4 roles)
- **Migration 17: Added 'technician' (5 roles)**

---

## Line-by-Line Analysis

### Lines 1-2: Add Technician to app_role Enum
```sql
-- Add technician to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'technician';
```

**What it does**: Adds 'technician' as a valid role value

**Syntax Breakdown**:
- **ALTER TYPE public.app_role**: Modifies existing enum
- **ADD VALUE**: Appends new value to end of enum
- **IF NOT EXISTS**: Safe idempotency - won't error if already exists
- **'technician'**: The new role name

**PostgreSQL Enum Behavior**:
- New value appended to end
- Existing values unchanged ('contractor', 'worker', 'admin', 'customer')
- All existing data remains valid
- Cannot remove enum values (only add)

**Complete app_role Enum After Migration**:
```sql
app_role: 'contractor', 'worker', 'admin', 'customer', 'technician'
```

---

## Role Definitions

### All Platform Roles (After Migration 17)

1. **contractor**
   - Posts job requests
   - Hires workers
   - Requests maintenance services
   - May own equipment
   - Profile: contractor_profiles

2. **worker**
   - Accepts job requests
   - Works for contractors
   - Operates equipment
   - Profile: worker_profiles

3. **admin**
   - Platform management
   - Customer support
   - Content moderation
   - Full oversight (migration 15)
   - No dedicated profile table

4. **customer**
   - Requests services
   - May post jobs (unclear - no policies defined)
   - Profile: customer_profiles

5. **technician** (NEW)
   - Provides maintenance services
   - Repairs/services equipment
   - Submits quotes on maintenance requests
   - Profile: technician_profiles (migration 18)

---

## Comparison: Technician vs Contractor with is_service_provider

### Migration 16 Approach: Contractor Flag
```sql
contractor_profiles.is_service_provider = true
```
- **Pros**: Single account for dual role
- **Cons**: Mixed business concerns

### Migration 17-18 Approach: Dedicated Role
```sql
app_role = 'technician'
technician_profiles table
```
- **Pros**: Clean separation, dedicated features
- **Cons**: More complex (but better architecture)

**Relationship Options**:
1. **Exclusive**: User is EITHER contractor OR technician
2. **Multi-role**: User can be BOTH contractor AND technician (via user_roles table)
3. **Hybrid**: Contractors can have is_service_provider flag OR be dedicated technicians

**Recommendation**: Multi-role approach
- User can have roles: ['contractor', 'technician']
- Has both contractor_profiles AND technician_profiles
- Clear separation of business functions

---

## Schema Changes Summary

### ENUMs Modified
1. **app_role**
   - Before: 'contractor', 'worker', 'admin', 'customer' (4 values)
   - After: 'contractor', 'worker', 'admin', 'customer', 'technician' (5 values)

### Automatically Affected Tables
All tables using app_role enum can now use 'technician':
1. **user_roles**: Can assign technician role
2. **has_role() function**: Can check for technician role
3. **All RLS policies using has_role()**: Work with technician role

---

## Integration Notes

### Dependencies
- **Requires Migration 3**: app_role enum must exist

### Enables Later Migrations
- **Migration 18**: Creates technician_profiles table
  - Policies will check has_role(auth.uid(), 'technician')
  - Technician role must exist first

### Usage in Future Policies
```sql
-- Example from migration 18
CREATE POLICY "Technicians can insert own profile"
ON technician_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'technician'));
```

---

## Issues & Recommendations

### No Critical Issues
This is a clean, simple migration:
- ✅ Safe idempotent (IF NOT EXISTS)
- ✅ Non-breaking (adds optional value)
- ✅ No data migration needed
- ✅ Follows established pattern

### Minor Considerations
1. **ℹ️ No Role Description Table**
   - Role names are self-explanatory but descriptions would help
   - **Enhancement**:
   ```sql
   CREATE TABLE role_descriptions (
     role app_role PRIMARY KEY,
     display_name TEXT NOT NULL,
     description TEXT NOT NULL,
     permissions TEXT[]
   );

   INSERT INTO role_descriptions VALUES
     ('technician', 'Equipment Technician',
      'Provides maintenance and repair services for construction equipment',
      ARRAY['view_maintenance_requests', 'submit_quotes', 'receive_ratings']);
   ```

2. **ℹ️ No Default Role Assignment**
   - Application must assign technician role explicitly
   - No auto-assignment on signup

---

## For Unified Migration

### Consolidation Opportunities
1. **Define All Roles at Once**
   ```sql
   CREATE TYPE app_role AS ENUM (
     'contractor',
     'worker',
     'admin',
     'customer',
     'technician'
   );
   ```
   - No need for migrations 7 and 17 to add roles later
   - All roles defined upfront

2. **Add Role Metadata Table**
   ```sql
   CREATE TABLE role_metadata (
     role app_role PRIMARY KEY,
     display_name TEXT NOT NULL,
     description TEXT NOT NULL,
     icon TEXT,
     sort_order INTEGER
   );
   ```

3. **Define Role Hierarchy**
   ```sql
   CREATE TABLE role_hierarchy (
     role app_role PRIMARY KEY,
     inherits_from app_role
   );
   -- admin inherits all permissions
   ```

### Sequencing in Unified Migration
```
1. ENUMs (app_role with all 5 values at once)
2. Role metadata tables
3. User_roles table
4. Profile tables (one for each role type)
5. RLS policies using roles
```

### Dead Code to Remove
- In unified migration, don't need separate migrations to add customer and technician
- Define all roles immediately

---

## Use Cases

### Assign Technician Role
```sql
-- Application assigns technician role on signup
INSERT INTO user_roles (user_id, role)
VALUES (auth.uid(), 'technician');

-- Check if user has technician role
SELECT has_role(auth.uid(), 'technician');
```

### Multi-Role User
```sql
-- User can be both contractor and technician
INSERT INTO user_roles (user_id, role) VALUES
  (auth.uid(), 'contractor'),
  (auth.uid(), 'technician');

-- Can create both profile types
INSERT INTO contractor_profiles (user_id, company_name, ...) VALUES (...);
INSERT INTO technician_profiles (user_id, specializations, ...) VALUES (...);
```

### Policy Usage
```sql
-- From migration 18
CREATE POLICY "Technicians can submit quotes"
ON maintenance_quotes FOR INSERT
WITH CHECK (
  provider_id = auth.uid() AND
  has_role(auth.uid(), 'technician')
);
```

### Role-Based UI
```javascript
// Application checks role for UI display
const isTechnician = await supabase.rpc('has_role', {
  user_id: user.id,
  role_name: 'technician'
});

if (isTechnician) {
  // Show maintenance marketplace, quote submission forms
}
```

---

## Rollback Considerations

### Cannot Rollback Enum Values
**PostgreSQL Limitation**: Cannot remove enum values

```sql
-- ❌ This does NOT work
ALTER TYPE app_role DROP VALUE 'technician'; -- ERROR
```

### If Rollback Absolutely Necessary
1. Create new enum without 'technician'
2. Migrate data (remove technician assignments from user_roles)
3. Drop and recreate dependent tables/functions
4. **Not recommended** - very complex, high risk

### Recommendation
- Don't rollback - unused enum values are harmless
- If technician feature not used, simply don't assign the role

---

## Testing Checklist

### Enum Value
- [ ] app_role enum includes 'technician' after migration
- [ ] Can insert 'technician' into user_roles table
- [ ] has_role() function works with 'technician'
- [ ] Cannot insert invalid role (type safety preserved)

### Role Assignment
- [ ] Can assign technician role to user
- [ ] Can assign multiple roles including technician
- [ ] Role persists across sessions
- [ ] Can query users by technician role

### Integration
- [ ] Existing roles still work (contractor, worker, admin, customer)
- [ ] Migration 18 policies work with technician role
- [ ] Application UI recognizes technician role

---

## Conclusion

Migration 17 is a simple but foundational migration that adds the 'technician' role to the platform's role system. This enables the creation of dedicated maintenance service providers distinct from contractors and workers. The technician role completes the platform's user type ecosystem, supporting the full marketplace: job posting (contractors), job acceptance (workers), service requests (customers), and service provision (technicians).

**Key Achievements**:
- ✅ Adds technician role to app_role enum
- ✅ Enables dedicated service provider user type
- ✅ Safe idempotent implementation
- ✅ Non-breaking change
- ✅ Prepares for technician_profiles table (migration 18)

**No Critical Issues**:
- Clean, simple, well-executed migration
- Follows established pattern from migration 7 (customer role)

**Role System Complete** (5 roles):
1. **contractor** - Job posters, equipment owners
2. **worker** - Job acceptors, equipment operators
3. **admin** - Platform managers
4. **customer** - Service requesters
5. **technician** - Service providers

This migration demonstrates best practice for enum expansion: simple, idempotent, non-breaking, and immediately useful for the next migration. Together with migration 18, it establishes a clean architectural separation between contractors (who may provide some services) and dedicated technicians (whose primary role is service provision).
