-- ============================================
-- Taula de perfils d'usuari
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Qualsevol usuari autenticat pot veure perfils (per a la cerca d'amics)
CREATE POLICY "Perfils visibles per usuaris autenticats" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Cada usuari només pot modificar el seu propi perfil
CREATE POLICY "Usuaris poden actualitzar el seu perfil" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Permet inserir el propi perfil (registre)
CREATE POLICY "Usuaris poden crear el seu perfil" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger per actualitzar updated_at
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profiles_updated_at();

-- Trigger per crear automàticament un perfil en registrar-se
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
