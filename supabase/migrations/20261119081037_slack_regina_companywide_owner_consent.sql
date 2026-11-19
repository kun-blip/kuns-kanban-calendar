-- Recorded in the production Supabase migration history on 2026-11-19 as
-- 20261119081037_slack_regina_companywide_owner_consent.
-- This tracked copy reproduces the migration already applied to production.
-- The double send switches remain false until operational sign-off.

-- Consent belongs to an authenticated SHARED-EVENT OWNER, not to coworkers
-- who can merely view/edit the event. A consent is limited to one channel.
CREATE TABLE IF NOT EXISTS public.slack_owner_consents (
  owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id text NOT NULL CHECK (channel_id ~ '^[CG][A-Z0-9]{8,}$'),
  consented_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.slack_owner_consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.slack_owner_consents FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.slack_owner_consents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.slack_owner_consents TO service_role;
DROP POLICY IF EXISTS slack_owner_consents_self_read ON public.slack_owner_consents;
CREATE POLICY slack_owner_consents_self_read ON public.slack_owner_consents
  FOR SELECT TO authenticated USING (owner_id = (SELECT auth.uid()));

-- Every employee must independently consent using their own calendar login.
-- Merely accepting a shared-event invite is not consent to public Slack posts.
CREATE OR REPLACE FUNCTION public.slack_set_owner_consent(p_enabled boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_owner uuid := (SELECT auth.uid()); v_channel text;
BEGIN
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501';
  END IF;
  SELECT channel_id INTO v_channel FROM public.slack_integration_control WHERE singleton;
  IF v_channel IS NULL THEN RAISE EXCEPTION 'Slack channel is not configured'; END IF;
  IF p_enabled IS TRUE THEN
    INSERT INTO public.slack_owner_consents AS existing
      (owner_id, channel_id, consented_at, revoked_at, updated_at)
    VALUES (v_owner, v_channel, now(), NULL, now())
    ON CONFLICT (owner_id) DO UPDATE SET
      channel_id=EXCLUDED.channel_id,
      consented_at=CASE
        WHEN existing.revoked_at IS NOT NULL
          OR existing.channel_id IS DISTINCT FROM EXCLUDED.channel_id
        THEN now() ELSE existing.consented_at END,
      revoked_at=NULL,updated_at=now();
    -- Intentionally NO backfill of older shared events and NO queue inserts.
    RETURN true;
  END IF;
  UPDATE public.slack_owner_consents SET revoked_at=now(),updated_at=now()
    WHERE owner_id=v_owner AND revoked_at IS NULL;
  -- Clear pending work. Worker independently checks consent before every send.
  DELETE FROM public.slack_event_outbox WHERE owner_id=v_owner
    AND state IN ('pending','failed','processing');
  RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION public.slack_set_owner_consent(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.slack_set_owner_consent(boolean) TO authenticated;

-- Owner-scoped status. No list of coworker consents is exposed to clients.
CREATE OR REPLACE FUNCTION public.slack_integration_status()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE c public.slack_integration_control%ROWTYPE;
        v_configured boolean; v_consented boolean;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501';
  END IF;
  SELECT * INTO c FROM public.slack_integration_control WHERE singleton;
  v_configured := FOUND;
  SELECT EXISTS (
    SELECT 1 FROM public.slack_owner_consents x
    WHERE x.owner_id=(SELECT auth.uid()) AND x.channel_id=c.channel_id
      AND x.revoked_at IS NULL
  ) INTO v_consented;
  RETURN jsonb_build_object(
    'configured',v_configured,'channelName',c.channel_name,
    'channelId',c.channel_id,'workspace','111percent',
    'serverSendEnabled',COALESCE(c.send_enabled,false),
    'testApproved',COALESCE(c.test_message_approved,false),
    'ownerConsentRequired',true,'ownerConsented',v_consented);
END;
$$;
REVOKE ALL ON FUNCTION public.slack_integration_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.slack_integration_status() TO authenticated;

-- Legacy per-event selection must not be able to create jobs or grant consent.
REVOKE ALL ON FUNCTION public.slack_set_event_optin(uuid,boolean)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION app_private.slack_shared_event_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_channel text; v_has_card boolean; v_owner uuid;
BEGIN
  IF TG_OP='DELETE' THEN v_owner:=OLD.owner_id; ELSE v_owner:=NEW.owner_id; END IF;
  IF TG_OP='UPDATE' THEN
    IF NEW.title IS NOT DISTINCT FROM OLD.title
      AND NEW.start_date IS NOT DISTINCT FROM OLD.start_date
      AND NEW.end_date IS NOT DISTINCT FROM OLD.end_date THEN RETURN NEW; END IF;
  END IF;

  -- DB switch stays OFF while collecting consent. When it is eventually ON,
  -- only NEW changes queue; no old event sweep or delayed startup flood.
  SELECT c.channel_id INTO v_channel
  FROM public.slack_integration_control c
  JOIN public.slack_owner_consents o
    ON o.channel_id=c.channel_id AND o.revoked_at IS NULL
  WHERE c.singleton AND c.send_enabled IS TRUE
    AND o.owner_id=v_owner;
  IF v_channel IS NULL THEN
    IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  IF TG_OP='DELETE' THEN
    SELECT EXISTS(SELECT 1 FROM public.slack_event_messages
      WHERE event_id=OLD.id AND channel_id=v_channel AND cancelled IS FALSE)
      INTO v_has_card;
    IF v_has_card THEN
      PERFORM app_private.slack_queue_snapshot(OLD.id,OLD.owner_id,v_channel,
        'cancel',OLD.revision,OLD.title,OLD.start_date,OLD.end_date);
    END IF;
    RETURN OLD;
  END IF;

  -- Never send a notification for a shared event that already ended.
  IF NEW.end_date < (now() AT TIME ZONE 'Asia/Seoul')::date THEN
    -- If previously announced, update that same card with corrected dates;
    -- don't falsely label a still-existing event as deleted/cancelled.
    SELECT EXISTS(SELECT 1 FROM public.slack_event_messages
      WHERE event_id=NEW.id AND channel_id=v_channel AND cancelled IS FALSE)
      INTO v_has_card;
    IF v_has_card THEN
      PERFORM app_private.slack_queue_snapshot(NEW.id,NEW.owner_id,v_channel,
        'upsert',NEW.revision,NEW.title,NEW.start_date,NEW.end_date);
    END IF;
    RETURN NEW;
  END IF;

  PERFORM app_private.slack_queue_snapshot(NEW.id,NEW.owner_id,v_channel,
    'upsert',NEW.revision,NEW.title,NEW.start_date,NEW.end_date);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION app_private.slack_shared_event_trigger() FROM PUBLIC;

DROP TRIGGER IF EXISTS slack_shared_event_changed ON public.shared_events;
CREATE TRIGGER slack_shared_event_changed AFTER UPDATE ON public.shared_events
  FOR EACH ROW EXECUTE FUNCTION app_private.slack_shared_event_trigger();
DROP TRIGGER IF EXISTS slack_shared_event_created ON public.shared_events;
CREATE TRIGGER slack_shared_event_created AFTER INSERT ON public.shared_events
  FOR EACH ROW EXECUTE FUNCTION app_private.slack_shared_event_trigger();
DROP TRIGGER IF EXISTS slack_shared_event_deleted ON public.shared_events;
CREATE TRIGGER slack_shared_event_deleted BEFORE DELETE ON public.shared_events
  FOR EACH ROW EXECUTE FUNCTION app_private.slack_shared_event_trigger();

-- Do NOT enable public.slack_integration_control.send_enabled, the separate
-- Edge Function secret SLACK_SEND_ENABLED, or a pg_cron job in this migration.
