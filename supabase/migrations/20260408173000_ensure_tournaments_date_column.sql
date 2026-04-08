-- Ensure tournaments table has date column on legacy installs.
DO $$
BEGIN
  IF to_regclass('public.tournaments') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'tournaments'
        AND column_name = 'date'
    ) THEN
      ALTER TABLE public.tournaments
        ADD COLUMN date DATE;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'tournaments'
        AND column_name = 'created_at'
    ) THEN
      UPDATE public.tournaments
      SET date = (created_at AT TIME ZONE 'UTC')::date
      WHERE date IS NULL
        AND created_at IS NOT NULL;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_tournaments_date ON public.tournaments(date DESC);
  END IF;
END $$;
