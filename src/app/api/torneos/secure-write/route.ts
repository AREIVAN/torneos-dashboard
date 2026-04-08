import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  ORGANIZER_SESSION_COOKIE,
  verifyOrganizerSessionToken,
} from '@/features/torneos/lib/organizerSession.server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type WritableTable = 'tournaments' | 'tournament_participants' | 'matches' | 'standings';
type MutationOperation = 'insert' | 'update' | 'delete' | 'upsert';

interface SecureWriteBody {
  table: WritableTable;
  operation: MutationOperation;
  data?: Record<string, unknown> | Array<Record<string, unknown>>;
  match?: Record<string, string | number | boolean | null>;
  select?: string;
  single?: boolean;
  returning?: boolean;
  onConflict?: string;
}

interface SupabaseMutationError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

const ALLOWED_TABLES: WritableTable[] = ['tournaments', 'tournament_participants', 'matches', 'standings'];

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toRows(data: SecureWriteBody['data']) {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

function readTournamentIdsFromRows(table: WritableTable, rows: Array<Record<string, unknown>>) {
  const ids = new Set<string>();

  for (const row of rows) {
    if (table === 'tournaments') {
      const idValue = row.id;
      if (typeof idValue === 'string' && isUuid(idValue)) {
        ids.add(idValue.toLowerCase());
      }
      continue;
    }

    const tournamentId = row.tournament_id;
    if (typeof tournamentId === 'string' && isUuid(tournamentId)) {
      ids.add(tournamentId.toLowerCase());
    }
  }

  return ids;
}

async function resolveTournamentIdFromMatch(
  table: WritableTable,
  match: Record<string, string | number | boolean | null>,
  supabase: ReturnType<typeof getSupabaseServerClient>
) {
  const tournamentId = match.tournament_id;
  if (typeof tournamentId === 'string' && isUuid(tournamentId)) {
    return tournamentId.toLowerCase();
  }

  const rowId = match.id;
  if (typeof rowId !== 'string' || !isUuid(rowId)) {
    return null;
  }

  if (table === 'tournaments') {
    return rowId.toLowerCase();
  }

  const { data, error } = await supabase.from(table).select('tournament_id').eq('id', rowId).single();
  if (error || !data || typeof data.tournament_id !== 'string' || !isUuid(data.tournament_id)) {
    return null;
  }

  return data.tournament_id.toLowerCase();
}

async function resolveMutationTournamentIds(
  body: SecureWriteBody,
  supabase: ReturnType<typeof getSupabaseServerClient>
) {
  const ids = readTournamentIdsFromRows(body.table, toRows(body.data));

  if (body.match) {
    const resolved = await resolveTournamentIdFromMatch(body.table, body.match, supabase);
    if (resolved) {
      ids.add(resolved);
    }
  }

  return Array.from(ids);
}

function validatePayload(body: SecureWriteBody | null) {
  if (!body || !ALLOWED_TABLES.includes(body.table) || !body.operation) {
    return 'Invalid request payload';
  }

  if ((body.operation === 'update' || body.operation === 'delete') && (!body.match || Object.keys(body.match).length === 0)) {
    return 'Missing match for update/delete';
  }

  if ((body.operation === 'insert' || body.operation === 'upsert') && !body.data) {
    return `Missing data for ${body.operation}`;
  }

  if (body.operation === 'update' && body.data) {
    const rows = toRows(body.data);
    const changingTournamentId = rows.some((row) => Object.prototype.hasOwnProperty.call(row, 'tournament_id'));
    if (changingTournamentId) {
      return 'Changing tournament_id is not allowed';
    }
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ORGANIZER_SESSION_COOKIE)?.value;
    const session = await verifyOrganizerSessionToken(token);
    if (!session) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as SecureWriteBody | null;
    const payloadError = validatePayload(body);
    if (payloadError || !body) {
      return NextResponse.json({ error: payloadError || 'Invalid request payload' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const mutationTournamentIds = await resolveMutationTournamentIds(body, supabase);
    const mutationData = body.data;
    const mutationMatch = body.match;

    if (!session.allowAllTournaments) {
      const creatingTournament = body.table === 'tournaments' && body.operation === 'insert';
      if (creatingTournament) {
        return NextResponse.json({ error: 'Creating tournaments requires global organizer scope' }, { status: 403 });
      }

      if (mutationTournamentIds.length === 0) {
        return NextResponse.json({ error: 'Unable to resolve tournament scope from payload' }, { status: 400 });
      }

      const allowed = new Set(session.allowedTournamentIds.map((id) => id.toLowerCase()));
      const outOfScope = mutationTournamentIds.find((id) => !allowed.has(id));
      if (outOfScope) {
        return NextResponse.json({ error: 'Forbidden tournament scope' }, { status: 403 });
      }
    }

    let query: unknown;
    const shouldReturnRows = body.returning ?? true;

    switch (body.operation) {
      case 'insert': {
        query = supabase.from(body.table).insert(mutationData!);
        break;
      }
      case 'update': {
        query = supabase.from(body.table).update(mutationData!).match(mutationMatch!);
        break;
      }
      case 'delete': {
        query = supabase.from(body.table).delete();
        query = (query as { match: (value: Record<string, unknown>) => unknown }).match(mutationMatch!);
        break;
      }
      case 'upsert': {
        query = supabase.from(body.table).upsert(mutationData!, {
          onConflict: body.onConflict,
        });
        break;
      }
      default:
        return NextResponse.json({ error: 'Unsupported operation' }, { status: 400 });
    }

    if (shouldReturnRows) {
      query = (query as { select: (value: string) => unknown }).select(body.select || '*');
      if (body.single) {
        query = (query as { single: () => unknown }).single();
      }
    }

    const { data, error } = await (query as Promise<{ data: unknown; error: SupabaseMutationError | null }>);
    if (error) {
      return NextResponse.json(
        {
          error: {
            code: error.code ?? null,
            message: error.message,
            details: error.details ?? null,
            hint: error.hint ?? null,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Secure write failed' }, { status: 500 });
  }
}
