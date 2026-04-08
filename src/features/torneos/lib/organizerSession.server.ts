import 'server-only';

import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const ORGANIZER_SESSION_COOKIE = 'td_org_session';
const ORGANIZER_SESSION_TTL_SECONDS = 60 * 60 * 12;
const LEGACY_ORGANIZER_FALLBACK_TOKEN = 'areivan';
const MIN_TOKEN_LENGTH = 8;
const MAX_TOKEN_LENGTH = 256;
const TOKEN_HASH_SCHEME = 'scrypt';

export interface OrganizerScope {
  allowAllTournaments: boolean;
  allowedTournamentIds: string[];
}

export interface OrganizerSessionContext extends OrganizerScope {
  tokenId: string | null;
  sessionId: string | null;
  legacy: boolean;
}

interface OrganizerTokenValidationResult {
  tokenId: string | null;
  scope: OrganizerScope;
  legacy: boolean;
}

interface OrganizerTokenRow {
  id: string;
  token_hash: string;
  allow_all_tournaments: boolean;
  allowed_tournament_ids: string[] | null;
  expires_at: string | null;
  revoked_at: string | null;
  is_active: boolean;
}

interface OrganizerSessionPayload {
  role: 'organizer';
  type: 'organizer-session';
  sid: string;
  tid: string | null;
  all: boolean;
  scope: string[];
  legacy: boolean;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getLegacyOrganizerTokenSecret() {
  return process.env.ORGANIZER_MODE_TOKEN || process.env.JWT_SECRET || LEGACY_ORGANIZER_FALLBACK_TOKEN;
}

function getOrganizerSessionSecret() {
  return process.env.ORGANIZER_SESSION_SECRET || process.env.JWT_SECRET || null;
}

function timingSafeEquals(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

export function isOrganizerTokenConfigured() {
  return Boolean(getOrganizerSessionSecret());
}

function normalizeScope(scope: { allowAllTournaments: boolean; allowedTournamentIds: string[] | null | undefined }): OrganizerScope {
  return {
    allowAllTournaments: scope.allowAllTournaments,
    allowedTournamentIds: Array.from(
      new Set((scope.allowedTournamentIds || []).filter((id) => typeof id === 'string' && isUuid(id)).map((id) => id.toLowerCase()))
    ),
  };
}

function hashOrganizerToken(rawToken: string) {
  const salt = crypto.randomBytes(16).toString('base64url');
  const hash = crypto.scryptSync(rawToken, salt, 32).toString('base64url');
  return `${TOKEN_HASH_SCHEME}:${salt}:${hash}`;
}

function verifyOrganizerTokenHash(rawToken: string, hashedToken: string) {
  const [scheme, salt, expectedHash] = hashedToken.split(':');
  if (!scheme || !salt || !expectedHash || scheme !== TOKEN_HASH_SCHEME) {
    return false;
  }

  const derivedHash = crypto.scryptSync(rawToken, salt, 32).toString('base64url');
  return timingSafeEquals(derivedHash, expectedHash);
}

function normalizeTokenInput(token: string) {
  const normalizedToken = token.trim();
  if (normalizedToken.length === 0 || normalizedToken.length > MAX_TOKEN_LENGTH) {
    return null;
  }
  return normalizedToken;
}

async function getActiveOrganizerTokens() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('organizer_tokens')
    .select('id, token_hash, allow_all_tournaments, allowed_tournament_ids, expires_at, revoked_at, is_active')
    .is('revoked_at', null)
    .eq('is_active', true);

  if (error) {
    throw new Error(`Failed to load organizer tokens: ${error.message}`);
  }

  const now = Date.now();
  return ((data || []) as OrganizerTokenRow[]).filter((row) => {
    if (!row.expires_at) return true;
    const expiresAt = Date.parse(row.expires_at);
    return Number.isFinite(expiresAt) && expiresAt > now;
  });
}

function validateLegacyFallbackToken(token: string) {
  const configuredToken = getLegacyOrganizerTokenSecret();
  if (!configuredToken) {
    return false;
  }

  return timingSafeEquals(token, configuredToken);
}

export async function hasActiveOrganizerTokens() {
  const rows = await getActiveOrganizerTokens();
  return rows.length > 0;
}

export async function canUseLegacyOrganizerFallback() {
  const hasTokens = await hasActiveOrganizerTokens();
  return !hasTokens;
}

export async function validateOrganizerTokenServer(token: string): Promise<OrganizerTokenValidationResult | null> {
  const normalizedToken = normalizeTokenInput(token);
  if (!normalizedToken) {
    return null;
  }

  // Keep legacy global token compatibility even if the token is shorter
  // than modern organizer token minimum length.
  if (validateLegacyFallbackToken(normalizedToken)) {
    return {
      tokenId: null,
      scope: {
        allowAllTournaments: true,
        allowedTournamentIds: [],
      },
      legacy: true,
    };
  }

  if (normalizedToken.length < MIN_TOKEN_LENGTH) {
    return null;
  }

  const tokens = await getActiveOrganizerTokens();
  for (const row of tokens) {
    if (!verifyOrganizerTokenHash(normalizedToken, row.token_hash)) {
      continue;
    }

    return {
      tokenId: row.id,
      scope: normalizeScope({
        allowAllTournaments: row.allow_all_tournaments,
        allowedTournamentIds: row.allowed_tournament_ids,
      }),
      legacy: false,
    };
  }

  return null;
}

export async function createOrganizerSessionToken(validation: OrganizerTokenValidationResult) {
  const sessionSecret = getOrganizerSessionSecret();
  if (!sessionSecret) {
    throw new Error('Missing organizer session secret');
  }

  let sessionId: string = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + ORGANIZER_SESSION_TTL_SECONDS * 1000).toISOString();

