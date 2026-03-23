"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { extractRobotFields } from "@/lib/robotHelpers";
import { SkeletonRobotProfile } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import QRCode from "qrcode";

function InspectionBadge({ estado }: { estado?: string }) {
  const baseClasses = "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide";
  switch (estado) {
    case "aprobado":
      return <span className={`${baseClasses} bg-green-500/20 text-green-400 border border-green-500/30`}>Aprobado</span>;
    case "rechazado":
      return <span className={`${baseClasses} bg-red-500/20 text-red-400 border border-red-500/30`}>Rechazado</span>;
    case "en_revision":
      return <span className={`${baseClasses} bg-yellow-500/20 text-yellow-400 border border-yellow-500/30`}>En Revisión</span>;
    default:
      return <span className={`${baseClasses} bg-brand-muted/20 text-brand-muted border border-brand-muted/30`}>Pendiente</span>;
  }
}

export default function RobotViewerPage() {
  const { id } = useParams();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

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

  const robotData = robot ? extractRobotFields(robot) : null;

  const qrValue =
    robotData?.qr_link ||
    (robotData?.robot_id
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/robots/${robotData.robot_id}`
      : "");

  useEffect(() => {
    let cancelled = false;

    async function buildQr() {
      if (!qrValue) {
        setQrDataUrl(null);
        return;
      }

      try {
        const dataUrl = await QRCode.toDataURL(qrValue, {
          width: 720,
          margin: 2,
          errorCorrectionLevel: "M",
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        });

        if (!cancelled) {
          setQrDataUrl(dataUrl);
        }
      } catch {
        if (!cancelled) {
          setQrDataUrl(null);
        }
      }
    }

    buildQr();

    return () => {
      cancelled = true;
    };
  }, [qrValue]);

  return (
    <section className="bg-linear-to-b from-brand-panel/90 to-brand-panel2/70 border border-brand-stroke/35 shadow-[inset_0_0_0_1px_rgba(122, 63, 255,0.08),0_18px_60px_rgba(0,0,0,0.55)] rounded-[22px] overflow-hidden min-h-[500px]">
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3.5 border-b border-brand-stroke/25">
        <div className="flex flex-col gap-1">
          <Breadcrumbs 
            items={[
              { label: "Robots", href: "/robots/mine" },
              { label: robotData?.nombre || `#${id}` }
            ]} 
          />
          <b className="text-lg tracking-wide text-brand-text">{isLoading ? 'Cargando...' : robotData?.nombre || 'Robot no encontrado'}</b>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/robots/mine" className="border border-brand-neon/25 bg-brand-panel2/55 text-brand-text px-3 py-2 rounded-xl text-sm font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all">
            Mis Robots
          </Link>
        </div>
      </div>
      
      <div className="p-6 md:p-8">
        {isLoading ? (
          <SkeletonRobotProfile />
        ) : error || !robot ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center w-full">
            <b className="text-brand-hot text-xl mb-2">Error 404</b>
            <span className="text-brand-muted">El Robot ID #{id} no fue encontrado o ocurrió un error.</span>
            <Link href="/" className="text-brand-neon font-bold mt-4 hover:underline">Volver al Dashboard</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
             <div className="flex flex-col gap-6">
                <div>
                   <div className="text-brand-muted/80 text-xs tracking-wide uppercase mb-3 text-brand-neon">Datos Principales</div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-brand-bg/40 p-3 rounded-xl border border-brand-stroke/20">
                          <label className="block text-xs text-brand-muted/60 mb-1">Robot ID</label>
                          <span className="font-mono text-xl font-black text-brand-neon">{robotData?.robot_id}</span>
                      </div>
                      <div className="bg-brand-bg/40 p-3 rounded-xl border border-brand-stroke/20">
                          <label className="block text-xs text-brand-muted/60 mb-1">Categoría</label>
                          <span className="font-bold text-brand-text">{robotData?.categoria || 'N/A'}</span>
                      </div>
                      <div className="bg-brand-bg/40 p-3 rounded-xl border border-brand-stroke/20">
                          <label className="block text-xs text-brand-muted/60 mb-1">Equipo</label>
                          <span className="font-bold text-brand-text">{robotData?.equipo || 'N/A'}</span>
                      </div>
                      <div className="bg-brand-bg/40 p-3 rounded-xl border border-brand-stroke/20">
                          <label className="block text-xs text-brand-muted/60 mb-1">Controlador / Piloto</label>
                          <span className="font-bold text-brand-text">{robotData?.controlador || 'N/A'}</span>
                      </div>
                   </div>
                </div>

                <div>
                   <div className="text-brand-muted/80 text-xs tracking-wide uppercase mb-3">Especificaciones</div>
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-brand-bg/25 p-3 rounded-xl border border-brand-stroke/10 text-center">
                          <label className="block text-xs text-brand-muted/60 mb-1">Escuela / Club</label>
                          <span className="font-medium text-brand-text text-sm">{robotData?.escuela || 'N/A'}</span>
                      </div>
                      <div className="bg-brand-bg/25 p-3 rounded-xl border border-brand-stroke/10 text-center">
                          <label className="block text-xs text-brand-muted/60 mb-1">Peso</label>
                          <span className="font-medium text-brand-text text-sm">{robotData?.peso_g ? `${robotData.peso_g}g` : 'N/A'}</span>
                      </div>
                      <div className="bg-brand-bg/25 p-3 rounded-xl border border-brand-stroke/10 text-center">
                          <label className="block text-xs text-brand-muted/60 mb-1">Dimensiones</label>
                          <span className="font-medium text-brand-text text-sm">{robotData?.dimensiones_mm || 'N/A'}</span>
                      </div>
                   </div>
                </div>

                <div>
                   <div className="text-brand-muted/80 text-xs tracking-wide uppercase mb-3">Control y Comunicación</div>
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-brand-bg/25 p-3 rounded-xl border border-brand-stroke/10 text-center">
                          <label className="block text-xs text-brand-muted/60 mb-1">Tipo de Control</label>
                          <span className="font-medium text-brand-text text-sm">{robotData?.tipo_control || 'N/A'}</span>
                      </div>
                      <div className="bg-brand-bg/25 p-3 rounded-xl border border-brand-stroke/10 text-center">
                          <label className="block text-xs text-brand-muted/60 mb-1">Frecuencia / Protocolo</label>
                          <span className="font-medium text-brand-text text-sm">{robotData?.frecuencia_protocolo || 'N/A'}</span>
                      </div>
                      <div className="bg-brand-bg/25 p-3 rounded-xl border border-brand-stroke/10 text-center">
                          <label className="block text-xs text-brand-muted/60 mb-1">Contacto</label>
                          <span className="font-medium text-brand-text text-sm">{robotData?.contacto || 'N/A'}</span>
                      </div>
                   </div>
                </div>

                <div>
                   <div className="flex items-center justify-between mb-3">
                      <div className="text-brand-muted/80 text-xs tracking-wide uppercase">Inspección</div>
                      <InspectionBadge estado={robotData?.inspeccion_estado} />
                   </div>
                   {robotData?.inspeccion_checklist ? (
                      <div className="bg-brand-bg/25 p-4 rounded-xl border border-brand-stroke/10">
                         <label className="block text-xs text-brand-muted/60 mb-2">Notas de Inspección</label>
                         <p className="text-sm text-brand-text/90 leading-relaxed whitespace-pre-wrap">{robotData?.inspeccion_checklist}</p>
                      </div>
                   ) : (
                      <div className="bg-brand-bg/15 p-4 rounded-xl border border-brand-stroke/10 text-center">
                         <span className="text-sm text-brand-muted/60">Sin notas de inspección</span>
                      </div>
                   )}
                </div>
             </div>

             <div className="flex flex-col items-center gap-4">
                 {robotData?.foto_url ? (
                     <div className="w-full rounded-2xl overflow-hidden border border-brand-neon/20 bg-brand-bg/40 aspect-square">
                        <Image
                          src={robotData.foto_url}
                          alt={robotData.nombre}
                          width={1024}
                          height={1024}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                     </div>
                  ) : (
                    <div className="w-full rounded-2xl border border-brand-neon/20 bg-brand-bg/40 aspect-square flex items-center justify-center">
                       <svg className="w-16 h-16 text-brand-muted/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                       </svg>
                    </div>
                 )}
                 <div className="w-full bg-white rounded-2xl p-4 flex flex-col items-center shadow-[0_0_30px_rgba(122,63,255,0.2)]">
                     {qrDataUrl ? (
                      <Image
                        src={qrDataUrl}
                        alt={`QR del robot ${robotData?.robot_id}`}
                        width={180}
                        height={180}
                        className="w-[180px] h-[180px]"
                        unoptimized
                      />
                    ) : (
                      <div className="w-[180px] h-[180px] rounded-xl border border-slate-300 bg-slate-100 flex items-center justify-center text-center px-3 text-slate-600 text-xs">
                        No se pudo generar el QR
                      </div>
                    )}
                 </div>
                 <div className="w-full text-center">
                    <button className="w-full border border-brand-stroke/45 bg-linear-to-r from-brand-stroke/30 to-brand-neon/10 shadow-[inset_0_0_0_1px_rgba(122,63,255,0.12)] text-brand-text px-6 py-3 rounded-xl font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all">
                       Compartir Link
                    </button>
                    <p className="text-brand-muted text-[10px] mt-2 leading-relaxed">
                       Escanea este QR para auditar el robot rápidamente.
                    </p>
                 </div>
             </div>
          </div>
        )}
      </div>
    </section>
  );
}
