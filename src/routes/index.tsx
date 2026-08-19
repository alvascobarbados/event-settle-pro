import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppBar, PageScroll, accentVars } from "@/components/setlup/Shell";
import { Field, Sheet, TextInput } from "@/components/setlup/Sheets";
import { PrimaryButton, SectionLabel, StageBadge } from "@/components/setlup/ui";
import { pnlOf, toCollect, toPay } from "@/lib/setlup/compute";
import { fmtDate, money, todayIso } from "@/lib/setlup/format";
import { useSetlup } from "@/lib/setlup/store";
import { PullToRefresh } from "@/components/setlup/SwipeRow";
import type { EventRecord } from "@/lib/setlup/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Events — SETLUP" },
      { name: "description", content: "Every event you're budgeting, reconciling or have closed, with profit and outstanding money at a glance." },
      { property: "og:title", content: "Events — SETLUP" },
      { property: "og:description", content: "Every event you're budgeting, reconciling or have closed, with profit and outstanding money at a glance." },
    ],
  }),
  component: Lobby,
});

function Lobby() {
  const { db, addEvent, showToast, refresh } = useSetlup();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState(todayIso());
  const [venue, setVenue] = useState("");
  const [capacity, setCapacity] = useState("");

  return (
    <>
      <AppBar />
      <PageScroll>
        <PullToRefresh onRefresh={refresh}>
        <div className="px-4 pb-10 pt-5">
          <h1 className="wide-116 text-[26px] font-black uppercase leading-none text-ink">Events</h1>
          <p className="mt-1.5 text-[12.5px] text-mute">
            {db.settings.business} · {db.settings.currency} · VAT {db.settings.vatRate}%
          </p>

          {db.events.length === 0 ? (
            <div
              className="mt-6 rounded-[16px] px-5 py-10 text-center"
              style={{ border: "1.5px dashed var(--dash)" }}
            >
              <div className="wide-116 text-[17px] font-black uppercase text-ink">No events yet</div>
              <p className="mx-auto mt-2 max-w-[16rem] text-[12.5px] leading-snug text-mute">
                Create your first event to start budgeting, tracking bills and settling up.
              </p>
              <div className="mt-5">
                <PrimaryButton onClick={() => setOpen(true)}>Create event</PrimaryButton>
              </div>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {db.events.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}

              <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-[16px] py-5 text-[13px] font-extrabold uppercase text-mute"
                style={{ border: "1.5px dashed var(--dash)", letterSpacing: "0.09em" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
                New event
              </button>
            </div>
          )}

        </div>
        </PullToRefresh>
      </PageScroll>


      <Sheet open={open} onClose={() => setOpen(false)} title="New event">
        <Field label="Event name">
          <TextInput value={name} onChange={(ev) => setName(ev.target.value)} placeholder="e.g. UV 2027" />
        </Field>
        <Field label="Date">
          <TextInput type="date" value={date} onChange={(ev) => setDate(ev.target.value)} />
        </Field>
        <Field label="Venue">
          <TextInput value={venue} onChange={(ev) => setVenue(ev.target.value)} placeholder="Where it happens" />
        </Field>
        <Field label="Capacity">
          <TextInput className="num" type="number" value={capacity} onChange={(ev) => setCapacity(ev.target.value)} />
        </Field>
        <div className="mt-5">
          <PrimaryButton
            onClick={() => {
              if (!name.trim()) return;
              const id = addEvent({
                name: name.trim(),
                date,
                venue: venue.trim() || "TBC",
                capacity: Number(capacity) || undefined,
              });
              setOpen(false);
              setName("");
              setVenue("");
              setCapacity("");
              showToast("Event created");
              navigate({ to: "/event/$id", params: { id } });
            }}
          >
            Create event
          </PrimaryButton>
        </div>
      </Sheet>
    </>
  );
}

function EventCard({ event }: { event: EventRecord }) {
  const { db } = useSetlup();
  const pnl = pnlOf(db, event);
  const collect = toCollect(db, event);
  const pay = toPay(db, event);

  return (
    <Link
      to="/event/$id"
      params={{ id: event.id }}
      className="block overflow-hidden rounded-[16px] bg-card transition-transform duration-150 active:scale-[0.99]"
      style={{ border: "1.5px solid var(--hairline)", ...accentVars(event.accent) }}
    >
      <div className="h-[5px] w-full" style={{ backgroundColor: "var(--accent-c)" }} />
      <div className="px-4 pb-4 pt-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="wide-116 truncate text-[19px] font-black uppercase leading-tight text-ink">
              {event.name}
            </div>
            <div className="mt-1 text-[12px] text-mute">
              {fmtDate(event.date)} · {event.venue}
            </div>
          </div>
          <StageBadge stage={event.stage} />
        </div>

        <div className="mt-3.5 flex items-end justify-between gap-3">
          <div>
            <SectionLabel>{pnl.budgeted ? "Budgeted profit" : "Profit before VAT"}</SectionLabel>
            <div
              className="num mt-1 text-[24px] font-black leading-none"
              style={{ color: pnl.profitBeforeTax < 0 ? "var(--red)" : "var(--accent-deep-c)" }}
            >
              {money(pnl.profitBeforeTax)}
            </div>
          </div>
          <div className="text-right text-[11.5px] leading-relaxed text-mute">
            <div>
              To collect <span className="num font-bold text-ink">{money(collect)}</span>
            </div>
            <div>
              To pay <span className="num font-bold text-ink">{money(pay)}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
