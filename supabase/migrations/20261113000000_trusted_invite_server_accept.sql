-- Keep explicitly trusted email invitations in sync even while recipients' apps are closed.
-- This function does not grant trust. It respects the recipient's own saved auto_accept preference.
CREATE OR REPLACE FUNCTION public.sharing_accept_trusted_on_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $body$
DECLARE
  v_sender_email text;
  v_recipient_id uuid;
  v_trusted boolean := false;
  v_already_joined boolean := false;
  v_updated_id uuid;
BEGIN
  IF NEW.status <> 'pending' OR NEW.expires_at <= now() THEN
    RETURN NEW;
  END IF;
  SELECT lower(u.email)
    INTO v_sender_email
    FROM auth.users AS u
   WHERE u.id = NEW.invited_by AND u.email_confirmed_at IS NOT NULL;
  IF v_sender_email IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT u.id
    INTO v_recipient_id
    FROM auth.users AS u
   WHERE lower(u.email) = lower(NEW.invited_email)
     AND u.email_confirmed_at IS NOT NULL
     AND u.id <> NEW.invited_by
   LIMIT 1;
  IF v_recipient_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT EXISTS(
      SELECT 1 FROM public.sharing_contacts c
       WHERE c.owner_id = v_recipient_id
         AND lower(c.email) = v_sender_email
         AND c.auto_accept IS TRUE
    ) INTO v_trusted;
  SELECT EXISTS(
      SELECT 1 FROM public.shared_event_members m
       WHERE m.event_id = NEW.event_id AND m.user_id = v_recipient_id
    ) INTO v_already_joined;
  IF NOT v_trusted AND NOT v_already_joined THEN
    RETURN NEW;
  END IF;
  -- Previously accepted participants must not become pending on repeat invitations.
  INSERT INTO public.shared_event_members(event_id,user_id,role)
    VALUES (NEW.event_id,v_recipient_id,NEW.role)
    ON CONFLICT (event_id,user_id) DO UPDATE SET role = EXCLUDED.role;
  UPDATE public.sharing_email_invites i
     SET status = 'accepted', decided_at = now()
   WHERE i.id = NEW.id AND i.status = 'pending'
   RETURNING i.id INTO v_updated_id;
  IF v_updated_id IS NOT NULL THEN
    INSERT INTO public.sharing_event_history(event_id,actor_id,action)
      VALUES (NEW.event_id,v_recipient_id,'joined');
  END IF;
  RETURN NEW;
END;
$body$;
REVOKE ALL ON FUNCTION public.sharing_accept_trusted_on_invite() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS sharing_auto_accept_trusted_invite ON public.sharing_email_invites;
CREATE TRIGGER sharing_auto_accept_trusted_invite
AFTER INSERT OR UPDATE OF status, role, invited_by, invited_email
ON public.sharing_email_invites
FOR EACH ROW
WHEN (NEW.status = 'pending')
EXECUTE FUNCTION public.sharing_accept_trusted_on_invite();
