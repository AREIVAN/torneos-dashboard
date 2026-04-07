"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { TournamentWithDetails } from "@/lib/supabase/database.types";
import {
  getTournamentWithDetails,
  updateTournamentStatus,
  syncTournamentMatches,
  recalculateStandings,
  setFinalPlacements,
  getTournamentStandings,
} from "@/features/torneos/api";
import { GroupStandingsTable } from "@/features/torneos/components/GroupStandingsTable";
import { FinalPlacementsPodium } from "@/features/torneos/components/FinalPlacementsPodium";
import { SpectatorBracketView } from "@/features/torneos/components/SpectatorBracketView";

function statusLabel(status: string) {
  if (status === "draft") return "Borrador";
  if (status === "active") return "En curso";
  if (status === "completed") return "Finalizado";
  return "Cancelado";
}

export default function TournamentDetailPage() {
  const params = useParams<{ id: string }>();
  const tournamentId = params.id;

  const [data, setData] = useState<TournamentWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const autoSyncedRef = useRef(false);

  useEffect(() => {
    autoSyncedRef.current = false;
  }, [tournamentId]);

  const loadTournament = useCallback(async () => {
    if (!tournamentId) return;
    setLoading(true);
    setError(null);

    const res = await getTournamentWithDetails(tournamentId);
    if (res.error || !res.data) {
      setError(res.error?.message || "No se pudo cargar el torneo");
      setData(null);
    } else {
      setData(res.data);
    }
    setLoading(false);
  }, [tournamentId]);

  useEffect(() => {
    void loadTournament();
  }, [loadTournament]);

  useEffect(() => {
    if (!tournamentId) return;

    const channel = getSupabaseClient()
      .channel(`tournament-live-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournaments",
          filter: `id=eq.${tournamentId}`,
        },
        () => {
          void loadTournament();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          void loadTournament();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "standings",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          void loadTournament();
        }
      )
      .subscribe();

    return () => {
      void getSupabaseClient().removeChannel(channel);
    };
  }, [tournamentId, loadTournament]);

  useEffect(() => {
    if (!data || autoSyncedRef.current) return;
    if (data.matches.length > 0 || !data.bracket_data) return;

    autoSyncedRef.current = true;
    void (async () => {
      await syncTournamentMatches(data.id, data.bracket_data);
      await recalculateStandings(data.id);
      await loadTournament();
    })();
  }, [data, loadTournament]);

  const completedMatches = useMemo(
    () => data?.matches.filter((m) => m.winner_id || m.is_bye).length ?? 0,
    [data]
  );

  const setCompleted = async () => {
    if (!data) return;
    const standingsRes = await getTournamentStandings(data.id);
    if (!standingsRes.error && standingsRes.data.length > 0) {
      const placements = standingsRes.data.slice(0, 4).map((standing, index) => ({
        robotId: standing.robot_id,
        position: index + 1,
      }));
      await setFinalPlacements(data.id, placements);
    }
    await updateTournamentStatus(data.id, "completed");
    await loadTournament();
  };

  const setActive = async () => {
    if (!data) return;
    await updateTournamentStatus(data.id, "active");
    await loadTournament();
  };

  const handleSyncFromBracket = async () => {
    if (!data) return;
    await syncTournamentMatches(data.id, data.bracket_data);
    await recalculateStandings(data.id);
    await loadTournament();
  };

  return (
    <section className="bg-linear-to-b from-brand-panel/90 to-brand-panel2/70 border border-brand-stroke/35 rounded-[22px] overflow-hidden min-h-[500px]">
      <div className="px-4 py-3.5 border-b border-brand-stroke/25 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Breadcrumbs
            items={[
              { label: "Torneos", href: "/torneos" },
              { label: data?.name || "Detalle" },
            ]}
          />
          <h1 className="text-lg font-bold text-brand-text">{data?.name || "Torneo"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded border border-brand-stroke/30 text-brand-muted">
            {statusLabel(data?.status || "draft")}
          </span>
          <Link
            href="/torneos/new"
            className="text-xs px-3 py-1.5 rounded-lg border border-brand-stroke/30 text-brand-text hover:brightness-110"
          >
            Nuevo torneo
          </Link>
          <Link
            href={`/torneos/${data?.id || tournamentId}/manage`}
            className="text-xs px-3 py-1.5 rounded-lg border border-brand-neon/40 text-brand-neon hover:brightness-110"
          >
            Gestionar llaves
          </Link>
          {data?.status !== "active" && (
            <button
              onClick={() => void setActive()}
              className="text-xs px-3 py-1.5 rounded-lg border border-brand-neon/40 text-brand-neon"
            >
              Marcar activo
            </button>
          )}
          {data?.status !== "completed" && (
            <button
              onClick={() => void setCompleted()}
              className="text-xs px-3 py-1.5 rounded-lg border border-green-500/40 text-green-400"
            >
              Finalizar
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {loading && <div className="text-sm text-brand-muted">Cargando torneo...</div>}

        {!loading && error && <div className="text-sm text-brand-hot">{error}</div>}

        {!loading && !error && !data && (
          <EmptyState
            icon="error"
            title="No se encontró el torneo"
            description="Verifica el enlace o crea un torneo nuevo."
            action={{ label: "Ir a torneos", href: "/torneos" }}
          />
        )}

        {!loading && data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-brand-stroke/25 bg-brand-panel/40 p-3">
                <div className="text-xs text-brand-muted">Participantes</div>
                <div className="text-2xl font-bold text-brand-text">{data.participants.length}</div>
              </div>
              <div className="rounded-xl border border-brand-stroke/25 bg-brand-panel/40 p-3">
                <div className="text-xs text-brand-muted">Matches</div>
                <div className="text-2xl font-bold text-brand-text">{data.matches.length}</div>
              </div>
              <div className="rounded-xl border border-brand-stroke/25 bg-brand-panel/40 p-3">
                <div className="text-xs text-brand-muted">Completados</div>
                <div className="text-2xl font-bold text-brand-neon">{completedMatches}</div>
              </div>
              <div className="rounded-xl border border-brand-stroke/25 bg-brand-panel/40 p-3">
                <div className="text-xs text-brand-muted">Formato</div>
                <div className="text-lg font-bold text-brand-text capitalize">{data.format}</div>
              </div>
            </div>

            <div className="rounded-xl border border-brand-stroke/25 bg-brand-panel/40 p-4">
              <h3 className="text-sm uppercase tracking-wide text-brand-muted mb-3">Enlace compartible</h3>
              <div className="flex flex-wrap items-center gap-2">
                <code className="text-xs text-brand-text bg-brand-bg/30 px-2 py-1 rounded border border-brand-stroke/20">
                  /torneos/{data.id}
                </code>
                <button
                  onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/torneos/${data.id}`)}
                  className="text-xs px-2 py-1 rounded border border-brand-neon/40 text-brand-neon"
                >
                  Copiar URL
                </button>
                <button
                  onClick={() => void handleSyncFromBracket()}
                  className="text-xs px-2 py-1 rounded border border-brand-stroke/30 text-brand-text"
                >
                  Sincronizar matches desde bracket
                </button>
              </div>
            </div>

            <FinalPlacementsPodium placements={data.standings} participants={data.participants} />
            <GroupStandingsTable standings={data.standings} participants={data.participants} />

            {data.bracket_data ? (
              <SpectatorBracketView view={data.bracket_data} />
            ) : (
              <div className="rounded-xl border border-brand-stroke/25 bg-brand-panel/40 p-3 text-sm text-brand-muted">
                Aun no hay visualizacion de llaves. Genera o guarda el bracket desde "Gestionar llaves".
              </div>
            )}

            <div className="rounded-xl border border-brand-stroke/25 bg-brand-panel/40 overflow-hidden">
              <div className="px-3 py-2 border-b border-brand-stroke/20 text-xs uppercase tracking-wide text-brand-muted">
                Historial de matches
              </div>
              <div className="px-3 py-2 text-xs text-brand-muted border-b border-brand-stroke/10">
                Vista de solo lectura. Para editar llaves y resultados usa "Gestionar llaves".
              </div>
              {data.matches.length === 0 ? (
                <div className="p-3 text-sm text-brand-muted">Aun no hay matches guardados.</div>
              ) : (
                <div className="divide-y divide-brand-stroke/10">
                  {data.matches.map((m) => (
                    <div key={m.id} className="p-3 flex items-center justify-between gap-3 text-sm">
                      <div className="text-brand-text">
                        R{m.round_index + 1} · M{m.match_index + 1} · {m.bracket_type}
                      </div>
                      <div className="text-brand-muted">
                        {m.robot_a_id || "TBD"} ({m.wins_a}) vs {m.robot_b_id || "TBD"} ({m.wins_b})
                      </div>
                      <div className="text-brand-neon">{m.winner_id ? `Ganador: ${m.winner_id}` : "Pendiente"}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
