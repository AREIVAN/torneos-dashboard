import { getSupabaseClient } from '@/lib/supabase/client';

export async function getLatestRobots() {
  const { data, error } = await getSupabaseClient()
    .from('robot_cards')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(8);

  if (error) {
    console.error("Error fetching latest robots stringified:", JSON.stringify(error));
    // Fallback: if created_at fails, let's try sorting by id or just return data as is
    const fallback = await getSupabaseClient().from('robot_cards').select('*').limit(8);
    return fallback.data || [];
  }

  return data || [];
}
