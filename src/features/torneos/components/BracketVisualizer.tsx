"use client";

import { transformBracketToRounds } from "../lib/bracketUtils";
import type { BracketRoundSeed } from "../lib/bracketUtils";
import type { Bracket as BracketType } from "../lib/types";

interface BracketVisualizerProps {
  bracket: BracketType;
  bracketId?: string;
  viewMode: "organizer" | "competitor";
  exportable?: boolean;
  exportFileName?: string;
  onWin?: (ri: number, mi: number, side: "a" | "b") => void;
  onClear?: (ri: number, mi: number) => void;
}

export default function BracketVisualizer({
  bracket,
  viewMode,
  exportable = false,
  exportFileName = "bracket",
  onWin,
  onClear,
}: BracketVisualizerProps) {
  const rounds = transformBracketToRounds(bracket);
  const isOrganizerView = viewMode === "organizer";

  const downloadMapImage = () => {
    const colWidth = 280;
    const titleHeight = 42;
    const titleOffset = 10;
    const seedHeight = 68;
    const seedGapByRound = rounds.map((_, roundIndex) => Math.max(16, 28 * Math.pow(2, roundIndex)));
    const topOffsetByRound = rounds.map((_, roundIndex) =>
      roundIndex === 0 ? 0 : 16 * Math.pow(2, roundIndex - 1)
    );

    const maxHeight = rounds.reduce((acc, round, roundIndex) => {
      const seedsCount = round.seeds.length;
      if (seedsCount === 0) return acc;
      const contentHeight =
        topOffsetByRound[roundIndex] +
        titleOffset +
        titleHeight +
        seedsCount * seedHeight +
        (seedsCount - 1) * seedGapByRound[roundIndex] +
        20;
      return Math.max(acc, contentHeight);
    }, 260);

    const svgWidth = Math.max(920, rounds.length * colWidth + 64);
    const svgHeight = Math.ceil(maxHeight);

    const esc = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

    const drawSeed = (seed: BracketRoundSeed, x: number, y: number) => {
      const winnerA = seed.winner === "a";
      const winnerB = seed.winner === "b";
      const topBg = winnerA ? "#193949" : "#111827";
      const bottomBg = winnerB ? "#193949" : "#111827";
      const stroke = seed.winner ? "#2fe6ff" : "#374151";

      return `
        <g>
          <rect x="${x}" y="${y}" width="240" height="68" rx="10" fill="#0b1220" stroke="${stroke}" stroke-width="1.2" />
          <rect x="${x + 1}" y="${y + 1}" width="238" height="33" rx="9" fill="${topBg}" />
          <rect x="${x + 1}" y="${y + 34}" width="238" height="33" rx="9" fill="${bottomBg}" />
          <line x1="${x + 1}" y1="${y + 34}" x2="${x + 239}" y2="${y + 34}" stroke="#283346" stroke-width="1" />

          <text x="${x + 10}" y="${y + 21}" fill="#e5e7eb" font-size="12" font-family="Arial, sans-serif" font-weight="700">
            ${esc(seed.teams[0]?.name || "-")}
          </text>
          <text x="${x + 10}" y="${y + 54}" fill="#e5e7eb" font-size="12" font-family="Arial, sans-serif" font-weight="700">
            ${esc(seed.teams[1]?.name || "-")}
          </text>

          <text x="${x + 226}" y="${y + 21}" text-anchor="end" fill="#94a3b8" font-size="11" font-family="Arial, sans-serif">
            ${seed.wa}/2
          </text>
          <text x="${x + 226}" y="${y + 54}" text-anchor="end" fill="#94a3b8" font-size="11" font-family="Arial, sans-serif">
            ${seed.wb}/2
          </text>
        </g>
      `;
    };

    const roundSvgs = rounds
      .map((round, roundIndex) => {
        const x = 24 + roundIndex * colWidth;
        const titleY = 18;
        const seedsBaseY = titleY + titleHeight + topOffsetByRound[roundIndex];
        const seedsSvg = round.seeds
          .map((seed, seedIndex) => {
            const y = seedsBaseY + seedIndex * (seedHeight + seedGapByRound[roundIndex]);
            return drawSeed(seed, x, y);
          })
          .join("\n");

        return `
          <g>
            <rect x="${x + 20}" y="${titleY}" width="200" height="28" rx="14" fill="#0f172a" stroke="#334155" stroke-width="1" />
            <text x="${x + 120}" y="${titleY + 18}" text-anchor="middle" fill="#cbd5e1" font-size="11" font-family="Arial, sans-serif" font-weight="700" letter-spacing="0.8">
              ${esc(round.title.toUpperCase())}
            </text>
            ${seedsSvg}
          </g>
        `;
      })
      .join("\n");

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0b1020" />
            <stop offset="100%" stop-color="#111827" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="url(#bg)" />
        ${roundSvgs}
      </svg>
    `;

    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportFileName}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleSeedClick = (roundIndex: number, seedIndex: number, side: "a" | "b") => {
    if (!isOrganizerView || !onWin) return;
    const seed = rounds[roundIndex].seeds[seedIndex];
    if (side === "a" && seed.aBye) return;
    if (side === "b" && seed.bBye) return;
    onWin(roundIndex, seedIndex, side);
  };

  const handleSeedClear = (roundIndex: number, seedIndex: number) => {
    if (!isOrganizerView || !onClear) return;
    onClear(roundIndex, seedIndex);
  };

  return (
    <div className="overflow-auto custom-scroll">
      {exportable && (
        <div className="px-4 pt-4 pb-1 flex justify-end">
          <button
            onClick={downloadMapImage}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-brand-neon/40 text-brand-neon hover:brightness-110 cursor-pointer transition-all"
          >
            Guardar imagen
          </button>
        </div>
      )}
      <div className="min-w-[800px] p-4">
        <div className="flex items-start gap-8">
          {rounds.map((round, roundIndex) => {
            const topOffset = roundIndex === 0 ? 0 : 16 * Math.pow(2, roundIndex - 1);
            const seedGap = Math.max(16, 28 * Math.pow(2, roundIndex));

            return (
              <section
                key={round.title + roundIndex}
                className="min-w-[240px]"
                style={{ paddingTop: `${topOffset}px` }}
              >
                <div className="text-center mb-4">
                  <span className="text-xs uppercase tracking-wider text-brand-muted/70 bg-brand-panel/40 px-4 py-2 rounded-xl border border-brand-stroke/20">
                    {round.title}
                  </span>
                </div>

                <div className="flex flex-col" style={{ gap: `${seedGap}px` }}>
                  {round.seeds.map((seed, seedIndex) => (
                    <CustomSeedCard
                      key={seed.id}
                      seed={seed}
                      roundIndex={roundIndex}
                      seedIndex={seedIndex}
                      viewMode={viewMode}
                      onWin={handleSeedClick}
                      onClear={handleSeedClear}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface SeedCardProps {
  seed: BracketRoundSeed;
  roundIndex: number;
  seedIndex: number;
  viewMode: "organizer" | "competitor";
  onWin: (roundIndex: number, seedIndex: number, side: "a" | "b") => void;
  onClear: (roundIndex: number, seedIndex: number) => void;
}

function CustomSeedCard({
  seed,
  roundIndex,
  seedIndex,
  viewMode,
  onWin,
  onClear,
}: SeedCardProps) {
  const data = seed;
  const isClickable = viewMode === "organizer";
  const isBye1 = data.aBye;
  const isBye2 = data.bBye;

  return (
    <article
      className="border rounded-xl min-w-[220px]"
      style={{
        fontSize: 12,
        background: data.winner
          ? "linear-gradient(135deg, rgba(47,230,255,0.15) 0%, rgba(122,63,255,0.1) 100%)"
          : "rgba(15,15,25,0.9)",
        borderColor: data.winner
          ? "rgba(47,230,255,0.5)"
          : "rgba(122,63,255,0.3)",
        cursor: isClickable ? "pointer" : "default",
        transition: "all 0.2s ease",
      }}
    >
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

      {isClickable && data.winner && (
        <div className="px-3 py-1.5 border-t border-brand-stroke/15 text-center">
          <span
            className="text-[10px] uppercase tracking-wider text-brand-muted/60 hover:text-brand-hot cursor-pointer transition-colors"
            onClick={() => onClear(roundIndex, seedIndex)}
          >
            Reset
          </span>
        </div>
      )}
    </article>
  );
}
