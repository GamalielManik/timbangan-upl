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

  // v2.0: Time tracking state
  const [startTime, setStartTime] = useState<Date | null>(null);

  const initialFormData: FormData = {
    transaction_date: new Date().toISOString().split('T')[0],
    pic_name: '',
    owner_name: '',
    selected_categories: [],
    items: [],
    showAllCategories: false,
  };

  const [formData, setFormData, clearFormData] = useLocalStorage<FormData>('input-form-data', initialFormData);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Add an empty item if no items exist when switching to step 2
  useEffect(() => {
    if (step === 2 && formData.items.length === 0) {
      setFormData(prev => ({
        ...prev,
        items: [{ category_id: 0, weight_kg: 0, satuan: '' }]
      }));
    }
  }, [step, formData.items.length, setFormData]);

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

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { category_id: 0, weight_kg: 0, satuan: '' }]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: 'category_id' | 'weight_kg' | 'satuan', value: number | string) => {
    // v2.0: Track start time on first weight input
    if (field === 'weight_kg' && value && Number(value) > 0 && !startTime) {
      setStartTime(new Date());
      console.log('[Time Tracking] Start time recorded:', new Date().toISOString());
    }

    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
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

  const validateStep2 = () => {
    if (formData.items.length === 0) {
      showToast('Tambah minimal satu item penimbangan', 'error');
      return false;
    }
    for (const item of formData.items) {
      if (!item.category_id) {
        showToast('Pilih jenis plastik untuk semua item', 'error');
        return false;
      }
      if (item.weight_kg <= 0) {
        showToast('Berat harus lebih dari 0', 'error');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;

    setSubmitting(true);
    try {
      // v2.0: Record end time
      const endTime = new Date();
      console.log('[Time Tracking] End time recorded:', endTime.toISOString());

      const session = await createWeighingSession({
        transaction_date: formData.transaction_date,
        pic_name: formData.pic_name.trim(),
        owner_name: formData.owner_name.trim(),
        selected_category_ids: formData.selected_categories,
        start_time: startTime?.toISOString(),
        end_time: endTime.toISOString(),
      });

      const itemsToInsert = formData.items.map((item, index) => ({
        session_id: session.id,
        category_id: item.category_id,
        sequence_number: index + 1,
        weight_kg: item.weight_kg,
        satuan: item.satuan || undefined,
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
                    <div className="md:col-span-2">
                      <Input
                        type="text"
                        label="Nama Pemilik Barang"
                        placeholder="Masukkan nama pemilik barang"
                        value={formData.owner_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, owner_name: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Pilih Kategori Plastik</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {categories.map((category) => (
                      <Checkbox
                        key={category.id}
                        id={`category-${category.id}`}
                        label={category.name}
                        checked={formData.selected_categories.includes(category.id)}
                        onChange={(e) => handleCategoryChange(category.id, (e.target as HTMLInputElement).checked)}
                      />
                    ))}
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
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Input Item Penimbangan</h2>
                  <Button
                    variant="outline"
                    onClick={() => setFormData(prev => ({ ...prev, showAllCategories: !prev.showAllCategories }))}
                    size="sm"
                  >
                    {formData.showAllCategories ? 'Tampilkan Dipilih' : 'Tampilkan Semua'}
                  </Button>
                </div>

                <div className="space-y-3">
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex gap-3 items-end p-4 border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <Select
                          label="Jenis Plastik"
                          value={item.category_id}
                          onChange={(e) => updateItem(index, 'category_id', Number(e.target.value))}
                          options={[
                            { value: 0, label: '-- Pilih Jenis Plastik --' },
                            ...getAvailableCategories().map(cat => ({
                              value: cat.id,
                              label: cat.name
                            }))
                          ]}
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          type="number"
                          label="Berat (kg)"
                          placeholder="0.0"
                          value={item.weight_kg || ''}
                          onChange={(e) => updateItem(index, 'weight_kg', Number(e.target.value))}
                          step="0.1"
                          min="0"
                        />
                      </div>
                      <div className="flex-1">
                        <Select
                          label="Satuan"
                          value={item.satuan || ''}
                          onChange={(e) => updateItem(index, 'satuan', e.target.value)}
                          options={[
                            { value: '', label: '-- Pilih Satuan (Opsional) --' },
                            { value: 'SAK', label: 'SAK' },
                            { value: 'PRESS', label: 'PRESS' },
                            { value: 'BAL', label: 'BAL' }
                          ]}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:text-red-700"
                        disabled={formData.items.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={addItem}
                  variant="outline"
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Item
                </Button>

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Kembali
                  </Button>
                  <Button
                    onClick={handleSubmit}
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
      </main>
    </div>
  );
}