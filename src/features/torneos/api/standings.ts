/**
 * Standings API
 * Calculate and manage tournament standings
 */

import { getSupabaseClient } from '@/lib/supabase/client';
import type {
  DbStanding,
  DbStandingInsert,
  DbStandingUpdate,
  DbMatch,
} from '@/lib/supabase/database.types';
import { secureMutation } from './secureMutation';

// =============================================
// CREATE
// =============================================

export async function createStanding(
  data: DbStandingInsert
): Promise<{ data: DbStanding | null; error: Error | null }> {
  try {
    const standing = await secureMutation<DbStanding>({
      table: 'standings',
      operation: 'insert',
      data,
      single: true,
    });
    return { data: standing, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error creating standing:', message);
    return { data: null, error: new Error(message) };
  }
}

export async function createStandings(
  standings: DbStandingInsert[]
): Promise<{ data: DbStanding[]; error: Error | null }> {
  if (standings.length === 0) {
    return { data: [], error: null };
  }

  try {
    const data = await secureMutation<DbStanding[]>({
      table: 'standings',
      operation: 'insert',
      data: standings,
    });
    return { data: data || [], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error creating standings:', message);
    return { data: [], error: new Error(message) };
  }
}

/**
 * Initialize standings for all participants in a tournament
 */
export async function initializeStandings(
  tournamentId: string,
  robotIds: string[],
  groupAssignments?: Map<string, number> // robotId -> groupIndex
): Promise<{ data: DbStanding[]; error: Error | null }> {
  const standings: DbStandingInsert[] = robotIds.map((robotId) => ({
    tournament_id: tournamentId,
    robot_id: robotId,
    group_index: groupAssignments?.get(robotId) ?? null,
    wins: 0,
    losses: 0,
    points: 0,
    rounds_won: 0,
    rounds_lost: 0,
  }));

  return createStandings(standings);
}

// =============================================
// READ
// =============================================

export async function getStanding(
  tournamentId: string,
  robotId: string
): Promise<{ data: DbStanding | null; error: Error | null }> {
  const { data, error } = await getSupabaseClient()
    .from('standings')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('robot_id', robotId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: null }; // Not found
    }
    console.error('Error fetching standing:', error);
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: null };
}

export async function getTournamentStandings(
  tournamentId: string,
  options?: {
    groupIndex?: number;
    sortBy?: 'points' | 'wins' | 'final_position';
  }
): Promise<{ data: DbStanding[]; error: Error | null }> {
  let query = getSupabaseClient()
    .from('standings')
    .select('*')
    .eq('tournament_id', tournamentId);

  if (options?.groupIndex !== undefined) {
    query = query.eq('group_index', options.groupIndex);
  }

  // Default sort by points descending, then by rounds_won - rounds_lost
  const sortField = options?.sortBy || 'points';
  query = query.order(sortField, { ascending: sortField === 'final_position' });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching standings:', error);
    return { data: [], error: new Error(error.message) };
  }

  // Secondary sort by round differential for tiebreaker
  const standings = (data || []).sort((a: DbStanding, b: DbStanding) => {
    if (a.points !== b.points) return b.points - a.points;
    const diffA = a.rounds_won - a.rounds_lost;
    const diffB = b.rounds_won - b.rounds_lost;
    if (diffA !== diffB) return diffB - diffA;
    return b.rounds_won - a.rounds_won;
  });

  return { data: standings, error: null };
}

export async function getGroupStandings(
  tournamentId: string
): Promise<{ data: Map<number, DbStanding[]>; error: Error | null }> {
  const { data, error } = await getSupabaseClient()
    .from('standings')
    .select('*')
    .eq('tournament_id', tournamentId)
    .not('group_index', 'is', null)
    .order('points', { ascending: false });

  if (error) {
    console.error('Error fetching group standings:', error);
    return { data: new Map(), error: new Error(error.message) };
  }

  // Group by group_index
  const groups = new Map<number, DbStanding[]>();
  for (const standing of data || []) {
    if (standing.group_index === null) continue;
    const group = groups.get(standing.group_index) || [];
    group.push(standing);
    groups.set(standing.group_index, group);
  }

  // Sort each group by points, then round differential
  groups.forEach((standings, groupIndex) => {
    standings.sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      const diffA = a.rounds_won - a.rounds_lost;
      const diffB = b.rounds_won - b.rounds_lost;
      if (diffA !== diffB) return diffB - diffA;
      return b.rounds_won - a.rounds_won;
    });
    groups.set(groupIndex, standings);
  });

  return { data: groups, error: null };
}

