import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppBar, PageScroll } from "@/components/setlup/Shell";
import { Card, EmptyState, SectionLabel, StatusChip } from "@/components/setlup/ui";
import { balanceOf, statusOf, vendorsOf } from "@/lib/setlup/compute";
import { fmtDateShort, money } from "@/lib/setlup/format";
import { useSetlup } from "@/lib/setlup/store";

export const Route = createFileRoute("/vendors")({
  head: () => ({
    meta: [
      { title: "Vendors — SETLUP" },
      { name: "description", content: "Every vendor across your events: total billed, still outstanding and bill history." },
      { property: "og:title", content: "Vendors — SETLUP" },
      { property: "og:description", content: "Every vendor across your events: total billed, still outstanding and bill history." },
    ],
  }),
  component: Vendors,
});

function Vendors() {
  const { db } = useSetlup();
  const vendors = vendorsOf(db);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <>
      <AppBar />
      <PageScroll>
        <div className="px-4 pb-10 pt-5">
          <h1 className="wide-116 text-[26px] font-black uppercase leading-none text-ink">Vendors</h1>
          <p className="mt-1.5 text-[12.5px] text-mute">Across every event, newest bills first.</p>

          <div className="mt-4">
            <SectionLabel>
              {vendors.length} vendor{vendors.length === 1 ? "" : "s"}
            </SectionLabel>
          </div>

          <Card className="mt-2 overflow-hidden">
            {vendors.length === 0 ? (
              <EmptyState title="No vendors yet" body="Vendors appear here once you add bills to an event." />
            ) : (
              vendors.map((v) => {
                const isOpen = open === v.name;
                const bills = db.bills
                  .filter((b) => b.counterparty === v.name)
                  .sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1));
                return (
                  <div key={v.name}>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : v.name)}
                      className="dashed-row flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left active:bg-app"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[14.5px] font-bold text-ink">{v.name}</span>
                        <span className="block text-[11.5px] text-mute">
                          {v.eventCount} event{v.eventCount === 1 ? "" : "s"}
                          {v.outstanding > 0 ? ` · ${money(v.outstanding)} outstanding` : " · settled"}
                        </span>
                      </span>
                      <span className="num shrink-0 text-[14.5px] font-bold text-ink">{money(v.billed)}</span>
                    </button>
                    {isOpen &&
                      bills.map((b) => {
                        const ev = db.events.find((e) => e.id === b.eventId);
                        return (
                          <div
                            key={b.id}
                            className="dashed-row flex items-center justify-between gap-3 px-4 py-3"
                            style={{ backgroundColor: "var(--app)" }}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-[13px] font-semibold text-ink">
                                {ev?.name ?? "—"} · {b.description}
                              </span>
                              <span className="mt-1 flex items-center gap-1.5 text-[11px] text-mute">
                                due {fmtDateShort(b.dueDate)}
                                {ev && <StatusChip status={statusOf(b, ev.asOf)} />}
                              </span>
                            </span>
                            <span className="shrink-0 text-right">
                              <span className="num block text-[13px] font-bold text-ink">{money(b.amount)}</span>
                              {balanceOf(b) > 0 && (
                                <span className="num block text-[11px] text-mute">{money(balanceOf(b))} open</span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                );
              })
            )}
          </Card>
        </div>
      </PageScroll>
    </>
  );
}
