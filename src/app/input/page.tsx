'use client';

import { useEffect, useState } from 'react';
import { Navigation } from '../components/navigation';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { Select } from '../components/ui/select';
import { Toast } from '../components/ui/toast';
import { PlasticCategory, SessionFormData } from '../types';
import { getPlasticCategories, createWeighingSession, createWeighingItems } from '../lib/supabase/database';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { Trash2, Plus, ChevronRight, ChevronLeft } from 'lucide-react';

interface FormData extends SessionFormData {
  showAllCategories?: boolean;
}

export default function InputPage() {
  const [step, setStep, clearStep] = useLocalStorage('input-form-step', 1);
  const [categories, setCategories] = useState<PlasticCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  
  // New state for category search
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  // v2.0: Time tracking state
  const [startTime, setStartTime] = useState<Date | null>(null);

  const initialFormData: FormData = {
    transaction_date: new Date().toISOString().split('T')[0],
    pic_name: '',
    owner_name: '',
    jenis_kendaraan: '',
    selected_categories: [],
    items: [],
    showAllCategories: false,
  };

  const [formData, setFormData, clearFormData] = useLocalStorage<FormData>('input-form-data', initialFormData);

  // New state for the static input form
  const [currentItem, setCurrentItem] = useState<{ category_id: number; weight_kg: number | ''; satuan: string; gabungan: string }>({
    category_id: 0,
    weight_kg: '',
    satuan: '',
    gabungan: ''
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await getPlasticCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      showToast('Gagal memuat data kategori', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCategoryChange = (categoryId: number, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selected_categories: checked
        ? [...prev.selected_categories, categoryId]
        : prev.selected_categories.filter(id => id !== categoryId)
    }));
  };

  const updateCurrentItem = (field: 'category_id' | 'weight_kg' | 'satuan' | 'gabungan', value: number | string) => {
    // v2.0: Track start time on first weight input
    if (field === 'weight_kg' && value && Number(value) > 0 && !startTime) {
      setStartTime(new Date());
      console.log('[Time Tracking] Start time recorded:', new Date().toISOString());
    }

    setCurrentItem(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addItemToList = () => {
    if (!currentItem.category_id) {
      showToast('Pilih jenis plastik', 'error');
      return;
    }
    if (!currentItem.weight_kg || Number(currentItem.weight_kg) <= 0) {
      showToast('Berat harus diisi dan lebih dari 0', 'error');
      return;
    }

    setFormData(prev => ({
      ...prev,
      // Add new item to the top of the list
      items: [
        {
          category_id: currentItem.category_id,
          weight_kg: Number(currentItem.weight_kg),
          satuan: currentItem.satuan as any,
          gabungan: currentItem.gabungan
        },
        ...prev.items
      ]
    }));

    // Reset weight and gabungan, but keep category and satuan to speed up multiple similar entries
    setCurrentItem(prev => ({ ...prev, weight_kg: '', gabungan: '' }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const validateStep1 = () => {
    if (!formData.transaction_date) {
      showToast('Tanggal harus diisi', 'error');
      return false;
    }
    if (!formData.pic_name.trim()) {
      showToast('Nama penimbang harus diisi', 'error');
      return false;
    }
    if (!formData.owner_name.trim()) {
      showToast('Nama pemilik harus diisi', 'error');
      return false;
    }
    if (formData.selected_categories.length === 0) {
      showToast('Pilih minimal satu kategori plastik', 'error');
      return false;
    }
    return true;
  };

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const validateStep2 = () => {
    if (formData.items.length === 0) {
      showToast('Daftar riwayat masih kosong. Silakan tambah item ke daftar terlebih dahulu.', 'error');
      return false;
    }
    return true;
  };

  const handleSubmitClick = () => {
    if (!validateStep2()) return;
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);
    try {
      // v2.0: Record end time
      const endTime = new Date();
      console.log('[Time Tracking] End time recorded:', endTime.toISOString());

      const session = await createWeighingSession({
        transaction_date: formData.transaction_date,
        pic_name: formData.pic_name.trim(),
        owner_name: formData.owner_name.trim(),
        jenis_kendaraan: formData.jenis_kendaraan || undefined,
        selected_category_ids: formData.selected_categories,
        start_time: startTime?.toISOString(),
        end_time: endTime.toISOString(),
      });

      const itemsToInsert = formData.items.map((item: { category_id: number; weight_kg: number; satuan?: 'SAK' | 'PRESS' | 'BAL' | ''; gabungan?: string }, index) => ({
        session_id: session.id,
        category_id: item.category_id,
        sequence_number: index + 1,
        weight_kg: item.weight_kg,
        satuan: item.satuan || undefined,
        gabungan: item.gabungan || undefined,
      }));

      await createWeighingItems(itemsToInsert);

      showToast('Data berhasil disimpan!', 'success');

      // Clear localStorage and reset form
      clearFormData();
      clearStep();
      setStartTime(null); // v2.0: Reset start time
    } catch (error) {
      console.error('Error submitting data:', error);
      showToast('Gagal menyimpan data. Silakan coba lagi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getAvailableCategories = () => {
    if (formData.showAllCategories) {
      return categories;
    }
    return categories.filter(cat => formData.selected_categories.includes(cat.id));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-48 mb-8"></div>
            <div className="space-y-4">
              <div className="h-10 bg-gray-300 rounded"></div>
              <div className="h-32 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Input Data Penimbangan</h1>
          <p className="text-gray-600">Catat hasil penimbangan limbah plastik</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className={`flex items-center ${step >= 1 ? 'text-primary' : 'text-gray-400'}`}>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${step >= 1 ? 'bg-primary border-primary text-white' : 'border-gray-300'}`}>
              1
            </div>
            <span className="ml-2 font-medium">Info Sesi</span>
          </div>
          <div className={`w-16 h-1 mx-4 ${step >= 2 ? 'bg-primary' : 'bg-gray-300'}`}></div>
          <div className={`flex items-center ${step >= 2 ? 'text-primary' : 'text-gray-400'}`}>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${step >= 2 ? 'bg-primary border-primary text-white' : 'border-gray-300'}`}>
              2
            </div>
            <span className="ml-2 font-medium">Input Item</span>
          </div>
        </div>

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        <Card className="bg-white">
          <CardContent className="p-6">
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Informasi Sesi Penimbangan</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      type="date"
                      label="Tanggal Penimbangan"
                      value={formData.transaction_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, transaction_date: e.target.value }))}
                      required
                    />
                    <Input
                      type="text"
                      label="Nama Penimbang (PIC)"
                      placeholder="Masukkan nama penimbang"
                      value={formData.pic_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, pic_name: e.target.value }))}
                      required
                    />
                    <Input
                      type="text"
                      label="Nama Pemilik Barang"
                      placeholder="Masukkan nama pemilik barang"
                      value={formData.owner_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, owner_name: e.target.value }))}
                      required
                    />
                    <Select
                      label="Jenis Kendaraan (Opsional)"
                      value={formData.jenis_kendaraan || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, jenis_kendaraan: e.target.value }))}
                      options={[
                        { value: '', label: '-- Pilih Kendaraan --' },
                        { value: 'Tronton', label: 'Tronton' },
                        { value: 'Fuso', label: 'Fuso' },
                        { value: 'Truk', label: 'Truk' },
                        { value: 'Pickup', label: 'Pickup' }
                      ]}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">Pilih Kategori Plastik</h3>
                    <div className="w-full sm:w-64">
                      <Input
                        type="search"
                        placeholder="Cari kategori..."
                        value={categorySearchQuery}
                        onChange={(e) => setCategorySearchQuery(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-2 border border-gray-100 rounded-lg bg-gray-50/50">
                    {categories
                      .filter(category => category.name.toLowerCase().includes(categorySearchQuery.toLowerCase()))
                      .map((category) => (
                      <Checkbox
                        key={category.id}
                        id={`category-${category.id}`}
                        label={category.name}
                        checked={formData.selected_categories.includes(category.id)}
                        onChange={(e) => handleCategoryChange(category.id, (e.target as HTMLInputElement).checked)}
                      />
                    ))}
                    {categories.filter(category => category.name.toLowerCase().includes(categorySearchQuery.toLowerCase())).length === 0 && (
                      <div className="col-span-full text-center py-4 text-gray-500 text-sm">
                        Kategori tidak ditemukan.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      if (validateStep1()) {
                        setStep(2);
                      }
                    }}
                    className="flex items-center gap-2"
                  >
                    Lanjut
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8">
                {/* Bagian Atas: Form Input Statis */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Input Berat Barang</h2>
                    <Button
                      variant="outline"
                      onClick={() => setFormData(prev => ({ ...prev, showAllCategories: !prev.showAllCategories }))}
                      size="sm"
                    >
                      {formData.showAllCategories ? 'Tampilkan Dipilih' : 'Tampilkan Semua'}
                    </Button>
                  </div>
                  
                  <div className="p-5 border-2 border-primary/20 rounded-xl bg-primary/5">
                    <div className="grid grid-cols-2 gap-4 w-full md:flex md:flex-row md:items-end">
                      <div className="col-span-2 md:flex-1">
                        <Select
                          label="Jenis Plastik"
                          value={currentItem.category_id}
                          onChange={(e) => updateCurrentItem('category_id', Number(e.target.value))}
                          options={[
                            { value: 0, label: '-- Pilih Jenis Plastik --' },
                            ...getAvailableCategories().map(cat => ({
                              value: cat.id,
                              label: cat.name
                            }))
                          ]}
                        />
                      </div>
                      <div className="col-span-1 md:flex-1">
                        <Input
                          type="number"
                          label="Berat (kg)"
                          placeholder="0.0"
                          value={currentItem.weight_kg}
                          onChange={(e) => updateCurrentItem('weight_kg', e.target.value)}
                          step="0.1"
                          min="0"
                        />
                      </div>
                      <div className="col-span-1 md:flex-1">
                        <Select
                          label="Satuan"
                          value={currentItem.satuan}
                          onChange={(e) => updateCurrentItem('satuan', e.target.value)}
                          options={[
                            { value: '', label: '-- Pilih Satuan --' },
                            { value: 'SAK', label: 'SAK' },
                            { value: 'PRESS', label: 'PRESS' },
                            { value: 'BAL', label: 'BAL' }
                          ]}
                        />
                      </div>
                      <div className="col-span-2 md:flex-1">
                        <Input
                          type="text"
                          label="Gabungan"
                          placeholder="Ketik keterangan..."
                          value={currentItem.gabungan}
                          onChange={(e) => updateCurrentItem('gabungan', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <Button
                        onClick={addItemToList}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-6"
                      >
                        <Plus className="h-5 w-5 mr-2" />
                        TAMBAH KE DAFTAR
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Bagian Bawah: Daftar Riwayat Item */}
                {formData.items.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-gray-700 font-medium pb-2 border-b border-gray-200">
                      <div className="h-6 w-6 bg-gray-100 border border-gray-200 rounded-md flex items-center justify-center text-xs font-bold">
                        {formData.items.length}
                      </div>
                      <h3>Riwayat Item Ditambahkan</h3>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {formData.items.map((item: any, index) => {
                        const categoryName = categories.find(c => c.id === item.category_id)?.name || 'Unknown';
                        return (
                          <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-900 text-lg">
                                {categoryName}
                              </span>
                              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                {item.gabungan && (
                                  <>
                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{item.gabungan}</span>
                                  </>
                                )}
                                {item.satuan && (
                                  <span className="text-gray-400">{item.satuan}</span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="font-bold text-xl text-primary">{item.weight_kg}</span>
                                <span className="text-sm text-gray-500 ml-1">kg</span>
                              </div>
                              <Button
                                variant="ghost"
                                onClick={() => removeItem(index)}
                                className="text-red-500 hover:bg-red-50 h-10 w-10 p-2 rounded-full"
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {formData.items.length === 0 && (
                  <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-lg">
                    <p className="text-gray-500">Belum ada item yang ditambahkan ke daftar.</p>
                  </div>
                )}

                <div className="flex justify-between pt-6 border-t border-gray-100">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Kembali
                  </Button>
                  <Button
                    onClick={handleSubmitClick}
                    disabled={submitting}
                    className="flex items-center gap-2 bg-secondary hover:bg-secondary/90"
                  >
                    <Plus className="h-4 w-4" />
                    {submitting ? 'Menyimpan...' : 'SIMPAN DATA'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Konfirmasi Simpan Data</h3>
                  <button 
                    onClick={() => setShowConfirmModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
                
                <p className="text-gray-600 mb-6">
                  Apakah Anda yakin ingin menyimpan <span className="font-bold">{formData.items.length} item</span> data penimbangan ini ke dalam sistem?
                </p>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirmModal(false)}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={handleConfirmSubmit}
                    disabled={submitting}
                    className="bg-secondary hover:bg-secondary/90 text-white"
                  >
                    {submitting ? 'Menyimpan...' : 'Ya, Simpan Data'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}