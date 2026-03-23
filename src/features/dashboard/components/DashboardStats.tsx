"use client";

import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '../api/getStats';
import { useRobotStore } from '@/store/useRobotStore';
import { SkeletonStatCard } from '@/components/ui/skeleton';
import { AnimatedCard, getStaggerDelay } from '@/components/ui/AnimatedComponents';

export function DashboardStats() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    refetchInterval: 30000, // Refetch every 30s as it's a live dashboard
  });

  const mineIds = useRobotStore((state) => state.mineIds);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>
    );
  }

  const stats = [
    { label: "Robots registrados", value: data?.total ?? '—' },
    { label: "Registrados hoy", value: data?.today ?? '—' },
    { label: "Mis robots", value: mineIds.length },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {stats.map((stat, index) => (
        <AnimatedCard 
          key={stat.label} 
          delay={getStaggerDelay(index)}
          className="rounded-[18px] border border-brand-neon/22 bg-brand-bg/25 p-3.5"
        >
          <div className="text-brand-muted text-xs tracking-wide uppercase">{stat.label}</div>
          <div className="text-3xl font-black mt-1.5">{stat.value}</div>
        </AnimatedCard>
      ))}
    </div>
  );
}
