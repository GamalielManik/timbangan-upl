import { supabase } from './client';
import { PlasticCategory, WeighingSession, WeighingItem, SessionSummary, WeeklyDashboard } from '@/types';
import { MonthlyDashboard, MonthlyCategoryBreakdown, MonthlySessionDetail, AvailableMonth } from '@/types/monthly';

export const getPlasticCategories = async (): Promise<PlasticCategory[]> => {
  const { data, error } = await supabase
    .from('plastic_categories')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching plastic categories:', error);
    throw error;
  }

  return data || [];
};

export const createWeighingSession = async (
  session: Omit<WeighingSession, 'id' | 'created_at'>
): Promise<WeighingSession> => {
  const { data, error } = await supabase
    .from('weighing_sessions')
    .insert([session])
    .select()
    .single();

  if (error) {
    console.error('Error creating weighing session:', error);
    throw error;
  }

  return data;
};

export const createWeighingItems = async (
  items: Omit<WeighingItem, 'id'>[]
): Promise<WeighingItem[]> => {
  const { data, error } = await supabase
    .from('weighing_items')
    .insert(items)
    .select();

  if (error) {
    console.error('Error creating weighing items:', error);
    throw error;
  }

  return data || [];
};

export const getSessionSummaries = async (
  filters?: {
    startDate?: string;
    endDate?: string;
    picName?: string;
    ownerName?: string;
  }
): Promise<SessionSummary[]> => {
  try {
    // Fetch sessions and their items separately to calculate totals correctly
    const { data: sessions, error: sessionsError } = await supabase
      .from('weighing_sessions')
      .select('*')
      .order('transaction_date', { ascending: false });

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      throw sessionsError;
    }

    if (!sessions || sessions.length === 0) {
      return [];
    }

    // Apply filters
    let filteredSessions = sessions;
    if (filters?.startDate) {
      filteredSessions = filteredSessions.filter(s => s.transaction_date >= filters.startDate!);
    }
    if (filters?.endDate) {
      filteredSessions = filteredSessions.filter(s => s.transaction_date <= filters.endDate!);
    }
    if (filters?.picName) {
      filteredSessions = filteredSessions.filter(s =>
        s.pic_name?.toLowerCase().includes(filters.picName!.toLowerCase())
      );
    }
    if (filters?.ownerName) {
      filteredSessions = filteredSessions.filter(s =>
        s.owner_name?.toLowerCase().includes(filters.ownerName!.toLowerCase())
      );
    }

    // Filter out sessions with invalid IDs
    filteredSessions = filteredSessions.filter(session => session.id && session.id.trim() !== '');

    // Get items for each session to calculate totals
    const sessionSummaries: SessionSummary[] = [];

    for (const session of filteredSessions) {
      const { data: items, error: itemsError } = await supabase
        .from('weighing_items')
        .select(`
          *,
          plastic_categories (*)
        `)
        .eq('session_id', session.id);

      if (itemsError) {
        console.error('Error fetching items for session:', session.id, itemsError);
        continue;
      }

      const totalItems = items?.length || 0;
      const totalWeight = items?.reduce((sum, item) => sum + (item.weight_kg || 0), 0) || 0;

      // Process items to ensure category data is properly attached
      const processedItems = items?.map(item => ({
        ...item,
        category: item.plastic_categories
      })) || [];

      sessionSummaries.push({
        id: session.id,
        transaction_date: session.transaction_date || null,
        pic_name: session.pic_name || '',
        owner_name: session.owner_name || '',
        total_items: totalItems,
        total_weight: totalWeight,
        items: processedItems,
        start_time: session.start_time,
        end_time: session.end_time,
      });
    }

    return sessionSummaries;
  } catch (error) {
    console.error('Error in getSessionSummaries:', error);
    return [];
  }
};

export const getSessionWithItems = async (sessionId: string): Promise<SessionSummary | null> => {
  const { data: session, error: sessionError } = await supabase
    .from('weighing_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessionError) {
    console.error('Error fetching session:', sessionError);
    return null;
  }

  const { data: items, error: itemsError } = await supabase
    .from('weighing_items')
    .select(`
      *,
      plastic_categories (*)
    `)
    .eq('session_id', sessionId)
    .order('sequence_number');

  if (itemsError) {
    console.error('Error fetching items:', itemsError);
    return null;
  }

  const totalWeight = items?.reduce((sum, item) => sum + item.weight_kg, 0) || 0;

  return {
    ...session,
    total_items: items?.length || 0,
    total_weight: totalWeight,
    items: items?.map(item => ({
      ...item,
      category: item.plastic_categories
    })) || []
  };
};

