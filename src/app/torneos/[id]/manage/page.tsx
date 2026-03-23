"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import TournamentPanel from "@/features/torneos/components/TournamentPanel";
import DbBracketView from "@/features/torneos/components/DbBracketView";
import { useDbTournamentStore } from "@/features/torneos/store/useDbTournamentStore";

export default function TournamentManagePage() {
  const params = useParams<{ id: string }>();
  const tournamentId = params.id;

  const {
    tournament,
    isSyncing,
    syncError,
    loadTournament,
    saveTournament,
  } = useDbTournamentStore();

  useEffect(() => {
    if (!tournamentId) return;
    void loadTournament(tournamentId);
  }, [loadTournament, tournamentId]);

  const handleSave = async () => {
    const ok = await saveTournament();
    if (ok) {
      toast.success("Torneo guardado en base de datos");
    } else {
      toast.error(syncError || "No se pudo guardar");
    }
  };

  return (
    <section className="bg-linear-to-b from-brand-panel/90 to-brand-panel2/70 border border-brand-stroke/35 shadow-[inset_0_0_0_1px_rgba(122,63,255,0.08),0_18px_60px_rgba(0,0,0,0.55)] rounded-[22px] overflow-hidden min-h-[500px]">
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3.5 border-b border-brand-stroke/25">
        <div className="flex flex-col gap-1">
          <Breadcrumbs
            items={[
              { label: "Torneos", href: "/torneos" },
              { label: tournament.name || "Detalle", href: `/torneos/${tournamentId}` },
              { label: "Gestionar" },
            ]}
          />
          <h1 className="text-lg font-bold tracking-wide text-brand-text">
            Gestionar torneo
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`/torneos/${tournamentId}`}
            className="border border-brand-stroke/25 bg-brand-panel2/55 text-brand-text px-3 py-2 rounded-xl text-sm font-extrabold tracking-wide hover:brightness-110 transition-all"
          >
            Ver detalle
          </Link>

          <button
            onClick={() => void handleSave()}
            disabled={isSyncing}
            className="border border-brand-neon/45 bg-linear-to-r from-brand-neon/30 to-brand-neon2/10 text-brand-text px-4 py-2 rounded-xl text-sm font-extrabold tracking-wide hover:brightness-110 transition-all disabled:opacity-60"
          >
            {isSyncing ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>

      {syncError && (
        <div className="px-4 pt-3 text-sm text-brand-hot">{syncError}</div>
      )}

      <div className="p-4 grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4">
        <TournamentPanel useDatabase />
        <DbBracketView />
      </div>
    </section>
  );
}
