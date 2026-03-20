"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useTournamentStore } from "@/features/torneos/store/useTournamentStore";
import TournamentPanel from "@/features/torneos/components/TournamentPanel";
import BracketView from "@/features/torneos/components/BracketView";

export default function TorneosPage() {
  const { resetTournament, saveToLocal, loadFromLocal } =
    useTournamentStore();

  const handleNew = () => {
    if (!confirm("¿Nuevo torneo? Se borrará el estado actual (no la DB)."))
      return;
    resetTournament();
    toast.success("Nuevo torneo creado");
  };

  const handleSaveLocal = () => {
    saveToLocal();
    toast.success("Guardado localmente");
  };

  const handleLoadLocal = () => {
    const loaded = loadFromLocal();
    if (loaded) {
      toast.success("Cargado desde local");
    } else {
      toast.error("No hay guardado local");
    }
  };

  return (
    <section className="bg-linear-to-b from-brand-panel/90 to-brand-panel2/70 border border-brand-stroke/35 shadow-[inset_0_0_0_1px_rgba(122, 63, 255,0.08),0_18px_60px_rgba(0,0,0,0.55)] rounded-[22px] overflow-hidden min-h-[500px]">
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3.5 border-b border-brand-stroke/25">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-sm tracking-wide uppercase text-brand-muted">
            Panel organizador
          </h2>
          <b className="text-lg tracking-wide text-brand-text">
            Crear torneo · inscripciones · llaves
          </b>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/"
            className="border border-brand-neon/25 bg-brand-panel2/55 text-brand-text px-3 py-2 rounded-xl text-sm font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all"
          >
            Volver
          </Link>
          <button
            onClick={handleNew}
            className="border border-brand-neon/25 bg-brand-panel2/55 text-brand-text px-3 py-2 rounded-xl text-sm font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all"
          >
            Nuevo
          </button>
          <button
            onClick={handleSaveLocal}
            className="border border-brand-neon/45 bg-linear-to-r from-brand-neon/30 to-brand-neon2/10 shadow-[inset_0_0_0_1px_rgba(122,63,255,0.12)] text-brand-text px-3 py-2 rounded-xl text-sm font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all"
          >
            Guardar local
          </button>
          <button
            onClick={handleLoadLocal}
            className="border border-brand-neon/25 bg-brand-panel2/55 text-brand-text px-3 py-2 rounded-xl text-sm font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all"
          >
            Abrir local
          </button>
          <Link
            href="/calendar"
            className="border border-brand-neon/45 bg-linear-to-r from-brand-neon/30 to-brand-neon2/10 shadow-[inset_0_0_0_1px_rgba(122,63,255,0.12)] text-brand-text px-3 py-2 rounded-xl text-sm font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all"
          >
            Calendario
          </Link>
          <button
            onClick={() => {
              if (confirm("¿Reiniciar todo?")) {
                resetTournament();
                window.location.hash = "#/torneos";
              }
            }}
            className="border border-brand-hot/25 bg-brand-hot/10 text-brand-hot px-3 py-2 rounded-xl text-sm font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4">
        <TournamentPanel />
        <BracketView />
      </div>
    </section>
  );
}
