DELETE FROM public.files WHERE event_id = 'e24-7bd42770' AND id LIKE 'imp-%';
UPDATE public.files SET storage_path = NULL WHERE event_id = 'e24-7bd42770';