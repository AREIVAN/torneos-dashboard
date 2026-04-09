-- Ensure tournaments table has canonical status column on legacy installs.
DO $$
BEGIN
  IF to_regclass('public.tournaments') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'tournaments'
        AND column_name = 'status'
    ) THEN
      ALTER TABLE public.tournaments
        ADD COLUMN status TEXT;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'tournaments'
        AND column_name = 'state'
    ) THEN
      UPDATE public.tournaments
      SET status = COALESCE(state, 'draft')
      WHERE status IS NULL;
    ELSE
      UPDATE public.tournaments
      SET status = 'draft'
      WHERE status IS NULL;
    END IF;

    ALTER TABLE public.tournaments
      ALTER COLUMN status SET DEFAULT 'draft';

    ALTER TABLE public.tournaments
      ALTER COLUMN status SET NOT NULL;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'tournaments_status_check'
        AND conrelid = 'public.tournaments'::regclass
    ) THEN
      ALTER TABLE public.tournaments
        ADD CONSTRAINT tournaments_status_check
        CHECK (status IN ('draft', 'active', 'completed', 'cancelled'));
    END IF;

    CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments(status);
  END IF;
END $$;
