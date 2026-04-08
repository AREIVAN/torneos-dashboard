"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useDbTournamentStore } from "@/features/torneos/store/useDbTournamentStore";
import TournamentPanel from "@/features/torneos/components/TournamentPanel";
import DbBracketView from "@/features/torneos/components/DbBracketView";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useEffect, useState } from "react";

export default function NewTournamentPage() {
  const router = useRouter();
  const {
    tournament,
    players,
    view,
    isSyncing,
    syncError,
    resetTournament,
    newTournament,
    createAndSave,
    generate,
  } = useDbTournamentStore();
  const [setupPanelOverride, setSetupPanelOverride] = useState<boolean | null>(null);
  const showSetupPanel = setupPanelOverride ?? !view;

  // Start fresh when loading this page
  useEffect(() => {
    newTournament();
  }, [newTournament]);

  const handleSaveAndStart = async () => {
    if (!tournament.name.trim()) {
      toast.error("El torneo necesita un nombre");
      return;
    }

    if (players.length < 2) {
      toast.error("Agrega al menos 2 participantes");
      return;
    }

    // Create tournament in DB
    const tournamentId = await createAndSave();

    if (tournamentId) {
      if (!view) {
        await generate();
      }
      toast.success("Torneo creado exitosamente");
      router.push(`/torneos/${tournamentId}`);
    } else {
      toast.error(syncError || "Error al crear el torneo");
    }
  };

  const handleGeneratePreview = async () => {
    await generate();
    toast.success("Llaves generadas (vista previa)");
  };

  const handleReset = () => {
    if (!confirm("¿Reiniciar todo? Se perderá la configuración actual.")) return;
    resetTournament();
    toast.success("Torneo reiniciado");
  };

  return (
    <section className="bg-linear-to-b from-brand-panel/90 to-brand-panel2/70 border border-brand-stroke/35 shadow-[inset_0_0_0_1px_rgba(122,63,255,0.08),0_18px_60px_rgba(0,0,0,0.55)] rounded-[22px] overflow-hidden min-h-[500px]">
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3.5 border-b border-brand-stroke/25">
        <div className="flex flex-col gap-1">
          <Breadcrumbs
            items={[
              { label: "Torneos", href: "/torneos" },
              { label: "Nuevo torneo" },
            ]}
          />
          <h1 className="text-lg font-bold tracking-wide text-brand-text">
            Crear nuevo torneo
          </h1>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {!view && (
            <button
              onClick={handleGeneratePreview}
              disabled={players.length < 2}
              className="border border-brand-neon/25 bg-brand-panel2/55 text-brand-text px-3 py-2 rounded-xl text-sm font-extrabold tracking-wide hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              Vista previa
            </button>
          )}
          <button
            onClick={handleSaveAndStart}
            disabled={isSyncing || !tournament.name.trim() || players.length < 2}
            className="border border-brand-neon/45 bg-linear-to-r from-brand-neon/30 to-brand-neon2/10 shadow-[inset_0_0_0_1px_rgba(122,63,255,0.12)] text-brand-text px-4 py-2 rounded-xl text-sm font-extrabold tracking-wide hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center gap-2"
          >
            {isSyncing ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Guardando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Crear y comenzar
              </>
            )}
          </button>
          <button
            onClick={() =>
              setSetupPanelOverride((current) => {
                const currentVisible = current ?? !view;
                return !currentVisible;
              })
            }
            className="border border-brand-stroke/25 bg-brand-panel2/55 text-brand-text px-3 py-2 rounded-xl text-sm font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all"
          >
            {showSetupPanel ? "Ocultar configuracion" : "Mostrar configuracion"}
          </button>
          <button
            onClick={handleReset}
            className="border border-brand-hot/25 bg-brand-hot/10 text-brand-hot px-3 py-2 rounded-xl text-sm font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all"
          >
            Reiniciar
          </button>
        </div>
      </div>

      <div
        className={`p-4 grid grid-cols-1 gap-4 ${
          showSetupPanel ? "lg:grid-cols-[1fr_1.2fr]" : "lg:grid-cols-1"
        }`}
      >
        {showSetupPanel && <TournamentPanel useDatabase />}
        <DbBracketView />
      </div>
    </section>
  );
}
