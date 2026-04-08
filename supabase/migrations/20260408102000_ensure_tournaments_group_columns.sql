-- Ensure tournaments table has group-stage columns even on legacy installs.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tournaments'
      AND column_name = 'groups_count'
  ) THEN
    ALTER TABLE public.tournaments
      ADD COLUMN groups_count INTEGER DEFAULT 2;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tournaments'
      AND column_name = 'advance_per_group'
  ) THEN
    ALTER TABLE public.tournaments
      ADD COLUMN advance_per_group INTEGER DEFAULT 2;
  END IF;
END $$;
