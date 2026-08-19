UPDATE public.lines SET sort_order = sort_order + 2 WHERE section = 'expenses' AND parent_id IS NULL;
UPDATE public.lines SET section = 'expenses' WHERE section = 'cos';
ALTER TABLE public.lines DROP CONSTRAINT lines_section_check;
ALTER TABLE public.lines ADD CONSTRAINT lines_section_check CHECK (section = ANY (ARRAY['revenue'::text, 'expenses'::text]));