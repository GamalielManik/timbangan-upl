import { supabase } from './client';

// Types for deletion log
export interface DeletionLog {
    id: string;
    deleted_session_id: string;
    nama_penimbang: string;
    pemilik_barang: string;
    total_berat_kg: number;
    deleted_at: string;
    user_agent: string | null;
}

/**
 * Fetch all deletion logs ordered by deleted_at descending (newest first)
 * All authenticated users can read logs per RLS policy
 */
export const getActivityLogs = async (): Promise<DeletionLog[]> => {
    const { data, error } = await supabase
        .from('logs_aktivitas')
        .select('*')
        .order('deleted_at', { ascending: false });

    if (error) {
        console.error('Error fetching activity logs:', error);
        throw error;
    }

    return data || [];
};

/**
 * Manual cleanup trigger (for testing or admin use)
 * Calls the database function to delete logs older than 7 days
 */
export const cleanupOldLogs = async (): Promise<{ deleted_count: number; oldest_remaining_log: string | null }> => {
    const { data, error } = await supabase
        .rpc('cleanup_old_deletion_logs');

    if (error) {
        console.error('Error cleaning up old logs:', error);
        throw error;
    }

    return data as { deleted_count: number; oldest_remaining_log: string | null };
};
