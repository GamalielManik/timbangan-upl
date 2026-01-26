import useSWR from 'swr';
import { getClosingPeriods } from '@/lib/supabase/database';
import type { ClosingPeriod } from '@/types/monthly';

/**
 * Custom hook for fetching and caching closing periods
 * Supports active-only filtering
 */
export function useClosingPeriods(includeInactive: boolean = false) {
    const key = includeInactive ? 'periods-all' : 'periods-active';

    return useSWR<ClosingPeriod[]>(
        key,
        () => getClosingPeriods(includeInactive),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 10000, // 10 seconds
        }
    );
}
