import { createFileRoute, notFound } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { AppShell, EventBarSlot } from "@/components/setl/AppShell";

import { getEvent, type EventRecord, type Bill, type BillLine } from "@/lib/setl-data";
import { REVENUE_LABELS, COST_LABELS, SUB_LABELS } from "@/lib/setl-data";
import {
  revenueByCategory, totalRevenue, cosByCategory, totalCos, eventCostsByCategory,
  totalEventCosts, grossProfit, eventProfit, netProfit, cashResult,
  toPay, toCollect, unpaidBillCount, pendingRevenueCount, foodVendorCount, talentCounts,
  groupByVendor, vatWithin, EVENT_COST_KEYS,
} from "@/lib/setl-compute";
import { fmt, fmtPct, fmtDate } from "@/lib/setl-format";

export const Route = createFileRoute("/event/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.id.toUpperCase()} — SETLUP` },
      { name: "description", content: `Performance sheet for ${params.id} — SETLUP.` },
      { property: "og:title", content: `${params.id.toUpperCase()} — SETLUP` },
      { property: "og:description", content: "Performance sheet: revenue, COS, event costs, VAT and net profit." },
    ],
  }),
  loader: ({ params }) => {
    const e = getEvent(params.id);
    if (!e) throw notFound();
    return e;
  },
  component: EventSheet,
});

/* ---------- shared primitives ---------- */

function PerHead({ value, head, prefix = "" }: { value: number; head: number; prefix?: string }) {
  if (!head) return null;
  return (
    <span className="num ml-2 text-[11px] font-normal text-muted-foreground">
      {prefix}
      {fmt(value / head)}/head
    </span>
  );
}

function AmberDot() {
  return <span className="mr-2 inline-block h-[7px] w-[7px] rounded-full" style={{ backgroundColor: "var(--amber-fg)" }} />;
}

function AmberBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="ml-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider"
      style={{ color: "var(--amber-fg)" }}
    >
      <span
        aria-hidden
        className="inline-block h-[6px] w-[6px] rounded-full"
        style={{ backgroundColor: "var(--amber-fg)" }}
      />
      {children}
    </span>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden
      className="mr-2 inline-block text-muted-foreground transition-transform"
      style={{ transform: open ? "rotate(90deg)" : "none" }}
    >
      ›
    </span>
  );
}

function VatCell({ v }: { v: number | null | "blank" }) {
  if (v === "blank") return <span />;
  if (v === null) return <span className="text-muted-foreground">—</span>;
  return <span className="num">{fmt(v)}</span>;
}

/** Category row grid: name | badge | AMOUNT | VAT. */
function CategoryRow({
  open, onToggle, expandable, name, subline, badge, amount, vat, amber, className = "",
}: {
  open?: boolean;
  onToggle?: () => void;
  expandable?: boolean;
  name: React.ReactNode;
  subline?: React.ReactNode;
  badge?: React.ReactNode;
  amount: React.ReactNode;
  vat: React.ReactNode;
  amber?: boolean;
  className?: string;
}) {
  const content = (
    <div className={`grid grid-cols-[minmax(0,1fr)_168px_60px] items-baseline gap-x-3 px-3 py-3 ${className}`}>
      <div className="min-w-0">
        <div className="flex items-center">
          {expandable && <Chevron open={!!open} />}
          {amber && <AmberDot />}
          <span className={`text-[16px] ${amber ? "font-bold" : "font-medium"} text-ink`}
                style={amber ? { color: "var(--amber-fg)" } : undefined}>
            {name}
          </span>
          {badge}
        </div>
        {subline && <div className="mt-0.5 pl-[calc(1ch+0.5rem)] text-[11.5px] text-muted-foreground">{subline}</div>}
      </div>
      <div className={`num text-right text-[16px] ${amber ? "font-bold" : "font-medium"} tabular-nums`}
           style={amber ? { color: "var(--amber-fg)" } : undefined}>
        {amount}
      </div>
      <div className="num text-right text-[13px] text-muted-foreground">{vat}</div>
    </div>
  );
  if (expandable) {
    return (
      <button
        onClick={onToggle}
        className="w-full text-left border-b border-dashed border-hairline last:border-0"
      >
        {content}
      </button>
    );
  }
  return <div className="border-b border-dashed border-hairline last:border-0">{content}</div>;
}


/* ---------- drill primitives ---------- */

const DRILL_GRID_4 =
  "grid grid-cols-[minmax(0,2fr)_minmax(60px,0.8fr)_minmax(90px,1fr)_minmax(64px,0.7fr)] gap-x-3";
const DRILL_GRID_3 =
  "grid grid-cols-[minmax(0,2.2fr)_minmax(90px,1fr)_minmax(64px,0.7fr)] gap-x-3";

/** Drill panel wrapper (soft #FBF4F8 bg). No right padding so drill AMOUNT/VAT
 *  columns share a continuous right rail with the category rows above. */
function DrillPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b border-dashed border-hairline" style={{ backgroundColor: "var(--panel)" }}>
      <div className="px-3 py-3">{children}</div>
    </div>
  );
}

