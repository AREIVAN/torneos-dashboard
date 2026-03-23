"use client";

import type { DbParticipant, DbStanding } from "@/lib/supabase/database.types";

interface GroupStandingsTableProps {
  standings: DbStanding[];
  participants: DbParticipant[];
}

export function GroupStandingsTable({ standings, participants }: GroupStandingsTableProps) {
  const byRobotId = new Map(participants.map((p) => [p.robot_id, p]));
  const groups = new Map<number, DbStanding[]>();

  standings
    .filter((s) => s.group_index !== null)
    .forEach((s) => {
      const key = s.group_index as number;
      const list = groups.get(key) ?? [];
      list.push(s);
      groups.set(key, list);
    });

  if (groups.size === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {[...groups.entries()].sort((a, b) => a[0] - b[0]).map(([groupIndex, rows]) => {
        const sorted = [...rows].sort((a, b) => {
          if (a.points !== b.points) return b.points - a.points;
          const diffA = a.rounds_won - a.rounds_lost;
          const diffB = b.rounds_won - b.rounds_lost;
          return diffB - diffA;
        });

        return (
          <div key={groupIndex} className="rounded-xl border border-brand-stroke/25 bg-brand-panel/40 overflow-hidden">
            <div className="px-3 py-2 border-b border-brand-stroke/20 text-xs uppercase tracking-wide text-brand-muted">
              Grupo {String.fromCharCode(65 + groupIndex)}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-brand-muted border-b border-brand-stroke/10">
                    <th className="text-left px-3 py-2">#</th>
                    <th className="text-left px-3 py-2">Robot</th>
                    <th className="text-right px-3 py-2">W</th>
                    <th className="text-right px-3 py-2">L</th>
                    <th className="text-right px-3 py-2">RW</th>
                    <th className="text-right px-3 py-2">RL</th>
                    <th className="text-right px-3 py-2">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row, idx) => {
                    const participant = byRobotId.get(row.robot_id);
                    const name = participant?.robot_data?.n ?? row.robot_id;
                    return (
                      <tr key={row.id} className="border-b border-brand-stroke/5 text-brand-text">
                        <td className="px-3 py-2">{idx + 1}</td>
                        <td className="px-3 py-2 font-semibold">{name}</td>
                        <td className="px-3 py-2 text-right">{row.wins}</td>
                        <td className="px-3 py-2 text-right">{row.losses}</td>
                        <td className="px-3 py-2 text-right">{row.rounds_won}</td>
                        <td className="px-3 py-2 text-right">{row.rounds_lost}</td>
                        <td className="px-3 py-2 text-right font-bold text-brand-neon">{row.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
