import { supabase } from "@/integrations/supabase/client";
import { seedDb } from "./seed";
import type {
  Accent,
  Bill,
  Db,
  EventRecord,
  FileRecord,
  Line,
  MoneyIn,
  Payment,
  Section,
  Settings,
  Stage,
} from "./types";

/* ------------------------------------------------------------------ */
/* Row <-> app-shape mapping                                           */
/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>;

const n = (v: unknown): number => Number(v ?? 0);
const on = (v: unknown): number | undefined => (v === null || v === undefined ? undefined : Number(v));
const os = (v: unknown): string | undefined => (v === null || v === undefined ? undefined : String(v));
const ob = (v: unknown): boolean | undefined => (v === null || v === undefined ? undefined : Boolean(v));

export interface Promoter {
  id: string;
  name: string;
  currency: string;
  vatRate: number;
  username?: string;
  code: string;
}


function rowToEvent(r: Row): EventRecord {
  return {
    id: String(r["id"]),
    eventNumber: on(r["event_number"]),
    name: String(r["name"]),
    date: String(r["date"]),
    venue: String(r["venue"] ?? ""),
    capacity: on(r["capacity"]),
    headcount: on(r["headcount"]),
    comps: on(r["comps"]),
    stage: String(r["stage"]) as Stage,
    accent: r["accent"] as Accent,
    lockedAt: os(r["locked_at"]),
    asOf: String(r["as_of"]),
    budgetBaseline: (r["budget_baseline"] as EventRecord["budgetBaseline"]) ?? undefined,
    cashBaseline: (r["cash_baseline"] as EventRecord["cashBaseline"]) ?? undefined,
    inputVatOverride: on(r["input_vat_override"]),
    vatExported: Boolean(r["vat_exported"]),
    vatFiledDate: os(r["vat_filed_date"]),
    planningRows: (r["planning_rows"] as EventRecord["planningRows"]) ?? undefined,
  };
}

/** Fields the create_event RPC does not take; applied straight after creation. */
function eventExtrasRow(e: EventRecord): Row {
  return {
    headcount: e.headcount ?? null,
    comps: e.comps ?? null,
    locked_at: e.lockedAt ?? null,
    budget_baseline: e.budgetBaseline ?? null,
    cash_baseline: e.cashBaseline ?? null,
    vat_exported: e.vatExported ?? false,
    vat_filed_date: e.vatFiledDate ?? null,
    input_vat_override: e.inputVatOverride ?? null,
  };
}

function rowToLine(r: Row): Line {
  return {
    id: String(r["id"]),
    eventId: String(r["event_id"]),
    section: String(r["section"]) as Section,
    name: String(r["name"]),
    sortOrder: n(r["sort_order"]),
    budgetAmount: n(r["budget_amount"]),
    actualAmount: n(r["actual_amount"]),
    vatExempt: ob(r["vat_exempt"]),
    vatOverride: on(r["vat_override"]),
    detail: os(r["detail"]),
    ref: os(r["ref"]),
    parentId: os(r["parent_id"]),
  };
}

function lineToRow(l: Line): Row {
  return {
    id: l.id,
    event_id: l.eventId,
    section: l.section,
    name: l.name,
    sort_order: l.sortOrder,
    budget_amount: l.budgetAmount,
    actual_amount: l.actualAmount,
    vat_exempt: l.vatExempt ?? null,
    vat_override: l.vatOverride ?? null,
    detail: l.detail ?? null,
    ref: l.ref ?? null,
    parent_id: l.parentId ?? null,
  };
}

function rowToLedger(r: Row, payments: Payment[]): MoneyIn {
  return {
    id: String(r["id"]),
    eventId: String(r["event_id"]),
    counterparty: String(r["counterparty"]),
    description: String(r["description"] ?? ""),
    amount: n(r["amount"]),
    dueDate: String(r["due_date"]),
    lineId: os(r["line_id"]),
    vatExempt: ob(r["vat_exempt"]),
    countInActual: ob(r["count_in_actual"]),
    payments,
  };
}

export function ledgerToRow(r: MoneyIn | Bill): Row {
  return {
    id: r.id,
    event_id: r.eventId,
    counterparty: r.counterparty,
    description: r.description,
    amount: r.amount,
    due_date: r.dueDate,
    line_id: r.lineId ?? null,
    vat_exempt: r.vatExempt ?? null,
    count_in_actual: r.countInActual ?? null,
  };
}

