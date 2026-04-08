import type { Bracket, Match, Slot, ViewState } from "./types";

const PLACEHOLDER_IDENTITIES = new Set(["", "BYE", "TBD", "-", "—"]);
const PLACEHOLDER_NAMES = new Set(["", "BYE", "TBD", "-", "—"]);

function cloneSlot(slot: Slot): Slot {
  const slotId = slot.id || slot.rid || "";
  return {
    id: slotId,
    name: slot.name,
    rid: slot.rid || slotId,
    team: slot.team,
    compact: slot.compact || null,
    bye: !!slot.bye,
  };
}

function emptySlot(): Slot {
  return { id: "", name: "-", rid: "", team: "", compact: null, bye: false };
}

function validSlot(slot: Slot | null | undefined): slot is Slot {
  const identity = slot?.id || slot?.rid;
  return Boolean(slot && identity && !slot.bye && identity !== "BYE");
}

function hasRealCompetitorSlot(slot: Slot | null | undefined): slot is Slot {
  if (!slot || slot.bye) return false;

  const identity = (slot.id || slot.rid || "").trim();
  const normalizedIdentity = identity.toUpperCase();
  if (!identity || PLACEHOLDER_IDENTITIES.has(normalizedIdentity) || PLACEHOLDER_IDENTITIES.has(identity)) {
    return false;
  }

  const normalizedName = (slot.name || "").trim().toUpperCase();
  if (PLACEHOLDER_NAMES.has(normalizedName)) return false;

  return true;
}

export function shouldRenderThirdPlaceMatch(match: Match | null | undefined): match is Match {
  return Boolean(match && hasRealCompetitorSlot(match.a) && hasRealCompetitorSlot(match.b));
}

function getMatchWinnerId(match: Match | null | undefined): string | null {
  if (!match?.winner) return null;
  const slot = match.winner === "a" ? match.a : match.b;
  return validSlot(slot) ? slot.id || slot.rid : null;
}

function getMatchLoserSlot(match: Match | null | undefined): Slot | null {
  if (!match?.winner) return null;
  const slot = match.winner === "a" ? match.b : match.a;
  return validSlot(slot) ? cloneSlot(slot) : null;
}

function getMatchLoserId(match: Match | null | undefined): string | null {
  return getMatchLoserSlot(match)?.id || null;
}

function makeThirdPlaceMatch(id: string, a?: Slot | null, b?: Slot | null): Match {
  return {
    id,
    a: a ? cloneSlot(a) : emptySlot(),
    b: b ? cloneSlot(b) : emptySlot(),
    wa: 0,
    wb: 0,
    winner: null,
  };
}

export function syncThirdPlaceMatchFromBracket(
  bracket: Bracket | undefined,
  current: Match | undefined,
  matchId = "TPM1"
): Match | undefined {
  if (!bracket || bracket.rounds.length < 2) return undefined;
  const semifinalRound = bracket.rounds[bracket.rounds.length - 2] || [];
  if (semifinalRound.length < 2) return undefined;

  const sideA = getMatchLoserSlot(semifinalRound[0]);
  const sideB = getMatchLoserSlot(semifinalRound[1]);
  const base = current ? { ...current } : makeThirdPlaceMatch(matchId);

  const nextA = sideA || emptySlot();
  const nextB = sideB || emptySlot();
  const currentAId = base.a.id || base.a.rid;
  const currentBId = base.b.id || base.b.rid;
  const nextAId = nextA.id || nextA.rid;
  const nextBId = nextB.id || nextB.rid;
  const participantsChanged = currentAId !== nextAId || currentBId !== nextBId;

  base.id = current?.id || matchId;
  base.a = nextA;
  base.b = nextB;

  if (participantsChanged) {
    base.wa = 0;
    base.wb = 0;
    base.winner = null;
  }

  if (base.winner === "a" && !validSlot(base.a)) base.winner = null;
  if (base.winner === "b" && !validSlot(base.b)) base.winner = null;

  return base;
}

function getSingleEliminationTopThree(bracket: Bracket | undefined, thirdPlaceMatch: Match | undefined): string[] {
  if (!bracket) return [];
  const finalRound = bracket.rounds[bracket.rounds.length - 1] || [];
  const finalMatch = finalRound[0];
  if (!finalMatch?.winner) return [];

  const first = getMatchWinnerId(finalMatch);
  const second = getMatchWinnerId({ ...finalMatch, winner: finalMatch.winner === "a" ? "b" : "a" });
  let third = getMatchWinnerId(thirdPlaceMatch);
  if (!third) {
    const semifinalRound = bracket.rounds[bracket.rounds.length - 2] || [];
    const semifinalLosers = semifinalRound.map(getMatchLoserId).filter((id): id is string => Boolean(id));
    third = semifinalLosers.find((id) => id !== second) || semifinalLosers[0] || null;
  }

  return [first, second, third].filter((id, idx, arr): id is string => Boolean(id) && arr.indexOf(id) === idx);
}

export function getTopThreeFromView(view: ViewState | null): string[] {
  if (!view) return [];

  if (view.type === "double" && view.dbl) {
    if (!view.dbl.tournamentResolved || !view.dbl.champion) return [];
    const final = view.dbl.gfReset && view.dbl.grandFinal.length > 1 ? view.dbl.grandFinal[1] : view.dbl.grandFinal[0];
    if (!final?.winner) return [view.dbl.champion];
    const second = getMatchWinnerId({ ...final, winner: final.winner === "a" ? "b" : "a" });
    const losersFinalRound = view.dbl.losers.rounds[view.dbl.losers.rounds.length - 1] || [];
    const third = getMatchLoserSlot(losersFinalRound[losersFinalRound.length - 1])?.id || null;
    return [view.dbl.champion, second, third].filter(
      (id, idx, arr): id is string => Boolean(id) && arr.indexOf(id) === idx
    );
  }

  if (view.type === "single") {
    return getSingleEliminationTopThree(view.bracket, view.thirdPlaceMatch);
  }

  if (view.type === "groups") {
    return getSingleEliminationTopThree(view.finalBracket, view.finalThirdPlaceMatch);
  }

  return [];
}

export function hasPendingThirdPlaceMatch(view: ViewState | null): boolean {
  if (!view) return false;

  if (view.type === "single") {
    const third = view.thirdPlaceMatch;
    return Boolean(third && validSlot(third.a) && validSlot(third.b) && !third.winner);
  }

  if (view.type === "groups") {
    const third = view.finalThirdPlaceMatch;
    return Boolean(third && validSlot(third.a) && validSlot(third.b) && !third.winner);
  }

  return false;
}
