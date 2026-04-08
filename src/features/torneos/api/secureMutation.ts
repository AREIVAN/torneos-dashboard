type WritableTable = 'tournaments' | 'tournament_participants' | 'matches' | 'standings';
type MutationOperation = 'insert' | 'update' | 'delete' | 'upsert';

interface SecureMutationRequest {
  table: WritableTable;
  operation: MutationOperation;
  data?: unknown;
  match?: Record<string, string | number | boolean | null>;
  select?: string;
  single?: boolean;
  returning?: boolean;
  onConflict?: string;
}

interface SecureMutationResponse<T> {
  data: T;
}

export interface SecureMutationErrorPayload {
  message: string;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
}

interface SecureMutationErrorResponse {
  error?: string | SecureMutationErrorPayload;
}

export class SecureMutationError extends Error {
  code: string | null;
  details: string | null;
  hint: string | null;

  constructor(payload: SecureMutationErrorPayload) {
    super(payload.message);
    this.name = 'SecureMutationError';
    this.code = payload.code ?? null;
    this.details = payload.details ?? null;
    this.hint = payload.hint ?? null;
  }
}

function toSecureMutationError(payload: SecureMutationErrorResponse | null): SecureMutationError {
  const raw = payload?.error;

  if (typeof raw === 'string') {
    return new SecureMutationError({ message: raw });
  }

  if (raw && typeof raw.message === 'string') {
    return new SecureMutationError(raw);
  }

  return new SecureMutationError({ message: 'Secure mutation failed' });
}

export async function secureMutation<T>(payload: SecureMutationRequest): Promise<T> {
  const response = await fetch('/api/torneos/secure-write', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const parsed = (await response.json().catch(() => null)) as
    | SecureMutationResponse<T>
    | SecureMutationErrorResponse
    | null;

  if (!response.ok) {
    throw toSecureMutationError(parsed as SecureMutationErrorResponse | null);
  }

  return (parsed as SecureMutationResponse<T>).data;
}
