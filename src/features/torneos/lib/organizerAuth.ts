interface OrganizerSessionResponse {
  isOrganizer?: boolean;
  success?: boolean;
}

export async function validateOrganizerToken(token: string): Promise<boolean> {
  const response = await fetch('/api/torneos/organizer/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    return false;
  }

  const payload = (await response.json()) as OrganizerSessionResponse;
  return Boolean(payload.success);
}

export async function hasOrganizerSession(): Promise<boolean> {
  const response = await fetch('/api/torneos/organizer/session', {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    return false;
  }

  const payload = (await response.json()) as OrganizerSessionResponse;
  return Boolean(payload.isOrganizer);
}
