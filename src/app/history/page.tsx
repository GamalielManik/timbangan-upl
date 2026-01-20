'use client';

import { useEffect, useState } from 'react';
import { Navigation } from '../components/navigation';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Modal } from '../components/ui/modal';
import { SessionSummary } from '@/types';
import { getSessionSummaries, deleteWeighingSession } from '@/lib/supabase/database';
import { generateSessionPDF } from '@/lib/pdf-generator';
import { Edit, Trash2, Download, Search, Calendar, User, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';

interface GroupedSessions {
  [year: string]: {
    [month: string]: {
      [week: string]: SessionSummary[];
    };
  };
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    picName: '',
    ownerName: '',
  });
  const [selectedSession, setSelectedSession] = useState<SessionSummary | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  // v2.0: Collapse state for hierarchical sections
  const [collapsedYears, setCollapsedYears] = useState<Set<string>>(new Set());
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [sessions, filters]);

  const fetchSessions = async () => {
    try {
      const data = await getSessionSummaries();
      setSessions(data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...sessions];

    if (filters.startDate) {
      filtered = filtered.filter(s => s.transaction_date >= filters.startDate);
    }
    if (filters.endDate) {
      filtered = filtered.filter(s => s.transaction_date <= filters.endDate);
    }
    if (filters.picName) {
      filtered = filtered.filter(s =>
        s.pic_name.toLowerCase().includes(filters.picName.toLowerCase())
      );
    }
    if (filters.ownerName) {
      filtered = filtered.filter(s =>
        s.owner_name.toLowerCase().includes(filters.ownerName.toLowerCase())
      );
    }

    setFilteredSessions(filtered);
  };

  const handlePrintPDF = async (sessionId: string) => {
    try {
      setPdfGenerating(sessionId);
      // Use the session data we already have from sessions list
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        generateSessionPDF(session);
      } else {
        alert('Data session tidak ditemukan');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Gagal mencetak PDF. Silakan coba lagi.');
    } finally {
      setPdfGenerating(null);
    }
  };

  const handleViewDetail = (session: SessionSummary) => {
    setSelectedSession(session);
    setDetailModalOpen(true);
  };

  const handleDeleteClick = (sessionId: string) => {
    setSessionToDelete(sessionId);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!sessionToDelete) return;

    try {
      await deleteWeighingSession(sessionToDelete);
      fetchSessions();
      setDeleteModalOpen(false);
      setSessionToDelete(null);
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Gagal menghapus data. Silakan coba lagi.');
    }
  };

  // v2.0: Toggle collapse functions
  const toggleYear = (year: string) => {
    const newSet = new Set(collapsedYears);
    if (newSet.has(year)) {
      newSet.delete(year);
    } else {
      newSet.add(year);
    }
    setCollapsedYears(newSet);
  };

  const toggleMonth = (yearMonth: string) => {
    const newSet = new Set(collapsedMonths);
    if (newSet.has(yearMonth)) {
      newSet.delete(yearMonth);
    } else {
      newSet.add(yearMonth);
    }
    setCollapsedMonths(newSet);
  };

  const toggleWeek = (yearMonthWeek: string) => {
    const newSet = new Set(collapsedWeeks);
    if (newSet.has(yearMonthWeek)) {
      newSet.delete(yearMonthWeek);
    } else {
      newSet.add(yearMonthWeek);
    }
    setCollapsedWeeks(newSet);
  };

  const groupSessionsByDate = (sessions: SessionSummary[]): GroupedSessions => {
    const grouped: GroupedSessions = {};

    sessions.forEach(session => {
      // Skip sessions without transaction_date
      if (!session.transaction_date) {
        return;
      }

      const date = new Date(session.transaction_date);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return;
      }

      const year = date.getFullYear().toString();
      const month = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

      // Calculate week of month
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      const weekNumber = Math.ceil(((date.getTime() - firstDay.getTime()) / 86400000 + firstDay.getDay() + 1) / 7);
      const week = `Minggu ke-${weekNumber}`;

      if (!grouped[year]) {
        grouped[year] = {};
      }
      if (!grouped[year][month]) {
        grouped[year][month] = {};
      }
      if (!grouped[year][month][week]) {
        grouped[year][month][week] = [];
      }

      grouped[year][month][week].push(session);
    });

    return grouped;
  };

  const groupedSessions = groupSessionsByDate(filteredSessions);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-48 mb-8"></div>
            <div className="h-96 bg-gray-300 rounded"></div>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Riwayat Penimbangan</h1>
            <p className="text-gray-600">Kelola dan lihat semua data penimbangan</p>
          </div>
          {/* v2.0: Monthly Summary Button */}
          <Link href="/history/monthly-summary">
            <Button className="bg-secondary hover:bg-secondary/90">
              <Calendar className="h-4 w-4 mr-2" />
              Ringkasan Bulanan
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="bg-white mb-6">
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Filter Data</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                type="date"
                label="Tanggal Awal"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
              <Input
                type="date"
                label="Tanggal Akhir"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
              <Input
                type="text"
                label="Nama PIC"
                placeholder="Cari nama PIC..."
                value={filters.picName}
                onChange={(e) => setFilters(prev => ({ ...prev, picName: e.target.value }))}
              />
              <Input
                type="text"
                label="Nama Pemilik"
                placeholder="Cari nama pemilik..."
                value={filters.ownerName}
                onChange={(e) => setFilters(prev => ({ ...prev, ownerName: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Data Display */}
        {Object.keys(groupedSessions).length === 0 ? (
          <Card className="bg-white">
            <CardContent className="py-12">
              <div className="text-center">
                <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak Ada Data</h3>
                <p className="text-gray-500">Tidak ada data penimbangan yang sesuai dengan filter</p>
                <Link href="/input" className="inline-flex items-center mt-4 text-primary hover:text-primary/80">
                  Input data baru
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Sort years in descending order (newest first) */}
            {Object.entries(groupedSessions)
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([year, months]) => {
                const isYearCollapsed = collapsedYears.has(year);

                return (
                  <div key={year} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Year Header - Clickable */}
                    <button
                      onClick={() => toggleYear(year)}
                      className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/15 hover:to-primary/10 transition-colors"
                    >
                      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        {isYearCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                        {year}
                      </h2>
                      <span className="text-sm text-gray-600">
                        {Object.values(months).reduce((total, weeks) =>
                          total + Object.values(weeks).reduce((sum, sessions) => sum + sessions.length, 0), 0
                        )} sesi
                      </span>
                    </button>

                    {/* Year Content */}
                    {!isYearCollapsed && (
                      <div className="p-4 space-y-4">
                        {/* Sort months in descending order (newest first) */}
                        {Object.entries(months)
                          .sort(([a], [b]) => {
                            const monthOrder = ['Desember', 'November', 'Oktober', 'September', 'Agustus', 'Juli', 'Juni', 'Mei', 'April', 'Maret', 'Februari', 'Januari'];
                            return monthOrder.indexOf(a) - monthOrder.indexOf(b);
                          })
                          .map(([month, weeks]) => {
                            const yearMonth = `${year}-${month}`;
                            const isMonthCollapsed = collapsedMonths.has(yearMonth);

                            return (
                              <div key={month} className="border border-gray-200 rounded-lg overflow-hidden">
                                {/* Month Header - Clickable */}
                                <button
                                  onClick={() => toggleMonth(yearMonth)}
                                  className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-secondary/10 to-secondary/5 hover:from-secondary/15 hover:to-secondary/10 transition-colors"
                                >
                                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    {isMonthCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                                    {month}
                                  </h3>
                                  <span className="text-sm text-gray-600">
                                    {Object.values(weeks).reduce((sum, sessions) => sum + sessions.length, 0)} sesi
                                  </span>
                                </button>

                                {/* Month Content */}
                                {!isMonthCollapsed && (
                                  <div className="p-3 space-y-3">
                                    {/* Sort weeks in descending order (newest first) */}
                                    {Object.entries(weeks)
                                      .sort(([a], [b]) => {
                                        const weekNumA = parseInt(a.split(' ')[1]);
                                        const weekNumB = parseInt(b.split(' ')[1]);
                                        return weekNumB - weekNumA;
                                      })
                                      .map(([week, weekSessions]) => {
                                        const yearMonthWeek = `${year}-${month}-${week}`;
                                        const isWeekCollapsed = collapsedWeeks.has(yearMonthWeek);

                                        return (
                                          <div key={week} className="border border-gray-200 rounded-lg overflow-hidden">
                                            {/* Week Header - Clickable */}
                                            <button
                                              onClick={() => toggleWeek(yearMonthWeek)}
                                              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                                            >
                                              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                                {isWeekCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                                                {week}
                                              </h4>
                                              <span className="text-xs text-gray-600">{weekSessions.length} sesi</span>
                                            </button>

                                            {/* Week Content - Sessions */}
                                            {!isWeekCollapsed && (
                                              <div className="p-2 space-y-2 bg-white">
                                                {/* Sort sessions by date descending (newest first) */}
                                                {weekSessions
                                                  .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
                                                  .map((session) => (
                                                    <Card key={session.id} className="bg-white hover:shadow-md transition-shadow border-l-4 border-l-primary">
                                                      <CardContent className="p-4">
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                          <div className="flex-1">
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                                                              <div className="flex items-center gap-2 text-sm">
                                                                <Calendar className="h-4 w-4 text-gray-400" />
                                                                <span className="text-gray-700">
                                                                  {session.transaction_date ?
                                                                    new Date(session.transaction_date).toLocaleDateString('id-ID', {
                                                                      weekday: 'long',
                                                                      year: 'numeric',
                                                                      month: 'long',
                                                                      day: 'numeric'
                                                                    }) : 'Tanggal tidak diketahui'
                                                                  }
                                                                </span>
                                                              </div>
                                                              <div className="flex items-center gap-2 text-sm">
                                                                <User className="h-4 w-4 text-gray-400" />
                                                                <span className="text-gray-700">{session.pic_name || 'Tidak diketahui'}</span>
                                                              </div>
                                                              <div className="text-sm font-semibold text-gray-900">
                                                                {(session.total_weight || 0).toFixed(1)} kg ({session.total_items || 0} item)
                                                              </div>
                                                            </div>
                                                            <p className="text-sm text-gray-600">Pemilik: {session.owner_name || 'Tidak diketahui'}</p>
                                                          </div>

                                                          <div className="flex gap-2">
                                                            <Button
                                                              variant="outline"
                                                              size="sm"
                                                              onClick={() => handleViewDetail(session)}
                                                              className="text-indigo-600 hover:text-indigo-700"
                                                              title="Lihat Detail"
                                                            >
                                                              <Eye className="h-4 w-4" />
                                                            </Button>
                                                            <Link href={`/input?edit=${session.id}`}>
                                                              <Button variant="outline" size="sm" className="text-blue-600 hover:text-blue-700" title="Edit">
                                                                <Edit className="h-4 w-4" />
                                                              </Button>
                                                            </Link>
                                                            <Button
                                                              variant="outline"
                                                              size="sm"
                                                              onClick={() => handlePrintPDF(session.id)}
                                                              className="text-green-600 hover:text-green-700"
                                                              disabled={pdfGenerating === session.id}
                                                              title="Download PDF"
                                                            >
                                                              {pdfGenerating === session.id ? (
                                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
                                                              ) : (
                                                                <Download className="h-4 w-4" />
                                                              )}
                                                            </Button>
                                                            <Button
                                                              variant="outline"
                                                              size="sm"
                                                              onClick={() => handleDeleteClick(session.id)}
                                                              className="text-red-600 hover:text-red-700"
                                                              title="Hapus"
                                                            >
                                                              <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                          </div>
                                                        </div>
                                                      </CardContent>
                                                    </Card>
                                                  ))}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {/* Detail Modal */}
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title="Detail Hasil Penimbangan"
        >
          {selectedSession && (
            <div className="space-y-6">
              {/* Session Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tanggal Penimbangan
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedSession.transaction_date ?
                      new Date(selectedSession.transaction_date).toLocaleDateString('id-ID', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'Tidak diketahui'
                    }
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Berat
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {(selectedSession.total_weight || 0).toFixed(1)} kg
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PIC (Penanggung Jawab)
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedSession.pic_name || 'Tidak diketahui'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pemilik Barang
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedSession.owner_name || 'Tidak diketahui'}
                  </p>
                </div>

                {/* v2.0: Time Tracking Display */}
                {(selectedSession.start_time || selectedSession.end_time) && (
                  <>
                    {selectedSession.start_time && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Awal Timbang
                        </label>
                        <p className="text-sm text-gray-900">
                          {new Date(selectedSession.start_time).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            timeZoneName: 'short'
                          })}
                        </p>
                      </div>
                    )}
                    {selectedSession.end_time && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Akhir Timbang
                        </label>
                        <p className="text-sm text-gray-900">
                          {new Date(selectedSession.end_time).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            timeZoneName: 'short'
                          })}
                        </p>
                      </div>
                    )}
                    {selectedSession.start_time && selectedSession.end_time && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Durasi Penimbangan
                        </label>
                        <p className="text-sm font-semibold text-primary">
                          {(() => {
                            const duration = new Date(selectedSession.end_time).getTime() - new Date(selectedSession.start_time).getTime();
                            const minutes = Math.floor(duration / 60000);
                            const seconds = Math.floor((duration % 60000) / 1000);
                            return `${minutes} menit ${seconds} detik`;
                          })()}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Items Table */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Rincian Barang</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-900">
                          No
                        </th>
                        <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-900">
                          Jenis Plastik
                        </th>
                        <th className="border border-gray-200 px-4 py-2 text-right text-sm font-medium text-gray-900">
                          Berat (kg)
                        </th>
                        <th className="border border-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-900">
                          Satuan
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSession.items && selectedSession.items.length > 0 ? (
                        selectedSession.items.map((item, index) => (
                          <tr key={item.id || index}>
                            <td className="border border-gray-200 px-4 py-2 text-sm text-gray-900">
                              {index + 1}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-sm text-gray-900">
                              {item.category?.name || 'Tidak diketahui'}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-sm text-gray-900 text-right">
                              {(item.weight_kg || 0).toFixed(2)}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-sm text-gray-900 text-center">
                              {item.satuan || '-'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="border border-gray-200 px-4 py-2 text-center text-sm text-gray-500">
                            Tidak ada data
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100">
                        <td colSpan={3} className="border border-gray-200 px-4 py-2 text-sm font-medium text-gray-900">
                          Total
                        </td>
                        <td className="border border-gray-200 px-4 py-2 text-sm font-bold text-gray-900 text-center">
                          -
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Total per Category */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Total Berat per Kategori</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(() => {
                    const categoryTotals = new Map();
                    (selectedSession.items || []).forEach(item => {
                      const categoryName = item.category?.name || 'Tidak Diketahui';
                      const weight = item.weight_kg || 0;
                      categoryTotals.set(categoryName, (categoryTotals.get(categoryName) || 0) + weight);
                    });

                    return Array.from(categoryTotals.entries())
                      .sort((a, b) => b[1] - a[1])
                      .map(([categoryName, totalWeight]) => (
                        <div key={categoryName} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-700">{categoryName}</span>
                          <span className="text-sm font-bold text-gray-900">{totalWeight.toFixed(2)} kg</span>
                        </div>
                      ));
                  })()}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => setDetailModalOpen(false)}
                >
                  Tutup
                </Button>
                <Button
                  onClick={() => {
                    handlePrintPDF(selectedSession.id);
                    setDetailModalOpen(false);
                  }}
                  className="bg-secondary hover:bg-secondary/90"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Cetak PDF
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Konfirmasi Hapus Data"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Apakah Anda yakin ingin menghapus data penimbangan ini?
            </p>
            <p className="text-sm text-gray-500">
              <strong>Peringatan:</strong> Data yang telah dihapus tidak dapat dikembalikan lagi.
            </p>
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setSessionToDelete(null);
                }}
              >
                Batal
              </Button>
              <Button
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Ya, Hapus Data
              </Button>
            </div>
          </div>
        </Modal>
      </main >
    </div >
  );
}
