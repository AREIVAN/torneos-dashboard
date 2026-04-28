"use client";

import { useState } from "react";
import { useTournamentStore } from "../store/useTournamentStore";
import { useDbTournamentStore } from "../store/useDbTournamentStore";
import { searchRobots, robotLabel } from "../api/searchRobots";
import { CATEGORIES } from "../lib/types";
import type { Player } from "../lib/types";
import { toast } from "sonner";

interface TournamentPanelProps {
  useDatabase?: boolean;
}

export default function TournamentPanel({ useDatabase = false }: TournamentPanelProps) {
  // Select the appropriate store based on prop
  const localStore = useTournamentStore();
  const dbStore = useDbTournamentStore();
  
  const store = useDatabase ? dbStore : localStore;
  
  const {
    tournament,
    players,
    setTournament,
    addPlayer,
    removePlayer,
    reorderPlayer,
    shufflePlayers,
  } = store;

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<
    { robot_id: string; data: Player }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);

  const handleSearch = async () => {
    if (!search.trim()) {
      setSearchResults([]);
      setSearchDone(false);
      return;
    }
    setSearching(true);
    setSearchDone(false);
    try {
      const results = await searchRobots(search);
      setSearchResults(results);
      setSearchDone(true);
    } catch {
      toast.error("Error al buscar robots");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddPlayer = (result: { robot_id: string; data: Player }) => {
    const added = addPlayer(result.data);
    if (added) {
      toast.success(`${result.data.n || result.robot_id} agregado`);
    }
  };

  const isAdded = (robotId: string) =>
    players.some((p) => p.i === robotId);

  return (
    <div className="rounded-[18px] border border-brand-stroke/20 bg-brand-bg/35 overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-brand-stroke/20 flex flex-col gap-1.5 bg-brand-panel/40">
        <h2 className="text-sm uppercase text-brand-muted tracking-wide m-0">
          Torneo
        </h2>
        <b className="text-lg text-brand-text">
          {tournament.name || "Sin nombre"}
        </b>
      </div>

      <div className="p-4 overflow-y-auto max-h-[70vh] custom-scroll">
        <div className="text-brand-muted/80 text-xs tracking-wide uppercase mb-2.5">
          Datos del torneo
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <div className="sm:col-span-2">
            <label className="block text-xs text-brand-muted/80 mb-1.5">
              Nombre
            </label>
            <input
              value={tournament.name}
              onChange={(e) => setTournament({ name: e.target.value })}
              placeholder="Ej. Copa MiniSumo CDMX 2026"
              className="w-full px-3 py-2.5 rounded-xl border border-brand-stroke/20 bg-brand-bg/35 text-brand-text text-sm outline-none focus:border-brand-neon/35 focus:ring-1 focus:ring-[inset_0_0_0_1px_rgba(122, 63, 255,0.1)] motion-safe:transition-[transform,opacity,background-color,border-color,color,box-shadow,filter] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            />
          </div>

          <div>
            <label className="block text-xs text-brand-muted/80 mb-1.5">
              Categoría
            </label>
            <select
              value={tournament.category}
              onChange={(e) =>
                setTournament({ category: e.target.value })
              }
              className="w-full px-3 py-2.5 rounded-xl border border-brand-stroke/20 bg-brand-bg/35 text-brand-text text-sm outline-none focus:border-brand-neon/35 motion-safe:transition-[transform,opacity,background-color,border-color,color,box-shadow,filter] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none appearance-none cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-brand-muted/80 mb-1.5">
              Sede
            </label>
            <input
              value={tournament.venue}
              onChange={(e) => setTournament({ venue: e.target.value })}
              placeholder="Ej. ESIME Azcapotzalco"
              className="w-full px-3 py-2.5 rounded-xl border border-brand-stroke/20 bg-brand-bg/35 text-brand-text text-sm outline-none focus:border-brand-neon/35 motion-safe:transition-[transform,opacity,background-color,border-color,color,box-shadow,filter] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            />
          </div>

          <div>
            <label className="block text-xs text-brand-muted/80 mb-1.5">
              Fecha
            </label>
            <input
              type="date"
              value={tournament.date}
              onChange={(e) => setTournament({ date: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-brand-stroke/20 bg-brand-bg/35 text-brand-text text-sm outline-none focus:border-brand-neon/35 motion-safe:transition-[transform,opacity,background-color,border-color,color,box-shadow,filter] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            />
          </div>

          <div>
            <label className="block text-xs text-brand-muted/80 mb-1.5">
              Formato
            </label>
            <select
              value={tournament.format}
              onChange={(e) =>
                setTournament({
                  format: e.target.value as "single" | "groups" | "double",
                })
              }
              className="w-full px-3 py-2.5 rounded-xl border border-brand-stroke/20 bg-brand-bg/35 text-brand-text text-sm outline-none focus:border-brand-neon/35 motion-safe:transition-[transform,opacity,background-color,border-color,color,box-shadow,filter] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none appearance-none cursor-pointer"
            >
              <option value="single">
                Eliminación directa (Single)
              </option>
              <option value="groups">Grupos + Eliminación</option>
              <option value="double">
                Doble eliminación (W/L bracket)
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-brand-muted/80 mb-1.5">
              Número de participantes (N)
            </label>
            <input
              type="number"
              min={2}
              value={tournament.n}
              onChange={(e) =>
                setTournament({ n: Math.max(2, parseInt(e.target.value) || 2) })
              }
              className="w-full px-3 py-2.5 rounded-xl border border-brand-stroke/20 bg-brand-bg/35 text-brand-text text-sm outline-none focus:border-brand-neon/35 motion-safe:transition-[transform,opacity,background-color,border-color,color,box-shadow,filter] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            />
          </div>

          {tournament.format === "groups" && (
            <>
              <div>
                <label className="block text-xs text-brand-muted/80 mb-1.5">
                  # Grupos
                </label>
                <input
                  type="number"
                  min={2}
                  value={tournament.groups}
                  onChange={(e) =>
                    setTournament({
                      groups: Math.max(2, parseInt(e.target.value) || 2),
                    })
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-brand-stroke/20 bg-brand-bg/35 text-brand-text text-sm outline-none focus:border-brand-neon/35 motion-safe:transition-[transform,opacity,background-color,border-color,color,box-shadow,filter] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                />
              </div>

              <div>
                <label className="block text-xs text-brand-muted/80 mb-1.5">
                  Avanzan por grupo
                </label>
                <input
                  type="number"
                  min={1}
                  value={tournament.adv}
                  onChange={(e) =>
                    setTournament({
                      adv: Math.max(1, parseInt(e.target.value) || 1),
                    })
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-brand-stroke/20 bg-brand-bg/35 text-brand-text text-sm outline-none focus:border-brand-neon/35 motion-safe:transition-[transform,opacity,background-color,border-color,color,box-shadow,filter] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                />
              </div>
            </>
          )}
        </div>

        <div className="text-brand-muted/80 text-xs tracking-wide uppercase mb-2.5">
          Búsqueda de robots
        </div>
        <div className="flex gap-2 mb-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Ej. MS-014 o KRAKEN o RoboDragons"
            className="flex-1 px-3 py-2.5 rounded-xl border border-brand-stroke/20 bg-brand-bg/35 text-brand-text text-sm outline-none focus:border-brand-neon/35 motion-safe:transition-[transform,opacity,background-color,border-color,color,box-shadow,filter] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="border border-brand-neon/45 bg-linear-to-r from-brand-neon/30 to-brand-neon2/10 shadow-[inset_0_0_0_1px_rgba(122,63,255,0.12)] text-brand-text px-4 py-2 rounded-xl text-sm font-extrabold tracking-wide hover:brightness-110 cursor-pointer motion-safe:transition-[transform,opacity,background-color,border-color,color,box-shadow,filter] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none disabled:opacity-50"
          >
            {searching ? "..." : "Buscar"}
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => {
              setSearch("");
              setSearchResults([]);
              setSearchDone(false);
            }}
            className="border border-brand-stroke/20 bg-brand-panel/40 text-brand-muted px-3 py-1.5 rounded-lg text-xs hover:brightness-110 cursor-pointer motion-safe:transition-[transform,opacity,background-color,border-color,color,box-shadow,filter] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          >
            Limpiar
          </button>
        </div>

        <div className="flex flex-col gap-1.5 mb-4">
          {searchResults.length > 0 ? (
            searchResults.map((r) => {
              const info = robotLabel(r.data);
              const added = isAdded(r.robot_id);
              return (
                <div
                  key={r.robot_id}
                  className="flex justify-between items-center bg-brand-panel/30 px-3 py-2 rounded-lg border border-brand-stroke/15"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-brand-text truncate">
                      {info.name}
                    </div>
                    <div className="text-xs text-brand-muted truncate">
                      {info.sub}
                    </div>
                  </div>
                  <div className="flex gap-1.5 ml-2 flex-shrink-0">
                    <button
                      onClick={() => handleAddPlayer(r)}
                      disabled={added}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer motion-safe:transition-[transform,opacity,background-color,border-color,color,box-shadow,filter] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                        added
                          ? "bg-brand-neon/10 text-brand-muted cursor-default"
                          : "border border-brand-neon/45 bg-brand-neon/20 text-brand-text hover:brightness-110"
                      }`}
                    >
                      {added ? "Agregado" : "Agregar"}
                    </button>
                    <button
                      onClick={() =>
                        (window.location.hash = `#/robots/${r.robot_id}`)
                      }
                      className="border border-brand-stroke/20 bg-brand-panel/40 text-brand-muted px-2.5 py-1 rounded-lg text-xs hover:brightness-110 cursor-pointer motion-safe:transition-[transform,opacity,background-color,border-color,color,box-shadow,filter] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                    >
                      Ver
                    </button>
                  </div>
                </div>
              );
            })
          ) : searchDone ? (
            <div className="text-xs text-brand-muted p-2 text-center">
              Sin resultados
            </div>
          ) : (
            <div className="text-xs text-brand-muted flex items-center gap-1.5 bg-brand-bg/25 p-2 rounded-lg border border-brand-stroke/10">
              <b className="text-[#FFB020]">Tip:</b> Busca robots y agrégalos
              como participantes.
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mb-2.5">
          <div className="text-brand-muted/80 text-xs tracking-wide uppercase">
            Participantes (seeds)
          </div>
          <span className="text-xs font-bold text-brand-text/50">
            {players.length} / {tournament.n}
          </span>
        </div>

        <div className="flex flex-col gap-2 min-h-[100px] bg-brand-bg/20 rounded-xl p-2 border border-brand-stroke/10">
          {players.length === 0 ? (
            <div className="flex items-center justify-center h-full text-brand-muted text-sm py-4">
              Agrega robots desde la búsqueda.
            </div>
          ) : (
            players.map((p, i) => {
              const info = robotLabel(p);
              return (
                <div
                  key={p.i}
                  className="flex justify-between items-center bg-brand-panel/40 px-3 py-2 rounded-lg border border-brand-stroke/20"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-xs font-mono text-brand-muted flex-shrink-0">
                      {i + 1}.
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-brand-text truncate">
                        {info.name}
                      </div>
                      <div className="text-xs text-brand-muted truncate">
                        {info.sub}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2 flex-shrink-0">
                    <button
                      onClick={() => reorderPlayer(p.i!, "up")}
                      disabled={i === 0}
                      className="w-7 h-7 flex items-center justify-center border border-brand-stroke/20 bg-brand-panel/40 text-brand-text rounded-lg text-xs hover:brightness-110 cursor-pointer motion-safe:transition-[transform,opacity,background-color,border-color,color,box-shadow,filter] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none disabled:opacity-30"
                      title="Subir"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => reorderPlayer(p.i!, "down")}
                      disabled={i === players.length - 1}
                      className="w-7 h-7 flex items-center justify-center border border-brand-stroke/20 bg-brand-panel/40 text-brand-text rounded-lg text-xs hover:brightness-110 cursor-pointer motion-safe:transition-[transform,opacity,background-color,border-color,color,box-shadow,filter] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none disabled:opacity-30"
                      title="Bajar"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removePlayer(p.i!)}
                      className="px-2 py-1 border border-brand-hot/25 bg-brand-hot/10 text-brand-hot rounded-lg text-xs font-bold hover:bg-brand-hot/20 cursor-pointer motion-safe:transition-[transform,opacity,background-color,border-color,color,box-shadow,filter] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                      title="Quitar"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {players.length > 0 && (
          <div className="mt-3">
            <button
              onClick={shufflePlayers}
              className="w-full border border-brand-stroke/20 bg-brand-panel/40 text-brand-muted px-3 py-2 rounded-xl text-xs hover:brightness-110 cursor-pointer motion-safe:transition-[transform,opacity,background-color,border-color,color,box-shadow,filter] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            >
              Mezclar orden
            </button>
          </div>
        )}

        <div className="mt-4 text-xs text-brand-muted/60 leading-relaxed bg-brand-bg/25 p-3 rounded-xl border border-brand-stroke/10">
          <b className="text-brand-muted">Nota:</b> N puede ser cualquier
          número. El sistema calcula BYEs automáticamente (nextPow2 - N). BO3:
          se gana con 2 victorias (2/2). Seeds: evita cruzar el mismo equipo
          en primera ronda.
        </div>
      </div>
    </div>
  );
}
