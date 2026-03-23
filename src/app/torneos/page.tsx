"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { getTournaments, deleteTournament } from "@/features/torneos/api";
import type { DbTournament, TournamentStatus } from "@/lib/supabase/database.types";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/skeleton";

const STATUS_LABELS: Record<TournamentStatus, string> = {
  draft: "Borrador",
  active: "En curso",
  completed: "Finalizado",
  cancelled: "Cancelado",
};

const STATUS_COLORS: Record<TournamentStatus, string> = {
  draft: "bg-brand-muted/30 text-brand-muted border-brand-muted/30",
  active: "bg-brand-neon/20 text-brand-neon border-brand-neon/40",
  completed: "bg-green-500/20 text-green-400 border-green-500/40",
  cancelled: "bg-brand-hot/20 text-brand-hot border-brand-hot/40",
};

const FILTER_OPTIONS: { value: TournamentStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "En curso" },
  { value: "draft", label: "Borradores" },
  { value: "completed", label: "Finalizados" },
];

export default function TorneosListPage() {
  const [tournaments, setTournaments] = useState<DbTournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<TournamentStatus | "all">("all");
  const [error, setError] = useState<string | null>(null);

  const loadTournaments = async () => {
    setIsLoading(true);
    setError(null);

    const options = filter === "all" ? {} : { status: filter };
    const { data, error: fetchError } = await getTournaments(options);

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setTournaments(data);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadTournaments();
  }, [filter]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar el torneo "${name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    const { error } = await deleteTournament(id);
    if (error) {
      alert(`Error al eliminar: ${error.message}`);
    } else {
      setTournaments((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Sin fecha";
    try {
      return new Date(dateStr).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <section className="bg-linear-to-b from-brand-panel/90 to-brand-panel2/70 border border-brand-stroke/35 shadow-[inset_0_0_0_1px_rgba(122,63,255,0.08),0_18px_60px_rgba(0,0,0,0.55)] rounded-[22px] overflow-hidden min-h-[500px]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3.5 border-b border-brand-stroke/25">
        <div className="flex flex-col gap-1">
          <Breadcrumbs items={[{ label: "Torneos" }]} />
          <h1 className="text-lg font-bold tracking-wide text-brand-text">
            Torneos
          </h1>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/torneos/new"
            className="border border-brand-neon/45 bg-linear-to-r from-brand-neon/30 to-brand-neon2/10 shadow-[inset_0_0_0_1px_rgba(122,63,255,0.12)] text-brand-text px-4 py-2 rounded-xl text-sm font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo torneo
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 border-b border-brand-stroke/15">
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === option.value
                  ? "bg-brand-neon/20 text-brand-neon border border-brand-neon/40"
                  : "bg-brand-panel2/50 text-brand-muted border border-brand-stroke/20 hover:bg-brand-panel2/80"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-brand-hot mb-4">{error}</p>
            <button
              onClick={loadTournaments}
              className="px-4 py-2 bg-brand-panel2 border border-brand-stroke/30 rounded-lg text-brand-text hover:brightness-110"
            >
              Reintentar
            </button>
          </div>
        ) : tournaments.length === 0 ? (
          <EmptyState
            icon="trophy"
            title="No hay torneos"
            description={
              filter === "all"
                ? "Crea tu primer torneo para comenzar a organizar competencias."
                : `No hay torneos con estado "${STATUS_LABELS[filter as TournamentStatus]}".`
            }
            action={
              filter === "all" ? (
                <Link
                  href="/torneos/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-neon/20 border border-brand-neon/40 rounded-lg text-brand-neon hover:brightness-110"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Crear torneo
                </Link>
              ) : undefined
            }
          />
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.05 },
              },
            }}
          >
            <AnimatePresence mode="popLayout">
              {tournaments.map((tournament) => (
                <motion.div
                  key={tournament.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-brand-panel2/60 border border-brand-stroke/30 rounded-xl p-4 hover:border-brand-neon/30 transition-colors group"
                >
                  {/* Status Badge */}
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium border ${
                        STATUS_COLORS[tournament.status]
                      }`}
                    >
                      {STATUS_LABELS[tournament.status]}
                    </span>
                    <button
                      onClick={() => handleDelete(tournament.id, tournament.name)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-brand-muted hover:text-brand-hot transition-all"
                      title="Eliminar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Tournament Info */}
                  <h3 className="text-brand-text font-bold text-lg mb-1 line-clamp-1">
                    {tournament.name}
                  </h3>

                  <div className="space-y-1 text-sm text-brand-muted mb-4">
                    <p className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      {tournament.category || "Sin categoría"}
                    </p>
                    <p className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(tournament.date)}
                    </p>
                    <p className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {tournament.venue || "Sin ubicación"}
                    </p>
                  </div>

                  {/* Format Badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs bg-brand-panel/50 border border-brand-stroke/20 px-2 py-1 rounded text-brand-muted">
                      {tournament.format === "single" && "Eliminación simple"}
                      {tournament.format === "double" && "Doble eliminación"}
                      {tournament.format === "groups" && "Fase de grupos"}
                      {" · "}
                      {tournament.size} robots
                    </span>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/torneos/${tournament.id}`}
                        className="text-sm text-brand-neon hover:underline font-medium"
                      >
                        Ver detalles
                      </Link>
                      <Link
                        href={`/torneos/${tournament.id}/manage`}
                        className="text-xs px-2 py-1 rounded border border-brand-stroke/25 text-brand-muted hover:text-brand-text"
                      >
                        Gestionar
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </section>
  );
}
