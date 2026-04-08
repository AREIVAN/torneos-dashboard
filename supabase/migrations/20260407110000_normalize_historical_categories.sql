-- =============================================
-- Historical category normalization (idempotent)
-- =============================================
-- Canonical target categories:
-- - Mini Sumo Autonomo Profesional
-- - Mini Sumo RC
-- - Seguidor de Linea Profesional
-- - Sumo 3kg Autonomo
-- - Sumo 3kg RC
-- - Combate 1lb
-- - Combate 3lb
-- - Combate 12lb
-- - Micro Sumo
-- - Nano Sumo

CREATE OR REPLACE FUNCTION public._normalize_category_text(input_text TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT lower(
    trim(
      regexp_replace(
        regexp_replace(
          translate(coalesce(input_text, ''), 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU'),
          '[_-]+',
          ' ',
          'g'
        ),
        '[[:space:]]+',
        ' ',
        'g'
      )
    )
  );
$fn$;

DO $$
DECLARE
  target RECORD;
  norm_expr TEXT;
  mapped_expr TEXT;
BEGIN
  FOR target IN
    SELECT
      c.table_schema,
      c.table_name,
      c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.column_name IN ('category', 'categoria')
      AND c.data_type IN ('text', 'character varying', 'character')
  LOOP
    norm_expr := format(
      'public._normalize_category_text(%1$I)',
      target.column_name
    );

    mapped_expr :=
      'CASE ' ||
      'WHEN ' || norm_expr || ' IN (''mini sumo'', ''minisumo'') THEN ''Mini Sumo Autonomo Profesional'' ' ||
      'WHEN ' || norm_expr || ' IN (''mini sumo 500g'', ''mini sumo 500 g'', ''mini sumo rc'') THEN ''Mini Sumo RC'' ' ||
      'WHEN ' || norm_expr || ' = ''seguidor de linea'' THEN ''Seguidor de Linea Profesional'' ' ||
      'WHEN ' || norm_expr || ' IN (''sumo 3kg'', ''sumo 3 kg'') THEN ''Sumo 3kg Autonomo'' ' ||
      'WHEN (' || norm_expr || ') ~ ''(^| )combate( |$)'' AND (' || norm_expr || ') ~ ''(^| )1 ?lb( |$)'' THEN ''Combate 1lb'' ' ||
      'WHEN (' || norm_expr || ') ~ ''(^| )combate( |$)'' AND (' || norm_expr || ') ~ ''(^| )3 ?lb( |$)'' THEN ''Combate 3lb'' ' ||
      'WHEN (' || norm_expr || ') ~ ''(^| )combate( |$)'' AND (' || norm_expr || ') ~ ''(^| )12 ?lb( |$)'' THEN ''Combate 12lb'' ' ||
      'ELSE ' || format('%I', target.column_name) ||
      ' END';

    EXECUTE format(
      'UPDATE %I.%I SET %I = %s WHERE %I IS NOT NULL AND (%s) IS DISTINCT FROM %I;',
      target.table_schema,
      target.table_name,
      target.column_name,
      mapped_expr,
      target.column_name,
      mapped_expr,
      target.column_name
    );
  END LOOP;
END
$$;

-- =============================================
-- Verification queries (read-only)
-- =============================================

CREATE TEMP TABLE IF NOT EXISTS _category_audit (
  table_name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  raw_value TEXT,
  normalized_value TEXT
) ON COMMIT DROP;

TRUNCATE _category_audit;

DO $$
DECLARE
  target RECORD;
BEGIN
  FOR target IN
    SELECT
      c.table_schema,
      c.table_name,
      c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.column_name IN ('category', 'categoria')
      AND c.data_type IN ('text', 'character varying', 'character')
  LOOP
    EXECUTE format(
      'INSERT INTO _category_audit (table_name, column_name, raw_value, normalized_value) ' ||
      'SELECT %L, %L, %I, ' ||
      'public._normalize_category_text(%I) ' ||
      'FROM %I.%I WHERE %I IS NOT NULL;',
      target.table_name,
      target.column_name,
      target.column_name,
      target.column_name,
      target.table_schema,
      target.table_name,
      target.column_name
    );
  END LOOP;
END
$$;

-- 1) How many records ended up in each category (all covered tables/columns)
SELECT raw_value AS category, COUNT(*) AS total
FROM _category_audit
GROUP BY raw_value
ORDER BY total DESC, category ASC;

-- 2) How many records are still legacy/ambiguous (includes plain "Combate")
SELECT COUNT(*) AS legacy_or_ambiguous_total
FROM _category_audit
WHERE normalized_value NOT IN (
  'mini sumo autonomo profesional',
  'mini sumo rc',
  'seguidor de linea profesional',
  'sumo 3kg autonomo',
  'sumo 3kg rc',
  'combate 1lb',
  'combate 3lb',
  'combate 12lb',
  'micro sumo',
  'nano sumo'
);

-- 3) Optional detail of remaining legacy/ambiguous values
SELECT table_name, column_name, raw_value AS legacy_value, COUNT(*) AS total
FROM _category_audit
WHERE normalized_value NOT IN (
  'mini sumo autonomo profesional',
  'mini sumo rc',
  'seguidor de linea profesional',
  'sumo 3kg autonomo',
  'sumo 3kg rc',
  'combate 1lb',
  'combate 3lb',
  'combate 12lb',
  'micro sumo',
  'nano sumo'
)
GROUP BY table_name, column_name, raw_value
ORDER BY total DESC, table_name, column_name, legacy_value;
