"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { fetchTeams, fetchTeamRobots } from "@/features/teams/api/teams";
import { SkeletonTeamItem, SkeletonRobotCard } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function TeamsPage() {
  const [search, setSearch] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: fetchTeams,
  });

  // Auto-select first team when teams load
  const effectiveSelectedId = selectedTeamId ?? (teams.length > 0 ? teams[0].id : null);

  const filteredTeams = search.trim()
    ? teams.filter(
        (t) =>
          (t.name || "").toLowerCase().includes(search.toLowerCase()) ||
          (t.school || "").toLowerCase().includes(search.toLowerCase())
      )
    : teams;

  const { data: robots = [], isLoading: robotsLoading } = useQuery({
    queryKey: ["team-robots", effectiveSelectedId],
    queryFn: () => fetchTeamRobots(effectiveSelectedId!),
    enabled: !!effectiveSelectedId,
  });

  const selectedTeam = teams.find((t) => t.id === effectiveSelectedId);

  useEffect(() => {
    const supabase = getSupabaseClient();
    const channelId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const channelName = `robot-cards-teams-${effectiveSelectedId ?? "all"}-${channelId}`;

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'robot_cards' }, (payload: RealtimePostgresChangesPayload<{ team_id?: string }>) => {
        const nextTeamId = (payload.new as { team_id?: unknown } | null)?.team_id;
        const prevTeamId = (payload.old as { team_id?: unknown } | null)?.team_id;
        const nextId = typeof nextTeamId === 'string' ? nextTeamId : '';
        const prevId = typeof prevTeamId === 'string' ? prevTeamId : '';

        if (!effectiveSelectedId || nextId === effectiveSelectedId || prevId === effectiveSelectedId) {
          void queryClient.invalidateQueries({ queryKey: ['team-robots'] });
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [effectiveSelectedId, queryClient]);

  return (
    <section className="bg-linear-to-b from-brand-panel/90 to-brand-panel2/70 border border-brand-stroke/35 shadow-[inset_0_0_0_1px_rgba(122, 63, 255,0.08),0_18px_60px_rgba(0,0,0,0.55)] rounded-[22px] overflow-hidden min-h-[500px]">
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3.5 border-b border-brand-stroke/25">
        <div className="flex flex-col gap-1">
          <Breadcrumbs items={[{ label: "Equipos" }]} />
          <b className="text-lg tracking-wide text-brand-text">Teams</b>
        </div>
        <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => {
                void Promise.all([
                  queryClient.invalidateQueries({ queryKey: ["teams"] }),
                  queryClient.invalidateQueries({ queryKey: ["team-robots"] }),
                ]);
              }}
            className="border border-brand-hot/45 bg-linear-to-r from-brand-hot/20 to-brand-hot/5 text-brand-text px-3 py-2 rounded-xl font-extrabold tracking-wide hover:brightness-110 cursor-pointer motion-safe:transition-[transform,opacity,background-color,border-color,color,box-shadow,filter] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          >
            Actualizar
          </button>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-[1fr_1.3fr] gap-3">
        {/* LEFT: Team list */}
        <div className="rounded-[18px] border border-brand-neon/22 bg-brand-bg/18 p-3">
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-sm font-bold text-brand-text m-0">Lista de equipos</label>
            <span className="text-brand-muted text-xs">({filteredTeams.length})</span>
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar equipo..."
            maxLength={48}
            className="w-full px-3 py-2.5 rounded-xl border border-brand-neon/18 bg-brand-bg/35 text-brand-text text-sm outline-none focus:border-brand-neon/35 motion-safe:transition-[transform,opacity,background-color,border-color,color,box-shadow,filter] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none mb-2.5"
          />

          {teamsLoading ? (
            <div className="flex flex-col gap-2">
              {[...Array(6)].map((_, i) => (
                <SkeletonTeamItem key={i} />
              ))}
            </div>
          ) : filteredTeams.length === 0 ? (
            <EmptyState
              icon="search"
              title="Sin resultados"
              description="No hay equipos que coincidan con tu búsqueda."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {filteredTeams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTeamId(t.id)}
                  className={`text-left rounded-[14px] p-2.5 cursor-pointer motion-safe:transition-[transform,opacity,background-color,border-color,color,box-shadow,filter] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none border ${
                    effectiveSelectedId === t.id
                      ? "bg-brand-neon/12 border-brand-neon/30"
                      : "bg-brand-panel2/55 border-brand-neon/10 hover:bg-brand-neon/7"
                  }`}
                >
                  <div className="font-extrabold text-sm text-brand-text">{t.name}</div>
                  <div className="text-brand-muted/70 text-xs mt-0.5">{t.school || "—"}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Team detail + robots */}
        <div className="rounded-[18px] border border-brand-neon/22 bg-brand-bg/18 p-3">
          {!effectiveSelectedId ? (
            <EmptyState
              icon="team"
              title="Selecciona un equipo"
              description="Elige un equipo de la lista para ver sus robots."
            />
          ) : robotsLoading ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2.5 mb-3">
                <div>
                  <SkeletonTeamItem />
                </div>
                <div className="text-brand-muted text-sm text-right shrink-0">
                  Robots: <b className="text-brand-text">...</b>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {[...Array(3)].map((_, i) => (
                  <SkeletonRobotCard key={i} />
                ))}
              </div>
            </div>
          ) : (
            <>
              {selectedTeam && (
                <div className="flex items-start justify-between gap-2.5 mb-3">
                  <div>
                    <div className="text-lg font-black text-brand-text">{selectedTeam.name}</div>
                    <div className="text-brand-muted text-sm">{selectedTeam.school || "—"}</div>
                  </div>
                  <div className="text-brand-muted text-sm text-right shrink-0">
                    Robots: <b className="text-brand-text">{robots.length}</b>
                  </div>
                </div>
              )}

              {robots.length === 0 ? (
                <EmptyState
                  icon="robot"
                  title="Sin robots"
                  description="Este equipo aún no tiene robots registrados."
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {robots.map((r) => {
                    const o = (r.data && typeof r.data === "object" ? r.data : {}) as {
                      n?: unknown;
                      c?: unknown;
                    };
                    const name = typeof o.n === "string" && o.n ? o.n : r.robot_id;
                    const cat = typeof o.c === "string" && o.c ? o.c : "—";
                    return (
                      <div
                        key={r.robot_id}
                        className="rounded-[14px] bg-brand-panel2/55 border border-brand-neon/10 p-2.5 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-extrabold text-sm text-brand-text">{name}</div>
                          <div className="text-brand-muted/70 text-xs mt-0.5">
                            ID: {r.robot_id} · {cat}
                          </div>
                        </div>
                        <Link
                          href={`/robots/${r.robot_id}`}
                          className="border border-brand-neon2/25 bg-brand-panel2/55 text-brand-text px-3 py-2 rounded-xl text-xs font-extrabold tracking-wide hover:brightness-110 motion-safe:transition-[transform,opacity,background-color,border-color,color,box-shadow,filter] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                        >
                          Abrir
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
