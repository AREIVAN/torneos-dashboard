"use client";

import { Bracket, Seed, SeedItem, IRenderSeedProps } from "@oliverlooney/react-brackets";
import { transformBracketToRounds } from "../lib/bracketUtils";
import type { Bracket as BracketType } from "../lib/types";

interface SeedData {
  id: string;
  teams: Array<{ name: string; score?: number; winner?: boolean }>;
  wa: number;
  wb: number;
  winner: "a" | "b" | null;
  aBye: boolean;
  bBye: boolean;
}

interface BracketVisualizerProps {
  bracket: BracketType;
  bracketId?: string;
  viewMode: "organizer" | "competitor";
  onWin?: (ri: number, mi: number, side: "a" | "b") => void;
  onClear?: (ri: number, mi: number) => void;
}

export default function BracketVisualizer({
  bracket,
  viewMode,
  onWin,
  onClear,
}: BracketVisualizerProps) {
  const rounds = transformBracketToRounds(bracket);

  const handleSeedClick = (roundIndex: number, seedIndex: number, side: "a" | "b") => {
    if (viewMode === "competitor" || !onWin) return;
    const seed = rounds[roundIndex].seeds[seedIndex] as unknown as SeedData;
    if (side === "a" && seed.aBye) return;
    if (side === "b" && seed.bBye) return;
    onWin(roundIndex, seedIndex, side);
  };

  const handleSeedClear = (roundIndex: number, seedIndex: number) => {
    if (viewMode === "competitor" || !onClear) return;
    onClear(roundIndex, seedIndex);
  };

  return (
    <div className="overflow-auto custom-scroll">
      <div className="min-w-[800px] p-4">
        <Bracket
          rounds={rounds}
          mobileBreakpoint={768}
          roundTitleComponent={(title: React.ReactNode) => (
            <div className="text-center mb-4">
              <span className="text-xs uppercase tracking-wider text-brand-muted/70 bg-brand-panel/40 px-4 py-2 rounded-xl border border-brand-stroke/20">
                {title}
              </span>
            </div>
          )}
          renderSeedComponent={(props) => (
            <CustomSeedWrapper
              {...props}
              viewMode={viewMode}
              onWin={handleSeedClick}
              onClear={handleSeedClear}
            />
          )}
        />
      </div>
    </div>
  );
}

interface SeedWrapperProps extends IRenderSeedProps {
  roundIndex: number;
  seedIndex: number;
  viewMode: "organizer" | "competitor";
  onWin: (roundIndex: number, seedIndex: number, side: "a" | "b") => void;
  onClear: (roundIndex: number, seedIndex: number) => void;
}

function CustomSeedWrapper({
  seed,
  breakpoint,
  roundIndex,
  seedIndex,
  viewMode,
  onWin,
  onClear,
}: SeedWrapperProps) {
  const data = seed as unknown as SeedData;
  const isClickable = viewMode === "organizer";
  const isBye1 = data.aBye;
  const isBye2 = data.bBye;

  return (
    <Seed
      mobileBreakpoint={breakpoint}
      style={{
        fontSize: 12,
        background: data.winner
          ? "linear-gradient(135deg, rgba(47,230,255,0.15) 0%, rgba(122,63,255,0.1) 100%)"
          : "rgba(15,15,25,0.9)",
        borderColor: data.winner
          ? "rgba(47,230,255,0.5)"
          : "rgba(122,63,255,0.3)",
        borderRadius: 12,
        minWidth: 200,
        cursor: isClickable ? "pointer" : "default",
        transition: "all 0.2s ease",
      }}
    >
      <SeedItem>
        <div
          onClick={() => !isBye1 && isClickable && onWin(roundIndex, seedIndex, "a")}
          className={`flex items-center justify-between px-3 py-2 transition-colors ${
            isClickable && !isBye1 ? "hover:bg-brand-neon/10 cursor-pointer" : ""
          } ${data.winner === "a" ? "bg-brand-neon/20" : ""}`}
          style={{
            borderBottom: "1px solid rgba(122,63,255,0.15)",
          }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className={`font-bold truncate transition-colors ${
                data.winner === "a" ? "text-brand-neon" : "text-brand-text"
              } ${isBye1 ? "opacity-40 italic" : ""}`}
            >
              {data.teams[0]?.name || "—"}
            </span>
            {data.wa !== undefined && data.wa > 0 && (
              <span
                className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                  data.winner === "a"
                    ? "bg-brand-neon/30 text-brand-neon"
                    : "bg-brand-panel/50 text-brand-muted"
                }`}
              >
                {data.wa}/2
              </span>
            )}
          </div>
          {data.winner === "a" && (
            <svg className="w-4 h-4 text-brand-neon ml-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>

        <div
          onClick={() => !isBye2 && isClickable && onWin(roundIndex, seedIndex, "b")}
          className={`flex items-center justify-between px-3 py-2 transition-colors ${
            isClickable && !isBye2 ? "hover:bg-brand-neon/10 cursor-pointer" : ""
          } ${data.winner === "b" ? "bg-brand-neon/20" : ""}`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className={`font-bold truncate transition-colors ${
                data.winner === "b" ? "text-brand-neon" : "text-brand-text"
              } ${isBye2 ? "opacity-40 italic" : ""}`}
            >
              {data.teams[1]?.name || "—"}
            </span>
            {data.wb !== undefined && data.wb > 0 && (
              <span
                className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                  data.winner === "b"
                    ? "bg-brand-neon/30 text-brand-neon"
                    : "bg-brand-panel/50 text-brand-muted"
                }`}
              >
                {data.wb}/2
              </span>
            )}
          </div>
          {data.winner === "b" && (
            <svg className="w-4 h-4 text-brand-neon ml-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      </SeedItem>

      {isClickable && data.winner && (
        <div
          className="px-3 py-1.5 border-t border-brand-stroke/15 text-center"
          onClick={() => onClear(roundIndex, seedIndex)}
        >
          <span className="text-[10px] uppercase tracking-wider text-brand-muted/60 hover:text-brand-hot cursor-pointer transition-colors">
            Reset
          </span>
        </div>
      )}
    </Seed>
  );
}
