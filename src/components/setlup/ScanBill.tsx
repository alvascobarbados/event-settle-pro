import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CategoryRouter, Field, Sheet, TextInput, Toggle } from "./Sheets";
import { Chip, PrimaryButton } from "./ui";
import { FileSource } from "./FileSource";
import { scanBill } from "@/lib/setlup/scan-bill.functions";
import type { ScanFields } from "@/lib/setlup/scan-bill.types";
import { matchVendor } from "@/lib/setlup/vendors";
import { todayIso } from "@/lib/setlup/format";
import { useSetlup } from "@/lib/setlup/store";
import type { FileRecord, Vendor } from "@/lib/setlup/types";

type Phase = "pick" | "working" | "review" | "failed";

interface Draft {
  vendor: string;
  ref: string;
  date: string;
  total: string;
  vat: string;
  description: string;
  catId: string;
  subId: string;
  remember: boolean;
}

const EMPTY: Draft = {
  vendor: "",
  ref: "",
  date: todayIso(),
  total: "",
  vat: "",
  description: "",
  catId: "",
  subId: "",
  remember: true,
};

function draftFrom(fields: ScanFields, vendors: Vendor[], cats: { id: string; parentId?: string }[]): Draft {
  const known = matchVendor(vendors, fields.vendor_name);
  const defCat = known?.defaultCategoryId ?? "";
  const defSub = known?.defaultSubcategoryId ?? "";
  const catExists = cats.some((c) => c.id === defCat);
  return {
    ...EMPTY,
    vendor: known?.name ?? fields.vendor_name,
    ref: fields.invoice_number,
    date: fields.invoice_date || todayIso(),
    total: fields.inclusive_total ? String(fields.inclusive_total) : "",
    vat: fields.vat_amount === null ? "" : String(fields.vat_amount),
    description: fields.description,
    catId: catExists ? defCat : "",
    subId: catExists && cats.some((c) => c.id === defSub) ? defSub : "",
  };
}

/**
 * AI prefills, the promoter confirms. Nothing reaches the ledger until Save.
 * Used both for a freshly picked file and for an already-uploaded one.
 */
