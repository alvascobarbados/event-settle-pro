import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollTop } from "@/components/setlup/Shell";
import { Card, Chip, EmptyState, PillGroup, SectionLabel } from "@/components/setlup/ui";
import { lineName } from "@/lib/setlup/compute";
import { fmtDate, money } from "@/lib/setlup/format";
import { useSetlup } from "@/lib/setlup/store";
import type { FileRecord } from "@/lib/setlup/types";

export const Route = createFileRoute("/event/$id/files")({
  head: () => ({
    meta: [
      { title: "Files — SETLUP" },
      { name: "description", content: "Invoices, receipts and agreements attached to this event and its P&L lines." },
      { property: "og:title", content: "Files — SETLUP" },
      { property: "og:description", content: "Invoices, receipts and agreements attached to this event and its P&L lines." },
    ],
  }),
  component: Files,
});

type Filter = "all" | "linked" | "unlinked";

function Files() {
  const { id } = Route.useParams();
  const { db, getEvent } = useSetlup();
  const event = getEvent(id);
  const [filter, setFilter] = useState<Filter>("all");
  if (!event) return null;

  const all = db.files.filter((f) => f.eventId === event.id);
  const files = all.filter((f) =>
    filter === "all" ? true : filter === "linked" ? !!f.lineId : !f.lineId,
  );

  return (
    <div className="px-4 pb-10 pt-4">
      <ScrollTop />
      <PillGroup<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "All" },
          { value: "linked", label: "Linked" },
          { value: "unlinked", label: "Unlinked" },
        ]}
      />

      <div className="mt-4">
        <SectionLabel>
          {files.length} file{files.length === 1 ? "" : "s"}
        </SectionLabel>
      </div>

      <Card className="mt-2 overflow-hidden">
        {files.length === 0 ? (
          <EmptyState title="No files here" body="Attach an invoice or receipt with the + button and link it to a P&L line." />
        ) : (
          files.map((f) => <FileRow key={f.id} file={f} />)
        )}
      </Card>
    </div>
  );
}

function FileRow({ file: f }: { file: FileRecord }) {
  const { db, showToast } = useSetlup();
  const [busy, setBusy] = useState(false);

  async function open() {
    if (!f.storagePath || busy) return;
    setBusy(true);
    const { data, error } = await supabase.storage
      .from("setlup-files")
      .createSignedUrl(f.storagePath, 60 * 10);
    setBusy(false);
    if (error || !data) {
      showToast("Could not open file");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  const body = (
    <>
      <span
        className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-[9px] font-extrabold"
        style={{ backgroundColor: "var(--accent-tint-c)", color: "var(--accent-deep-c)" }}
      >
        {f.type}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[14px] font-semibold text-ink">{f.name}</span>
        <span className="block text-[11.5px] text-mute">
          {fmtDate(f.date)}
          {f.storagePath ? (busy ? " · opening…" : " · tap to view") : ""}
        </span>
        <span className="mt-1.5 block">
          <Chip tone={f.lineId ? "green" : "neutral"}>{lineName(db, f.lineId) ?? "Unlinked"}</Chip>
        </span>
      </span>
      {f.amount !== undefined && (
        <span className="num shrink-0 text-[13.5px] font-bold text-ink">{money(f.amount)}</span>
      )}
    </>
  );

  if (!f.storagePath) {
    return <div className="dashed-row flex items-start gap-3 px-4 py-3.5">{body}</div>;
  }
  return (
    <button
      type="button"
      onClick={open}
      className="dashed-row flex w-full items-start gap-3 px-4 py-3.5 text-left active:opacity-70"
    >
      {body}
    </button>
  );
}