export async function getFinalPlacements(
  tournamentId: string
): Promise<{ data: DbStanding[]; error: Error | null }> {
  const { data, error } = await getSupabaseClient()
    .from('standings')
    .select('*')
    .eq('tournament_id', tournamentId)
    .not('final_position', 'is', null)
    .order('final_position', { ascending: true });

  if (error) {
    console.error('Error fetching final placements:', error);
    return { data: [], error: new Error(error.message) };
  }

  return { data: data || [], error: null };
}

// =============================================
// UPDATE
// =============================================

export async function updateStanding(
  tournamentId: string,
  robotId: string,
  data: DbStandingUpdate
): Promise<{ data: DbStanding | null; error: Error | null }> {
  try {
    const standing = await secureMutation<DbStanding>({
      table: 'standings',
      operation: 'update',
      data,
      match: { tournament_id: tournamentId, robot_id: robotId },
      single: true,
    });
    return { data: standing, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error updating standing:', message);
    return { data: null, error: new Error(message) };
  }
}

/**
 * Record match result in standings
 * Call this when a match is completed
 */
export async function recordMatchResult(
  tournamentId: string,
  match: DbMatch
): Promise<{ error: Error | null }> {
  if (!match.winner_id || !match.robot_a_id || !match.robot_b_id) {
    return { error: null }; // Nothing to record
  }

  const winnerId = match.winner_id;
  const loserId = match.winner_id === match.robot_a_id ? match.robot_b_id : match.robot_a_id;

  // Calculate points (3 for win, 0 for loss)
  const winnerPoints = 3;
  const loserPoints = 0;

  // Get current standings
  const [winnerStanding, loserStanding] = await Promise.all([
    getStanding(tournamentId, winnerId),
    getStanding(tournamentId, loserId),
  ]);

  // Update winner
  if (winnerStanding.data) {
    await updateStanding(tournamentId, winnerId, {
      wins: winnerStanding.data.wins + 1,
      points: winnerStanding.data.points + winnerPoints,
      rounds_won: winnerStanding.data.rounds_won + (winnerId === match.robot_a_id ? match.wins_a : match.wins_b),
      rounds_lost: winnerStanding.data.rounds_lost + (winnerId === match.robot_a_id ? match.wins_b : match.wins_a),
    });
  }

  // Update loser
  if (loserStanding.data) {
    await updateStanding(tournamentId, loserId, {
      losses: loserStanding.data.losses + 1,
      points: loserStanding.data.points + loserPoints,
      rounds_won: loserStanding.data.rounds_won + (loserId === match.robot_a_id ? match.wins_a : match.wins_b),
      rounds_lost: loserStanding.data.rounds_lost + (loserId === match.robot_a_id ? match.wins_b : match.wins_a),
    });
  }

  return { error: null };
}

/**
 * Set final placement for a robot
 */
export async function setFinalPosition(
  tournamentId: string,
  robotId: string,
  position: number
): Promise<{ data: DbStanding | null; error: Error | null }> {
  return updateStanding(tournamentId, robotId, { final_position: position });
}

/**
 * Set final placements for top N robots
 */
export async function setFinalPlacements(
  tournamentId: string,
  placements: Array<{ robotId: string; position: number }>
): Promise<{ error: Error | null }> {
  const updates = placements.map(({ robotId, position }) =>
    updateStanding(tournamentId, robotId, { final_position: position })
  );

  const results = await Promise.all(updates);
  const errors = results.filter((r) => r.error);

  if (errors.length > 0) {
    console.error('Errors setting placements:', errors);
    return { error: new Error('Failed to set some placements') };
  }

  return { error: null };
}

// =============================================
// DELETE
// =============================================

export async function deleteStanding(
  tournamentId: string,
  robotId: string
): Promise<{ error: Error | null }> {
  try {
    await secureMutation<null>({
      table: 'standings',
      operation: 'delete',
      match: { tournament_id: tournamentId, robot_id: robotId },
      returning: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error deleting standing:', message);
    return { error: new Error(message) };
  }

  return { error: null };
}

export async function deleteTournamentStandings(
  tournamentId: string
): Promise<{ error: Error | null }> {
  try {
    await secureMutation<null>({
      table: 'standings',
      operation: 'delete',
      match: { tournament_id: tournamentId },
      returning: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error deleting standings:', message);
    return { error: new Error(message) };
  }

  return { error: null };
}

// =============================================
// RECALCULATION
// =============================================

/**
 * Recalculate all standings from match data
 * Useful for fixing inconsistencies
 */
export async function recalculateStandings(
  tournamentId: string
): Promise<{ error: Error | null }> {
  // Get all matches and participants
  const [matchesRes, standingsRes] = await Promise.all([
    getSupabaseClient()
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .not('winner_id', 'is', null),
    getSupabaseClient().from('standings').select('*').eq('tournament_id', tournamentId),
  ]);

  if (matchesRes.error) {
    return { error: new Error(matchesRes.error.message) };
  }

  // Reset standings
  const standingUpdates = (standingsRes.data || []).map((standing: DbStanding) => ({
    tournament_id: standing.tournament_id,
    robot_id: standing.robot_id,
    group_index: standing.group_index,
    wins: 0,
    losses: 0,
    points: 0,
    rounds_won: 0,
    rounds_lost: 0,
  }));

  // Calculate from matches
  const robotStats = new Map<
    string,
    { wins: number; losses: number; points: number; roundsWon: number; roundsLost: number }
  >();

  for (const match of matchesRes.data || []) {
    if (!match.winner_id || !match.robot_a_id || !match.robot_b_id) continue;

    const winnerId = match.winner_id;
    const loserId = match.winner_id === match.robot_a_id ? match.robot_b_id : match.robot_a_id;

    // Initialize if needed
    if (!robotStats.has(winnerId)) {
      robotStats.set(winnerId, { wins: 0, losses: 0, points: 0, roundsWon: 0, roundsLost: 0 });
    }
    if (!robotStats.has(loserId)) {
      robotStats.set(loserId, { wins: 0, losses: 0, points: 0, roundsWon: 0, roundsLost: 0 });
    }

    const winnerStats = robotStats.get(winnerId)!;
    const loserStats = robotStats.get(loserId)!;

    // Update stats
    winnerStats.wins += 1;
    winnerStats.points += 3;
    winnerStats.roundsWon += winnerId === match.robot_a_id ? match.wins_a : match.wins_b;
    winnerStats.roundsLost += winnerId === match.robot_a_id ? match.wins_b : match.wins_a;

    loserStats.losses += 1;
    loserStats.roundsWon += loserId === match.robot_a_id ? match.wins_a : match.wins_b;
    loserStats.roundsLost += loserId === match.robot_a_id ? match.wins_b : match.wins_a;
  }

  // Apply updates
  for (const standing of standingUpdates) {
    const stats = robotStats.get(standing.robot_id);
    if (stats) {
      standing.wins = stats.wins;
      standing.losses = stats.losses;
      standing.points = stats.points;
      standing.rounds_won = stats.roundsWon;
      standing.rounds_lost = stats.roundsLost;
    }
  }

  // Upsert standings
  try {
    await secureMutation<DbStanding[]>({
      table: 'standings',
      operation: 'upsert',
      data: standingUpdates,
      onConflict: 'tournament_id,robot_id',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error recalculating standings:', message);
    return { error: new Error(message) };
  }

  return { error: null };
}
