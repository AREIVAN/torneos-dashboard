"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEvents, type CalendarEvent } from "../api/getEvents";
import { evBuildFilterChips, evPickDate, evGenerateICS } from "../lib/eventUtils";
import { CalendarEventList } from "./CalendarEventList";
import { TournamentProfile } from "./TournamentProfile";
import { AddEventModal } from "./AddEventModal";
import { SkeletonEventCard } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

export function CalendarPage() {
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: events = [], isLoading: loading, refetch } = useQuery<CalendarEvent[]>({
    queryKey: ["calendar-events"],
    queryFn: getEvents,
  });

  const now = new Date();
  const upcoming = events.find((e) => {
    const d = evPickDate(e);
    return d && d >= now;
  });
  const effectiveSelectedId = selectedId ?? (events.length ? String((upcoming || events[0]).id) : null);

  const selectedEvent = events.find((e) => String(e.id) === effectiveSelectedId) || null;

  // Build chip list
  const rows = events.map((t) => ({ t, d: evPickDate(t) })).filter((r) => r.d !== null);
  const chipLabels = evBuildFilterChips(rows as { t: CalendarEvent }[]);

  const handleClear = () => {
    setQuery("");
    setChip("ALL");
  };

  const handleSubscribe = () => {
    const now = new Date();
    const upcoming = events
      .map((t) => {
        const d = evPickDate(t);
        return d ? { t, d } : null;
      })
      .filter((r): r is { t: CalendarEvent; d: Date } => r !== null && r.d >= now)
      .slice(0, 80);

    if (!upcoming.length) {
      alert("No hay eventos próximos para exportar.");
      return;
    }

    const blob = evGenerateICS(upcoming);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "apex_torneos.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2500);
  };

  return (
    <section className="bg-linear-to-b from-brand-panel/90 to-brand-panel2/70 border border-brand-stroke/35 shadow-[inset_0_0_0_1px_rgba(122,63,255,0.08),0_18px_60px_rgba(0,0,0,0.55)] rounded-[22px] overflow-hidden min-h-[500px]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3.5 border-b border-brand-stroke/25">
        <div className="flex flex-col gap-1">
          <Breadcrumbs items={[{ label: "Calendario" }]} />
          <b className="text-lg tracking-wide text-brand-text">
            Directorio de torneos · próximos y anteriores
          </b>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => {
              void refetch();
            }}
            className="border border-brand-neon/25 bg-brand-panel2/55 text-brand-text px-3 py-2 rounded-xl font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all"
          >
            Actualizar
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="border border-brand-neon/25 bg-brand-panel2/55 text-brand-text px-3 py-2 rounded-xl font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all"
          >
            Agregar evento
          </button>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Search row */}
        <div className="flex flex-wrap gap-2.5 items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setQuery("");
            }}
            placeholder="Buscar torneo (nombre, ciudad, categoría, tags)..."
            className="flex-1 min-w-[200px] px-3 py-2.5 rounded-xl border border-brand-neon/20 bg-brand-bg/35 text-brand-text text-sm outline-none focus:border-brand-neon/35 transition-all"
          />
          <button
            onClick={handleClear}
            className="border border-brand-neon/25 bg-brand-panel2/55 text-brand-text px-3 py-2 rounded-xl text-sm font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all"
          >
            Limpiar
          </button>
          <button
            onClick={handleSubscribe}
            className="border border-brand-neon/25 bg-brand-panel2/55 text-brand-text px-3 py-2 rounded-xl text-sm font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all"
            title="Exporta un .ics con próximos eventos"
          >
            Suscribirse (ICS)
          </button>
          <button className="border border-brand-neon/45 bg-linear-to-r from-brand-neon/28 to-brand-neon2/10 shadow-[inset_0_0_0_1px_rgba(122,63,255,0.12)] text-brand-text px-3 py-2 rounded-xl text-sm font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all">
            Lista
          </button>
          <button className="border border-brand-neon/25 bg-brand-panel2/55 text-brand-text px-3 py-2 rounded-xl text-sm font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all">
            Mes
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 items-center">
          <span
            onClick={() => setChip("ALL")}
            className={`px-3 py-1.5 rounded-full text-xs border cursor-pointer transition-all ${
              chip === "ALL"
                ? "border-brand-neon2/55 bg-brand-bg/35 text-brand-text"
                : "border-brand-neon/20 bg-brand-bg/15 text-brand-muted hover:border-brand-neon2/40"
            }`}
          >
            Todos
          </span>
          {chipLabels.map((c) => (
            <span
              key={c}
              onClick={() => setChip(c)}
              className={`px-3 py-1.5 rounded-full text-xs border cursor-pointer transition-all ${
                chip === c
                  ? "border-brand-neon2/55 bg-brand-bg/35 text-brand-text"
                  : "border-brand-neon/20 bg-brand-bg/15 text-brand-muted hover:border-brand-neon2/40"
              }`}
            >
              {c}
            </span>
          ))}
        </div>

        {/* Main grid */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-[18px] border border-brand-stroke/20 bg-brand-bg/35 overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-brand-stroke/20 flex flex-col gap-1 bg-brand-panel/40">
                <h2 className="text-sm uppercase text-brand-muted tracking-wide m-0">
                  Próximos
                </h2>
                <b className="text-lg text-brand-text">Con conteo regresivo</b>
              </div>
              <div className="p-3 flex flex-col gap-2">
                {[...Array(4)].map((_, i) => (
                  <SkeletonEventCard key={i} />
                ))}
              </div>
            </div>
            <div className="rounded-[18px] border border-brand-stroke/20 bg-brand-bg/35 p-4">
              <SkeletonEventCard />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CalendarEventList
              events={events}
              query={query}
              chip={chip}
              onSelect={(id) => setSelectedId(id)}
            />
            <TournamentProfile event={selectedEvent} />
          </div>
        )}
      </div>

      <AddEventModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          void refetch();
        }}
      />
    </section>
  );
}
