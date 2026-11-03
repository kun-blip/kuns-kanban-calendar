-- Additive migration: team-wide reusable stickers and date/event reactions.
-- Existing shared_events, calendar records, members, and permissions are untouched.
-- The library is shared with authenticated app accounts, not the anonymous public.

INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('team-calendar-stickers','team-calendar-stickers',false,2097152,ARRAY['image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.team_stickers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploader_email text NOT NULL DEFAULT lower(coalesce(auth.jwt()->>'email','')),
  name text NOT NULL CHECK(char_length(btrim(name)) BETWEEN 1 AND 32),
  image_path text NOT NULL UNIQUE CHECK(image_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(png|webp|gif)$'),
  mime_type text NOT NULL CHECK(mime_type IN ('image/png','image/webp','image/gif')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.team_sticker_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sticker_id uuid NOT NULL REFERENCES public.team_stickers(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_email text NOT NULL DEFAULT lower(coalesce(auth.jwt()->>'email','')),
  target_kind text NOT NULL CHECK(target_kind IN ('date','event')),
  target_date date,
  shared_event_id uuid REFERENCES public.shared_events(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_sticker_target_check CHECK (
    (target_kind='date' AND target_date IS NOT NULL AND shared_event_id IS NULL)
    OR (target_kind='event' AND shared_event_id IS NOT NULL AND target_date IS NULL)
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS team_sticker_unique_date_mark
  ON public.team_sticker_marks(sticker_id,actor_id,target_date) WHERE target_kind='date';
CREATE UNIQUE INDEX IF NOT EXISTS team_sticker_unique_event_reaction
  ON public.team_sticker_marks(sticker_id,actor_id,shared_event_id) WHERE target_kind='event';
CREATE INDEX IF NOT EXISTS team_stickers_uploader_idx ON public.team_stickers(uploader_id);
CREATE INDEX IF NOT EXISTS team_sticker_marks_actor_idx ON public.team_sticker_marks(actor_id);
CREATE INDEX IF NOT EXISTS team_sticker_marks_date_idx ON public.team_sticker_marks(target_date) WHERE target_kind='date';
CREATE INDEX IF NOT EXISTS team_sticker_marks_event_idx ON public.team_sticker_marks(shared_event_id) WHERE target_kind='event';

ALTER TABLE public.team_stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_sticker_marks ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,DELETE ON public.team_stickers TO authenticated;
GRANT SELECT,INSERT,DELETE ON public.team_sticker_marks TO authenticated;

CREATE POLICY team_stickers_read ON public.team_stickers FOR SELECT TO authenticated
USING (true);
CREATE POLICY team_stickers_add ON public.team_stickers FOR INSERT TO authenticated
WITH CHECK (
  uploader_id=(SELECT auth.uid())
  AND uploader_email=lower(coalesce((SELECT auth.jwt()->>'email'),''))
  AND split_part(image_path,'/',1)=(SELECT auth.uid())::text
);
CREATE POLICY team_stickers_remove ON public.team_stickers FOR DELETE TO authenticated
USING (uploader_id=(SELECT auth.uid()));

CREATE POLICY team_sticker_marks_read ON public.team_sticker_marks FOR SELECT TO authenticated
USING (
  target_kind='date' OR EXISTS (
    SELECT 1 FROM public.shared_events se WHERE se.id=team_sticker_marks.shared_event_id
  )
);
CREATE POLICY team_sticker_marks_add ON public.team_sticker_marks FOR INSERT TO authenticated
WITH CHECK (
  actor_id=(SELECT auth.uid())
  AND actor_email=lower(coalesce((SELECT auth.jwt()->>'email'),''))
  AND EXISTS (SELECT 1 FROM public.team_stickers s WHERE s.id=sticker_id)
  AND (target_kind='date' OR EXISTS (
    SELECT 1 FROM public.shared_events se WHERE se.id=team_sticker_marks.shared_event_id
  ))
);
CREATE POLICY team_sticker_marks_remove ON public.team_sticker_marks FOR DELETE TO authenticated
USING (actor_id=(SELECT auth.uid()));

-- Private image bucket: signed-in teammates may read; only uploader may add/remove.
CREATE POLICY team_sticker_images_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='team-calendar-stickers');
CREATE POLICY team_sticker_images_add ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='team-calendar-stickers' AND split_part(name,'/',1)=(SELECT auth.uid())::text);
CREATE POLICY team_sticker_images_remove ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='team-calendar-stickers' AND split_part(name,'/',1)=(SELECT auth.uid())::text);
