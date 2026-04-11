-- =============================================
-- SECURITY: lock events writes to server
-- - Keep public read access
-- - Remove direct client write access from anon/authenticated roles
-- =============================================

DO $$
DECLARE
  events_policy RECORD;
BEGIN
  IF to_regclass('public.events') IS NULL THEN
    RAISE NOTICE 'Table public.events does not exist; skipping events write lock migration';
    RETURN;
  END IF;

  ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

  FOR events_policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'events'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.events', events_policy.policyname);
  END LOOP;

  CREATE POLICY "Public read events" ON public.events
    FOR SELECT USING (true);

  REVOKE ALL ON TABLE public.events FROM anon, authenticated;
  GRANT SELECT ON TABLE public.events TO anon, authenticated;
END $$;
