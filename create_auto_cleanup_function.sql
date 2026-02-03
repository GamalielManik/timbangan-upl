-- ============================================
-- Migration: Auto-Cleanup Function for Deletion Logs
-- Purpose: Automatically delete logs older than 7 days
-- Date: 2026-02-03
-- ============================================

-- 1. Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_deletion_logs()
RETURNS TABLE(deleted_count INTEGER, oldest_remaining_log TIMESTAMPTZ) 
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges to bypass RLS
AS $$
DECLARE
  v_deleted_count INTEGER;
  v_oldest_log TIMESTAMPTZ;
BEGIN
  -- Delete logs older than 7 days
  DELETE FROM logs_aktivitas
  WHERE deleted_at < NOW() - INTERVAL '7 days';
  
  -- Get count of deleted rows
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Get oldest remaining log timestamp (for verification)
  SELECT MIN(deleted_at) INTO v_oldest_log
  FROM logs_aktivitas;
  
  -- Return results
  RETURN QUERY SELECT v_deleted_count, v_oldest_log;
END;
$$;

-- 2. Add comment for documentation
COMMENT ON FUNCTION cleanup_old_deletion_logs() IS 
'Deletes deletion logs older than 7 days. Returns count of deleted logs and timestamp of oldest remaining log. Should be run daily via cron job.';

-- 3. Test the function (optional - will return 0 if no old logs)
-- SELECT * FROM cleanup_old_deletion_logs();

-- ============================================
-- CRON JOB SETUP (Execute if pg_cron is available)
-- ============================================
-- Note: pg_cron may not be available on all Supabase plans
-- If not available, we'll implement client-side trigger instead

-- Check if pg_cron extension is available:
-- SELECT * FROM pg_available_extensions WHERE name = 'pg_cron';

-- If available, enable it:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cleanup at 2 AM Jakarta time (UTC+7 = 19:00 UTC)
-- SELECT cron.schedule(
--   'cleanup-old-deletion-logs',     -- job name
--   '0 19 * * *',                     -- cron schedule: daily at 19:00 UTC (2 AM Jakarta)
--   $$SELECT cleanup_old_deletion_logs();$$
-- );

-- To check scheduled jobs:
-- SELECT * FROM cron.job WHERE jobname = 'cleanup-old-deletion-logs';

-- To unschedule (if needed):
-- SELECT cron.unschedule('cleanup-old-deletion-logs');

-- ============================================
-- ALTERNATIVE: Trigger-based cleanup
-- ============================================
-- If pg_cron is not available, create a trigger that runs cleanup
-- whenever a new log is inserted (lightweight check)

CREATE OR REPLACE FUNCTION trigger_cleanup_old_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only run cleanup 1% of the time to avoid overhead
  -- This means cleanup runs ~once per 100 deletions
  IF random() < 0.01 THEN
    PERFORM cleanup_old_deletion_logs();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_cleanup_logs_trigger
AFTER INSERT ON logs_aktivitas
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_cleanup_old_logs();

COMMENT ON TRIGGER auto_cleanup_logs_trigger ON logs_aktivitas IS 
'Trigger-based cleanup as fallback if pg_cron is not available. Runs cleanup with 1% probability on each insert.';
