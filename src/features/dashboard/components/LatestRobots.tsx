"use client";

import { useQuery } from "@tanstack/react-query";
import { getLatestRobots } from "../api/getLatest";
import Link from "next/link";

// Helper: read robot name/category/team from either flat columns or data JSON
function getRobotDisplay(robot: any) {
  const d = robot.data || {};
  const nombre = robot.robot_nombre || d.n || "";
  const categoria = robot.categoria || d.c || "";
  const equipo = robot.equipo || d.t || "";
  return { nombre, categoria, equipo };
}

export function LatestRobots() {
  const { data: robots, isLoading, error } = useQuery({
    queryKey: ['latest-robots'],
    queryFn: getLatestRobots,
    refetchInterval: 30000
  });

  if (isLoading) {
    return (
      <div className="rounded-[18px] border border-brand-neon/22 overflow-hidden bg-brand-bg/18">
        <div className="flex items-center justify-between gap-3 px-3.5 py-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <b className="text-sm text-brand-text">Cargando…</b>
            <span className="text-xs text-brand-muted/60">—</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !robots || robots.length === 0) {
    return (
      <div className="rounded-[18px] border border-brand-neon/22 overflow-hidden bg-brand-bg/18">
        <div className="flex items-center justify-between gap-3 px-3.5 py-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <b className="text-sm text-brand-muted">No hay robots recientes.</b>
            <span className="text-xs text-brand-muted/60">—</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-[18px] border border-brand-neon/22 overflow-hidden bg-brand-bg/18">
        {robots.map((robot: any, i: number) => {
          const { nombre, categoria, equipo } = getRobotDisplay(robot);
          const sub = [robot.robot_id, categoria, equipo].filter(Boolean).join(" · ");
          return (
            <Link
              href={`/robots/${robot.robot_id}`}
              key={robot.robot_id}
              className={`flex items-center justify-between gap-3 px-3.5 py-3 hover:bg-brand-neon/7 transition-colors cursor-pointer${i > 0 ? ' border-t border-brand-neon/18' : ''}`}
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <b className="text-sm text-brand-text whitespace-nowrap overflow-hidden text-ellipsis">{nombre || robot.robot_id}</b>
                <span className="text-xs text-brand-muted/60 whitespace-nowrap overflow-hidden text-ellipsis">{sub}</span>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="border border-brand-neon2/25 bg-brand-panel2/55 text-brand-text px-3 py-2 rounded-xl text-xs font-extrabold tracking-wide">Ver</span>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="text-brand-muted/45 text-[11px] leading-relaxed mt-3">
         Tip: El QR &quot;link&quot; apunta a <b>#id=ROBOT_ID</b> y por eso el viewer abre desde la base de datos.
      </div>
    </>
  );
}