export const updateWeighingSession = async (
  sessionId: string,
  updates: Partial<WeighingSession>
): Promise<WeighingSession> => {
  const { data, error } = await supabase
    .from('weighing_sessions')
    .update(updates)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating session:', error);
    throw error;
  }

  return data;
};

export const updateWeighingItem = async (
  itemId: string,
  updates: Partial<WeighingItem>
): Promise<WeighingItem> => {
  const { data, error } = await supabase
    .from('weighing_items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    console.error('Error updating item:', error);
    throw error;
  }

  return data;
};

export const deleteWeighingItem = async (itemId: string): Promise<void> => {
  const { error } = await supabase
    .from('weighing_items')
    .delete()
    .eq('id', itemId);

  if (error) {
    console.error('Error deleting item:', error);
    throw error;
  }
};

export const deleteWeighingSession = async (sessionId: string): Promise<void> => {
  const { error } = await supabase
    .from('weighing_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
};

export const getWeeklyDashboard = async (): Promise<WeeklyDashboard[]> => {
  try {
    // Get current week dates (Monday to Sunday)
    const { startOfWeek, endOfWeek } = getCurrentWeekDates();

    // Build the query with explicit date format
    const startDateStr = startOfWeek.toISOString().split('T')[0]; // YYYY-MM-DD
    const endDateStr = endOfWeek.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log('[Dashboard] Filtering sessions between:', startDateStr, 'and', endDateStr);

    // Get all weighing sessions from the current calendar week
    const { data: sessions, error: sessionsError } = await supabase
      .from('weighing_sessions')
      .select('id, transaction_date')
      .gte('transaction_date', startDateStr)
      .lte('transaction_date', endDateStr);

    if (sessionsError) {
      console.error('Error fetching this week sessions:', sessionsError);
      return [];
    }

    if (!sessions || sessions.length === 0) {
      return [];
    }

    // Get all items for these sessions with their categories
    const sessionIds = sessions.map(s => s.id);
    const { data: items, error: itemsError } = await supabase
      .from('weighing_items')
      .select(`
        weight_kg,
        plastic_categories (
          name
        )
      `)
      .in('session_id', sessionIds);

    if (itemsError) {
      console.error('Error fetching weekly dashboard:', itemsError);
      throw itemsError;
    }

    if (!items || items.length === 0) {
      return [];
    }

    // Group by category and sum weights
    const categoryWeights: { [key: string]: number } = {};

    items.forEach(item => {
      const categoryName = (item.plastic_categories as any)?.name || 'Tidak Diketahui';
      categoryWeights[categoryName] = (categoryWeights[categoryName] || 0) + (item.weight_kg || 0);
    });

    const totalWeight = Object.values(categoryWeights).reduce((sum, weight) => sum + weight, 0);

    // Convert to array format and calculate percentages
    const result = Object.entries(categoryWeights).map(([categoryName, weight]) => ({
      category_name: categoryName,
      total_weight: weight,
      percentage: totalWeight > 0 ? (weight / totalWeight) * 100 : 0
    }));

    // Sort by weight descending
    return result.sort((a, b) => b.total_weight - a.total_weight);
  } catch (error) {
    console.error('Error in getWeeklyDashboard:', error);
    return [];
  }
};

// Helper function to get current week dates based on calendar week (Monday-Sunday)
const getCurrentWeekDates = () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Calculate start of current week (Monday)
  const startOfWeek = new Date(today);
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days; otherwise go back to Monday
  startOfWeek.setDate(today.getDate() - daysFromMonday);
  // Set time to midnight for consistent filtering
  startOfWeek.setHours(0, 0, 0, 0);

  // Calculate end of current week (Sunday)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  // Set time to end of day for inclusive filtering
  endOfWeek.setHours(23, 59, 59, 999);

  // Debug logging with ISO format for precise debugging
  console.log('Today:', today.toISOString());
  console.log('Start of week (Monday):', startOfWeek.toISOString());
  console.log('End of week (Sunday):', endOfWeek.toISOString());
  console.log('Start date (local):', startOfWeek.toLocaleDateString('id-ID'));
  console.log('End date (local):', endOfWeek.toLocaleDateString('id-ID'));

  return { startOfWeek, endOfWeek };
};

