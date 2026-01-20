-- Rollback Script: Remove timestamp columns
-- Version: 2.0 → 1.0
-- Date: 2026-01-20
-- Purpose: Rollback to v1.0 if needed

-- WARNING: This will remove start_time and end_time data permanently
-- Make sure to backup data before running this script

-- Drop index first
DROP INDEX IF EXISTS idx_weighing_sessions_transaction_date;

-- Drop columns
ALTER TABLE weighing_sessions
DROP COLUMN IF EXISTS start_time,
DROP COLUMN IF EXISTS end_time;

-- Verification query
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'weighing_sessions' 
-- ORDER BY ordinal_position;