function DrillHeader({ cols }: { cols: [string, string, string, string] }) {
  return (
    <div className={`hidden sm:grid ${DRILL_GRID_4} pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`}>
      <div>{cols[0]}</div>
      <div>{cols[1]}</div>
      <div className="text-right">{cols[2]}</div>
      <div className="text-right">{cols[3]}</div>
    </div>
  );
}

function DrillHeader3({ cols }: { cols: [string, string, string] }) {
  return (
    <div className={`hidden sm:grid ${DRILL_GRID_3} pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`}>
      <div>{cols[0]}</div>
      <div className="text-right">{cols[1]}</div>
      <div className="text-right">{cols[2]}</div>
    </div>
  );
}


/** 4-column detail row (VENDOR | INV # | AMOUNT | VAT).
 *  Vendor names wrap rather than truncate. The descriptor `sub` spans cols 1–2. */
function DrillRow({
  name, sub, inv, amount, vat, amber, indent = 0,
}: {
  name: React.ReactNode; sub?: React.ReactNode; inv?: React.ReactNode;
  amount: React.ReactNode; vat: React.ReactNode; amber?: boolean; indent?: number;
}) {
  const amberStyle = amber ? { color: "var(--amber-fg)" } : undefined;
  const hasInv = inv !== undefined && inv !== "" && inv !== null;

  return (
    <div className="border-t border-dashed border-hairline py-[10px]">
      {/* Mobile stacked */}
      <div className="sm:hidden" style={{ paddingLeft: indent * 12 }}>
        <div className="flex items-start text-[15px] leading-[1.25] text-ink">
          {amber && <AmberDot />}
          <span className={`break-words ${amber ? "font-bold" : ""}`} style={amberStyle}>{name}</span>
        </div>
        {sub && <div className="mt-0.5 text-[13px] leading-[1.35] text-muted-foreground">{sub}</div>}
        <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto_60px] items-baseline gap-x-3">
          <div className="min-w-0 truncate text-[12px] text-muted-foreground tabular-nums">
            {hasInv ? inv : ""}
          </div>
          <div className={`num text-right text-[15px] tabular-nums ${amber ? "font-bold" : ""}`} style={amberStyle}>
            {amount}
          </div>
          <div className="num text-right text-[12px] text-muted-foreground tabular-nums">
            {vat === "" || vat === undefined ? "" : vat}
          </div>
        </div>
      </div>

      {/* Desktop grid — unchanged */}
      <div className={`hidden sm:grid ${DRILL_GRID_4} items-baseline`}>
        <div className="min-w-0 [grid-column:1] [grid-row:1]" style={{ paddingLeft: indent * 12 }}>
          <div className="flex items-start text-[15px] leading-[1.25]">
            {amber && <AmberDot />}
            <span className={`break-words ${amber ? "font-bold" : ""}`} style={amberStyle}>{name}</span>
          </div>
        </div>
        <div className="[grid-column:2] [grid-row:1] truncate text-[12px] text-muted-foreground tabular-nums">
          {inv}
        </div>
        <div className={`num [grid-column:3] [grid-row:1] text-right text-[15px] tabular-nums ${amber ? "font-bold" : ""}`} style={amberStyle}>
          {amount}
        </div>
        <div className="num [grid-column:4] [grid-row:1] text-right text-[13px] text-muted-foreground tabular-nums">
          {vat === "" || vat === undefined ? "" : vat}
        </div>
        {sub && (
          <div
            className="mt-0.5 text-[13px] leading-[1.35] text-muted-foreground [grid-column:1/3] [grid-row:2]"
            style={{ paddingLeft: indent * 12 }}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

function DrillRow3({
  name, amount, vat, amber,
}: {
  name: React.ReactNode; amount: React.ReactNode; vat: React.ReactNode; amber?: boolean;
}) {
  const amberStyle = amber ? { color: "var(--amber-fg)" } : undefined;
  return (
    <div className="border-t border-dashed border-hairline py-[10px]">
      {/* Mobile stacked */}
      <div className="sm:hidden">
        <div className="flex items-start text-[15px] leading-[1.25] text-ink">
          {amber && <AmberDot />}
          <span className={`break-words ${amber ? "font-bold" : ""}`} style={amberStyle}>{name}</span>
        </div>
        <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto_60px] items-baseline gap-x-3">
          <div />
          <div className={`num text-right text-[15px] tabular-nums ${amber ? "font-bold" : ""}`} style={amberStyle}>
            {amount}
          </div>
          <div className="num text-right text-[12px] text-muted-foreground tabular-nums">{vat}</div>
        </div>
      </div>
      {/* Desktop grid — unchanged */}
      <div className={`hidden sm:grid ${DRILL_GRID_3} items-baseline`}>
        <div className="min-w-0">
          <div className="flex items-start text-[15px] leading-[1.25]">
            {amber && <AmberDot />}
            <span className={`break-words ${amber ? "font-bold" : ""}`} style={amberStyle}>{name}</span>
          </div>
        </div>
        <div className={`num text-right text-[15px] tabular-nums ${amber ? "font-bold" : ""}`} style={amberStyle}>
          {amount}
        </div>
        <div className="num text-right text-[13px] text-muted-foreground tabular-nums">{vat}</div>
      </div>
    </div>
  );
}


function invLabel(inv: string | null) {
  return inv ?? "none";
}

/* ---------- section totals ---------- */

function SectionTotal({
  label, amount, vat, head, extra, showVat = true,
}: { label: string; amount: number; vat?: number | null; head?: number; extra?: React.ReactNode; showVat?: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_168px_60px] items-baseline gap-x-3 px-3 border-t border-ink pt-3 pb-3">
      <div className="flex items-baseline flex-wrap gap-x-2">
        <span className="text-[13px] font-bold uppercase tracking-wider text-ink">{label}</span>
        {extra}
        {head !== undefined && (
          <span className="num text-[12px] font-normal text-muted-foreground">
            {fmt(amount / head)}/head
          </span>
        )}
      </div>
      <div className="num text-right text-[17px] font-bold text-ink">{fmt(amount)}</div>
      <div className="num text-right text-[13px] text-muted-foreground">
        {!showVat || vat === undefined || vat === null ? "" : fmt(vat)}
      </div>
    </div>
  );
}

function Milestone({
  label, amount, head, marginBase, vat, extra,
}: { label: string; amount: number; head: number; marginBase?: number; vat?: number; extra?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_168px_60px] items-baseline gap-x-3 px-3 border-t-2 border-ink pt-4 pb-4"
         style={{ borderTopColor: "var(--ink)" }}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-[14px] font-extrabold uppercase tracking-wider text-ink">{label}</span>
        {marginBase !== undefined && marginBase !== 0 && (
          <span className="num text-[12px] font-normal text-muted-foreground">{fmtPct(amount / marginBase)}</span>
        )}
        {head > 0 && (
          <span className="num text-[12px] font-normal text-muted-foreground">
            {fmt(amount / head)}/head
          </span>
        )}
        {extra}
      </div>
      <div className="num text-right text-[24px] font-extrabold text-ink">{fmt(amount)}</div>
      <div className="num text-right text-[13px] text-muted-foreground">
        {vat === undefined ? "" : fmt(vat)}
      </div>
    </div>
  );
}