  if (!validation.legacy) {
    if (!validation.tokenId) {
      throw new Error('Missing organizer token id for session creation');
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('organizer_sessions')
      .insert({
        organizer_token_id: validation.tokenId,
        allow_all_tournaments: validation.scope.allowAllTournaments,
        allowed_tournament_ids: validation.scope.allowedTournamentIds,
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (error || !data?.id) {
      throw new Error(`Failed to create organizer session: ${error?.message || 'Unknown error'}`);
    }

    sessionId = data.id as string;
  }

  const payload: OrganizerSessionPayload = {
    role: 'organizer',
    type: 'organizer-session',
    sid: sessionId,
    tid: validation.tokenId,
    all: validation.scope.allowAllTournaments,
    scope: validation.scope.allowedTournamentIds,
    legacy: validation.legacy,
  };

  return jwt.sign(payload, sessionSecret, {
    expiresIn: ORGANIZER_SESSION_TTL_SECONDS,
  });
}

function parseSessionPayload(payload: unknown): OrganizerSessionPayload | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = payload as Partial<OrganizerSessionPayload>;
  if (
    candidate.role !== 'organizer' ||
    candidate.type !== 'organizer-session' ||
    typeof candidate.sid !== 'string' ||
    typeof candidate.all !== 'boolean' ||
    !Array.isArray(candidate.scope)
  ) {
    return null;
  }

  return {
    role: 'organizer',
    type: 'organizer-session',
    sid: candidate.sid,
    tid: typeof candidate.tid === 'string' ? candidate.tid : null,
    all: candidate.all,
    scope: candidate.scope.filter((value): value is string => typeof value === 'string'),
    legacy: Boolean(candidate.legacy),
  };
}

export async function verifyOrganizerSessionToken(token?: string): Promise<OrganizerSessionContext | null> {
  const sessionSecret = getOrganizerSessionSecret();
  if (!sessionSecret || !token) {
    return null;
  }

  try {
    const payload = parseSessionPayload(jwt.verify(token, sessionSecret));
    if (!payload) {
      return null;
    }

    if (payload.legacy) {
      return {
        tokenId: null,
        sessionId: null,
        legacy: true,
        allowAllTournaments: true,
        allowedTournamentIds: [],
      };
    }

    if (!payload.tid || !isUuid(payload.sid) || !isUuid(payload.tid)) {
      return null;
    }

    const supabase = getSupabaseServerClient();
    const [sessionRes, tokenRes] = await Promise.all([
      supabase
        .from('organizer_sessions')
        .select('id, organizer_token_id, allow_all_tournaments, allowed_tournament_ids, expires_at, revoked_at')
        .eq('id', payload.sid as `${string}-${string}-${string}-${string}-${string}`)
        .single(),
      supabase
        .from('organizer_tokens')
        .select('id, allow_all_tournaments, allowed_tournament_ids, expires_at, revoked_at, is_active')
        .eq('id', payload.tid as `${string}-${string}-${string}-${string}-${string}`)
        .single(),
    ]);

    if (sessionRes.error || !sessionRes.data) {
      return null;
    }
    if (tokenRes.error || !tokenRes.data) {
      return null;
    }

    const now = Date.now();
    const sessionExpiresAt = Date.parse(sessionRes.data.expires_at);
    const tokenExpiresAt = tokenRes.data.expires_at ? Date.parse(tokenRes.data.expires_at) : Number.POSITIVE_INFINITY;

    if (
      sessionRes.data.revoked_at ||
      tokenRes.data.revoked_at ||
      !tokenRes.data.is_active ||
      !Number.isFinite(sessionExpiresAt) ||
      sessionExpiresAt <= now ||
      tokenExpiresAt <= now
    ) {
      return null;
    }

    if (sessionRes.data.organizer_token_id !== tokenRes.data.id) {
      return null;
    }

    const scope = normalizeScope({
      allowAllTournaments: sessionRes.data.allow_all_tournaments,
      allowedTournamentIds: sessionRes.data.allowed_tournament_ids,
    });

    if (payload.all !== scope.allowAllTournaments) {
      return null;
    }

    const payloadScope = new Set(payload.scope.map((id) => id.toLowerCase()));
    const sessionScope = new Set(scope.allowedTournamentIds.map((id) => id.toLowerCase()));
    if (payloadScope.size !== sessionScope.size) {
      return null;
    }
    for (const id of payloadScope) {
      if (!sessionScope.has(id)) {
        return null;
      }
    }

    return {
      tokenId: tokenRes.data.id,
      sessionId: sessionRes.data.id,
      legacy: false,
      allowAllTournaments: scope.allowAllTournaments,
      allowedTournamentIds: scope.allowedTournamentIds,
    };
  } catch {
    return null;
  }
}

export async function revokeOrganizerSession(sessionId: string) {
  if (!isUuid(sessionId)) {
    return;
  }

  const supabase = getSupabaseServerClient();
  await supabase
    .from('organizer_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', sessionId)
    .is('revoked_at', null);
}

export async function revokeOrganizerToken(tokenId: string) {
  if (!isUuid(tokenId)) {
    throw new Error('Invalid token id');
  }

  const supabase = getSupabaseServerClient();
  const revokedAt = new Date().toISOString();

  const { error } = await supabase
    .from('organizer_tokens')
    .update({ revoked_at: revokedAt, is_active: false })
    .eq('id', tokenId)
    .is('revoked_at', null);

  if (error) {
    throw new Error(`Failed to revoke organizer token: ${error.message}`);
  }

  await supabase
    .from('organizer_sessions')
    .update({ revoked_at: revokedAt })
    .eq('organizer_token_id', tokenId)
    .is('revoked_at', null);
}

export async function createOrganizerToken(input: {
  label?: string;
  allowAllTournaments: boolean;
  allowedTournamentIds: string[];
  expiresAt?: string | null;
}) {
  const normalizedScope = normalizeScope({
    allowAllTournaments: input.allowAllTournaments,
    allowedTournamentIds: input.allowedTournamentIds,
  });

  if (!normalizedScope.allowAllTournaments && normalizedScope.allowedTournamentIds.length === 0) {
    throw new Error('Token scope must include at least one tournament');
  }

  const plainToken = `tdo_${crypto.randomBytes(24).toString('base64url')}`;
  const hashedToken = hashOrganizerToken(plainToken);

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('organizer_tokens')
    .insert({
      label: input.label?.trim() || null,
      token_hash: hashedToken,
      allow_all_tournaments: normalizedScope.allowAllTournaments,
      allowed_tournament_ids: normalizedScope.allowedTournamentIds,
      expires_at: input.expiresAt || null,
    })
    .select('id, allow_all_tournaments, allowed_tournament_ids, expires_at, created_at')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create organizer token: ${error?.message || 'Unknown error'}`);
  }

  return {
    id: data.id as string,
    token: plainToken,
    allowAllTournaments: Boolean(data.allow_all_tournaments),
    allowedTournamentIds: (data.allowed_tournament_ids || []) as string[],
    expiresAt: (data.expires_at as string | null) || null,
    createdAt: data.created_at as string,
  };
}

export function validateLegacyBootstrapToken(token: string) {
  const normalizedToken = normalizeTokenInput(token);
  if (!normalizedToken) {
    return false;
  }

  return validateLegacyFallbackToken(normalizedToken);
}

export const organizerSessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: ORGANIZER_SESSION_TTL_SECONDS,
};
