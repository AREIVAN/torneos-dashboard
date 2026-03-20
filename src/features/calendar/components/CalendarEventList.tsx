"use client";

import { useEffect, useRef, useState } from "react";
import type { CalendarEvent } from "../api/getEvents";
import {
  evArr,
  evMainCategory,
  evPickDate,
  evFmtDate,
  evFmtCountdown,
  evMatchesQuery,
  evMatchesChip,
} from "../lib/eventUtils";

interface ProcessedRow {
  t: CalendarEvent;
  d: Date;
  ts: number;
}

interface Props {
  events: CalendarEvent[];
  query: string;
  chip: string;
  onSelect: (id: string) => void;
}

export function CalendarEventList({ events, query, chip, onSelect }: Props) {
  const [now, setNow] = useState(() => new Date());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    tickRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  const rows: ProcessedRow[] = events
    .map((t) => {
      const d = evPickDate(t);
      return d ? { t, d, ts: d.getTime() } : null;
    })
    .filter((r): r is ProcessedRow => r !== null)
    .sort((a, b) => a.ts - b.ts);

  const filtered = rows.filter(
    (r) => evMatchesQuery(r.t, query) && evMatchesChip(r.t, chip)
  );

  const upcoming = filtered.filter((r) => r.d >= now);
  const previous = [...filtered.filter((r) => r.d < now)].reverse();

  const renderRow = (r: ProcessedRow, isUpcoming: boolean) => {
    const t = r.t;
    const name = t.name || "Torneo";
    const tz = t.timezone || "";
    const chips = [evMainCategory(t), ...evArr(t.categories)]
      .filter(Boolean)
      .slice(0, 4);
    const dateLine = evFmtDate(r.d, tz);
    const placeLine = [t.city, t.venue].filter(Boolean).join(" · ");
    const countdown = isUpcoming ? evFmtCountdown(r.d.getTime() - now.getTime()) : "";

    // Country flag
    const cc = t.country_code;
    let flag = "";
    if (cc && cc.length === 2) {
      const codePoints = [...cc.toUpperCase()].map(
        (c) => 0x1f1e6 + c.charCodeAt(0) - 65
      );
      flag = String.fromCodePoint(...codePoints);
    }

    return (
      <div
        key={String(t.id)}
        onClick={() => onSelect(String(t.id))}
        className="flex items-start justify-between gap-3 p-3 rounded-2xl border border-brand-stroke/20 bg-brand-bg/25 cursor-pointer hover:border-brand-neon/35 hover:bg-brand-bg/40 transition-all"
      >
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <b className="text-brand-text text-sm font-black">
            {name}{flag ? `, ${flag}` : ""}
            {isUpcoming && (
              <span className="text-brand-muted font-normal text-xs ml-1.5">
                ({countdown})
              </span>
            )}
          </b>
          <span className="text-brand-muted text-xs whitespace-nowrap overflow-hidden text-ellipsis">
            {dateLine}
            {placeLine ? ` · ${placeLine}` : ""}
          </span>
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {chips.map((c, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full text-[11px] border border-brand-neon2/30 bg-brand-bg/35 text-brand-text"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          className="border border-brand-neon/25 bg-brand-panel2/55 text-brand-text px-3 py-1.5 rounded-xl text-xs font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(String(t.id));
          }}
        >
          Ver
        </button>
      </div>
    );
  };

  return (
    <div className="rounded-[18px] border border-brand-stroke/20 bg-brand-bg/35 overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-brand-stroke/20 flex flex-col gap-1 bg-brand-panel/40">
        <h2 className="text-sm uppercase text-brand-muted tracking-wide m-0">
          Próximos
        </h2>
        <b className="text-lg text-brand-text">Con conteo regresivo</b>
      </div>
      <div className="p-3 flex flex-col gap-2 overflow-y-auto max-h-[70vh] custom-scroll">
        {upcoming.length > 0 ? (
          upcoming.map((r) => renderRow(r, true))
        ) : (
          <div className="flex items-center justify-center p-6 text-brand-muted text-sm">
            Sin torneos próximos
          </div>
        )}

        <div className="text-brand-muted/80 text-xs tracking-wide uppercase mt-4 mb-1">
          Anteriores
        </div>
        {previous.length > 0 ? (
          previous.slice(0, 140).map((r) => renderRow(r, false))
        ) : (
          <div className="flex items-center justify-center p-4 text-brand-muted text-sm">
            Sin torneos anteriores
          </div>
        )}

        <div className="text-xs text-brand-muted flex items-center gap-1.5 mt-3 bg-brand-bg/25 p-2.5 rounded-lg border border-brand-stroke/10">
          <b className="text-[#FFB020]">Tip:</b> Si quieres notificaciones
          reales aunque cierres la pestaña, luego metemos PWA + Service Worker.
        </div>
      </div>
    </div>
  );
}
