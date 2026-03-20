"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function RobotViewerPage() {
  const { id } = useParams();

  const { data: robot, isLoading, error } = useQuery({
    queryKey: ['robot', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('robot_cards')
        .select('*')
        .eq('robot_id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  return (
    <section className="bg-linear-to-b from-brand-panel/90 to-brand-panel2/70 border border-brand-stroke/35 shadow-[inset_0_0_0_1px_rgba(122, 63, 255,0.08),0_18px_60px_rgba(0,0,0,0.55)] rounded-[22px] overflow-hidden min-h-[500px]">
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3.5 border-b border-brand-stroke/25">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-sm tracking-wide uppercase text-brand-muted">Identificación y datos técnicos</h2>
          <b className="text-lg tracking-wide text-brand-text">{isLoading ? 'Cargando...' : robot?.robot_nombre || 'Robot no encontrado'}</b>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/" className="border border-brand-neon/25 bg-brand-panel2/55 text-brand-text px-3 py-2 rounded-xl text-sm font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all">
            Dashboard
          </Link>
          <Link href="/robots/mine" className="border border-brand-neon/25 bg-brand-panel2/55 text-brand-text px-3 py-2 rounded-xl text-sm font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all">
            Mis Robots
          </Link>
        </div>
      </div>
      
      <div className="p-6 md:p-8">
        {isLoading ? (
          <div className="animate-pulse bg-brand-bg/25 rounded-xl h-[300px] w-full border border-brand-neon/20"></div>
        ) : error || !robot ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center w-full">
            <b className="text-brand-hot text-xl mb-2">Error 404</b>
            <span className="text-brand-muted">El Robot ID #{id} no fue encontrado o ocurrió un error.</span>
            <Link href="/" className="text-brand-neon font-bold mt-4 hover:underline">Volver al Dashboard</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-8">
             <div className="flex flex-col gap-6">
                <div>
                   <div className="text-brand-muted/80 text-xs tracking-wide uppercase mb-3 text-brand-neon">Metadata Principal</div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-brand-bg/40 p-3 rounded-xl border border-brand-stroke/20">
                          <label className="block text-xs text-brand-muted/60 mb-1">Robot ID</label>
                          <span className="font-mono text-xl font-black text-brand-neon">{robot.robot_id}</span>
                      </div>
                      <div className="bg-brand-bg/40 p-3 rounded-xl border border-brand-stroke/20">
                          <label className="block text-xs text-brand-muted/60 mb-1">Categoría</label>
                          <span className="font-bold text-brand-text">{robot.categoria}</span>
                      </div>
                      <div className="bg-brand-bg/40 p-3 rounded-xl border border-brand-stroke/20">
                          <label className="block text-xs text-brand-muted/60 mb-1">Equipo</label>
                          <span className="font-bold text-brand-text">{robot.equipo}</span>
                      </div>
                      <div className="bg-brand-bg/40 p-3 rounded-xl border border-brand-stroke/20">
                          <label className="block text-xs text-brand-muted/60 mb-1">Controlador</label>
                          <span className="font-bold text-brand-text">{robot.controlador}</span>
                      </div>
                   </div>
                </div>

                <div>
                   <div className="text-brand-muted/80 text-xs tracking-wide uppercase mb-3">Especificaciones (Opcionales)</div>
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-brand-bg/25 p-3 rounded-xl border border-brand-stroke/10 text-center">
                          <label className="block text-xs text-brand-muted/60 mb-1">Escuela / Club</label>
                          <span className="font-medium text-brand-text text-sm">{robot.escuela || 'N/A'}</span>
                      </div>
                      <div className="bg-brand-bg/25 p-3 rounded-xl border border-brand-stroke/10 text-center">
                          <label className="block text-xs text-brand-muted/60 mb-1">Peso (g)</label>
                          <span className="font-medium text-brand-text text-sm">{robot.peso_g || 'N/A'}</span>
                      </div>
                      <div className="bg-brand-bg/25 p-3 rounded-xl border border-brand-stroke/10 text-center">
                          <label className="block text-xs text-brand-muted/60 mb-1">Dimensiones</label>
                          <span className="font-medium text-brand-text text-sm">{robot.dimensiones_mm || 'N/A'}</span>
                      </div>
                   </div>
                </div>
             </div>

             <div className="flex flex-col items-center">
                 <div className="w-[240px] h-[240px] bg-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(122,63,255,0.2)]">
                     {/* Placeholder for real QR, just rendering SVG borders for now */}
                     <svg width="200" height="200" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="100" height="100" fill="white"/>
                        <path d="M10 10H40V40H10V10ZM20 20V30H30V20H20Z" fill="black"/>
                        <path d="M60 10H90V40H60V10ZM70 20V30H80V20H70Z" fill="black"/>
                        <path d="M10 60H40V90H10V60ZM20 70V80H30V70H20Z" fill="black"/>
                        <path d="M50 10H55V20H50V10ZM55 20H60V40H55V20ZM45 45H55V55H45V45ZM10 45H40V55H10V45ZM60 45H90V55H60V45ZM40 60H60V90H40V60ZM60 60H90V70H60V60ZM60 80H90V90H60V80Z" fill="black"/>
                        <rect x="70" y="70" width="10" height="10" fill="black"/>
                     </svg>
                 </div>
                 <div className="mt-6 text-center">
                    <button className="border border-brand-stroke/45 bg-linear-to-r from-brand-stroke/30 to-brand-neon/10 shadow-[inset_0_0_0_1px_rgba(122,63,255,0.12)] text-brand-text px-6 py-3 rounded-xl font-extrabold tracking-wide hover:brightness-110 cursor-pointer w-full transition-all">
                       Compartir Link
                    </button>
                    <p className="text-brand-muted text-[10px] mt-2 max-w-[200px] leading-relaxed">
                       Escanea este QR desde cualquier dispositivo para auditar el robot rápidamente.
                    </p>
                 </div>
             </div>
          </div>
        )}
      </div>
    </section>
  );
}
