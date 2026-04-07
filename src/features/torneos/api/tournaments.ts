/**
 * Tournaments API
 * CRUD operations for tournament management
 */

import { getSupabaseClient } from '@/lib/supabase/client';
import type {
  DbTournament,
  DbTournamentInsert,
  DbTournamentUpdate,
  TournamentWithParticipants,
  TournamentWithDetails,
  TournamentStatus,
} from '@/lib/supabase/database.types';

// =============================================
// CREATE
// =============================================

export async function createTournament(
  data: DbTournamentInsert
): Promise<{ data: DbTournament | null; error: Error | null }> {
  const { data: tournament, error } = await getSupabaseClient()
    .from('tournaments')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('Error creating tournament:', error);
    return { data: null, error: new Error(error.message) };
  }

  return { data: tournament, error: null };
}

// =============================================
// READ
// =============================================

export async function getTournament(
  id: string
): Promise<{ data: DbTournament | null; error: Error | null }> {
  const { data: tournament, error } = await getSupabaseClient()
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching tournament:', error);
    return { data: null, error: new Error(error.message) };
  }

  return { data: tournament, error: null };
}

export async function getTournamentWithParticipants(
  id: string
): Promise<{ data: TournamentWithParticipants | null; error: Error | null }> {
  const { data: tournament, error: tournamentError } = await getSupabaseClient()
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();

  if (tournamentError) {
    console.error('Error fetching tournament:', tournamentError);
    return { data: null, error: new Error(tournamentError.message) };
  }

  const { data: participants, error: participantsError } = await getSupabaseClient()
    .from('tournament_participants')
    .select('*')
    .eq('tournament_id', id)
    .order('seed', { ascending: true, nullsFirst: false });

  if (participantsError) {
    console.error('Error fetching participants:', participantsError);
    return { data: null, error: new Error(participantsError.message) };
  }

  return {
    data: { ...tournament, participants: participants || [] },
    error: null,
  };
}

export async function getTournamentWithDetails(
  id: string
): Promise<{ data: TournamentWithDetails | null; error: Error | null }> {
  // Fetch all data in parallel
  const [tournamentRes, participantsRes, matchesRes, standingsRes] = await Promise.all([
    getSupabaseClient().from('tournaments').select('*').eq('id', id).single(),
    getSupabaseClient()
      .from('tournament_participants')
      .select('*')
      .eq('tournament_id', id)
      .order('seed', { ascending: true, nullsFirst: false }),
    getSupabaseClient()
      .from('matches')
      .select('*')
      .eq('tournament_id', id)
      .order('round_index', { ascending: true })
      .order('match_index', { ascending: true }),
    getSupabaseClient()
      .from('standings')
      .select('*')
      .eq('tournament_id', id)
      .order('points', { ascending: false }),
  ]);

  if (tournamentRes.error) {
    console.error('Error fetching tournament:', tournamentRes.error);
    return { data: null, error: new Error(tournamentRes.error.message) };
  }

  return {
    data: {
      ...tournamentRes.data,
      participants: participantsRes.data || [],
      matches: matchesRes.data || [],
      standings: standingsRes.data || [],
    },
    error: null,
  };
}

export async function getTournaments(options?: {
  status?: TournamentStatus | TournamentStatus[];
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: DbTournament[]; error: Error | null; count: number }> {
  let query = getSupabaseClient()
    .from('tournaments')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  // Filter by status
  if (options?.status) {
    if (Array.isArray(options.status)) {
      query = query.in('status', options.status);
    } else {
      query = query.eq('status', options.status);
    }
  }

  // Filter by category
  if (options?.category) {
    query = query.eq('category', options.category);
  }

  // Pagination
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching tournaments:', error);
    return { data: [], error: new Error(error.message), count: 0 };
  }

  return { data: data || [], error: null, count: count || 0 };
}

// =============================================
// UPDATE
// =============================================

export async function updateTournament(
  id: string,
  data: DbTournamentUpdate
): Promise<{ data: DbTournament | null; error: Error | null }> {
  const { data: tournament, error } = await getSupabaseClient()
    .from('tournaments')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating tournament:', error);
    return { data: null, error: new Error(error.message) };
  }

  return { data: tournament, error: null };
}

export async function updateTournamentStatus(
  id: string,
  status: TournamentStatus
): Promise<{ data: DbTournament | null; error: Error | null }> {
  return updateTournament(id, { status });
}

export async function saveBracketData(
  id: string,
  bracketData: DbTournamentUpdate['bracket_data']
): Promise<{ data: DbTournament | null; error: Error | null }> {
  return updateTournament(id, { bracket_data: bracketData });
}

// =============================================
// DELETE
// =============================================

export async function deleteTournament(
  id: string
): Promise<{ error: Error | null }> {
  const { error } = await getSupabaseClient()
    .from('tournaments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting tournament:', error);
    return { error: new Error(error.message) };
  }

  return { error: null };
}

// =============================================
// HELPERS
// =============================================

export async function duplicateTournament(
  id: string,
  newName?: string
): Promise<{ data: DbTournament | null; error: Error | null }> {
  // Fetch original tournament
  const { data: original, error: fetchError } = await getTournament(id);
  
  if (fetchError || !original) {
    return { data: null, error: fetchError || new Error('Tournament not found') };
  }

  // Create new tournament with same settings but reset state
  const newTournament: DbTournamentInsert = {
    name: newName || `${original.name} (copy)`,
    category: original.category,
    venue: original.venue,
    date: original.date,
    format: original.format,
    size: original.size,
    groups_count: original.groups_count,
    advance_per_group: original.advance_per_group,
    status: 'draft',
    bracket_data: null, // Start fresh
    champion_robot_id: null,
  };

  return createTournament(newTournament);
}
