import { createFileRoute, Link } from "@tanstack/react-router";
import { ScrollTop } from "@/components/setlup/Shell";
import { Milestone, StatLine } from "@/components/setlup/Ledger";
import { Card, Chip, FinePrint, LockedBanner, PrimaryButton, SectionLabel, StageBadge } from "@/components/setlup/ui";
import {
  attentionOf,
  cashOf,
  pathToClose,
  pnlOf,
  toCollect,
  toPay,
} from "@/lib/setlup/compute";
import { fmtDate, money, pct, perHead } from "@/lib/setlup/format";
import { useSetlup } from "@/lib/setlup/store";

export const Route = createFileRoute("/event/$id/")({
  head: () => ({
    meta: [
      { title: "Event home — SETLUP" },
      { name: "description", content: "Where this event stands: profit, outstanding money, what needs attention and the path to close." },
      { property: "og:title", content: "Event home — SETLUP" },
      { property: "og:description", content: "Where this event stands: profit, outstanding money, what needs attention and the path to close." },
    ],
  }),
  component: EventHome,
});

function EventHome() {
  const { id } = Route.useParams();
  const { db, getEvent, markVatExported, closeEvent, reopenEvent, setStage, showToast } = useSetlup();
  const event = getEvent(id);
  if (!event) return null;

  const pnl = pnlOf(db, event);
  const collect = toCollect(db, event);
  const pay = toPay(db, event);
  const cash = cashOf(db, event);
  const attention = attentionOf(db, event);
  const path = pathToClose(db, event);

  return (
    <div className="px-4 pb-10 pt-4">
      <ScrollTop />

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 text-[12.5px] text-mute">
          {fmtDate(event.date)} · {event.venue}
          {event.headcount ? ` · ${event.headcount.toLocaleString()} in` : event.capacity ? ` · cap ${event.capacity.toLocaleString()}` : ""}
        </div>
        <StageBadge stage={event.stage} />
      </div>

      {event.stage === "closed" && (
        <div className="mt-3">
          <LockedBanner lockedAt={event.lockedAt ? fmtDate(event.lockedAt) : undefined} />
        </div>
      )}

      <Card className="mt-3 overflow-hidden">
        <Milestone
          label={pnl.budgeted ? "Budgeted profit" : "Profit before tax"}
          amount={pnl.profitBeforeTax}
          sub={`${pct(pnl.profitBeforeTax, pnl.revenue.amount)} of revenue${
            event.headcount ? ` · ${perHead(pnl.profitBeforeTax, event.headcount)}` : ""
          }`}
          hero
        />
        <div className="grid grid-cols-3 divide-x" style={{ borderColor: "var(--hairline)" }}>
          <Cell label="Revenue" value={pnl.revenue.amount} />
          <Cell label="Cost of sales" value={pnl.cos.amount} />
          <Cell label="Expenses" value={pnl.expenses.amount} />
        </div>
      </Card>

      {event.stage === "planning" ? (
        <>
          <div className="mt-6">
            <SectionLabel>Path to ready</SectionLabel>
          </div>
          <Card className="mt-2 overflow-hidden">
            {(event.planningRows ?? []).map((r) => (
              <div key={r.name} className="dashed-row flex items-center justify-between gap-3 px-4 py-3.5">
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-ink">{r.name}</span>
                  <span className="block text-[11.5px] text-mute">{r.meta}</span>
                </span>
                <Chip tone={r.state === "done" ? "green" : r.state === "progress" ? "amber" : "neutral"}>
                  {r.state === "done" ? "Done" : r.state === "progress" ? "In progress" : "Open"}
                </Chip>
              </div>
            ))}
            <div className="px-4 py-3.5">
              <PrimaryButton
                onClick={() => {
                  setStage(event.id, "reconciling");
                  showToast("Event moved to reconciling");
                }}
              >
                Start reconciling
              </PrimaryButton>
              <FinePrint>
                Reconciling swaps every figure from budget to actual and starts tracking money in and out.
              </FinePrint>
            </div>
          </Card>
        </>
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between">
            <SectionLabel>Outstanding</SectionLabel>
            <Link
              to="/event/$id/finance"
              params={{ id: event.id }}
              className="text-[11.5px] font-bold uppercase"
              style={{ color: "var(--accent-deep-c)", letterSpacing: "0.06em" }}
            >
              Open finance
            </Link>
          </div>
          <Card className="mt-2 overflow-hidden">
            <StatLine label="To collect" amount={collect} sub="Money owed to you" tone={collect > 0 ? "positive" : "neutral"} />
            <StatLine label="To pay" amount={pay} sub="Bills still open" tone={pay > 0 ? "negative" : "neutral"} />
            <StatLine label="Cash position" amount={cash.position} sub="Collected less paid, to date" strong />
          </Card>

          <div className="mt-6">
            <SectionLabel>Needs attention</SectionLabel>
          </div>
          <Card className="mt-2 overflow-hidden">
            {attention.length === 0 ? (
              <div className="px-4 py-5 text-[13px] text-mute">Nothing overdue or due within 7 days.</div>
            ) : (
              attention.map((a) => (
                <div key={a.id} className="dashed-row flex items-center justify-between gap-3 px-4 py-3.5">
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold text-ink">{a.counterparty}</span>
                    <span className="block text-[11.5px] text-mute">
                      {a.description} · {a.kind === "in" ? "money in" : "bill"}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="num block text-[14px] font-bold text-ink">{money(a.amount)}</span>
                    <span className="mt-0.5 block">
                      <Chip tone={a.status === "overdue" || a.days < 0 ? "red" : "amber"}>
                        {a.status === "overdue"
                          ? `${a.days}d overdue`
                          : a.days < 0
                            ? `${-a.days}d late`
                            : a.days === 0
                              ? "due today"
                              : `in ${a.days}d`}
                      </Chip>
                    </span>
                  </span>
                </div>
              ))
            )}
          </Card>

          <div className="mt-6">
            <SectionLabel>Path to close</SectionLabel>
          </div>
          <Card className="mt-2 overflow-hidden">
            <Step done={path.receivablesCleared} label="Receivables cleared" meta={path.receivablesCleared ? "All collected" : `${money(path.collect)} outstanding`} />
            <Step done={path.payablesCleared} label="Payables cleared" meta={path.payablesCleared ? "All paid" : `${money(path.pay)} outstanding`} />
            <Step done={path.vatExported} label="VAT return exported" meta={event.vatFiledDate ? `Filed ${fmtDate(event.vatFiledDate)}` : path.vatExported ? "Exported" : `Net VAT ${money(pnl.netVat)}`} />
            {event.stage === "closed" ? (
              <div className="px-4 py-3.5">
                <button
                  type="button"
                  onClick={() => {
                    reopenEvent(event.id);
                    showToast("Event reopened");
                  }}
                  className="w-full rounded-[12px] py-3.5 text-[13px] font-extrabold uppercase text-ink"
                  style={{ border: "1.5px solid var(--hairline)", letterSpacing: "0.08em" }}
                >
                  Reopen event
                </button>
              </div>
            ) : (
              <div className="px-4 py-3.5">
                {!path.vatExported && (
                  <button
                    type="button"
                    onClick={() => {
                      markVatExported(event.id);
                      showToast("VAT return marked exported");
                    }}
                    className="mb-2 w-full rounded-[12px] py-3.5 text-[13px] font-extrabold uppercase text-ink"
                    style={{ border: "1.5px solid var(--hairline)", letterSpacing: "0.08em" }}
                  >
                    Mark VAT exported
                  </button>
                )}
                {path.canClose ? (
                  <PrimaryButton
                    onClick={() => {
                      closeEvent(event.id);
                      showToast("Event closed and locked");
                    }}
                  >
                    Close event
                  </PrimaryButton>
                ) : (
                  <FinePrint>Clear both sides and export the VAT return to close this event.</FinePrint>
                )}
              </div>
            )}
          </Card>
        </>
      )}

      <FinePrint>
        Every figure is VAT inclusive. VAT within is shown in the right-hand column on Reports.
      </FinePrint>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-3 py-3">
      <div className="text-[9.5px] font-extrabold uppercase text-mute" style={{ letterSpacing: "0.08em" }}>
        {label}
      </div>
      <div className="num mt-1 text-[14px] font-bold text-ink">{money(value)}</div>
    </div>
  );
}

function Step({ done, label, meta }: { done: boolean; label: string; meta: string }) {
  return (
    <div className="dashed-row flex items-center gap-3 px-4 py-3.5">
      <span
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full"
        style={{
          backgroundColor: done ? "var(--green-bg)" : "var(--closed-bg)",
          color: done ? "var(--green-fg)" : "var(--mute)",
        }}
      >
        {done ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <span className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: "currentColor" }} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-ink">{label}</span>
        <span className="num block text-[11.5px] text-mute">{meta}</span>
      </span>
    </div>
  );
}