export const getThisWeekTotal = async (): Promise<number> => {
  try {
    // Get current week dates (Monday to Sunday)
    const { startOfWeek, endOfWeek } = getCurrentWeekDates();

    // Build the query with explicit date format
    const startDateStr = startOfWeek.toISOString().split('T')[0]; // YYYY-MM-DD
    const endDateStr = endOfWeek.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log('Filtering sessions between:', startDateStr, 'and', endDateStr);

    // Get all weighing sessions from the current calendar week
    const { data: sessions, error: sessionsError } = await supabase
      .from('weighing_sessions')
      .select('id, transaction_date')
      .gte('transaction_date', startDateStr)
      .lte('transaction_date', endDateStr);

    if (sessionsError) {
      console.error('Error fetching this week sessions:', sessionsError);
      return 0;
    }

    if (!sessions || sessions.length === 0) {
      console.log('No sessions found in this week');
      return 0;
    }

    console.log('Sessions found in this week:', sessions.length);
    sessions?.forEach(s => {
      const sessionDate = new Date(s.transaction_date).toISOString().split('T')[0];
      console.log('Session ID:', s.id, 'Transaction Date:', sessionDate);
    });

    // Get all items for these sessions
    const sessionIds = sessions.map(s => s.id);
    const { data: items, error: itemsError } = await supabase
      .from('weighing_items')
      .select('weight_kg')
      .in('session_id', sessionIds);

    if (itemsError) {
      console.error('Error fetching this week items:', itemsError);
      return 0;
    }

    if (!items || items.length === 0) {
      console.log('No items found for sessions');
      return 0;
    }

    const totalWeight = items.reduce((sum, item) => sum + (item.weight_kg || 0), 0);
    console.log('Total weight calculated:', totalWeight, 'from', items.length, 'items');

    // Log each item weight for debugging
    items.forEach((item, index) => {
      console.log(`Item ${index + 1}: ${item.weight_kg} kg`);
    });

    return totalWeight;
  } catch (error) {
    console.error('Error in getThisWeekTotal:', error);
    return 0;
  }
};

