/**
 * Participants API
 * Manage robot registration for tournaments
 */

import { supabase } from '@/lib/supabase/client';
import type {
  DbParticipant,
  DbParticipantInsert,
  ParticipantRobotData,
} from '@/lib/supabase/database.types';

// =============================================
// CREATE
// =============================================

export async function addParticipant(
  tournamentId: string,
  robotId: string,
  robotData: ParticipantRobotData,
  seed?: number
): Promise<{ data: DbParticipant | null; error: Error | null }> {
  const insert: DbParticipantInsert = {
    tournament_id: tournamentId,
    robot_id: robotId,
    robot_data: robotData,
    seed: seed ?? null,
  };

  const { data, error } = await supabase
    .from('tournament_participants')
    .insert(insert)
    .select()
    .single();

  if (error) {
    // Handle duplicate entry gracefully
    if (error.code === '23505') {
      return { data: null, error: new Error('Robot already registered in this tournament') };
    }
    console.error('Error adding participant:', error);
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: null };
}

export async function addParticipants(
  tournamentId: string,
  robots: Array<{ robotId: string; robotData: ParticipantRobotData; seed?: number }>
): Promise<{ data: DbParticipant[]; errors: Error[] }> {
  const inserts: DbParticipantInsert[] = robots.map((robot, index) => ({
    tournament_id: tournamentId,
    robot_id: robot.robotId,
    robot_data: robot.robotData,
    seed: robot.seed ?? index + 1,
  }));

  const { data, error } = await supabase
    .from('tournament_participants')
    .insert(inserts)
    .select();

  if (error) {
    console.error('Error adding participants:', error);
    return { data: [], errors: [new Error(error.message)] };
  }

  return { data: data || [], errors: [] };
}

// =============================================
// READ
// =============================================

export async function getParticipants(
  tournamentId: string
): Promise<{ data: DbParticipant[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('tournament_participants')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('seed', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Error fetching participants:', error);
    return { data: [], error: new Error(error.message) };
  }

  return { data: data || [], error: null };
}

export async function getParticipant(
  tournamentId: string,
  robotId: string
): Promise<{ data: DbParticipant | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('tournament_participants')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('robot_id', robotId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: null }; // Not found is not an error
    }
    console.error('Error fetching participant:', error);
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: null };
}

export async function getParticipantCount(
  tournamentId: string
): Promise<{ count: number; error: Error | null }> {
  const { count, error } = await supabase
    .from('tournament_participants')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId);

  if (error) {
    console.error('Error counting participants:', error);
    return { count: 0, error: new Error(error.message) };
  }

  return { count: count || 0, error: null };
}

// =============================================
// UPDATE
// =============================================

export async function updateParticipantSeed(
  tournamentId: string,
  robotId: string,
  seed: number
): Promise<{ data: DbParticipant | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('tournament_participants')
    .update({ seed })
    .eq('tournament_id', tournamentId)
    .eq('robot_id', robotId)
    .select()
    .single();

  if (error) {
    console.error('Error updating participant seed:', error);
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: null };
}

export async function reorderParticipants(
  tournamentId: string,
  robotIds: string[]
): Promise<{ error: Error | null }> {
  // Update seeds based on array order
  const updates = robotIds.map((robotId, index) =>
    supabase
      .from('tournament_participants')
      .update({ seed: index + 1 })
      .eq('tournament_id', tournamentId)
      .eq('robot_id', robotId)
  );

  const results = await Promise.all(updates);
  const errors = results.filter((r) => r.error);

  if (errors.length > 0) {
    console.error('Errors reordering participants:', errors);
    return { error: new Error('Failed to reorder some participants') };
  }

  return { error: null };
}

// =============================================
// DELETE
// =============================================

export async function removeParticipant(
  tournamentId: string,
  robotId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('tournament_participants')
    .delete()
    .eq('tournament_id', tournamentId)
    .eq('robot_id', robotId);

  if (error) {
    console.error('Error removing participant:', error);
    return { error: new Error(error.message) };
  }

  return { error: null };
}

export async function removeAllParticipants(
  tournamentId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('tournament_participants')
    .delete()
    .eq('tournament_id', tournamentId);

  if (error) {
    console.error('Error removing all participants:', error);
    return { error: new Error(error.message) };
  }

  return { error: null };
}

// =============================================
// HELPERS
// =============================================

/**
 * Convert a Player object (from frontend types) to ParticipantRobotData
 */
export function playerToRobotData(player: {
  i: string;
  n: string;
  t: string;
  c: string;
  p?: string;
  s?: string;
  w?: number;
  d?: string;
  y?: string;
  f?: string;
  k?: string;
  a?: string;
}): ParticipantRobotData {
  return {
    i: player.i,
    n: player.n,
    t: player.t,
    c: player.c,
    p: player.p,
    s: player.s,
    w: player.w,
    d: player.d,
    y: player.y,
    f: player.f,
    k: player.k,
    a: player.a,
  };
}
