export interface PlasticCategory {
  id: number;
  name: string;
}

export interface WeighingSession {
  id: string;
  transaction_date: string;
  pic_name: string;
  owner_name: string;
  gabungan?: string;
  selected_category_ids: number[];
  start_time?: string;
  end_time?: string;
  created_at?: string;
}

export interface WeighingItem {
  id: string;
  session_id: string;
  category_id: number;
  sequence_number: number;
  weight_kg: number;
  satuan?: 'SAK' | 'PRESS' | 'BAL' | '';
  category?: PlasticCategory;
}

export interface SessionSummary {
  id: string;
  transaction_date: string;
  pic_name: string;
  owner_name: string;
  gabungan?: string;
  total_items: number;
  total_weight: number;
  items: WeighingItem[];
  start_time?: string;
  end_time?: string;
}

export interface WeeklyDashboard {
  category_name: string;
  total_weight: number;
  percentage?: number;
}

export interface SessionFormData {
  transaction_date: string;
  pic_name: string;
  owner_name: string;
  gabungan?: string;
  selected_categories: number[];
  items: Array<{
    category_id: number;
    weight_kg: number;
    satuan?: 'SAK' | 'PRESS' | 'BAL' | '';
  }>;
}