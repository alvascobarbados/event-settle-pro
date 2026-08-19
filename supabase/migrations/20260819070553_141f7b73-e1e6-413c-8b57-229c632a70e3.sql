CREATE TABLE public.settings (
  user_id uuid PRIMARY KEY,
  currency text NOT NULL DEFAULT 'BBD',
  vat_rate numeric(6,3) NOT NULL DEFAULT 17.5,
  business text NOT NULL DEFAULT ''
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings own" ON public.settings FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.events (
  id text PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  date date NOT NULL,
  venue text NOT NULL DEFAULT '',
  capacity int,
  headcount int,
  comps int,
  stage text NOT NULL CHECK (stage IN ('planning','reconciling','closed')),
  accent jsonb NOT NULL,
  locked_at date,
  as_of date NOT NULL,
  budget_baseline jsonb,
  cash_baseline jsonb,
  vat_exported boolean NOT NULL DEFAULT false,
  vat_filed_date date,
  input_vat_override numeric(12,2),
  planning_rows jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events own" ON public.events FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.lines (
  id text PRIMARY KEY,
  user_id uuid NOT NULL,
  event_id text NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  section text NOT NULL CHECK (section IN ('revenue','cos','expenses')),
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 1,
  budget_amount numeric(12,2) NOT NULL DEFAULT 0,
  actual_amount numeric(12,2) NOT NULL DEFAULT 0,
  vat_exempt boolean,
  vat_override numeric(12,2),
  parent_id text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lines TO authenticated;
GRANT ALL ON public.lines TO service_role;
ALTER TABLE public.lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lines own" ON public.lines FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.money_in (
  id text PRIMARY KEY,
  user_id uuid NOT NULL,
  event_id text NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  counterparty text NOT NULL,
  description text NOT NULL DEFAULT '',
  amount numeric(12,2) NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  line_id text,
  vat_exempt boolean,
  count_in_actual boolean
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.money_in TO authenticated;
GRANT ALL ON public.money_in TO service_role;
ALTER TABLE public.money_in ENABLE ROW LEVEL SECURITY;
CREATE POLICY "money_in own" ON public.money_in FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.bills (
  id text PRIMARY KEY,
  user_id uuid NOT NULL,
  event_id text NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  counterparty text NOT NULL,
  description text NOT NULL DEFAULT '',
  amount numeric(12,2) NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  line_id text,
  vat_exempt boolean,
  count_in_actual boolean
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bills TO authenticated;
GRANT ALL ON public.bills TO service_role;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bills own" ON public.bills FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.payments (
  id text PRIMARY KEY,
  user_id uuid NOT NULL,
  parent_kind text NOT NULL CHECK (parent_kind IN ('in','out')),
  parent_id text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  date date NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments own" ON public.payments FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.files (
  id text PRIMARY KEY,
  user_id uuid NOT NULL,
  event_id text NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  date date NOT NULL,
  line_id text,
  amount numeric(12,2),
  storage_path text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.files TO authenticated;
GRANT ALL ON public.files TO service_role;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "files own" ON public.files FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_lines_event ON public.lines(user_id, event_id);
CREATE INDEX idx_money_in_event ON public.money_in(user_id, event_id);
CREATE INDEX idx_bills_event ON public.bills(user_id, event_id);
CREATE INDEX idx_payments_parent ON public.payments(user_id, parent_kind, parent_id);
CREATE INDEX idx_files_event ON public.files(user_id, event_id);