/**
 * Database types for tournament tables
 * These types match the Supabase schema defined in migrations
 */

// =============================================
// TOURNAMENT TYPES
// =============================================

export type TournamentFormat = 'single' | 'groups' | 'double';
export type TournamentStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type BracketType = 'winners' | 'losers' | 'groups' | 'grand_final' | 'single';

export interface DbTournament {
  id: string;
  name: string;
  category: string | null;
  venue: string | null;
  date: string | null; // ISO date string
  format: TournamentFormat;
  size: number;
  groups_count: number | null;
  advance_per_group: number | null;
  status: TournamentStatus;
  event_id: string | null;
  bracket_data: BracketData | null;
  champion_robot_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbTournamentInsert {
  name: string;
  category?: string | null;
  venue?: string | null;
  date?: string | null;
  format?: TournamentFormat;
  size?: number;
  groups_count?: number | null;
  advance_per_group?: number | null;
  status?: TournamentStatus;
  event_id?: string | null;
  bracket_data?: BracketData | null;
  champion_robot_id?: string | null;
}

export interface DbTournamentUpdate {
  name?: string;
  category?: string | null;
  venue?: string | null;
  date?: string | null;
  format?: TournamentFormat;
  size?: number;
  groups_count?: number | null;
  advance_per_group?: number | null;
  status?: TournamentStatus;
  event_id?: string | null;
  bracket_data?: BracketData | null;
  champion_robot_id?: string | null;
}

// =============================================
// PARTICIPANT TYPES
// =============================================

export interface DbParticipant {
  id: string;
  tournament_id: string;
  robot_id: string;
  robot_data: ParticipantRobotData;
  seed: number | null;
  created_at: string;
}

export interface DbParticipantInsert {
  tournament_id: string;
  robot_id: string;
  robot_data: ParticipantRobotData;
  seed?: number | null;
}

// Robot data snapshot at registration time
export interface ParticipantRobotData {
  i: string;  // robot_id
  n: string;  // nombre
  t: string;  // equipo/team
  c: string;  // categoria
  p?: string; // pilot/controlador
  s?: string; // school/escuela
  w?: number; // weight
  d?: string; // dimensions
  y?: string; // control type
  f?: string; // frequency
  k?: string; // contact
  a?: string; // inspection status
}

// =============================================
// MATCH TYPES
// =============================================

export interface DbMatch {
  id: string;
  tournament_id: string;
  bracket_type: BracketType;
  round_index: number;
  match_index: number;
  group_index: number | null;
  robot_a_id: string | null;
  robot_b_id: string | null;
  wins_a: number;
  wins_b: number;
  winner_id: string | null;
  is_bye: boolean;
  is_reset: boolean;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbMatchInsert {
  tournament_id: string;
  bracket_type: BracketType;
  round_index: number;
  match_index: number;
  group_index?: number | null;
  robot_a_id?: string | null;
  robot_b_id?: string | null;
  wins_a?: number;
  wins_b?: number;
  winner_id?: string | null;
  is_bye?: boolean;
  is_reset?: boolean;
  scheduled_at?: string | null;
  completed_at?: string | null;
}

export interface DbMatchUpdate {
  robot_a_id?: string | null;
  robot_b_id?: string | null;
  wins_a?: number;
  wins_b?: number;
  winner_id?: string | null;
  is_bye?: boolean;
  completed_at?: string | null;
}

// =============================================
// STANDINGS TYPES
// =============================================

export interface DbStanding {
  id: string;
  tournament_id: string;
  robot_id: string;
  group_index: number | null;
  wins: number;
  losses: number;
  points: number;
  rounds_won: number;
  rounds_lost: number;
  final_position: number | null;
}

export interface DbStandingInsert {
  tournament_id: string;
  robot_id: string;
  group_index?: number | null;
  wins?: number;
  losses?: number;
  points?: number;
  rounds_won?: number;
  rounds_lost?: number;
  final_position?: number | null;
}

export interface DbStandingUpdate {
  wins?: number;
  losses?: number;
  points?: number;
  rounds_won?: number;
  rounds_lost?: number;
  final_position?: number | null;
}

// =============================================
// BRACKET DATA (stored as JSONB in tournament)
// =============================================

import type { ViewState } from '@/features/torneos/lib/types';

// The bracket_data column stores the full view state
export type BracketData = ViewState;

// =============================================
// API RESPONSE TYPES
// =============================================

export interface TournamentWithParticipants extends DbTournament {
  participants: DbParticipant[];
}

export interface TournamentWithDetails extends DbTournament {
  participants: DbParticipant[];
  matches: DbMatch[];
  standings: DbStanding[];
}

// =============================================
// REALTIME PAYLOAD TYPES
// =============================================

export interface RealtimeMatchPayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: DbMatch;
  old: DbMatch | null;
}

export interface RealtimeStandingPayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: DbStanding;
  old: DbStanding | null;
}

export interface RealtimeTournamentPayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: DbTournament;
  old: DbTournament | null;
}
