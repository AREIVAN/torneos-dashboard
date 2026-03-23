-- =============================================
-- PHASE 12: Tournament Brackets & Standings
-- Migration: Create tournaments, participants, matches, standings tables
-- =============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. TOURNAMENTS TABLE
-- Stores tournament metadata and bracket structure
-- =============================================
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic info
  name TEXT NOT NULL,
  category TEXT,
  venue TEXT,
  date DATE,
  
  -- Format settings
  format TEXT NOT NULL DEFAULT 'single' CHECK (format IN ('single', 'groups', 'double')),
  size INTEGER NOT NULL DEFAULT 8,
  groups_count INTEGER DEFAULT 2,
  advance_per_group INTEGER DEFAULT 2,
  
  -- Status workflow: draft -> active -> completed
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  
  -- Link to calendar event (optional)
  event_id UUID,
  
  -- Store full bracket structure as JSONB for flexibility
  -- Contains: bracket, groups, dbl (double elimination structure), etc.
  bracket_data JSONB,
  
  -- Final results
  champion_robot_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_category ON public.tournaments(category);
CREATE INDEX IF NOT EXISTS idx_tournaments_date ON public.tournaments(date DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'events'
  ) THEN
    BEGIN
      ALTER TABLE public.tournaments
        ADD CONSTRAINT tournaments_event_id_fkey
        FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

-- =============================================
-- 2. TOURNAMENT PARTICIPANTS TABLE
-- Links robots to tournaments with seeding info
-- =============================================
CREATE TABLE IF NOT EXISTS public.tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  
  -- Robot reference
  robot_id TEXT NOT NULL,
  
  -- Snapshot of robot data at registration time
  -- Preserves historical accuracy even if robot is updated later
  robot_data JSONB NOT NULL,
  
  -- Seeding position (1 = top seed)
  seed INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Each robot can only be in a tournament once
  UNIQUE(tournament_id, robot_id)
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_participants_tournament ON public.tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_participants_robot ON public.tournament_participants(robot_id);

-- =============================================
-- 3. MATCHES TABLE
-- Individual match records with scores
-- =============================================
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  
  -- Bracket position
  bracket_type TEXT NOT NULL DEFAULT 'winners' CHECK (bracket_type IN ('winners', 'losers', 'groups', 'grand_final', 'single')),
  round_index INTEGER NOT NULL,
  match_index INTEGER NOT NULL,
  
  -- For group stage
  group_index INTEGER,
  
  -- Competitors (nullable for BYEs and TBD slots)
  robot_a_id TEXT,
  robot_b_id TEXT,
  
  -- Score tracking (BO3 format: first to 2 wins)
  wins_a INTEGER NOT NULL DEFAULT 0,
  wins_b INTEGER NOT NULL DEFAULT 0,
  
  -- Winner
  winner_id TEXT,
  
  -- Special flags
  is_bye BOOLEAN NOT NULL DEFAULT FALSE,
  is_reset BOOLEAN NOT NULL DEFAULT FALSE, -- Grand final reset match
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for queries
CREATE INDEX IF NOT EXISTS idx_matches_tournament ON public.matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_bracket ON public.matches(tournament_id, bracket_type, round_index);
CREATE INDEX IF NOT EXISTS idx_matches_robot_a ON public.matches(robot_a_id);
CREATE INDEX IF NOT EXISTS idx_matches_robot_b ON public.matches(robot_b_id);

-- =============================================
-- 4. STANDINGS TABLE
-- For group stage rankings and final placements
-- =============================================
CREATE TABLE IF NOT EXISTS public.standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  robot_id TEXT NOT NULL,
  
  -- Group stage stats
  group_index INTEGER,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0, -- 3 for win, 1 for draw, 0 for loss (configurable)
  
  -- Tiebreaker stats
  rounds_won INTEGER NOT NULL DEFAULT 0,    -- Total individual rounds won
  rounds_lost INTEGER NOT NULL DEFAULT 0,   -- Total individual rounds lost
  
  -- Final tournament placement (1 = champion, 2 = runner-up, etc.)
  final_position INTEGER,
  
  -- Each robot has one standing record per tournament
  UNIQUE(tournament_id, robot_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_standings_tournament ON public.standings(tournament_id);
CREATE INDEX IF NOT EXISTS idx_standings_group ON public.standings(tournament_id, group_index);
CREATE INDEX IF NOT EXISTS idx_standings_position ON public.standings(tournament_id, final_position);

-- =============================================
-- 5. TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tournaments
DROP TRIGGER IF EXISTS update_tournaments_updated_at ON public.tournaments;
CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to matches
DROP TRIGGER IF EXISTS update_matches_updated_at ON public.matches;
CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 6. ROW LEVEL SECURITY (RLS)
-- For now, allow public read/write (single admin app)
-- =============================================

-- Enable RLS
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standings ENABLE ROW LEVEL SECURITY;

-- Policies: Allow all operations for now (single admin)
-- Tournaments
DROP POLICY IF EXISTS "Allow all on tournaments" ON public.tournaments;
CREATE POLICY "Allow all on tournaments" ON public.tournaments
  FOR ALL USING (true) WITH CHECK (true);

-- Participants
DROP POLICY IF EXISTS "Allow all on tournament_participants" ON public.tournament_participants;
CREATE POLICY "Allow all on tournament_participants" ON public.tournament_participants
  FOR ALL USING (true) WITH CHECK (true);

-- Matches
DROP POLICY IF EXISTS "Allow all on matches" ON public.matches;
CREATE POLICY "Allow all on matches" ON public.matches
  FOR ALL USING (true) WITH CHECK (true);

-- Standings
DROP POLICY IF EXISTS "Allow all on standings" ON public.standings;
CREATE POLICY "Allow all on standings" ON public.standings
  FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- 7. ENABLE REALTIME
-- For live bracket updates
-- =============================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.standings;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE public.tournaments IS 'Robot tournament events with bracket configuration';
COMMENT ON TABLE public.tournament_participants IS 'Robots registered for each tournament';
COMMENT ON TABLE public.matches IS 'Individual match records with BO3 scoring';
COMMENT ON TABLE public.standings IS 'Group stage standings and final placements';
