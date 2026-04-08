-- =============================================
-- SECURITY PHASE 1: lock tournament writes to server
-- - Keep public read access
-- - Remove direct client write access from anon/authenticated roles
-- =============================================

DO $$
BEGIN
  -- tournaments
  IF to_regclass('public.tournaments') IS NOT NULL THEN
    ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

    IF EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'tournaments'
        AND policyname = 'Allow all on tournaments'
    ) THEN
      DROP POLICY "Allow all on tournaments" ON public.tournaments;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'tournaments'
        AND policyname = 'Public read tournaments'
    ) THEN
      DROP POLICY "Public read tournaments" ON public.tournaments;
    END IF;

    CREATE POLICY "Public read tournaments" ON public.tournaments
      FOR SELECT USING (true);
  END IF;

  -- tournament participants
  IF to_regclass('public.tournament_participants') IS NOT NULL THEN
    ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;

    IF EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'tournament_participants'
        AND policyname = 'Allow all on tournament_participants'
    ) THEN
      DROP POLICY "Allow all on tournament_participants" ON public.tournament_participants;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'tournament_participants'
        AND policyname = 'Public read tournament_participants'
    ) THEN
      DROP POLICY "Public read tournament_participants" ON public.tournament_participants;
    END IF;

    CREATE POLICY "Public read tournament_participants" ON public.tournament_participants
      FOR SELECT USING (true);
  END IF;

  -- matches
  IF to_regclass('public.matches') IS NOT NULL THEN
    ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

    IF EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'matches'
        AND policyname = 'Allow all on matches'
    ) THEN
      DROP POLICY "Allow all on matches" ON public.matches;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'matches'
        AND policyname = 'Public read matches'
    ) THEN
      DROP POLICY "Public read matches" ON public.matches;
    END IF;

    CREATE POLICY "Public read matches" ON public.matches
      FOR SELECT USING (true);
  END IF;

  -- standings
  IF to_regclass('public.standings') IS NOT NULL THEN
    ALTER TABLE public.standings ENABLE ROW LEVEL SECURITY;

    IF EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'standings'
        AND policyname = 'Allow all on standings'
    ) THEN
      DROP POLICY "Allow all on standings" ON public.standings;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'standings'
        AND policyname = 'Public read standings'
    ) THEN
      DROP POLICY "Public read standings" ON public.standings;
    END IF;

    CREATE POLICY "Public read standings" ON public.standings
      FOR SELECT USING (true);
  END IF;
END $$;
