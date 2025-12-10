# Equipment Marketplace & Rentals Migration - Detailed Explanation

## Table of Contents
1. [Overview](#overview)
2. [Line-by-Line Code Explanation](#line-by-line-code-explanation)
3. [Security Policy Breakdown](#security-policy-breakdown)
4. [How to Insert into MigrateUnite.sql](#how-to-insert-into-migrateunitesql)
5. [Testing the Migration](#testing-the-migration)
6. [Edge Cases and Considerations](#edge-cases-and-considerations)
7. [Recommended Enhancements](#recommended-enhancements)

---

## Overview

This migration adds two new tables to your Supabase database:
- **equipment_marketplace** - For buying and selling equipment
- **equipment_rentals** - For renting equipment

Both tables include:
- Comprehensive Row Level Security (RLS) policies
- Foreign key relationships to the profiles table
- Automatic timestamp management
- Admin oversight capabilities
- Storage integration for equipment images
- Real-time subscriptions

---

## Line-by-Line Code Explanation

### Section 1: Table Creation - equipment_marketplace

```sql
CREATE TABLE public.equipment_marketplace (
```
**Purpose**: Creates a new table in the public schema for equipment sales listings.

```sql
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
```
**Purpose**: Unique identifier for each listing.
- `UUID` - Universally unique identifier type
- `PRIMARY KEY` - Enforces uniqueness and creates automatic index
- `DEFAULT gen_random_uuid()` - Automatically generates a random UUID when a new row is inserted

```sql
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
```
**Purpose**: Links the listing to the user who created it.
- `UUID NOT NULL` - Must have a seller (required field)
- `REFERENCES public.profiles(id)` - Foreign key to the profiles table
- `ON DELETE CASCADE` - If the seller's profile is deleted, all their listings are automatically deleted

```sql
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
```
**Purpose**: Tracks who purchased the equipment.
- `UUID` (nullable) - Optional field, only set after purchase
- `ON DELETE SET NULL` - If buyer's profile is deleted, the field is set to NULL (preserves transaction history)

```sql
  equipment_type work_type NOT NULL,
```
**Purpose**: Specifies the type of equipment.
- `work_type` - Uses existing ENUM with values: backhoe, loader, bobcat, grader, dozer, excavator, compactor, paver, scraper, trencher, skid_steer, forklift, crane, dump_truck, water_truck, roller
- `NOT NULL` - Equipment type is required

```sql
  brand TEXT,
  model TEXT,
  year INTEGER,
```
**Purpose**: Optional metadata about the equipment.
- `TEXT` - Variable-length text fields
- `INTEGER` - Numeric year value
- All nullable (not required)

```sql
  price NUMERIC NOT NULL CHECK (price > 0),
```
**Purpose**: The selling price of the equipment.
- `NUMERIC` - Precise decimal type for monetary values
- `NOT NULL` - Price is required
- `CHECK (price > 0)` - Constraint ensuring price must be positive (prevents $0 or negative prices)

```sql
  condition TEXT,
```
**Purpose**: Free-text description of equipment condition (e.g., "Excellent", "Good", "Fair", "Poor").

```sql
  hours_used INTEGER CHECK (hours_used >= 0),
```
**Purpose**: Operating hours on the equipment.
- `CHECK (hours_used >= 0)` - Cannot be negative

```sql
  location TEXT NOT NULL,
```
**Purpose**: Where the equipment is located.
- `NOT NULL` - Location is required for buyers to know where equipment is

```sql
  description TEXT,
  image_url TEXT,
```
**Purpose**:
- `description` - Detailed description of the equipment
- `image_url` - URL/path to equipment image (stored in Supabase Storage)

```sql
  is_sold BOOLEAN DEFAULT false,
```
**Purpose**: Tracks whether the equipment has been sold.
- `BOOLEAN` - true/false value
- `DEFAULT false` - New listings are automatically marked as not sold

```sql
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
**Purpose**: Timestamp tracking.
- `TIMESTAMPTZ` - Timestamp with timezone
- `DEFAULT now()` - Automatically set to current time on creation
- `updated_at` will be managed by trigger

---

### Section 2: Table Creation - equipment_rentals

```sql
CREATE TABLE public.equipment_rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  renter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  equipment_type work_type NOT NULL,
  brand TEXT,
  model TEXT,
  year INTEGER,
```
**Purpose**: Similar structure to equipment_marketplace.
- `owner_id` instead of `seller_id` - The person who owns the equipment
- `renter_id` instead of `buyer_id` - The person currently renting

```sql
  daily_rate NUMERIC NOT NULL CHECK (daily_rate > 0),
  weekly_rate NUMERIC CHECK (weekly_rate >= 0),
  monthly_rate NUMERIC CHECK (monthly_rate >= 0),
```
**Purpose**: Rental pricing structure.
- `daily_rate` - Required, must be positive
- `weekly_rate` and `monthly_rate` - Optional (nullable), can be 0
- Allows owners to offer only daily rates, or multiple pricing options

```sql
  location TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
```
**Purpose**: Similar to marketplace.
- `is_available` instead of `is_sold` - Tracks if equipment is available for rent

```sql
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### Section 3: Enable Row Level Security

```sql
ALTER TABLE public.equipment_marketplace ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_rentals ENABLE ROW LEVEL SECURITY;
```
**Purpose**: Enables RLS on both tables.
- Without RLS enabled, all authenticated users could see/modify all rows
- With RLS enabled, only rows that pass policy checks are accessible
- **CRITICAL**: Must be enabled before policies will take effect

---

### Section 4: RLS Policies - equipment_marketplace

#### SELECT Policy

```sql
CREATE POLICY "Users can view available marketplace items or their own listings"
ON public.equipment_marketplace
FOR SELECT
TO authenticated
USING (
  is_sold = false
  OR seller_id = auth.uid()
  OR buyer_id = auth.uid()
);
```
**Purpose**: Controls which rows users can see (read access).

**Breakdown**:
- `FOR SELECT` - Applies to SELECT queries
- `TO authenticated` - Applies to all logged-in users
- `USING (...)` - Condition that must be true for row to be visible
- `auth.uid()` - Built-in Supabase function returning current user's ID

**Logic**: A user can see a row if:
1. `is_sold = false` - Equipment is still for sale (public visibility)
2. `seller_id = auth.uid()` - User is the seller (can see their own listings even if sold)
3. `buyer_id = auth.uid()` - User is the buyer (can see items they purchased)

**Example**:
- User A creates a listing → is_sold=false → Everyone can see it
- User B buys it → is_sold=true, buyer_id=User B
- Now only User A (seller) and User B (buyer) can see it

#### INSERT Policy

```sql
CREATE POLICY "All users can create marketplace listings"
ON public.equipment_marketplace
FOR INSERT
TO authenticated
WITH CHECK (seller_id = auth.uid());
```
**Purpose**: Controls who can create new rows.

**Breakdown**:
- `FOR INSERT` - Applies when creating new rows
- `WITH CHECK (...)` - Condition that must be true for insert to succeed
- **Security**: Forces `seller_id` to be the current user
- Users cannot create listings on behalf of others

**Example**:
```sql
-- This will FAIL (seller_id doesn't match current user)
INSERT INTO equipment_marketplace (seller_id, ...) VALUES ('other-user-id', ...);

-- This will SUCCEED (seller_id matches current user)
INSERT INTO equipment_marketplace (seller_id, ...) VALUES (auth.uid(), ...);
```

#### UPDATE Policy

```sql
CREATE POLICY "Users can update their own marketplace listings"
ON public.equipment_marketplace
FOR UPDATE
TO authenticated
USING (seller_id = auth.uid())
WITH CHECK (seller_id = auth.uid());
```
**Purpose**: Controls who can modify rows and what changes are allowed.

**Breakdown**:
- `USING (...)` - Which rows can be updated (must be the seller)
- `WITH CHECK (...)` - What values can be set (seller_id must remain the same)
- **Double protection**: Can't update others' rows AND can't transfer ownership

**Example**:
```sql
-- User A can update their own listing
UPDATE equipment_marketplace SET price = 30000 WHERE seller_id = 'user-a-id';

-- User A CANNOT update User B's listing
UPDATE equipment_marketplace SET price = 30000 WHERE seller_id = 'user-b-id';

-- User A CANNOT transfer ownership
UPDATE equipment_marketplace SET seller_id = 'user-b-id' WHERE id = 'listing-id';
```

#### DELETE Policy

```sql
CREATE POLICY "Users can delete their own marketplace listings"
ON public.equipment_marketplace
FOR DELETE
TO authenticated
USING (seller_id = auth.uid());
```
**Purpose**: Controls who can delete rows.
- Users can only delete their own listings

#### Admin Policies

```sql
CREATE POLICY "Admin can view all marketplace listings"
ON public.equipment_marketplace
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
```
**Purpose**: Gives admins full visibility.
- `public.has_role(auth.uid(), 'admin')` - Checks if current user has admin role
- Admins can see ALL listings (including sold items)

```sql
CREATE POLICY "Admin can update all marketplace listings"
ON public.equipment_marketplace
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));
```
**Purpose**: Allows admins to modify any listing (for moderation).

```sql
CREATE POLICY "Admin can delete marketplace listings"
ON public.equipment_marketplace
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
```
**Purpose**: Allows admins to remove inappropriate/spam listings.

---

### Section 5: RLS Policies - equipment_rentals

The rental policies follow the exact same pattern as marketplace, with these differences:
- `owner_id` instead of `seller_id`
- `renter_id` instead of `buyer_id`
- `is_available = true` instead of `is_sold = false`

---

### Section 6: Triggers

```sql
CREATE TRIGGER update_equipment_marketplace_updated_at
BEFORE UPDATE ON public.equipment_marketplace
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
```
**Purpose**: Automatically updates the `updated_at` timestamp when a row is modified.

**Breakdown**:
- `BEFORE UPDATE` - Runs before the update is committed
- `FOR EACH ROW` - Runs for every row being updated
- `EXECUTE FUNCTION public.handle_updated_at()` - Calls existing function that sets `updated_at = now()`

**Existing function** (already in MigrateUnite.sql):
```sql
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
```

---

### Section 7: Storage Bucket

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('equipment-images', 'equipment-images', true)
ON CONFLICT (id) DO NOTHING;
```
**Purpose**: Creates a Supabase Storage bucket for equipment images.

**Breakdown**:
- `id` and `name` - Bucket identifier
- `public = true` - Images are publicly accessible (no auth required to view)
- `ON CONFLICT DO NOTHING` - Prevents error if bucket already exists

**Storage Policies**:

```sql
CREATE POLICY "Equipment images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'equipment-images');
```
**Purpose**: Anyone can view images in the equipment-images bucket.

```sql
CREATE POLICY "Authenticated users can upload equipment images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'equipment-images');
```
**Purpose**: Only logged-in users can upload images.

```sql
CREATE POLICY "Users can update their equipment images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'equipment-images');
```
**Purpose**: Authenticated users can replace images.

```sql
CREATE POLICY "Users can delete their equipment images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'equipment-images');
```
**Purpose**: Authenticated users can remove images.

**Note**: These policies are permissive. For stricter control, you could add owner checks based on the image path/name.

---

### Section 8: Realtime Publication

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.equipment_marketplace;
ALTER PUBLICATION supabase_realtime ADD TABLE public.equipment_rentals;
```
**Purpose**: Enables real-time subscriptions to these tables.

**Use Case**: Your frontend can subscribe to changes:
```javascript
// Example: Real-time subscription
const subscription = supabase
  .channel('equipment_marketplace')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'equipment_marketplace' },
    (payload) => {
      console.log('Change detected:', payload);
      // Update UI with new/updated/deleted listings
    }
  )
  .subscribe();
```

**Benefits**:
- Instant updates when new equipment is listed
- Live availability status changes
- No need to poll database for updates

---

## Security Policy Breakdown

### Access Matrix

| Action | Regular User | Owner/Seller | Buyer/Renter | Admin |
|--------|--------------|--------------|--------------|-------|
| **View available items** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **View sold/rented items** | ❌ No | ✅ Yes (own) | ✅ Yes (participated) | ✅ Yes (all) |
| **Create listing** | ✅ Yes (as self) | ✅ Yes (as self) | ✅ Yes (as self) | ✅ Yes (as self) |
| **Update own listing** | N/A | ✅ Yes | N/A | ✅ Yes (any) |
| **Update others' listing** | ❌ No | ❌ No | ❌ No | ✅ Yes |
| **Delete own listing** | N/A | ✅ Yes | N/A | ✅ Yes (any) |
| **Delete others' listing** | ❌ No | ❌ No | ❌ No | ✅ Yes |

### Policy Evaluation Order

When a user performs an action, PostgreSQL evaluates policies as follows:

1. **Check if RLS is enabled** → If not, action is allowed
2. **Find all policies for the action type** (SELECT, INSERT, UPDATE, DELETE)
3. **Policies are combined with OR** → User needs to pass ANY ONE policy
4. **For UPDATE**: Must pass both USING and WITH CHECK

**Example**: User tries to SELECT rows
- Policy 1: `is_sold = false` → Fails (row is sold)
- Policy 2: `seller_id = auth.uid()` → Fails (not the seller)
- Policy 3: `buyer_id = auth.uid()` → Passes (user is buyer)
- **Result**: User can see the row

### Security Guarantees

**What this migration prevents**:
1. ✅ Users cannot create listings on behalf of others
2. ✅ Users cannot modify other users' listings
3. ✅ Users cannot see sold/unavailable items unless involved
4. ✅ Users cannot transfer ownership of listings
5. ✅ Non-admins cannot view all data

**What this migration allows**:
1. ✅ All user types can create equipment listings
2. ✅ Sellers/owners maintain full control of their listings
3. ✅ Admins can moderate content
4. ✅ Transaction privacy (only participants see sold items)

---

## How to Insert into MigrateUnite.sql

### Step 1: Backup the File

```bash
# Navigate to migrations directory
cd C:\Users\ronit\KayanConnectApp\supabase\migrations

# Create backup
copy MigrateUnite.sql MigrateUnite.sql.backup
```

### Step 2: Open the File

Open `MigrateUnite.sql` in your text editor.

### Step 3: Navigate to Line 1054

Scroll to the end of the file. You should see:

```sql
-- Add all existing users to global conversation
INSERT INTO conversation_participants (conversation_id, user_id)
SELECT '00000000-0000-0000-0000-000000000001', id
FROM profiles
ON CONFLICT (conversation_id, user_id) DO NOTHING;
```

### Step 4: Add a Separator Comment

After line 1054, add:

```sql


-- ============================================================================
-- EQUIPMENT MARKETPLACE AND RENTALS TABLES
-- Added: 2025-12-10
-- ============================================================================
```

### Step 5: Paste the Migration

Copy the entire contents of `equipment_migration.sql` and paste it below the separator comment.

### Step 6: Save the File

Save `MigrateUnite.sql`.

### Step 7: Run the Migration

If you're using Supabase CLI:

```bash
# Reset database (if in development)
npx supabase db reset

# Or push changes to remote (if in production)
npx supabase db push
```

If you're running manually:
1. Copy the SQL from equipment_migration.sql
2. Go to Supabase Dashboard → SQL Editor
3. Paste the SQL
4. Click "Run"

---

## Testing the Migration

### Test 1: Verify Tables Created

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('equipment_marketplace', 'equipment_rentals');
```

**Expected Result**: 2 rows returned

### Test 2: Verify RLS Enabled

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('equipment_marketplace', 'equipment_rentals');
```

**Expected Result**:
| tablename | rowsecurity |
|-----------|-------------|
| equipment_marketplace | t (true) |
| equipment_rentals | t (true) |

### Test 3: Verify Policies Created

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('equipment_marketplace', 'equipment_rentals')
ORDER BY tablename, cmd;
```

**Expected Result**: 14 policies (7 per table)

### Test 4: Verify Triggers

```sql
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('equipment_marketplace', 'equipment_rentals');
```

**Expected Result**: 2 triggers

### Test 5: Test INSERT as Regular User

```sql
-- Attempt to insert as yourself (should succeed)
INSERT INTO equipment_marketplace (
  seller_id, equipment_type, price, location, description
) VALUES (
  auth.uid(), 'backhoe', 25000, 'New York', 'Well-maintained backhoe'
);
```

**Expected**: Success

### Test 6: Test INSERT with Wrong seller_id

```sql
-- Attempt to insert as someone else (should fail)
INSERT INTO equipment_marketplace (
  seller_id, equipment_type, price, location
) VALUES (
  '00000000-0000-0000-0000-000000000001', -- Random UUID
  'loader', 30000, 'California'
);
```

**Expected**: Error - "new row violates row-level security policy"

### Test 7: Test SELECT Visibility

```sql
-- Create a listing
INSERT INTO equipment_marketplace (seller_id, equipment_type, price, location, is_sold)
VALUES (auth.uid(), 'excavator', 50000, 'Texas', false);

-- Should see it (is_sold = false)
SELECT * FROM equipment_marketplace;

-- Mark as sold
UPDATE equipment_marketplace SET is_sold = true WHERE seller_id = auth.uid();

-- Should still see it (you're the seller)
SELECT * FROM equipment_marketplace;

-- Login as different user
-- Should NOT see sold items (unless you're buyer)
SELECT * FROM equipment_marketplace;
```

### Test 8: Test UPDATE Own Listing

```sql
UPDATE equipment_marketplace
SET price = 20000
WHERE seller_id = auth.uid();
```

**Expected**: Success

### Test 9: Test UPDATE Ownership Transfer (Should Fail)

```sql
UPDATE equipment_marketplace
SET seller_id = '00000000-0000-0000-0000-000000000001'
WHERE seller_id = auth.uid();
```

**Expected**: Error - "new row violates row-level security policy"

### Test 10: Test Admin Access

Login as admin user, then:

```sql
-- Should see ALL rows
SELECT * FROM equipment_marketplace;

-- Should be able to update any row
UPDATE equipment_marketplace
SET description = 'Admin-moderated content'
WHERE id = 'any-listing-id';

-- Should be able to delete any row
DELETE FROM equipment_marketplace WHERE id = 'any-listing-id';
```

---

## Edge Cases and Considerations

### 1. Concurrent Purchase Problem

**Scenario**: Two users try to buy the same item simultaneously.

**Current Behavior**:
- Both users see `is_sold = false`
- Both try to set `buyer_id = their_id` and `is_sold = true`
- Last write wins (one buyer overwrites the other)

**Solution**:
```sql
-- In your application, wrap purchase in transaction
BEGIN;
SELECT * FROM equipment_marketplace
WHERE id = $1 AND is_sold = false
FOR UPDATE; -- Locks the row

UPDATE equipment_marketplace
SET buyer_id = $2, is_sold = true
WHERE id = $1 AND is_sold = false;

-- Check if update affected 1 row
-- If 0 rows, someone else bought it first
COMMIT;
```

### 2. Orphaned Images

**Scenario**: User deletes listing but image remains in storage.

**Solution Options**:

**Option A**: Application-level cleanup
```javascript
// Before deleting listing
await supabase.storage
  .from('equipment-images')
  .remove([listing.image_url]);

await supabase
  .from('equipment_marketplace')
  .delete()
  .eq('id', listingId);
```

**Option B**: Database trigger
```sql
CREATE OR REPLACE FUNCTION delete_equipment_image()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete image from storage when listing is deleted
  -- Note: Requires storage access from database
  PERFORM storage.delete_object('equipment-images', OLD.image_url);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_equipment_image
AFTER DELETE ON equipment_marketplace
FOR EACH ROW
EXECUTE FUNCTION delete_equipment_image();
```

### 3. Privacy Leak Through buyer_id/renter_id

**Scenario**: Sellers can see buyer's UUID when viewing their own sold listings.

**Current State**: buyer_id is visible in SELECT results.

**If Privacy is Critical**:
- Use application layer to mask buyer_id for non-admins
- OR create a database view that excludes sensitive fields
- OR modify SELECT policy to exclude buyer_id column

**Example View**:
```sql
CREATE VIEW equipment_marketplace_public AS
SELECT
  id, seller_id, equipment_type, brand, model, year,
  price, condition, hours_used, location, description,
  image_url, is_sold, created_at, updated_at
  -- Note: buyer_id is excluded
FROM equipment_marketplace;
```

### 4. No Rate Validation

**Scenario**: Owner sets `weekly_rate = 100` and `daily_rate = 50` (doesn't make sense).

**Solution**: Add check constraint
```sql
ALTER TABLE equipment_rentals ADD CONSTRAINT weekly_rate_logic
CHECK (weekly_rate IS NULL OR daily_rate IS NULL OR weekly_rate <= daily_rate * 7);

ALTER TABLE equipment_rentals ADD CONSTRAINT monthly_rate_logic
CHECK (monthly_rate IS NULL OR daily_rate IS NULL OR monthly_rate <= daily_rate * 30);
```

### 5. is_available vs Active Rental

**Scenario**: Equipment is marked `is_available = false` but no renter_id set.

**Issue**: Can't distinguish between "rented out" vs "owner not offering it now".

**Solution Options**:
- Application logic: When setting renter_id, also set is_available = false
- OR add a status ENUM: 'available', 'rented', 'maintenance', 'unlisted'

```sql
CREATE TYPE rental_status AS ENUM ('available', 'rented', 'maintenance', 'unlisted');
ALTER TABLE equipment_rentals ADD COLUMN status rental_status DEFAULT 'available';
```

---

## Recommended Enhancements

### 1. Performance Indexes

**Why**: Speed up common queries (filtering by type, location, availability).

```sql
-- Marketplace indexes
CREATE INDEX idx_marketplace_equipment_type
ON equipment_marketplace(equipment_type);

CREATE INDEX idx_marketplace_location
ON equipment_marketplace(location);

CREATE INDEX idx_marketplace_is_sold
ON equipment_marketplace(is_sold)
WHERE is_sold = false; -- Partial index for active listings

CREATE INDEX idx_marketplace_seller
ON equipment_marketplace(seller_id);

CREATE INDEX idx_marketplace_price
ON equipment_marketplace(price);

-- Rentals indexes
CREATE INDEX idx_rentals_equipment_type
ON equipment_rentals(equipment_type);

CREATE INDEX idx_rentals_location
ON equipment_rentals(location);

CREATE INDEX idx_rentals_is_available
ON equipment_rentals(is_available)
WHERE is_available = true; -- Partial index for available items

CREATE INDEX idx_rentals_owner
ON equipment_rentals(owner_id);

CREATE INDEX idx_rentals_daily_rate
ON equipment_rentals(daily_rate);
```

**Impact**: Queries like "show all available backhoes in New York" will be much faster.

### 2. Full-Text Search

**Why**: Users want to search descriptions for keywords.

```sql
-- Add search vector column
ALTER TABLE equipment_marketplace
ADD COLUMN description_tsv tsvector;

ALTER TABLE equipment_rentals
ADD COLUMN description_tsv tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX idx_marketplace_description_search
ON equipment_marketplace USING gin(description_tsv);

CREATE INDEX idx_rentals_description_search
ON equipment_rentals USING gin(description_tsv);

-- Auto-update search vector on insert/update
CREATE TRIGGER marketplace_description_search_update
BEFORE INSERT OR UPDATE ON equipment_marketplace
FOR EACH ROW EXECUTE FUNCTION
tsvector_update_trigger(
  description_tsv, 'pg_catalog.english',
  brand, model, description
);

CREATE TRIGGER rentals_description_search_update
BEFORE INSERT OR UPDATE ON equipment_rentals
FOR EACH ROW EXECUTE FUNCTION
tsvector_update_trigger(
  description_tsv, 'pg_catalog.english',
  brand, model, description
);

-- Usage example:
SELECT * FROM equipment_marketplace
WHERE description_tsv @@ to_tsquery('english', 'hydraulic & new');
```

### 3. Transaction History Table

**Why**: Better analytics, audit trail, and preserves full transaction data.

```sql
CREATE TABLE equipment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_type TEXT NOT NULL CHECK (listing_type IN ('sale', 'rental')),
  listing_id UUID NOT NULL,
  seller_owner_id UUID NOT NULL REFERENCES profiles(id),
  buyer_renter_id UUID NOT NULL REFERENCES profiles(id),
  transaction_date TIMESTAMPTZ DEFAULT now(),
  amount NUMERIC NOT NULL,
  duration_days INTEGER, -- For rentals
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for user transaction history
CREATE INDEX idx_transactions_buyer_renter
ON equipment_transactions(buyer_renter_id);

CREATE INDEX idx_transactions_seller_owner
ON equipment_transactions(seller_owner_id);

-- RLS policies
ALTER TABLE equipment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own transactions"
ON equipment_transactions FOR SELECT
TO authenticated
USING (
  seller_owner_id = auth.uid()
  OR buyer_renter_id = auth.uid()
);

CREATE POLICY "Admins see all transactions"
ON equipment_transactions FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
```

**Usage**:
- When user buys/rents, insert into transactions table
- View purchase/rental history
- Generate reports on sales volume

### 4. Messaging/Negotiation System

**Why**: Buyers/renters want to ask questions before purchasing.

```sql
CREATE TABLE equipment_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_type TEXT NOT NULL CHECK (listing_type IN ('marketplace', 'rental')),
  listing_id UUID NOT NULL,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  recipient_id UUID NOT NULL REFERENCES profiles(id),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Policies
ALTER TABLE equipment_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see inquiries they sent or received"
ON equipment_inquiries FOR SELECT
TO authenticated
USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can send inquiries"
ON equipment_inquiries FOR INSERT
TO authenticated
WITH CHECK (sender_id = auth.uid());
```

### 5. Favorites/Watchlist

**Why**: Users want to save listings they're interested in.

```sql
CREATE TABLE equipment_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_type TEXT NOT NULL CHECK (listing_type IN ('marketplace', 'rental')),
  listing_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, listing_type, listing_id)
);

-- RLS
ALTER TABLE equipment_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own favorites"
ON equipment_favorites FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

### 6. Rating/Review System

**Why**: Build trust through seller/owner ratings.

```sql
CREATE TABLE equipment_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_type TEXT NOT NULL CHECK (listing_type IN ('marketplace', 'rental')),
  listing_id UUID NOT NULL,
  reviewer_id UUID NOT NULL REFERENCES profiles(id),
  reviewed_user_id UUID NOT NULL REFERENCES profiles(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- Prevent multiple reviews
  UNIQUE (listing_id, reviewer_id)
);

-- RLS
ALTER TABLE equipment_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are public"
ON equipment_reviews FOR SELECT
USING (true);

CREATE POLICY "Only buyers/renters can review"
ON equipment_reviews FOR INSERT
TO authenticated
WITH CHECK (
  reviewer_id = auth.uid()
  AND (
    -- For marketplace: must be the buyer
    EXISTS (
      SELECT 1 FROM equipment_marketplace
      WHERE id = listing_id AND buyer_id = reviewer_id
    )
    OR
    -- For rentals: must be/have been the renter
    EXISTS (
      SELECT 1 FROM equipment_rentals
      WHERE id = listing_id AND renter_id = reviewer_id
    )
  )
);
```

### 7. Price History Tracking

**Why**: Track price changes over time (useful for analytics).

```sql
CREATE TABLE equipment_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_type TEXT NOT NULL CHECK (listing_type IN ('marketplace', 'rental')),
  listing_id UUID NOT NULL,
  old_price NUMERIC,
  new_price NUMERIC NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger to log price changes
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.price IS DISTINCT FROM NEW.price) THEN
    INSERT INTO equipment_price_history (listing_type, listing_id, old_price, new_price)
    VALUES ('marketplace', NEW.id, OLD.price, NEW.price);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER marketplace_price_change
AFTER UPDATE ON equipment_marketplace
FOR EACH ROW
EXECUTE FUNCTION log_price_change();
```

---

## Summary

This migration provides:
- ✅ Secure, production-ready tables for equipment trading
- ✅ Comprehensive RLS policies following least-privilege principle
- ✅ Admin oversight capabilities
- ✅ Privacy protection for transactions
- ✅ Integration with existing system (profiles, roles, storage)
- ✅ Real-time update capabilities
- ✅ Automatic timestamp management

The migration is ready to insert into MigrateUnite.sql and can be extended with the recommended enhancements as your application grows.

For questions or issues, refer to:
- Supabase RLS documentation: https://supabase.com/docs/guides/auth/row-level-security
- PostgreSQL CHECK constraints: https://www.postgresql.org/docs/current/ddl-constraints.html
- Foreign keys: https://www.postgresql.org/docs/current/tutorial-fk.html
