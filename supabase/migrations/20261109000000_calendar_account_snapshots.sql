-- CS: per-account personal calendar snapshots.
-- Existing shared_events, memberships, invitations and their RLS are untouched.
CREATE TABLE IF NOT EXISTS public.calendar_account_snapshots (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision >= 1),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendar_snapshot_shape CHECK (
    jsonb_typeof(payload) = 'object'
    AND jsonb_typeof(payload->'events') = 'array'
    AND jsonb_typeof(payload->'notes') = 'array'
    AND jsonb_typeof(payload->'todos') = 'array'
    AND jsonb_typeof(payload->'games') = 'array'
    AND jsonb_typeof(payload->'shortcuts') = 'array'
  )
);

CREATE OR REPLACE FUNCTION public.calendar_account_revision_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Cannot change calendar owner';
  END IF;
  IF NEW.revision IS DISTINCT FROM OLD.revision + 1 THEN
    RAISE EXCEPTION 'Invalid calendar revision';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS calendar_account_revision_guard ON public.calendar_account_snapshots;
CREATE TRIGGER calendar_account_revision_guard
BEFORE UPDATE ON public.calendar_account_snapshots
FOR EACH ROW EXECUTE FUNCTION public.calendar_account_revision_guard();

ALTER TABLE public.calendar_account_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.calendar_account_snapshots FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.calendar_account_snapshots TO authenticated;

DROP POLICY IF EXISTS calendar_snapshot_select ON public.calendar_account_snapshots;
DROP POLICY IF EXISTS calendar_snapshot_insert ON public.calendar_account_snapshots;
DROP POLICY IF EXISTS calendar_snapshot_update ON public.calendar_account_snapshots;

CREATE POLICY calendar_snapshot_select ON public.calendar_account_snapshots
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY calendar_snapshot_insert ON public.calendar_account_snapshots
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY calendar_snapshot_update ON public.calendar_account_snapshots
  FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
