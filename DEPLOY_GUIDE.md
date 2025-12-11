# Panduan Deploy Aplikasi Timbangan UPL ke Vercel

Berikut adalah langkah-langkah lengkap untuk mendeploy aplikasi web timbangan UPL ke Vercel.

## Prasyarat

1. **Akun GitHub** - Pastikan kode Anda sudah di-push ke repository GitHub
2. **Akun Vercel** - Daftar di [vercel.com](https://vercel.com) menggunakan akun GitHub
3. **Project Supabase** - Pastikan project Supabase Anda sudah siap

## Langkah 1: Persiapan Repository

1. Pastikan semua perubahan sudah di-commit ke repository lokal:
   ```bash
   git add .
   git commit -m "Ready for deploy to Vercel"
   ```

2. Push kode ke GitHub:
   ```bash
   git push origin main
   ```
   (ganti `main` dengan nama branch Anda jika berbeda)

## Langkah 2: Setup Project di Vercel

1. Login ke [Vercel Dashboard](https://vercel.com/dashboard)
2. Klik **"Add New..."** → **"Project"**
3. Pilih repository GitHub Anda dari list
4. Vercel akan otomatis mendeteksi bahwa ini adalah project Next.js

## Langkah 3: Konfigurasi Build & Environment

1. **Build Settings** (biasanya otomatis terisi):
   - **Framework Preset**: Next.js
   - **Root Directory**: ./
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

2. **Environment Variables** - Tambahkan environment variables:
   - Klik **"Environment Variables"**
   - Tambahkan variabel berikut:
     ```
     NEXT_PUBLIC_SUPABASE_URL = https://ajipograkjrcbyasnrmi.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqaXBvZ3Jha2pyY2J5YXNucm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNjM4NjUsImV4cCI6MjA4MDgzOTg2NX0.6D8LbwM_S2yMvHgZaORmASX_MytHHUcgakVD2kPWrLM
     ```
   - Pastikan nilai-nilai ini sesuai dengan project Supabase Anda

## Langkah 4: Deploy

1. Klik **"Deploy"**
2. Tunggu proses build selesai (biasanya 2-5 menit)
3. Jika berhasil, Anda akan mendapatkan URL production

## Langkah 5: Verifikasi Deploy

1. Buka URL yang diberikan Vercel
2. Test semua fitur aplikasi:
   - Input data timbangan
   - View history
   - Export PDF
   - Grafik statistik

## troubleshooting

### 1. Build Gagal

- **Error: Module not found**
  - Pastikan `npm install` berjalan sukses
  - Cek file `package.json` sudah benar

- **Error: Environment variables**
  - Pastikan semua variabel diisi dengan benar
  - Restart deployment jika perlu

### 2. Runtime Error

- **Error: Supabase connection**
  - Verifikasi URL dan API key Supabase
  - Pastikan RLS (Row Level Security) di Supabase sudah di konfigurasi

- **Error: CORS**
  - Tambahkan domain Vercel Anda ke allowed origins di Supabase settings

### 3. Data Tidak Muncul

- Pastikan tabel di Supabase sudah dibuat
- Cek permission/Rules di Supabase
- Verify environment variables benar

## Best Practices

1. **Auto Deploy** - Aktifkan auto-deploy untuk branch `main`
2. **Preview Deployments** - Aktifkan untuk setiap PR
3. **Custom Domain** - Tambahkan custom domain jika diperlukan
4. **Analytics** - Aktifkan Vercel Analytics untuk monitoring

## Update Aplikasi

Untuk update aplikasi:

1. Lakukan perubahan kode
2. Commit dan push ke GitHub:
   ```bash
   git add .
   git commit -m "Update feature"
   git push origin main
   ```
3. Vercel akan otomatis mendeploy ulang

## Custom Domain (Optional)

Jika ingin menggunakan custom domain:

1. Buka project settings di Vercel
2. Klik **"Domains"**
3. Tambahkan domain Anda
4. Update DNS records sesuai instruksi Vercel

## Support

Jika mengalami masalah:
- Cek [Vercel Docs](https://vercel.com/docs)
- Cek error logs di Vercel dashboard
- Pastikan semua konfigurasi sudah benar