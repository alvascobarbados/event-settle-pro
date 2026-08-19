CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_id uuid NOT NULL REFERENCES public.promoters(id) ON DELETE CASCADE,
  name text NOT NULL,
  aliases text[] NOT NULL DEFAULT '{}',
  default_category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  default_subcategory_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  vat_registered boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX vendors_promoter_name_key ON public.vendors (promoter_id, lower(name));

REVOKE ALL ON public.vendors FROM anon, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
GRANT ALL ON public.vendors TO service_role;

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors FORCE ROW LEVEL SECURITY;

CREATE POLICY "vendors by membership" ON public.vendors FOR ALL TO authenticated
  USING (promoter_id IN (SELECT user_promoter_ids()))
  WITH CHECK (promoter_id IN (SELECT user_promoter_ids()));

/* ---- backfill one vendor per distinct child-line vendor name, per promoter ---- */
WITH child AS (
  SELECT ep.promoter_id,
         l.name,
         l.vat_override,
         CASE WHEN c.parent_id IS NOT NULL THEN c.parent_id ELSE c.id END AS cat_id,
         CASE WHEN c.parent_id IS NOT NULL THEN c.id ELSE NULL END AS sub_id
  FROM public.lines l
  JOIN public.event_promoters ep ON ep.event_id = l.event_id
  LEFT JOIN public.categories c ON c.id = l.category_id
  WHERE l.parent_id IS NOT NULL AND l.section = 'expenses' AND btrim(l.name) <> ''
), ranked AS (
  SELECT promoter_id, name, cat_id, sub_id, count(*) AS freq,
         row_number() OVER (PARTITION BY promoter_id, lower(name) ORDER BY count(*) DESC, cat_id) AS rn
  FROM child
  GROUP BY promoter_id, name, cat_id, sub_id
), vat AS (
  SELECT promoter_id, lower(name) AS lname, bool_or(vat_override IS NOT NULL) AS vat_registered
  FROM child GROUP BY promoter_id, lower(name)
)
INSERT INTO public.vendors (promoter_id, name, default_category_id, default_subcategory_id, vat_registered)
SELECT r.promoter_id, r.name, r.cat_id, r.sub_id, COALESCE(v.vat_registered, false)
FROM ranked r
LEFT JOIN vat v ON v.promoter_id = r.promoter_id AND v.lname = lower(r.name)
WHERE r.rn = 1
ON CONFLICT DO NOTHING;