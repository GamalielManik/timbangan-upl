-- ============================================
-- COMPREHENSIVE RLS FIX for logs_aktivitas
-- Error: "new row violates row-level security policy"
-- ============================================

-- STEP 1: Temporarily DISABLE RLS to clean up
ALTER TABLE logs_aktivitas DISABLE ROW LEVEL SECURITY;

-- STEP 2: Drop ALL existing policies (ensure clean slate)
DROP POLICY IF EXISTS "Allow all authenticated users to read deletion logs" ON logs_aktivitas;
DROP POLICY IF EXISTS "Service role can insert deletion logs" ON logs_aktivitas;
DROP POLICY IF EXISTS "Allow authenticated users to insert deletion logs" ON logs_aktivitas;
DROP POLICY IF EXISTS "authenticated_users_can_read_logs" ON logs_aktivitas;
DROP POLICY IF EXISTS "authenticated_users_can_insert_logs" ON logs_aktivitas;

-- STEP 3: Re-enable RLS
ALTER TABLE logs_aktivitas ENABLE ROW LEVEL SECURITY;

-- STEP 4: Create PERMISSIVE SELECT policy (allow all authenticated users to read)
CREATE POLICY "select_logs_policy"
ON logs_aktivitas
FOR SELECT
TO authenticated
USING (true);

-- STEP 5: Create PERMISSIVE INSERT policy (allow all authenticated users to insert)
CREATE POLICY "insert_logs_policy"
ON logs_aktivitas
FOR INSERT
TO authenticated
WITH CHECK (true);

-- STEP 6: Grant explicit permissions to authenticated role
GRANT SELECT, INSERT ON logs_aktivitas TO authenticated;

-- STEP 7: Verify policies are created
SELECT 
    schemaname,
    tablename,
    policyname, 
    permissive,
    roles,
    cmd as operation,
    qual as using_expression,
    with_check
FROM pg_policies
WHERE tablename = 'logs_aktivitas'
ORDER BY cmd;

-- STEP 8: Verify RLS is enabled
SELECT 
    schemaname,
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'logs_aktivitas';

-- Expected Output for STEP 7:
-- public | logs_aktivitas | select_logs_policy | PERMISSIVE | {authenticated} | SELECT | true     | NULL
-- public | logs_aktivitas | insert_logs_policy | PERMISSIVE | {authenticated} | INSERT | NULL     | true

-- Expected Output for STEP 8:
-- public | logs_aktivitas | true

-- ============================================
-- TEST INSERT (Optional - for verification)
-- ============================================
-- Uncomment to test if authenticated user can insert:
/*
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
    100.50,
    'Test Browser'
);

-- If successful, delete test data:
DELETE FROM logs_aktivitas WHERE nama_penimbang = 'Test User';
*/
