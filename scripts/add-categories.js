const { createClient } = require('@supabase/supabase-js');

// Inisialisasi Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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

    const newCategoriesData = newCategories.map(name => ({
      name: name.trim(),
      created_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('plastic_categories')
      .insert(newCategoriesData)
      .select();

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Berhasil menambahkan kategori:', data);
  } catch (error) {
    console.error('Gagal menambahkan kategori:', error);
  }
}

// Jalankan fungsi
addNewCategories();