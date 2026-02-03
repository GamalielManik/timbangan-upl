-- ============================================
-- Migration: Create Deletion Logs Table
-- Purpose: Track deletion activities with 7-day retention
-- Date: 2026-02-03
-- ============================================

-- 1. Create logs_aktivitas table
CREATE TABLE logs_aktivitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Session info (captured before deletion)
  deleted_session_id UUID NOT NULL,
  nama_penimbang TEXT NOT NULL,
  pemilik_barang TEXT NOT NULL,
  total_berat_kg NUMERIC(10, 2) NOT NULL,
  
  -- Meta info
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent TEXT,
  
  -- Constraint for deleted_at to ensure valid timestamps
  CONSTRAINT valid_deleted_at CHECK (deleted_at <= NOW())
);

-- 2. Create index for efficient 7-day cleanup query
CREATE INDEX idx_logs_aktivitas_deleted_at ON logs_aktivitas(deleted_at DESC);

-- 3. Add comment for documentation
COMMENT ON TABLE logs_aktivitas IS 'Logs of deleted weighing sessions. Auto-cleaned after 7 days for database performance.';
COMMENT ON COLUMN logs_aktivitas.deleted_session_id IS 'UUID of the session that was deleted (session no longer exists in weighing_sessions)';
COMMENT ON COLUMN logs_aktivitas.total_berat_kg IS 'Sum of all item weights from the deleted session';
COMMENT ON COLUMN logs_aktivitas.user_agent IS 'Browser/device info of user who performed deletion';

-- 4. Enable Row Level Security (RLS)
ALTER TABLE logs_aktivitas ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policy: All authenticated users can read logs
CREATE POLICY "Allow all authenticated users to read deletion logs"
ON logs_aktivitas
FOR SELECT
TO authenticated
USING (true);

-- 6. RLS Policy: Only service role can insert logs
-- (This will be done via server-side function, not direct client insert)
CREATE POLICY "Service role can insert deletion logs"
ON logs_aktivitas
FOR INSERT
TO service_role
WITH CHECK (true);

-- Note: We don't allow UPDATE or DELETE via RLS
-- Only auto-cleanup function (with SECURITY DEFINER) can delete old logs
