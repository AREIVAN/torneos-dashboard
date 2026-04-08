import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  createOrganizerSessionToken,
  isOrganizerTokenConfigured,
  ORGANIZER_SESSION_COOKIE,
  organizerSessionCookieOptions,
  revokeOrganizerSession,
  validateOrganizerTokenServer,
  verifyOrganizerSessionToken,
} from '@/features/torneos/lib/organizerSession.server';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ORGANIZER_SESSION_COOKIE)?.value;
    const session = await verifyOrganizerSessionToken(token);

    return NextResponse.json({
      isOrganizer: Boolean(session),
      scope: session
        ? {
            allowAllTournaments: session.allowAllTournaments,
            allowedTournamentIds: session.allowedTournamentIds,
            legacy: session.legacy,
          }
        : null,
    });
  } catch {
    return NextResponse.json({ isOrganizer: false, scope: null }, { status: 200 });
  }
}

export async function POST(request: Request) {
  if (!isOrganizerTokenConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error: 'Organizer mode is not configured on server',
      },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  const inputToken = typeof body?.token === 'string' ? body.token : '';

  if (!inputToken) {
    return NextResponse.json(
      {
        success: false,
        error: 'Token invalido',
      },
      { status: 400 }
    );
  }

  let validation = null;
  try {
    validation = await validateOrganizerTokenServer(inputToken);
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Token validation failed',
      },
      { status: 500 }
    );
  }

  if (!validation) {
    return NextResponse.json(
      {
        success: false,
        error: 'Token invalido',
      },
      { status: 401 }
    );
  }

  const cookieStore = await cookies();
  try {
    cookieStore.set(
      ORGANIZER_SESSION_COOKIE,
      await createOrganizerSessionToken(validation),
      organizerSessionCookieOptions
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create organizer session',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    scope: {
      allowAllTournaments: validation.scope.allowAllTournaments,
      allowedTournamentIds: validation.scope.allowedTournamentIds,
      legacy: validation.legacy,
    },
  });
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ORGANIZER_SESSION_COOKIE)?.value;
    const session = await verifyOrganizerSessionToken(token);

    if (session?.sessionId) {
      await revokeOrganizerSession(session.sessionId);
    }

    cookieStore.delete(ORGANIZER_SESSION_COOKIE);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
