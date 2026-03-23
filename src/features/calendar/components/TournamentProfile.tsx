"use client";

import Image from "next/image";
import type { CalendarEvent } from "../api/getEvents";
import {
  evAllChips,
  evFmtDate,
  evMapsLink,
} from "../lib/eventUtils";

interface Props {
  event: CalendarEvent | null;
}

export function TournamentProfile({ event }: Props) {
  if (!event) {
    return (
      <div className="rounded-[18px] border border-brand-stroke/20 bg-brand-bg/35 overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-brand-stroke/20 flex flex-col gap-1 bg-brand-panel/40">
          <h2 className="text-sm uppercase text-brand-muted tracking-wide m-0">
            Perfil del torneo
          </h2>
          <b className="text-lg text-brand-text">Selecciona un torneo</b>
        </div>
        <div className="p-6 flex items-center justify-center text-brand-muted text-sm">
          Haz clic en &quot;Ver&quot; en un torneo para ver sus detalles aquí.
        </div>
      </div>
    );
  }

  const t = event;
  const tz = t.timezone || "";
  const d = t.start_at ? new Date(t.start_at) : null;
  const chipList = evAllChips(t).slice(0, 12);
  const poster = t.poster_url || "";

  // KV pairs
  const kv: [string, string][] = [];
  if (d) kv.push(["Fecha/Hora", evFmtDate(d, tz)]);
  if (t.end_at)
    kv.push(["Fin", evFmtDate(new Date(t.end_at), tz)]);
  if (t.venue) kv.push(["Sede", t.venue]);
  if (t.city) kv.push(["Ciudad", t.city]);
  if (t.address) kv.push(["Dirección", t.address]);
  if (t.contact_email) kv.push(["Email", t.contact_email]);
  if (t.contact_phone) kv.push(["Teléfono", t.contact_phone]);
  if (t.fee != null && String(t.fee).trim() !== "")
    kv.push(["Costo", String(t.fee)]);

  // Actions
  const maps = evMapsLink(t);

  return (
    <div className="rounded-[18px] border border-brand-stroke/20 bg-brand-bg/35 overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-brand-stroke/20 bg-brand-panel/40">
        <h2 className="text-sm uppercase text-brand-muted tracking-wide m-0">
          Perfil del torneo
        </h2>
        <b className="text-lg text-brand-text block mt-0.5">
          {t.name || "Torneo"}
        </b>
        {chipList.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {chipList.map((c, i) => (
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

      <div className="p-3 flex flex-col gap-3 overflow-y-auto max-h-[70vh] custom-scroll">
        {/* Poster */}
        <div className="rounded-xl border border-brand-stroke/20 bg-brand-bg/25 min-h-[180px] flex items-center justify-center overflow-hidden">
          {poster ? (
            <Image
              src={poster}
              alt="Poster"
              width={1200}
              height={900}
              className="w-full h-auto object-contain max-h-[300px]"
              unoptimized
            />
          ) : (
            <span className="text-brand-muted text-sm">Poster</span>
          )}
        </div>

        {/* KV Details */}
        {kv.length > 0 && (
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {kv.map(([k, v]) => (
              <div key={k} className="contents">
                <span className="text-brand-muted font-medium">{k}</span>
                <span className="text-brand-text font-bold">{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mt-1">
          {t.official_url && (
            <a
              href={t.official_url}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-brand-neon/45 bg-linear-to-r from-brand-neon/28 to-brand-neon2/10 shadow-[inset_0_0_0_1px_rgba(122,63,255,0.12)] text-brand-text px-3 py-2 rounded-xl text-sm font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all"
            >
              Página oficial
            </a>
          )}
          {t.registration_url && (
            <a
              href={t.registration_url}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-brand-neon/25 bg-brand-panel2/55 text-brand-text px-3 py-2 rounded-xl text-sm font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all"
            >
              Registro
            </a>
          )}
          {t.rules_url && (
            <a
              href={t.rules_url}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-brand-neon/25 bg-brand-panel2/55 text-brand-text px-3 py-2 rounded-xl text-sm font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all"
            >
              Reglas
            </a>
          )}
          {maps && (
            <a
              href={maps}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-brand-neon/25 bg-brand-panel2/55 text-brand-text px-3 py-2 rounded-xl text-sm font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all"
            >
              Abrir en Maps
            </a>
          )}
        </div>

        {/* Description */}
        {t.description && (
          <>
            <div className="text-brand-muted/80 text-xs tracking-wide uppercase mt-2">
              Descripción
            </div>
            <div className="text-brand-muted text-sm whitespace-pre-wrap bg-brand-bg/25 p-3 rounded-xl border border-brand-stroke/10">
              {t.description}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
