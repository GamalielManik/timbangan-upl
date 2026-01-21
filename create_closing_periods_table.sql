-- ============================================================================
-- CLOSING PERIODS TABLE
-- ============================================================================
-- Table untuk menyimpan periode tutup buku yang tentatif
-- Digunakan untuk kalkulasi stok bulanan dengan rentang tanggal custom

CREATE TABLE IF NOT EXISTS closing_periods (
    id BIGSERIAL PRIMARY KEY,
    period_name TEXT NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_date_range CHECK (end_date >= start_date),
    CONSTRAINT check_period_name_not_empty CHECK (LENGTH(TRIM(period_name)) > 0)
);

-- Index untuk performa query
CREATE INDEX IF NOT EXISTS idx_closing_periods_active ON closing_periods(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_closing_periods_dates ON closing_periods(start_date, end_date);

-- Function untuk auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_closing_periods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger untuk auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_closing_periods_updated_at ON closing_periods;
CREATE TRIGGER trigger_update_closing_periods_updated_at
    BEFORE UPDATE ON closing_periods
    FOR EACH ROW
    EXECUTE FUNCTION update_closing_periods_updated_at();

-- ============================================================================
-- SAMPLE DATA (untuk testing)
-- ============================================================================
-- Uncomment untuk insert sample data

-- INSERT INTO closing_periods (period_name, start_date, end_date) VALUES
-- ('Desember 2025', '2025-11-27', '2025-12-28'),
-- ('Januari 2026', '2025-12-29', '2026-01-31'),
-- ('November 2025', '2025-10-28', '2025-11-26');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Query untuk verify table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'closing_periods'
-- ORDER BY ordinal_position;

-- Query untuk test constraints
-- INSERT INTO closing_periods (period_name, start_date, end_date) 
-- VALUES ('Test Invalid', '2026-02-01', '2026-01-01'); -- Should fail: end_date < start_date
