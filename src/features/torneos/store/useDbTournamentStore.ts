/**
 * Database-synced Tournament Store
 * Extends the local tournament store with Supabase persistence
 */

import { create } from 'zustand';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  normalizeRobotCategory,
  ROBOT_CATEGORY_MINI_SUMO_AUTONOMO_PRO,
} from '@/lib/categoryNormalization';
import type {
  Player,
  Tournament,
  ViewState,
  Bracket,
  Match,
  Slot,
  DoubleStructure,
} from '../lib/types';
import type { DbTournament, DbParticipant, DbMatch } from '@/lib/supabase/database.types';
import {
  buildSingleBracketBO3,
  buildDoubleStructure,
  autoAdvanceByesBO3,
  assignGroupsSnake,
  incWinBO3,
  incWinBO3Losers,
  clearMatchBO3,
  shuffleArray,
  propagateWinnerToLosers,
  advanceWinnersChampionToGrandFinal,
  resolveGrandFinal,
  clearGrandFinal,
  clearLosersMatch,
} from '../lib/bracketUtils';
import { syncThirdPlaceMatchFromBracket } from '../lib/placements';
import { hasOrganizerSession, validateOrganizerToken } from '../lib/organizerAuth';
import {
  createTournament as apiCreateTournament,
  getTournamentWithDetails,
  updateTournament as apiUpdateTournament,
  saveBracketData,
  addParticipants,
  removeAllParticipants,
  playerToRobotData,
  initializeStandings,
  syncTournamentMatches,
  recalculateStandings,
} from '../api';

function toggleStandaloneMatchWin(match: Bracket['rounds'][number][number], side: 'a' | 'b') {
  if (!match) return;
  if (side === 'a') {
    match.wa = Math.min(2, match.wa + 1);
    if (match.wa >= 2) match.winner = 'a';
  } else {
    match.wb = Math.min(2, match.wb + 1);
    if (match.wb >= 2) match.winner = 'b';
  }
}

function clearStandaloneMatch(match: Bracket['rounds'][number][number]) {
  if (!match) return;
  match.wa = 0;
  match.wb = 0;
  match.winner = null;
}

async function syncTournamentProgress(tournamentId: string, view: ViewState) {
  const matchesResult = await syncTournamentMatches(tournamentId, view);
  if (matchesResult.error) {
    return { error: matchesResult.error, standingsWarning: null };
  }

  const standingsResult = await recalculateStandings(tournamentId);
  if (standingsResult.error) {
    console.warn('No se pudo recalcular standings, pero los matches quedaron sincronizados.', standingsResult.error);
    return { error: null, standingsWarning: standingsResult.error };
  }

  return { error: null, standingsWarning: null };
}

function parseRawViewState(value: unknown): ViewState | null {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as ViewState;
      return typeof parsed === 'object' && parsed ? parsed : null;
    } catch {
      return null;
    }
  }
  return typeof value === 'object' ? (value as ViewState) : null;
}

