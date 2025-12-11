'use client';

import { WeeklyDashboard } from '@/types';
import { cn } from '@/lib/utils';

interface PieChartProps {
  data: WeeklyDashboard[];
  className?: string;
}

export function PieChart({ data, className }: PieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-64 bg-gray-50 rounded-lg', className)}>
        <p className="text-gray-500">Tidak ada data untuk ditampilkan</p>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + (item.total_weight || 0), 0);

  if (total === 0) {
    return (
      <div className={cn('flex items-center justify-center h-64 bg-gray-50 rounded-lg', className)}>
        <p className="text-gray-500">Tidak ada data untuk ditampilkan</p>
      </div>
    );
  }

  const colors = [
    '#009ce4', // primary
    '#7eb93e', // secondary
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#84cc16',
  ];

  const segments = data.map((item, index) => {
    const weight = item.total_weight || 0;
    const percentage = (weight / total) * 100;
    const color = colors[index % colors.length];

    return {
      ...item,
      total_weight: weight,
      percentage,
      color,
    };
  });

  const createPath = (startAngle: number, endAngle: number) => {
    const radius = 80;
    const centerX = 100;
    const centerY = 100;

    const start = polarToCartesian(centerX, centerY, radius, endAngle);
    const end = polarToCartesian(centerX, centerY, radius, startAngle);

    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    const d = [
      'M', centerX, centerY,
      'L', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      'Z'
    ].join(' ');

    return d;
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  let currentAngle = 0;

  return (
    <div className={cn('w-full', className)}>
      <div className="flex flex-col sm:flex-row items-center gap-8">
        <div className="relative">
          <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
            {segments.map((segment) => {
              const startAngle = currentAngle;
              const endAngle = currentAngle + (segment.percentage * 3.6);
              currentAngle = endAngle;

              return (
                <path
                  key={segment.category_name}
                  d={createPath(startAngle, endAngle)}
                  fill={segment.color}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center transform rotate-90">
              <p className="text-2xl font-bold text-gray-900">{(total || 0).toFixed(1)}</p>
              <p className="text-sm text-gray-500">Total (kg)</p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Statistik per Kategori</h3>
          {segments.map((segment) => (
            <div key={segment.category_name} className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-sm text-gray-700 flex-1">
                {segment.category_name}
              </span>
              <span className="text-sm font-medium text-gray-900">
                {(segment.total_weight || 0).toFixed(1)} kg ({(segment.percentage || 0).toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}