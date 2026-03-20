"use client";

import Link from "next/link";
import { useState } from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import 'react-day-picker/dist/style.css';

export default function CalendarPage() {
  const [selected, setSelected] = useState<Date>();

  return (
    <section className="bg-linear-to-b from-brand-panel/90 to-brand-panel2/70 border border-brand-stroke/35 shadow-[inset_0_0_0_1px_rgba(122, 63, 255,0.08),0_18px_60px_rgba(0,0,0,0.55)] rounded-[22px] overflow-hidden min-h-[500px]">
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3.5 border-b border-brand-stroke/25">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-sm tracking-wide uppercase text-brand-muted">Próximos Eventos</h2>
          <b className="text-lg tracking-wide text-brand-text">Calendario</b>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/" className="border border-brand-neon/25 bg-brand-panel2/55 text-brand-text px-3 py-2 rounded-xl font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all">
            Volver
          </Link>
        </div>
      </div>
      <div className="p-6 flex flex-col md:flex-row items-start gap-8 justify-center min-h-[400px]">
          <div className="rounded-[18px] border border-brand-neon/25 bg-brand-bg/35 p-2 calendar-container">
             <DayPicker
                mode="single"
                selected={selected}
                onSelect={setSelected}
                locale={es}
             />
          </div>
          <div className="flex-1 max-w-[400px]">
              <h3 className="text-xl font-black mb-2 text-brand-text">
                  {selected ? format(selected, "PPP", { locale: es }) : "Selecciona una fecha"}
              </h3>
              {selected ? (
                  <p className="text-brand-muted text-sm mt-2 p-4 bg-brand-bg/25 rounded-xl border border-brand-stroke/20">
                     No hay eventos programados para esta fecha.
                  </p>
              ) : (
                  <p className="text-brand-muted text-sm mt-2">
                     Revisa los torneos futuros en el calendario oficial de eventos de MiniSumo.
                  </p>
              )}
          </div>
      </div>
      <style jsx global>{`
        .calendar-container .rdp-day_selected {
            background-color: var(--color-brand-neon);
            color: #000;
            font-weight: bold;
        }
        .calendar-container .rdp-day:hover:not(.rdp-day_selected) {
            background-color: var(--color-brand-neon2);
            color: #fff;
        }
      `}</style>
    </section>
  );
}
