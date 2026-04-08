import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Player,
  Tournament,
  ViewState,
  Bracket,
} from "../lib/types";
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
} from "../lib/bracketUtils";
import { LOCAL_KEY } from "../lib/types";
import { ROBOT_CATEGORY_MINI_SUMO_AUTONOMO_PRO } from "@/lib/categoryNormalization";

interface TournamentStore {
  tournament: Tournament;
  players: Player[];
  view: ViewState | null;
  viewMode: "organizer" | "competitor";
  viewStyle: "columns" | "map";

  setTournament: (t: Partial<Tournament>) => void;
  addPlayer: (player: Player) => boolean;
  removePlayer: (robotId: string) => void;
  reorderPlayer: (robotId: string, direction: "up" | "down") => void;
  shufflePlayers: () => void;
  clearPlayers: () => void;

  generate: () => void;
  clearView: () => void;
  setViewMode: (mode: "organizer" | "competitor") => void;
  setViewStyle: (style: "columns" | "map") => void;
  toggleMatchWin: (
    bracketId: string,
    ri: number,
    mi: number,
    side: "a" | "b"
  ) => void;
  clearMatch: (bracketId: string, ri: number, mi: number) => void;

  resetTournament: () => void;
  saveToLocal: () => void;
  loadFromLocal: () => boolean;
}

const defaultTournament: Tournament = {
  name: "",
  category: ROBOT_CATEGORY_MINI_SUMO_AUTONOMO_PRO,
  venue: "",
  date: "",
  format: "single",
  n: 8,
  groups: 4,
  adv: 2,
};

