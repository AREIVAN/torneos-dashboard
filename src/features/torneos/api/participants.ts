/**
 * Participants API
 * Manage robot registration for tournaments
 */

import { getSupabaseClient } from '@/lib/supabase/client';
import { normalizeRobotCategory } from '@/lib/categoryNormalization';
import { secureMutation } from './secureMutation';
import type {
  DbParticipant,
  DbParticipantCompatRow,
  DbParticipantInsert,
  ParticipantTableName,
  ParticipantRobotData,
} from '@/lib/supabase/database.types';

const PARTICIPANT_TABLE_CANDIDATES: ParticipantTableName[] = [
  'tournament_players',
  'tournament_participants',
];
let cachedParticipantTable: ParticipantTableName | null = null;

function isMissingSchemaEntityError(error: { message?: string | null } | null, entity: string) {
  if (!error || !error.message) return false;
  const message = error.message.toLowerCase();
  const relationMissing = message.includes('relation') && message.includes('does not exist');
  return (
    message.includes(entity.toLowerCase()) &&
    (message.includes('schema cache') || message.includes('could not find the table') || relationMissing)
  );
}

async function resolveParticipantTable() {
  if (cachedParticipantTable) {
    return cachedParticipantTable;
  }

  for (const candidate of PARTICIPANT_TABLE_CANDIDATES) {
    const { error } = await getSupabaseClient().from(candidate).select('id').limit(1);
    if (!isMissingSchemaEntityError(error, candidate)) {
      cachedParticipantTable = candidate;
      return candidate;
    }
  }

  cachedParticipantTable = 'tournament_players';
  return cachedParticipantTable;
}

function mapInsertForParticipantTable(table: ParticipantTableName, insert: DbParticipantInsert) {
  if (table === 'tournament_players') {
    return {
      tournament_id: insert.tournament_id,
      robot_id: insert.robot_id,
      compact: insert.robot_data,
      team: insert.robot_data.t || null,
      seed: insert.seed ?? null,
    };
  }

  return insert;
}

function normalizeParticipantRow(row: DbParticipantCompatRow): DbParticipant {
  const robotData = row.robot_data ?? row.compact;

  return {
    id: row.id,
    tournament_id: row.tournament_id,
    robot_id: row.robot_id,
    robot_data:
      robotData || {
        i: row.robot_id,
        n: row.robot_id,
        t: row.team || 'Sin equipo',
        c: '',
      },
    seed: row.seed,
    created_at: row.created_at,
  };
}

// =============================================
// CREATE
// =============================================

export async function addParticipant(
  tournamentId: string,
  robotId: string,
  robotData: ParticipantRobotData,
  seed?: number
): Promise<{ data: DbParticipant | null; error: Error | null }> {
  const table = await resolveParticipantTable();
  const insert: DbParticipantInsert = {
    tournament_id: tournamentId,
    robot_id: robotId,
    robot_data: robotData,
    seed: seed ?? null,
  };

  try {
    const data = await secureMutation<DbParticipantCompatRow>({
      table,
      operation: 'insert',
      data: mapInsertForParticipantTable(table, insert),
      single: true,
    });
    return { data: normalizeParticipantRow(data), error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (table === 'tournament_participants' && message.includes('tournament_participants')) {
      cachedParticipantTable = null;
      return addParticipant(tournamentId, robotId, robotData, seed);
    }
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
  const table = await resolveParticipantTable();
  const inserts: DbParticipantInsert[] = robots.map((robot, index) => ({
    tournament_id: tournamentId,
    robot_id: robot.robotId,
    robot_data: robot.robotData,
    seed: robot.seed ?? index + 1,
  }));

  try {
    const data = await secureMutation<DbParticipantCompatRow[]>({
      table,
      operation: 'insert',
      data: inserts.map((insert) => mapInsertForParticipantTable(table, insert)),
    });
    return { data: (data || []).map(normalizeParticipantRow), errors: [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (table === 'tournament_participants' && message.includes('tournament_participants')) {
      cachedParticipantTable = null;
      return addParticipants(tournamentId, robots);
    }
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
  const table = await resolveParticipantTable();
  const { data, error } = await getSupabaseClient()
    .from(table)
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('seed', { ascending: true, nullsFirst: false });

  if (error) {
    if (table === 'tournament_participants' && isMissingSchemaEntityError(error, 'tournament_participants')) {
      cachedParticipantTable = null;
      return getParticipants(tournamentId);
    }
    console.error('Error fetching participants:', error);
    return { data: [], error: new Error(error.message) };
  }

  return { data: ((data || []) as DbParticipantCompatRow[]).map(normalizeParticipantRow), error: null };
}

export async function getParticipant(
  tournamentId: string,
  robotId: string
): Promise<{ data: DbParticipant | null; error: Error | null }> {
  const table = await resolveParticipantTable();
  const { data, error } = await getSupabaseClient()
    .from(table)
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('robot_id', robotId)
    .single();

  if (error) {
    if (table === 'tournament_participants' && isMissingSchemaEntityError(error, 'tournament_participants')) {
      cachedParticipantTable = null;
      return getParticipant(tournamentId, robotId);
    }
    if (error.code === 'PGRST116') {
      return { data: null, error: null }; // Not found is not an error
    }
    console.error('Error fetching participant:', error);
    return { data: null, error: new Error(error.message) };
  }

  return { data: normalizeParticipantRow(data as DbParticipantCompatRow), error: null };
}

export async function getParticipantCount(
  tournamentId: string
): Promise<{ count: number; error: Error | null }> {
  const table = await resolveParticipantTable();
  const { count, error } = await getSupabaseClient()
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId);

  if (error) {
    if (table === 'tournament_participants' && isMissingSchemaEntityError(error, 'tournament_participants')) {
      cachedParticipantTable = null;
      return getParticipantCount(tournamentId);
    }
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
  const table = await resolveParticipantTable();
  try {
    const data = await secureMutation<DbParticipantCompatRow>({
      table,
      operation: 'update',
      data: { seed },
      match: { tournament_id: tournamentId, robot_id: robotId },
      single: true,
    });
    return { data: normalizeParticipantRow(data), error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (table === 'tournament_participants' && message.includes('tournament_participants')) {
      cachedParticipantTable = null;
      return updateParticipantSeed(tournamentId, robotId, seed);
    }
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
  const table = await resolveParticipantTable();
  try {
    await secureMutation<null>({
      table,
      operation: 'delete',
      match: { tournament_id: tournamentId, robot_id: robotId },
      returning: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (table === 'tournament_participants' && message.includes('tournament_participants')) {
      cachedParticipantTable = null;
      return removeParticipant(tournamentId, robotId);
    }
    console.error('Error removing participant:', message);
    return { error: new Error(message) };
  }

  return { error: null };
}

export async function removeAllParticipants(
  tournamentId: string
): Promise<{ error: Error | null }> {
  const table = await resolveParticipantTable();
  try {
    await secureMutation<null>({
      table,
      operation: 'delete',
      match: { tournament_id: tournamentId },
      returning: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (table === 'tournament_participants' && message.includes('tournament_participants')) {
      cachedParticipantTable = null;
      return removeAllParticipants(tournamentId);
    }
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
