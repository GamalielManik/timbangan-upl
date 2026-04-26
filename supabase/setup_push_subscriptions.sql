CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT UNIQUE NOT NULL, -- Endpoint unik untuk mencegah duplikasi perangkat
  subscription_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Mengamankan tabel dengan RLS (Row Level Security)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy agar user anonim (PWA) bisa mendaftarkan perangkat mereka
CREATE POLICY "Enable insert for anonymous users" ON public.push_subscriptions
  FOR INSERT WITH CHECK (true);

-- Policy agar Edge Function (Service Role) bisa membaca dan menghapus
CREATE POLICY "Enable read/delete/update for all" ON public.push_subscriptions
  USING (true);