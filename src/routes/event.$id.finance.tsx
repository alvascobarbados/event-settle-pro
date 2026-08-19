import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ScrollTop } from "@/components/setlup/Shell";
import { PaymentSheet } from "@/components/setlup/Sheets";
import { EditBillSheet } from "@/components/setlup/ScanBill";
import { PullToRefresh, SwipeRow } from "@/components/setlup/SwipeRow";
import { Card, Chip, EmptyState, PillGroup, SectionLabel, StatusChip } from "@/components/setlup/ui";
import {
  activityOf,
  balanceOf,
  eventBills,
  eventMoneyIn,
  lineName,
  paidTotal,
  statusOf,
  toCollect,
  toPay,
} from "@/lib/setlup/compute";
import { fmtDateShort, money, signedMoney } from "@/lib/setlup/format";
import { useSetlup } from "@/lib/setlup/store";
import type { Ledgerable } from "@/lib/setlup/types";

export const Route = createFileRoute("/event/$id/finance")({
  head: () => ({
    meta: [
      { title: "Finance — SETLUP" },
      { name: "description", content: "Track money in, bills to pay and every payment recorded against this event." },
      { property: "og:title", content: "Finance — SETLUP" },
      { property: "og:description", content: "Track money in, bills to pay and every payment recorded against this event." },
    ],
  }),
  component: Finance,
});

type Tab = "collect" | "pay" | "activity";

function Finance() {
  const { id } = Route.useParams();
  const { db, getEvent, deleteBill, deleteMoneyIn, refresh } = useSetlup();
  const event = getEvent(id);
  const [editBillId, setEditBillId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("collect");
  const [sheet, setSheet] = useState<{ record: Ledgerable; kind: "in" | "out" } | null>(null);
  if (!event) return null;

  const locked = event.stage === "closed";
  const moneyIn = eventMoneyIn(db, event.id);
  const bills = eventBills(db, event.id);
  const activity = activityOf(db, event.id);

  return (
    <PullToRefresh onRefresh={refresh}>
    <div className="px-4 pb-10 pt-4">
      <ScrollTop />
      <PillGroup<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: "collect", label: "Collect" },
          { value: "pay", label: "Pay" },
          { value: "activity", label: "Activity" },
        ]}
      />

      {tab !== "activity" && (
        <div className="mt-4 flex items-baseline justify-between">
          <SectionLabel>{tab === "collect" ? "To collect" : "To pay"}</SectionLabel>
          <span className="num text-[19px] font-black text-ink">
            {money(tab === "collect" ? toCollect(db, event) : toPay(db, event))}
          </span>
        </div>
      )}

      {tab === "collect" && (
        <Card className="mt-2 overflow-hidden">
          {moneyIn.length === 0 ? (
            <EmptyState title="No money in yet" body="Add sponsorship, ticket payouts or table sales with the + button." />
          ) : (
            moneyIn.map((r) => (
              <SwipeRow
                key={r.id}
                disabled={locked}
                confirmTitle="Delete this receivable?"
                confirmBody="Its payments go too. Any attached document stays, unlinked."
                onDelete={() => deleteMoneyIn(r.id)}
              >
                <RecordRow
                  record={r}
                  asOf={event.asOf}
                  lineLabel={lineName(db, r.lineId)}
                  onClick={locked ? undefined : () => setSheet({ record: r, kind: "in" })}
                />
              </SwipeRow>
            ))
          )}
        </Card>
      )}

      {tab === "pay" && (
        <Card className="mt-2 overflow-hidden">
          {bills.length === 0 ? (
            <EmptyState title="No bills yet" body="Add a vendor bill with the + button to start tracking what you owe." />
          ) : (
            bills.map((r) => (
              <SwipeRow
                key={r.id}
                disabled={locked}
                confirmTitle="Delete this bill?"
                confirmBody="Its payments go too. Any attached document stays, unlinked."
                onDelete={() => deleteBill(r.id)}
              >
                <RecordRow
                  record={r}
                  asOf={event.asOf}
                  lineLabel={lineName(db, r.lineId)}
                  onClick={locked ? undefined : () => setSheet({ record: r, kind: "out" })}
                  onEdit={locked ? undefined : () => setEditBillId(r.id)}
                />
              </SwipeRow>
            ))
          )}
        </Card>
      )}

      {tab === "activity" && (
        <>
          <div className="mt-4">
            <SectionLabel>Every payment, newest first</SectionLabel>
          </div>
          <Card className="mt-2 overflow-hidden">
            {activity.length === 0 ? (
              <EmptyState title="Nothing settled yet" body="Recorded receipts and payments appear here." />
            ) : (
              activity.map((a) => (
                <div key={a.id} className="dashed-row flex items-center justify-between gap-3 px-4 py-3.5">
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold text-ink">{a.counterparty}</span>
                    <span className="block text-[11.5px] text-mute">
                      {fmtDateShort(a.date)} · {a.description}
                    </span>
                  </span>
                  <span
                    className="num shrink-0 text-[14.5px] font-bold"
                    style={{ color: a.amount < 0 ? "var(--red)" : "var(--green-fg)" }}
                  >
                    {signedMoney(a.amount)}
                  </span>
                </div>
              ))
            )}
          </Card>
        </>
      )}

      {locked && (
        <p className="mt-3 text-[12px] text-mute">This event is closed — payments are read-only.</p>
      )}

      <PaymentSheet record={sheet?.record ?? null} kind={sheet?.kind ?? "in"} onClose={() => setSheet(null)} />

      <EditBillSheet
        bill={editBillId ? db.bills.find((b) => b.id === editBillId) : undefined}
        open={!!editBillId}
        onClose={() => setEditBillId(null)}
      />
    </div>
    </PullToRefresh>
  );
}

function RecordRow({
  record,
  asOf,
  lineLabel,
  onClick,
  onEdit,
}: {
  record: Ledgerable;
  asOf: string;
  lineLabel: string | null;
  onClick?: () => void;
  onEdit?: () => void;
}) {
  const status = statusOf(record, asOf);
  const balance = balanceOf(record);
  const paid = paidTotal(record);

  const body = (
    <div className="flex items-start justify-between gap-3 px-4 py-3.5">
      <span className="min-w-0">
        <span className="block text-[14.5px] font-bold text-ink">{record.counterparty}</span>
        <span className="block text-[12px] text-mute">
          {record.description}
          {lineLabel ? ` · ${lineLabel}` : ""}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <StatusChip status={status} />
          <Chip tone="neutral">due {fmtDateShort(record.dueDate)}</Chip>
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="num block text-[15px] font-extrabold text-ink">{money(balance)}</span>
        <span className="num mt-0.5 block text-[11px] text-mute">
          of {money(record.amount)}
          {paid > 0 ? ` · paid ${money(paid)}` : ""}
        </span>
      </span>
    </div>
  );

  if (!onClick) return <div className="dashed-row">{body}</div>;
  return (
    <div className="dashed-row flex items-stretch">
      <button type="button" onClick={onClick} className="min-w-0 flex-1 text-left active:bg-app">
        {body}
      </button>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 self-center pr-4 text-[11px] font-extrabold uppercase tracking-[0.06em]"
          style={{ color: "var(--accent-c)" }}
        >
          Edit
        </button>
      )}
    </div>
  );
}

