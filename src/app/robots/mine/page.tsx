"use client";

import Link from "next/link";
import { useRobotStore } from "@/store/useRobotStore";
import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase/client';
import { extractRobotFields } from '@/lib/robotHelpers';
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";

export default function MisRobotsPage() {
  const mineIds = useRobotStore((state) => state.mineIds);
  const clearMine = useRobotStore((state) => state.clearMine);

  const { data: myRobots, isLoading } = useQuery({
    queryKey: ['my-robots', mineIds],
    queryFn: async () => {
      if (mineIds.length === 0) return [];
      const { data, error } = await getSupabaseClient()
        .from('robot_cards')
        .select('*')
        .in('robot_id', mineIds);
      if (error) throw error;
      return data;
    },
    enabled: mineIds.length > 0
  });

  return (
    <section className="bg-linear-to-b from-brand-panel/90 to-brand-panel2/70 border border-brand-stroke/35 shadow-[inset_0_0_0_1px_rgba(122, 63, 255,0.08),0_18px_60px_rgba(0,0,0,0.55)] rounded-[22px] overflow-hidden min-h-[500px]">
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3.5 border-b border-brand-stroke/25">
        <div className="flex flex-col gap-1">
          <Breadcrumbs items={[{ label: "Mis Robots" }]} />
          <b className="text-lg tracking-wide text-brand-text">Mis Robots</b>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button onClick={() => { if(confirm("¿Estás seguro de limpiar la lista local? No se borrarán de la base de datos.")) clearMine() }} className="border border-brand-hot/25 bg-brand-hot/10 text-brand-hot px-3 py-2 rounded-xl text-sm font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all">
            Limpiar Lista
          </button>
        </div>
      </div>
      
      <div className="p-4">
        {mineIds.length === 0 ? (
          <div className="border border-dashed border-brand-stroke/40 rounded-[22px] bg-brand-bg/20">
            <EmptyState
              icon="robot"
              title="Sin robots registrados"
              description="Aún no has registrado ningún robot desde este navegador."
              action={{ label: "Registrar mi primer robot", href: "/robots/new" }}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
             {isLoading ? (
               <div className="animate-pulse bg-brand-bg/25 rounded-[18px] min-h-[140px] w-full border border-brand-neon/20"></div>
             ) : (
                myRobots?.map((robot: { robot_id: string; [key: string]: unknown }) => {
                 const rd = extractRobotFields(robot);
                 return (
                 <Link href={`/robots/${robot.robot_id}`} key={robot.robot_id} className="block rounded-[18px] border border-brand-neon/20 bg-brand-bg/25 p-4 cursor-pointer transition-all hover:brightness-110 hover:-translate-y-px">
                   <div className="flex justify-between items-start mb-2">
                       <h3 className="text-lg font-black text-brand-text m-0">{rd.nombre || 'Sin nombre'}</h3>
                       <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-brand-neon/20 text-brand-text border border-brand-neon/40">#{robot.robot_id}</span>
                   </div>
                   <div className="text-brand-muted text-sm space-y-1">
                     <p><b>Cat:</b> {rd.categoria || 'N/A'}</p>
                     <p><b>Equipo:</b> {rd.equipo || 'N/A'}</p>
                     <p><b>Piloto:</b> {rd.controlador || 'N/A'}</p>
                   </div>
                 </Link>
                 );
               })
             )}
          </div>
        )}
      </div>
    </section>
  );
}
