import { supabase } from './client';
import { PlasticCategory, WeighingSession, WeighingItem, SessionSummary, WeeklyDashboard } from '@/types';

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
        items: processedItems
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
    // Get current date and calculate week start (Monday) and end (Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Calculate start of current week (Monday)
    const startOfWeek = new Date(today);
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days; otherwise go back to Monday
    startOfWeek.setDate(today.getDate() - daysFromMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    // Calculate end of current week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Format dates for Supabase query
    const startDateStr = startOfWeek.toISOString().split('T')[0]; // YYYY-MM-DD
    const endDateStr = endOfWeek.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log('[Dashboard] Filtering between:', startDateStr, 'and', endDateStr);

    // Get all sessions from current week
    const { data: sessions, error: sessionsError } = await supabase
      .from('weighing_sessions')
      .select('id')
      .gte('transaction_date', startDateStr)
      .lte('transaction_date', endDateStr);

    if (sessionsError || !sessions || sessions.length === 0) {
      console.log('No sessions found for current week');
      return [];
    }

    // Get all items for these sessions with categories
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
      console.log('No items found for sessions');
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

export const getThisWeekTotal = async (): Promise<number> => {
  try {
    // Get current date and calculate week start (Monday) and end (Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Calculate start of current week (Monday)
    const startOfWeek = new Date(today);
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days; otherwise go back to Monday
    startOfWeek.setDate(today.getDate() - daysFromMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    // Calculate end of current week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Format dates for Supabase query
    const startDateStr = startOfWeek.toISOString().split('T')[0]; // YYYY-MM-DD
    const endDateStr = endOfWeek.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log('Filtering sessions between:', startDateStr, 'and', endDateStr);

    // Get all sessions from current week
    const { data: sessions, error: sessionsError } = await supabase
      .from('weighing_sessions')
      .select('id')
      .gte('transaction_date', startDateStr)
      .lte('transaction_date', endDateStr);

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      return 0;
    }

    if (!sessions || sessions.length === 0) {
      console.log('No sessions found in current week');
      return 0;
    }

    // Get all items for these sessions
    const sessionIds = sessions.map(s => s.id);
    const { data: items, error: itemsError } = await supabase
      .from('weighing_items')
      .select('weight_kg')
      .in('session_id', sessionIds);

    if (itemsError) {
      console.error('Error fetching items:', itemsError);
      return 0;
    }

    if (!items || items.length === 0) {
      console.log('No items found');
      return 0;
    }

    const totalWeight = items.reduce((sum, item) => sum + (item.weight_kg || 0), 0);
    console.log('Total weight calculated:', totalWeight, 'from', items.length, 'items');

    return totalWeight;
  } catch (error) {
    console.error('Error in getThisWeekTotal:', error);
    return 0;
  }
};

export const getThisWeekSessionCount = async (): Promise<number> => {
  try {
    // Get current date and calculate week start (Monday) and end (Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Calculate start of current week (Monday)
    const startOfWeek = new Date(today);
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days; otherwise go back to Monday
    startOfWeek.setDate(today.getDate() - daysFromMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    // Calculate end of current week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Format dates for Supabase query
    const startDateStr = startOfWeek.toISOString().split('T')[0]; // YYYY-MM-DD
    const endDateStr = endOfWeek.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log('[Session Count] Filtering between:', startDateStr, 'and', endDateStr);

    const { data, error } = await supabase
      .from('weighing_sessions')
      .select('id')
      .gte('transaction_date', startDateStr)
      .lte('transaction_date', endDateStr);

    if (error) {
      console.error('Error fetching this week sessions:', error);
      return 0;
    }

    console.log('Sessions found:', data?.length || 0);
    return data?.length || 0;
  } catch (error) {
    console.error('Error in getThisWeekSessionCount:', error);
    return 0;
  }
};