export const useTournamentStore = create<TournamentStore>()(
  persist(
    (set, get) => ({
      tournament: { ...defaultTournament },
      players: [],
      view: null,
      viewMode: "organizer",
      viewStyle: "columns",

      setTournament: (t) =>
        set((state) => ({
          tournament: { ...state.tournament, ...t },
        })),

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
        if (direction === "up" && idx > 0) {
          [newPlayers[idx - 1], newPlayers[idx]] = [
            newPlayers[idx],
            newPlayers[idx - 1],
          ];
        } else if (direction === "down" && idx < players.length - 1) {
          [newPlayers[idx + 1], newPlayers[idx]] = [
            newPlayers[idx],
            newPlayers[idx + 1],
          ];
        }
        set({ players: newPlayers });
      },

      shufflePlayers: () =>
        set((state) => ({ players: shuffleArray(state.players) })),

      clearPlayers: () => set({ players: [] }),

      generate: () => {
        const { tournament, players } = get();
        const N = tournament.n;
        if (players.length < 2) {
          alert("Agrega al menos 2 participantes.");
          return;
        }
        if (players.length > N) {
          alert(`Tienes más de N=${N}. Quita participantes o sube N.`);
          return;
        }

        set({ viewMode: "organizer", viewStyle: "columns" });

        if (tournament.format === "single") {
          const bracket = buildSingleBracketBO3(players, N);
          autoAdvanceByesBO3(bracket);
          set({
            view: { type: "single", bracket },
            viewStyle: "columns",
          });
        } else if (tournament.format === "groups") {
          const g = Math.min(
            tournament.groups,
            Math.max(2, players.length)
          );
          const adv = Math.max(1, tournament.adv);
          const groups = assignGroupsSnake(players, g);
          let qualifiers: Player[] = [];
          groups.forEach((arr) => {
            qualifiers = qualifiers.concat(arr.slice(0, adv));
          });
          const finalN = Math.max(2, qualifiers.length);
          const bracket = buildSingleBracketBO3(qualifiers, finalN);
          autoAdvanceByesBO3(bracket);
          set({
            view: {
              type: "groups",
              groups,
              qualifiers,
              finalBracket: bracket,
            },
            viewStyle: "columns",
          });
        } else if (tournament.format === "double") {
          const dbl = buildDoubleStructure(players, N);
          set({
            view: {
              type: "double",
              dbl,
              tournamentResolved: false,
              champion: null,
            },
            viewStyle: "columns",
          });
        }
      },

      clearView: () => set({ view: null }),

      setViewMode: (mode) => set({ viewMode: mode }),

      setViewStyle: (style) => set({ viewStyle: style }),

      toggleMatchWin: (bracketId, ri, mi, side) => {
        const { view } = get();
        if (!view || view.tournamentResolved) return;

        if (view.type === "double" && view.dbl) {
          const dbl = view.dbl;

          if (bracketId === "winners") {
            const m = dbl.winners.rounds[ri][mi];
            const currentSide = m.winner;

            if (currentSide === side) {
              clearMatchBO3(dbl.winners, ri, mi);
            } else {
              const loserSide = side === "a" ? "b" : "a";
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

          } else if (bracketId === "losers") {
            const m = dbl.losers.rounds[ri][mi];
            const currentSide = m.winner;

            if (currentSide === side) {
              clearLosersMatch(dbl, ri, mi);
            } else {
              // Usar incWinBO3Losers que tiene lógica de avance correcta
              incWinBO3Losers(dbl, ri, mi, side);
            }
            set({ view: { ...view, dbl: { ...dbl } } });

          } else if (bracketId === "gf") {
            const gfMatch = dbl.gfReset && dbl.grandFinal.length > 1
              ? dbl.grandFinal[1]
              : dbl.grandFinal[0];
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
          return;
        }

        let bracket: Bracket | undefined;
        if (view.type === "single") {
          bracket = view.bracket;
        } else if (view.type === "groups") {
          if (bracketId === "final") {
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

        if (view.type === "single") {
          set({ view: { ...view, bracket: { ...bracket! } } });
        } else if (view.type === "groups") {
          if (bracketId === "final") {
            set({
              view: {
                ...view,
                finalBracket: { ...bracket! },
              },
            });
          }
        }
      },

      clearMatch: (bracketId, ri, mi) => {
        const { view } = get();
        if (!view) return;

        if (view.type === "double" && view.dbl) {
          const dbl = view.dbl;

          if (bracketId === "winners") {
            clearMatchBO3(dbl.winners, ri, mi);
            set({ view: { ...view, dbl: { ...dbl } } });

          } else if (bracketId === "losers") {
            clearLosersMatch(dbl, ri, mi);
            set({ view: { ...view, dbl: { ...dbl } } });

          } else if (bracketId === "gf") {
            clearGrandFinal(dbl);
            set({ view: { ...view, dbl: { ...dbl } } });
          }
          return;
        }

        let bracket: Bracket | undefined;
        if (view.type === "single") {
          bracket = view.bracket;
        } else if (view.type === "groups") {
          if (bracketId === "final") {
            bracket = view.finalBracket;
          }
        }

        if (!bracket) return;

        clearMatchBO3(bracket, ri, mi);

        if (view.type === "single") {
          set({ view: { ...view, bracket: { ...bracket! } } });
        } else if (view.type === "groups") {
          if (bracketId === "final") {
            set({
              view: {
                ...view,
                finalBracket: { ...bracket! },
              },
            });
          }
        }
      },

      resetTournament: () =>
        set({
          tournament: { ...defaultTournament },
          players: [],
          view: null,
          viewMode: "organizer",
          viewStyle: "columns",
        }),

      saveToLocal: () => {
        const { tournament, players, view, viewMode, viewStyle } = get();
        const payload = { tournament, players, view, viewMode, viewStyle };
        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_KEY, JSON.stringify(payload));
        }
      },

      loadFromLocal: () => {
        if (typeof window === "undefined") return false;
        const raw = localStorage.getItem(LOCAL_KEY);
        if (!raw) return false;
        try {
          const payload = JSON.parse(raw);
          set({
            tournament: payload.tournament || defaultTournament,
            players: payload.players || [],
            view: payload.view || null,
            viewMode: payload.viewMode || "organizer",
            viewStyle: payload.viewStyle || "columns",
          });
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: "tournament-storage",
    }
  )
);