function HeroMilestone({
  label, amount, head, marginBase,
}: { label: string; amount: number; head: number; marginBase?: number }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_168px_60px] items-baseline gap-x-3 px-3 pt-5 pb-4"
         style={{ borderTop: "3px solid var(--magenta)" }}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-[14px] font-extrabold uppercase tracking-wider text-ink">{label}</span>
        {marginBase !== undefined && marginBase !== 0 && (
          <span className="num text-[12px] font-normal text-muted-foreground">{fmtPct(amount / marginBase)}</span>
        )}
        {head > 0 && (
          <span className="num text-[12px] font-normal text-muted-foreground">
            {fmt(amount / head)}/head
          </span>
        )}
      </div>
      <div className="num text-right text-[28px] font-extrabold" style={{ color: "var(--magenta)" }}>
        {fmt(amount)}
      </div>
      <div />
    </div>
  );
}

/* ---------- expandable panels ---------- */

function ExpandableCategory({
  open, onToggle, name, subline, badge, amount, vat, children,
}: {
  open: boolean; onToggle: () => void;
  name: React.ReactNode; subline?: React.ReactNode; badge?: React.ReactNode;
  amount: React.ReactNode; vat: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <>
      <CategoryRow expandable open={open} onToggle={onToggle}
        name={name} subline={subline} badge={badge} amount={amount} vat={vat} />
      {open && <DrillPanel>{children}</DrillPanel>}
    </>
  );
}

/* ---------- revenue drills ---------- */

function RevenueDrill({ event, cat }: { event: EventRecord; cat: keyof ReturnType<typeof revenueByCategory> }) {
  const bucket = revenueByCategory(event)[cat];
  if (cat === "sponsorship") {
    return (
      <div>
        <DrillHeader cols={["SPONSOR", "STATUS", "AMOUNT", "VAT"]} />
        {bucket.entries.map((e) => {
          const pending = e.status === "pending";
          return (
            <DrillRow key={e.id}
              name={e.label}
              inv={pending ? <span style={{ color: "var(--amber-fg)" }}>pending</span> : "received"}
              amount={fmt(e.amount)}
              vat={e.vatable ? fmt(vatWithin(e.amount)) : <span className="text-muted-foreground text-center block">—</span>}
              amber={pending}
            />
          );
        })}
      </div>
    );
  }
  return (
    <div>
      <DrillHeader3 cols={["ITEM", "AMOUNT", "VAT"]} />
      {bucket.entries.map((e) => (
        <DrillRow3 key={e.id}
          name={e.label}
          amount={fmt(e.amount)}
          vat={e.vatable ? fmt(vatWithin(e.amount)) : <span className="text-muted-foreground text-center block">—</span>}
        />
      ))}
    </div>
  );
}

/* ---------- bill drill: ONE ROW PER BILL ----------
 * Never aggregates multiple bills from the same vendor into a single row.
 * The only nesting allowed is a credit note indented under its parent invoice
 * (matched by bill.parent === parent invoice number, same vendor).
 */
