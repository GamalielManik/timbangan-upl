'use client';

import { useEffect, useState } from 'react';
import { Navigation } from '@/components/navigation';
import { Card, CardContent, CardHeader } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Modal } from '@/app/components/ui/modal';
import { PieChart } from '@/app/components/charts/pie-chart';
import { getAvailableMonths, getMonthlyDashboard, getMonthlyCategoryBreakdown, getMonthlySessions } from '@/lib/supabase/database';
import { MonthlyDashboard, MonthlyCategoryBreakdown, MonthlySessionDetail, AvailableMonth } from '@/types/monthly';
import { Download, TrendingUp, Package, Eye, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function MonthlySummaryPage() {
    const [availableMonths, setAvailableMonths] = useState<AvailableMonth[]>([]);
    const [selectedMonth, setSelectedMonth] = useState<{ year: number; month: number } | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalData, setModalData] = useState<{
        summary: MonthlyDashboard | null;
        categories: MonthlyCategoryBreakdown[];
        sessions: MonthlySessionDetail[];
    }>({ summary: null, categories: [], sessions: [] });
    const [loading, setLoading] = useState(true);
    const [modalLoading, setModalLoading] = useState(false);

    useEffect(() => {
        fetchAvailableMonths();
    }, []);

    const fetchAvailableMonths = async () => {
        try {
            const months = await getAvailableMonths();
            setAvailableMonths(months);
        } catch (error) {
            console.error('Error fetching available months:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewMonth = async (year: number, month: number) => {
        setSelectedMonth({ year, month });
        setModalOpen(true);
        setModalLoading(true);

        try {
            const [summary, categories, sessions] = await Promise.all([
                getMonthlyDashboard(year, month),
                getMonthlyCategoryBreakdown(year, month),
                getMonthlySessions(year, month)
            ]);

            setModalData({ summary, categories, sessions });
        } catch (error) {
            console.error('Error fetching monthly data:', error);
        } finally {
            setModalLoading(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!selectedMonth || !modalData.summary) return;

        // TODO: Implement monthly PDF generation
        alert('Monthly PDF download will be implemented');
    };

    const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    // Group months by year
    const monthsByYear = availableMonths.reduce((acc, month) => {
        if (!acc[month.year]) {
            acc[month.year] = [];
        }
        acc[month.year].push(month);
        return acc;
    }, {} as Record<number, AvailableMonth[]>);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navigation />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-300 rounded w-64 mb-8"></div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                <div key={i} className="h-32 bg-gray-300 rounded"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navigation />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Ringkasan Bulanan</h1>
                        <p className="text-gray-600">Lihat ringkasan penimbangan per bulan</p>
                    </div>
                    <Link href="/history">
                        <Button variant="outline">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Kembali
                        </Button>
                    </Link>
                </div>

                {availableMonths.length === 0 ? (
                    <Card className="bg-white">
                        <CardContent className="py-12">
                            <div className="text-center">
                                <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Belum Ada Data</h3>
                                <p className="text-gray-500">Belum ada data penimbangan yang tersedia</p>
                                <Link href="/input" className="inline-flex items-center mt-4 text-primary hover:text-primary/80">
                                    Input data baru
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(monthsByYear)
                            .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
                            .map(([year, months]) => (
                                <div key={year}>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-4">{year}</h2>

                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {months
                                            .sort((a, b) => b.month - a.month)
                                            .map(month => (
                                                <Card
                                                    key={`${month.year}-${month.month}`}
                                                    className="bg-white hover:shadow-lg transition-shadow cursor-pointer"
                                                    onClick={() => handleViewMonth(month.year, month.month)}
                                                >
                                                    <CardContent className="p-6">
                                                        <div className="text-center">
                                                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                                                {monthNames[month.month - 1]}
                                                            </h3>
                                                            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                                                                <Package className="h-4 w-4" />
                                                                <span>{month.session_count} sesi</span>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                    </div>
                                </div>
                            ))}
                    </div>
                )}

                {/* Monthly Detail Modal */}
                <Modal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    title={selectedMonth ? `Ringkasan ${monthNames[selectedMonth.month - 1]} ${selectedMonth.year}` : ''}
                >
                    {modalLoading ? (
                        <div className="py-12 text-center">
                            <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                            <p className="mt-4 text-gray-600">Memuat data...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Summary Stats */}
                            {modalData.summary && (
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                                        <p className="text-sm text-gray-600">Total Sesi</p>
                                        <p className="text-2xl font-bold text-gray-900">{modalData.summary.total_sessions}</p>
                                    </div>
                                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                                        <p className="text-sm text-gray-600">Total Berat</p>
                                        <p className="text-2xl font-bold text-primary">{modalData.summary.total_weight.toFixed(1)} kg</p>
                                    </div>
                                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                                        <p className="text-sm text-gray-600">Total Item</p>
                                        <p className="text-2xl font-bold text-gray-900">{modalData.summary.total_items}</p>
                                    </div>
                                </div>
                            )}

                            {/* Pie Chart */}
                            {modalData.categories.length > 0 && (
                                <div>
                                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Distribusi per Kategori</h4>
                                    <PieChart data={modalData.categories.map(cat => ({
                                        category_name: cat.category_name,
                                        total_weight: cat.total_weight,
                                        percentage: cat.percentage
                                    }))} />
                                </div>
                            )}

                            {/* Sessions Table */}
                            {modalData.sessions.length > 0 && (
                                <div>
                                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Detail Sesi Penimbangan</h4>
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr className="bg-gray-50">
                                                    <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-900">
                                                        Tanggal
                                                    </th>
                                                    <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-900">
                                                        PIC
                                                    </th>
                                                    <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-900">
                                                        Pemilik
                                                    </th>
                                                    <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-900">
                                                        Kategori
                                                    </th>
                                                    <th className="border border-gray-200 px-4 py-2 text-right text-sm font-medium text-gray-900">
                                                        Total (kg)
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {modalData.sessions.map(session => (
                                                    <tr key={session.id} className="hover:bg-gray-50">
                                                        <td className="border border-gray-200 px-4 py-2 text-sm text-gray-900">
                                                            {new Date(session.transaction_date).toLocaleDateString('id-ID')}
                                                        </td>
                                                        <td className="border border-gray-200 px-4 py-2 text-sm text-gray-900">
                                                            {session.pic_name}
                                                        </td>
                                                        <td className="border border-gray-200 px-4 py-2 text-sm text-gray-900">
                                                            {session.owner_name}
                                                        </td>
                                                        <td className="border border-gray-200 px-4 py-2 text-sm text-gray-900">
                                                            {session.categories.join(', ')}
                                                        </td>
                                                        <td className="border border-gray-200 px-4 py-2 text-sm text-gray-900 text-right">
                                                            {session.total_weight.toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                                <Button variant="outline" onClick={() => setModalOpen(false)}>
                                    Tutup
                                </Button>
                                <Button onClick={handleDownloadPDF} className="bg-secondary hover:bg-secondary/90">
                                    <Download className="h-4 w-4 mr-2" />
                                    Download PDF
                                </Button>
                            </div>
                        </div>
                    )}
                </Modal>
            </main>
        </div>
    );
}