function rowToFile(r: Row): FileRecord {
  return {
    id: String(r["id"]),
    eventId: String(r["event_id"]),
    name: String(r["name"]),
    type: String(r["type"]) as FileRecord["type"],
    date: String(r["date"]),
    lineId: os(r["line_id"]),
    amount: on(r["amount"]),
    storagePath: os(r["storage_path"]),
  };
}

export function fileToRow(f: FileRecord): Row {
  return {
    id: f.id,
    event_id: f.eventId,
    name: f.name,
    type: f.type,
    date: f.date,
    line_id: f.lineId ?? null,
    amount: f.amount ?? null,
    storage_path: f.storagePath ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* Promoter — the account that owns the data                           */
/* ------------------------------------------------------------------ */

export async function ensurePromoter(): Promise<Promoter> {
  const { data, error } = await supabase.rpc("ensure_promoter" as never);
  if (error) throw error;
  const r = (Array.isArray(data) ? data[0] : data) as Row;
  return {
    id: String(r["id"]),
    name: String(r["name"] ?? ""),
    currency: String(r["currency"] ?? "BBD"),
    vatRate: n(r["vat_rate"] ?? 17.5),
    username: os(r["username"]),
    code: String(r["code"] ?? ""),
  };
}


/** Storage prefix for a promoter's event documents. */
export const storagePrefix = (promoterId: string, eventId: string) => `${promoterId}/${eventId}`;

/* ------------------------------------------------------------------ */
/* Load                                                               */
/* ------------------------------------------------------------------ */

export async function loadDb(promoter: Promoter): Promise<Db> {
  const [events, lines, moneyIn, bills, payments, files] = await Promise.all([
    supabase.from("events").select("*").order("date", { ascending: false }),
    supabase.from("lines").select("*").order("sort_order", { ascending: true }),
    supabase.from("money_in").select("*"),
    supabase.from("bills").select("*"),
    supabase.from("payments").select("*").order("date", { ascending: true }),
    supabase.from("files").select("*").order("date", { ascending: false }),
  ]);

  const err = [events, lines, moneyIn, bills, payments, files].find((r) => r.error)?.error;
  if (err) throw err;

  const payRows = (payments.data ?? []) as Row[];
  const paymentsFor = (kind: "in" | "out", id: string): Payment[] =>
    payRows
      .filter((p) => p["parent_kind"] === kind && p["parent_id"] === id)
      .map((p) => ({ id: String(p["id"]), amount: n(p["amount"]), date: String(p["date"]) }));

  const settings: Settings = {
    currency: promoter.currency,
    vatRate: promoter.vatRate,
    business: promoter.name,
  };

  return {
    settings,
    events: ((events.data ?? []) as Row[]).map(rowToEvent),
    lines: ((lines.data ?? []) as Row[]).map(rowToLine),
    moneyIn: ((moneyIn.data ?? []) as Row[]).map((r) => rowToLedger(r, paymentsFor("in", String(r["id"])))),
    bills: ((bills.data ?? []) as Row[]).map((r) => rowToLedger(r, paymentsFor("out", String(r["id"])))),
    files: ((files.data ?? []) as Row[]).map(rowToFile),
  };
}

/* ------------------------------------------------------------------ */
/* One-time move of legacy {userId}/… uploads to {promoterId}/{eventId} */
/* ------------------------------------------------------------------ */

export async function migrateStoragePaths(promoter: Promoter, userId: string, db: Db): Promise<boolean> {
  const legacy = db.files.filter((f) => f.storagePath?.startsWith(`${userId}/`));
  if (legacy.length === 0) return false;
  let moved = 0;
  for (const f of legacy) {
    const from = f.storagePath!;
    const base = from.slice(from.lastIndexOf("/") + 1);
    const to = `${storagePrefix(promoter.id, f.eventId)}/${base}`;
    const mv = await supabase.storage.from("setlup-files").move(from, to);
    if (mv.error && !/exists/i.test(mv.error.message)) continue;
    const { error } = await supabase.from("files").update({ storage_path: to } as never).eq("id", f.id);
    if (!error) {
      f.storagePath = to;
      moved++;
    }
  }
  return moved > 0;
}

/* ------------------------------------------------------------------ */
/* First-run seeding — verbatim seed values, ids namespaced per user    */
/* ------------------------------------------------------------------ */

function namespaced(db: Db, suffix: string): Db {
  const key = (id: string) => `${id}-${suffix}`;
  return {
    settings: db.settings,
    events: db.events.map((e) => ({ ...e, id: key(e.id) })),
    lines: db.lines.map((l) => ({
      ...l,
      id: key(l.id),
      eventId: key(l.eventId),
      parentId: l.parentId ? key(l.parentId) : undefined,
    })),
    moneyIn: db.moneyIn.map((r) => ({
      ...r,
      id: key(r.id),
      eventId: key(r.eventId),
      lineId: r.lineId ? key(r.lineId) : undefined,
      payments: r.payments.map((p) => ({ ...p, id: key(p.id) })),
    })),
    bills: db.bills.map((r) => ({
      ...r,
      id: key(r.id),
      eventId: key(r.eventId),
      lineId: r.lineId ? key(r.lineId) : undefined,
      payments: r.payments.map((p) => ({ ...p, id: key(p.id) })),
    })),
    files: db.files.map((f) => ({
      ...f,
      id: key(f.id),
      eventId: key(f.eventId),
      lineId: f.lineId ? key(f.lineId) : undefined,
    })),
  };
}

export async function createEventRow(
  promoterId: string,
  e: Pick<EventRecord, "id" | "name" | "date" | "venue" | "capacity" | "stage" | "accent" | "asOf" | "planningRows">,
): Promise<number | undefined> {
  const { data, error } = await supabase.rpc("create_event" as never, {
    _promoter_id: promoterId,
    _id: e.id,
    _name: e.name,
    _date: e.date,
    _venue: e.venue ?? "",
    _capacity: e.capacity ?? null,
    _stage: e.stage,
    _accent: e.accent,
    _as_of: e.asOf,
    _planning_rows: e.planningRows ?? null,
  } as never);
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as Row | null;
  return row ? on(row["event_number"]) : undefined;
}

/**
 * Seeds the promoter's starting data exactly once. Values come verbatim from
 * seedDb(); only record ids are namespaced so two accounts can coexist.
 */
export async function seedForPromoter(promoter: Promoter, userId: string): Promise<Db> {
  const existing = await supabase.from("events").select("id").limit(1);
  if (existing.error) throw existing.error;
  if ((existing.data ?? []).length > 0) return loadDb(promoter);

  const db = namespaced(seedDb(), userId.slice(0, 8));

  for (const e of db.events) {
    await createEventRow(promoter.id, e);
    const { error } = await supabase
      .from("events")
      .update(eventExtrasRow(e) as never)
      .eq("id", e.id);
    if (error) throw error;
  }

  const inserts: { table: string; rows: Row[] }[] = [
    { table: "lines", rows: db.lines.map(lineToRow) },
    { table: "money_in", rows: db.moneyIn.map(ledgerToRow) },
    { table: "bills", rows: db.bills.map(ledgerToRow) },
    {
      table: "payments",
      rows: [
        ...db.moneyIn.flatMap((r) =>
          r.payments.map((p) => ({
            id: p.id,
            event_id: r.eventId,
            parent_kind: "in",
            parent_id: r.id,
            amount: p.amount,
            date: p.date,
          })),
        ),
        ...db.bills.flatMap((r) =>
          r.payments.map((p) => ({
            id: p.id,
            event_id: r.eventId,
            parent_kind: "out",
            parent_id: r.id,
            amount: p.amount,
            date: p.date,
          })),
        ),
      ],
    },
    { table: "files", rows: db.files.map(fileToRow) },
  ];

  if (db.settings.business) {
    await supabase
      .from("promoters")
      .update({
        name: db.settings.business,
        currency: db.settings.currency,
        vat_rate: db.settings.vatRate,
      } as never)
      .eq("id", promoter.id);
  }

  for (const { table, rows } of inserts) {
    if (rows.length === 0) continue;
    const { error } = await supabase.from(table as "events").insert(rows as never);
    if (error) throw error;
  }

  return loadDb({
    ...promoter,
    name: db.settings.business || promoter.name,
    currency: db.settings.currency,
    vatRate: db.settings.vatRate,
  });
}
