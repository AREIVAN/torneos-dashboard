import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  canUseLegacyOrganizerFallback,
  createOrganizerToken,
  hasActiveOrganizerTokens,
  ORGANIZER_SESSION_COOKIE,
  revokeOrganizerSession,
  revokeOrganizerToken,
  validateLegacyBootstrapToken,
  verifyOrganizerSessionToken,
} from '@/features/torneos/lib/organizerSession.server';

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    label?: unknown;
    allowAllTournaments?: unknown;
    allowedTournamentIds?: unknown;
    expiresInDays?: unknown;
    bootstrapToken?: unknown;
  } | null;

  const allowAllTournaments = body?.allowAllTournaments === true;
  const allowedTournamentIds = Array.isArray(body?.allowedTournamentIds)
    ? Array.from(
        new Set(
          body.allowedTournamentIds
            .filter((value): value is string => typeof value === 'string' && isUuid(value))
            .map((value) => value.toLowerCase())
        )
      )
    : [];

  if (!allowAllTournaments && allowedTournamentIds.length === 0) {
    return NextResponse.json({ error: 'Token scope must include at least one tournament id' }, { status: 400 });
  }

  if (typeof body?.label !== 'undefined' && typeof body.label !== 'string') {
    return NextResponse.json({ error: 'Invalid label' }, { status: 400 });
  }

  const trimmedLabel = typeof body?.label === 'string' ? body.label.trim() : '';
  if (trimmedLabel.length > 80) {
    return NextResponse.json({ error: 'Label is too long (max 80 chars)' }, { status: 400 });
  }

  const expiresInDays =
    typeof body?.expiresInDays === 'number' && Number.isInteger(body.expiresInDays)
      ? body.expiresInDays
      : 90;

  if (expiresInDays < 1 || expiresInDays > 365) {
    return NextResponse.json({ error: 'expiresInDays must be an integer between 1 and 365' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ORGANIZER_SESSION_COOKIE)?.value;
  const session = await verifyOrganizerSessionToken(sessionCookie);
  const hasTokens = await hasActiveOrganizerTokens();

  let authorized = Boolean(session);
  if (!authorized && !hasTokens) {
    const bootstrapToken = typeof body?.bootstrapToken === 'string' ? body.bootstrapToken : '';
    authorized = validateLegacyBootstrapToken(bootstrapToken) && (await canUseLegacyOrganizerFallback());
  }

  if (!authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

  let created;
  try {
    created = await createOrganizerToken({
      label: trimmedLabel || undefined,
      allowAllTournaments,
      allowedTournamentIds,
      expiresAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create organizer token' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    token: created.token,
    tokenMeta: {
      id: created.id,
      allowAllTournaments: created.allowAllTournaments,
      allowedTournamentIds: created.allowedTournamentIds,
      expiresAt: created.expiresAt,
      createdAt: created.createdAt,
    },
  });
}

export async function DELETE(request: Request) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ORGANIZER_SESSION_COOKIE)?.value;
  const session = await verifyOrganizerSessionToken(sessionCookie);

  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    tokenId?: unknown;
    sessionId?: unknown;
  } | null;

  const tokenId = typeof body?.tokenId === 'string' ? body.tokenId : null;
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : null;

  if (tokenId) {
    if (!isUuid(tokenId)) {
      return NextResponse.json({ error: 'Invalid tokenId' }, { status: 400 });
    }

    try {
      await revokeOrganizerToken(tokenId);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to revoke token' },
        { status: 400 }
      );
    }

    if (session.tokenId === tokenId) {
      cookieStore.delete(ORGANIZER_SESSION_COOKIE);
    }

    return NextResponse.json({ success: true, revoked: { tokenId } });
  }

  const targetSessionId = sessionId || session.sessionId;
  if (!targetSessionId || !isUuid(targetSessionId)) {
    cookieStore.delete(ORGANIZER_SESSION_COOKIE);
    return NextResponse.json({ success: true, revoked: { currentCookieOnly: true } });
  }

  await revokeOrganizerSession(targetSessionId);
  if (session.sessionId === targetSessionId) {
    cookieStore.delete(ORGANIZER_SESSION_COOKIE);
  }

  return NextResponse.json({ success: true, revoked: { sessionId: targetSessionId } });
}
