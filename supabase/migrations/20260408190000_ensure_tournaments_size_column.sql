-- Ensure tournaments table has canonical size column on legacy installs.
DO $$
BEGIN
  IF to_regclass('public.tournaments') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'tournaments'
        AND column_name = 'size'
    ) THEN
      ALTER TABLE public.tournaments
        ADD COLUMN size INTEGER;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'tournaments'
        AND column_name = 'size'
    ) THEN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'tournaments'
          AND column_name = 'n'
      ) THEN
        UPDATE public.tournaments
        SET size = COALESCE(n, 8)
        WHERE size IS NULL;
      ELSE
        UPDATE public.tournaments
        SET size = 8
        WHERE size IS NULL;
      END IF;

      ALTER TABLE public.tournaments
        ALTER COLUMN size SET DEFAULT 8;

      ALTER TABLE public.tournaments
        ALTER COLUMN size SET NOT NULL;
    END IF;
  END IF;
END $$;
