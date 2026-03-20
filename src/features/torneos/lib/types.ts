export interface Player {
  i: string;
  n: string;
  t: string;
  c: string;
  p?: string;
  s?: string;
  w?: number;
  d?: string;
  y?: string;
  f?: string;
  k?: string;
  a?: string;
  l?: string[];
  u?: string;
  g?: string;
}

export interface Tournament {
  name: string;
  category: string;
  venue: string;
  date: string;
  format: "single" | "groups" | "double";
  n: number;
  groups: number;
  adv: number;
}

export interface Slot {
  id: string;
  name: string;
  rid: string;
  team: string;
  compact: Player | null;
  bye: boolean;
}

export interface Match {
  id: string;
  a: Slot;
  b: Slot;
  wa: number;
  wb: number;
  winner: "a" | "b" | null;
}

export interface Round {
  type: "single" | "losers" | "grandFinal";
  matches: Match[];
}

export interface Bracket {
  type: "single" | "losers" | "grandFinal";
  size: number;
  rounds: Match[][];
}

export interface DoubleStructure {
  winners: Bracket;
  losers: Bracket;
  grandFinal: Match[];
  gfReset: boolean;
  tournamentResolved: boolean;
  champion: string | null;
}

export interface GroupsResult {
  groups: Player[][];
  qualifiers: Player[];
  finalBracket: Bracket;
}

export interface ViewState {
  type: "single" | "groups" | "double";
  bracket?: Bracket;
  groups?: Player[][];
  qualifiers?: Player[];
  finalBracket?: Bracket;
  dbl?: DoubleStructure;
  tournamentResolved?: boolean;
  champion?: string | null;
}

export interface TournamentState {
  tournament: Tournament;
  players: Player[];
  view: ViewState | null;
  viewMode: "organizer" | "competitor";
  viewStyle: "columns" | "map";
}

export const CATEGORIES = [
  "Mini Sumo Autónomo Profesional",
  "Mini Sumo RC Profesional",
  "Sumo 3kg",
  "Mini Sumo RC Amateur",
  "Mini Sumo Autónomo Amateur",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const LOCAL_KEY = "apex_tournament_flex_demo_v2_bo3_map";