export function ScanBillPanel({
  eventId,
  existing,
  initialFiles,
  onDone,
}: {
  eventId: string;
  /** Already-uploaded file to scan; when absent the panel starts with a file picker. */
  existing?: FileRecord;
  /** Files handed in from a drop or an outside picker — the queue starts immediately. */
  initialFiles?: File[];
  onDone: () => void;
}) {
  const { db, addRoutedBill, addFile, addVendor, updateVendor, linkFileToLine, showToast, promoterId } = useSetlup();
  const [phase, setPhase] = useState<Phase>(existing ? "working" : "pick");
  const [note, setNote] = useState("");
  const [progress, setProgress] = useState("");
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [uploaded, setUploaded] = useState<{ path: string; name: string; type: FileRecord["type"] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [queue, setQueue] = useState<File[]>([]);
  const [qIndex, setQIndex] = useState(0);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const counter = queue.length > 1 ? `File ${qIndex + 1} of ${queue.length}` : "";

  async function runScan(storagePath: string) {
    setPhase("working");
    setNote("");
    const res = await scanBill({ data: { storagePath, eventId } });
    if ("error" in res) {
      setNote(res.error);
      setDraft(EMPTY);
      setPhase("failed");
      return;
    }
    if (!res.fields.is_bill) {
      setNote("That doesn’t look like a bill — enter the details yourself.");
      setDraft(EMPTY);
      setPhase("failed");
      return;
    }
    setConfidence(res.fields.confidence);
    setDraft(draftFrom(res.fields, db.vendors, db.categories));
    setPhase("review");
  }

  /* an already-uploaded file scans as soon as the panel opens */
  useEffect(() => {
    if (!existing?.storagePath) return;
    setUploaded({ path: existing.storagePath, name: existing.name, type: existing.type });
    void runScan(existing.storagePath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id]);

  /* files handed in from a drop or a picker before the panel mounted */
  useEffect(() => {
    if (!initialFiles?.length) return;
    void startQueue(initialFiles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startQueue(files: File[]) {
    setQueue(files);
    setQIndex(0);
    await pick(files[0]!, 0, files.length);
  }

  async function nextInQueue() {
    const n = qIndex + 1;
    if (n < queue.length) {
      setQIndex(n);
      setDraft(EMPTY);
      setConfidence(null);
      setUploaded(null);
      await pick(queue[n]!, n, queue.length);
    } else {
      onDone();
    }
  }

  async function pick(file: File, index = 0, total = 1) {
    if (!promoterId) return;
    if (file.size > 20 * 1024 * 1024) {
      showToast(`${file.name} is larger than 20 MB`);
      return;
    }
    setPhase("working");
    setProgress(total > 1 ? `Uploading ${index + 1} of ${total} — ${file.name}` : `Uploading ${file.name}`);
    const safe = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${promoterId}/${eventId}/${Date.now()}-${safe}`;
    const { error } = await supabase.storage
      .from("setlup-files")
      .upload(path, file, { contentType: file.type || undefined });
    setProgress("");
    if (error) {
      setNote("Upload failed — try again.");
      setPhase("failed");
      return;
    }
    setUploaded({
      path,
      name: file.name.replace(/\.[^.]+$/, ""),
      type: file.type.startsWith("image/") ? "IMG" : "PDF",
    });
    await runScan(path);
  }

  /** Leaves the uploaded document in Files as an unlinked upload, nothing else. */
  async function skip() {
    if (uploaded && !existing) {
      addFile({
        eventId,
        name: uploaded.name,
        type: uploaded.type,
        date: todayIso(),
        storagePath: uploaded.path,
      });
      showToast("Kept as an unlinked file");
    }
    await nextInQueue();
  }

  async function save() {
    const total = Number(draft.total) || 0;
    const vendorName = draft.vendor.trim();
    if (!vendorName || total <= 0) {
      showToast("Vendor and total are needed");
      return;
    }
    if (!draft.catId) {
      showToast("Choose a category");
      return;
    }
    setSaving(true);
    const vatRaw = draft.vat.trim();
    const vatAmount = vatRaw === "" ? undefined : Number(vatRaw) || 0;
    const res = await addRoutedBill({
      eventId,
      counterparty: vendorName,
      description: draft.description.trim(),
      ref: draft.ref.trim() || undefined,
      amount: total,
      dueDate: draft.date || todayIso(),
      vatExempt: vatAmount === 0 ? true : undefined,
      categoryId: draft.catId,
      subcategoryId: draft.subId || undefined,
      vatAmount,
    });
    if (!res) {
      setSaving(false);
      return;
    }
    if (existing) {
      await linkFileToLine(existing.id, res.lineId, total);
    } else if (uploaded) {
      addFile({
        eventId,
        name: uploaded.name,
        type: uploaded.type,
        date: draft.date || todayIso(),
        lineId: res.lineId,
        amount: total,
        storagePath: uploaded.path,
      });
    }
    if (draft.remember) {
      const known = matchVendor(db.vendors, vendorName);
      if (known) {
        await updateVendor(known.id, {
          categoryId: draft.catId,
          subcategoryId: draft.subId || undefined,
          vatRegistered: (vatAmount ?? 0) > 0 || known.vatRegistered,
          alias: vendorName,
        });
      } else {
        await addVendor({
          name: vendorName,
          categoryId: draft.catId,
          subcategoryId: draft.subId || undefined,
          vatRegistered: (vatAmount ?? 0) > 0,
        });
      }
    }
    setSaving(false);
    showToast("Bill added");
    await nextInQueue();
  }

  if (phase === "pick") {
    return (
      <FileSource
        onFiles={(files) => void startQueue(files)}
        note="The scan reads the vendor, invoice number, date, total and VAT. Nothing is saved until you confirm."
      />
    );
  }

  if (phase === "working") {
    return (
      <div className="py-8 text-center">
        <div className="text-[14.5px] font-bold text-ink">{progress ? "Uploading…" : "Scanning…"}</div>
        <div className="mt-1 text-[12.5px] text-mute">{progress || "Reading the document"}</div>
        {counter && <div className="mt-2 text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-mute">{counter}</div>}
      </div>
    );
  }

  const known = matchVendor(db.vendors, draft.vendor);

  return (
    <>
      {counter && (
        <div className="pb-2 text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-mute">{counter}</div>
      )}
      {phase === "failed" && (
        <div className="rounded-[12px] bg-app px-3.5 py-3">
          <div className="text-[13.5px] font-bold text-ink">Couldn’t read it</div>
          <div className="mt-0.5 text-[12.5px] text-mute">{note || "Enter the details yourself."}</div>
        </div>
      )}
      {phase === "review" && (
        <div className="flex items-center gap-2">
          <Chip tone="green">Prefilled by scan</Chip>
          {confidence !== null && confidence < 0.6 && <Chip tone="neutral">Check the figures</Chip>}
          {known && <Chip tone="neutral">Known vendor</Chip>}
        </div>
      )}
      <div className="mt-3">
        <Field label="Vendor">
          <TextInput value={draft.vendor} onChange={(e) => set({ vendor: e.target.value })} placeholder="Vendor name" />
        </Field>
      </div>
      <Field label="Invoice #">
        <TextInput value={draft.ref} onChange={(e) => set({ ref: e.target.value })} placeholder="Optional" />
      </Field>
      <Field label="What it was for">
        <TextInput
          value={draft.description}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="e.g. Bar stock"
        />
      </Field>
      <Field label="Invoice date">
        <TextInput type="date" value={draft.date} onChange={(e) => set({ date: e.target.value })} />
      </Field>
      <Field label="Total (VAT inclusive)">
        <TextInput
          className="num"
          type="number"
          inputMode="decimal"
          value={draft.total}
          onChange={(e) => set({ total: e.target.value })}
        />
      </Field>
      <Field label="VAT on the bill">
        <TextInput
          className="num"
          type="number"
          inputMode="decimal"
          value={draft.vat}
          onChange={(e) => set({ vat: e.target.value })}
          placeholder="Leave blank if none"
        />
      </Field>
      <CategoryRouter
        section="expenses"
        categoryId={draft.catId}
        subcategoryId={draft.subId}
        onChange={(c, sc) => set({ catId: c, subId: sc })}
      />
      <Toggle label="Remember this vendor" checked={draft.remember} onChange={(v) => set({ remember: v })} />
      <div className="mt-5">
        <PrimaryButton onClick={() => !saving && void save()}>{saving ? "Saving…" : "Save bill"}</PrimaryButton>
      </div>
      {!existing && (
        <button
          type="button"
          onClick={() => !saving && void skip()}
          className="mt-3 h-11 w-full rounded-full bg-app text-[12.5px] font-extrabold uppercase tracking-[0.07em] text-ink"
        >
          {queue.length > 1 && qIndex + 1 < queue.length ? "Skip this one" : "Cancel — keep file only"}
        </button>
      )}
    </>
  );
}

/** Bills handed in from a drop or an outside picker. */
export function ScanBillFilesSheet({
  eventId,
  files,
  open,
  onClose,
}: {
  eventId: string;
  files: File[];
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Scan bill">
      {open && files.length > 0 && (
        <ScanBillPanel key={files[0]!.name + files.length} eventId={eventId} initialFiles={files} onDone={onClose} />
      )}
    </Sheet>
  );
}

/** Scan an already-uploaded file straight from the Files list. */
export function ScanBillSheet({
  file,
  open,
  onClose,
}: {
  file?: FileRecord;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Scan bill">
      {file && <ScanBillPanel eventId={file.eventId} existing={file} onDone={onClose} />}
    </Sheet>
  );
}
