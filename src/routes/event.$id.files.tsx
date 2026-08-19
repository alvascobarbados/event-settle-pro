import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollTop } from "@/components/setlup/Shell";
import { BillPeek } from "@/components/setlup/BillPeek";
import { RouteSheet } from "@/components/setlup/Sheets";
import { ScanBillFilesSheet, ScanBillSheet } from "@/components/setlup/ScanBill";
import { Card, Chip, EmptyState, PillGroup, PrimaryButton, SectionLabel } from "@/components/setlup/ui";
import { CategoryRouter, Sheet } from "@/components/setlup/Sheets";
import { categoryLabel } from "@/lib/setlup/compute";
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
  const [peekId, setPeekId] = useState<string | null>(null);
  const [routeFileId, setRouteFileId] = useState<string | null>(null);
  const [scanFileId, setScanFileId] = useState<string | null>(null);
  const [dropped, setDropped] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const peekFile = peekId ? db.files.find((f) => f.id === peekId) : undefined;
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

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const list = Array.from(e.dataTransfer.files ?? []);
          if (list.length) setDropped(list);
        }}
      >
        <Card className={`mt-2 overflow-hidden ${dragging ? "ring-2 ring-offset-2" : ""}`}>
          {files.length === 0 ? (
            <EmptyState
              title="No files here"
              body="Attach an invoice or receipt with the + button, or drop a PDF here on desktop."
            />
          ) : (
            files.map((f) => (
              <FileRow
                key={f.id}
                file={f}
                onOpen={() => setPeekId(f.id)}
                onRoute={() => setRouteFileId(f.id)}
                onScan={() => setScanFileId(f.id)}
              />
            ))
          )}
        </Card>
      </div>

      <ScanBillFilesSheet
        eventId={event.id}
        files={dropped}
        open={dropped.length > 0}
        onClose={() => setDropped([])}
      />


      <FileRouteSheet fileId={routeFileId} onClose={() => setRouteFileId(null)} />

      <ScanBillSheet
        file={scanFileId ? db.files.find((f) => f.id === scanFileId) : undefined}
        open={!!scanFileId}
        onClose={() => setScanFileId(null)}
      />

      <BillPeek
        target={
          peekFile
            ? {
                label: peekFile.name,
                detail: [fmtDate(peekFile.date), categoryLabel(db, peekFile.lineId) ?? "Unlinked"].join(" · "),
                amount: peekFile.amount,
                file: peekFile,
              }
            : null
        }
        onClose={() => setPeekId(null)}
      />
    </div>
  );
}

/** Routes a file (and its linked vendor line) to a category / subcategory. */
function FileRouteSheet({ fileId, onClose }: { fileId: string | null; onClose: () => void }) {
  const { db, routeFile } = useSetlup();
  const file = fileId ? db.files.find((f) => f.id === fileId) : undefined;
  const linked = file?.lineId ? db.lines.find((l) => l.id === file.lineId) : undefined;
  if (linked?.parentId) return <RouteSheet lineId={linked.id} open={!!fileId} onClose={onClose} />;
  return <UnlinkedRouteSheet file={file} open={!!fileId} onClose={onClose} onSave={routeFile} />;
}

function UnlinkedRouteSheet({
  file,
  open,
  onClose,
  onSave,
}: {
  file?: FileRecord;
  open: boolean;
  onClose: () => void;
  onSave: (fileId: string, categoryId: string, subcategoryId?: string) => Promise<void>;
}) {
  const [cat, setCat] = useState("");
  const [sub, setSub] = useState("");
  return (
    <Sheet open={open} onClose={onClose} title="Route to category">
      {file && (
        <>
          <div className="rounded-[12px] bg-app px-3.5 py-3">
            <div className="text-[14.5px] font-bold text-ink">{file.name}</div>
          </div>
          <CategoryRouter
            section="expenses"
            categoryId={cat}
            subcategoryId={sub}
            onChange={(c, sc) => {
              setCat(c);
              setSub(sc);
            }}
          />
          <div className="mt-5">
            <PrimaryButton
              onClick={async () => {
                if (!cat) return;
                await onSave(file.id, cat, sub || undefined);
                onClose();
              }}
            >
              Save routing
            </PrimaryButton>
          </div>
        </>
      )}
    </Sheet>
  );
}

function FileRow({
  file: f,
  onOpen,
  onRoute,
  onScan,
}: {
  file: FileRecord;
  onOpen: () => void;
  onRoute: () => void;
  onScan: () => void;
}) {
  const { db, showToast, promoterId, setFileStoragePath } = useSetlup();
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    if (!promoterId) return;
    if (file.size > 20 * 1024 * 1024) {
      showToast("File is larger than 20 MB");
      return;
    }
    setBusy(true);
    const safe = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${promoterId}/${f.eventId}/${Date.now()}-${safe}`;
    const { error } = await supabase.storage
      .from("setlup-files")
      .upload(path, file, { contentType: file.type || undefined });
    setBusy(false);
    if (error) {
      showToast("Upload failed");
      return;
    }
    setFileStoragePath(f.id, path, file.type.startsWith("image/") ? "IMG" : "PDF");
    showToast("PDF attached");
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
          {f.storagePath ? " · tap to view" : " · No PDF attached"}
        </span>
        <span className="mt-1.5 block">
          <Chip tone={f.lineId ? "green" : "neutral"}>{categoryLabel(db, f.lineId) ?? "Unlinked"}</Chip>
        </span>
      </span>
      {f.amount !== undefined && (
        <span className="num shrink-0 text-[13.5px] font-bold text-ink">{money(f.amount)}</span>
      )}
    </>
  );

  const scanBtn = f.storagePath && !f.lineId ? (
    <button
      type="button"
      onClick={onScan}
      className="shrink-0 self-center text-[11.5px] font-extrabold uppercase tracking-[0.06em]"
      style={{ color: "var(--accent-c)" }}
    >
      Scan
    </button>
  ) : null;

  const routeBtn = (
    <button
      type="button"
      onClick={onRoute}
      className="shrink-0 self-center text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-mute"
    >
      Route
    </button>
  );

  if (!f.storagePath) {
    return (
      <div className="dashed-row flex items-start gap-3 px-4 py-3.5">
        {body}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void upload(file);
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="shrink-0 self-center text-[11.5px] font-extrabold uppercase tracking-[0.06em] disabled:opacity-60"
          style={{ color: "var(--accent-c)" }}
        >
          {busy ? "Uploading…" : "Attach PDF"}
        </button>
        {routeBtn}
      </div>
    );
  }
  return (
    <div className="dashed-row flex items-start gap-3 px-4 py-3.5">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-start gap-3 text-left active:opacity-70">
        {body}
      </button>
      {scanBtn}
      {routeBtn}
    </div>
  );
}
