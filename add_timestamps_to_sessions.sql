-- Migration: Add time tracking columns to weighing_sessions
-- Version: 2.0
-- Date: 2026-01-20
-- Purpose: Track start and end time of weighing sessions

-- Add timestamp columns (nullable for backward compatibility)
ALTER TABLE weighing_sessions
ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for faster date-based queries (monthly summaries)
CREATE INDEX IF NOT EXISTS idx_weighing_sessions_transaction_date 
ON weighing_sessions(transaction_date);

-- Add comments for documentation
COMMENT ON COLUMN weighing_sessions.start_time IS 'Waktu mulai penimbangan (saat user mulai input berat pertama di Step 2)';
COMMENT ON COLUMN weighing_sessions.end_time IS 'Waktu selesai penimbangan (saat user klik Simpan Data)';

-- Verification query
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'weighing_sessions' 
-- ORDER BY ordinal_position;
