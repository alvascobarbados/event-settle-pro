import type { Bill, BillLine, EventRecord, RevenueEntry, RevenueCategory } from "./setl-data";

export const EVENT_COST_KEYS = [
  "core_production",
  "decor_merch_supplies",
  "event_day_ops",
  "talent",
  "marketing_media",
  "admin_fees",
] as const;
export type EventCostKey = (typeof EVENT_COST_KEYS)[number];
export const COS_KEYS = ["drinks", "food"] as const;
export type CosKey = (typeof COS_KEYS)[number];

export function vatWithin(x: number): number {
  return (x * 0.175) / 1.175;
}

/** Sum revenue category (net amount) and VAT-within on VATable lines. */
export function revenueByCategory(event: EventRecord) {
  const result: Record<RevenueCategory, { amount: number; vat: number; entries: RevenueEntry[] }> = {
    ticket_sales: { amount: 0, vat: 0, entries: [] },
    bar_sales: { amount: 0, vat: 0, entries: [] },
    sponsorship: { amount: 0, vat: 0, entries: [] },
    tables_other: { amount: 0, vat: 0, entries: [] },
  };
  for (const r of event.revenue) {
    const bucket = result[r.category];
    bucket.entries.push(r);
    bucket.amount += r.amount;
    if (r.vatable) bucket.vat += vatWithin(r.amount);
  }
  return result;
}

export function totalRevenue(event: EventRecord) {
  const by = revenueByCategory(event);
  const amount = Object.values(by).reduce((s, b) => s + b.amount, 0);
  const vat = Object.values(by).reduce((s, b) => s + b.vat, 0);
  return { amount, vat };
}

/** Aggregate all bill lines flat with a filter. */
export function lines(event: EventRecord, filter: (line: BillLine, bill: Bill) => boolean) {
  const out: { line: BillLine; bill: Bill }[] = [];
  for (const bill of event.bills) {
    for (const line of bill.lines) {
      if (filter(line, bill)) out.push({ line, bill });
    }
  }
  return out;
}

export function sumLines(items: { line: BillLine }[]) {
  let amount = 0, vat = 0;
  for (const { line } of items) {
    amount += line.amount;
    vat += line.vat ?? 0;
  }
  return { amount, vat };
}

/** COS: category = "cos", sub in "drinks"|"food". */
export function cosByCategory(event: EventRecord) {
  const out: Record<CosKey, { amount: number; vat: number; items: { line: BillLine; bill: Bill }[] }> = {
    drinks: { amount: 0, vat: 0, items: [] },
    food: { amount: 0, vat: 0, items: [] },
  };
  for (const bill of event.bills) {
    for (const line of bill.lines) {
      if (line.category === "cos" && (line.sub === "drinks" || line.sub === "food")) {
        out[line.sub as CosKey].items.push({ line, bill });
        out[line.sub as CosKey].amount += line.amount;
        out[line.sub as CosKey].vat += line.vat ?? 0;
      }
    }
  }
  return out;
}

export function totalCos(event: EventRecord) {
  const by = cosByCategory(event);
  return { amount: by.drinks.amount + by.food.amount, vat: by.drinks.vat + by.food.vat };
}

/** Event costs by top-level category. */
export function eventCostsByCategory(event: EventRecord) {
  const out = Object.fromEntries(
    EVENT_COST_KEYS.map((k) => [k, { amount: 0, vat: 0, items: [] as { line: BillLine; bill: Bill }[] }]),
  ) as Record<EventCostKey, { amount: number; vat: number; items: { line: BillLine; bill: Bill }[] }>;
  for (const bill of event.bills) {
    for (const line of bill.lines) {
      if ((EVENT_COST_KEYS as readonly string[]).includes(line.category)) {
        const k = line.category as EventCostKey;
        out[k].items.push({ line, bill });
        out[k].amount += line.amount;
        out[k].vat += line.vat ?? 0;
      }
    }
  }
  return out;
}

export function totalEventCosts(event: EventRecord) {
  const by = eventCostsByCategory(event);
  return {
    amount: EVENT_COST_KEYS.reduce((s, k) => s + by[k].amount, 0),
    vat: EVENT_COST_KEYS.reduce((s, k) => s + by[k].vat, 0),
  };
}

