-- clients
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  notes TEXT,
  tags TEXT[],
  ghl_contact_id TEXT,
  last_synced_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_user ON public.clients(user_id);
CREATE UNIQUE INDEX idx_clients_user_ghl ON public.clients(user_id, ghl_contact_id) WHERE ghl_contact_id IS NOT NULL;
CREATE INDEX idx_clients_email ON public.clients(user_id, lower(email)) WHERE email IS NOT NULL;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients select own" ON public.clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "clients insert own" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clients update own" ON public.clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "clients delete own" ON public.clients FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- integration_settings
CREATE TABLE public.integration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  location_id TEXT,
  webhook_secret TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_full_sync_at TIMESTAMPTZ,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integration_settings select own" ON public.integration_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "integration_settings insert own" ON public.integration_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "integration_settings update own" ON public.integration_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "integration_settings delete own" ON public.integration_settings FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_integration_settings_updated_at
  BEFORE UPDATE ON public.integration_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- integration_sync_log
CREATE TABLE public.integration_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  direction TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  status TEXT NOT NULL,
  error TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_log_user_created ON public.integration_sync_log(user_id, created_at DESC);

ALTER TABLE public.integration_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_log select own" ON public.integration_sync_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sync_log insert own" ON public.integration_sync_log FOR INSERT WITH CHECK (auth.uid() = user_id);
