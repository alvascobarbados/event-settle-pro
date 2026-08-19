import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ScrollTop } from "@/components/setlup/Shell";
import {
  LedgerHead,
  LedgerRow,
  Milestone,
  SectionHeader,
  SectionTotal,
  StatLine,
} from "@/components/setlup/Ledger";
import { Card, Chip, FinePrint, PillGroup, SectionLabel } from "@/components/setlup/ui";
import { budgetReportOf, cashOf, pnlOf, type SectionResult } from "@/lib/setlup/compute";
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

function Reports() {
  const { id } = Route.useParams();
  const { db, getEvent } = useSetlup();
  const event = getEvent(id);
  const [tab, setTab] = useState<Tab>("pnl");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  if (!event) return null;

  const pnl = pnlOf(db, event);
  const cash = cashOf(db, event);
  const budget = budgetReportOf(db, event);
  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));

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
            chip={r.line.vatExempt ? <Chip tone="neutral">no vat</Chip> : undefined}
          />
          {open[r.line.id] &&
            r.children.map((c) => (
              <LedgerRow key={c.line.id} label={c.line.name} amount={c.amount} vat={c.vat} child />
            ))}
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
          { value: "budget", label: "Budget" },
          { value: "vat", label: "VAT" },
          { value: "cash", label: "Cash" },
        ]}
      />

      {tab === "pnl" && (
        <>
          <div className="mt-4 flex items-center justify-between">
            <SectionLabel>{pnl.budgeted ? "Budgeted P&L" : "Actual P&L"}</SectionLabel>
            <Chip tone="neutral">VAT inclusive</Chip>
          </div>
          <Card className="mt-2 overflow-hidden pt-3">
            <LedgerHead vatLabel="VAT in" />
            {renderSection("Revenue", pnl.revenue, "Total revenue")}
            {renderSection("Cost of sales", pnl.cos, "Total cost of sales")}
            <Milestone
              label="Gross profit"
              amount={pnl.grossProfit}
              sub={`${pct(pnl.grossProfit, pnl.revenue.amount)} margin`}
            />
            {renderSection("Expenses", pnl.expenses, "Total expenses")}
            <Milestone
              label="Profit before tax"
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
          <div className="mt-4">
            <SectionLabel>VAT return · 17.5% inclusive</SectionLabel>
          </div>
          <Card className="mt-2 overflow-hidden">
            <StatLine label="Output VAT" sub="VAT within revenue" amount={pnl.outputVat} />
            <StatLine label="Input VAT" sub="VAT within cost of sales and expenses" amount={pnl.inputVat} />
            <Milestone
              label={pnl.netVat >= 0 ? "Net VAT payable" : "Net VAT refundable"}
              amount={Math.abs(pnl.netVat)}
              sub={event.vatExported ? "Marked exported" : "Not yet exported"}
              hero
            />
          </Card>
          <FinePrint>
            VAT within an inclusive amount is amount × 17.5 ÷ 117.5. Exempt lines contribute nothing.
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
    </div>
  );
}
