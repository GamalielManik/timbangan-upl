'use client';

import { useEffect, useState } from 'react';
import { Navigation } from './components/navigation';
import { Card, CardContent, CardHeader } from './components/ui/card';
import { Button } from './components/ui/button';
import { PieChart } from './components/charts/pie-chart';
import { WeeklyDashboard } from './types';
import { getWeeklyDashboard, getThisWeekTotal, getThisWeekSessionCount } from './lib/supabase/database';
import { TrendingUp, Package, PlusCircle } from 'lucide-react';
import Link from 'next/link';

// Function to get current week number in the month (Monday-Sunday based)
const getCurrentWeekNumber = () => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Get the first day of the month
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);

  // Find the first Monday of the month
  const firstMonday = new Date(firstDayOfMonth);
  let dayOfWeek = firstMonday.getDay();
  let daysToAdd = dayOfWeek === 1 ? 0 : (dayOfWeek === 0 ? 1 : (8 - dayOfWeek));
  firstMonday.setDate(firstDayOfMonth.getDate() + daysToAdd);

  // If the first Monday is in the next month, use the first day of month as week 1
  if (firstMonday.getMonth() !== currentMonth) {
    firstMonday.setTime(firstDayOfMonth.getTime());
  }

  // If today is before the first Monday, it's week 1
  if (today < firstMonday) {
    return 1;
  }

  // Calculate weeks since first Monday
  const daysSinceFirstMonday = Math.floor((today.getTime() - firstMonday.getTime()) / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(daysSinceFirstMonday / 7) + 1;

  return weekNumber;
};

export default function Dashboard() {
  const [weeklyData, setWeeklyData] = useState<WeeklyDashboard[]>([]);
  const [thisWeekTotal, setThisWeekTotal] = useState<number>(0);
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentWeekNumber, setCurrentWeekNumber] = useState<number>(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        setCurrentWeekNumber(getCurrentWeekNumber());

        const [dashboardData, totalWeight, count] = await Promise.all([
          getWeeklyDashboard(),
          getThisWeekTotal(),
          getThisWeekSessionCount()
        ]);
        setWeeklyData(dashboardData || []);
        setThisWeekTotal(totalWeight || 0);
        setSessionCount(count || 0);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Gagal memuat data dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-64 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="h-32 bg-gray-300 rounded"></div>
              <div className="h-32 bg-gray-300 rounded"></div>
              <div className="h-32 bg-gray-300 rounded"></div>
            </div>
            <div className="h-96 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-red-800 font-semibold mb-2">Error</h2>
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Muat Ulang
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Ringkasan data penimbangan limbah plastik</p>
        </div>

        {/* Statistik Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-primary/10 p-3 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Minggu Ini (Minggu ke-{currentWeekNumber})</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(thisWeekTotal || 0).toFixed(1)} kg
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-secondary/10 p-3 rounded-lg">
                  <Package className="h-6 w-6 text-secondary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Jumlah Barang Masuk (Minggu ke-{currentWeekNumber})</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {sessionCount} Sesi
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-primary to-primary/80 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">Aksi Cepat</p>
                  <p className="text-lg font-semibold">Input Data Baru</p>
                </div>
                <Link href="/input">
                  <Button variant="secondary" size="sm" className="bg-white text-primary hover:bg-gray-100">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Input
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart Section */}
        <Card className="bg-white mb-8">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">
              Statistik Berat per Kategori (Minggu ke-{currentWeekNumber})
            </h2>
          </CardHeader>
          <CardContent>
            {weeklyData && weeklyData.length > 0 ? (
              <PieChart data={weeklyData} />
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
                <p className="text-gray-500">Belum ada data penimbangan minggu ini</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/input">
            <Card className="bg-white hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-primary/10 p-3 rounded-lg">
                    <PlusCircle className="h-8 w-8 text-primary" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">Input Data Baru</h3>
                    <p className="text-sm text-gray-500">Catat hasil penimbangan limbah plastik</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/history">
            <Card className="bg-white hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-secondary/10 p-3 rounded-lg">
                    <Package className="h-8 w-8 text-secondary" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">Lihat Riwayat</h3>
                    <p className="text-sm text-gray-500">Kelola dan cetak laporan data penimbangan</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}