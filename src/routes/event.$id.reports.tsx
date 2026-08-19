import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ScrollTop } from "@/components/setlup/Shell";
import { BillPeek, type PeekTarget } from "@/components/setlup/BillPeek";
import {
  LedgerHead,
  LedgerRow,
  Milestone,
  SectionHeader,
  SectionTotal,
  StatLine,
  VatRow,
} from "@/components/setlup/Ledger";
import { Card, FinePrint, PillGroup, SectionLabel } from "@/components/setlup/ui";
import { budgetReportOf, cashOf, pnlOf, vatReportOf, type SectionResult } from "@/lib/setlup/compute";
import { money, pct, perHead } from "@/lib/setlup/format";
import { useSetlup } from "@/lib/setlup/store";

export const Route = createFileRoute("/event/$id/reports")({
  head: () => ({
    meta: [
      { title: "Reports — SETLUP" },
      { name: "description", content: "Profit and loss, budget variance, VAT return and cash reconciliation for this event." },
      { property: "og:title", content: "Reports — SETLUP" },
      { property: "og:description", content: "Profit and loss, budget variance, VAT return and cash reconciliation for this event." },
    ],
  }),
  component: Reports,
});

type Tab = "pnl" | "budget" | "vat" | "cash";
type View = "summary" | "detail";

