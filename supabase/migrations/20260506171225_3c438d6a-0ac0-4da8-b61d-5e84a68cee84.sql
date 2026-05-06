-- Add cleared flag to transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS cleared boolean NOT NULL DEFAULT false;

-- Add image paths to listings
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS image_paths text[] NOT NULL DEFAULT '{}';

-- Listing images storage bucket (public read, owner write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-images', 'listing-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "listing images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-images');

-- Owner upload
CREATE POLICY "listing images owner insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'listing-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owner update
CREATE POLICY "listing images owner update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'listing-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owner delete
CREATE POLICY "listing images owner delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'listing-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );