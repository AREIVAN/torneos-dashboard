/**
 * Matches API
 * Handle match scoring and retrieval
 */

import { getSupabaseClient } from '@/lib/supabase/client';
import type {
  DbMatch,
  DbMatchCompatRow,
  DbMatchInsert,
  DbMatchUpdate,
  BracketType,
  MatchTableName,
} from '@/lib/supabase/database.types';
import type { Bracket, Match, ViewState } from '../lib/types';
import { secureMutation } from './secureMutation';

const MATCH_TABLE_CANDIDATES: MatchTableName[] = ['tournament_matches', 'matches'];
let cachedMatchTable: MatchTableName | null = null;

function isMissingSchemaEntityError(error: { message?: string | null } | null, entity: string) {
  if (!error || !error.message) return false;
  const message = error.message.toLowerCase();
  const relationMissing = message.includes('relation') && message.includes('does not exist');
  return (
    message.includes(entity.toLowerCase()) &&
    (message.includes('schema cache') || message.includes('could not find the table') || relationMissing)
  );
}

async function resolveMatchTable() {
  if (cachedMatchTable) {
    return cachedMatchTable;
  }

  for (const candidate of MATCH_TABLE_CANDIDATES) {
    const { error } = await getSupabaseClient().from(candidate).select('id').limit(1);
    if (!isMissingSchemaEntityError(error, candidate)) {
      cachedMatchTable = candidate;
      return candidate;
    }
  }

  cachedMatchTable = 'tournament_matches';
  return cachedMatchTable;
}

