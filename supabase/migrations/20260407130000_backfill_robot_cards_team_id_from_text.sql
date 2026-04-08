-- =============================================
-- Backfill robot_cards.team_id from legacy textual team
-- Safe rules:
-- - only rows with team_id IS NULL
-- - textual source: equipo (priority) then data->>'t'
-- - update only deterministic unique matches against teams.name
-- - skip ambiguous and non-matched rows
-- - idempotent
-- =============================================

CREATE OR REPLACE FUNCTION public._normalize_team_text(input_text TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT lower(
    trim(
      regexp_replace(
        translate(
          coalesce(input_text, ''),
          'áéíóúàèìòùäëïöüâêîôûñç',
          'aeiouaeiouaeiouaeiounc'
        ),
        '[[:space:]_-]+',
        ' ',
        'g'
      )
    )
  );
$fn$;

CREATE TEMP TABLE IF NOT EXISTS _robot_team_backfill_audit (
  metric TEXT PRIMARY KEY,
  total BIGINT NOT NULL
) ON COMMIT DROP;

CREATE TEMP TABLE IF NOT EXISTS _robot_team_backfill_ambiguous (
  textual_team TEXT NOT NULL,
  normalized_team TEXT NOT NULL,
  occurrences BIGINT NOT NULL,
  matched_team_ids TEXT[] NOT NULL,
  matched_team_names TEXT[] NOT NULL
) ON COMMIT DROP;

TRUNCATE _robot_team_backfill_audit;
TRUNCATE _robot_team_backfill_ambiguous;

DO $do$
DECLARE
  has_robot_cards BOOLEAN;
  has_teams BOOLEAN;
  has_robot_team_id BOOLEAN;
  has_equipo BOOLEAN;
  has_data BOOLEAN;
  has_team_id BOOLEAN;
  has_team_name BOOLEAN;
  team_text_expr TEXT;
  sql_stmt TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'robot_cards'
  ) INTO has_robot_cards;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'teams'
  ) INTO has_teams;

  IF NOT has_robot_cards OR NOT has_teams THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'robot_cards'
      AND column_name = 'team_id'
  ) INTO has_robot_team_id;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'robot_cards'
      AND column_name = 'equipo'
  ) INTO has_equipo;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'robot_cards'
      AND column_name = 'data'
  ) INTO has_data;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'teams'
      AND column_name = 'id'
  ) INTO has_team_id;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'teams'
      AND column_name = 'name'
  ) INTO has_team_name;

  IF NOT has_robot_team_id OR NOT has_team_id OR NOT has_team_name OR (NOT has_equipo AND NOT has_data) THEN
    RETURN;
  END IF;

  team_text_expr := CASE
    WHEN has_equipo AND has_data THEN
      'coalesce(nullif(trim(rc.equipo), ''''), nullif(trim(rc.data->>''t''), ''''))'
    WHEN has_equipo THEN
      'nullif(trim(rc.equipo), '''')'
    ELSE
      'nullif(trim(rc.data->>''t''), '''')'
  END;

  sql_stmt := format(
    $sql$
      WITH candidates AS (
        SELECT
          rc.ctid AS robot_ctid,
          %1$s AS textual_team,
          public._normalize_team_text(%1$s) AS normalized_team
        FROM public.robot_cards rc
        WHERE rc.team_id IS NULL
          AND %1$s IS NOT NULL
      ),
      team_catalog AS (
        SELECT
          t.id AS team_id,
          t.name AS team_name,
          public._normalize_team_text(t.name) AS normalized_team
        FROM public.teams t
        WHERE t.name IS NOT NULL
          AND public._normalize_team_text(t.name) <> ''
      ),
      robot_match_counts AS (
        SELECT
          c.robot_ctid,
          c.textual_team,
          c.normalized_team,
          COUNT(tc.team_id) AS match_count,
          (ARRAY_AGG(tc.team_id ORDER BY tc.team_id::TEXT))[1] AS unique_team_id
        FROM candidates c
        LEFT JOIN team_catalog tc
          ON tc.normalized_team = c.normalized_team
        WHERE c.normalized_team <> ''
        GROUP BY c.robot_ctid, c.textual_team, c.normalized_team
      ),
      do_update AS (
        UPDATE public.robot_cards rc
        SET team_id = rmc.unique_team_id
        FROM robot_match_counts rmc
        WHERE rc.ctid = rmc.robot_ctid
          AND rc.team_id IS NULL
          AND rmc.match_count = 1
        RETURNING 1
      )
      INSERT INTO _robot_team_backfill_audit(metric, total)
      SELECT 'updated_potential', COUNT(*) FROM robot_match_counts WHERE match_count = 1
      UNION ALL
      SELECT 'ambiguous', COUNT(*) FROM robot_match_counts WHERE match_count > 1
      UNION ALL
      SELECT 'unmatched', COUNT(*) FROM robot_match_counts WHERE match_count = 0;

      WITH candidates AS (
        SELECT
          %1$s AS textual_team,
          public._normalize_team_text(%1$s) AS normalized_team
        FROM public.robot_cards rc
        WHERE rc.team_id IS NULL
          AND %1$s IS NOT NULL
      ),
      team_catalog AS (
        SELECT
          t.id AS team_id,
          t.name AS team_name,
          public._normalize_team_text(t.name) AS normalized_team
        FROM public.teams t
        WHERE t.name IS NOT NULL
          AND public._normalize_team_text(t.name) <> ''
      ),
      ambiguous_cases AS (
        SELECT
          c.textual_team,
          c.normalized_team,
          COUNT(*) AS occurrences,
          ARRAY_AGG(DISTINCT tc.team_id::TEXT ORDER BY tc.team_id::TEXT) AS matched_team_ids,
          ARRAY_AGG(DISTINCT tc.team_name ORDER BY tc.team_name) AS matched_team_names
        FROM candidates c
        JOIN team_catalog tc
          ON tc.normalized_team = c.normalized_team
        WHERE c.normalized_team <> ''
        GROUP BY c.textual_team, c.normalized_team
        HAVING COUNT(DISTINCT tc.team_id) > 1
      )
      INSERT INTO _robot_team_backfill_ambiguous (
        textual_team,
        normalized_team,
        occurrences,
        matched_team_ids,
        matched_team_names
      )
      SELECT
        textual_team,
        normalized_team,
        occurrences,
        matched_team_ids,
        matched_team_names
      FROM ambiguous_cases
      ORDER BY occurrences DESC, normalized_team ASC
      LIMIT 50;
    $sql$,
    team_text_expr
  );

  EXECUTE sql_stmt;
END
$do$;

-- =============================================
-- Audit queries (read-only)
-- =============================================

-- 1) Potential robots updated by deterministic unique match
SELECT COALESCE((
  SELECT total
  FROM _robot_team_backfill_audit
  WHERE metric = 'updated_potential'
), 0) AS updated_potential_total;

-- 2) Robots skipped because the textual team is ambiguous
SELECT COALESCE((
  SELECT total
  FROM _robot_team_backfill_audit
  WHERE metric = 'ambiguous'
), 0) AS ambiguous_total;

-- 3) Robots skipped because no team matched
SELECT COALESCE((
  SELECT total
  FROM _robot_team_backfill_audit
  WHERE metric = 'unmatched'
), 0) AS unmatched_total;

-- 4) Sample ambiguous cases (up to 50)
SELECT
  textual_team,
  normalized_team,
  occurrences,
  matched_team_ids,
  matched_team_names
FROM _robot_team_backfill_ambiguous
ORDER BY occurrences DESC, normalized_team ASC
LIMIT 50;