function BillDrill({ items }: { items: { line: BillLine; bill: Bill }[] }) {
  // Fold multi-line same-bill entries into a single bill-row (rare in seed data).
  const byBill = new Map<
    string,
    { bill: Bill; amount: number; vat: number; anyExplicitVat: boolean; descriptors: string[] }
  >();
  for (const it of items) {
    let e = byBill.get(it.bill.id);
    if (!e) {
      e = { bill: it.bill, amount: 0, vat: 0, anyExplicitVat: false, descriptors: [] };
      byBill.set(it.bill.id, e);
    }
    e.amount += it.line.amount;
    e.vat += it.line.vat ?? 0;
    if (it.line.vat !== null) e.anyExplicitVat = true;
    if (it.line.descriptor && !e.descriptors.includes(it.line.descriptor)) e.descriptors.push(it.line.descriptor);
  }

  const rows = [...byBill.values()];
  const invoices = rows
    .filter((r) => r.bill.kind === "invoice")
    .sort((a, b) => b.amount - a.amount);
  const credits = rows.filter((r) => r.bill.kind === "credit");
  const used = new Set<string>();

  const renderRow = (
    e: (typeof rows)[number],
    { indent = 0, isCredit = false }: { indent?: number; isCredit?: boolean } = {},
  ) => {
    const vatCell =
      !e.anyExplicitVat
        ? <span className="text-muted-foreground text-center block">—</span>
        : isCredit
          ? <span style={{ color: "var(--magenta)" }}>{fmt(e.vat)}</span>
          : fmt(e.vat);
    const amountCell = isCredit
      ? <span style={{ color: "var(--magenta)" }}>{fmt(e.amount)}</span>
      : fmt(e.amount);
    return (
      <DrillRow
        key={e.bill.id}
        indent={indent}
        name={isCredit
          ? <span className="text-muted-foreground">Credit · {e.bill.vendor}</span>
          : e.bill.vendor}
        sub={e.descriptors[0]}
        inv={invLabel(e.bill.invoice)}
        amount={amountCell}
        vat={vatCell}
        amber={!isCredit && e.bill.status === "unpaid"}
      />
    );
  };

  return (
    <div>
      <DrillHeader cols={["VENDOR", "INV #", "AMOUNT", "VAT"]} />
      {invoices.map((inv) => {
        const matching = credits.filter(
          (c) =>
            !used.has(c.bill.id) &&
            c.bill.vendor === inv.bill.vendor &&
            !!c.bill.parent &&
            !!inv.bill.invoice &&
            c.bill.parent === inv.bill.invoice,
        );
        matching.forEach((c) => used.add(c.bill.id));
        return (
          <Fragment key={inv.bill.id}>
            {renderRow(inv)}
            {matching.map((c) => renderRow(c, { indent: 1, isCredit: true }))}
          </Fragment>
        );
      })}
      {credits
        .filter((c) => !used.has(c.bill.id))
        .map((c) => renderRow(c, { isCredit: true }))}
    </div>
  );
}


/* ---------- header + strip ---------- */

function StatusStrip({ event }: { event: EventRecord }) {
  const collect = toCollect(event);
  const pay = toPay(event);
  const net = collect - pay;
  return (
    <div className="my-6 grid grid-cols-3 divide-x divide-hairline border-y border-hairline">
      <StripCell label="To collect" value={collect} amber={collect > 0} />
      <StripCell label="To pay" value={pay} amber={pay > 0} />
      <StripCell label="Net to settle" value={net} magenta={net < 0} />
    </div>
  );
}
function StripCell({ label, value, amber, magenta }: { label: string; value: number; amber?: boolean; magenta?: boolean }) {
  const color = magenta ? "var(--magenta)" : "var(--ink)";
  return (
    <div className="px-3 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        {amber && (
          <span
            aria-hidden
            className="inline-block h-[6px] w-[6px] translate-y-[-2px] rounded-full"
            style={{ backgroundColor: "var(--amber-fg)" }}
          />
        )}
        <div className="num text-[16px] font-bold" style={{ color }}>
          {fmt(value)}
        </div>
      </div>
    </div>
  );
}

/* ---------- main component ---------- */

type ViewMode = "summary" | "full";
type Tab = "performance" | "settlement";

