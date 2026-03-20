import { supabase } from '@/lib/supabase/client';

export interface Team {
  id: string;
  name: string;
  school: string;
  slug: string;
}

export async function fetchTeams(): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('id,name,school,slug')
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}

export interface TeamRobot {
  robot_id: string;
  data: Record<string, any> | null;
  updated_at: string;
}

export async function fetchTeamRobots(teamId: string): Promise<TeamRobot[]> {
  const { data, error } = await supabase
    .from('robot_cards')
    .select('robot_id,data,updated_at')
    .eq('team_id', teamId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
