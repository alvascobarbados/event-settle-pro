import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Wordmark } from "@/components/setl/Wordmark";
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
      { title: `${params.id.toUpperCase()} — SETL` },
      { name: "description", content: `Performance sheet for ${params.id} — SETL.` },
      { property: "og:title", content: `${params.id.toUpperCase()} — SETL` },
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
    <div className={`grid grid-cols-[minmax(0,1fr)_96px_64px] items-baseline gap-x-3 py-3 ${className}`}>
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

/** Drill panel wrapper (soft #FBF4F8 bg). */
function DrillPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b border-dashed border-hairline" style={{ backgroundColor: "var(--panel)" }}>
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}

function DrillHeader({ cols }: { cols: [string, string, string, string] }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_88px_96px_64px] gap-x-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      <div>{cols[0]}</div>
      <div>{cols[1]}</div>
      <div className="text-right">{cols[2]}</div>
      <div className="text-right">{cols[3]}</div>
    </div>
  );
}

function DrillRow({
  name, sub, inv, amount, vat, amber, indent = 0,
}: {
  name: React.ReactNode; sub?: React.ReactNode; inv?: React.ReactNode;
  amount: React.ReactNode; vat: React.ReactNode; amber?: boolean; indent?: number;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_88px_96px_64px] items-baseline gap-x-3 border-t border-dashed border-hairline py-2">
      <div className="min-w-0" style={{ paddingLeft: indent * 12 }}>
        <div className="flex items-center text-[13px]">
          {amber && <AmberDot />}
          <span className={`truncate ${amber ? "font-bold" : ""}`}
                style={amber ? { color: "var(--amber-fg)" } : undefined}>{name}</span>
        </div>
        {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
      </div>
      <div className="truncate text-[12px] text-muted-foreground">{inv}</div>
      <div className={`num text-right text-[13px] ${amber ? "font-bold" : ""}`}
           style={amber ? { color: "var(--amber-fg)" } : undefined}>{amount}</div>
      <div className="num text-right text-[12px] text-muted-foreground">{vat}</div>
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
    <div className="grid grid-cols-[minmax(0,1fr)_96px_64px] items-baseline gap-x-3 border-t border-ink pt-3 pb-3">
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
    <div className="grid grid-cols-[minmax(0,1fr)_96px_64px] items-baseline gap-x-3 border-t-2 border-ink pt-4 pb-4"
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
    <div className="grid grid-cols-[minmax(0,1fr)_96px_64px] items-baseline gap-x-3 pt-5 pb-4"
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
  const cols: [string, string, string, string] =
    cat === "sponsorship" ? ["SPONSOR", "STATUS", "AMOUNT", "VAT"] : ["ITEM", "", "AMOUNT", "VAT"];
  return (
    <div>
      <DrillHeader cols={cols} />
      {bucket.entries.map((e) => {
        const pending = e.status === "pending";
        return (
          <DrillRow key={e.id}
            name={e.label}
            inv={cat === "sponsorship" ? (pending ? <span style={{ color: "var(--amber-fg)" }}>pending</span> : "received") : ""}
            amount={fmt(e.amount)}
            vat={e.vatable ? fmt(vatWithin(e.amount)) : <span className="text-muted-foreground">—</span>}
            amber={pending}
          />
        );
      })}
    </div>
  );
}

/* ---------- COS / event cost drills grouped by vendor with credits ---------- */

function VendorGroupedDrill({
  items, currency = "invoice",
}: {
  items: { line: BillLine; bill: Bill }[];
  currency?: "invoice";
}) {
  const groups = groupByVendor(items);
  return (
    <div>
      <DrillHeader cols={["VENDOR", "INV #", "AMOUNT", "VAT"]} />
      {groups.map((g, i) => {
        const hasCredit = g.creditRows.length > 0;
        const invLine = g.invoiceRow;
        // parent row
        return (
          <div key={i}>
            <DrillRow
              name={g.vendor}
              sub={g.descriptors[0]}
              inv={hasCredit ? "" : invLabel(g.invoice)}
              amount={fmt(g.netAmount)}
              vat={g.netVat === 0 && !invLine?.line.vat ? <span className="text-muted-foreground">—</span> : fmt(g.netVat)}
              amber={g.hasUnpaid}
            />
            {hasCredit && invLine && (
              <>
                <DrillRow
                  indent={1}
                  name={<span className="text-muted-foreground">Invoice</span>}
                  inv={invLabel(invLine.bill.invoice)}
                  amount={fmt(invLine.line.amount)}
                  vat={invLine.line.vat === null ? <span className="text-muted-foreground">—</span> : fmt(invLine.line.vat)}
                />
                {g.creditRows.map((c, j) => (
                  <DrillRow
                    key={j}
                    indent={1}
                    name={<span className="text-muted-foreground">Credit</span>}
                    inv={invLabel(c.bill.invoice)}
                    amount={<span style={{ color: "var(--magenta)" }}>{fmt(c.line.amount)}</span>}
                    vat={c.line.vat === null ? <span className="text-muted-foreground">—</span>
                      : <span style={{ color: "var(--magenta)" }}>{fmt(c.line.vat)}</span>}
                  />
                ))}
              </>
            )}
          </div>
        );
      })}
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

function EventSheet() {
  const event = Route.useLoaderData();
  const [mode, setMode] = useState<ViewMode>("summary");
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

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

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[680px] px-5 pt-8 pb-24">
        {/* Header */}
        <header className="flex items-center justify-between">
          <Wordmark className="text-lg" />
          <div className="text-[12px] text-muted-foreground">
            <Link to="/" className="hover:text-ink">Events</Link>
            <span className="mx-1.5">/</span>
            <span className="text-ink">{event.name}</span>
          </div>
        </header>

        <h1 className="mt-6 text-[30px] font-extrabold tracking-tight text-ink">{event.name}</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {fmtDate(event.date)} · {event.venue} · headcount {event.headcount.toLocaleString()} ({event.comps} comps)
        </p>

        <StatusStrip event={event} />

        {/* View control */}
        <div className="mb-2 inline-flex rounded-full border border-hairline p-0.5">
          {(["summary", "full"] as ViewMode[]).map((m) => (
            <button key={m}
              onClick={() => { setMode(m); if (m === "full") setOpenMap({}); else setOpenMap({}); }}
              className={`rounded-full px-3 py-1 text-[12px] font-semibold uppercase tracking-wider transition-colors ${
                mode === m ? "text-primary-foreground" : "text-muted-foreground"
              }`}
              style={mode === m ? { backgroundColor: "var(--magenta)" } : undefined}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Ladder */}
        <section>
          <SheetHeader label="Revenue — VAT-inclusive" />
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
            <VendorGroupedDrill items={cosBy.drinks.items} />
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
            <VendorGroupedDrill items={cosBy.food.items} />
          </ExpandableCategory>
          <SectionTotal label="Total cost of sales" amount={cos.amount} vat={cos.vat} head={head} />
          <Milestone label="Gross profit" amount={gp.amount} head={head} marginBase={rev.amount} />
        </section>

        {/* Event costs */}
        <section>
          <SheetHeader label="Event costs" />
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
                <VendorGroupedDrill items={b.items} />
              </ExpandableCategory>
            );
          })}
          <SectionTotal label="Total event costs" amount={ec.amount} vat={ec.vat} head={head} />
          <Milestone label="Event profit" amount={ep.amount} head={head} marginBase={rev.amount} />
        </section>

        {/* VAT — BRA */}
        <section>
          <SheetHeader label="VAT — Barbados Revenue Authority" showVat={false} />

          {/* Output */}
          <ExpandableCategory
            open={isOpen("vat-output")} onToggle={() => toggle("vat-output")}
            name="Output VAT on revenue"
            badge={outputGap !== null && Math.abs(outputGap) > 0.02 && !isOpen("vat-output")
              ? <AmberBadge>Gap {fmt(Math.abs(outputGap))}</AmberBadge> : null}
            amount={fmt(outputVatWithin)}
            vat=""
          >
            <DrillHeader cols={["SOURCE", "", "AMOUNT", ""]} />
            {(["ticket_sales", "bar_sales", "sponsorship", "tables_other"] as const).map((c) => (
              <DrillRow key={c} name={REVENUE_LABELS[c]} inv="" amount={fmt(revBy[c].vat)} vat="" />
            ))}
            <DrillRow name={<b>VAT sitting within all revenue</b>} inv="" amount={<b>{fmt(outputVatWithin)}</b>} vat="" />
            {outputDeclared === null ? (
              <DrillRow name={<span className="text-muted-foreground">Return components not recorded</span>} inv="" amount="" vat="" />
            ) : (
              <>
                <DrillRow name={<b>Declared output per the return</b>} inv="" amount={<b>{fmt(outputDeclared)}</b>} vat="" />
                {Math.abs(outputGap!) > 0.02 && (
                  <DrillRow amber name="Difference — declared scope & rate basis" inv="" amount={fmt(outputGap!)} vat="" />
                )}
              </>
            )}
          </ExpandableCategory>

          {/* Input */}
          <ExpandableCategory
            open={isOpen("vat-input")} onToggle={() => toggle("vat-input")}
            name="Input VAT on purchases"
            badge={inputGap !== null && Math.abs(inputGap) > 0.02 && !isOpen("vat-input")
              ? <AmberBadge>Gap {fmt(Math.abs(inputGap))}</AmberBadge> : null}
            amount={fmt(inputVatOnBills)}
            vat=""
          >
            <DrillHeader cols={["SOURCE", "", "AMOUNT", ""]} />
            <DrillRow name={COST_LABELS.drinks} inv="" amount={fmt(cosBy.drinks.vat)} vat="" />
            <DrillRow name={COST_LABELS.food} inv="" amount={fmt(cosBy.food.vat)} vat="" />
            {EVENT_COST_KEYS.map((k) => (
              <DrillRow key={k} name={COST_LABELS[k]} inv="" amount={fmt(ecBy[k].vat)} vat="" />
            ))}
            <DrillRow name={<b>VAT sitting on all bills</b>} inv="" amount={<b>{fmt(inputVatOnBills)}</b>} vat="" />
            {inputClaimed === null ? (
              <DrillRow name={<span className="text-muted-foreground">Return components not recorded</span>} inv="" amount="" vat="" />
            ) : (
              <>
                <DrillRow name={<b>Claimed in the VAT return</b>} inv="" amount={<b>{fmt(inputClaimed)}</b>} vat="" />
                {Math.abs(inputGap!) > 0.02 && (
                  <DrillRow amber name="Unclaimed — see line-level VAT on bills" inv="" amount={fmt(inputGap!)} vat="" />
                )}
              </>
            )}
          </ExpandableCategory>

          {/* Deposits */}
          {event.vat_return.deposits !== null && (
            <CategoryRow
              name="Deposits & prepayments"
              amount={fmt(-event.vat_return.deposits)}
              vat=""
            />
          )}

          {/* Net VAT payable */}
          <CategoryRow
            name={<span>Net VAT payable — BRA</span>}
            amber={event.vat_return.status === "due"}
            amount={fmt(event.vat_return.net_payable)}
            vat=""
          />
          {event.vat_return.note && (
            <p className="mt-3 text-[12px] text-muted-foreground leading-[1.5] max-w-[44ch]">
              {event.vat_return.note}
            </p>
          )}

          <div className="mt-2">
            <HeroMilestone label="Net profit" amount={np.amount} head={head} marginBase={rev.amount} />
          </div>
        </section>

        {/* Settlement */}
        <section>
          <SheetHeader label="Settlement" caption="Cash items outside this event's P&L" showVat={false} />
          {event.settlement_items.map((s: import("@/lib/setl-data").SettlementItem, i: number) => (
            <CategoryRow
              key={i} name={s.label}
              amber={s.status === "due"}
              amount={fmt(s.amount)}
              vat=""
            />
          ))}
          <SectionTotal label="Cash result after settlement" amount={cash} head={head} showVat={false} />
        </section>

        <p className="mt-10 text-[12px] text-muted-foreground leading-[1.5] max-w-[44ch]">
          All figures BBD. Every number on this page is derived from bill lines and revenue entries — nothing is written by hand.
        </p>
      </div>
    </div>
  );
}

function SheetHeader({ label }: { label: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 pb-2">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Amount</div>
      <div className="min-w-[64px] text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">VAT</div>
    </div>
  );
}
