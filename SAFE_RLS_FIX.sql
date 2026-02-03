-- ============================================
-- SAFE RLS FIX - No errors if policies exist
-- ============================================

-- STEP 1: Drop ALL existing policies completely (no errors if not exists)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow all authenticated users to read deletion logs" ON logs_aktivitas;
    DROP POLICY IF EXISTS "Service role can insert deletion logs" ON logs_aktivitas;
    DROP POLICY IF EXISTS "Allow authenticated users to insert deletion logs" ON logs_aktivitas;
    DROP POLICY IF EXISTS "authenticated_users_can_read_logs" ON logs_aktivitas;
    DROP POLICY IF EXISTS "authenticated_users_can_insert_logs" ON logs_aktivitas;
    DROP POLICY IF EXISTS "select_logs_policy" ON logs_aktivitas;
    DROP POLICY IF EXISTS "insert_logs_policy" ON logs_aktivitas;
END $$;

-- STEP 2: Ensure RLS is enabled
ALTER TABLE logs_aktivitas ENABLE ROW LEVEL SECURITY;

-- STEP 3: Create SELECT policy (fresh)
CREATE POLICY "select_logs_policy"
ON logs_aktivitas
FOR SELECT
TO authenticated
USING (true);

-- STEP 4: Create INSERT policy (fresh)
CREATE POLICY "insert_logs_policy"
ON logs_aktivitas
FOR INSERT
TO authenticated
WITH CHECK (true);

-- STEP 5: Grant explicit permissions
GRANT SELECT, INSERT ON logs_aktivitas TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- STEP 6: Verify setup
SELECT 
    policyname, 
    cmd as operation,
    roles
FROM pg_policies
WHERE tablename = 'logs_aktivitas'
ORDER BY cmd;

-- Expected output:
-- insert_logs_policy | INSERT | {authenticated}
-- select_logs_policy | SELECT | {authenticated}
