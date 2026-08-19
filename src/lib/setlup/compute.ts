import {
  type Bill,
  type Db,
  type EventRecord,
  type Ledgerable,
  type Line,
  type MoneyIn,
  type RecordStatus,
  type Section,
} from "./types";
import { daysBetween } from "./format";

export const VAT_RATE = 17.5;

export function vatOf(amount: number, vatExempt?: boolean): number {
  if (vatExempt) return 0;
  return Math.round(((amount * VAT_RATE) / (100 + VAT_RATE)) * 100) / 100;
}

export function paidTotal(r: Ledgerable): number {
  return r.payments.reduce((s, p) => s + p.amount, 0);
}

export function balanceOf(r: Ledgerable): number {
  return Math.max(0, Math.round((r.amount - paidTotal(r)) * 100) / 100);
}

export function statusOf(r: Ledgerable, asOf: string): RecordStatus {
  const paid = paidTotal(r);
  if (paid >= r.amount - 0.005) return "paid";
  if (paid > 0) return "partial";
  if (daysBetween(r.dueDate, asOf) > 0) return "overdue";
  return "outstanding";
}

export function daysOverdue(r: Ledgerable, asOf: string): number {
  return Math.max(0, daysBetween(r.dueDate, asOf));
}

/* ------------------------------------------------------------------ */
/* P&L                                                                 */
/* ------------------------------------------------------------------ */

export interface PnlRow {
  line: Line;
  amount: number;
  vat: number;
  children: PnlRow[];
}

export interface SectionResult {
  rows: PnlRow[];
  amount: number;
  vat: number;
}

export interface Pnl {
  budgeted: boolean;
  revenue: SectionResult;
  expenses: SectionResult;
  profitBeforeTax: number;
  outputVat: number;
  inputVat: number;
  netVat: number;
}

function lineAmount(db: Db, line: Line, budgeted: boolean): number {
  if (budgeted) return line.budgetAmount;
  const linked = [...db.moneyIn, ...db.bills]
    .filter((r) => r.lineId === line.id && r.countInActual !== false)
    .reduce((s, r) => s + r.amount, 0);
  return Math.round((line.actualAmount + linked) * 100) / 100;
}

function rowVat(line: Line, amount: number, inheritedExempt?: boolean): number {
  if (line.vatOverride !== undefined) return line.vatOverride;
  return vatOf(amount, line.vatExempt ?? inheritedExempt);
}

