-- ============================================================================
-- ADD GABUNGAN FIELD TO WEIGHING SESSIONS
-- ============================================================================
-- Migration to add gabungan text field to weighing_sessions table
-- This is a non-breaking change - existing records will have NULL values

ALTER TABLE weighing_sessions 
ADD COLUMN IF NOT EXISTS gabungan TEXT;

-- Verify the column was added
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'weighing_sessions' 
-- AND column_name = 'gabungan';
