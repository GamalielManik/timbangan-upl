// Types for Monthly Summary Feature (v2.0)

// Closing Period - untuk periode tutup buku tentatif
export interface ClosingPeriod {
    id: number;
    period_name: string;      // e.g., "Desember 2025"
    start_date: string;        // ISO date string: "2025-11-27"
    end_date: string;          // ISO date string: "2025-12-28"
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface MonthlyDashboard {
    period_id: number;         // Reference to closing_period
    period_name: string;       // e.g., "Desember 2025"
    start_date: string;        // Period start date
    end_date: string;          // Period end date
    total_sessions: number;
    total_weight: number;
    total_items: number;
}

export interface MonthlyCategoryBreakdown {
    category_name: string;
    total_weight: number;
    percentage: number;
    item_count: number;
}

export interface MonthlySessionDetail {
    id: string;
    transaction_date: string;
    pic_name: string;
    owner_name: string;
    categories: string[]; // Array of category names in this session
    total_weight: number;
    item_count: number;
}

export interface AvailableMonth {
    period_id: number;         // ID from closing_periods
    period_name: string;       // e.g., "Desember 2025"
    start_date: string;
    end_date: string;
    session_count: number;
    is_active: boolean;
}
