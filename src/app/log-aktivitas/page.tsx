'use client';

import { useEffect, useState } from 'react';
import { getActivityLogs, DeletionLog } from '@/lib/supabase/logs';

export default function LogAktivitasPage() {
    const [logs, setLogs] = useState<DeletionLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getActivityLogs();
            setLogs(data);
        } catch (err) {
            console.error('Error fetching logs:', err);
            setError('Gagal memuat log aktivitas');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    // Format date for display
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    // Extract device info from user agent
    const getDeviceInfo = (userAgent: string | null): string => {
        if (!userAgent) return '-';

        // Simple device detection
        if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
            return 'Mobile';
        } else if (userAgent.includes('iPad') || userAgent.includes('Tablet')) {
            return 'Tablet';
        } else {
            return 'Desktop';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Memuat log aktivitas...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center py-20">
                        <p className="text-red-600">{error}</p>
                        <button
                            onClick={fetchLogs}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Coba Lagi
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
                                <span>📋</span>
                                Log Aktivitas Penghapusan
                            </h1>
                            <p className="text-sm text-gray-600 mt-1">
                                Data dihapus otomatis setelah 7 hari
                            </p>
                        </div>
                        <button
                            onClick={fetchLogs}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                            <span>🔄</span>
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    {logs.length === 0 ? (
                        <div className="text-center py-20 text-gray-500">
                            <p className="text-lg">Tidak ada log aktivitas</p>
                            <p className="text-sm mt-2">Log penghapusan akan muncul di sini</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-semibold">No</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold">Nama Penimbang</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold">Pemilik Barang</th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold">Total Berat (kg)</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold">Waktu Hapus</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold">Device</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log, index) => (
                                        <tr
                                            key={log.id}
                                            className={`
                        border-b border-gray-200 hover:bg-blue-50 transition-colors
                        ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      `}
                                        >
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                {index + 1}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                                                {log.nama_penimbang}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-800">
                                                {log.pemilik_barang}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-800 text-right font-mono">
                                                {log.total_berat_kg.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {formatDate(log.deleted_at)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 text-center">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {getDeviceInfo(log.user_agent)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                {logs.length > 0 && (
                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                            <span className="font-semibold">Total log:</span> {logs.length} aktivitas penghapusan
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                            ℹ️ Log akan otomatis terhapus setelah 7 hari untuk menjaga performa database
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
