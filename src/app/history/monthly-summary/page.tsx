'use client';

import { useEffect, useState } from 'react';
import { Navigation } from '@/components/navigation';
import { Card, CardContent, CardHeader } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Modal } from '@/app/components/ui/modal';
import { PieChart } from '@/app/components/charts/pie-chart';
import { getAvailableMonths, getMonthlyDashboard, getMonthlyCategoryBreakdown, getMonthlySessions, createClosingPeriod } from '@/lib/supabase/database';
import { MonthlyDashboard, MonthlyCategoryBreakdown, MonthlySessionDetail, AvailableMonth } from '@/types/monthly';
import { Download, TrendingUp, Package, Eye, ArrowLeft, Calendar, Plus } from 'lucide-react';
import Link from 'next/link';

export default function MonthlySummaryPage() {
    const [availableMonths, setAvailableMonths] = useState<AvailableMonth[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<AvailableMonth | null>(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [modalData, setModalData] = useState<{
        summary: MonthlyDashboard | null;
        categories: MonthlyCategoryBreakdown[];
        sessions: MonthlySessionDetail[];
    }>({ summary: null, categories: [], sessions: [] });
    const [loading, setLoading] = useState(true);
    const [modalLoading, setModalLoading] = useState(false);

    // Create period modal state
    const [newPeriodName, setNewPeriodName] = useState('');
    const [newStartDate, setNewStartDate] = useState('');
    const [newEndDate, setNewEndDate] = useState('');
    const [createLoading, setCreateLoading] = useState(false);

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

    const handleViewPeriod = async (period: AvailableMonth) => {
        setSelectedPeriod(period);
        setViewModalOpen(true);
        setModalLoading(true);

        try {
            const [summary, categories, sessions] = await Promise.all([
                getMonthlyDashboard(period.period_id),
                getMonthlyCategoryBreakdown(period.period_id),
                getMonthlySessions(period.period_id)
            ]);

            setModalData({ summary, categories, sessions });
        } catch (error) {
            console.error('Error fetching period data:', error);
        } finally {
            setModalLoading(false);
        }
    };

    const handleCreatePeriod = async () => {
        if (!newPeriodName.trim() || !newStartDate || !newEndDate) {
            alert('Mohon lengkapi semua field');
            return;
        }

        setCreateLoading(true);
        try {
            await createClosingPeriod(newPeriodName, newStartDate, newEndDate);
            // Refresh available months
            await fetchAvailableMonths();
            // Reset form
            setNewPeriodName('');
            setNewStartDate('');
            setNewEndDate('');
            setCreateModalOpen(false);
        } catch (error) {
            console.error('Error creating period:', error);
            alert('Gagal membuat periode. Silakan coba lagi.');
        } finally {
            setCreateLoading(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!selectedPeriod || !modalData.summary) return;

        try {
            const { generateMonthlyPDF } = await import('@/lib/pdf-generator');

            // Will need to update pdf-generator.ts later, for now pass placeholder values
            generateMonthlyPDF(
                0, // year placeholder
                0, // month placeholder  
                modalData.summary.period_name,
                modalData.summary,
                modalData.categories,
                modalData.sessions
            );
        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert('Gagal mengunduh PDF. Silakan coba lagi.');
        }
    };



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
                    <>
                        {/* Add Period Button */}
                        <div className="mb-6">
                            <Button
                                onClick={() => setCreateModalOpen(true)}
                                className="bg-primary text-white"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Tambah Periode Baru
                            </Button>
                        </div>

                        {/* Period Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {availableMonths.map(period => (
                                <Card
                                    key={period.period_id}
                                    className="bg-white hover:shadow-lg transition-shadow cursor-pointer"
                                    onClick={() => handleViewPeriod(period)}
                                >
                                    <CardContent className="p-6">
                                        <div className="text-center">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                                {period.period_name}
                                            </h3>
                                            <p className="text-xs text-gray-500 mb-2">
                                                {new Date(period.start_date).toLocaleDateString('id-ID')} - {new Date(period.end_date).toLocaleDateString('id-ID')}
                                            </p>
                                            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                                                <Package className="h-4 w-4" />
                                                <span>{period.session_count} sesi</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </>
                )}

                {/* Create Period Modal */}
                <Modal
                    isOpen={createModalOpen}
                    onClose={() => setCreateModalOpen(false)}
                    title="Buat Periode Tutup Buku Baru"
                >
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nama Periode *
                            </label>
                            <input
                                type="text"
                                value={newPeriodName}
                                onChange={(e) => setNewPeriodName(e.target.value)}
                                placeholder="contoh: Desember 2025"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tanggal Mulai *
                            </label>
                            <input
                                type="date"
                                value={newStartDate}
                                onChange={(e) => setNewStartDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tanggal Akhir *
                            </label>
                            <input
                                type="date"
                                value={newEndDate}
                                onChange={(e) => setNewEndDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div className="flex gap-3 pt-4">
                            <Button
                                onClick={() => setCreateModalOpen(false)}
                                variant="outline"
                                className="flex-1"
                                disabled={createLoading}
                            >
                                Batal
                            </Button>
                            <Button
                                onClick={handleCreatePeriod}
                                className="flex-1 bg-primary text-white"
                                disabled={createLoading}
                            >
                                {createLoading ? 'Menyimpan...' : 'Simpan'}
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Period Detail Modal */}
                <Modal
                    isOpen={viewModalOpen}
                    onClose={() => setViewModalOpen(false)}
                    title={selectedPeriod ? `Ringkasan ${selectedPeriod.period_name}` : ''}
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
                                <Button variant="outline" onClick={() => setViewModalOpen(false)}>
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
