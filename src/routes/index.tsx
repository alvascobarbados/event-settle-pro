import { createFileRoute, Link } from "@tanstack/react-router";
import { EVENTS } from "@/lib/setl-data";
import { netProfit, cashResult } from "@/lib/setl-compute";
import { fmt, fmtDate } from "@/lib/setl-format";
import { Wordmark } from "@/components/setl/Wordmark";

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
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[680px] px-5 pt-10 pb-24">
        <header className="mb-10 flex items-center justify-between">
          <Wordmark className="text-2xl" />
          <Link
            to="/vendors"
            className="text-[13px] font-medium text-muted-foreground hover:text-ink"
          >
            Vendors ›
          </Link>
        </header>

        <h1 className="text-[28px] font-bold tracking-tight text-ink">Events</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          One page per event. Bills are the atom; the sheet is a computed view.
        </p>

        <ul className="mt-8 divide-y divide-hairline border-y border-hairline">
          {EVENTS.map((e) => {
            const np = netProfit(e).amount;
            const cash = cashResult(e);
            return (
              <li key={e.id}>
                <Link
                  to="/event/$id"
                  params={{ id: e.id }}
                  className="grid grid-cols-[1fr_auto] items-baseline gap-4 py-5 hover:bg-panel"
                >
                  <div className="min-w-0">
                    <div className="text-[17px] font-semibold text-ink">{e.name}</div>
                    <div className="mt-0.5 text-[12px] text-muted-foreground">
                      {fmtDate(e.date)} · headcount {e.headcount.toLocaleString()}
                      {e.state === "mid-settlement" ? " · mid-settlement" : " · settled"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="num text-[17px] font-semibold text-ink">{fmt(np)}</div>
                    <div className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                      net profit
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="mt-8 text-[12px] text-muted-foreground">
          Tap an event to open its Performance sheet.
        </p>
      </div>
    </div>
  );
}
