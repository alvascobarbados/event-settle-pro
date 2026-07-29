import { createFileRoute, Link } from "@tanstack/react-router";
import { EVENTS } from "@/lib/setl-data";
import { netProfit } from "@/lib/setl-compute";
import { fmt, fmtDate } from "@/lib/setl-format";
import { AppShell } from "@/components/setl/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Events — SETL" },
      { name: "description", content: "SETL events index: name, date, headcount, net profit." },
      { property: "og:title", content: "Events — SETL" },
      { property: "og:description", content: "Every event as one Performance sheet." },
    ],
  }),
  component: EventsIndex,
});

function EventsIndex() {
  return (
    <AppShell>
      <div className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-[680px] px-5 pt-6 pb-24">
          <h1 className="text-[30px] font-extrabold tracking-tight text-ink">Events</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            One page per event. Bills are the atom; the sheet is a computed view.
          </p>

          <ul className="mt-8 divide-y divide-hairline border-y border-hairline">
            {EVENTS.map((e) => {
              const np = netProfit(e).amount;
              const mid = e.state === "mid-settlement";
              return (
                <li key={e.id}>
                  <Link
                    to="/event/$id"
                    params={{ id: e.id }}
                    className="grid grid-cols-[1fr_auto] items-baseline gap-4 py-5 transition-colors hover:bg-panel active:bg-panel"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[17px] font-semibold text-ink">
                        {mid && (
                          <span
                            aria-hidden
                            className="inline-block h-[7px] w-[7px] rounded-full"
                            style={{ backgroundColor: "var(--magenta)" }}
                          />
                        )}
                        <span>{e.name}</span>
                      </div>
                      <div className="mt-1 text-[12px] text-muted-foreground">
                        {fmtDate(e.date)} · headcount {e.headcount.toLocaleString()}
                        {mid ? " · mid-settlement" : " · settled"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="num text-[17px] font-semibold text-ink">{fmt(np)}</div>
                      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        profit after tax
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          <p className="mt-8 text-[12px] italic text-muted-foreground">
            Tap an event to open its Performance sheet.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

