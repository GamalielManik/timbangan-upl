# Database Migration Instructions: Deletion Logs Feature

## Overview
This migration adds deletion logging functionality with automatic 7-day retention.

## Prerequisites
- Supabase project access
- SQL Editor access in Supabase Dashboard

## Migration Files
1. `create_deletion_logs_table.sql` - Creates table and RLS policies
2. `create_auto_cleanup_function.sql` - Creates cleanup function and triggers

## Step-by-Step Instructions

### Step 1: Create Logs Table
1. Open Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy contents of `create_deletion_logs_table.sql`
4. Paste and click **Run**
5. Verify success: `Success. No rows returned`

### Step 2: Create Cleanup Function
1. Still in SQL Editor
2. Copy contents of `create_auto_cleanup_function.sql`
3. Paste and click **Run**
4. Verify success: `Success. No rows returned`

### Step 3: Verify Table Creation
Run this query in SQL Editor:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'logs_aktivitas'
ORDER BY ordinal_position;
```

Expected output:
- id (uuid)
- deleted_session_id (uuid)
- nama_penimbang (text)
- pemilik_barang (text)
- total_berat_kg (numeric)
- deleted_at (timestamp with time zone)
- user_agent (text)

### Step 4: Test Cleanup Function
Run manual test:
```sql
SELECT * FROM cleanup_old_deletion_logs();
```

Expected output: `deleted_count: 0, oldest_remaining_log: NULL`

### Step 5: Verify RLS Policies
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'logs_aktivitas';
```

Expected: 2 policies
- "Allow all authenticated users to read deletion logs" (SELECT)
- "Service role can insert deletion logs" (INSERT)

### Step 6: Verify Trigger
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'logs_aktivitas';
```

Expected: `auto_cleanup_logs_trigger` on INSERT

## Testing

### Test 1: Insert Sample Log (Manual)
⚠️ **Note**: Normal users cannot insert directly due to RLS. Use service role or anon key for testing.

```sql
-- Use SQL Editor (has elevated permissions)
INSERT INTO logs_aktivitas (
  deleted_session_id, 
  nama_penimbang, 
  pemilik_barang, 
  total_berat_kg,
  user_agent
) VALUES (
  gen_random_uuid(),
  'Test User',
  'Test Company',
  150.50,
  'Mozilla/5.0 Test Browser'
);
```

### Test 2: Verify Read Access
```sql
SELECT * FROM logs_aktivitas ORDER BY deleted_at DESC;
```

### Test 3: Test Auto-Cleanup with Old Data
```sql
-- Insert log with old timestamp (8 days ago)
INSERT INTO logs_aktivitas (
  deleted_session_id,
  nama_penimbang,
  pemilik_barang,
  total_berat_kg,
  deleted_at
) VALUES (
  gen_random_uuid(),
  'Old Test',
  'Old Company',
  100.00,
  NOW() - INTERVAL '8 days'
);

-- Run cleanup
SELECT * FROM cleanup_old_deletion_logs();

-- Verify old log is deleted
SELECT COUNT(*) FROM logs_aktivitas WHERE deleted_at < NOW() - INTERVAL '7 days';
-- Expected: 0
```

## Rollback (If Needed)

If you need to undo this migration:

```sql
-- Drop trigger
DROP TRIGGER IF EXISTS auto_cleanup_logs_trigger ON logs_aktivitas;

-- Drop functions
DROP FUNCTION IF EXISTS trigger_cleanup_old_logs();
DROP FUNCTION IF EXISTS cleanup_old_deletion_logs();

-- Drop table (cascades to indexes and policies)
DROP TABLE IF EXISTS logs_aktivitas CASCADE;
```

## Notes

- **pg_cron**: The SQL includes cron setup (commented out). Most Supabase plans don't have pg_cron enabled by default. The trigger-based approach (1% probability on each insert) provides a lightweight alternative.

- **Performance**: The trigger runs with 1% probability to avoid overhead. At 100 deletions/day, cleanup runs ~once daily. At lower volumes, cleanup may be less frequent, which is acceptable given the 7-day retention window.

- **Security**: The cleanup function uses `SECURITY DEFINER` to bypass RLS policies for deletion. This is safe since the function only deletes old logs, not user data.

## Troubleshooting

### Error: "permission denied for table logs_aktivitas"
→ Make sure you're running queries in SQL Editor with proper permissions

### Error: "function cleanup_old_deletion_logs() does not exist"
→ Re-run `create_auto_cleanup_function.sql`

### No logs appearing after deletion
→ Check that backend code is properly inserting logs (Phase 2 implementation)

### Old logs not being cleaned up
→ Run `SELECT * FROM cleanup_old_deletion_logs();` manually to verify function works

## Success Criteria

✅ Table `logs_aktivitas` exists with 7 columns  
✅ 2 RLS policies active (SELECT for authenticated, INSERT for service_role)  
✅ Function `cleanup_old_deletion_logs()` exists  
✅ Trigger `auto_cleanup_logs_trigger` exists  
✅ Can insert test logs via SQL Editor  
✅ Can query logs (SELECT)  
✅ Cleanup function deletes logs > 7 days old  

Once all criteria are met, proceed to **Phase 2: Backend Implementation**.
