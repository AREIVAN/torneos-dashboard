"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export default function TorneosPage() {
  const [format, setFormat] = useState("single");
  const [participants, setParticipants] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const handleSearch = () => {
    toast.info("Buscando robot en la base de datos...");
    // Mocking finding a robot
    if (search.trim()) {
      setParticipants([...participants, { id: Math.floor(Math.random() * 9000) + 1000, name: search }]);
      setSearch("");
    }
  };

  return (
    <section className="bg-linear-to-b from-brand-panel/90 to-brand-panel2/70 border border-brand-stroke/35 shadow-[inset_0_0_0_1px_rgba(122, 63, 255,0.08),0_18px_60px_rgba(0,0,0,0.55)] rounded-[22px] overflow-hidden min-h-[500px]">
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3.5 border-b border-brand-stroke/25">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-sm tracking-wide uppercase text-brand-muted">Panel organizador</h2>
          <b className="text-lg tracking-wide text-brand-text">Crear torneo · inscripciones · llaves</b>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/" className="border border-brand-neon/25 bg-brand-panel2/55 text-brand-text px-3 py-2 rounded-xl text-sm font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all">
            Volver
          </Link>
          <button className="border border-brand-neon/25 bg-brand-panel2/55 text-brand-text px-3 py-2 rounded-xl text-sm font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all">
            Nuevo
          </button>
          <button className="border border-brand-neon/45 bg-linear-to-r from-brand-neon/30 to-brand-neon2/10 shadow-[inset_0_0_0_1px_rgba(122,63,255,0.12)] text-brand-text px-3 py-2 rounded-xl text-sm font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all">
            Guardar local
          </button>
          <button className="border border-brand-neon/25 bg-brand-panel2/55 text-brand-text px-3 py-2 rounded-xl text-sm font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all">
            Abrir local
          </button>
        </div>
      </div>
      
      <div className="p-4 grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4">
          
        {/* LEFT PANEL */}
        <div className="rounded-[18px] border border-brand-stroke/20 bg-brand-bg/35 overflow-hidden flex flex-col">
           <div className="px-4 py-3 border-b border-brand-stroke/20 flex flex-col gap-1.5 bg-brand-panel/40">
               <h2 className="text-sm uppercase text-brand-muted tracking-wide m-0">Torneo</h2>
               <b className="text-lg text-brand-text">Sin nombre</b>
           </div>
           
           <div className="p-4 overflow-y-auto max-h-[70vh] custom-scroll">
               <div className="text-brand-muted/80 text-xs tracking-wide uppercase mb-2.5">Datos del torneo</div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  <div>
                      <label className="block text-xs text-brand-muted/80 mb-1.5">Nombre</label>
                      <input placeholder="Ej. Copa MiniSumo CDMX 2026" className="w-full px-3 py-2.5 rounded-xl border border-brand-stroke/20 bg-brand-bg/35 text-brand-text text-sm outline-none focus:border-brand-neon/35 focus:ring-1 focus:ring-[inset_0_0_0_1px_rgba(122, 63, 255,0.1)] transition-all" />
                  </div>
                  <div>
                      <label className="block text-xs text-brand-muted/80 mb-1.5">Categoría</label>
                      <select className="w-full px-3 py-2.5 rounded-xl border border-brand-stroke/20 bg-brand-bg/35 text-brand-text text-sm outline-none focus:border-brand-neon/35 transition-all appearance-none cursor-pointer">
                          <option>Mini Sumo Autónomo Profesional</option>
                          <option>Mini Sumo RC Profesional</option>
                          <option>Sumo 3kg</option>
                          <option>Mini Sumo RC Amateur</option>
                      </select>
                  </div>
                  <div>
                      <label className="block text-xs text-brand-muted/80 mb-1.5">Sede</label>
                      <input placeholder="Ej. ESIME Azcapotzalco" className="w-full px-3 py-2.5 rounded-xl border border-brand-stroke/20 bg-brand-bg/35 text-brand-text text-sm outline-none focus:border-brand-neon/35 transition-all" />
                  </div>
                  <div>
                      <label className="block text-xs text-brand-muted/80 mb-1.5">Fecha</label>
                      <input type="date" className="w-full px-3 py-2.5 rounded-xl border border-brand-stroke/20 bg-brand-bg/35 text-brand-text text-sm outline-none focus:border-brand-neon/35 transition-all" />
                  </div>
                  <div className="sm:col-span-2">
                       <label className="block text-xs text-brand-muted/80 mb-1.5">Formato</label>
                       <select value={format} onChange={(e) => setFormat(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-brand-stroke/20 bg-brand-bg/35 text-brand-text text-sm outline-none focus:border-brand-neon/35 transition-all appearance-none cursor-pointer">
                          <option value="single">Eliminación directa (Single)</option>
                          <option value="groups">Grupos + Eliminación</option>
                          <option value="double">Doble eliminación (W/L bracket)</option>
                      </select>
                  </div>
               </div>

                <div className="text-brand-muted/80 text-xs tracking-wide uppercase mb-2.5">Búsqueda de robots</div>
                 <div className="flex gap-2 mb-2">
                      <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="Ej. MS-014 o KRAKEN" className="flex-1 px-3 py-2.5 rounded-xl border border-brand-stroke/20 bg-brand-bg/35 text-brand-text text-sm outline-none focus:border-brand-neon/35 transition-all" />
                      <button onClick={handleSearch} className="border border-brand-neon/45 bg-linear-to-r from-brand-neon/30 to-brand-neon2/10 shadow-[inset_0_0_0_1px_rgba(122,63,255,0.12)] text-brand-text px-4 py-2 rounded-xl text-sm font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all">
                         Buscar
                      </button>
                  </div>
                  <div className="text-xs text-brand-muted flex items-center gap-1.5 mb-6 bg-brand-bg/25 p-2 rounded-lg border border-brand-stroke/10"><b className="text-[#FFB020]">Tip:</b> Busca robots y agrégalos como participantes.</div>

                  <div className="flex justify-between items-center mb-2.5">
                      <div className="text-brand-muted/80 text-xs tracking-wide uppercase">Participantes (seeds)</div>
                      <span className="text-xs font-bold text-brand-text/50">{participants.length} inscritos</span>
                  </div>
                  
                  <div className="flex flex-col gap-2 min-h-[100px] bg-brand-bg/20 rounded-xl p-2 border border-brand-stroke/10">
                      {participants.length === 0 ? (
                          <div className="flex items-center justify-center h-full text-brand-muted text-sm py-4">Agrega robots desde la búsqueda.</div>
                      ) : (
                          participants.map((p, i) => (
                              <div key={i} className="flex justify-between items-center bg-brand-panel/40 px-3 py-2 rounded-lg border border-brand-stroke/20">
                                  <span className="text-sm font-bold text-brand-text">{p.name} <span className="text-xs font-mono text-brand-muted ml-1">#{p.id}</span></span>
                                  <button onClick={() => setParticipants(participants.filter((_, idx) => idx !== i))} className="text-brand-hot hover:text-white transition-colors text-xs font-bold px-2 py-1 bg-brand-hot/10 rounded cursor-pointer">X</button>
                              </div>
                          ))
                      )}
                  </div>
           </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="rounded-[18px] border border-brand-stroke/20 bg-brand-bg/35 overflow-hidden flex flex-col">
             <div className="px-4 py-3 border-b border-brand-stroke/20 flex flex-wrap items-center justify-between gap-3 bg-brand-panel/40">
               <div className="flex flex-col gap-1">
                   <h2 className="text-sm uppercase text-brand-muted tracking-wide m-0">Vista</h2>
                   <b className="text-lg text-brand-text">{format === 'groups' ? 'Llaves / grupos' : 'Bracket Principal'}</b>
               </div>
               <div className="flex flex-wrap gap-2">
                  <button className="border border-brand-neon/45 bg-linear-to-r from-brand-neon/30 to-brand-neon2/10 shadow-[inset_0_0_0_1px_rgba(122,63,255,0.12)] text-brand-text px-3 py-1.5 rounded-xl text-xs font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all">
                    Generar
                  </button>
                  <button className="border border-brand-neon/25 bg-brand-panel2/55 text-brand-text px-3 py-1.5 rounded-xl text-xs font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all">
                    Mezclar seeds
                  </button>
                  <button className="border border-brand-hot/25 bg-brand-hot/10 text-brand-hot px-3 py-1.5 rounded-xl text-xs font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all">
                    Limpiar
                  </button>
               </div>
           </div>

           <div className="p-4 flex-1 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,rgba(122, 63, 255,0.03)_0%,transparent_70%)] relative">
               
               {/* BRACKET PLACEHOLDER */}
               {participants.length < 2 ? (
                    <div className="flex flex-col items-center text-center max-w-[300px] opacity-60">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-git-merge text-brand-neon mb-4"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>
                        <b className="text-brand-text mb-1">Brackets Vacíos</b>
                        <p className="text-brand-muted text-sm">Añade al menos 2 competidores y haz clic en "Generar" para construir el árbol del torneo.</p>
                    </div>
               ) : (
                    <div className="w-full flex-1 border-2 border-dashed border-brand-neon/20 rounded-xl flex items-center justify-center p-8 overflow-hidden relative group cursor-pointer hover:border-brand-neon/40 transition-colors">
                        <div className="flex items-center gap-8">
                            <div className="flex flex-col gap-4">
                                <div className="px-4 py-2 bg-brand-panel rounded-lg border border-brand-stroke/30 text-sm font-bold text-brand-text">{participants[0]?.name || 'Seed 1'}</div>
                                <div className="px-4 py-2 bg-brand-panel rounded-lg border border-brand-stroke/30 text-sm font-bold text-brand-text">{participants[1]?.name || 'Seed 2'}</div>
                            </div>
                            <div className="w-[40px] border-t-2 border-r-2 border-b-2 h-[52px] border-brand-neon/50 rounded-r-lg relative -left-4"></div>
                            <div className="px-4 py-2 bg-brand-neon/20 rounded-lg border border-brand-neon text-sm font-black shadow-[0_0_15px_rgba(122, 63, 255,0.3)] text-white">Ganador</div>
                        </div>
                    </div>
               )}

           </div>
        </div>

      </div>
    </section>
  );
}
