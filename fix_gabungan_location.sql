-- ============================================================================
-- FIX: MOVE GABUNGAN FROM SESSIONS TO ITEMS
-- ============================================================================
-- Step 1: Remove gabungan from weighing_sessions (was incorrect)
ALTER TABLE weighing_sessions 
DROP COLUMN IF EXISTS gabungan;

-- Step 2: Add gabungan to weighing_items (correct location)
ALTER TABLE weighing_items 
ADD COLUMN IF NOT EXISTS gabungan TEXT;

-- Verify the changes
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'weighing_items' 
-- AND column_name = 'gabungan';
