import type { Player, Bracket, Match, Slot, DoubleStructure } from "./types";

export interface BracketRoundSeedTeam {
  name: string;
  score?: number;
  winner?: boolean;
}

export interface BracketRoundSeed {
  id: string;
  teams: [BracketRoundSeedTeam, BracketRoundSeedTeam];
  wa: number;
  wb: number;
  winner: "a" | "b" | null;
  aBye: boolean;
  bBye: boolean;
}

export interface BracketRoundView {
  title: string;
  seeds: BracketRoundSeed[];
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function nextPow2(n: number): number {
  let v = 1;
  while (v < n) v *= 2;
  return v;
}

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getTeam(p: Player | null): string {
  return p?.t || "";
}

function pairCost(a: Player | null, b: Player | null): number {
  if (a === null && b === null) return 1000;
  if (a === null || b === null) return 5;
  const ta = getTeam(a as Player);
  const tb = getTeam(b as Player);
  if (ta && tb && ta === tb) return 100;
  return 0;
}

function totalPairsCost(pairs: [Player | null, Player | null][]): number {
  let c = 0;
  for (const [a, b] of pairs) c += pairCost(a, b);
  return c;
}

function pairAvoidSameTeamGreedy(
  players: Player[],
  size: number
): [Player | null, Player | null][] {
  const slots: (Player | null)[] = players.slice(0, size);
  while (slots.length < size) slots.push(null);

  const used = new Array(slots.length).fill(false);
  const pairs: [Player | null, Player | null][] = [];

  function pickNext(): number {
    for (let i = 0; i < slots.length; i++) if (!used[i]) return i;
    return -1;
  }

  while (pairs.length < size / 2) {
    const i = pickNext();
    if (i === -1) break;
    used[i] = true;
    const a = slots[i];

    let bestJ = -1;
    let bestScore = 1e9;

    for (let j = 0; j < slots.length; j++) {
      if (used[j]) continue;
      const b = slots[j];
      const score = pairCost(a, b);
      if (score < bestScore) {
        bestScore = score;
        bestJ = j;
      }
      if (bestScore === 0) break;
    }

    if (bestJ === -1) pairs.push([a, null]);
    else {
      used[bestJ] = true;
      pairs.push([a, slots[bestJ]]);
    }
  }

  return pairs;
}

function trySwap(
  pairs: [Player | null, Player | null][],
  i: number,
  j: number,
  mode: number
): boolean {
  const pi = pairs[i];
  const pj = pairs[j];

  let ai = pi[0],
    bi = pi[1];
  let aj = pj[0],
    bj = pj[1];

  if (mode === 0) [bi, bj] = [bj, bi];
  else if (mode === 1) [ai, aj] = [aj, ai];
  else if (mode === 2) [ai, bj] = [bj, ai];
  else if (mode === 3) [bi, aj] = [aj, bi];

  const old =
    pairCost(pi[0], pi[1]) + pairCost(pj[0], pj[1]);
  const neu = pairCost(ai, bi) + pairCost(aj, bj);

  if (neu < old) {
    pairs[i] = [ai, bi];
    pairs[j] = [aj, bj];
    return true;
  }
  return false;
}

export function pairAvoidSameTeam(
  players: Player[],
  size: number
): [Player | null, Player | null][] {
  let pairs = pairAvoidSameTeamGreedy(players, size);

  const maxIters = 350;
  let bestCost = totalPairsCost(pairs);
  if (bestCost === 0) return pairs;

  for (let iter = 0; iter < maxIters; iter++) {
    if (bestCost === 0) break;
    let improved = false;

    const bad: { i: number; c: number }[] = [];
    for (let i = 0; i < pairs.length; i++) {
      const c = pairCost(pairs[i][0], pairs[i][1]);
      if (c > 0) bad.push({ i, c });
    }
    bad.sort((x, y) => y.c - x.c);
    if (!bad.length) break;

    for (const bx of bad) {
      const i = bx.i;
      for (let j = 0; j < pairs.length; j++) {
        if (j === i) continue;
        for (let mode = 0; mode < 4; mode++) {
          if (trySwap(pairs, i, j, mode)) improved = true;
          if (bestCost === 0) break;
        }
        if (bestCost === 0) break;
      }
      if (bestCost === 0) break;
    }

    if (!improved) break;
  }

  if (bestCost > 0) {
    let bestPairs = pairs;
    let best = bestCost;

    const restarts = 10;
    for (let r = 0; r < restarts; r++) {
      const shuffled = shuffleArray(players);
      let cand = pairAvoidSameTeamGreedy(shuffled, size);
      let candCost = totalPairsCost(cand);

      pairs = cand;
      bestCost = candCost;
      for (let iter = 0; iter < 120; iter++) {
        let improved = false;
        for (let i = 0; i < pairs.length; i++) {
          for (let j = i + 1; j < pairs.length; j++) {
            for (let mode = 0; mode < 4; mode++) {
              if (trySwap(pairs, i, j, mode)) improved = true;
            }
          }
        }
        if (!improved) break;
      }
      cand = pairs;
      candCost = totalPairsCost(cand);

      if (candCost < best) {
        best = candCost;
        bestPairs = cand;
      }
      if (best === 0) break;
    }

    pairs = bestPairs;
  }

  return pairs;
}

export function slotFromPlayer(p: Player | null): Slot {
  if (!p) return { id: "", name: "BYE", rid: "", team: "", compact: null, bye: true };
  return { id: p.i, name: p.n || "Robot", rid: p.i, team: getTeam(p), compact: p, bye: false };
}

export function emptySlot(): Slot {
  return { id: "", name: "—", rid: "", team: "", compact: null, bye: false };
}

export function isBye(slot: Slot): boolean {
  return slot?.name === "BYE" || slot?.bye;
}

export function buildSingleBracketBO3(
  players: Player[],
  N: number
): Bracket {
  const size = nextPow2(N);
  const actual = players.slice(0, N);
  const pairs = pairAvoidSameTeam(actual, size);
  const rounds: Match[][] = [];
  const r1 = pairs.map((pair, idx) => ({
    id: `R1M${idx + 1}`,
    a: slotFromPlayer(pair[0]),
    b: slotFromPlayer(pair[1]),
    wa: 0,
    wb: 0,
    winner: null as "a" | "b" | null,
  }));
  rounds.push(r1);
  const totalRounds = Math.log2(size);
  for (let r = 2; r <= totalRounds; r++) {
    const prev = rounds[r - 2];
    const matches: Match[] = [];
    for (let m = 0; m < prev.length; m += 2) {
      matches.push({
        id: `R${r}M${m / 2 + 1}`,
        a: emptySlot(),
        b: emptySlot(),
        wa: 0,
        wb: 0,
        winner: null,
      });
    }
    rounds.push(matches);
  }
  return { type: "single", size, rounds };
}

export function clearDownstreamBO3(
  bracket: Bracket,
  fromRoundIndex: number,
  fromMatchIndex: number
): void {
  for (let r = fromRoundIndex; r < bracket.rounds.length; r++) {
    const mi =
      r === fromRoundIndex
        ? fromMatchIndex
        : Math.floor(fromMatchIndex / Math.pow(2, r - fromRoundIndex));
    const m = bracket.rounds[r][mi];
    if (!m) continue;
    m.winner = null;
    m.wa = 0;
    m.wb = 0;
  }
}

export function setWinnerBO3(
  bracket: Bracket,
  ri: number,
  mi: number,
  side: "a" | "b"
): void {
  const m = bracket.rounds[ri][mi];
  m.winner = side;
  const nextRound = bracket.rounds[ri + 1];
  if (!nextRound) return;
  const targetMatchIndex = Math.floor(mi / 2);
  const targetSide = mi % 2 === 0 ? "a" : "b";
  const winnerSlot = m.winner === "a" ? m.a : m.winner === "b" ? m.b : null;
  nextRound[targetMatchIndex][targetSide] = winnerSlot
    ? {
        id: winnerSlot.id,
        name: winnerSlot.name,
        rid: winnerSlot.rid,
        team: winnerSlot.team,
        compact: winnerSlot.compact || null,
        bye: !!winnerSlot.bye,
      }
    : emptySlot();
  clearDownstreamBO3(bracket, ri + 1, targetMatchIndex);
}

export function clearMatchBO3(
  bracket: Bracket,
  ri: number,
  mi: number
): void {
  const m = bracket.rounds[ri][mi];
  m.winner = null;
  m.wa = 0;
  m.wb = 0;
  const nextRound = bracket.rounds[ri + 1];
  if (!nextRound) return;
  const targetMatchIndex = Math.floor(mi / 2);
  const targetSide = mi % 2 === 0 ? "a" : "b";
  nextRound[targetMatchIndex][targetSide] = emptySlot();
  clearDownstreamBO3(bracket, ri + 1, targetMatchIndex);
}

export function incWinBO3(
  bracket: Bracket,
  ri: number,
  mi: number,
  side: "a" | "b"
): void {
  const m = bracket.rounds[ri][mi];
  if (side === "a") m.wa = clamp(m.wa + 1, 0, 2);
  if (side === "b") m.wb = clamp(m.wb + 1, 0, 2);
  if (m.wa >= 2) setWinnerBO3(bracket, ri, mi, "a");
  else if (m.wb >= 2) setWinnerBO3(bracket, ri, mi, "b");
}

/**
 * Incrementa victoria en losers bracket usando lógica de avance correcta.
 */
export function incWinBO3Losers(
  dbl: DoubleStructure,
  ri: number,
  mi: number,
  side: "a" | "b"
): void {
  const m = dbl.losers.rounds[ri][mi];
  if (side === "a") m.wa = clamp(m.wa + 1, 0, 2);
  if (side === "b") m.wb = clamp(m.wb + 1, 0, 2);
  if (m.wa >= 2) setWinnerBO3Losers(dbl, ri, mi, "a");
  else if (m.wb >= 2) setWinnerBO3Losers(dbl, ri, mi, "b");
}

export function autoAdvanceByesBO3(bracket: Bracket): void {
  const r1 = bracket.rounds[0];
  r1.forEach((m, mi) => {
    if (isBye(m.a) && !isBye(m.b)) setWinnerBO3(bracket, 0, mi, "b");
    else if (isBye(m.b) && !isBye(m.a)) setWinnerBO3(bracket, 0, mi, "a");
  });
}

export function assignGroupsSnake(
  players: Player[],
  numGroups: number
): Player[][] {
  const groups: Player[][] = Array.from({ length: numGroups }, () => []);
  const sorted = [...players].sort(() => Math.random() - 0.5);
  sorted.forEach((player, idx) => {
    const groupIdx = idx % numGroups;
    const posInGroup = Math.floor(idx / numGroups);
    if (posInGroup % 2 === 0) {
      groups[groupIdx].push(player);
    } else {
      groups[numGroups - 1 - groupIdx].push(player);
    }
  });
  return groups;
}

/**
 * Doble eliminación estándar:
 * - Winners bracket: log2(size) rondas, igual que single elimination.
 * - Losers bracket: 2 * (log2(size) - 1) rondas.
 *   - Rondas impares (0, 2, 4...): reciben perdedores de winners + sobrevivientes de losers.
 *   - Rondas pares (1, 3, 5...): solo sobrevivientes de losers se enfrentan entre sí.
 * - Grand Final: winners champion vs losers champion.
 *   - El ganador de la Grand Final queda campeón; no se genera bracket reset.
 *
 * Mapeo de perdedores (winners round -> losers round de entrada):
 *   Winners R1 losers -> Losers R0 (primera ronda de losers)
 *   Winners R2 losers -> Losers R2
 *   Winners R(k) losers -> Losers R(2*(k-1)) para k >= 1
 */
export function buildDoubleStructure(
  players: Player[],
  N: number
): DoubleStructure {
  const size = nextPow2(N);
  const actual = players.slice(0, N);
  const pairs = pairAvoidSameTeam(actual, size);
  const winnersRounds = Math.log2(size);

  // --- Winners bracket ---
  const winners: Bracket = {
    type: "single",
    size,
    rounds: [],
  };

  const r1 = pairs.map((pair, idx) => ({
    id: `WR1M${idx + 1}`,
    a: slotFromPlayer(pair[0]),
    b: slotFromPlayer(pair[1]),
    wa: 0,
    wb: 0,
    winner: null as "a" | "b" | null,
  }));
  winners.rounds.push(r1);

  for (let r = 2; r <= winnersRounds; r++) {
    const prev = winners.rounds[r - 2];
    const matches: Match[] = [];
    for (let m = 0; m < prev.length; m += 2) {
      matches.push({
        id: `WR${r}M${m / 2 + 1}`,
        a: emptySlot(),
        b: emptySlot(),
        wa: 0,
        wb: 0,
        winner: null,
      });
    }
    winners.rounds.push(matches);
  }

  // --- Losers bracket ---
  // Número de rondas en losers: 2 * (winnersRounds - 1)
  // Para size=4: winnersRounds=2, losersRounds=2
  // Para size=8: winnersRounds=3, losersRounds=4
  // Para size=16: winnersRounds=4, losersRounds=6
  const losersRoundCount = Math.max(1, 2 * (winnersRounds - 1));

  const losers: Bracket = {
    type: "losers",
    size,
    rounds: [],
  };

  // Matches por ronda en losers:
  // cada dos rondas se mantiene el mismo conteo y luego se reduce a la mitad.
  // size=8  -> [2, 2, 1, 1]
  // size=16 -> [4, 4, 2, 2, 1, 1]
  for (let lr = 0; lr < losersRoundCount; lr++) {
    const phase = Math.floor(lr / 2);
    let matchCount = size / Math.pow(2, phase + 2);

    matchCount = Math.max(1, matchCount);
    
    const roundMatches: Match[] = [];
    for (let m = 0; m < matchCount; m++) {
      roundMatches.push({
        id: `LR${lr + 1}M${m + 1}`,
        a: emptySlot(),
        b: emptySlot(),
        wa: 0,
        wb: 0,
        winner: null,
      });
    }
    losers.rounds.push(roundMatches);
  }

  // --- Grand Final ---
  const grandFinal: Match[] = [
    {
      id: "GF1",
      a: emptySlot(),
      b: emptySlot(),
      wa: 0,
      wb: 0,
      winner: null,
    },
  ];

  // Auto-advance BYEs en winners
  autoAdvanceByesBO3(winners);

  return {
    winners,
    losers,
    grandFinal,
    gfReset: false,
    tournamentResolved: false,
    champion: null,
  };
}

/**
 * Calcula la ronda y posición en losers bracket donde debe ir un perdedor de winners.
 * 
 * Mapeo estándar:
 *   Winners R0 -> Losers R0, emparejando perdedores adyacentes
 *   Winners R1 -> Losers R1
 *   Winners R2 -> Losers R3
 *   Winners R3 -> Losers R5
 *   Winners Rk -> Losers R(2*k - 1) para k >= 1
 */
export function getLosersDropPosition(
  winnersRi: number,
  winnersMi: number
): { losersRi: number; losersMi: number; side: "a" | "b" } {
  if (winnersRi === 0) {
    return {
      losersRi: 0,
      losersMi: Math.floor(winnersMi / 2),
      side: winnersMi % 2 === 0 ? "a" : "b",
    };
  }

  return {
    losersRi: winnersRi * 2 - 1,
    losersMi: winnersMi,
    side: "b",
  };
}

/**
 * Calcula la posición de avance dentro del losers bracket.
 * 
 * En losers bracket estándar:
 * - Rondas pares (0, 2, 4...): rounds de reduccion/arranque.
 *   Sus ganadores avanzan a la siguiente ronda conservando indice.
 * - Rondas impares (1, 3, 5...): rounds donde entran perdedores de winners.
 *   Sus ganadores se compactan hacia la siguiente ronda o van a grand final.
 */
export function getLosersAdvancePosition(
  losersRi: number,
  losersMi: number,
  losersRoundCount: number
): { nextRi: number; nextMi: number; side: "a" | "b" } | null {
  const nextRi = losersRi + 1;
  
  // Si es la última ronda, el ganador va a grand final
  if (nextRi >= losersRoundCount) {
    return null; // Señal de que va a grand final
  }
  
  const isCurrentDropIn = losersRi % 2 === 0;
  
  if (isCurrentDropIn) {
    // Después de drop-in round, los ganadores van a reduction round
    // Mantienen su posición (no se reducen aún)
    return { nextRi, nextMi: losersMi, side: "a" as const };
  } else {
    // Después de reduction round, los ganadores se emparejan
    // Match 0,1 -> Match 0; Match 2,3 -> Match 1; etc.
    const nextMi = Math.floor(losersMi / 2);
    const side: "a" | "b" = losersMi % 2 === 0 ? "a" : "b";
    return { nextRi, nextMi, side };
  }
}

/**
 * Establece el ganador de un match en losers bracket y propaga el avance.
 */
export function setWinnerBO3Losers(
  dbl: DoubleStructure,
  ri: number,
  mi: number,
  side: "a" | "b"
): void {
  const m = dbl.losers.rounds[ri][mi];
  m.winner = side;
  m.wa = side === "a" ? 2 : m.wa;
  m.wb = side === "b" ? 2 : m.wb;
  
  const winnerSlot = side === "a" ? m.a : m.b;
  
  const advancePos = getLosersAdvancePosition(ri, mi, dbl.losers.rounds.length);
  
  if (advancePos === null) {
    // Ganador va a grand final
    const gfMatch = dbl.grandFinal[0];
    if (isBye(gfMatch.b) || !gfMatch.b.id) {
      gfMatch.b = { ...winnerSlot };
    }
    return;
  }
  
  const { nextRi, nextMi, side: targetSide } = advancePos;
  const nextRound = dbl.losers.rounds[nextRi];
  if (!nextRound || nextMi >= nextRound.length) return;
  
  const targetMatch = nextRound[nextMi];
  
  if (targetSide === "a") {
    targetMatch.a = { ...winnerSlot };
  } else {
    targetMatch.b = { ...winnerSlot };
  }
}

/**
 * Propaga el perdedor de un match de winners al losers bracket.
 * Usa mapeo determinista basado en getLosersDropPosition.
 */
export function propagateWinnerToLosers(
  dbl: DoubleStructure,
  winnersRi: number,
  winnersMi: number,
  loserSide: "a" | "b"
): void {
  const winnersMatch = dbl.winners.rounds[winnersRi][winnersMi];
  const loserPlayer = loserSide === "a" ? winnersMatch.a : winnersMatch.b;
  
  // No propagar BYEs
  if (isBye(loserPlayer) || !loserPlayer.id) return;

  // Obtener posición determinista en losers
  const { losersRi, losersMi, side } = getLosersDropPosition(winnersRi, winnersMi);

  // Verificar que la ronda existe
  if (losersRi >= dbl.losers.rounds.length) return;
  
  const losersRound = dbl.losers.rounds[losersRi];
  if (losersMi >= losersRound.length) return;

  const losersMatch = losersRound[losersMi];
  
  // Insertar en el lado correspondiente
  if (side === "a") {
    losersMatch.a = { ...loserPlayer };
  } else {
    losersMatch.b = { ...loserPlayer };
  }
  
  // Auto-advance si el oponente es BYE o vacío
  const opponent = side === "a" ? losersMatch.b : losersMatch.a;
  if (isBye(opponent)) {
    // El perdedor avanza automáticamente
    setWinnerBO3Losers(dbl, losersRi, losersMi, side);
  }
}

/**
 * Avanza al ganador de un match en losers bracket a la siguiente ronda.
 * Usa getLosersAdvancePosition para determinar posición correcta.
 */
export function advanceInLosers(
  dbl: DoubleStructure,
  ri: number,
  mi: number,
  side: "a" | "b"
): void {
  const m = dbl.losers.rounds[ri][mi];
  const winner = side === "a" ? m.a : m.b;

  const advancePos = getLosersAdvancePosition(ri, mi, dbl.losers.rounds.length);
  
  if (advancePos === null) {
    // Ganador va a grand final
    const gfMatch = dbl.grandFinal[0];
    if (isBye(gfMatch.b) || !gfMatch.b.id) {
      gfMatch.b = { ...winner };
    }
    return;
  }
  
  const { nextRi, nextMi, side: targetSide } = advancePos;
  const nextRound = dbl.losers.rounds[nextRi];
  if (!nextRound || nextMi >= nextRound.length) return;
  
  const targetMatch = nextRound[nextMi];

  if (targetSide === "a") {
    targetMatch.a = { ...winner };
  } else {
    targetMatch.b = { ...winner };
  }
}

export function advanceLoserToGrandFinal(
  dbl: DoubleStructure,
  ri: number,
  mi: number
): void {
  const losersMatch = dbl.losers.rounds[ri][mi];
  if (!losersMatch.winner) return;

  const winner = losersMatch.winner === "a" ? losersMatch.a : losersMatch.b;
  if (isBye(winner) || !winner.id) return;

  const gfMatch = dbl.grandFinal[0];
  if (isBye(gfMatch.b) || !gfMatch.b.id) {
    gfMatch.b = { ...winner };
  }
}

export function advanceWinnersChampionToGrandFinal(dbl: DoubleStructure): void {
  const winnersFinalRound = dbl.winners.rounds[dbl.winners.rounds.length - 1];
  const finalMatch = winnersFinalRound[0];
  const gfMatch = dbl.grandFinal[0];

  if (!finalMatch.winner) {
    gfMatch.a = emptySlot();
    gfMatch.wa = 0;
    gfMatch.wb = 0;
    gfMatch.winner = null;
    dbl.grandFinal = [gfMatch];
    dbl.gfReset = false;
    dbl.tournamentResolved = false;
    dbl.champion = null;
    return;
  }

  const winner = finalMatch.winner === "a" ? finalMatch.a : finalMatch.b;
  const changedWinner = gfMatch.a.id !== winner.id;

  gfMatch.a = { ...winner };

  if (changedWinner) {
    gfMatch.wa = 0;
    gfMatch.wb = 0;
    gfMatch.winner = null;
    dbl.grandFinal = [gfMatch];
    dbl.gfReset = false;
    dbl.tournamentResolved = false;
    dbl.champion = null;
  }
}

export function resolveGrandFinal(
  dbl: DoubleStructure,
  side: "a" | "b"
): { resolved: boolean; reset: boolean; champion: string | null } {
  const gfMatch = dbl.grandFinal[0];

  if (side === "a") {
    gfMatch.wa = clamp(gfMatch.wa + 1, 0, 2);
  } else {
    gfMatch.wb = clamp(gfMatch.wb + 1, 0, 2);
  }

  if (gfMatch.wa >= 2) {
    gfMatch.winner = "a";
    dbl.tournamentResolved = true;
    dbl.champion = gfMatch.a.id;
    return { resolved: true, reset: false, champion: gfMatch.a.id };
  }

  if (gfMatch.wb >= 2) {
    gfMatch.winner = "b";
    dbl.gfReset = false;
    dbl.grandFinal = [gfMatch];
    dbl.tournamentResolved = true;
    dbl.champion = gfMatch.b.id;
    return { resolved: true, reset: false, champion: gfMatch.b.id };
  }

  return { resolved: false, reset: false, champion: null };
}

export function clearGrandFinal(dbl: DoubleStructure): void {
  const gfMatch = dbl.grandFinal[0];
  gfMatch.wa = 0;
  gfMatch.wb = 0;
  gfMatch.winner = null;
  dbl.grandFinal = [gfMatch];
  dbl.gfReset = false;
  dbl.tournamentResolved = false;
  dbl.champion = null;
}

export function clearLosersMatch(
  dbl: DoubleStructure,
  ri: number,
  mi: number
): void {
  const m = dbl.losers.rounds[ri][mi];
  m.wa = 0;
  m.wb = 0;
  m.winner = null;

  // Obtener posición de avance usando la misma lógica
  const advancePos = getLosersAdvancePosition(ri, mi, dbl.losers.rounds.length);
  
  if (advancePos === null) {
    // Era la última ronda, limpiamos grand final si corresponde
    if (dbl.grandFinal[0].b.id === m.a.id || dbl.grandFinal[0].b.id === m.b.id) {
      dbl.grandFinal[0].b = emptySlot();
      if (dbl.grandFinal.length > 1) {
        dbl.grandFinal[1].b = emptySlot();
        dbl.grandFinal[1].wa = 0;
        dbl.grandFinal[1].wb = 0;
        dbl.grandFinal[1].winner = null;
      }
    }
    return;
  }

  const { nextRi, nextMi, side: targetSide } = advancePos;
  const nextRound = dbl.losers.rounds[nextRi];
  if (!nextRound || nextMi >= nextRound.length) return;
  
  const targetMatch = nextRound[nextMi];

  if (targetSide === "a") {
    if (targetMatch.a.id === m.a.id || targetMatch.a.id === m.b.id) {
      targetMatch.a = emptySlot();
    }
  } else {
    if (targetMatch.b.id === m.a.id || targetMatch.b.id === m.b.id) {
      targetMatch.b = emptySlot();
    }
  }

  // Limpiar downstream recursivamente
  for (let r = nextRi; r < dbl.losers.rounds.length; r++) {
    dbl.losers.rounds[r].forEach((match) => {
      if (match.a.id === m.a.id || match.a.id === m.b.id ||
          match.b.id === m.a.id || match.b.id === m.b.id) {
        match.a = emptySlot();
        match.b = emptySlot();
        match.wa = 0;
        match.wb = 0;
        match.winner = null;
      }
    });
  }
  
  // También limpiar grand final si alguno de los jugadores llegó ahí
  if (dbl.grandFinal[0].b.id === m.a.id || dbl.grandFinal[0].b.id === m.b.id) {
    dbl.grandFinal[0].b = emptySlot();
    dbl.grandFinal[0].wa = 0;
    dbl.grandFinal[0].wb = 0;
    dbl.grandFinal[0].winner = null;
    if (dbl.grandFinal.length > 1) {
      dbl.grandFinal[1].b = emptySlot();
      dbl.grandFinal[1].wa = 0;
      dbl.grandFinal[1].wb = 0;
      dbl.grandFinal[1].winner = null;
    }
    dbl.gfReset = false;
    dbl.tournamentResolved = false;
    dbl.champion = null;
  }
}

function getRoundTitle(ri: number, totalRounds: number): string {
  const roundsFromEnd = totalRounds - ri - 1;
  if (roundsFromEnd === 0) return "Final";
  if (roundsFromEnd === 1) return "Semifinales";
  if (roundsFromEnd === 2) return "Cuartos de Final";
  return `Octavos de Final`;
}

export function transformBracketToRounds(bracket: Bracket): BracketRoundView[] {
  return bracket.rounds.map((matches, ri) => ({
    title: getRoundTitle(ri, bracket.rounds.length),
    seeds: matches.map((m): BracketRoundSeed => ({
      id: m.id,
      teams: [
        {
          name: isBye(m.a) ? "BYE" : m.a.name,
         ...((!isBye(m.a) && { score: m.wa, winner: m.winner === "a" }) || {}),
        },
        {
          name: isBye(m.b) ? "BYE" : m.b.name,
          ...((!isBye(m.b) && { score: m.wb, winner: m.winner === "b" }) || {}),
        },
      ],
      wa: m.wa,
      wb: m.wb,
      winner: m.winner,
      aBye: isBye(m.a),
      bBye: isBye(m.b),
    })),
  }));
}
