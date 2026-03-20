"use client";

import { useTournamentStore } from "../store/useTournamentStore";
import type { Match, Slot, Bracket, DoubleStructure } from "../lib/types";
import { isBye } from "../lib/bracketUtils";
import BracketVisualizer from "./BracketVisualizer";

function MatchCard({
  m,
  ri,
  mi,
  bracketId = "main",
  viewMode,
  onWin,
  onClear,
}: {
  m: Match;
  ri: number;
  mi: number;
  bracketId?: string;
  viewMode: "organizer" | "competitor";
  onWin?: (side: "a" | "b") => void;
  onClear?: () => void;
}) {
  const aLine = [m.a.rid, m.a.team].filter(Boolean).join(" · ");
  const bLine = [m.b.rid, m.b.team].filter(Boolean).join(" · ");

  return (
    <div className="rounded-2xl border border-brand-stroke/25 bg-brand-panel/50 overflow-hidden">
      <div
        className={`flex items-center gap-3 p-2.5 ${
          m.winner === "a" ? "bg-brand-neon/10 border-b border-brand-neon/20" : ""
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-brand-text truncate">
            {m.a.name}
          </div>
          {aLine && (
            <div className="text-xs text-brand-muted truncate">{aLine}</div>
          )}
        </div>
        <div
          className={`px-2.5 py-1 rounded-xl border text-sm font-black ${
            m.winner === "a"
              ? "border-brand-neon/50 bg-brand-neon/20 text-brand-neon"
              : "border-brand-stroke/25 bg-brand-bg/30 text-brand-text"
          }`}
        >
          {m.wa}/2
        </div>
      </div>

      <div
        className={`flex items-center gap-3 p-2.5 ${
          m.winner === "b" ? "bg-brand-neon/10 border-t border-brand-neon/20" : ""
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-brand-text truncate">
            {m.b.name}
          </div>
          {bLine && (
            <div className="text-xs text-brand-muted truncate">{bLine}</div>
          )}
        </div>
        <div
          className={`px-2.5 py-1 rounded-xl border text-sm font-black ${
            m.winner === "b"
              ? "border-brand-neon/50 bg-brand-neon/20 text-brand-neon"
              : "border-brand-stroke/25 bg-brand-bg/30 text-brand-text"
          }`}
        >
          {m.wb}/2
        </div>
      </div>

      {viewMode === "organizer" && onWin && onClear && (
        <div className="flex gap-1.5 p-2 border-t border-brand-stroke/15">
          <button
            onClick={() => onWin("a")}
            disabled={isBye(m.a)}
            className="flex-1 border border-brand-neon/30 bg-brand-neon/10 text-brand-text px-2 py-1.5 rounded-lg text-xs font-bold hover:brightness-110 cursor-pointer transition-all disabled:opacity-30"
          >
            +1 A
          </button>
          <button
            onClick={() => onWin("b")}
            disabled={isBye(m.b)}
            className="flex-1 border border-brand-neon/30 bg-brand-neon/10 text-brand-text px-2 py-1.5 rounded-lg text-xs font-bold hover:brightness-110 cursor-pointer transition-all disabled:opacity-30"
          >
            +1 B
          </button>
          <button
            onClick={onClear}
            className="flex-1 border border-brand-stroke/20 bg-brand-panel/40 text-brand-muted px-2 py-1.5 rounded-lg text-xs hover:brightness-110 cursor-pointer transition-all"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}

function RoundColumn({
  matches,
  ri,
  title,
  bracketId,
  viewMode,
  onWin,
  onClear,
}: {
  matches: Match[];
  ri: number;
  title: string;
  bracketId?: string;
  viewMode: "organizer" | "competitor";
  onWin?: (mi: number, side: "a" | "b") => void;
  onClear?: (mi: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 min-w-[260px]">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs uppercase tracking-wider text-brand-muted/70">
          {title}
        </span>
        <span className="text-xs font-mono text-brand-muted/50">
          {matches.length} matches
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {matches.map((m, mi) => (
          <MatchCard
            key={m.id}
            m={m}
            ri={ri}
            mi={mi}
            bracketId={bracketId}
            viewMode={viewMode}
            onWin={onWin ? (side) => onWin(mi, side) : undefined}
            onClear={onClear ? () => onClear(mi) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function BracketColumns({
  bracket,
  bracketId,
  viewMode,
  viewStyle,
}: {
  bracket: Bracket;
  bracketId?: string;
  viewMode: "organizer" | "competitor";
  viewStyle: "columns" | "map";
}) {
  const handleWin = (mi: number, side: "a" | "b") => {
    const { toggleMatchWin } = useTournamentStore.getState();
    toggleMatchWin(bracketId || "main", 0, mi, side);
  };

  const handleClear = (mi: number) => {
    const { clearMatch } = useTournamentStore.getState();
    clearMatch(bracketId || "main", 0, mi);
  };

  if (viewStyle === "map") {
    return (
      <BracketVisualizer
        bracket={bracket}
        bracketId={bracketId}
        viewMode={viewMode}
        onWin={(ri, mi, side) => {
          const { toggleMatchWin } = useTournamentStore.getState();
          toggleMatchWin(bracketId || "main", ri, mi, side);
        }}
        onClear={(ri, mi) => {
          const { clearMatch } = useTournamentStore.getState();
          clearMatch(bracketId || "main", ri, mi);
        }}
      />
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 custom-scroll">
      {bracket.rounds.map((matches, ri) => {
        const title =
          ri === bracket.rounds.length - 1
            ? "Final"
            : `Ronda ${ri + 1}`;
        return (
          <RoundColumn
            key={ri}
            matches={matches}
            ri={ri}
            title={title}
            bracketId={bracketId}
            viewMode={viewMode}
            onWin={(mi, side) => {
              const { toggleMatchWin } = useTournamentStore.getState();
              toggleMatchWin(bracketId || "main", ri, mi, side);
            }}
            onClear={(mi) => {
              const { clearMatch } = useTournamentStore.getState();
              clearMatch(bracketId || "main", ri, mi);
            }}
          />
        );
      })}
    </div>
  );
}

function BracketSVG({
  bracket,
  onWin,
  onClear,
  viewMode,
}: {
  bracket: Bracket;
  onWin?: (ri: number, mi: number, side: "a" | "b") => void;
  onClear?: (ri: number, mi: number) => void;
  viewMode: "organizer" | "competitor";
}) {
  const colW = 280;
  const rowH = 80;
  const padX = 20;
  const padY = 20;

  const rounds = bracket.rounds;
  const maxMatches = rounds[0]?.length || 0;
  const svgW = padX * 2 + rounds.length * colW;
  const svgH = padY * 2 + maxMatches * rowH * Math.pow(2, rounds.length - 1);

  return (
    <div className="overflow-auto custom-scroll">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full min-w-[800px]"
        style={{ minHeight: svgH }}
      >
        {rounds.map((matches, ri) => {
          const step = rowH * Math.pow(2, ri);
          return matches.map((m, mi) => {
            const x = padX + ri * colW;
            const y = padY + mi * step + step / 2 - 30;
            const w = 240;
            const h = 60;

            return (
              <g key={`${ri}-${mi}`}>
                {ri < rounds.length - 1 && (
                  <path
                    d={`M ${x + w} ${y + h / 2} C ${x + w + 40} ${y + h / 2}, ${x + w + 40} ${padY + (mi / 2) * step + step / 2 - 30}, ${x + w + 80} ${padY + (mi / 2) * step + step / 2 - 30}`}
                    fill="none"
                    stroke="rgba(47,230,255,0.2)"
                    strokeWidth={2}
                  />
                )}
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  rx={12}
                  fill="rgba(0,0,0,0.25)"
                  stroke={
                    m.winner
                      ? "rgba(47,230,255,0.5)"
                      : "rgba(122,63,255,0.3)"
                  }
                  strokeWidth={2}
                />
                <text
                  x={x + 10}
                  y={y + 18}
                  fill="rgba(234,240,255,0.9)"
                  fontSize={11}
                  fontWeight="bold"
                >
                  {m.a.name} ({m.wa}/2)
                </text>
                <text
                  x={x + 10}
                  y={y + 42}
                  fill="rgba(234,240,255,0.9)"
                  fontSize={11}
                  fontWeight="bold"
                >
                  {m.b.name} ({m.wb}/2)
                </text>
              </g>
            );
          });
        })}
      </svg>
    </div>
  );
}

function GroupsView() {
  const { view, viewMode, viewStyle } = useTournamentStore();

  if (!view || view.type !== "groups" || !view.groups) return null;

  const { groups, qualifiers, finalBracket } = view;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-brand-muted/70 mb-3">
          Grupos
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {groups.map((group, gi) => (
            <div
              key={gi}
              className="rounded-xl border border-brand-stroke/20 bg-brand-bg/25 p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider text-brand-muted/70">
                  Grupo {String.fromCharCode(65 + gi)}
                </span>
              </div>
              {group.map((p, pi) => (
                <div
                  key={p.i}
                  className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-brand-panel/30 border border-brand-stroke/10 mb-1"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-xs font-mono text-brand-muted/50 w-5">
                      {pi + 1}.
                    </span>
                    <span className="text-sm font-bold text-brand-text truncate">
                      {p.n || "—"}
                    </span>
                  </div>
                  <span className="text-xs text-brand-muted truncate ml-2">
                    {p.t || "—"}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {finalBracket && (
        <div>
          <div className="text-xs uppercase tracking-wider text-brand-muted/70 mb-3">
            Fase Final
          </div>
          <BracketColumns
            bracket={finalBracket}
            bracketId="final"
            viewMode={viewMode}
            viewStyle={viewStyle}
          />
        </div>
      )}
    </div>
  );
}

function GrandFinalView({
  dbl,
  viewMode,
}: {
  dbl: DoubleStructure;
  viewMode: "organizer" | "competitor";
}) {
  const { toggleMatchWin, clearMatch } = useTournamentStore();

  const handleWin = (gfIndex: number, side: "a" | "b") => {
    toggleMatchWin("gf", gfIndex, gfIndex, side);
  };

  const handleClear = (gfIndex: number) => {
    clearMatch("gf", gfIndex, gfIndex);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs uppercase tracking-wider text-brand-muted/70 mb-2">
        Grand Final
      </div>
      {dbl.grandFinal.map((gf: Match, gfi: number) => {
        const isReset = gfi > 0;

        return (
          <div key={gf.id} className="relative">
            {isReset && (
              <div className="text-[10px] uppercase tracking-wider text-brand-hot/70 mb-1 text-center">
                Reset
              </div>
            )}
            <MatchCard
              m={gf}
              ri={0}
              mi={gfi}
              bracketId="gf"
              viewMode={viewMode}
              onWin={(side) => handleWin(gfi, side)}
              onClear={() => handleClear(gfi)}
            />
          </div>
        );
      })}

      <div className="text-[10px] text-brand-muted/60 bg-brand-bg/25 p-2 rounded-lg border border-brand-stroke/10 mt-2">
        <span className="text-brand-neon font-bold">A</span> gana con 1 match ·
        <span className="text-brand-hot font-bold ml-1">B</span> debe ganar 2 matches
      </div>
    </div>
  );
}

function LosersBracketView({
  dbl,
  viewMode,
  viewStyle,
}: {
  dbl: DoubleStructure;
  viewMode: "organizer" | "competitor";
  viewStyle: "columns" | "map";
}) {
  // Usar BracketColumns para losers, igual que winners
  return (
    <BracketColumns
      bracket={dbl.losers}
      bracketId="losers"
      viewMode={viewMode}
      viewStyle={viewStyle}
    />
  );
}

function ChampionBanner({ championId }: { championId: string }) {
  const players = useTournamentStore((s) => s.players);
  const champion = players.find((p) => p.i === championId);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-brand-panel to-brand-panel2 border-2 border-brand-neon/50 rounded-3xl p-8 text-center shadow-[0_0_60px_rgba(47,230,255,0.3)] max-w-md mx-4">
        <div className="text-6xl mb-4">🏆</div>
        <div className="text-xs uppercase tracking-widest text-brand-neon mb-2">
          CAMPEÓN
        </div>
        <div className="text-2xl font-black text-brand-text mb-1">
          {champion?.n || championId}
        </div>
        {champion?.t && (
          <div className="text-sm text-brand-muted mb-4">{champion.t}</div>
        )}
        <div className="text-xs text-brand-muted/60 mt-4">
          Double Elimination Champion
        </div>
      </div>
    </div>
  );
}

function DoubleView() {
  const { view, viewMode, viewStyle } = useTournamentStore();

  if (!view || view.type !== "double" || !view.dbl) return null;

  const { dbl } = view;
  const isResolved = dbl.tournamentResolved;

  return (
    <div className="relative">
      {isResolved && dbl.champion && (
        <ChampionBanner championId={dbl.champion} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
        <div className="flex flex-col gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-brand-neon/70 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-neon animate-pulse" />
              Winners Bracket
            </div>
            <BracketColumns
              bracket={dbl.winners}
              bracketId="winners"
              viewMode={viewMode}
              viewStyle={viewStyle}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-brand-hot/70 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-hot" />
              Losers Bracket
            </div>
            <LosersBracketView dbl={dbl} viewMode={viewMode} viewStyle={viewStyle} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <GrandFinalView dbl={dbl} viewMode={viewMode} />
        </div>
      </div>
    </div>
  );
}

export default function BracketView() {
  const {
    tournament,
    view,
    viewMode,
    viewStyle,
    generate,
    clearView,
    setViewMode,
    setViewStyle,
  } = useTournamentStore();

  const viewTitle =
    tournament.format === "groups"
      ? "Grupos + Fase final"
      : tournament.format === "double"
        ? "Double (W/L)"
        : "Single Bracket";

  return (
    <div className="rounded-[18px] border border-brand-stroke/20 bg-brand-bg/35 overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-brand-stroke/20 flex flex-wrap items-center justify-between gap-3 bg-brand-panel/40">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm uppercase text-brand-muted tracking-wide m-0">
            Vista
          </h2>
          <b className="text-lg text-brand-text">{viewTitle}</b>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={generate}
            className="border border-brand-neon/45 bg-linear-to-r from-brand-neon/30 to-brand-neon2/10 shadow-[inset_0_0_0_1px_rgba(122,63,255,0.12)] text-brand-text px-3 py-1.5 rounded-xl text-xs font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all"
          >
            Generar
          </button>
          <button
            onClick={clearView}
            className="border border-brand-hot/25 bg-brand-hot/10 text-brand-hot px-3 py-1.5 rounded-xl text-xs font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all"
          >
            Limpiar
          </button>
          <button
            onClick={() => setViewStyle(viewStyle === "columns" ? "map" : "columns")}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold tracking-wide cursor-pointer transition-all ${
              viewStyle === "map"
                ? "border border-brand-neon/45 bg-brand-neon/20 text-brand-text"
                : "border border-brand-stroke/20 bg-brand-panel/40 text-brand-muted hover:brightness-110"
            }`}
          >
            {viewStyle === "columns" ? "Ver mapa" : "Ver columnas"}
          </button>
          <button
            onClick={() =>
              setViewMode(viewMode === "organizer" ? "competitor" : "organizer")
            }
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold tracking-wide cursor-pointer transition-all ${
              viewMode === "organizer"
                ? "border border-brand-neon/45 bg-brand-neon/20 text-brand-text"
                : "border border-brand-stroke/20 bg-brand-panel/40 text-brand-muted hover:brightness-110"
            }`}
          >
            Modo: {viewMode === "organizer" ? "Organizador" : "Competidor"}
          </button>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-auto custom-scroll">
        {!view ? (
          <div className="flex flex-col items-center text-center max-w-[300px] mx-auto py-12 opacity-60">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-git-merge text-brand-neon mb-4"
            >
              <circle cx="18" cy="18" r="3" />
              <circle cx="6" cy="6" r="3" />
              <path d="M6 21V9a9 9 0 0 0 9 9" />
            </svg>
            <b className="text-brand-text mb-1">Brackets Vacíos</b>
            <p className="text-brand-muted text-sm">
              Añade al menos 2 competidores y haz clic en &quot;Generar&quot; para
              construir el árbol del torneo.
            </p>
          </div>
        ) : view.type === "single" && view.bracket ? (
          <BracketColumns
            bracket={view.bracket}
            bracketId="main"
            viewMode={viewMode}
            viewStyle={viewStyle}
          />
        ) : view.type === "groups" ? (
          <GroupsView />
        ) : view.type === "double" ? (
          <DoubleView />
        ) : null}
      </div>
    </div>
  );
}
