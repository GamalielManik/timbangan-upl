-- ============================================
-- DIAGNOSTIC: Check RLS and Permissions
-- Run this to understand WHY 401 is happening
-- ============================================

-- 1. Check if RLS is enabled
SELECT 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'logs_aktivitas';

-- 2. Check ALL policies
SELECT 
    schemaname,
    tablename,
    policyname, 
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'logs_aktivitas';

-- 3. Check table permissions
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'logs_aktivitas';

-- 4. Check if authenticated role exists
SELECT rolname FROM pg_roles WHERE rolname = 'authenticated';

-- ============================================
-- TEMPORARY TEST: Disable RLS completely
-- (to confirm RLS is the issue)
-- ============================================
-- Uncomment ONLY for testing:
-- ALTER TABLE logs_aktivitas DISABLE ROW LEVEL SECURITY;

-- Then try to delete a session and check if it works
-- If it works, the problem is definitely RLS policy

-- Re-enable after test:
-- ALTER TABLE logs_aktivitas ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ALTERNATIVE: Use service_role bypass
-- If policies truly don't work, we can use service_role
-- ============================================
-- This would require backend changes to use service key
-- But let's try the diagnostic first
