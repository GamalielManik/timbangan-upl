-- Add satuan column to weighing_items table
-- This will store the unit type (SAK, PRESS, BAL) for each weighing item

ALTER TABLE weighing_items
ADD COLUMN satuan VARCHAR(10) DEFAULT NULL;

-- Add a check constraint to ensure only valid values are stored
ALTER TABLE weighing_items
ADD CONSTRAINT check_satuan_values
CHECK (satuan IS NULL OR satuan IN ('SAK', 'PRESS', 'BAL') OR satuan = '');

-- Add comment to describe the column
COMMENT ON COLUMN weighing_items.satuan IS 'Satuan/unit untuk item penimbangan (SAK, PRESS, BAL). Optional field.';