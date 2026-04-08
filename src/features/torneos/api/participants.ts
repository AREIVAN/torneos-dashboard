/**
 * Participants API
 * Manage robot registration for tournaments
 */

import { getSupabaseClient } from '@/lib/supabase/client';
import { normalizeRobotCategory } from '@/lib/categoryNormalization';
import { secureMutation } from './secureMutation';
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

  try {
    const data = await secureMutation<DbParticipant>({
      table: 'tournament_participants',
      operation: 'insert',
      data: insert,
      single: true,
    });
    return { data, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.toLowerCase().includes('duplicate')) {
      return { data: null, error: new Error('Robot already registered in this tournament') };
    }
    console.error('Error adding participant:', message);
    return { data: null, error: new Error(message) };
  }
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

  try {
    const data = await secureMutation<DbParticipant[]>({
      table: 'tournament_participants',
      operation: 'insert',
      data: inserts,
    });
    return { data: data || [], errors: [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error adding participants:', message);
    return { data: [], errors: [new Error(message)] };
  }
}

// =============================================
// READ
// =============================================

export async function getParticipants(
  tournamentId: string
): Promise<{ data: DbParticipant[]; error: Error | null }> {
  const { data, error } = await getSupabaseClient()
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
  const { data, error } = await getSupabaseClient()
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
  const { count, error } = await getSupabaseClient()
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
  try {
    const data = await secureMutation<DbParticipant>({
      table: 'tournament_participants',
      operation: 'update',
      data: { seed },
      match: { tournament_id: tournamentId, robot_id: robotId },
      single: true,
    });
    return { data, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error updating participant seed:', message);
    return { data: null, error: new Error(message) };
  }
}

export async function reorderParticipants(
  tournamentId: string,
  robotIds: string[]
): Promise<{ error: Error | null }> {
  // Update seeds based on array order
  const updates = robotIds.map((robotId, index) =>
    updateParticipantSeed(tournamentId, robotId, index + 1)
  );

  const results = await Promise.all(updates);
  const errors = results.filter((r) => r.error !== null);

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
  try {
    await secureMutation<null>({
      table: 'tournament_participants',
      operation: 'delete',
      match: { tournament_id: tournamentId, robot_id: robotId },
      returning: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error removing participant:', message);
    return { error: new Error(message) };
  }

  return { error: null };
}

export async function removeAllParticipants(
  tournamentId: string
): Promise<{ error: Error | null }> {
  try {
    await secureMutation<null>({
      table: 'tournament_participants',
      operation: 'delete',
      match: { tournament_id: tournamentId },
      returning: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error removing all participants:', message);
    return { error: new Error(message) };
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
    c: normalizeRobotCategory(player.c),
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
