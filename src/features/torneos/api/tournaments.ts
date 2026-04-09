/**
 * Tournaments API
 * CRUD operations for tournament management
 */

import { getSupabaseClient } from '@/lib/supabase/client';
import { categoriesMatch, normalizeRobotCategory } from '@/lib/categoryNormalization';
import { SecureMutationError, secureMutation } from './secureMutation';
import { getTournamentMatches } from './matches';
import { getParticipants } from './participants';
import { getTournamentStandings } from './standings';
import type {
  DbTournament,
  DbTournamentCompatRow,
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

const TOURNAMENT_SCHEMA_FALLBACK_COLUMNS = [
  'advance_per_group',
  'bracket_data',
  'snapshot',
  'date',
  'groups_count',
  'size',
  'status',
  'state',
  'public_slug',
  'spectator_token_hash',
  'organizer_key_hash',
] as const;

const TOURNAMENT_MAX_INSERT_RETRIES = 3;

type TournamentMutationOperation = 'insert' | 'update';

function normalizeSlugInput(value: string) {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return normalized.slice(0, 48) || 'torneo';
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

function randomHex(byteLength: number) {
  const bytes = new Uint8Array(byteLength);
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
    return bytesToHex(bytes);
  }

  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytesToHex(bytes);
}

function buildPublicSlug(name: string) {
  return `${normalizeSlugInput(name)}-${randomHex(3)}`;
}

async function sha256Hex(input: string) {
  if (typeof globalThis.crypto === 'undefined' || typeof globalThis.crypto.subtle?.digest !== 'function') {
    // Fallback for environments without Web Crypto API.
    return randomHex(32);
  }

  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return bytesToHex(new Uint8Array(digest));
}

async function ensureTournamentRequiredFields(data: DbTournamentInsert) {
  const enriched = { ...data } as DbTournamentInsert & {
    public_slug: string;
    spectator_token_hash: string;
    organizer_key_hash: string;
  };
  const current = enriched as unknown as Record<string, unknown>;

  const hasPublicSlug = typeof current.public_slug === 'string' && current.public_slug.trim().length > 0;
  if (!hasPublicSlug) {
    enriched.public_slug = buildPublicSlug(data.name);
  }

  const hasSpectatorTokenHash =
    typeof current.spectator_token_hash === 'string' && current.spectator_token_hash.trim().length > 0;
  if (!hasSpectatorTokenHash) {
    enriched.spectator_token_hash = `sha256:${await sha256Hex(randomHex(32))}`;
  }

  const hasOrganizerKeyHash =
    typeof current.organizer_key_hash === 'string' && current.organizer_key_hash.trim().length > 0;
  if (!hasOrganizerKeyHash) {
    enriched.organizer_key_hash = `sha256:${await sha256Hex(randomHex(32))}`;
  }

  return enriched as DbTournamentInsert;
}

function withRegeneratedPublicSlug(data: DbTournamentInsert) {
  const payload = { ...data } as DbTournamentInsert & { public_slug?: string };
  payload.public_slug = buildPublicSlug(data.name);
  return payload;
}

function isDuplicatePublicSlugError(error: TournamentMutationError | null) {
  if (!error) {
    return false;
  }

  const message = `${error.message} ${error.details || ''}`.toLowerCase();
  return error.code === '23505' && message.includes('public_slug');
}

function withLegacyTournamentSizeField<T extends DbTournamentInsert | DbTournamentUpdate>(
  data: T
): T {
  const legacyCompatibleData = { ...data } as Record<string, unknown>;

  if (Object.prototype.hasOwnProperty.call(legacyCompatibleData, 'size')) {
    if (!Object.prototype.hasOwnProperty.call(legacyCompatibleData, 'n')) {
      legacyCompatibleData.n = legacyCompatibleData.size;
    }
    delete legacyCompatibleData.size;
  }

  return legacyCompatibleData as T;
}

function withLegacyTournamentStatusField<T extends DbTournamentInsert | DbTournamentUpdate>(
  data: T
): T {
  const legacyCompatibleData = { ...data } as Record<string, unknown>;

  if (Object.prototype.hasOwnProperty.call(legacyCompatibleData, 'status')) {
    if (!Object.prototype.hasOwnProperty.call(legacyCompatibleData, 'state')) {
      legacyCompatibleData.state = legacyCompatibleData.status;
    }
    delete legacyCompatibleData.status;
  }

  return legacyCompatibleData as T;
}

function withLegacyTournamentDateField<T extends DbTournamentInsert | DbTournamentUpdate>(
  data: T
): T {
  const legacyCompatibleData = { ...data } as Record<string, unknown>;

  if (Object.prototype.hasOwnProperty.call(legacyCompatibleData, 'date')) {
    if (!Object.prototype.hasOwnProperty.call(legacyCompatibleData, 'event_date')) {
      legacyCompatibleData.event_date = legacyCompatibleData.date;
    }
    delete legacyCompatibleData.date;
  }

  return legacyCompatibleData as T;
}

function withLegacyTournamentGroupsField<T extends DbTournamentInsert | DbTournamentUpdate>(
  data: T
): T {
  const legacyCompatibleData = { ...data } as Record<string, unknown>;

  if (Object.prototype.hasOwnProperty.call(legacyCompatibleData, 'groups_count')) {
    if (!Object.prototype.hasOwnProperty.call(legacyCompatibleData, 'groups')) {
      legacyCompatibleData.groups = legacyCompatibleData.groups_count;
    }
    delete legacyCompatibleData.groups_count;
  }

  return legacyCompatibleData as T;
}

function withLegacyTournamentAdvanceField<T extends DbTournamentInsert | DbTournamentUpdate>(
  data: T
): T {
  const legacyCompatibleData = { ...data } as Record<string, unknown>;

  if (Object.prototype.hasOwnProperty.call(legacyCompatibleData, 'advance_per_group')) {
    if (!Object.prototype.hasOwnProperty.call(legacyCompatibleData, 'adv')) {
      legacyCompatibleData.adv = legacyCompatibleData.advance_per_group;
    }
    delete legacyCompatibleData.advance_per_group;
  }

  return legacyCompatibleData as T;
}

function withLegacyTournamentBracketField<T extends DbTournamentInsert | DbTournamentUpdate>(
  data: T
): T {
  const legacyCompatibleData = { ...data } as Record<string, unknown>;

  if (Object.prototype.hasOwnProperty.call(legacyCompatibleData, 'bracket_data')) {
    if (!Object.prototype.hasOwnProperty.call(legacyCompatibleData, 'snapshot')) {
      legacyCompatibleData.snapshot = legacyCompatibleData.bracket_data;
    }
    delete legacyCompatibleData.bracket_data;
  }

  return legacyCompatibleData as T;
}

function withModernTournamentBracketField<T extends DbTournamentInsert | DbTournamentUpdate>(
  data: T
): T {
  const modernCompatibleData = { ...data } as Record<string, unknown>;

  if (Object.prototype.hasOwnProperty.call(modernCompatibleData, 'snapshot')) {
    if (!Object.prototype.hasOwnProperty.call(modernCompatibleData, 'bracket_data')) {
      modernCompatibleData.bracket_data = modernCompatibleData.snapshot;
    }
    delete modernCompatibleData.snapshot;
  }

  return modernCompatibleData as T;
}

function normalizeTournamentRow(row: DbTournamentCompatRow | null): DbTournament | null {
  if (!row) return null;

  return {
    ...(row as DbTournament),
    date: row.date ?? row.event_date ?? null,
    size: row.size ?? row.n ?? 0,
    groups_count: row.groups_count ?? row.groups ?? null,
    advance_per_group: row.advance_per_group ?? row.adv ?? null,
    status: row.status ?? row.state ?? 'draft',
    bracket_data: row.bracket_data ?? row.snapshot ?? null,
  };
}

async function mutateTournamentWithSchemaFallback(
  operation: TournamentMutationOperation,
  data: DbTournamentInsert | DbTournamentUpdate,
  id?: string
): Promise<{ data: DbTournament | null; error: TournamentMutationError | null }> {
  let mutationData = withLegacyTournamentBracketField(data);
  let tournament: DbTournament | null = null;
  let error: TournamentMutationError | null = null;
  const omittedColumns: string[] = [];

  while (true) {
    const match = operation === 'update' && id ? { id } : undefined;

    try {
      tournament = normalizeTournamentRow(
        await secureMutation<DbTournamentCompatRow>({
          table: 'tournaments',
          operation,
          data: mutationData,
          match,
          single: true,
        })
      );
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

    if (missingColumn === 'size') {
      omittedColumns.push('size->n');
      console.warn(
        `Tournaments ${operation} fallback: retrying with legacy 'n' field because 'size' is missing in schema cache.`
      );
      mutationData = withLegacyTournamentSizeField(mutationData);
    } else if (missingColumn === 'status') {
      omittedColumns.push('status->state');
      console.warn(
        `Tournaments ${operation} fallback: retrying with legacy 'state' field because 'status' is missing in schema cache.`
      );
      mutationData = withLegacyTournamentStatusField(mutationData);
    } else if (missingColumn === 'date') {
      omittedColumns.push('date->event_date');
      console.warn(
        `Tournaments ${operation} fallback: retrying with legacy 'event_date' field because 'date' is missing in schema cache.`
      );
      mutationData = withLegacyTournamentDateField(mutationData);
    } else if (missingColumn === 'groups_count') {
      omittedColumns.push('groups_count->groups');
      console.warn(
        `Tournaments ${operation} fallback: retrying with legacy 'groups' field because 'groups_count' is missing in schema cache.`
      );
      mutationData = withLegacyTournamentGroupsField(mutationData);
    } else if (missingColumn === 'advance_per_group') {
      omittedColumns.push('advance_per_group->adv');
      console.warn(
        `Tournaments ${operation} fallback: retrying with legacy 'adv' field because 'advance_per_group' is missing in schema cache.`
      );
      mutationData = withLegacyTournamentAdvanceField(mutationData);
    } else if (missingColumn === 'bracket_data') {
      omittedColumns.push('bracket_data->snapshot');
      console.warn(
        `Tournaments ${operation} fallback: retrying with legacy 'snapshot' field because 'bracket_data' is missing in schema cache.`
      );
      mutationData = withLegacyTournamentBracketField(mutationData);
    } else if (missingColumn === 'snapshot') {
      omittedColumns.push('snapshot->bracket_data');
      console.warn(
        `Tournaments ${operation} fallback: retrying with modern 'bracket_data' field because 'snapshot' is missing in schema cache.`
      );
      mutationData = withModernTournamentBracketField(mutationData);
    } else {
      omittedColumns.push(missingColumn);
      console.warn(
        `Tournaments ${operation} fallback: retrying without '${missingColumn}' due to schema cache drift.`
      );
      mutationData = withoutField(mutationData, missingColumn as keyof typeof mutationData);
    }
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
  const normalizedData = await ensureTournamentRequiredFields({
    ...data,
    category: normalizeRobotCategory(data.category),
  });

  let mutationData: DbTournamentInsert = normalizedData;
  let lastError: TournamentMutationError | null = null;

  for (let attempt = 0; attempt < TOURNAMENT_MAX_INSERT_RETRIES; attempt += 1) {
    const { data: tournament, error } = await mutateTournamentWithSchemaFallback('insert', mutationData);
    if (!error) {
      return { data: tournament, error: null };
    }

    lastError = error;
    if (!isDuplicatePublicSlugError(error) || attempt === TOURNAMENT_MAX_INSERT_RETRIES - 1) {
      break;
    }

    mutationData = withRegeneratedPublicSlug(mutationData);
  }

  console.error('Error creating tournament:', {
    code: lastError?.code ?? null,
    message: lastError?.message || 'Unknown error',
    details: lastError?.details ?? null,
    hint: lastError?.hint ?? null,
  });

  return { data: null, error: new Error(lastError?.message || 'Unknown error') };
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

  return { data: normalizeTournamentRow(tournament as DbTournamentCompatRow), error: null };
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

  const participantsRes = await getParticipants(id);
  if (participantsRes.error) {
    return { data: null, error: participantsRes.error };
  }

  return {
    data: {
      ...(normalizeTournamentRow(tournament as DbTournamentCompatRow) as DbTournament),
      participants: participantsRes.data,
    },
    error: null,
  };
}

export async function getTournamentWithDetails(
  id: string
): Promise<{ data: TournamentWithDetails | null; error: Error | null }> {
  // Fetch all data in parallel
  const [tournamentRes, participantsRes, matchesRes, standingsRes] = await Promise.all([
    getSupabaseClient().from('tournaments').select('*').eq('id', id).single(),
    getParticipants(id),
    getTournamentMatches(id),
    getTournamentStandings(id),
  ]);

  if (tournamentRes.error) {
    console.error('Error fetching tournament:', tournamentRes.error);
    return { data: null, error: new Error(tournamentRes.error.message) };
  }

  if (participantsRes.error) {
    return { data: null, error: participantsRes.error };
  }

  if (matchesRes.error) {
    return { data: null, error: matchesRes.error };
  }

  if (standingsRes.error) {
    return { data: null, error: standingsRes.error };
  }

  return {
    data: {
      ...(normalizeTournamentRow(tournamentRes.data as DbTournamentCompatRow) as DbTournament),
      participants: participantsRes.data,
      matches: matchesRes.data,
      standings: standingsRes.data,
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

  let rows = ((data || []) as DbTournamentCompatRow[]).map(
    (row) => normalizeTournamentRow(row) as DbTournament
  );
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