export const getThisWeekSessionCount = async (): Promise<number> => {
  try {
    // Get current week dates (Monday to Sunday)
    const { startOfWeek, endOfWeek } = getCurrentWeekDates();

    // Get all weighing sessions from the current calendar week
    const { data, error } = await supabase
      .from('weighing_sessions')
      .select('id, transaction_date')
      .gte('transaction_date', startOfWeek.toISOString())
      .lte('transaction_date', endOfWeek.toISOString());

    if (error) {
      console.error('Error fetching this week sessions:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('Error in getThisWeekSessionCount:', error);
    return 0;
  }
};

export const addPlasticCategories = async (categoryNames: string[]): Promise<PlasticCategory[]> => {
  const newCategories = categoryNames.map(name => ({
    name: name.trim(),
    created_at: new Date().toISOString()
  }));

  const { data, error } = await supabase
    .from('plastic_categories')
    .insert(newCategories)
    .select();

  if (error) {
    console.error('Error adding plastic categories:', error);
    throw error;
  }

  return data || [];
};

// ============================================================================
// MONTHLY SUMMARY FUNCTIONS (v2.0)
// ============================================================================

/**
 * Get available months that have weighing data
 */
export const getAvailableMonths = async (): Promise<AvailableMonth[]> => {
  try {
    const { data: sessions, error } = await supabase
      .from('weighing_sessions')
      .select('transaction_date')
      .order('transaction_date', { ascending: false });

    if (error) {
      console.error('Error fetching available months:', error);
      return [];
    }

    if (!sessions || sessions.length === 0) {
      return [];
    }

    // Group by year and month
    const monthMap = new Map<string, { year: number; month: number; count: number }>();

    sessions.forEach(session => {
      if (!session.transaction_date) return;

      const date = new Date(session.transaction_date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // 1-12
      const key = `${year}-${month}`;

      if (monthMap.has(key)) {
        const existing = monthMap.get(key)!;
        monthMap.set(key, { ...existing, count: existing.count + 1 });
      } else {
        monthMap.set(key, { year, month, count: 1 });
      }
    });

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    return Array.from(monthMap.values()).map(({ year, month, count }) => ({
      year,
      month,
      session_count: count,
      formatted: `${monthNames[month - 1]} ${year}`
    }));
  } catch (error) {
    console.error('Error in getAvailableMonths:', error);
    return [];
  }
};

/**
 * Get monthly dashboard summary for a specific month
 */
export const getMonthlyDashboard = async (year: number, month: number): Promise<MonthlyDashboard | null> => {
  try {
    // Calculate start and end of month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get all sessions in this month
    const { data: sessions, error: sessionsError } = await supabase
      .from('weighing_sessions')
      .select('id, transaction_date')
      .gte('transaction_date', startDateStr)
      .lte('transaction_date', endDateStr);

    if (sessionsError) {
      console.error('Error fetching monthly sessions:', sessionsError);
      return null;
    }

    if (!sessions || sessions.length === 0) {
      return null;
    }

    // Get all items for these sessions
    const sessionIds = sessions.map(s => s.id);
    const { data: items, error: itemsError } = await supabase
      .from('weighing_items')
      .select('weight_kg')
      .in('session_id', sessionIds);

    if (itemsError) {
      console.error('Error fetching monthly items:', itemsError);
      return null;
    }

    const totalWeight = items?.reduce((sum, item) => sum + (item.weight_kg || 0), 0) || 0;
    const totalItems = items?.length || 0;

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    return {
      year,
      month,
      month_name: monthNames[month - 1],
      total_sessions: sessions.length,
      total_weight: totalWeight,
      total_items: totalItems
    };
  } catch (error) {
    console.error('Error in getMonthlyDashboard:', error);
    return null;
  }
};

/**
 * Get category breakdown for a specific month (for pie chart)
 */
export const getMonthlyCategoryBreakdown = async (
  year: number,
  month: number
): Promise<MonthlyCategoryBreakdown[]> => {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get all sessions in this month
    const { data: sessions, error: sessionsError } = await supabase
      .from('weighing_sessions')
      .select('id')
      .gte('transaction_date', startDateStr)
      .lte('transaction_date', endDateStr);

    if (sessionsError || !sessions || sessions.length === 0) {
      return [];
    }

    // Get items with category info
    const sessionIds = sessions.map(s => s.id);
    const { data: items, error: itemsError } = await supabase
      .from('weighing_items')
      .select(`
        weight_kg,
        plastic_categories (
          name
        )
      `)
      .in('session_id', sessionIds);

    if (itemsError || !items || items.length === 0) {
      return [];
    }

    // Group by category
    const categoryWeights: { [key: string]: { weight: number; count: number } } = {};

    items.forEach(item => {
      const categoryName = (item.plastic_categories as any)?.name || 'Tidak Diketahui';
      if (!categoryWeights[categoryName]) {
        categoryWeights[categoryName] = { weight: 0, count: 0 };
      }
      categoryWeights[categoryName].weight += item.weight_kg || 0;
      categoryWeights[categoryName].count += 1;
    });

    const totalWeight = Object.values(categoryWeights).reduce((sum, cat) => sum + cat.weight, 0);

    return Object.entries(categoryWeights)
      .map(([categoryName, { weight, count }]) => ({
        category_name: categoryName,
        total_weight: weight,
        percentage: totalWeight > 0 ? (weight / totalWeight) * 100 : 0,
        item_count: count
      }))
      .sort((a, b) => b.total_weight - a.total_weight);
  } catch (error) {
    console.error('Error in getMonthlyCategoryBreakdown:', error);
    return [];
  }
};

/**
 * Get detailed session list for a specific month
 */
export const getMonthlySessions = async (
  year: number,
  month: number
): Promise<MonthlySessionDetail[]> => {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const { data: sessions, error: sessionsError } = await supabase
      .from('weighing_sessions')
      .select('*')
      .gte('transaction_date', startDateStr)
      .lte('transaction_date', endDateStr)
      .order('transaction_date', { ascending: false });

    if (sessionsError || !sessions) {
      return [];
    }

    const result: MonthlySessionDetail[] = [];

    for (const session of sessions) {
      const { data: items, error: itemsError } = await supabase
        .from('weighing_items')
        .select(`
          weight_kg,
          plastic_categories (
            name
          )
        `)
        .eq('session_id', session.id);

      if (itemsError) continue;

      const totalWeight = items?.reduce((sum, item) => sum + (item.weight_kg || 0), 0) || 0;
      const categories = Array.from(
        new Set(items?.map(item => (item.plastic_categories as any)?.name).filter(Boolean))
      );

      result.push({
        id: session.id,
        transaction_date: session.transaction_date,
        pic_name: session.pic_name,
        owner_name: session.owner_name,
        categories: categories,
        total_weight: totalWeight,
        item_count: items?.length || 0
      });
    }

    return result;
  } catch (error) {
    console.error('Error in getMonthlySessions:', error);
    return [];
  }
};