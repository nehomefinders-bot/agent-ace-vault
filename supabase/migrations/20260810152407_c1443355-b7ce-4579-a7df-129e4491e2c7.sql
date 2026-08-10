CREATE TABLE public.chat_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_folders TO authenticated;
GRANT ALL ON public.chat_folders TO service_role;

ALTER TABLE public.chat_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chat folders" ON public.chat_folders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own chat folders" ON public.chat_folders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own chat folders" ON public.chat_folders FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own chat folders" ON public.chat_folders FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.chat_sessions ADD COLUMN folder_id uuid REFERENCES public.chat_folders(id) ON DELETE SET NULL;

CREATE INDEX idx_chat_sessions_folder_id ON public.chat_sessions(folder_id);