/**
 * Tournaments API
 * CRUD operations for tournament management
 */

import { getSupabaseClient } from '@/lib/supabase/client';
import { categoriesMatch, normalizeRobotCategory } from '@/lib/categoryNormalization';
import { SecureMutationError, secureMutation } from './secureMutation';
import type {
  DbTournament,
  DbTournamentInsert,
  DbTournamentUpdate,
  TournamentWithParticipants,
  TournamentWithDetails,
  TournamentStatus,
} from '@/lib/supabase/database.types';

function isMissingTournamentColumnError(error: { message: string } | null, column: string) {
  if (!error) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes(column.toLowerCase()) &&
    (message.includes("schema cache") || message.includes("could not find"))
  );
}

interface TournamentMutationError {
  message: string;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
}

function withoutField<T extends object, K extends keyof T>(obj: T, field: K): Omit<T, K> {
  const copy = { ...obj } as T & Partial<Record<K, unknown>>;
  delete copy[field];
  return copy as Omit<T, K>;
}

const TOURNAMENT_SCHEMA_FALLBACK_COLUMNS = ['advance_per_group', 'date'] as const;

type TournamentMutationOperation = 'insert' | 'update';

async function mutateTournamentWithSchemaFallback(
  operation: TournamentMutationOperation,
  data: DbTournamentInsert | DbTournamentUpdate,
  id?: string
): Promise<{ data: DbTournament | null; error: TournamentMutationError | null }> {
  let mutationData = data;
  let tournament: DbTournament | null = null;
  let error: TournamentMutationError | null = null;
  const omittedColumns: string[] = [];

  while (true) {
    const match = operation === 'update' && id ? { id } : undefined;

    try {
      tournament = await secureMutation<DbTournament>({
        table: 'tournaments',
        operation,
        data: mutationData,
        match,
        single: true,
      });
      error = null;
      break;
    } catch (err) {
      if (err instanceof SecureMutationError) {
        error = {
          message: err.message,
          code: err.code,
          details: err.details,
          hint: err.hint,
        };
      } else {
        const message = err instanceof Error ? err.message : 'Unknown error';
        error = { message };
      }
    }

    const missingColumn = TOURNAMENT_SCHEMA_FALLBACK_COLUMNS.find(
      (column) =>
        isMissingTournamentColumnError(error, column) &&
        Object.prototype.hasOwnProperty.call(mutationData, column)
    );

    if (!missingColumn) {
      break;
    }

    omittedColumns.push(missingColumn);
    console.warn(
      `Tournaments ${operation} fallback: retrying without '${missingColumn}' due to schema cache drift.`
    );
    mutationData = withoutField(mutationData, missingColumn as keyof typeof mutationData);
  }

  if (error && omittedColumns.length > 0) {
    error = {
      message: `${error.message} (retry attempted without: ${omittedColumns.join(', ')})`,
    };
  }

  return { data: tournament, error };
}

// =============================================
// CREATE
// =============================================

export async function createTournament(
  data: DbTournamentInsert
): Promise<{ data: DbTournament | null; error: Error | null }> {
  const normalizedData: DbTournamentInsert = {
    ...data,
    category: normalizeRobotCategory(data.category),
  };

  const { data: tournament, error } = await mutateTournamentWithSchemaFallback(
    'insert',
    normalizedData
  );

  if (error) {
    console.error('Error creating tournament:', {
      code: error.code ?? null,
      message: error.message,
      details: error.details ?? null,
      hint: error.hint ?? null,
    });
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

  // Pagination
  const shouldPaginateInDb = !options?.category;
  if (shouldPaginateInDb && options?.limit) {
    query = query.limit(options.limit);
  }
  if (shouldPaginateInDb && options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching tournaments:', error);
    return { data: [], error: new Error(error.message), count: 0 };
  }

  let rows = data || [];
  if (options?.category) {
    rows = rows.filter((tournament: DbTournament) =>
      categoriesMatch(tournament.category, options.category)
    );
    const offset = options.offset || 0;
    const end = options.limit ? offset + options.limit : undefined;
    return {
      data: rows.slice(offset, end),
      error: null,
      count: rows.length,
    };
  }

  return { data: rows, error: null, count: count || 0 };
}

// =============================================
// UPDATE
// =============================================

export async function updateTournament(
  id: string,
  data: DbTournamentUpdate
): Promise<{ data: DbTournament | null; error: Error | null }> {
  const normalizedData: DbTournamentUpdate = {
    ...data,
    category:
      typeof data.category === 'string'
        ? normalizeRobotCategory(data.category)
        : data.category,
  };
  const { data: tournament, error } = await mutateTournamentWithSchemaFallback(
    'update',
    normalizedData,
    id
  );

  if (error) {
    console.error('Error updating tournament:', {
      code: error.code ?? null,
      message: error.message,
      details: error.details ?? null,
      hint: error.hint ?? null,
    });
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
  try {
    await secureMutation<null>({
      table: 'tournaments',
      operation: 'delete',
      match: { id },
      returning: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error deleting tournament:', message);
    return { error: new Error(message) };
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
    category: normalizeRobotCategory(original.category),
    venue: original.venue,
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
