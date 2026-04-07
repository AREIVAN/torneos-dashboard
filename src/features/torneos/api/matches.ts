/**
 * Matches API
 * Handle match scoring and retrieval
 */

import { getSupabaseClient } from '@/lib/supabase/client';
import type {
  DbMatch,
  DbMatchInsert,
  DbMatchUpdate,
  BracketType,
} from '@/lib/supabase/database.types';
import type { Bracket, Match, ViewState } from '../lib/types';

// =============================================
// CREATE
// =============================================

export async function createMatch(
  data: DbMatchInsert
): Promise<{ data: DbMatch | null; error: Error | null }> {
  const { data: match, error } = await getSupabaseClient()
    .from('matches')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('Error creating match:', error);
    return { data: null, error: new Error(error.message) };
  }

  return { data: match, error: null };
}

export async function createMatches(
  matches: DbMatchInsert[]
): Promise<{ data: DbMatch[]; error: Error | null }> {
  if (matches.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await getSupabaseClient()
    .from('matches')
    .insert(matches)
    .select();

  if (error) {
    console.error('Error creating matches:', error);
    return { data: [], error: new Error(error.message) };
  }

  return { data: data || [], error: null };
}

// =============================================
// READ
// =============================================

export async function getMatch(
  id: string
): Promise<{ data: DbMatch | null; error: Error | null }> {
  const { data, error } = await getSupabaseClient()
    .from('matches')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching match:', error);
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: null };
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
  let query = getSupabaseClient()
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('round_index', { ascending: true })
    .order('match_index', { ascending: true });

  if (options?.bracketType) {
    query = query.eq('bracket_type', options.bracketType);
  }

  if (options?.roundIndex !== undefined) {
    query = query.eq('round_index', options.roundIndex);
  }

  if (options?.groupIndex !== undefined) {
    query = query.eq('group_index', options.groupIndex);
  }

  if (options?.includeCompleted === false) {
    query = query.is('completed_at', null);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching matches:', error);
    return { data: [], error: new Error(error.message) };
  }

  return { data: data || [], error: null };
}

export async function getMatchesByRobot(
  tournamentId: string,
  robotId: string
): Promise<{ data: DbMatch[]; error: Error | null }> {
  const { data, error } = await getSupabaseClient()
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .or(`robot_a_id.eq.${robotId},robot_b_id.eq.${robotId}`)
    .order('round_index', { ascending: true });

  if (error) {
    console.error('Error fetching robot matches:', error);
    return { data: [], error: new Error(error.message) };
  }

  return { data: data || [], error: null };
}

export async function getPendingMatches(
  tournamentId: string
): Promise<{ data: DbMatch[]; error: Error | null }> {
  const { data, error } = await getSupabaseClient()
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .is('winner_id', null)
    .eq('is_bye', false)
    .not('robot_a_id', 'is', null)
    .not('robot_b_id', 'is', null)
    .order('round_index', { ascending: true })
    .order('match_index', { ascending: true });

  if (error) {
    console.error('Error fetching pending matches:', error);
    return { data: [], error: new Error(error.message) };
  }

  return { data: data || [], error: null };
}

// =============================================
// UPDATE
// =============================================

export async function updateMatch(
  id: string,
  data: DbMatchUpdate
): Promise<{ data: DbMatch | null; error: Error | null }> {
  const { data: match, error } = await getSupabaseClient()
    .from('matches')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating match:', error);
    return { data: null, error: new Error(error.message) };
  }

  return { data: match, error: null };
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
  const { error } = await getSupabaseClient()
    .from('matches')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting match:', error);
    return { error: new Error(error.message) };
  }

  return { error: null };
}

export async function deleteTournamentMatches(
  tournamentId: string
): Promise<{ error: Error | null }> {
  const { error } = await getSupabaseClient()
    .from('matches')
    .delete()
    .eq('tournament_id', tournamentId);

  if (error) {
    console.error('Error deleting tournament matches:', error);
    return { error: new Error(error.message) };
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
  const robotAId = match.a?.rid || null;
  const robotBId = match.b?.rid || null;
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
  }

  if (view.type === 'groups') {
    rows.push(...normalizeBracket(tournamentId, 'single', view.finalBracket));
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
  const { data, error } = await getSupabaseClient()
    .from('matches')
    .select('winner_id, robot_a_id, robot_b_id, is_bye')
    .eq('tournament_id', tournamentId);

  if (error) {
    console.error('Error fetching match stats:', error);
    return { total: 0, completed: 0, pending: 0, inProgress: 0, error: new Error(error.message) };
  }

  const matches = data || [];
  const total = matches.length;
  const completed = matches.filter((m: DbMatch) => m.winner_id !== null || m.is_bye).length;
  const pending = matches.filter(
    (m: DbMatch) => !m.winner_id && !m.is_bye && (!m.robot_a_id || !m.robot_b_id)
  ).length;
  const inProgress = total - completed - pending;

  return { total, completed, pending, inProgress, error: null };
}
