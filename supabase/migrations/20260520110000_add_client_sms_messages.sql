CREATE TABLE IF NOT EXISTS public.client_sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  direction TEXT NOT NULL DEFAULT 'outbound',
  status TEXT NOT NULL DEFAULT 'sent',
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_sms_messages_user_created
  ON public.client_sms_messages(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_sms_messages_client_created
  ON public.client_sms_messages(client_id, created_at ASC);

ALTER TABLE public.client_sms_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_sms_messages select own" ON public.client_sms_messages;
CREATE POLICY "client_sms_messages select own"
  ON public.client_sms_messages
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "client_sms_messages insert own" ON public.client_sms_messages;
CREATE POLICY "client_sms_messages insert own"
  ON public.client_sms_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "client_sms_messages update own" ON public.client_sms_messages;
CREATE POLICY "client_sms_messages update own"
  ON public.client_sms_messages
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "client_sms_messages delete own" ON public.client_sms_messages;
CREATE POLICY "client_sms_messages delete own"
  ON public.client_sms_messages
  FOR DELETE
  USING (auth.uid() = user_id);
