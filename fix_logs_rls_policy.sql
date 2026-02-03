-- ============================================
-- Migration: Fix RLS Policy for logs_aktivitas
-- Purpose: Allow authenticated users to insert deletion logs
-- Date: 2026-02-03
-- Issue: 401 error - client can't insert logs
-- ============================================

-- 1. Drop the old restrictive policy
DROP POLICY IF EXISTS "Service role can insert deletion logs" ON logs_aktivitas;

-- 2. Create new policy allowing authenticated users to insert
CREATE POLICY "Allow authenticated users to insert deletion logs"
ON logs_aktivitas
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Verify policies
-- Run this query to check:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename = 'logs_aktivitas';

-- Expected policies after this migration:
-- 1. "Allow all authenticated users to read deletion logs" (SELECT, authenticated)
-- 2. "Allow authenticated users to insert deletion logs" (INSERT, authenticated)
