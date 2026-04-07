/**
 * Database-synced Tournament Store
 * Extends the local tournament store with Supabase persistence
 */

import { create } from 'zustand';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Player, Tournament, ViewState, Bracket } from '../lib/types';
import type { DbTournament, DbParticipant } from '@/lib/supabase/database.types';
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

async function syncTournamentProgress(tournamentId: string, view: ViewState) {
  const matchesResult = await syncTournamentMatches(tournamentId, view);
  if (matchesResult.error) {
    return { error: matchesResult.error };
  }

  const standingsResult = await recalculateStandings(tournamentId);
  if (standingsResult.error) {
    return { error: standingsResult.error };
  }

  return { error: null };
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
  category: 'Mini Sumo Autónomo Profesional',
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
  viewMode: 'organizer',
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

    set({ viewMode: 'organizer', viewStyle: 'columns' });

    let view: ViewState;

    if (tournament.format === 'single') {
      const bracket = buildSingleBracketBO3(players, N);
      autoAdvanceByesBO3(bracket);
      view = { type: 'single', bracket };
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
      view = { type: 'groups', groups, qualifiers, finalBracket: bracket };
    } else {
      const dbl = buildDoubleStructure(players, N);
      view = { type: 'double', dbl, tournamentResolved: false, champion: null };
    }

    set({ view, viewStyle: 'columns' });

    // If we have a tournament ID, save the bracket to DB
    if (tournamentId) {
      set({ isSyncing: true });
      const result = await saveBracketData(tournamentId, view);
      
      // Initialize standings for participants
      if (tournament.format === 'groups') {
        // For groups format, assign group indices
        const groupAssignments = new Map<string, number>();
        view.groups?.forEach((group, groupIndex) => {
          group.forEach((player) => {
            groupAssignments.set(player.i, groupIndex);
          });
        });
        await initializeStandings(
          tournamentId,
          players.map((p) => p.i),
          groupAssignments
        );
      } else {
        await initializeStandings(
          tournamentId,
          players.map((p) => p.i)
        );
      }

      // Update status to active
      await apiUpdateTournament(tournamentId, { status: 'active' });
      const syncProgressResult = await syncTournamentProgress(tournamentId, view);

      set({
        isSyncing: false,
        lastSyncedAt: result.error || syncProgressResult.error ? null : new Date(),
        syncError: result.error?.message || syncProgressResult.error?.message || null,
      });
    }
  },

  clearView: () => set({ view: null }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setViewStyle: (style) => set({ viewStyle: style }),

  // =============================================
  // Match Scoring (same logic as existing store)
  // =============================================

  toggleMatchWin: (bracketId, ri, mi, side) => {
    const { view, tournamentId } = get();
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

            const isWinnersFinal = ri === dbl.winners.rounds.length - 1;
            if (isWinnersFinal) {
              advanceWinnersChampionToGrandFinal(dbl);
            }
          }
        }
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
        const gfMatch = dbl.gfReset && dbl.grandFinal.length > 1 ? dbl.grandFinal[1] : dbl.grandFinal[0];
        const currentSide = gfMatch.winner;

        if (currentSide === side) {
          if (dbl.gfReset && dbl.grandFinal.length > 1) {
            dbl.grandFinal[1].wa = 0;
            dbl.grandFinal[1].wb = 0;
            dbl.grandFinal[1].winner = null;
          } else {
            gfMatch.wa = 0;
            gfMatch.wb = 0;
            gfMatch.winner = null;
          }
        } else {
          const result = resolveGrandFinal(dbl, side);
          if (result.reset) {
            set({ view: { ...view, dbl: { ...dbl } } });
            return;
          }
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
      set({ view: { ...view, bracket: { ...bracket! } } });
    } else if (view.type === 'groups') {
      if (bracketId === 'final') {
        set({ view: { ...view, finalBracket: { ...bracket! } } });
      }
    }

    // Auto-sync bracket if we have a tournament ID
    if (tournamentId) {
      get().syncBracket();
    }
  },

  clearMatch: (bracketId, ri, mi) => {
    const { view, tournamentId } = get();
    if (!view) return;

    if (view.type === 'double' && view.dbl) {
      const dbl = view.dbl;

      if (bracketId === 'winners') {
        clearMatchBO3(dbl.winners, ri, mi);
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
      set({ view: { ...view, bracket: { ...bracket! } } });
    } else if (view.type === 'groups') {
      if (bracketId === 'final') {
        set({ view: { ...view, finalBracket: { ...bracket! } } });
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

    set({ isSyncing: true, syncError: null });

    try {
      // Create tournament in DB
      const { data: dbTournament, error: createError } = await apiCreateTournament({
        name: tournament.name,
        category: tournament.category,
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

        await addParticipants(dbTournament.id, participantData);
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
        category: data.category || 'Mini Sumo Autónomo Profesional',
        venue: data.venue || '',
        date: data.date || '',
        format: data.format,
        n: data.size,
        groups: data.groups_count || 4,
        adv: data.advance_per_group || 2,
      };

      // Convert participants to players
      const players: Player[] = data.participants.map((p: DbParticipant) => p.robot_data as Player);

      // Load bracket data
      const view = data.bracket_data as ViewState | null;

      set({
        tournamentId: id,
        tournament,
        players,
        view,
        viewMode: 'organizer',
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
        category: tournament.category,
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
      viewMode: 'organizer',
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
      viewMode: 'organizer',
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