function Reports() {
  const { id } = Route.useParams();
  const { db, getEvent, setLineVatExcluded } = useSetlup();
  const event = getEvent(id);
  const [tab, setTab] = useState<Tab>("pnl");
  const [view, setView] = useState<View>("summary");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [peekLineId, setPeekLineId] = useState<string | null>(null);
  if (!event) return null;

  const pnl = pnlOf(db, event);
  const cash = cashOf(db, event);
  const budget = budgetReportOf(db, event);
  const vat = vatReportOf(db, event, pnl);

  /* Detail expands every drill-down at once; Summary collapses them all. */
  const applyView = (v: View) => {
    setView(v);
    setOpen(
      v === "detail"
        ? Object.fromEntries(
            [...pnl.revenue.rows, ...pnl.expenses.rows]
              .filter((r) => r.children.length > 0)
              .map((r) => [r.line.id, true]),
          )
        : {},
    );
  };
  const viewPills = (
    <div className="mt-3">
      <PillGroup<View>
        value={view}
        onChange={applyView}
        options={[
          { value: "summary", label: "Summary" },
          { value: "detail", label: "Detail" },
        ]}
      />
    </div>
  );
  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const fileFor = (lineId: string) => db.files.find((f) => f.lineId === lineId);

  const peekFile = peekLineId ? fileFor(peekLineId) : undefined;
  const peekRow = peekLineId
    ? [pnl.revenue, pnl.expenses]
        .flatMap((s) => s.rows.flatMap((r) => r.children))
        .find((c) => c.line.id === peekLineId)
    : undefined;
  const peekTarget: PeekTarget | null =
    peekRow && peekFile
      ? {
          label: peekRow.line.name,
          detail: [peekRow.line.detail, peekRow.line.ref ? `inv ${peekRow.line.ref}` : null]
            .filter(Boolean)
            .join(" · "),
          amount: peekRow.amount,
          vat: peekRow.vat,
          file: peekFile,
        }
      : null;

  const renderSection = (title: string, sec: SectionResult, totalLabel: string) => (
    <>
      <SectionHeader title={title} />
      {sec.rows.map((r) => (
        <div key={r.line.id}>
          <LedgerRow
            label={r.line.name}
            amount={r.amount}
            vat={r.vat}
            expandable={r.children.length > 0}
            open={!!open[r.line.id]}
            onToggle={() => toggle(r.line.id)}
          />
          {open[r.line.id] &&
            r.children.map((c) => {
              const linked = fileFor(c.line.id);
              return (
                <LedgerRow
                  key={c.line.id}
                  label={c.line.name}
                  detail={[c.line.detail, c.line.ref ? `inv ${c.line.ref}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                  amount={c.amount}
                  vat={c.vat}
                  child
                  hasFile={!!linked}
                  onSelect={
                    linked
                      ? () => setPeekLineId((p) => (p === c.line.id ? null : c.line.id))
                      : undefined
                  }
                />
              );
            })}
        </div>
      ))}
      <SectionTotal label={totalLabel} amount={sec.amount} vat={sec.vat} />
    </>
  );


  return (
    <div className="px-4 pb-10 pt-4">
      <ScrollTop />
      <PillGroup<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: "pnl", label: "P&L" },
          ...(event.budgetBaseline && event.stage === "reconciling"
            ? [{ value: "budget" as Tab, label: "Budget" }]
            : []),
          { value: "vat", label: "VAT" },
          ...(event.stage === "reconciling" ? [{ value: "cash" as Tab, label: "Cash" }] : []),
        ]}
      />

      {tab === "pnl" && (
        <>
          {viewPills}
          <div className="mt-4">
            <SectionLabel>{pnl.budgeted ? "Budgeted P&L" : "Actual P&L"}</SectionLabel>
          </div>
          <Card className="mt-2 overflow-hidden pt-3">
            <LedgerHead vatLabel="VAT" />
            {renderSection("Revenue", pnl.revenue, "Total revenue")}
            {renderSection("Expenses", pnl.expenses, "Total expenses")}
            <Milestone
              label="Profit before VAT"
              amount={pnl.profitBeforeTax}
              sub={
                event.headcount
                  ? `${pct(pnl.profitBeforeTax, pnl.revenue.amount)} of revenue · ${perHead(pnl.profitBeforeTax, event.headcount)}`
                  : `${pct(pnl.profitBeforeTax, pnl.revenue.amount)} of revenue`
              }
              hero
            />
          </Card>
          <FinePrint>
            Tap a line with a chevron to see its breakdown. Lines marked “no vat” are outside the VAT net.
          </FinePrint>
        </>
      )}

      {tab === "budget" && (
        <>
          <div className="mt-4">
            <SectionLabel>Budget vs actual</SectionLabel>
          </div>
          <Card className="mt-2 overflow-hidden">
            {budget.rows.map((r) => {
              const variance = r.actual - r.budget;
              const favourable = r.favourableWhenOver ? variance >= 0 : variance <= 0;
              return (
                <div key={r.name} className="dashed-row px-4 py-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[14px] font-semibold text-ink">{r.name}</span>
                    <span className="num text-[14.5px] font-bold text-ink">{money(r.actual)}</span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between gap-3 text-[11.5px]">
                    <span className="num text-mute">budget {money(r.budget)}</span>
                    <span
                      className="num font-bold"
                      style={{ color: favourable ? "var(--green-fg)" : "var(--red)" }}
                    >
                      {variance >= 0 ? "+" : "\u2212"}
                      {money(Math.abs(variance))}
                    </span>
                  </div>
                </div>
              );
            })}
            <StatLine label="Budgeted profit" amount={budget.budgetProfit} />
            <Milestone
              label="Variance to budget"
              amount={budget.variance}
              sub={`Actual profit ${money(budget.actualProfit)}`}
              hero
            />
          </Card>
        </>
      )}

      {tab === "vat" && (
        <>
          {viewPills}
          <div className="mt-4">
            <SectionLabel>VAT return · 17.5% inclusive</SectionLabel>
          </div>
          <Card className="mt-2 overflow-hidden">
            {view === "summary" ? (
              <>
                <StatLine label="Output VAT" sub="VAT within revenue" amount={vat.output} />
                <StatLine label="Input VAT" sub="VAT within expenses" amount={vat.input} />
              </>
            ) : (
              <>
                <SectionHeader title="Output VAT on revenue" />
                <LedgerHead vatLabel="VAT" />
                {vat.outputRows.map((r) => (
                  <VatRow
                    key={r.line.id}
                    label={r.line.name}
                    detail={r.detail || undefined}
                    amount={r.amount}
                    vat={r.vat}
                    included={!r.excluded}
                    onToggle={() => setLineVatExcluded(r.line.id, !r.excluded)}
                  />
                ))}
                <StatLine label="Output VAT" amount={vat.output} strong />

                <SectionHeader title="Input VAT on purchases" />
                <LedgerHead vatLabel="VAT" />
                {vat.inputRows.map((r) => (
                  <VatRow
                    key={r.line.id}
                    label={r.line.name}
                    detail={r.detail || undefined}
                    amount={r.amount}
                    vat={r.vat}
                    included={!r.excluded}
                    onToggle={() => setLineVatExcluded(r.line.id, !r.excluded)}
                  />
                ))}
                <StatLine label="Input VAT" amount={vat.input} strong />
              </>
            )}
            <Milestone
              label={vat.net >= 0 ? "Net VAT payable" : "Net VAT refundable"}
              amount={Math.abs(vat.net)}
              sub={
                [
                  event.vatExported ? "Marked exported" : "Not yet exported",
                  vat.excludedCount > 0
                    ? `${vat.excludedCount} item${vat.excludedCount === 1 ? "" : "s"} excluded`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              }
              hero
            />
          </Card>
          <FinePrint>
            VAT within an inclusive amount is amount × 17.5 ÷ 117.5. Exempt lines contribute nothing. Untick a row to
            leave it out of the VAT report — P&L amounts never change.
          </FinePrint>
        </>
      )}

      {tab === "cash" && (
        <>
          <div className="mt-4">
            <SectionLabel>Cash reconciliation</SectionLabel>
          </div>
          <Card className="mt-2 overflow-hidden">
            <StatLine label="Collected to date" amount={cash.collected} tone="positive" />
            <StatLine label="Paid to date" amount={cash.paid} tone="negative" />
            <StatLine label="Cash position" amount={cash.position} strong />
            <StatLine label="Still to collect" amount={cash.remainingIn} tone="positive" />
            <StatLine label="Still to pay" amount={cash.remainingOut} tone="negative" />
            <StatLine label="Net VAT" amount={cash.netVat} tone="negative" />
            <Milestone label="Cash if fully settled" amount={cash.fullySettled} hero />
          </Card>
          <FinePrint>
            Cash if fully settled = cash position + still to collect − still to pay − net VAT.
          </FinePrint>
        </>
      )}

      <BillPeek target={peekTarget} onClose={() => setPeekLineId(null)} />
    </div>
  );
}
