"use client";

import { useMemo, useState } from "react";
import type { Bracket, Match, ViewState } from "../lib/types";
import { shouldRenderThirdPlaceMatch } from "../lib/placements";
import BracketVisualizer from "./BracketVisualizer";

interface SpectatorBracketViewProps {
  view: ViewState;
}

function MatchCard({ match }: { match: Match }) {
  return (
    <div className="rounded-xl border border-brand-stroke/20 bg-brand-panel/40 overflow-hidden">
      <div className={`px-3 py-2 flex items-center justify-between gap-2 ${match.winner === "a" ? "bg-brand-neon/10" : ""}`}>
        <span className="text-sm font-semibold text-brand-text truncate">{match.a.name || "TBD"}</span>
        <span className="text-xs text-brand-muted">{match.wa}/2</span>
      </div>
      <div className={`px-3 py-2 flex items-center justify-between gap-2 border-t border-brand-stroke/10 ${match.winner === "b" ? "bg-brand-neon/10" : ""}`}>
        <span className="text-sm font-semibold text-brand-text truncate">{match.b.name || "TBD"}</span>
        <span className="text-xs text-brand-muted">{match.wb}/2</span>
      </div>
    </div>
  );
}

function BracketColumns({ bracket }: { bracket: Bracket }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2 custom-scroll">
      {bracket.rounds.map((round, roundIndex) => (
        <div key={roundIndex} className="min-w-[260px] space-y-2">
          <div className="text-xs uppercase tracking-wide text-brand-muted">
            {roundIndex === bracket.rounds.length - 1 ? "Final" : `Ronda ${roundIndex + 1}`}
          </div>
          {round.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SpectatorBracketView({ view }: SpectatorBracketViewProps) {
  const [style, setStyle] = useState<"map" | "columns">("map");

  const grandFinalBracket = useMemo<Bracket | null>(() => {
    if (view.type !== "double" || !view.dbl || view.dbl.grandFinal.length === 0) return null;
    return {
      type: "grandFinal",
      size: 2,
      rounds: [view.dbl.grandFinal],
    };
  }, [view]);

  const renderBracket = (bracket: Bracket, exportName: string) => {
    if (style === "map") {
      return (
        <BracketVisualizer
          bracket={bracket}
          viewMode="competitor"
          exportable
          exportFileName={exportName}
        />
      );
    }
    return <BracketColumns bracket={bracket} />;
  };

  return (
    <div className="rounded-xl border border-brand-stroke/25 bg-brand-panel/40 overflow-hidden">
      <div className="px-3 py-2 border-b border-brand-stroke/20 flex items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-wide text-brand-muted">Modo espectador · Llaves</div>
        <button
          onClick={() => setStyle((current) => (current === "map" ? "columns" : "map"))}
          className="text-xs px-2 py-1 rounded border border-brand-stroke/30 text-brand-text"
        >
          {style === "map" ? "Ver columnas" : "Ver mapa"}
        </button>
      </div>

      <div className="p-3 space-y-4">
        {view.type === "single" && view.bracket && renderBracket(view.bracket, "bracket-single")}
        {view.type === "single" && shouldRenderThirdPlaceMatch(view.thirdPlaceMatch) && (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-brand-muted">Partido por 3er puesto</div>
            <MatchCard match={view.thirdPlaceMatch} />
          </div>
        )}

        {view.type === "groups" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {view.groups?.map((group, index) => (
                <div key={index} className="rounded-lg border border-brand-stroke/20 bg-brand-bg/20 p-3">
                  <div className="text-xs uppercase tracking-wide text-brand-muted mb-2">
                    Grupo {String.fromCharCode(65 + index)}
                  </div>
                  <div className="space-y-1">
                    {group.map((player, playerIndex) => (
                      <div key={player.i} className="text-sm text-brand-text">
                        {playerIndex + 1}. {player.n || player.i}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {view.finalBracket && (
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wide text-brand-muted">Fase final</div>
                {renderBracket(view.finalBracket, "bracket-fase-final")}
                {shouldRenderThirdPlaceMatch(view.finalThirdPlaceMatch) && (
                  <div className="space-y-2">
                    <div className="text-xs uppercase tracking-wide text-brand-muted">Partido por 3er puesto</div>
                    <MatchCard match={view.finalThirdPlaceMatch} />
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {view.type === "double" && view.dbl && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-brand-muted">Winners bracket</div>
              {renderBracket(view.dbl.winners, "bracket-winners")}
            </div>
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-brand-muted">Losers bracket</div>
              {renderBracket(view.dbl.losers, "bracket-losers")}
            </div>
            {grandFinalBracket && (
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wide text-brand-muted">Grand final</div>
                {renderBracket(grandFinalBracket, "bracket-grand-final")}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
