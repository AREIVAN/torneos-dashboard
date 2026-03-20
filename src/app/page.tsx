"use client";

import Link from "next/link";
import { DashboardStats } from "@/features/dashboard/components/DashboardStats";
import { LatestRobots } from "@/features/dashboard/components/LatestRobots";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [searchId, setSearchId] = useState("");

  const handleSearch = () => {
    if (searchId.trim()) {
      router.push(`/robots/${searchId.trim()}`);
    }
  };

  return (
    <section className="bg-linear-to-b from-brand-panel/90 to-brand-panel2/70 border border-brand-stroke/35 shadow-[inset_0_0_0_1px_rgba(122, 63, 255,0.08),0_18px_60px_rgba(0,0,0,0.55)] rounded-[22px] overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3.5 border-b border-brand-stroke/25">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-sm tracking-wide uppercase text-brand-muted">Pantalla principal</h2>
          <b className="text-lg tracking-wide text-brand-text">MiniSumo Robot Dashboard</b>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/robots/new" className="border border-brand-stroke/45 bg-linear-to-r from-brand-stroke/30 to-brand-neon2/10 shadow-[inset_0_0_0_1px_rgba(122,63,255,0.12)] text-brand-text px-3 py-2 rounded-xl font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all">
            Registrar Robot
          </Link>
          <Link href="/robots/mine" className="border border-brand-neon/25 bg-brand-panel2/55 text-brand-text px-3 py-2 rounded-xl font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all">
            Mis Robots
          </Link>
          <Link href="/torneos" className="border border-brand-neon/25 bg-brand-panel2/55 text-brand-text px-3 py-2 rounded-xl font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all">
            Torneos
          </Link>
          <Link href="/teams" className="border border-brand-neon/25 bg-brand-panel2/55 text-brand-text px-3 py-2 rounded-xl font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all">
            Teams
          </Link>
          <button className="border border-brand-hot/45 bg-brand-hot/10 text-brand-text px-3 py-2 rounded-xl font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all">
            Actualizar
          </button>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link href="/" className="rounded-[18px] border border-brand-neon/20 bg-[radial-gradient(700px_220px_at_0%_0%,rgba(122, 63, 255,0.10),transparent_55%),radial-gradient(700px_220px_at_100%_0%,rgba(255,46,136,0.08),transparent_55%),rgba(7,10,16,0.25)] p-4 cursor-pointer transition-all hover:brightness-110 hover:-translate-y-px min-h-[110px] block">
            <div className="px-2.5 py-1.5 rounded-full text-[12px] border border-brand-neon2/55 bg-brand-bg/35 text-brand-text">Inicio</div>
            <b className="text-lg block mt-1.5">Dashboard</b>
            <div className="text-brand-muted text-xs mt-2 leading-relaxed">Estadísticas, búsqueda rápida y últimos robots.</div>
          </Link>
          
          <Link href="/robots/new" className="rounded-[18px] border border-brand-neon/20 bg-[radial-gradient(700px_220px_at_0%_0%,rgba(122, 63, 255,0.10),transparent_55%),radial-gradient(700px_220px_at_100%_0%,rgba(255,46,136,0.08),transparent_55%),rgba(7,10,16,0.25)] p-4 cursor-pointer transition-all hover:brightness-110 hover:-translate-y-px min-h-[110px] block">
             <div className="px-2.5 py-1.5 rounded-full text-[12px] border border-[#FFB020]/55 bg-brand-bg/35 text-brand-text">Nuevo</div>
            <b className="text-lg block mt-1.5">Registrar Robot</b>
            <div className="text-brand-muted text-xs mt-2 leading-relaxed">Usa tu generador actual (offline o link) y guarda en la base de datos.</div>
          </Link>

          <Link href="/robots/mine" className="rounded-[18px] border border-brand-neon/20 bg-[radial-gradient(700px_220px_at_0%_0%,rgba(122, 63, 255,0.10),transparent_55%),radial-gradient(700px_220px_at_100%_0%,rgba(255,46,136,0.08),transparent_55%),rgba(7,10,16,0.25)] p-4 cursor-pointer transition-all hover:brightness-110 hover:-translate-y-px min-h-[110px] block">
            <div className="px-2.5 py-1.5 rounded-full text-[12px] border border-brand-neon/28 bg-brand-bg/35 text-brand-muted">Lista</div>
            <b className="text-lg block mt-1.5">Mis Robots</b>
            <div className="text-brand-muted text-xs mt-2 leading-relaxed">Robots que tú registraste desde este navegador (sin login).</div>
          </Link>

          <Link href="/torneos" className="rounded-[18px] border border-brand-neon/20 bg-[radial-gradient(700px_220px_at_0%_0%,rgba(122,63,255,0.10),transparent_55%),radial-gradient(700px_220px_at_100%_0%,rgba(122, 63, 255,0.08),transparent_55%),rgba(7,10,16,0.25)] p-4 cursor-pointer transition-all hover:brightness-110 hover:-translate-y-px min-h-[110px] block">
            <div className="px-2.5 py-1.5 rounded-full text-[12px] border border-brand-hot/55 bg-brand-bg/35 text-brand-text">Torneo</div>
            <b className="text-lg block mt-1.5">Torneos</b>
            <div className="text-brand-muted text-xs mt-2 leading-relaxed">Gestión de torneos: crear llaves, inscripción de robots y brackets.</div>
          </Link>

          <Link href="/calendar" className="rounded-[18px] border border-[#FFB020]/20 bg-[radial-gradient(700px_220px_at_0%_0%,rgba(255,176,32,0.10),transparent_55%),radial-gradient(700px_220px_at_100%_0%,rgba(255,46,136,0.08),transparent_55%),rgba(7,10,16,0.25)] p-4 cursor-pointer transition-all hover:brightness-110 hover:-translate-y-px min-h-[110px] block">
            <div className="px-2.5 py-1.5 rounded-full text-[12px] border border-brand-neon2/55 bg-brand-bg/35 text-brand-text">Calendario</div>
            <b className="text-lg block mt-1.5">Calendario de torneos</b>
            <div className="text-brand-muted text-xs mt-2 leading-relaxed">Ver torneos próximos y anteriores con conteo regresivo y detalles.</div>
            <div className="mt-3">
              <span className="border border-brand-neon/45 bg-linear-to-r from-brand-neon/28 to-brand-neon2/10 shadow-[inset_0_0_0_1px_rgba(122,63,255,0.12)] text-brand-text px-3 py-2.5 rounded-xl font-extrabold tracking-wide text-sm w-full block text-center">Abrir calendario</span>
            </div>
          </Link>

          <Link href="/teams" className="rounded-[18px] border border-brand-neon/20 bg-[radial-gradient(700px_220px_at_0%_0%,rgba(122, 63, 255,0.10),transparent_55%),radial-gradient(700px_220px_at_100%_0%,rgba(122,63,255,0.08),transparent_55%),rgba(7,10,16,0.25)] p-4 cursor-pointer transition-all hover:brightness-110 hover:-translate-y-px min-h-[110px] block">
            <div className="px-2.5 py-1.5 rounded-full text-[12px] border border-brand-neon/28 bg-brand-bg/35 text-brand-muted">Equipos</div>
            <b className="text-lg block mt-1.5">Equipos</b>
            <div className="text-brand-muted text-xs mt-2 leading-relaxed">Explora equipos y sus robots registrados. (Escuela + nombre de equipo)</div>
            <div className="mt-3">
              <span className="border border-brand-neon2/25 bg-brand-panel2/55 text-brand-text px-3 py-2.5 rounded-xl font-extrabold tracking-wide text-sm w-full block text-center">Ver equipos</span>
            </div>
          </Link>
        </div>

        <div className="text-brand-muted/80 text-xs tracking-wide uppercase mt-3 mb-1">Estadísticas</div>
        <DashboardStats />

        <div className="text-brand-muted/80 text-xs tracking-wide uppercase mt-3 mb-1">Buscar robot (por Robot ID)</div>
        <div className="flex gap-2.5 px-3 py-3 rounded-[18px] border border-brand-neon/20 bg-brand-bg/25 items-center">
            <input 
               value={searchId}
               onChange={(e) => setSearchId(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
               placeholder="Ej. 014" 
               className="flex-1 px-3 py-2.5 rounded-xl border border-brand-neon/20 bg-brand-bg/35 text-brand-text outline-none focus:border-brand-neon/35 focus:ring-1 focus:ring-[inset_0_0_0_1px_rgba(122, 63, 255,0.1)] transition-all" 
            />
            <button onClick={handleSearch} className="border border-brand-stroke/45 bg-linear-to-r from-brand-stroke/30 to-brand-neon/10 shadow-[inset_0_0_0_1px_rgba(122,63,255,0.12)] text-brand-text px-4 py-2.5 rounded-xl font-extrabold tracking-wide hover:brightness-110 cursor-pointer">
               Abrir
            </button>
        </div>

        <div className="text-brand-muted/80 text-xs tracking-wide uppercase mt-5 mb-1">Últimos robots</div>
        <LatestRobots />

      </div>
    </section>
  );
}