function isBracket(value: unknown): value is Bracket {
  if (!value || typeof value !== 'object') return false;
  return Array.isArray((value as Bracket).rounds);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function toSafeSlot(value: unknown): Slot {
  if (!isRecord(value)) {
    return toUnknownSlot();
  }

  const rid = typeof value.rid === 'string' ? value.rid : '';
  const id = typeof value.id === 'string' ? value.id : rid;
  const name = typeof value.name === 'string' && value.name.trim().length > 0 ? value.name : id || 'TBD';
  const bye =
    value.bye === true ||
    String(id).toUpperCase() === 'BYE' ||
    String(name).toUpperCase() === 'BYE';

  return {
    id,
    name,
    rid: rid || id,
    team: typeof value.team === 'string' ? value.team : '',
    compact: null,
    bye,
  };
}

function toSafeMatch(value: unknown, fallbackId: string): Match | null {
  if (!isRecord(value)) return null;

  const winner = value.winner === 'a' || value.winner === 'b' ? value.winner : null;
  const wa = typeof value.wa === 'number' && Number.isFinite(value.wa) ? Math.max(0, Math.floor(value.wa)) : 0;
  const wb = typeof value.wb === 'number' && Number.isFinite(value.wb) ? Math.max(0, Math.floor(value.wb)) : 0;

  return {
    id: typeof value.id === 'string' && value.id.length > 0 ? value.id : fallbackId,
    a: toSafeSlot(value.a),
    b: toSafeSlot(value.b),
    wa,
    wb,
    winner,
  };
}

function toSafeBracket(value: unknown, fallbackType: Bracket['type']): Bracket | null {
  if (!isBracket(value)) return null;

  const rounds = value.rounds
    .map((round, ri) => {
      if (!Array.isArray(round)) return [] as Match[];
      return round
        .map((match, mi) => toSafeMatch(match, `R${ri + 1}M${mi + 1}`))
        .filter((match): match is Match => Boolean(match));
    })
    .filter((round) => round.length > 0);

  if (rounds.length === 0) return null;

  const type =
    value.type === 'single' || value.type === 'losers' || value.type === 'grandFinal'
      ? value.type
      : fallbackType;
  const size =
    typeof value.size === 'number' && Number.isFinite(value.size) && value.size >= 2
      ? Math.floor(value.size)
      : Math.max(2, rounds[0].length * 2);

  return {
    type,
    size,
    rounds,
  };
}

function toSafeDoubleStructure(value: unknown): DoubleStructure | null {
  if (!isRecord(value)) return null;

  const winners = toSafeBracket(value.winners, 'single');
  const losers = toSafeBracket(value.losers, 'losers');
  const grandFinal = Array.isArray(value.grandFinal)
    ? value.grandFinal
        .map((match, index) => toSafeMatch(match, `GF${index + 1}`))
        .filter((match): match is Match => Boolean(match))
    : [];

  if (!winners && !losers && grandFinal.length === 0) return null;

  return {
    winners: winners || emptyBracket('single'),
    losers: losers || emptyBracket('losers'),
    grandFinal,
    gfReset: Boolean(value.gfReset) || grandFinal.length > 1,
    tournamentResolved: Boolean(value.tournamentResolved),
    champion:
      typeof value.champion === 'string' && value.champion.length > 0 ? value.champion : null,
  };
}

function emptyBracket(type: Bracket['type']): Bracket {
  return {
    type,
    size: 2,
    rounds: [],
  };
}

function toUnknownSlot(): Slot {
  return { id: '', name: 'TBD', rid: '', team: '', compact: null, bye: false };
}

function toByeSlot(): Slot {
  return { id: 'BYE', name: 'BYE', rid: '', team: '', compact: null, bye: true };
}

function toMatchSlot(
  robotId: string | null,
  isBye: boolean,
  playersById: Map<string, Player>
): Slot {
  if (isBye) return toByeSlot();
  if (!robotId) return toUnknownSlot();

  const player = playersById.get(robotId);
  if (!player) {
    return {
      id: robotId,
      name: robotId,
      rid: robotId,
      team: '',
      compact: null,
      bye: false,
    };
  }

  return {
    id: player.i,
    name: player.n || player.i,
    rid: player.i,
    team: player.t || '',
    compact: player,
    bye: false,
  };
}

function toViewMatch(match: DbMatch, playersById: Map<string, Player>): Match {
  const isByeA = Boolean(match.is_bye && !match.robot_a_id);
  const isByeB = Boolean(match.is_bye && !match.robot_b_id);
  const a = toMatchSlot(match.robot_a_id, isByeA, playersById);
  const b = toMatchSlot(match.robot_b_id, isByeB, playersById);
  const winner: 'a' | 'b' | null =
    match.winner_id && match.winner_id === a.id
      ? 'a'
      : match.winner_id && match.winner_id === b.id
        ? 'b'
        : null;

  return {
    id: match.id,
    a,
    b,
    wa: match.wins_a,
    wb: match.wins_b,
    winner,
  };
}

function buildSingleViewFromMatches(
  matches: DbMatch[],
  playersById: Map<string, Player>
): Pick<ViewState, 'bracket' | 'thirdPlaceMatch'> | null {
  const singleRows = matches.filter((row) => row.bracket_type === 'single');
  if (singleRows.length === 0) return null;

  const rounds = new Map<number, DbMatch[]>();
  singleRows.forEach((row) => {
    const current = rounds.get(row.round_index);
    if (current) {
      current.push(row);
      return;
    }
    rounds.set(row.round_index, [row]);
  });

  const roundIndexes = Array.from(rounds.keys()).sort((a, b) => a - b);
  const firstRoundIndex = roundIndexes[0];
  if (firstRoundIndex === undefined) return null;

  const firstRoundCount = (rounds.get(firstRoundIndex) || []).length;
  const expectedMainRounds = Math.max(1, Math.round(Math.log2(Math.max(2, firstRoundCount * 2))));
  const mainRoundIndexes = new Set(roundIndexes.slice(0, expectedMainRounds));
  const extraRoundIndexes = roundIndexes.filter((index) => !mainRoundIndexes.has(index));
  const thirdPlaceRoundIndex = extraRoundIndexes[0];

  const mainRounds = Array.from(mainRoundIndexes)
    .sort((a, b) => a - b)
    .map((roundIndex) => {
      const rows = rounds.get(roundIndex) || [];
      return rows
        .slice()
        .sort((a, b) => a.match_index - b.match_index)
        .map((row) => toViewMatch(row, playersById));
    })
    .filter((round) => round.length > 0);

  if (mainRounds.length === 0) return null;

  const thirdPlaceRows =
    thirdPlaceRoundIndex !== undefined ? (rounds.get(thirdPlaceRoundIndex) || []) : [];
  const thirdPlaceMatch = thirdPlaceRows
    .slice()
    .sort((a, b) => a.match_index - b.match_index)
    .map((row) => toViewMatch(row, playersById))[0];

  const size = Math.max(2, mainRounds[0].length * 2);
  return {
    bracket: {
      type: 'single',
      size,
      rounds: mainRounds,
    },
    thirdPlaceMatch,
  };
}

function buildBracketFromRows(
  rows: DbMatch[],
  playersById: Map<string, Player>,
  type: Bracket['type']
): Bracket | null {
  if (rows.length === 0) return null;

  const rounds = new Map<number, DbMatch[]>();
  rows.forEach((row) => {
    const current = rounds.get(row.round_index);
    if (current) {
      current.push(row);
      return;
    }
    rounds.set(row.round_index, [row]);
  });

  const roundIndexes = Array.from(rounds.keys()).sort((a, b) => a - b);
  const bracketRounds = roundIndexes
    .map((roundIndex) => {
      const roundRows = rounds.get(roundIndex) || [];
      return roundRows
        .slice()
        .sort((a, b) => a.match_index - b.match_index)
        .map((row) => toViewMatch(row, playersById));
    })
    .filter((round) => round.length > 0);

  if (bracketRounds.length === 0) return null;

  return {
    type,
    size: Math.max(2, bracketRounds[0].length * 2),
    rounds: bracketRounds,
  };
}

function buildGroupsViewFromMatches(
  matches: DbMatch[],
  playersById: Map<string, Player>
): Pick<ViewState, 'groups' | 'qualifiers' | 'finalBracket' | 'finalThirdPlaceMatch'> | null {
  const recoveredSingle = buildSingleViewFromMatches(matches, playersById);
  if (!recoveredSingle?.bracket) return null;

  return {
    groups: [],
    qualifiers: [],
    finalBracket: recoveredSingle.bracket,
    finalThirdPlaceMatch: recoveredSingle.thirdPlaceMatch,
  };
}

function buildDoubleViewFromMatches(
  matches: DbMatch[],
  playersById: Map<string, Player>
): Pick<ViewState, 'dbl' | 'tournamentResolved' | 'champion'> | null {
  const winnersRows = matches.filter((row) => row.bracket_type === 'winners');
  const losersRows = matches.filter((row) => row.bracket_type === 'losers');
  const grandFinalRows = matches
    .filter((row) => row.bracket_type === 'grand_final')
    .slice()
    .sort((a, b) => a.match_index - b.match_index);

  if (winnersRows.length === 0 && losersRows.length === 0 && grandFinalRows.length === 0) {
    return null;
  }

  const winners = buildBracketFromRows(winnersRows, playersById, 'single') || emptyBracket('single');
  const losers = buildBracketFromRows(losersRows, playersById, 'losers') || emptyBracket('losers');
  const grandFinal = grandFinalRows.map((row) => toViewMatch(row, playersById));

  return {
    dbl: {
      winners,
      losers,
      grandFinal,
      gfReset: grandFinalRows.some((row) => row.is_reset) || grandFinal.length > 1,
      tournamentResolved: false,
      champion: null,
    },
    tournamentResolved: false,
    champion: null,
  };
}

function getCompatibleView(
  tournamentFormat: Tournament['format'],
  rawView: unknown,
  matches: DbMatch[],
  players: Player[]
): ViewState | null {
  const parsedView = parseRawViewState(rawView);
  const playersById = new Map(players.map((player) => [player.i, player]));

  if (parsedView?.type === 'single') {
    const safeSnapshotBracket = toSafeBracket(parsedView.bracket, 'single');
    if (safeSnapshotBracket) {
      return {
        ...parsedView,
        type: 'single',
        bracket: safeSnapshotBracket,
        thirdPlaceMatch: toSafeMatch(parsedView.thirdPlaceMatch, 'single-third-place') || undefined,
      };
    }

    const recovered = buildSingleViewFromMatches(matches, playersById);
    if (!recovered) return null;

    const safeRecoveredBracket = toSafeBracket(recovered.bracket, 'single');
    if (!safeRecoveredBracket) return null;

    const safeThirdPlace =
      toSafeMatch(parsedView.thirdPlaceMatch, 'single-third-place') ||
      toSafeMatch(recovered.thirdPlaceMatch, 'single-third-place');

    return {
      ...parsedView,
      type: 'single',
      bracket: safeRecoveredBracket,
      thirdPlaceMatch: safeThirdPlace || undefined,
    };
  }

  if (parsedView?.type === 'groups') {
    const safeSnapshotFinalBracket = toSafeBracket(parsedView.finalBracket, 'single');
    if (safeSnapshotFinalBracket) {
      return {
        ...parsedView,
        type: 'groups',
        groups: parsedView.groups ?? [],
        qualifiers: parsedView.qualifiers ?? [],
        finalBracket: safeSnapshotFinalBracket,
        finalThirdPlaceMatch:
          toSafeMatch(parsedView.finalThirdPlaceMatch, 'groups-third-place') || undefined,
      };
    }

    const recovered = buildGroupsViewFromMatches(matches, playersById);
    if (!recovered) return null;

    const safeRecoveredFinalBracket = toSafeBracket(recovered.finalBracket, 'single');
    if (!safeRecoveredFinalBracket) return null;

    const safeThirdPlace =
      toSafeMatch(parsedView.finalThirdPlaceMatch, 'groups-third-place') ||
      toSafeMatch(recovered.finalThirdPlaceMatch, 'groups-third-place');

    return {
      ...parsedView,
      type: 'groups',
      groups: parsedView.groups ?? recovered.groups,
      qualifiers: parsedView.qualifiers ?? recovered.qualifiers,
      finalBracket: safeRecoveredFinalBracket,
      finalThirdPlaceMatch: safeThirdPlace || undefined,
    };
  }

  if (parsedView?.type === 'double') {
    const safeSnapshotDouble = toSafeDoubleStructure(parsedView.dbl);
    if (safeSnapshotDouble) {
      return {
        ...parsedView,
        type: 'double',
        dbl: safeSnapshotDouble,
        tournamentResolved:
          parsedView.tournamentResolved ?? safeSnapshotDouble.tournamentResolved,
        champion: parsedView.champion ?? safeSnapshotDouble.champion,
      };
    }

    const recovered = buildDoubleViewFromMatches(matches, playersById);
    if (!recovered) return null;

    const safeRecoveredDouble = toSafeDoubleStructure(recovered.dbl);
    if (!safeRecoveredDouble) return null;

    return {
      ...parsedView,
      type: 'double',
      dbl: safeRecoveredDouble,
      tournamentResolved: parsedView.tournamentResolved ?? recovered.tournamentResolved,
      champion: parsedView.champion ?? recovered.champion,
    };
  }

  if (!parsedView && tournamentFormat === 'single') {
    const recovered = buildSingleViewFromMatches(matches, playersById);
    if (!recovered) return null;

    const safeRecoveredBracket = toSafeBracket(recovered.bracket, 'single');
    if (!safeRecoveredBracket) return null;

    return {
      type: 'single',
      bracket: safeRecoveredBracket,
      thirdPlaceMatch: toSafeMatch(recovered.thirdPlaceMatch, 'single-third-place') || undefined,
    };
  }

  if (!parsedView && tournamentFormat === 'groups') {
    const recovered = buildGroupsViewFromMatches(matches, playersById);
    if (!recovered) return null;

    const safeRecoveredFinalBracket = toSafeBracket(recovered.finalBracket, 'single');
    if (!safeRecoveredFinalBracket) return null;

    return {
      type: 'groups',
      groups: recovered.groups,
      qualifiers: recovered.qualifiers,
      finalBracket: safeRecoveredFinalBracket,
      finalThirdPlaceMatch:
        toSafeMatch(recovered.finalThirdPlaceMatch, 'groups-third-place') || undefined,
    };
  }

  if (!parsedView && tournamentFormat === 'double') {
    const recovered = buildDoubleViewFromMatches(matches, playersById);
    if (!recovered) return null;

    const safeRecoveredDouble = toSafeDoubleStructure(recovered.dbl);
    if (!safeRecoveredDouble) return null;

    return {
      type: 'double',
      dbl: safeRecoveredDouble,
      tournamentResolved: recovered.tournamentResolved,
      champion: recovered.champion,
    };
  }

  return null;
}

// =============================================
// Types
// =============================================

interface DbTournamentStore {
  // Current tournament ID (null = new/unsaved)
  tournamentId: string | null;
  
  // Local state (same as existing store)
  tournament: Tournament;
  players: Player[];
  view: ViewState | null;
  viewMode: 'organizer' | 'competitor';
  organizerUnlocked: boolean;
  viewStyle: 'columns' | 'map';
  
  // Sync state
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  syncError: string | null;
  
  // Tournament actions
  setTournament: (t: Partial<Tournament>) => void;
  addPlayer: (player: Player) => boolean;
  removePlayer: (robotId: string) => void;
  reorderPlayer: (robotId: string, direction: 'up' | 'down') => void;
  shufflePlayers: () => void;
  clearPlayers: () => void;
  
  // Bracket actions
  generate: () => Promise<void>;
  clearView: () => void;
  setViewMode: (mode: 'organizer' | 'competitor') => void;
  unlockOrganizerMode: (token: string) => Promise<boolean>;
  refreshOrganizerSession: () => Promise<boolean>;
  setViewStyle: (style: 'columns' | 'map') => void;
  toggleMatchWin: (bracketId: string, ri: number, mi: number, side: 'a' | 'b') => void;
  clearMatch: (bracketId: string, ri: number, mi: number) => void;
  
  // Database sync actions
  createAndSave: () => Promise<string | null>; // Returns tournament ID
  loadTournament: (id: string) => Promise<boolean>;
  saveTournament: () => Promise<boolean>;
  syncBracket: () => Promise<boolean>;
  
  // Reset
  resetTournament: () => void;
  newTournament: () => void;
}

const defaultTournament: Tournament = {
  name: '',
  category: ROBOT_CATEGORY_MINI_SUMO_AUTONOMO_PRO,
  venue: '',
  date: '',
  format: 'single',
  n: 8,
  groups: 4,
  adv: 2,
};

// =============================================
// Store Implementation
// =============================================

export const useDbTournamentStore = create<DbTournamentStore>()((set, get) => ({
  tournamentId: null,
  tournament: { ...defaultTournament },
  players: [],
  view: null,
  viewMode: 'competitor',
  organizerUnlocked: false,
  viewStyle: 'columns',
  isSyncing: false,
  lastSyncedAt: null,
  syncError: null,

  // =============================================
  // Tournament Settings
  // =============================================

  setTournament: (t) =>
    set((state) => ({
      tournament: { ...state.tournament, ...t },
    })),

  // =============================================
  // Player Management
  // =============================================

  addPlayer: (player) => {
    const { tournament, players } = get();
    if (!player?.i) return false;
    if (players.some((p) => p.i === player.i)) return false;
    if (players.length >= tournament.n) {
      alert(`Ya tienes ${tournament.n} participantes (N). Sube N o quita uno.`);
      return false;
    }
    set((state) => ({ players: [...state.players, player] }));
    return true;
  },

  removePlayer: (robotId) =>
    set((state) => ({
      players: state.players.filter((p) => p.i !== robotId),
    })),

  reorderPlayer: (robotId, direction) => {
    const { players } = get();
    const idx = players.findIndex((p) => p.i === robotId);
    if (idx === -1) return;
    const newPlayers = [...players];
    if (direction === 'up' && idx > 0) {
      [newPlayers[idx - 1], newPlayers[idx]] = [newPlayers[idx], newPlayers[idx - 1]];
    } else if (direction === 'down' && idx < players.length - 1) {
      [newPlayers[idx + 1], newPlayers[idx]] = [newPlayers[idx], newPlayers[idx + 1]];
    }
    set({ players: newPlayers });
  },

  shufflePlayers: () => set((state) => ({ players: shuffleArray(state.players) })),

  clearPlayers: () => set({ players: [] }),

  // =============================================
  // Bracket Generation
  // =============================================

  generate: async () => {
    const { tournament, players, tournamentId } = get();
    const N = tournament.n;
    
    if (players.length < 2) {
      alert('Agrega al menos 2 participantes.');
      return;
    }
    if (players.length > N) {
      alert(`Tienes más de N=${N}. Quita participantes o sube N.`);
      return;
    }

    const nextMode = get().organizerUnlocked ? 'organizer' : 'competitor';
    set({ viewMode: nextMode, viewStyle: 'columns', syncError: null });

    let view: ViewState;

    if (tournament.format === 'single') {
      const bracket = buildSingleBracketBO3(players, N);
      autoAdvanceByesBO3(bracket);
      view = {
        type: 'single',
        bracket,
        thirdPlaceMatch: syncThirdPlaceMatchFromBracket(bracket, undefined, 'single-third-place'),
      };
    } else if (tournament.format === 'groups') {
      const g = Math.min(tournament.groups, Math.max(2, players.length));
      const adv = Math.max(1, tournament.adv);
      const groups = assignGroupsSnake(players, g);
      let qualifiers: Player[] = [];
      groups.forEach((arr) => {
        qualifiers = qualifiers.concat(arr.slice(0, adv));
      });
      const finalN = Math.max(2, qualifiers.length);
      const bracket = buildSingleBracketBO3(qualifiers, finalN);
      autoAdvanceByesBO3(bracket);
      view = {
        type: 'groups',
        groups,
        qualifiers,
        finalBracket: bracket,
        finalThirdPlaceMatch: syncThirdPlaceMatchFromBracket(bracket, undefined, 'groups-third-place'),
      };
    } else {
      const dbl = buildDoubleStructure(players, N);
      view = { type: 'double', dbl, tournamentResolved: false, champion: null };
    }

    set({ view, viewStyle: 'columns' });

    // If we have a tournament ID, save the bracket to DB
    if (tournamentId) {
      set({ isSyncing: true });
      const result = await saveBracketData(tournamentId, view);
      if (result.error) {
        set({
          isSyncing: false,
          lastSyncedAt: null,
          syncError: result.error.message,
        });
        return;
      }
      
      // Initialize standings for participants
      let standingsInitWarning: Error | null = null;
      if (tournament.format === 'groups') {
        // For groups format, assign group indices
        const groupAssignments = new Map<string, number>();
        view.groups?.forEach((group, groupIndex) => {
          group.forEach((player) => {
            groupAssignments.set(player.i, groupIndex);
          });
        });
        const standingsInitResult = await initializeStandings(
          tournamentId,
          players.map((p) => p.i),
          groupAssignments
        );
        standingsInitWarning = standingsInitResult.error;
      } else {
        const standingsInitResult = await initializeStandings(
          tournamentId,
          players.map((p) => p.i)
        );
        standingsInitWarning = standingsInitResult.error;
      }

      if (standingsInitWarning) {
        console.warn('No se pudo inicializar standings, continuando con guardado de llaves y matches.', standingsInitWarning);
      }

      // Update status to active
      const statusResult = await apiUpdateTournament(tournamentId, { status: 'active' });
      if (statusResult.error) {
        set({
          isSyncing: false,
          lastSyncedAt: null,
          syncError: statusResult.error.message,
        });
        return;
      }
      const syncProgressResult = await syncTournamentProgress(tournamentId, view);

      set({
        isSyncing: false,
        lastSyncedAt: syncProgressResult.error ? null : new Date(),
        syncError: syncProgressResult.error?.message || null,
      });
    }
  },

  clearView: () => set({ view: null }),

  setViewMode: (mode) =>
    set((state) => ({
      viewMode: mode === 'organizer' && !state.organizerUnlocked ? 'competitor' : mode,
    })),

  unlockOrganizerMode: async (token) => {
    const ok = await validateOrganizerToken(token);
    if (ok) {
      set({ organizerUnlocked: true, viewMode: 'organizer' });
    } else {
      set({ organizerUnlocked: false, viewMode: 'competitor' });
    }
    return ok;
  },

  refreshOrganizerSession: async () => {
    const ok = await hasOrganizerSession();
    set(() => ({
      organizerUnlocked: ok,
      viewMode: ok ? 'organizer' : 'competitor',
    }));
    return ok;
  },

  setViewStyle: (style) => set({ viewStyle: style }),

  // =============================================
  // Match Scoring (same logic as existing store)
  // =============================================

  toggleMatchWin: (bracketId, ri, mi, side) => {
    const { view, tournamentId, viewMode } = get();
    if (viewMode !== 'organizer') return;
    if (!view || view.tournamentResolved) return;

    if (view.type === 'double' && view.dbl) {
      const dbl = view.dbl;

      if (bracketId === 'winners') {
        const m = dbl.winners.rounds[ri][mi];
        const currentSide = m.winner;

        if (currentSide === side) {
          clearMatchBO3(dbl.winners, ri, mi);
        } else {
          const loserSide = side === 'a' ? 'b' : 'a';
          incWinBO3(dbl.winners, ri, mi, side);

          if (m.wa >= 2 || m.wb >= 2) {
            propagateWinnerToLosers(dbl, ri, mi, loserSide);
          }
        }
        advanceWinnersChampionToGrandFinal(dbl);
        set({ view: { ...view, dbl: { ...dbl } } });
      } else if (bracketId === 'losers') {
        const m = dbl.losers.rounds[ri][mi];
        const currentSide = m.winner;

        if (currentSide === side) {
          clearLosersMatch(dbl, ri, mi);
        } else {
          incWinBO3Losers(dbl, ri, mi, side);
        }
        set({ view: { ...view, dbl: { ...dbl } } });
      } else if (bracketId === 'gf') {
        const gfMatch = dbl.grandFinal[0];
        const currentSide = gfMatch.winner;

        if (currentSide === side) {
          gfMatch.wa = 0;
          gfMatch.wb = 0;
          gfMatch.winner = null;
          dbl.gfReset = false;
          dbl.grandFinal = [gfMatch];
          dbl.tournamentResolved = false;
          dbl.champion = null;
        } else {
          resolveGrandFinal(dbl, side);
        }
        set({ view: { ...view, dbl: { ...dbl } } });
      }

      // Auto-sync bracket if we have a tournament ID
      if (tournamentId) {
        get().syncBracket();
      }
      return;
    }

    let bracket: Bracket | undefined;
    if (view.type === 'single' && bracketId === 'single-third-place' && view.thirdPlaceMatch) {
      const m = view.thirdPlaceMatch;
      if (m.winner === side) {
        clearStandaloneMatch(m);
      } else {
        toggleStandaloneMatchWin(m, side);
      }
      set({ view: { ...view, thirdPlaceMatch: { ...m } } });
      if (tournamentId) {
        get().syncBracket();
      }
      return;
    }

    if (view.type === 'groups' && bracketId === 'groups-third-place' && view.finalThirdPlaceMatch) {
      const m = view.finalThirdPlaceMatch;
      if (m.winner === side) {
        clearStandaloneMatch(m);
      } else {
        toggleStandaloneMatchWin(m, side);
      }
      set({ view: { ...view, finalThirdPlaceMatch: { ...m } } });
      if (tournamentId) {
        get().syncBracket();
      }
      return;
    }

    if (view.type === 'single') {
      bracket = view.bracket;
    } else if (view.type === 'groups') {
      if (bracketId === 'final') {
        bracket = view.finalBracket;
      }
    }

    if (!bracket) return;

    const m = bracket.rounds[ri][mi];
    const currentSide = m.winner;

    if (currentSide === side) {
      clearMatchBO3(bracket, ri, mi);
    } else {
      incWinBO3(bracket, ri, mi, side);
    }

    if (view.type === 'single') {
      const thirdPlaceMatch = syncThirdPlaceMatchFromBracket(bracket, view.thirdPlaceMatch, 'single-third-place');
      set({ view: { ...view, bracket: { ...bracket! }, thirdPlaceMatch } });
    } else if (view.type === 'groups') {
      if (bracketId === 'final') {
        const finalThirdPlaceMatch = syncThirdPlaceMatchFromBracket(
          bracket,
          view.finalThirdPlaceMatch,
          'groups-third-place'
        );
        set({ view: { ...view, finalBracket: { ...bracket! }, finalThirdPlaceMatch } });
      }
    }

    // Auto-sync bracket if we have a tournament ID
    if (tournamentId) {
      get().syncBracket();
    }
  },

  clearMatch: (bracketId, ri, mi) => {
    const { view, tournamentId, viewMode } = get();
    if (viewMode !== 'organizer') return;
    if (!view) return;

    if (view.type === 'double' && view.dbl) {
      const dbl = view.dbl;

      if (bracketId === 'winners') {
        clearMatchBO3(dbl.winners, ri, mi);
        advanceWinnersChampionToGrandFinal(dbl);
        set({ view: { ...view, dbl: { ...dbl } } });
      } else if (bracketId === 'losers') {
        clearLosersMatch(dbl, ri, mi);
        set({ view: { ...view, dbl: { ...dbl } } });
      } else if (bracketId === 'gf') {
        clearGrandFinal(dbl);
        set({ view: { ...view, dbl: { ...dbl } } });
      }

      if (tournamentId) {
        get().syncBracket();
      }
      return;
    }

    let bracket: Bracket | undefined;
    if (view.type === 'single' && bracketId === 'single-third-place' && view.thirdPlaceMatch) {
      const m = view.thirdPlaceMatch;
      clearStandaloneMatch(m);
      set({ view: { ...view, thirdPlaceMatch: { ...m } } });
      if (tournamentId) {
        get().syncBracket();
      }
      return;
    }

    if (view.type === 'groups' && bracketId === 'groups-third-place' && view.finalThirdPlaceMatch) {
      const m = view.finalThirdPlaceMatch;
      clearStandaloneMatch(m);
      set({ view: { ...view, finalThirdPlaceMatch: { ...m } } });
      if (tournamentId) {
        get().syncBracket();
      }
      return;
    }

    if (view.type === 'single') {
      bracket = view.bracket;
    } else if (view.type === 'groups') {
      if (bracketId === 'final') {
        bracket = view.finalBracket;
      }
    }

    if (!bracket) return;

    clearMatchBO3(bracket, ri, mi);

    if (view.type === 'single') {
      const thirdPlaceMatch = syncThirdPlaceMatchFromBracket(bracket, view.thirdPlaceMatch, 'single-third-place');
      set({ view: { ...view, bracket: { ...bracket! }, thirdPlaceMatch } });
    } else if (view.type === 'groups') {
      if (bracketId === 'final') {
        const finalThirdPlaceMatch = syncThirdPlaceMatchFromBracket(
          bracket,
          view.finalThirdPlaceMatch,
          'groups-third-place'
        );
        set({ view: { ...view, finalBracket: { ...bracket! }, finalThirdPlaceMatch } });
      }
    }

    if (tournamentId) {
      get().syncBracket();
    }
  },

  // =============================================
  // Database Sync Operations
  // =============================================

  createAndSave: async () => {
    const { tournament, players } = get();

    if (!tournament.name.trim()) {
      alert('El torneo necesita un nombre.');
      return null;
    }

    const hasSession = await hasOrganizerSession();
    if (!hasSession) {
      set({
        organizerUnlocked: false,
        viewMode: 'competitor',
        syncError: 'Necesitas token de organizador para crear el torneo.',
      });
      return null;
    }

    if (!get().organizerUnlocked) {
      set({ organizerUnlocked: true });
    }

    set({ isSyncing: true, syncError: null });

    try {
      // Create tournament in DB
      const { data: dbTournament, error: createError } = await apiCreateTournament({
        name: tournament.name,
        category: normalizeRobotCategory(tournament.category),
        venue: tournament.venue || null,
        date: tournament.date || null,
        format: tournament.format,
        size: tournament.n,
        groups_count: tournament.groups,
        advance_per_group: tournament.adv,
        status: 'draft',
      });

      if (createError || !dbTournament) {
        set({ isSyncing: false, syncError: createError?.message || 'Error creating tournament' });
        return null;
      }

      // Add participants if any
      if (players.length > 0) {
        const participantData = players.map((player, index) => ({
          robotId: player.i,
          robotData: playerToRobotData(player),
          seed: index + 1,
        }));

        const participantsResult = await addParticipants(dbTournament.id, participantData);
        if (
          participantsResult.errors.length > 0 ||
          participantsResult.data.length !== participantData.length
        ) {
          const firstError = participantsResult.errors[0];
          set({
            isSyncing: false,
            syncError: firstError?.message || 'Error creating tournament participants',
          });
          return null;
        }
      }

      set({
        tournamentId: dbTournament.id,
        isSyncing: false,
        lastSyncedAt: new Date(),
        syncError: null,
      });

      return dbTournament.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ isSyncing: false, syncError: message });
      return null;
    }
  },

  loadTournament: async (id: string) => {
    set({ isSyncing: true, syncError: null });

    try {
      const { data, error } = await getTournamentWithDetails(id);

      if (error || !data) {
        set({ isSyncing: false, syncError: error?.message || 'Tournament not found' });
        return false;
      }

      // Convert DB tournament to local format
      const tournament: Tournament = {
        name: data.name,
        category: normalizeRobotCategory(data.category || ROBOT_CATEGORY_MINI_SUMO_AUTONOMO_PRO),
        venue: data.venue || '',
        date: data.date || '',
        format: data.format,
        n: data.size,
        groups: data.groups_count || 4,
        adv: data.advance_per_group || 2,
      };

      // Convert participants to players
      const players: Player[] = data.participants.map((p: DbParticipant) => {
        const player = p.robot_data as Player;
        return {
          ...player,
          c: normalizeRobotCategory(player.c),
        };
      });

      // Load bracket data (snapshot has priority, with fallback from persisted matches)
      const view = getCompatibleView(
        tournament.format,
        data.bracket_data as ViewState | null,
        data.matches,
        players
      );

      set({
        tournamentId: id,
        tournament,
        players,
        view,
        viewMode: get().organizerUnlocked ? 'organizer' : 'competitor',
        viewStyle: 'columns',
        isSyncing: false,
        lastSyncedAt: new Date(),
        syncError: null,
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ isSyncing: false, syncError: message });
      return false;
    }
  },

  saveTournament: async () => {
    const { tournamentId, tournament, players, view } = get();

    if (!tournamentId) {
      // Create new tournament
      const id = await get().createAndSave();
      return id !== null;
    }

    set({ isSyncing: true, syncError: null });

    try {
      // Update tournament metadata
      await apiUpdateTournament(tournamentId, {
        name: tournament.name,
        category: normalizeRobotCategory(tournament.category),
        venue: tournament.venue || null,
        date: tournament.date || null,
        format: tournament.format,
        size: tournament.n,
        groups_count: tournament.groups,
        advance_per_group: tournament.adv,
      });

      // Update participants
      await removeAllParticipants(tournamentId);
      if (players.length > 0) {
        const participantData = players.map((player, index) => ({
          robotId: player.i,
          robotData: playerToRobotData(player),
          seed: index + 1,
        }));
        await addParticipants(tournamentId, participantData);
      }

      // Save bracket if exists
      if (view) {
        await saveBracketData(tournamentId, view);
        const syncProgressResult = await syncTournamentProgress(tournamentId, view);
        if (syncProgressResult.error) {
          set({ isSyncing: false, syncError: syncProgressResult.error.message });
          return false;
        }
      }

      set({ isSyncing: false, lastSyncedAt: new Date(), syncError: null });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ isSyncing: false, syncError: message });
      return false;
    }
  },

  syncBracket: async () => {
    const { tournamentId, view } = get();
    if (!tournamentId || !view) return false;

    // Debounce: don't set syncing state for quick operations
    const result = await saveBracketData(tournamentId, view);
    
    if (result.error) {
      set({ syncError: result.error.message });
      return false;
    }

    const syncProgressResult = await syncTournamentProgress(tournamentId, view);
    if (syncProgressResult.error) {
      set({ syncError: syncProgressResult.error.message });
      return false;
    }

    set({ lastSyncedAt: new Date(), syncError: null });
    return true;
  },

  // =============================================
  // Reset
  // =============================================

  resetTournament: () =>
    set({
      tournamentId: null,
      tournament: { ...defaultTournament },
      players: [],
      view: null,
      viewMode: 'competitor',
      organizerUnlocked: false,
      viewStyle: 'columns',
      isSyncing: false,
      lastSyncedAt: null,
      syncError: null,
    }),

  newTournament: () =>
    set({
      tournamentId: null,
      tournament: { ...defaultTournament },
      players: [],
      view: null,
      viewMode: 'competitor',
      organizerUnlocked: false,
      viewStyle: 'columns',
    }),
}));

// =============================================
// Realtime Subscription Hook
// =============================================

export function subscribeToTournament(
  tournamentId: string,
  onUpdate: (data: DbTournament) => void
) {
  const channel = getSupabaseClient()
    .channel(`tournament-${tournamentId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'tournaments',
        filter: `id=eq.${tournamentId}`,
      },
      (payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => {
        onUpdate(payload.new as DbTournament);
      }
    )
    .subscribe();

  return () => {
    getSupabaseClient().removeChannel(channel);
  };
}