export function grossProfit(event: EventRecord) {
  const rev = totalRevenue(event);
  const cos = totalCos(event);
  return { amount: rev.amount - cos.amount, revenue: rev.amount };
}

export function eventProfit(event: EventRecord) {
  const rev = totalRevenue(event);
  const cos = totalCos(event);
  const ec = totalEventCosts(event);
  return { amount: rev.amount - cos.amount - ec.amount, revenue: rev.amount };
}

export function netProfit(event: EventRecord) {
  const ep = eventProfit(event);
  return { amount: ep.amount - event.vat_return.net_payable, revenue: ep.revenue };
}

export function cashResult(event: EventRecord) {
  const np = netProfit(event);
  const settle = event.settlement_items.reduce((s, i) => s + i.amount, 0);
  return np.amount + settle;
}

/** Group bill lines by vendor, netting invoice+credit within same category+sub. */
export interface VendorGroup {
  vendor: string;
  invoiceRow?: { bill: Bill; line: BillLine };
  creditRows: { bill: Bill; line: BillLine }[];
  netAmount: number;
  netVat: number;
  hasUnpaid: boolean;
  descriptors: string[];
  invoice: string | null;
}

export function groupByVendor(items: { line: BillLine; bill: Bill }[]): VendorGroup[] {
  const map = new Map<string, VendorGroup>();
  for (const it of items) {
    const key = it.bill.vendor + "::" + (it.line.sub ?? "");
    let g = map.get(key);
    if (!g) {
      g = {
        vendor: it.bill.vendor, creditRows: [], netAmount: 0, netVat: 0,
        hasUnpaid: false, descriptors: [], invoice: null,
      };
      map.set(key, g);
    }
    if (it.bill.kind === "credit") {
      g.creditRows.push(it);
    } else {
      // an invoice; multiple invoice lines from same vendor+sub simply stack
      if (!g.invoiceRow) g.invoiceRow = it;
    }
    g.netAmount += it.line.amount;
    g.netVat += it.line.vat ?? 0;
    if (it.bill.status === "unpaid") g.hasUnpaid = true;
    if (it.line.descriptor) g.descriptors.push(it.line.descriptor);
    if (!g.invoice && it.bill.invoice) g.invoice = it.bill.invoice;
  }
  return [...map.values()].sort((a, b) => b.netAmount - a.netAmount);
}

/** To pay = unpaid bills (bill-level, splits count once) + due VAT + due settlement outflows. */
export function toPay(event: EventRecord) {
  let sum = 0;
  const seen = new Set<string>();
  for (const bill of event.bills) {
    if (bill.status === "unpaid" && !seen.has(bill.id)) {
      seen.add(bill.id);
      sum += bill.lines.reduce((s, l) => s + l.amount, 0);
    }
  }
  if (event.vat_return.status === "due") sum += event.vat_return.net_payable;
  for (const si of event.settlement_items) {
    if (si.status === "due") sum += Math.abs(si.amount);
  }
  return sum;
}

export function toCollect(event: EventRecord) {
  return event.revenue.filter((r) => r.status === "pending").reduce((s, r) => s + r.amount, 0);
}

export function unpaidBillCount(event: EventRecord, categoryFilter: (l: BillLine) => boolean) {
  const seen = new Set<string>();
  for (const bill of event.bills) {
    if (bill.status !== "unpaid") continue;
    if (bill.lines.some(categoryFilter)) seen.add(bill.id);
  }
  return seen.size;
}

export function pendingRevenueCount(event: EventRecord, category: RevenueCategory) {
  return event.revenue.filter((r) => r.category === category && r.status === "pending").length;
}

export function foodVendorCount(event: EventRecord) {
  const s = new Set<string>();
  for (const bill of event.bills) {
    for (const l of bill.lines) {
      if (l.category === "cos" && l.sub === "food") s.add(bill.vendor);
    }
  }
  return s.size;
}

export function talentCounts(event: EventRecord) {
  let foreign = 0, local = 0;
  const fSet = new Set<string>(), lSet = new Set<string>();
  for (const bill of event.bills) {
    for (const l of bill.lines) {
      if (l.category === "talent" && l.sub === "foreign") fSet.add(bill.vendor);
      if (l.category === "talent" && l.sub === "local") lSet.add(bill.vendor);
    }
  }
  foreign = fSet.size; local = lSet.size;
  return { foreign, local };
}
