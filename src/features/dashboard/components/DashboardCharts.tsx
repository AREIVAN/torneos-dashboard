"use client";

import ReactECharts from 'echarts-for-react';
import { useQuery } from '@tanstack/react-query';
import { subMonths, format } from 'date-fns';

export function DashboardCharts() {
  const { data: chartData } = useQuery({
    queryKey: ['robots-chart'],
    queryFn: async () => {
      // Mocked data series representing registration growth over the last 6 months
      // In a real app we'd group by standard DB dates here
      const months = Array.from({ length: 6 }).map((_, i) => format(subMonths(new Date(), 5 - i), 'MMM'));
      const counts = [12, 18, 30, 45, 65, 80]; // Mock cumulative growth
      return { months, counts };
    }
  });

  if (!chartData) return <div className="animate-pulse h-[200px] bg-brand-bg/25 rounded-2xl w-full" />;

  const option = {
    tooltip: { trigger: 'axis', backgroundColor: '#0B1020', borderColor: 'rgba(122, 63, 255,0.3)', textStyle: { color: '#EAF0FF' } },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: chartData.months,
      axisLine: { lineStyle: { color: 'rgba(234, 240, 255, 0.45)' } },
      axisLabel: { color: 'rgba(234, 240, 255, 0.65)' }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(122, 63, 255, 0.15)' } },
      axisLabel: { color: 'rgba(234, 240, 255, 0.65)' }
    },
    series: [
      {
        name: 'Robots Registrados',
        type: 'line',
        data: chartData.counts,
        smooth: true,
        lineStyle: { color: '#7A3FFF', width: 3 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(122, 63, 255, 0.5)' }, { offset: 1, color: 'rgba(122, 63, 255, 0.0)' }]
          }
        },
        itemStyle: { color: '#7A3FFF', borderColor: '#070A10', borderWidth: 2 },
        symbolSize: 8,
      }
    ]
  };

  return (
    <div className="rounded-[18px] border border-brand-neon/25 bg-brand-bg/25 p-4 mt-4 relative overflow-hidden">
        <h3 className="text-brand-muted text-xs tracking-wide uppercase mb-2">Crecimiento Histórico</h3>
        <ReactECharts option={option} style={{ height: '220px', width: '100%' }} />
    </div>
  );
}