function section(db: Db, event: EventRecord, sec: Section, budgeted: boolean): SectionResult {
  const all = db.lines.filter((l) => l.eventId === event.id && l.section === sec);
  const parents = all
    .filter((l) => !l.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const rows: PnlRow[] = parents.map((p) => {
    const amount = lineAmount(db, p, budgeted);
    const children = all
      .filter((c) => c.parentId === p.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => {
        const cAmount = lineAmount(db, c, budgeted);
        return { line: c, amount: cAmount, vat: rowVat(c, cAmount, p.vatExempt), children: [] };
      });
    return { line: p, amount, vat: rowVat(p, amount), children };
  });
  const amount = Math.round(rows.reduce((s, r) => s + r.amount, 0) * 100) / 100;
  const vat = Math.round(rows.reduce((s, r) => s + r.vat, 0) * 100) / 100;
  return { rows, amount, vat };
}

export function pnlOf(db: Db, event: EventRecord): Pnl {
  const budgeted = event.stage === "planning";
  const revenue = section(db, event, "revenue", budgeted);
  const expenses = section(db, event, "expenses", budgeted);
  const profitBeforeTax = Math.round((revenue.amount - expenses.amount) * 100) / 100;
  const outputVat = revenue.vat;
  const inputVat = event.inputVatOverride ?? Math.round(expenses.vat * 100) / 100;
  return {
    budgeted,
    revenue,
    expenses,
    profitBeforeTax,
    outputVat,
    inputVat,
    netVat: Math.round((outputVat - inputVat) * 100) / 100,
  };
}

/* ------------------------------------------------------------------ */
/* VAT report — scope only; P&L amounts are never affected             */
/* ------------------------------------------------------------------ */

export interface VatDetailRow {
  line: Line;
  amount: number;
  vat: number;
  detail: string;
  excluded: boolean;
}

export interface VatReport {
  outputRows: VatDetailRow[];
  inputRows: VatDetailRow[];
  output: number;
  input: number;
  net: number;
  excludedCount: number;
}

const leafRows = (sec: SectionResult): PnlRow[] =>
  sec.rows.flatMap((r) => (r.children.length > 0 ? r.children : [r]));

const toDetailRow = (r: PnlRow): VatDetailRow => ({
  line: r.line,
  amount: r.amount,
  vat: r.vat,
  detail: [r.line.detail, r.line.ref ? `inv ${r.line.ref}` : null].filter(Boolean).join(" · "),
  excluded: !!r.line.vatExcluded,
});

export function vatReportOf(db: Db, event: EventRecord, pnl: Pnl = pnlOf(db, event)): VatReport {
  const outputRows = leafRows(pnl.revenue).map(toDetailRow);
  const inputRows = leafRows(pnl.expenses).map(toDetailRow).filter((r) => r.vat !== 0);
  const excludedVat = (rows: VatDetailRow[]) =>
    round2(rows.filter((r) => r.excluded).reduce((s, r) => s + r.vat, 0));
  const output = round2(pnl.outputVat - excludedVat(outputRows));
  const input = round2(pnl.inputVat - excludedVat(inputRows));
  return {
    outputRows,
    inputRows,
    output,
    input,
    net: round2(output - input),
    excludedCount: [...outputRows, ...inputRows].filter((r) => r.excluded).length,
  };
}

export function hasChildren(pnl: Pnl): boolean {
  return [pnl.revenue, pnl.expenses].some((s) => s.rows.some((r) => r.children.length > 0));
}

/* ------------------------------------------------------------------ */
/* Finance                                                             */
/* ------------------------------------------------------------------ */

export function eventMoneyIn(db: Db, eventId: string): MoneyIn[] {
  return db.moneyIn.filter((r) => r.eventId === eventId);
}
export function eventBills(db: Db, eventId: string): Bill[] {
  return db.bills.filter((r) => r.eventId === eventId);
}

export function toCollect(db: Db, event: EventRecord): number {
  return round2(eventMoneyIn(db, event.id).reduce((s, r) => s + balanceOf(r), 0));
}
export function toPay(db: Db, event: EventRecord): number {
  return round2(eventBills(db, event.id).reduce((s, r) => s + balanceOf(r), 0));
}
export function netPosition(db: Db, event: EventRecord): number {
  return round2(toCollect(db, event) - toPay(db, event));
}

export interface ActivityEntry {
  id: string;
  date: string;
  counterparty: string;
  description: string;
  amount: number; // signed
}

export function activityOf(db: Db, eventId: string): ActivityEntry[] {
  const out: ActivityEntry[] = [];
  for (const r of eventMoneyIn(db, eventId)) {
    for (const p of r.payments) {
      out.push({ id: p.id, date: p.date, counterparty: r.counterparty, description: r.description, amount: p.amount });
    }
  }
  for (const r of eventBills(db, eventId)) {
    for (const p of r.payments) {
      out.push({ id: p.id, date: p.date, counterparty: r.counterparty, description: r.description, amount: -p.amount });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function cashOf(db: Db, event: EventRecord) {
  const base = event.cashBaseline ?? { collected: 0, paid: 0 };
  const collected = round2(
    base.collected + eventMoneyIn(db, event.id).reduce((s, r) => s + paidTotal(r), 0),
  );
  const paid = round2(base.paid + eventBills(db, event.id).reduce((s, r) => s + paidTotal(r), 0));
  const position = round2(collected - paid);
  const pnl = pnlOf(db, event);
  const remainingIn = toCollect(db, event);
  const remainingOut = toPay(db, event);
  const netVat = vatReportOf(db, event, pnl).net;
  const vatOutstanding = event.stage === "closed" ? 0 : netVat;
  const fullySettled = round2(position + remainingIn - remainingOut - vatOutstanding);
  return { collected, paid, position, remainingIn, remainingOut, netVat, fullySettled };
}

export function budgetReportOf(db: Db, event: EventRecord) {
  const pnl = pnlOf(db, event);
  const b = event.budgetBaseline ?? { revenue: 0, expenses: 0 };
  const budgetProfit = round2(b.revenue - b.expenses);
  return {
    rows: [
      { name: "Revenue", budget: b.revenue, actual: pnl.revenue.amount, favourableWhenOver: true },
      { name: "Expenses", budget: b.expenses, actual: pnl.expenses.amount, favourableWhenOver: false },
    ],
    budgetProfit,
    actualProfit: pnl.profitBeforeTax,
    variance: round2(pnl.profitBeforeTax - budgetProfit),
  };
}

/* ------------------------------------------------------------------ */
/* Home: attention + path to close                                     */
/* ------------------------------------------------------------------ */

export interface AttentionItem {
  id: string;
  kind: "in" | "out";
  counterparty: string;
  description: string;
  amount: number;
  status: RecordStatus;
  days: number;
}

export function attentionOf(db: Db, event: EventRecord): AttentionItem[] {
  const items: AttentionItem[] = [];
  const push = (r: Ledgerable, kind: "in" | "out") => {
    const status = statusOf(r, event.asOf);
    if (status === "paid") return;
    const days = daysBetween(event.asOf, r.dueDate);
    if (status === "overdue") {
      items.push({ id: r.id, kind, counterparty: r.counterparty, description: r.description, amount: balanceOf(r), status, days: -days });
    } else if (days <= 7) {
      items.push({ id: r.id, kind, counterparty: r.counterparty, description: r.description, amount: balanceOf(r), status, days });
    }
  };
  eventMoneyIn(db, event.id).forEach((r) => push(r, "in"));
  eventBills(db, event.id).forEach((r) => push(r, "out"));
  return items.sort((a, b) => {
    if (a.status === "overdue" && b.status !== "overdue") return -1;
    if (b.status === "overdue" && a.status !== "overdue") return 1;
    return a.days - b.days;
  });
}

export function pathToClose(db: Db, event: EventRecord) {
  const collect = toCollect(db, event);
  const pay = toPay(db, event);
  return {
    receivablesCleared: collect < 0.005,
    payablesCleared: pay < 0.005,
    vatExported: !!event.vatExported,
    collect,
    pay,
    canClose: collect < 0.005 && pay < 0.005 && !!event.vatExported,
  };
}

/* ------------------------------------------------------------------ */
/* Vendors                                                             */
/* ------------------------------------------------------------------ */

export interface VendorSummary {
  name: string;
  eventCount: number;
  billed: number;
  outstanding: number;
}

export function vendorsOf(db: Db): VendorSummary[] {
  const map = new Map<string, { events: Set<string>; billed: number; outstanding: number }>();
  for (const b of db.bills) {
    let v = map.get(b.counterparty);
    if (!v) {
      v = { events: new Set(), billed: 0, outstanding: 0 };
      map.set(b.counterparty, v);
    }
    v.events.add(b.eventId);
    v.billed += b.amount;
    v.outstanding += balanceOf(b);
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, eventCount: v.events.size, billed: round2(v.billed), outstanding: round2(v.outstanding) }))
    .sort((a, b) => b.billed - a.billed);
}

/**
 * The expense/revenue CATEGORY a record was routed to — never the vendor.
 * Resolves a linked line to its root parent line, adding " · SUBCATEGORY"
 * when the routed line carries a second-level taxonomy node.
 */
export function categoryLabel(db: Db, lineId?: string): string | null {
  if (!lineId) return null;
  const line = db.lines.find((l) => l.id === lineId);
  if (!line) return null;
  const root = line.parentId ? db.lines.find((l) => l.id === line.parentId) ?? line : line;
  const node = line.categoryId ? db.categories.find((c) => c.id === line.categoryId) : undefined;
  const sub = node?.parentId ? node : undefined;
  return sub ? `${root.name} · ${sub.name}` : root.name;
}

export function lineName(db: Db, lineId?: string): string | null {
  if (!lineId) return null;
  return db.lines.find((l) => l.id === lineId)?.name ?? null;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
