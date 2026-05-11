
-- Add status and signed_at to documents
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS signed_at timestamptz;

ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_status_check;
ALTER TABLE public.documents
  ADD CONSTRAINT documents_status_check CHECK (status IN ('pending','signed'));

-- signature_coordinates table
CREATE TABLE IF NOT EXISTS public.signature_coordinates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  signature_path text NOT NULL,
  page_number int NOT NULL DEFAULT 1,
  pos_x numeric NOT NULL,
  pos_y numeric NOT NULL,
  width numeric NOT NULL DEFAULT 200,
  height numeric NOT NULL DEFAULT 80,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.signature_coordinates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sig_coords select own" ON public.signature_coordinates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sig_coords insert own" ON public.signature_coordinates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sig_coords update own" ON public.signature_coordinates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sig_coords delete own" ON public.signature_coordinates FOR DELETE USING (auth.uid() = user_id);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('signatures','signatures',false)
ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('signed-documents','signed-documents',false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (per-user folder = first path segment)
CREATE POLICY "signatures own select" ON storage.objects FOR SELECT
  USING (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "signatures own insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "signatures own update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "signatures own delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "signed-docs own select" ON storage.objects FOR SELECT
  USING (bucket_id = 'signed-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "signed-docs own insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'signed-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "signed-docs own update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'signed-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "signed-docs own delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'signed-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
