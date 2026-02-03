-- ============================================
-- QUICK FIX: Temporarily Disable RLS for Testing
-- This will help us confirm if RLS is the blocker
-- ============================================

-- Option 1: DISABLE RLS (for testing only)
ALTER TABLE logs_aktivitas DISABLE ROW LEVEL SECURITY;

-- After you test and confirm it works, you can:
-- 1. Keep it disabled (less secure but simpler)
-- 2. Or re-enable and use service_role key in backend
-- 3. Or implement proper authentication flow

-- To re-enable later:
-- ALTER TABLE logs_aktivitas ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Verify RLS is disabled
-- ============================================
SELECT 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'logs_aktivitas';

-- Expected: rls_enabled = false
