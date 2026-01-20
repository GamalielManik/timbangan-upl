// Types for Monthly Summary Feature (v2.0)

export interface MonthlyDashboard {
    year: number;
    month: number; // 1-12
    month_name: string;
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
    year: number;
    month: number;
    session_count: number;
    formatted: string; // e.g., "Januari 2026"
}
