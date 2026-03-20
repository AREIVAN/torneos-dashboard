"use client";

import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '../api/getStats';
import { useRobotStore } from '@/store/useRobotStore';

export function DashboardStats() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    refetchInterval: 30000, // Refetch every 30s as it's a live dashboard
  });

  const mineIds = useRobotStore((state) => state.mineIds);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="rounded-[18px] border border-brand-neon/22 bg-brand-bg/25 p-3.5">
        <div className="text-brand-muted text-xs tracking-wide uppercase">Robots registrados</div>
        <div className="text-3xl font-black mt-1.5">{isLoading ? '—' : data?.total}</div>
      </div>
      <div className="rounded-[18px] border border-brand-neon/22 bg-brand-bg/25 p-3.5">
        <div className="text-brand-muted text-xs tracking-wide uppercase">Registrados hoy</div>
        <div className="text-3xl font-black mt-1.5">{isLoading ? '—' : data?.today}</div>
      </div>
      <div className="rounded-[18px] border border-brand-neon/22 bg-brand-bg/25 p-3.5">
        <div className="text-brand-muted text-xs tracking-wide uppercase">Mis robots</div>
        <div className="text-3xl font-black mt-1.5">{mineIds.length}</div>
      </div>
    </div>
  );
}
