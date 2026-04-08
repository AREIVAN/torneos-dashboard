"use client";

import type { DbParticipant, DbStanding } from "@/lib/supabase/database.types";

interface FinalPlacementsPodiumProps {
  placements: DbStanding[];
  participants: DbParticipant[];
}

const MEDALS: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

export function FinalPlacementsPodium({ placements, participants }: FinalPlacementsPodiumProps) {
  const byRobotId = new Map(participants.map((p) => [p.robot_id, p]));
  const sorted = [...placements]
    .filter((p) => p.final_position !== null)
    .sort((a, b) => (a.final_position as number) - (b.final_position as number))
    .slice(0, 3);

  if (sorted.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-brand-stroke/25 bg-brand-panel/40 p-4">
      <h3 className="text-sm uppercase tracking-wide text-brand-muted mb-3">Top 3 Final</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map((place) => {
          const participant = byRobotId.get(place.robot_id);
          const name = participant?.robot_data?.n ?? place.robot_id;
          const team = participant?.robot_data?.t;
          const pos = place.final_position as number;
          return (
            <div
              key={place.id}
              className={`rounded-lg border p-3 ${
                pos === 1
                  ? "border-yellow-500/40 bg-yellow-500/10"
                  : pos === 2
                    ? "border-slate-400/40 bg-slate-400/10"
                    : pos === 3
                      ? "border-amber-700/40 bg-amber-700/10"
                      : "border-brand-stroke/25 bg-brand-bg/20"
              }`}
            >
              <div className="text-xl mb-1">{MEDALS[pos] ?? `${pos}o`}</div>
              <div className="text-sm font-bold text-brand-text truncate">{name}</div>
              <div className="text-xs text-brand-muted truncate">{team || "Sin equipo"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
