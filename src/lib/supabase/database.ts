import { supabase } from './client';
import { PlasticCategory, WeighingSession, WeighingItem, SessionSummary, WeeklyDashboard } from '@/types';
import { MonthlyDashboard, MonthlyCategoryBreakdown, MonthlySessionDetail, AvailableMonth, ClosingPeriod } from '@/types/monthly';

export const getPlasticCategories = async (): Promise<PlasticCategory[]> => {
  const { data, error } = await supabase
    .from('plastic_categories')
    .select('id, name')
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
    // Fetch sessions with database-side filtering for better performance
    let query = supabase
      .from('weighing_sessions')
      .select('id, transaction_date, pic_name, owner_name, start_time, end_time')
      .order('transaction_date', { ascending: false });

    // Apply filters at database level
    if (filters?.startDate) {
      query = query.gte('transaction_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('transaction_date', filters.endDate);
    }
    if (filters?.picName) {
      query = query.ilike('pic_name', `%${filters.picName}%`);
    }
    if (filters?.ownerName) {
      query = query.ilike('owner_name', `%${filters.ownerName}%`);
    }

    const { data: sessions, error: sessionsError } = await query;

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      throw sessionsError;
    }

    if (!sessions || sessions.length === 0) {
      return [];
    }

    // Filter out sessions with invalid IDs
    const filteredSessions = sessions.filter(session => session.id && session.id.trim() !== '');

    // Get items for each session to calculate totals
    const sessionSummaries: SessionSummary[] = [];

    for (const session of filteredSessions) {
      const { data: items, error: itemsError } = await supabase
        .from('weighing_items')
        .select(`
          id,
          session_id,
          category_id,
          sequence_number,
          weight_kg,
          satuan,
          gabungan,
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
      const processedItems: WeighingItem[] = items?.map(item => ({
        id: item.id,
        session_id: item.session_id,
        category_id: item.category_id,
        sequence_number: item.sequence_number,
        weight_kg: item.weight_kg,
        satuan: item.satuan,
        gabungan: item.gabungan,
        category: item.plastic_categories as unknown as PlasticCategory
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
    .select('id, transaction_date, pic_name, owner_name, start_time, end_time')
    .eq('id', sessionId)
    .single();

  if (sessionError) {
    console.error('Error fetching session:', sessionError);
    return null;
  }

  const { data: items, error: itemsError } = await supabase
    .from('weighing_items')
    .select(`
      id,
      session_id,
      category_id,
      sequence_number,
      weight_kg,
      satuan,
      gabungan,
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
      id: item.id,
      session_id: item.session_id,
      category_id: item.category_id,
      sequence_number: item.sequence_number,
      weight_kg: item.weight_kg,
      satuan: item.satuan,
      gabungan: item.gabungan,
      category: item.plastic_categories as unknown as PlasticCategory
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

export const deleteWeighingSession = async (
  sessionId: string,
  userAgent?: string
): Promise<void> => {
  try {
    // Step 1: Fetch session data BEFORE deletion
    const { data: session, error: sessionError } = await supabase
      .from('weighing_sessions')
      .select('nama_penimbang, pemilik_barang')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      console.error('Error fetching session for logging:', sessionError);
      throw sessionError;
    }

    if (!session) {
      throw new Error('Session not found');
    }

    // Step 2: Calculate total weight from items
    const { data: items, error: itemsError } = await supabase
      .from('weighing_items')
      .select('weight_kg')
      .eq('session_id', sessionId);

    if (itemsError) {
      console.error('Error fetching items for total weight:', itemsError);
      throw itemsError;
    }

    const totalBerat = items?.reduce((sum, item) => sum + item.weight_kg, 0) || 0;

    // Step 3: Insert deletion log BEFORE deleting
    const { error: logError } = await supabase
      .from('logs_aktivitas')
      .insert({
        deleted_session_id: sessionId,
        nama_penimbang: session.nama_penimbang,
        pemilik_barang: session.pemilik_barang,
        total_berat_kg: totalBerat,
        user_agent: userAgent || null,
      });

    if (logError) {
      console.error('Error inserting deletion log:', logError);
      // Continue with deletion even if logging fails (non-critical)
      console.warn('Proceeding with deletion despite logging error');
    }

    // Step 4: Delete session (cascade will delete items automatically due to FK constraint)
    const { error: deleteError } = await supabase
      .from('weighing_sessions')
      .delete()
      .eq('id', sessionId);

    if (deleteError) {
      console.error('Error deleting session:', deleteError);
      throw deleteError;
    }

    console.log(`[Deletion Log] Session ${sessionId} deleted and logged successfully`);
  } catch (error) {
    console.error('Error in deleteWeighingSession:', error);
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
// CLOSING PERIODS FUNCTIONS (v2.5 - Dynamic Periods)
// ============================================================================

/**
 * Get all closing periods or filter by active status
 */
export const getClosingPeriods = async (includeInactive: boolean = false): Promise<ClosingPeriod[]> => {
  try {
    let query = supabase
      .from('closing_periods')
      .select('id, period_name, start_date, end_date, is_active, created_at')
      .order('start_date', { ascending: false });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching closing periods:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getClosingPeriods:', error);
    return [];
  }
};

/**
 * Create a new closing period
 */
export const createClosingPeriod = async (
  periodName: string,
  startDate: string,
  endDate: string
): Promise<ClosingPeriod | null> => {
  try {
    const { data, error } = await supabase
      .from('closing_periods')
      .insert({
        period_name: periodName.trim(),
        start_date: startDate,
        end_date: endDate,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating closing period:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createClosingPeriod:', error);
    throw error;
  }
};

/**
 * Update an existing closing period
 */
export const updateClosingPeriod = async (
  periodId: number,
  updates: {
    period_name?: string;
    start_date?: string;
    end_date?: string;
    is_active?: boolean;
  }
): Promise<ClosingPeriod | null> => {
  try {
    const { data, error } = await supabase
      .from('closing_periods')
      .update(updates)
      .eq('id', periodId)
      .select()
      .single();

    if (error) {
      console.error('Error updating closing period:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateClosingPeriod:', error);
    throw error;
  }
};

/**
 * Delete (soft delete) a closing period
 */
export const deleteClosingPeriod = async (periodId: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('closing_periods')
      .update({ is_active: false })
      .eq('id', periodId);

    if (error) {
      console.error('Error deleting closing period:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteClosingPeriod:', error);
    return false;
  }
};

// ============================================================================
// MONTHLY SUMMARY FUNCTIONS (v2.0)
// ============================================================================

/**
 * Get available closing periods with session counts
 */
export const getAvailableMonths = async (): Promise<AvailableMonth[]> => {
  try {
    // Get all active closing periods
    const { data: periods, error: periodsError } = await supabase
      .from('closing_periods')
      .select('id, period_name, start_date, end_date, is_active')
      .eq('is_active', true)
      .order('start_date', { ascending: false });

    if (periodsError) {
      console.error('Error fetching closing periods:', periodsError);
      return [];
    }

    if (!periods || periods.length === 0) {
      return [];
    }

    // For each period, count sessions within the date range
    const availableMonths: AvailableMonth[] = await Promise.all(
      periods.map(async (period) => {
        const { data: sessions, error } = await supabase
          .from('weighing_sessions')
          .select('id')
          .gte('transaction_date', period.start_date)
          .lte('transaction_date', period.end_date);

        const sessionCount = sessions?.length || 0;

        return {
          period_id: period.id,
          period_name: period.period_name,
          start_date: period.start_date,
          end_date: period.end_date,
          session_count: sessionCount,
          is_active: period.is_active
        };
      })
    );

    return availableMonths;
  } catch (error) {
    console.error('Error in getAvailableMonths:', error);
    return [];
  }
};

/**
 * Get monthly dashboard summary for a specific closing period
 */
export const getMonthlyDashboard = async (periodId: number): Promise<MonthlyDashboard | null> => {
  try {
    // Get the closing period details
    const { data: period, error: periodError } = await supabase
      .from('closing_periods')
      .select('id, period_name, start_date, end_date')
      .eq('id', periodId)
      .single();

    if (periodError || !period) {
      console.error('Error fetching closing period:', periodError);
      return null;
    }

    // Get all sessions in this period
    const { data: sessions, error: sessionsError } = await supabase
      .from('weighing_sessions')
      .select('id, transaction_date')
      .gte('transaction_date', period.start_date)
      .lte('transaction_date', period.end_date);

    if (sessionsError) {
      console.error('Error fetching period sessions:', sessionsError);
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
      console.error('Error fetching period items:', itemsError);
      return null;
    }

    const totalWeight = items?.reduce((sum, item) => sum + (item.weight_kg || 0), 0) || 0;
    const totalItems = items?.length || 0;

    return {
      period_id: period.id,
      period_name: period.period_name,
      start_date: period.start_date,
      end_date: period.end_date,
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
 * Get category breakdown for a specific closing period (for pie chart)
 */
export const getMonthlyCategoryBreakdown = async (
  periodId: number
): Promise<MonthlyCategoryBreakdown[]> => {
  try {
    // Get the closing period details
    const { data: period, error: periodError } = await supabase
      .from('closing_periods')
      .select('*')
      .eq('id', periodId)
      .single();

    if (periodError || !period) {
      return [];
    }

    // Get all sessions in this period
    const { data: sessions, error: sessionsError } = await supabase
      .from('weighing_sessions')
      .select('id')
      .gte('transaction_date', period.start_date)
      .lte('transaction_date', period.end_date);

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
 * Get detailed session list for a specific closing period
 */
export const getMonthlySessions = async (
  periodId: number
): Promise<MonthlySessionDetail[]> => {
  try {
    // Get the closing period details
    const { data: period, error: periodError } = await supabase
      .from('closing_periods')
      .select('*')
      .eq('id', periodId)
      .single();

    if (periodError || !period) {
      return [];
    }

    const { data: sessions, error: sessionsError } = await supabase
      .from('weighing_sessions')
      .select(`
        id,
        transaction_date,
        pic_name,
        owner_name
      `)
      .gte('transaction_date', period.start_date)
      .lte('transaction_date', period.end_date)
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