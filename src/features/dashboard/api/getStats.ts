import { getSupabaseClient } from '@/lib/supabase/client';

export type DashboardStats = {
  total: number;
  today: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const [{ count: total }, { count: today }] = await Promise.all([
    getSupabaseClient().from('robot_cards').select('*', { count: 'exact', head: true }),
    getSupabaseClient().from('robot_cards')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
  ]);

  return {
    total: total || 0,
    today: today || 0,
  };
}
