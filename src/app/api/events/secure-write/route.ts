import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  ORGANIZER_SESSION_COOKIE,
  verifyOrganizerSessionToken,
} from '@/features/torneos/lib/organizerSession.server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

interface EventWritePayload {
  name: string;
  start_at: string;
  end_at?: string | null;
  timezone?: string | null;
  venue?: string | null;
  city?: string | null;
  address?: string | null;
  categories?: string[] | null;
  tags?: string[] | null;
  poster_url?: string | null;
  official_url?: string | null;
  registration_url?: string | null;
  rules_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  fee?: string | null;
  description?: string | null;
  is_public?: boolean;
}

function normalizeOptionalText(value: unknown) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalStringArray(value: unknown) {
  if (value == null) return null;
  if (!Array.isArray(value)) return null;

  const normalized = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return normalized.length > 0 ? normalized : null;
}

function normalizePayload(value: unknown): { data: EventWritePayload | null; error: string | null } {
  if (!value || typeof value !== 'object') {
    return { data: null, error: 'Payload invalido' };
  }

  const input = value as Record<string, unknown>;
  const name = normalizeOptionalText(input.name);
  if (!name) {
    return { data: null, error: 'El nombre del evento es requerido' };
  }

  const startAt = normalizeOptionalText(input.start_at);
  if (!startAt) {
    return { data: null, error: 'La fecha de inicio es requerida' };
  }

  const startAtTime = Date.parse(startAt);
  if (!Number.isFinite(startAtTime)) {
    return { data: null, error: 'La fecha de inicio es invalida' };
  }

  const endAt = normalizeOptionalText(input.end_at);
  if (endAt) {
    const endAtTime = Date.parse(endAt);
    if (!Number.isFinite(endAtTime)) {
      return { data: null, error: 'La fecha de fin es invalida' };
    }
    if (endAtTime < startAtTime) {
      return { data: null, error: 'La fecha de fin no puede ser anterior al inicio' };
    }
  }

  return {
    data: {
      name,
      start_at: startAt,
      end_at: endAt,
      timezone: normalizeOptionalText(input.timezone) || 'America/Mexico_City',
      venue: normalizeOptionalText(input.venue),
      city: normalizeOptionalText(input.city),
      address: normalizeOptionalText(input.address),
      categories: normalizeOptionalStringArray(input.categories),
      tags: normalizeOptionalStringArray(input.tags),
      poster_url: normalizeOptionalText(input.poster_url),
      official_url: normalizeOptionalText(input.official_url),
      registration_url: normalizeOptionalText(input.registration_url),
      rules_url: normalizeOptionalText(input.rules_url),
      contact_email: normalizeOptionalText(input.contact_email),
      contact_phone: normalizeOptionalText(input.contact_phone),
      fee: normalizeOptionalText(input.fee),
      description: normalizeOptionalText(input.description),
      is_public: typeof input.is_public === 'boolean' ? input.is_public : true,
    },
    error: null,
  };
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ORGANIZER_SESSION_COOKIE)?.value;
    const session = await verifyOrganizerSessionToken(token);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const { data: payload, error: payloadError } = normalizePayload(body);

    if (payloadError || !payload) {
      return NextResponse.json({ error: payloadError || 'Payload invalido' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from('events').insert(payload).select('*').single();

    if (error) {
      return NextResponse.json({ error: 'No se pudo crear el evento' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error interno al crear el evento' }, { status: 500 });
  }
}
