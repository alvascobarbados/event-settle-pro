REVOKE ALL ON FUNCTION public.user_can_access_event(text) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.user_promoter_ids() FROM anon, authenticated, public;

REVOKE ALL ON FUNCTION public.ensure_promoter() FROM anon, public;
REVOKE ALL ON FUNCTION public.create_event(uuid, text, text, date, text, integer, text, jsonb, date, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.ensure_promoter() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_event(uuid, text, text, date, text, integer, text, jsonb, date, jsonb) TO authenticated;