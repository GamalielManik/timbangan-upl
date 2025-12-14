import { addPlasticCategories } from '../src/lib/supabase/database.js';

const newCategories = [
  'PPS KOTOR',
  'PP KOTOR',
  'PP NILON',
  'PP TERASI',
  'PP SABLON',
  'PP ROTI',
  'METALIS',
  'METALIS ROLL',
  'SLITING',
  'LIT MINERAL',
  'LIT RASA'
];

async function addNewCategories() {
  try {
    console.log('Menambahkan kategori plastik baru...');
    const result = await addPlasticCategories(newCategories);
    console.log('Berhasil menambahkan kategori:', result);
  } catch (error) {
    console.error('Gagal menambahkan kategori:', error);
  }
}

// Jalankan fungsi
addNewCategories();