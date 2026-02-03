-- ============================================
-- FINAL FIX: RLS Policy untuk logs_aktivitas
-- Execute SQL ini di Supabase SQL Editor
-- ============================================

-- STEP 1: Drop ALL existing policies untuk clean slate
DROP POLICY IF EXISTS "Allow all authenticated users to read deletion logs" ON logs_aktivitas;
DROP POLICY IF EXISTS "Service role can insert deletion logs" ON logs_aktivitas;
DROP POLICY IF EXISTS "Allow authenticated users to insert deletion logs" ON logs_aktivitas;

-- STEP 2: Create policy untuk SELECT (read)
CREATE POLICY "authenticated_users_can_read_logs"
ON logs_aktivitas
FOR SELECT
TO authenticated
USING (true);

-- STEP 3: Create policy untuk INSERT (write)
CREATE POLICY "authenticated_users_can_insert_logs"
ON logs_aktivitas
FOR INSERT
TO authenticated
WITH CHECK (true);

-- STEP 4: Verify policies created
SELECT 
    policyname, 
    cmd as operation,
    roles,
    permissive
FROM pg_policies
WHERE tablename = 'logs_aktivitas';

-- Expected output:
-- authenticated_users_can_read_logs   | SELECT | {authenticated} | PERMISSIVE
-- authenticated_users_can_insert_logs | INSERT | {authenticated} | PERMISSIVE
