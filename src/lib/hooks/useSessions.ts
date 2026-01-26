import useSWR from 'swr';
import { getSessionSummaries } from '@/lib/supabase/database';
import type { SessionSummary } from '@/types';

type SessionFilters = Parameters<typeof getSessionSummaries>[0];

/**
 * Custom hook for fetching and caching weighing sessions
 * Supports filtering and auto-revalidates on window focus
 */
export function useSessions(filters?: SessionFilters) {
    // Create a stable cache key based on filters
    const key = filters
        ? ['sessions', JSON.stringify(filters)]
        : 'sessions';

    return useSWR<SessionSummary[]>(
        key,
        () => getSessionSummaries(filters),
        {
            revalidateOnFocus: true, // Refresh when user returns to tab
            revalidateOnReconnect: true,
            dedupingInterval: 5000, // 5 seconds - prevent duplicate requests
        }
    );
}