function EventSheet() {
  const event = Route.useLoaderData();
  const [tab, setTab] = useState<Tab>("performance");
  const [mode, setMode] = useState<ViewMode>("summary");
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const [showRecon, setShowRecon] = useState(false);

  const toggle = (k: string) => setOpenMap((m) => ({ ...m, [k]: !m[k] }));
  const isOpen = (k: string) => (mode === "full" ? openMap[k] !== false : !!openMap[k]);

  const head = event.headcount;
  const rev = totalRevenue(event);
  const cos = totalCos(event);
  const gp = grossProfit(event);
  const ec = totalEventCosts(event);
  const ep = eventProfit(event);
  const np = netProfit(event);
  const cash = cashResult(event);

  const revBy = revenueByCategory(event);
  const cosBy = cosByCategory(event);
  const ecBy = eventCostsByCategory(event);

  // computed sublines
  const drinksSubline = useMemo(() => {
    const barRev = revBy.bar_sales.amount;
    if (!barRev) return null;
    return `${fmtPct(cosBy.drinks.amount / barRev)} of bar`;
  }, [revBy.bar_sales.amount, cosBy.drinks.amount]);
  const foodSubline = useMemo(() => {
    const vendors = foodVendorCount(event);
    return `${fmt(cosBy.food.amount / head)}/head · ${vendors} vendors`;
  }, [cosBy.food.amount, head, event]);
  const talentSub = useMemo(() => {
    const t = talentCounts(event);
    return `foreign ${t.foreign} · local ${t.local}`;
  }, [event]);

  // Output VAT reconciliation
  const outputVatWithin = revBy.ticket_sales.vat + revBy.bar_sales.vat + revBy.sponsorship.vat + revBy.tables_other.vat;
  const outputDeclared = event.vat_return.output_declared;
  const outputGap = outputDeclared === null ? null : outputVatWithin - outputDeclared;

  // Input VAT reconciliation
  const inputVatOnBills = cos.vat + ec.vat;
  const inputClaimed = event.vat_return.input_claimed;
  const inputGap = inputClaimed === null ? null : inputVatOnBills - inputClaimed;

  const hasReturnComponents =
    event.vat_return.output_declared !== null ||
    event.vat_return.input_claimed !== null ||
    event.vat_return.deposits !== null;

  // Outstanding items count for the chip
  const outstandingCount = useMemo(() => {
    const unpaidBills = new Set<string>();
    for (const b of event.bills) if (b.status === "unpaid") unpaidBills.add(b.id);
    const pendingRev = event.revenue.filter((r: import("@/lib/setl-data").RevenueEntry) => r.status === "pending").length;
    const vatDue = event.vat_return.status === "due" ? 1 : 0;
    const settleDue = event.settlement_items.filter((s: import("@/lib/setl-data").SettlementItem) => s.status === "due").length;
    return unpaidBills.size + pendingRev + vatDue + settleDue;
  }, [event]);

  // App-bar right slot fades in once the H1's bottom scrolls above the 52px bar.
  const h1Ref = useRef<HTMLHeadingElement | null>(null);
  const [showBarTitle, setShowBarTitle] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const el = h1Ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setShowBarTitle(rect.bottom < 52);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AppShell rightSlot={showBarTitle ? <EventBarSlot name={event.name} netProfitAmount={np.amount} /> : undefined}>
      <div className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-[680px] px-5 pt-6 pb-24">
          <h1 ref={h1Ref} className="text-[30px] font-extrabold tracking-tight text-ink">{event.name}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {fmtDate(event.date)} · {event.venue} · headcount {event.headcount.toLocaleString()} ({event.comps} comps)
          </p>

          {/* Tabs */}
          <div className="mt-5 flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-full border border-hairline p-0.5">
              {(["performance", "settlement"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-full px-3 py-1 text-[12px] font-semibold uppercase tracking-wider transition-colors ${
                    tab === t ? "text-primary-foreground" : "text-muted-foreground"
                  }`}
                  style={tab === t ? { backgroundColor: "var(--magenta)" } : undefined}
                >
                  {t}
                </button>
              ))}
            </div>
            {tab === "performance" && outstandingCount > 0 && (
              <button
                onClick={() => setTab("settlement")}
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                style={{
                  color: "var(--amber-fg)",
                  borderColor: "var(--amber-fg)",
                  backgroundColor: "var(--amber-bg)",
                }}
              >
                <span
                  aria-hidden
                  className="inline-block h-[6px] w-[6px] rounded-full"
                  style={{ backgroundColor: "var(--amber-fg)" }}
                />
                {outstandingCount} items outstanding → Settlement
              </button>
            )}
          </div>

          {tab === "performance" ? (
            <>
              {/* View control */}
              <div className="mt-6 mb-2 inline-flex rounded-full border border-hairline p-0.5">
                {(["summary", "full"] as ViewMode[]).map((m) => (
                  <button key={m}
                    onClick={() => { setMode(m); setOpenMap({}); }}
                    className={`rounded-full px-3 py-1 text-[12px] font-semibold uppercase tracking-wider transition-colors ${
                      mode === m ? "text-primary-foreground" : "text-muted-foreground"
                    }`}
                    style={mode === m ? { backgroundColor: "var(--magenta)" } : undefined}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* Revenue */}
              <section>
                <SheetHeader label="Revenue" sublabel="VAT-inclusive" />
                {(["ticket_sales", "bar_sales", "sponsorship", "tables_other"] as const).map((cat) => {
                  const b = revBy[cat];
                  const pending = pendingRevenueCount(event, cat);
                  const key = `rev-${cat}`;
                  return (
                    <ExpandableCategory
                      key={cat}
                      open={isOpen(key)} onToggle={() => toggle(key)}
                      name={REVENUE_LABELS[cat]}
                      badge={pending > 0 && !isOpen(key) ? <AmberBadge>{pending} pending</AmberBadge> : null}
                      amount={fmt(b.amount)}
                      vat={b.vat === 0 ? <span className="text-muted-foreground">—</span> : fmt(b.vat)}
                    >
                      <RevenueDrill event={event} cat={cat} />
                    </ExpandableCategory>
                  );
                })}
                <Milestone label="Total revenue" amount={rev.amount} head={head} vat={rev.vat} />
              </section>

              {/* Cost of sales */}
              <section>
                <SheetHeader label="Cost of sales" />
                <ExpandableCategory
                  open={isOpen("cos-drinks")} onToggle={() => toggle("cos-drinks")}
                  name={COST_LABELS.drinks}
                  subline={drinksSubline ? `${drinksSubline}, computed` : undefined}
                  badge={unpaidBillCount(event, (l) => l.category === "cos" && l.sub === "drinks") > 0 && !isOpen("cos-drinks")
                    ? <AmberBadge>{unpaidBillCount(event, (l) => l.category === "cos" && l.sub === "drinks")} due</AmberBadge> : null}
                  amount={fmt(cosBy.drinks.amount)}
                  vat={fmt(cosBy.drinks.vat)}
                >
                  <BillDrill items={cosBy.drinks.items} />
                </ExpandableCategory>
                <ExpandableCategory
                  open={isOpen("cos-food")} onToggle={() => toggle("cos-food")}
                  name={COST_LABELS.food}
                  subline={foodSubline}
                  badge={unpaidBillCount(event, (l) => l.category === "cos" && l.sub === "food") > 0 && !isOpen("cos-food")
                    ? <AmberBadge>{unpaidBillCount(event, (l) => l.category === "cos" && l.sub === "food")} due</AmberBadge> : null}
                  amount={fmt(cosBy.food.amount)}
                  vat={cosBy.food.vat === 0 ? <span className="text-muted-foreground">—</span> : fmt(cosBy.food.vat)}
                >
                  <BillDrill items={cosBy.food.items} />
                </ExpandableCategory>
                <SectionTotal label="Total cost of sales" amount={cos.amount} vat={cos.vat} head={head} />
                <Milestone label="Gross profit" amount={gp.amount} head={head} marginBase={rev.amount} />
              </section>

              {/* Expenses */}
              <section>
                <SheetHeader label="Expenses" />
                {EVENT_COST_KEYS.map((k) => {
                  const b = ecBy[k];
                  const key = `ec-${k}`;
                  const dueCount = unpaidBillCount(event, (l) => l.category === k);
                  const subline =
                    k === "core_production" ? "Venue + everything rented" :
                    k === "decor_merch_supplies" ? "Bought + build labour" :
                    k === "talent" ? talentSub : undefined;
                  return (
                    <ExpandableCategory
                      key={k}
                      open={isOpen(key)} onToggle={() => toggle(key)}
                      name={COST_LABELS[k]}
                      subline={subline}
                      badge={dueCount > 0 && !isOpen(key) ? <AmberBadge>{dueCount} due</AmberBadge> : null}
                      amount={fmt(b.amount)}
                      vat={b.vat === 0 ? <span className="text-muted-foreground">—</span> : fmt(b.vat)}
                    >
                      <BillDrill items={b.items} />
                    </ExpandableCategory>
                  );
                })}
                <SectionTotal label="Total expenses" amount={ec.amount} vat={ec.vat} head={head} />
                <Milestone label="Profit before tax" amount={ep.amount} head={head} marginBase={rev.amount} />
              </section>

              {/* Tax */}
              <section>
                <SheetHeader label="Tax" showVat={false} />
                {hasReturnComponents ? (
                  <ExpandableCategory
                    open={isOpen("tax-vat")} onToggle={() => toggle("tax-vat")}
                    name="VAT payable — net"
                    amount={fmt(event.vat_return.net_payable)}
                    vat=""
                    badge={event.vat_return.status === "due" && !isOpen("tax-vat")
                      ? <AmberBadge>due</AmberBadge> : null}
                  >
                    <DrillHeader cols={["COMPONENT", "", "AMOUNT", ""]} />
                    <DrillRow
                      name="Output VAT declared"
                      inv=""
                      amount={outputDeclared === null ? "—" : fmt(outputDeclared)}
                      vat=""
                    />
                    <DrillRow
                      name="Input VAT claimed"
                      inv=""
                      amount={inputClaimed === null ? "—" : fmt(-inputClaimed)}
                      vat=""
                    />
                    <DrillRow
                      name="Deposits & prepayments"
                      inv=""
                      amount={event.vat_return.deposits === null ? "—" : fmt(-event.vat_return.deposits)}
                      vat=""
                    />
                    <DrillRow
                      name={<b>Net VAT payable</b>}
                      inv=""
                      amount={<b>{fmt(event.vat_return.net_payable)}</b>}
                      vat=""
                      amber={event.vat_return.status === "due"}
                    />

                    <div className="mt-3">
                      <button
                        onClick={() => setShowRecon((s) => !s)}
                        className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-ink"
                      >
                        {showRecon ? "Hide" : "Show"} reconciliation
                      </button>
                    </div>

                    {showRecon && (
                      <div className="mt-3 border-t border-dashed border-hairline pt-3">
                        <div className="pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Output — within revenue vs declared
                        </div>
                        {(["ticket_sales", "bar_sales", "sponsorship", "tables_other"] as const).map((c) => (
                          <DrillRow key={c} name={REVENUE_LABELS[c]} inv="" amount={fmt(revBy[c].vat)} vat="" />
                        ))}
                        <DrillRow name={<b>VAT sitting within all revenue</b>} inv="" amount={<b>{fmt(outputVatWithin)}</b>} vat="" />
                        {outputDeclared !== null && (
                          <>
                            <DrillRow name={<b>Declared output per the return</b>} inv="" amount={<b>{fmt(outputDeclared)}</b>} vat="" />
                            {outputGap !== null && Math.abs(outputGap) > 0.02 && (
                              <DrillRow amber name="Gap — declared scope & rate basis" inv="" amount={fmt(outputGap)} vat="" />
                            )}
                          </>
                        )}

                        <div className="mt-4 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Input — on bills vs claimed
                        </div>
                        <DrillRow name={COST_LABELS.drinks} inv="" amount={fmt(cosBy.drinks.vat)} vat="" />
                        <DrillRow name={COST_LABELS.food} inv="" amount={fmt(cosBy.food.vat)} vat="" />
                        {EVENT_COST_KEYS.map((k) => (
                          <DrillRow key={k} name={COST_LABELS[k]} inv="" amount={fmt(ecBy[k].vat)} vat="" />
                        ))}
                        <DrillRow name={<b>VAT sitting on all bills</b>} inv="" amount={<b>{fmt(inputVatOnBills)}</b>} vat="" />
                        {inputClaimed !== null && (
                          <>
                            <DrillRow name={<b>Claimed in the VAT return</b>} inv="" amount={<b>{fmt(inputClaimed)}</b>} vat="" />
                            {inputGap !== null && Math.abs(inputGap) > 0.02 && (
                              <DrillRow amber name="Unclaimed — see line-level VAT on bills" inv="" amount={fmt(inputGap)} vat="" />
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </ExpandableCategory>
                ) : (
                  <>
                    <CategoryRow
                      name="VAT payable — net"
                      amount={fmt(event.vat_return.net_payable)}
                      vat=""
                    />
                    {event.vat_return.note && (
                      <p className="mt-3 text-[12px] text-muted-foreground leading-[1.5] max-w-[44ch]">
                        {event.vat_return.note}
                      </p>
                    )}
                  </>
                )}
                {hasReturnComponents && event.vat_return.note && (
                  <p className="mt-3 text-[12px] text-muted-foreground leading-[1.5] max-w-[44ch]">
                    {event.vat_return.note}
                  </p>
                )}

                <div className="mt-2">
                  <HeroMilestone label="Profit after tax" amount={np.amount} head={head} marginBase={rev.amount} />
                </div>
              </section>

              <p className="mt-10 text-[12px] text-muted-foreground leading-[1.5] max-w-[44ch]">
                All figures BBD. Every number on this page is derived from bill lines and revenue entries — nothing is written by hand.
              </p>
            </>
          ) : (
            <SettlementTab event={event} profitAfterTax={np.amount} cash={cash} head={head} />
          )}
        </div>
      </div>
    </AppShell>
  );
}

/* ---------- settlement tab ---------- */

function SettlementTab({
  event, profitAfterTax, cash, head,
}: { event: EventRecord; profitAfterTax: number; cash: number; head: number }) {
  const collect = toCollect(event);
  const pay = toPay(event);
  const net = collect - pay;

  const receivables = event.revenue.filter((r) => r.status === "pending");

  // Payables: unpaid bills as single rows at full bill amount
  const unpaidBills = event.bills.filter((b) => b.status === "unpaid");
  const payables = unpaidBills.map((b) => {
    const amount = b.lines.reduce((s, l) => s + l.amount, 0);
    const cats = Array.from(new Set(b.lines.map((l) => l.category)));
    return { bill: b, amount, cats };
  });
  const payablesTotal = payables.reduce((s, p) => s + p.amount, 0);
  const vatDue = event.vat_return.status === "due" ? event.vat_return.net_payable : 0;
  const payablesGrand = payablesTotal + vatDue;

  const settlementTotal = event.settlement_items.reduce((s, i) => s + i.amount, 0);

  const categoryLabel = (c: string): string => {
    if (c === "cos") return "cost of sales";
    return (COST_LABELS as Record<string, string>)[c] ?? c;
  };

  return (
    <>
      {/* Status strip moved here */}
      <div className="mt-6 grid grid-cols-3 divide-x divide-hairline border-y border-hairline">
        <StripCell label="To collect" value={collect} amber={collect > 0} />
        <StripCell label="To pay" value={pay} amber={pay > 0} />
        <StripCell label="Net to settle" value={net} magenta={net < 0} />
      </div>

      {/* Receivables */}
      <section>
        <SheetHeader label="Receivables" showVat={false} />
        {receivables.length === 0 ? (
          <p className="px-3 py-4 text-[13px] text-muted-foreground italic">Nothing to collect.</p>
        ) : (
          <>
            {receivables.map((r) => (
              <div key={r.id} className="border-b border-dashed border-hairline">
                <div className="grid grid-cols-[minmax(0,1fr)_168px_60px] items-baseline gap-x-3 px-3 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center">
                      <AmberDot />
                      <span className="text-[16px] font-medium" style={{ color: "var(--amber-fg)" }}>
                        {r.label}
                      </span>
                    </div>
                    <div className="mt-0.5 pl-[calc(1ch+0.5rem)] text-[11.5px] uppercase tracking-wider text-muted-foreground">
                      pending
                    </div>
                  </div>
                  <div className="num text-right text-[16px] font-bold" style={{ color: "var(--amber-fg)" }}>
                    {fmt(r.amount)}
                  </div>
                  <div />
                </div>
              </div>
            ))}
            <SectionTotal label="Total receivables" amount={collect} showVat={false} />
          </>
        )}
      </section>

      {/* Payables */}
      <section>
        <SheetHeader label="Payables" />
        {payables.length === 0 && vatDue === 0 ? (
          <p className="px-3 py-4 text-[13px] text-muted-foreground italic">Nothing to pay.</p>
        ) : (
          <>
            <DrillHeader cols={["VENDOR", "INV #", "AMOUNT", ""]} />
            {payables.map((p) => (
              <DrillRow
                key={p.bill.id}
                amber
                name={p.bill.vendor}
                sub={p.cats.length > 1 ? `across ${p.cats.map(categoryLabel).join(", ")}` : categoryLabel(p.cats[0] ?? "")}
                inv={invLabel(p.bill.invoice)}
                amount={fmt(p.amount)}
                vat=""
              />
            ))}
            {vatDue > 0 && (
              <DrillRow
                amber
                name="VAT payable — net"
                inv="BRA"
                amount={fmt(vatDue)}
                vat=""
              />
            )}
            <SectionTotal label="Total payables" amount={payablesGrand} showVat={false} />
          </>
        )}
      </section>

      {/* Settlement items */}
      {event.settlement_items.length > 0 && (
        <section>
          <SheetHeader label="Settlement items" showVat={false} />
          {event.settlement_items.map((s, i) => {
            const isDue = s.status === "due";
            const muted = !isDue;
            return (
              <div key={i} className="border-b border-dashed border-hairline">
                <div className="grid grid-cols-[minmax(0,1fr)_168px_60px] items-baseline gap-x-3 px-3 py-3">
                  <div className="min-w-0 flex items-center">
                    {isDue && <AmberDot />}
                    <span
                      className={`text-[16px] ${isDue ? "font-bold" : "font-medium"} ${muted ? "text-muted-foreground" : ""}`}
                      style={isDue ? { color: "var(--amber-fg)" } : undefined}
                    >
                      {s.label}
                    </span>
                    <span
                      className={`ml-2 text-[10px] font-semibold uppercase tracking-wider ${muted ? "text-muted-foreground" : ""}`}
                      style={isDue ? { color: "var(--amber-fg)" } : undefined}
                    >
                      {s.status}
                    </span>
                  </div>
                  <div
                    className={`num text-right text-[16px] ${isDue ? "font-bold" : "font-medium"} ${muted ? "text-muted-foreground" : ""}`}
                    style={isDue ? { color: "var(--amber-fg)" } : undefined}
                  >
                    {fmt(s.amount)}
                  </div>
                  <div />
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Cash position */}
      <section>
        <SheetHeader label="Cash position" showVat={false} />
        <CategoryRow name="Profit after tax" amount={fmt(profitAfterTax)} vat="" />
        <CategoryRow name="Settlement items" amount={fmt(settlementTotal)} vat="" />
        <SectionTotal label="Cash when fully settled" amount={cash} head={head} showVat={false} />
      </section>

      <p className="mt-10 text-[12px] text-muted-foreground leading-[1.5] max-w-[44ch]">
        All figures BBD. Settlement is a view of cash flows outside the P&L — every number is derived from the same bills, revenue and settlement items.
      </p>
    </>
  );
}


function SheetHeader({ label, sublabel, caption, showVat = true }: { label: string; sublabel?: string; caption?: string; showVat?: boolean }) {
  return (
    <>
      <div
        className="mt-11 grid grid-cols-[minmax(0,1fr)_168px_60px] items-baseline gap-x-3 px-3 py-2.5"
        style={{ backgroundColor: "var(--panel)" }}
      >
        <div className="min-w-0">
          <div className="text-[12px] font-bold uppercase text-ink whitespace-nowrap" style={{ letterSpacing: "0.04em" }}>{label}</div>
          {sublabel && (
            <div className="mt-0.5 text-[11px] uppercase text-muted-foreground whitespace-nowrap" style={{ letterSpacing: "0.04em" }}>{sublabel}</div>
          )}
        </div>
        <div className="text-right text-[11px] uppercase text-muted-foreground self-start" style={{ letterSpacing: "0.06em" }}>
          Amount
        </div>
        <div className="text-right text-[11px] uppercase text-muted-foreground self-start" style={{ letterSpacing: "0.06em" }}>
          {showVat ? "VAT" : ""}
        </div>
      </div>

      {caption && (
        <p className="mt-2 text-[12px] text-muted-foreground leading-[1.5] max-w-[44ch]">{caption}</p>
      )}
      <div className="h-6" />
    </>
  );
}