function normalizeMatchRow(row: DbMatchCompatRow): DbMatch {
  const meta = row.meta || {};

  return {
    id: row.id,
    tournament_id: row.tournament_id,
    bracket_type: (row.bracket_type || row.bracket || 'single') as BracketType,
    round_index: row.round_index ?? row.round ?? 0,
    match_index: row.match_index ?? row.match_no ?? 0,
    group_index: row.group_index ?? meta.group_index ?? null,
    robot_a_id: row.robot_a_id ?? row.a_robot_id ?? null,
    robot_b_id: row.robot_b_id ?? row.b_robot_id ?? null,
    wins_a: row.wins_a ?? row.wa ?? 0,
    wins_b: row.wins_b ?? row.wb ?? 0,
    winner_id: row.winner_id ?? row.winner_robot_id ?? null,
    is_bye: row.is_bye ?? Boolean(meta.is_bye),
    is_reset: row.is_reset ?? Boolean(meta.is_reset),
    scheduled_at: row.scheduled_at ?? meta.scheduled_at ?? null,
    completed_at: row.completed_at ?? meta.completed_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toLegacyMatchPayload(data: DbMatchInsert) {
  return {
    tournament_id: data.tournament_id,
    bracket: data.bracket_type,
    round: data.round_index,
    match_no: data.match_index,
    a_robot_id: data.robot_a_id ?? null,
    b_robot_id: data.robot_b_id ?? null,
    wa: data.wins_a ?? 0,
    wb: data.wins_b ?? 0,
    winner_robot_id: data.winner_id ?? null,
    meta: {
      group_index: data.group_index ?? null,
      is_bye: data.is_bye ?? false,
      is_reset: data.is_reset ?? false,
      scheduled_at: data.scheduled_at ?? null,
      completed_at: data.completed_at ?? null,
    },
  };
}

function toLegacyMatchUpdatePayload(data: DbMatchUpdate) {
  const payload: Record<string, unknown> = {};

  if (Object.prototype.hasOwnProperty.call(data, 'robot_a_id')) {
    payload.a_robot_id = data.robot_a_id ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(data, 'robot_b_id')) {
    payload.b_robot_id = data.robot_b_id ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(data, 'wins_a')) {
    payload.wa = data.wins_a ?? 0;
  }
  if (Object.prototype.hasOwnProperty.call(data, 'wins_b')) {
    payload.wb = data.wins_b ?? 0;
  }
  if (Object.prototype.hasOwnProperty.call(data, 'winner_id')) {
    payload.winner_robot_id = data.winner_id ?? null;
  }
  return payload;
}

function getMatchConflictColumns(table: MatchTableName) {
  return table === 'tournament_matches'
    ? 'tournament_id,bracket,round,match_no'
    : 'tournament_id,bracket_type,round_index,match_index';
}

// =============================================
// CREATE
// =============================================

export async function createMatch(
  data: DbMatchInsert
): Promise<{ data: DbMatch | null; error: Error | null }> {
  const table = await resolveMatchTable();
  try {
    const match = await secureMutation<DbMatchCompatRow>({
      table,
      operation: 'insert',
      data: table === 'tournament_matches' ? toLegacyMatchPayload(data) : data,
      single: true,
    });
    return { data: normalizeMatchRow(match), error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (table === 'matches' && message.includes('matches')) {
      cachedMatchTable = 'tournament_matches';
      return createMatch(data);
    }
    console.error('Error creating match:', message);
    return { data: null, error: new Error(message) };
  }
}

export async function createMatches(
  matches: DbMatchInsert[]
): Promise<{ data: DbMatch[]; error: Error | null }> {
  if (matches.length === 0) {
    return { data: [], error: null };
  }

  const table = await resolveMatchTable();
  try {
    const data = await secureMutation<DbMatchCompatRow[]>({
      table,
      operation: 'upsert',
      data: table === 'tournament_matches' ? matches.map(toLegacyMatchPayload) : matches,
      onConflict: getMatchConflictColumns(table),
    });
    return { data: (data || []).map(normalizeMatchRow), error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (table === 'matches' && message.includes('matches')) {
      cachedMatchTable = 'tournament_matches';
      return createMatches(matches);
    }
    console.error('Error creating matches:', message);
    return { data: [], error: new Error(message) };
  }
}

// =============================================
// READ
// =============================================

export async function getMatch(
  id: string
): Promise<{ data: DbMatch | null; error: Error | null }> {
  const table = await resolveMatchTable();
  const { data, error } = await getSupabaseClient()
    .from(table)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (table === 'matches' && isMissingSchemaEntityError(error, 'matches')) {
      cachedMatchTable = 'tournament_matches';
      return getMatch(id);
    }
    console.error('Error fetching match:', error);
    return { data: null, error: new Error(error.message) };
  }

  return { data: normalizeMatchRow(data as DbMatchCompatRow), error: null };
}

export async function getTournamentMatches(
  tournamentId: string,
  options?: {
    bracketType?: BracketType;
    roundIndex?: number;
    groupIndex?: number;
    includeCompleted?: boolean;
  }
): Promise<{ data: DbMatch[]; error: Error | null }> {
  const table = await resolveMatchTable();
  let query = getSupabaseClient()
    .from(table)
    .select('*')
    .eq('tournament_id', tournamentId)
    .order(table === 'tournament_matches' ? 'round' : 'round_index', { ascending: true })
    .order(table === 'tournament_matches' ? 'match_no' : 'match_index', { ascending: true });

  if (options?.bracketType) {
    query = query.eq(table === 'tournament_matches' ? 'bracket' : 'bracket_type', options.bracketType);
  }

  if (options?.roundIndex !== undefined) {
    query = query.eq(table === 'tournament_matches' ? 'round' : 'round_index', options.roundIndex);
  }

  if (table !== 'tournament_matches' && options?.groupIndex !== undefined) {
    query = query.eq('group_index', options.groupIndex);
  }

  if (table !== 'tournament_matches' && options?.includeCompleted === false) {
    query = query.is('completed_at', null);
  }

  const { data, error } = await query;

  if (error) {
    if (table === 'matches' && isMissingSchemaEntityError(error, 'matches')) {
      cachedMatchTable = 'tournament_matches';
      return getTournamentMatches(tournamentId, options);
    }
    console.error('Error fetching matches:', error);
    return { data: [], error: new Error(error.message) };
  }

  let rows = ((data || []) as DbMatchCompatRow[]).map(normalizeMatchRow);
  if (options?.groupIndex !== undefined) {
    rows = rows.filter((row) => row.group_index === options.groupIndex);
  }
  if (options?.includeCompleted === false) {
    rows = rows.filter((row) => row.completed_at === null);
  }

  return { data: rows, error: null };
}

export async function getMatchesByRobot(
  tournamentId: string,
  robotId: string
): Promise<{ data: DbMatch[]; error: Error | null }> {
  const table = await resolveMatchTable();
  const { data, error } = await getSupabaseClient()
    .from(table)
    .select('*')
    .eq('tournament_id', tournamentId)
    .or(
      table === 'tournament_matches'
        ? `a_robot_id.eq.${robotId},b_robot_id.eq.${robotId}`
        : `robot_a_id.eq.${robotId},robot_b_id.eq.${robotId}`
    )
    .order(table === 'tournament_matches' ? 'round' : 'round_index', { ascending: true });

  if (error) {
    if (table === 'matches' && isMissingSchemaEntityError(error, 'matches')) {
      cachedMatchTable = 'tournament_matches';
      return getMatchesByRobot(tournamentId, robotId);
    }
    console.error('Error fetching robot matches:', error);
    return { data: [], error: new Error(error.message) };
  }

  return { data: ((data || []) as DbMatchCompatRow[]).map(normalizeMatchRow), error: null };
}

export async function getPendingMatches(
  tournamentId: string
): Promise<{ data: DbMatch[]; error: Error | null }> {
  const table = await resolveMatchTable();
  const { data, error } = await getSupabaseClient()
    .from(table)
    .select('*')
    .eq('tournament_id', tournamentId)
    .order(table === 'tournament_matches' ? 'round' : 'round_index', { ascending: true })
    .order(table === 'tournament_matches' ? 'match_no' : 'match_index', { ascending: true });

  if (error) {
    if (table === 'matches' && isMissingSchemaEntityError(error, 'matches')) {
      cachedMatchTable = 'tournament_matches';
      return getPendingMatches(tournamentId);
    }
    console.error('Error fetching pending matches:', error);
    return { data: [], error: new Error(error.message) };
  }

  const rows = ((data || []) as DbMatchCompatRow[])
    .map(normalizeMatchRow)
    .filter((match) => !match.winner_id && !match.is_bye && !!match.robot_a_id && !!match.robot_b_id);

  return { data: rows, error: null };
}

// =============================================
// UPDATE
// =============================================

export async function updateMatch(
  id: string,
  data: DbMatchUpdate
): Promise<{ data: DbMatch | null; error: Error | null }> {
  const table = await resolveMatchTable();
  try {
    const match = await secureMutation<DbMatchCompatRow>({
      table,
      operation: 'update',
      data: table === 'tournament_matches' ? toLegacyMatchUpdatePayload(data) : data,
      match: { id },
      single: true,
    });
    return { data: normalizeMatchRow(match), error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (table === 'matches' && message.includes('matches')) {
      cachedMatchTable = 'tournament_matches';
      return updateMatch(id, data);
    }
    console.error('Error updating match:', message);
    return { data: null, error: new Error(message) };
  }
}

/**
 * Record a match result with BO3 scoring
 * Automatically determines winner when one side reaches 2 wins
 */
export async function recordMatchScore(
  id: string,
  winsA: number,
  winsB: number
): Promise<{ data: DbMatch | null; error: Error | null }> {
  // Determine winner (BO3: first to 2)
  let winnerId: string | null = null;
  let completedAt: string | null = null;

  // Get current match to determine winner
  const { data: currentMatch, error: fetchError } = await getMatch(id);
  if (fetchError || !currentMatch) {
    return { data: null, error: fetchError || new Error('Match not found') };
  }

  if (winsA >= 2) {
    winnerId = currentMatch.robot_a_id;
    completedAt = new Date().toISOString();
  } else if (winsB >= 2) {
    winnerId = currentMatch.robot_b_id;
    completedAt = new Date().toISOString();
  }

  const update: DbMatchUpdate = {
    wins_a: winsA,
    wins_b: winsB,
    winner_id: winnerId,
    completed_at: completedAt,
  };

  return updateMatch(id, update);
}

/**
 * Increment win count for a side
 */
export async function incrementWin(
  id: string,
  side: 'a' | 'b'
): Promise<{ data: DbMatch | null; error: Error | null }> {
  // Fetch current match state
  const { data: match, error: fetchError } = await getMatch(id);
  if (fetchError || !match) {
    return { data: null, error: fetchError || new Error('Match not found') };
  }

  // Can't increment if match is already decided
  if (match.winner_id) {
    return { data: match, error: new Error('Match already completed') };
  }

  const newWinsA = side === 'a' ? match.wins_a + 1 : match.wins_a;
  const newWinsB = side === 'b' ? match.wins_b + 1 : match.wins_b;

  return recordMatchScore(id, newWinsA, newWinsB);
}

/**
 * Assign robots to a match slot
 */
export async function assignMatchRobots(
  id: string,
  robotAId: string | null,
  robotBId: string | null
): Promise<{ data: DbMatch | null; error: Error | null }> {
  return updateMatch(id, {
    robot_a_id: robotAId,
    robot_b_id: robotBId,
  });
}

/**
 * Reset match to initial state
 */
export async function resetMatch(
  id: string
): Promise<{ data: DbMatch | null; error: Error | null }> {
  return updateMatch(id, {
    wins_a: 0,
    wins_b: 0,
    winner_id: null,
    completed_at: null,
  });
}

// =============================================
// DELETE
// =============================================

export async function deleteMatch(
  id: string
): Promise<{ error: Error | null }> {
  const table = await resolveMatchTable();
  try {
    await secureMutation<null>({
      table,
      operation: 'delete',
      match: { id },
      returning: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (table === 'matches' && message.includes('matches')) {
      cachedMatchTable = 'tournament_matches';
      return deleteMatch(id);
    }
    console.error('Error deleting match:', message);
    return { error: new Error(message) };
  }

  return { error: null };
}

export async function deleteTournamentMatches(
  tournamentId: string
): Promise<{ error: Error | null }> {
  const table = await resolveMatchTable();
  try {
    await secureMutation<null>({
      table,
      operation: 'delete',
      match: { tournament_id: tournamentId },
      returning: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (table === 'matches' && message.includes('matches')) {
      cachedMatchTable = 'tournament_matches';
      return deleteTournamentMatches(tournamentId);
    }
    console.error('Error deleting tournament matches:', message);
    return { error: new Error(message) };
  }

  return { error: null };
}

function normalizeMatch(
  tournamentId: string,
  bracketType: BracketType,
  roundIndex: number,
  matchIndex: number,
  match: Match
): DbMatchInsert {
  const robotAId = match.a?.rid || match.a?.id || null;
  const robotBId = match.b?.rid || match.b?.id || null;
  const winnerId =
    match.winner === 'a' ? robotAId : match.winner === 'b' ? robotBId : null;

  return {
    tournament_id: tournamentId,
    bracket_type: bracketType,
    round_index: roundIndex,
    match_index: matchIndex,
    robot_a_id: robotAId,
    robot_b_id: robotBId,
    wins_a: match.wa ?? 0,
    wins_b: match.wb ?? 0,
    winner_id: winnerId,
    is_bye: Boolean(match.a?.bye || match.b?.bye),
    completed_at: winnerId ? new Date().toISOString() : null,
  };
}

function normalizeBracket(
  tournamentId: string,
  bracketType: BracketType,
  bracket?: Bracket
): DbMatchInsert[] {
  if (!bracket) return [];

  const rows: DbMatchInsert[] = [];
  bracket.rounds.forEach((round, roundIndex) => {
    round.forEach((match, matchIndex) => {
      rows.push(normalizeMatch(tournamentId, bracketType, roundIndex, matchIndex, match));
    });
  });
  return rows;
}

export async function syncTournamentMatches(
  tournamentId: string,
  view: ViewState | null
): Promise<{ data: DbMatch[]; error: Error | null }> {
  if (!view) {
    const deleted = await deleteTournamentMatches(tournamentId);
    if (deleted.error) return { data: [], error: deleted.error };
    return { data: [], error: null };
  }

  const rows: DbMatchInsert[] = [];

  if (view.type === 'single') {
    rows.push(...normalizeBracket(tournamentId, 'single', view.bracket));
    if (view.thirdPlaceMatch) {
      const roundIndex = view.bracket?.rounds.length ?? 1;
      rows.push(normalizeMatch(tournamentId, 'single', roundIndex, 0, view.thirdPlaceMatch));
    }
  }

  if (view.type === 'groups') {
    rows.push(...normalizeBracket(tournamentId, 'single', view.finalBracket));
    if (view.finalThirdPlaceMatch) {
      const roundIndex = view.finalBracket?.rounds.length ?? 1;
      rows.push(normalizeMatch(tournamentId, 'single', roundIndex, 0, view.finalThirdPlaceMatch));
    }
  }

  if (view.type === 'double' && view.dbl) {
    rows.push(...normalizeBracket(tournamentId, 'winners', view.dbl.winners));
    rows.push(...normalizeBracket(tournamentId, 'losers', view.dbl.losers));

    view.dbl.grandFinal.forEach((match, index) => {
      rows.push(normalizeMatch(tournamentId, 'grand_final', 0, index, match));
    });
  }

  const deleted = await deleteTournamentMatches(tournamentId);
  if (deleted.error) {
    return { data: [], error: deleted.error };
  }

  if (rows.length === 0) {
    return { data: [], error: null };
  }

  return createMatches(rows);
}

// =============================================
// HELPERS
// =============================================

/**
 * Get match statistics for a tournament
 */
export async function getMatchStats(
  tournamentId: string
): Promise<{
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  error: Error | null;
}> {
  const table = await resolveMatchTable();
  const { data, error } = await getSupabaseClient()
    .from(table)
    .select('*')
    .eq('tournament_id', tournamentId);

  if (error) {
    if (table === 'matches' && isMissingSchemaEntityError(error, 'matches')) {
      cachedMatchTable = 'tournament_matches';
      return getMatchStats(tournamentId);
    }
    console.error('Error fetching match stats:', error);
    return { total: 0, completed: 0, pending: 0, inProgress: 0, error: new Error(error.message) };
  }

  const matches = ((data || []) as DbMatchCompatRow[]).map(normalizeMatchRow);
  const total = matches.length;
  const completed = matches.filter((m: DbMatch) => m.winner_id !== null || m.is_bye).length;
  const pending = matches.filter(
    (m: DbMatch) => !m.winner_id && !m.is_bye && (!m.robot_a_id || !m.robot_b_id)
  ).length;
  const inProgress = total - completed - pending;

  return { total, completed, pending, inProgress, error: null };
}
