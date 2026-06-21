
CREATE TABLE IF NOT EXISTS public.listing_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  path text NOT NULL,
  size bigint NOT NULL DEFAULT 0,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listing_documents_listing_id_idx ON public.listing_documents(listing_id);
CREATE INDEX IF NOT EXISTS listing_documents_user_id_idx ON public.listing_documents(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_documents TO authenticated;
GRANT ALL ON public.listing_documents TO service_role;

ALTER TABLE public.listing_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own listing documents"
  ON public.listing_documents FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Storage policies for listing-documents bucket
CREATE POLICY "Users read own listing documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'listing-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own listing documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'listing-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own listing documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'listing-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own listing documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'listing-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
