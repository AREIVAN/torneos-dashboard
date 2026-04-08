-- =============================================
-- SECURITY PHASE 2: organizer-scoped auth tokens
-- - Unique hashed organizer tokens
-- - Per-tournament scopes
-- - Basic token/session revocation
-- =============================================

CREATE TABLE IF NOT EXISTS public.organizer_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT,
  token_hash TEXT NOT NULL UNIQUE,
  allow_all_tournaments BOOLEAN NOT NULL DEFAULT FALSE,
  allowed_tournament_ids UUID[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT organizer_tokens_scope_check
    CHECK (allow_all_tournaments OR cardinality(allowed_tournament_ids) > 0)
);

CREATE INDEX IF NOT EXISTS idx_organizer_tokens_active
  ON public.organizer_tokens (is_active, revoked_at, expires_at);

CREATE TABLE IF NOT EXISTS public.organizer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_token_id UUID NOT NULL REFERENCES public.organizer_tokens(id) ON DELETE CASCADE,
  allow_all_tournaments BOOLEAN NOT NULL DEFAULT FALSE,
  allowed_tournament_ids UUID[] NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT organizer_sessions_scope_check
    CHECK (allow_all_tournaments OR cardinality(allowed_tournament_ids) > 0)
);

CREATE INDEX IF NOT EXISTS idx_organizer_sessions_token
  ON public.organizer_sessions (organizer_token_id);

CREATE INDEX IF NOT EXISTS idx_organizer_sessions_active
  ON public.organizer_sessions (revoked_at, expires_at);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_organizer_tokens_updated_at ON public.organizer_tokens;
CREATE TRIGGER update_organizer_tokens_updated_at
  BEFORE UPDATE ON public.organizer_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_organizer_sessions_updated_at ON public.organizer_sessions;
CREATE TRIGGER update_organizer_sessions_updated_at
  BEFORE UPDATE ON public.organizer_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.organizer_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizer_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny organizer_tokens access" ON public.organizer_tokens;
CREATE POLICY "Deny organizer_tokens access" ON public.organizer_tokens
  FOR ALL
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny organizer_sessions access" ON public.organizer_sessions;
CREATE POLICY "Deny organizer_sessions access" ON public.organizer_sessions
  FOR ALL
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE public.organizer_tokens IS 'Organizer API tokens stored as salted hashes with tournament scopes';
COMMENT ON TABLE public.organizer_sessions IS 'Issued organizer sessions used by Next.js secure mutation route';
