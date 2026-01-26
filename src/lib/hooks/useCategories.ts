import useSWR from 'swr';
import { getPlasticCategories } from '@/lib/supabase/database';

/**
 * Custom hook for fetching and caching plastic categories
 * Categories rarely change, so cache for 1 hour
 */
export function useCategories() {
    return useSWR('categories', getPlasticCategories, {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 3600000, // 1 hour - categories rarely change
        revalidateIfStale: false,
    });
}
