-- Regina / KUNS Calendar Slack MVP. STAGED ONLY: never sends messages by itself.
-- This migration is distributed in source form. Do not apply to production
-- until the owner has reviewed the target channel and approved DB changes.
CREATE SCHEMA IF NOT EXISTS app_private;

CREATE TABLE IF NOT EXISTS public.slack_integration_control (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  team_id text NOT NULL CHECK (team_id ~ '^T[A-Z0-9]{8,}$'),
  channel_id text NOT NULL CHECK (channel_id ~ '^[CG][A-Z0-9]{8,}$'),
  channel_name text NOT NULL,
  send_enabled boolean NOT NULL DEFAULT false,
  test_message_approved boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.slack_integration_control ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.slack_integration_control FROM PUBLIC, anon, authenticated;
INSERT INTO public.slack_integration_control
  (singleton, team_id, channel_id, channel_name, send_enabled, test_message_approved)
VALUES (true, 'T8LGNJGSK', 'C09S1BE5YN9', '쌤띵-소재의-방', false, false)
ON CONFLICT (singleton) DO NOTHING;

-- One deliberate opt-in per *shared* event. Personal calendar snapshots,
-- private notes, and todos never enter Slack queues.
CREATE TABLE IF NOT EXISTS public.slack_event_optins (
  event_id uuid PRIMARY KEY REFERENCES public.shared_events(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.slack_event_optins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.slack_event_optins FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.slack_event_optins TO authenticated;
CREATE POLICY slack_event_optins_owner_read ON public.slack_event_optins
  FOR SELECT TO authenticated USING (owner_id = (SELECT auth.uid()));

-- Server-only coalescing outbox. A newer edit replaces a pending older edit.
-- No description, participants, notes, or user emails are stored here.
CREATE TABLE IF NOT EXISTS public.slack_event_outbox (
  event_id uuid PRIMARY KEY,
  owner_id uuid NOT NULL,
  channel_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('upsert', 'cancel')),
  revision bigint NOT NULL,
  title text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  state text NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'processing', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  claim_id uuid,
  claimed_at timestamptz,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS slack_event_outbox_ready_idx
  ON public.slack_event_outbox(next_attempt_at, updated_at)
  WHERE state IN ('pending','failed');
ALTER TABLE public.slack_event_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.slack_event_outbox FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.slack_event_messages (
  event_id uuid PRIMARY KEY,
  channel_id text NOT NULL,
  message_ts text NOT NULL CHECK (message_ts ~ '^[0-9]+[.][0-9]+$'),
  cancelled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.slack_event_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.slack_event_messages FROM PUBLIC, anon, authenticated;

-- First connection test is an entirely separate, at-most-once path.
-- Sending ONE approved test must not unlock the automatic event dispatcher.
CREATE TABLE IF NOT EXISTS public.slack_first_test_delivery (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  claimed_at timestamptz,
  sent_at timestamptz,
  message_ts text
);
ALTER TABLE public.slack_first_test_delivery ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.slack_first_test_delivery FROM PUBLIC, anon, authenticated;
INSERT INTO public.slack_first_test_delivery(singleton) VALUES(true)
  ON CONFLICT (singleton) DO NOTHING;

-- The server's service role can access these tables through PostgREST even
-- when the project's default table privileges were customized.
GRANT SELECT,INSERT,UPDATE,DELETE ON public.slack_integration_control TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.slack_event_optins TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.slack_event_outbox TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.slack_event_messages TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.slack_first_test_delivery TO service_role;

CREATE OR REPLACE FUNCTION app_private.slack_queue_snapshot(
  p_event_id uuid, p_owner_id uuid, p_channel_id text, p_action text,
  p_revision bigint, p_title text, p_start date, p_end date
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.slack_event_outbox
    (event_id,owner_id,channel_id,action,revision,title,start_date,end_date)
  VALUES (p_event_id,p_owner_id,p_channel_id,p_action,p_revision,p_title,p_start,p_end)
  ON CONFLICT(event_id) DO UPDATE SET
    owner_id=EXCLUDED.owner_id,channel_id=EXCLUDED.channel_id,
    action=EXCLUDED.action,revision=EXCLUDED.revision,title=EXCLUDED.title,
    start_date=EXCLUDED.start_date,end_date=EXCLUDED.end_date,
    state='pending',attempts=0,next_attempt_at=now(),claim_id=NULL,
    claimed_at=NULL,last_error=NULL,updated_at=now();
END;
$$;
REVOKE ALL ON FUNCTION app_private.slack_queue_snapshot(uuid,uuid,text,text,bigint,text,date,date) FROM PUBLIC;

CREATE OR REPLACE FUNCTION app_private.slack_shared_event_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_channel text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.title IS NOT DISTINCT FROM OLD.title
       AND NEW.start_date IS NOT DISTINCT FROM OLD.start_date
       AND NEW.end_date IS NOT DISTINCT FROM OLD.end_date THEN RETURN NEW; END IF;
    SELECT channel_id INTO v_channel FROM public.slack_event_optins
      WHERE event_id = NEW.id AND owner_id = NEW.owner_id;
    IF v_channel IS NOT NULL THEN
      PERFORM app_private.slack_queue_snapshot(NEW.id,NEW.owner_id,v_channel,
        'upsert',NEW.revision,NEW.title,NEW.start_date,NEW.end_date);
    END IF;
    RETURN NEW;
  END IF;
  -- BEFORE DELETE sees opt-in while FK cascade has not removed it.
  SELECT channel_id INTO v_channel FROM public.slack_event_optins
    WHERE event_id = OLD.id AND owner_id = OLD.owner_id;
  IF v_channel IS NOT NULL THEN
    PERFORM app_private.slack_queue_snapshot(OLD.id,OLD.owner_id,v_channel,
      'cancel',OLD.revision,OLD.title,OLD.start_date,OLD.end_date);
  END IF;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION app_private.slack_shared_event_trigger() FROM PUBLIC;
DROP TRIGGER IF EXISTS slack_shared_event_changed ON public.shared_events;
CREATE TRIGGER slack_shared_event_changed AFTER UPDATE ON public.shared_events
  FOR EACH ROW EXECUTE FUNCTION app_private.slack_shared_event_trigger();
DROP TRIGGER IF EXISTS slack_shared_event_deleted ON public.shared_events;
CREATE TRIGGER slack_shared_event_deleted BEFORE DELETE ON public.shared_events
  FOR EACH ROW EXECUTE FUNCTION app_private.slack_shared_event_trigger();

CREATE OR REPLACE FUNCTION public.slack_integration_status()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE c public.slack_integration_control%ROWTYPE;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
  SELECT * INTO c FROM public.slack_integration_control WHERE singleton;
  RETURN jsonb_build_object('configured',found,'channelName',c.channel_name,
    'channelId',c.channel_id,'workspace','111percent',
    'serverSendEnabled',COALESCE(c.send_enabled,false),
    'testApproved',COALESCE(c.test_message_approved,false));
END;
$$;
REVOKE ALL ON FUNCTION public.slack_integration_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.slack_integration_status() TO authenticated;

CREATE OR REPLACE FUNCTION public.slack_set_event_optin(p_event_id uuid, p_enabled boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_event public.shared_events%ROWTYPE; v_channel text;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_event FROM public.shared_events WHERE id=p_event_id FOR UPDATE;
  IF NOT FOUND OR v_event.owner_id <> (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Not the event owner' USING ERRCODE='42501';
  END IF;
  IF p_enabled IS DISTINCT FROM true THEN
    DELETE FROM public.slack_event_optins WHERE event_id=p_event_id AND owner_id=v_event.owner_id;
    DELETE FROM public.slack_event_outbox WHERE event_id=p_event_id;
    RETURN false;
  END IF;
  SELECT channel_id INTO v_channel FROM public.slack_integration_control WHERE singleton;
  IF v_channel IS NULL THEN RAISE EXCEPTION 'Slack channel is not configured'; END IF;
  INSERT INTO public.slack_event_optins(event_id,owner_id,channel_id)
  VALUES(p_event_id,v_event.owner_id,v_channel)
  ON CONFLICT(event_id) DO UPDATE SET channel_id=EXCLUDED.channel_id;
  PERFORM app_private.slack_queue_snapshot(v_event.id,v_event.owner_id,v_channel,
    'upsert',v_event.revision,v_event.title,v_event.start_date,v_event.end_date);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.slack_set_event_optin(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.slack_set_event_optin(uuid,boolean) TO authenticated;

-- These three RPCs are restricted to the server role, never desktop clients.
CREATE OR REPLACE FUNCTION public.slack_claim_outbox(p_limit integer DEFAULT 5)
RETURNS SETOF public.slack_event_outbox LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RETURN QUERY WITH selected AS (
    SELECT event_id FROM public.slack_event_outbox
    WHERE (state IN ('pending','failed') AND next_attempt_at <= now())
       OR (state='processing' AND claimed_at < now()-interval '5 minutes')
    ORDER BY updated_at ASC LIMIT LEAST(GREATEST(p_limit,1),10)
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.slack_event_outbox j SET state='processing',claim_id=gen_random_uuid(),
    claimed_at=now(),attempts=j.attempts+1,updated_at=now()
  FROM selected s WHERE j.event_id=s.event_id RETURNING j.*;
END;
$$;
REVOKE ALL ON FUNCTION public.slack_claim_outbox(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.slack_claim_outbox(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.slack_complete_outbox(
  p_event_id uuid,p_claim_id uuid,p_message_ts text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE j public.slack_event_outbox%ROWTYPE;
BEGIN
  SELECT * INTO j FROM public.slack_event_outbox
    WHERE event_id=p_event_id AND claim_id=p_claim_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF p_message_ts IS NOT NULL AND p_message_ts ~ '^[0-9]+[.][0-9]+$' THEN
    INSERT INTO public.slack_event_messages(event_id,channel_id,message_ts,cancelled)
    VALUES(j.event_id,j.channel_id,p_message_ts,j.action='cancel')
    ON CONFLICT (event_id) DO UPDATE SET cancelled=EXCLUDED.cancelled,updated_at=now();
  END IF;
  UPDATE public.slack_event_outbox SET state='sent',claim_id=NULL,claimed_at=NULL,
    last_error=NULL,updated_at=now() WHERE event_id=p_event_id AND claim_id=p_claim_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.slack_complete_outbox(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.slack_complete_outbox(uuid,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.slack_fail_outbox(
  p_event_id uuid,p_claim_id uuid,p_error text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.slack_event_outbox SET state='failed',claim_id=NULL,claimed_at=NULL,
    last_error=left(coalesce(p_error,'Slack failed'),120),
    next_attempt_at=now()+make_interval(secs=>LEAST(3600,10*power(2,LEAST(attempts,8)))::integer),
    updated_at=now()
  WHERE event_id=p_event_id AND claim_id=p_claim_id;
END;
$$;
REVOKE ALL ON FUNCTION public.slack_fail_outbox(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.slack_fail_outbox(uuid,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.slack_claim_first_test()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.slack_first_test_delivery d SET claimed_at=now()
  WHERE d.singleton AND d.claimed_at IS NULL AND d.sent_at IS NULL
    AND EXISTS(SELECT 1 FROM public.slack_integration_control c
      WHERE c.singleton AND c.test_message_approved IS TRUE);
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.slack_claim_first_test() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.slack_claim_first_test() TO service_role;

CREATE OR REPLACE FUNCTION public.slack_complete_first_test(p_message_ts text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_message_ts !~ '^[0-9]+[.][0-9]+$' THEN RETURN false; END IF;
  UPDATE public.slack_first_test_delivery SET sent_at=now(),message_ts=p_message_ts
  WHERE singleton AND claimed_at IS NOT NULL AND sent_at IS NULL;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.slack_complete_first_test(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.slack_complete_first_test(text) TO service_role;
