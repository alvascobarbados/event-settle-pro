import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSetlup } from "@/lib/setlup/store";
import { balanceOf } from "@/lib/setlup/compute";
import { money, todayIso } from "@/lib/setlup/format";
import type { Ledgerable, Section } from "@/lib/setlup/types";
import { PrimaryButton } from "./ui";

/* ---------------- generic bottom sheet ---------------- */

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden={!open}
        className="absolute inset-0 z-[60] transition-opacity duration-200"
        style={{
          backgroundColor: "rgba(34,26,32,0.45)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
      />
      <div
        role="dialog"
        aria-label={title}
        aria-hidden={!open}
        className="absolute inset-x-0 bottom-0 z-[70] max-h-[88%] overflow-y-auto rounded-t-[22px] bg-card transition-transform duration-200 ease-out"
        style={{ transform: open ? "translateY(0)" : "translateY(102%)" }}
      >
        <div className="flex items-center justify-between px-5 pb-3 pt-4">
          <div className="text-[15px] font-extrabold text-ink">{title}</div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center text-mute">
            <svg width="15" height="15" viewBox="0 0 18 18" aria-hidden>
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="px-5 pb-7">{children}</div>
      </div>
    </>
  );
}

/* ---------------- form primitives ---------------- */

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mt-3.5 block">
      <span className="text-[11px] font-extrabold uppercase text-mute" style={{ letterSpacing: "0.09em" }}>
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputCls =
  "w-full rounded-[10px] bg-app px-3 py-3 text-[15px] font-semibold text-ink outline-none focus:ring-2";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`${inputCls} ${props.className ?? ""}`}
      style={{ border: "1.5px solid var(--hairline)", ...(props.style ?? {}) }}
    />
  );
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={inputCls}
      style={{ border: "1.5px solid var(--hairline)" }}
    />
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="mt-4 flex w-full items-center justify-between"
      aria-pressed={checked}
    >
      <span className="text-[13.5px] font-semibold text-ink">{label}</span>
      <span
        className="relative h-[26px] w-[46px] rounded-full transition-colors"
        style={{ backgroundColor: checked ? "var(--accent-c)" : "var(--hairline)" }}
      >
        <span
          className="absolute top-[3px] h-[20px] w-[20px] rounded-full bg-white transition-all"
          style={{ left: checked ? 23 : 3 }}
        />
      </span>
    </button>
  );
}

/* ---------------- record payment ---------------- */

export function PaymentSheet({
  record,
  kind,
  onClose,
}: {
  record: Ledgerable | null;
  kind: "in" | "out";
  onClose: () => void;
}) {
  const { addPayment, showToast } = useSetlup();
  const balance = record ? balanceOf(record) : 0;
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIso());

  useEffect(() => {
    if (record) {
      setAmount(String(balanceOf(record)));
      setDate(todayIso());
    }
  }, [record]);

  return (
    <Sheet open={!!record} onClose={onClose} title={kind === "in" ? "Record receipt" : "Record payment"}>
      {record && (
        <>
          <div className="rounded-[12px] bg-app px-3.5 py-3">
            <div className="text-[14.5px] font-bold text-ink">{record.counterparty}</div>
            <div className="mt-0.5 text-[12.5px] text-mute">{record.description}</div>
            <div className="num mt-1.5 text-[13px] font-bold text-ink">Balance {money(balance)}</div>
          </div>
          <Field label="Amount">
            <TextInput
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="num"
            />
          </Field>
          <Field label="Date">
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <div className="mt-5">
            <PrimaryButton
              onClick={() => {
                const v = Math.min(Math.max(Number(amount) || 0, 0), balance);
                if (v <= 0) return;
                addPayment(kind, record.id, v, date);
                showToast(kind === "in" ? `Received ${money(v)}` : `Paid ${money(v)}`);
                onClose();
              }}
            >
              {kind === "in" ? "Record receipt" : "Record payment"}
            </PrimaryButton>
          </div>
        </>
      )}
    </Sheet>
  );
}

/* ---------------- quick-add action sheet ---------------- */

type Mode = "menu" | "bill" | "in" | "line" | "file";
type FileKind = "bill" | "other";

export function ActionSheet({
  eventId,
  open,
  onClose,
}: {
  eventId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { db, addMoneyIn, addBudgetLine, addFile, addRoutedBill, ensureRoutedLine, showToast, promoterId } =
    useSetlup();
  const [mode, setMode] = useState<Mode>("menu");

  const [counterparty, setCounterparty] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(todayIso());
  const [lineId, setLineId] = useState("");
  const [catId, setCatId] = useState("");
  const [subId, setSubId] = useState("");
  const [ref, setRef] = useState("");
  const [vatExempt, setVatExempt] = useState(false);
  const [section, setSection] = useState<Section>("expenses");
  const [name, setName] = useState("");
  const [fileType, setFileType] = useState<"PDF" | "IMG">("PDF");
  const [picked, setPicked] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [chained, setChained] = useState(false);
  const [fileKind, setFileKind] = useState<FileKind>("bill");

  const reset = () => {
    setCounterparty("");
    setDescription("");
    setAmount("");
    setDueDate(todayIso());
    setLineId("");
    setCatId("");
    setSubId("");
    setRef("");
    setVatExempt(false);
    setName("");
  };

  const close = () => {
    onClose();
    window.setTimeout(() => {
      setMode("menu");
      setChained(false);
      setFileKind("bill");
      setPicked(null);
      reset();
    }, 220);
  };

  const eventLines = db.lines.filter((l) => l.eventId === eventId);
  /* categories, each followed by its invoice child lines indented beneath it */
  const lineOptions = (secs: Section[]) =>
    eventLines
      .filter((l) => secs.includes(l.section) && !l.parentId)
      .flatMap((parent) => [
        <option key={parent.id} value={parent.id}>
          {parent.name}
        </option>,
        ...eventLines
          .filter((c) => c.parentId === parent.id)
          .map((c) => (
            <option key={c.id} value={c.id}>
              {`\u00a0\u00a0\u00a0\u2014 ${c.name}${c.ref ? ` · inv ${c.ref}` : ""}`}
            </option>
          )),
      ]);

  const titles: Record<Mode, string> = {
    menu: "Add",
    bill: "Add bill",
    in: "Add money in",
    line: "Add budget line",
    file: "Attach file",
  };

  return (
    <Sheet open={open} onClose={close} title={titles[mode]}>
      {mode === "menu" && (
        <div className="space-y-2">
          {(
            [
              ["bill", "Add bill", "Something you owe a vendor"],
              ["in", "Add money in", "Sponsorship, tickets, tables"],
              ["line", "Add budget line", "New P&L line for this event"],
              ["file", "Attach file", "Scan a bill, or attach any document"],
            ] as [Mode, string, string][]
          ).map(([m, label, sub]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className="flex w-full items-center justify-between rounded-[12px] bg-app px-4 py-3.5 text-left"
            >
              <span>
                <span className="block text-[14.5px] font-bold text-ink">{label}</span>
                <span className="block text-[12px] text-mute">{sub}</span>
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden style={{ color: "var(--mute)" }}>
                <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {(mode === "bill" || mode === "in") && (
        <>
          <Field label={mode === "bill" ? "Vendor" : "Payer"}>
            <TextInput value={counterparty} onChange={(e) => setCounterparty(e.target.value)} placeholder="Name" />
          </Field>
          <Field label="Description">
            <TextInput value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Invoice / reference" />
          </Field>
          <Field label="Amount (VAT inclusive)">
            <TextInput className="num" type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Due date">
            <TextInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          {mode === "bill" ? (
            <>
              <Field label="Invoice number (optional)">
                <TextInput value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. 81205-2" />
              </Field>
              <CategoryRouter
                section="expenses"
                categoryId={catId}
                subcategoryId={subId}
                onChange={(c, sc) => {
                  setCatId(c);
                  setSubId(sc);
                }}
              />
            </>
          ) : (
            <Field label="P&L line">
              <SelectInput value={lineId} onChange={(e) => setLineId(e.target.value)}>
                <option value="">Unassigned</option>
                {lineOptions(["revenue"])}
              </SelectInput>
            </Field>
          )}
          <Toggle label="VAT exempt" checked={vatExempt} onChange={setVatExempt} />
          <div className="mt-5">
            <PrimaryButton
              onClick={async () => {
                const v = Number(amount) || 0;
                if (!counterparty.trim() || v <= 0) return;
                if (mode === "bill") {
                  if (!catId) {
                    showToast("Choose a category");
                    return;
                  }
                  const res = await addRoutedBill({
                    eventId,
                    counterparty: counterparty.trim(),
                    description: description.trim(),
                    ref: ref.trim() || undefined,
                    amount: v,
                    dueDate,
                    vatExempt,
                    categoryId: catId,
                    subcategoryId: subId || undefined,
                  });
                  if (!res) return;
                  showToast("Bill added");
                } else {
                  addMoneyIn({
                    eventId,
                    counterparty: counterparty.trim(),
                    description: description.trim() || "—",
                    amount: v,
                    dueDate,
                    lineId: lineId || undefined,
                    vatExempt,
                  });
                  showToast("Money in added");
                }
                close();
              }}
            >
              Save
            </PrimaryButton>
          </div>
        </>
      )}

      {mode === "line" && (
        <>
          <Field label="Section">
            <SelectInput value={section} onChange={(e) => setSection(e.target.value as Section)}>
              <option value="revenue">Revenue</option>
              
              <option value="expenses">Expenses</option>
            </SelectInput>
          </Field>
          <Field label="Line name">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Shuttle buses" />
          </Field>
          <Field label="Budget amount">
            <TextInput className="num" type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Toggle label="VAT exempt" checked={vatExempt} onChange={setVatExempt} />
          <div className="mt-5">
            <PrimaryButton
              onClick={() => {
                if (!name.trim()) return;
                addBudgetLine(eventId, section, name.trim(), Number(amount) || 0, vatExempt);
                showToast("Line added");
                close();
              }}
            >
              Save
            </PrimaryButton>
          </div>
        </>
      )}

      {mode === "file" && (
        <>
          <PillGroup<FileKind>
            value={fileKind}
            onChange={setFileKind}
            options={[
              { value: "bill", label: "Bill" },
              { value: "other", label: "Other" },
            ]}
          />
          {fileKind === "bill" ? (
            <div className="mt-3">
              <ScanBillPanel eventId={eventId} onDone={close} />
            </div>
          ) : (
        <>
          <Field label="Choose file">
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setPicked(f);
                if (f) {
                  if (!name.trim()) setName(f.name.replace(/\.[^.]+$/, ""));
                  setFileType(f.type.startsWith("image/") ? "IMG" : "PDF");
                }
              }}
              className="w-full text-[13px] text-ink"
            />
          </Field>
          <Field label="File name">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Security invoice" />
          </Field>
          <Field label="Type">
            <SelectInput value={fileType} onChange={(e) => setFileType(e.target.value as "PDF" | "IMG")}>
              <option value="PDF">PDF</option>
              <option value="IMG">Image</option>
            </SelectInput>
          </Field>
          <Field label="Amount (optional)">
            <TextInput className="num" type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <CategoryRouter
            section="expenses"
            categoryId={catId}
            subcategoryId={subId}
            onChange={(c, sc) => {
              setCatId(c);
              setSubId(sc);
            }}
          />
          <div className="mt-5">
            <PrimaryButton
              onClick={async () => {
                if (!name.trim() || uploading) return;
                if (picked && picked.size > 20 * 1024 * 1024) {
                  showToast("File is larger than 20 MB");
                  return;
                }
                let storagePath: string | undefined;
                if (picked && promoterId) {
                  setUploading(true);
                  const safe = picked.name.replace(/[^\w.\-]+/g, "_");
                  const path = `${promoterId}/${eventId}/${Date.now()}-${safe}`;
                  const { error } = await supabase.storage
                    .from("setlup-files")
                    .upload(path, picked, { contentType: picked.type || undefined });
                  setUploading(false);
                  if (error) {
                    showToast("Upload failed");
                    return;
                  }
                  storagePath = path;
                }
                const routedLineId = catId
                  ? await ensureRoutedLine(eventId, catId, subId || undefined, subId ? name.trim() : undefined)
                  : undefined;
                addFile({
                  eventId,
                  name: name.trim(),
                  type: fileType,
                  date: todayIso(),
                  lineId: routedLineId ?? undefined,
                  amount: Number(amount) || undefined,
                  storagePath,
                });
                setPicked(null);
                showToast("File attached");
                setChained(true);
                reset();
              }}
            >
              {uploading ? "Uploading…" : "Attach"}
            </PrimaryButton>
          </div>
          {chained && (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setChained(false)}
                className="h-11 flex-1 rounded-full bg-app text-[12.5px] font-extrabold uppercase tracking-[0.07em] text-ink"
              >
                Add another
              </button>
              <button
                type="button"
                onClick={close}
                className="h-11 flex-1 rounded-full text-[12.5px] font-extrabold uppercase tracking-[0.07em] text-white"
                style={{ backgroundColor: "var(--accent-c)" }}
              >
                Done
              </button>
            </div>
          )}
        </>
          )}
        </>
      )}

    </Sheet>
  );
}

/* ---------------- category router ---------------- */

export function CategoryRouter({
  section,
  categoryId,
  subcategoryId,
  onChange,
}: {
  section: Section;
  categoryId: string;
  subcategoryId: string;
  onChange: (categoryId: string, subcategoryId: string) => void;
}) {
  const { db } = useSetlup();
  const byOrder = (a: { sortOrder: number; name: string }, b: { sortOrder: number; name: string }) =>
    a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
  const cats = db.categories.filter((c) => !c.parentId && c.section === section && !c.archived).sort(byOrder);
  const subs = db.categories.filter((c) => c.parentId === categoryId && !c.archived).sort(byOrder);

  return (
    <>
      <Field label="Category">
        <SelectInput value={categoryId} onChange={(e) => onChange(e.target.value, "")}>
          <option value="">Choose a category</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectInput>
      </Field>
      {subs.length > 0 && (
        <Field label="Subcategory (optional)">
          <SelectInput value={subcategoryId} onChange={(e) => onChange(categoryId, e.target.value)}>
            <option value="">None</option>
            {subs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectInput>
        </Field>
      )}
    </>
  );
}

/** Re-route an existing linked line to another category / subcategory. */
export function RouteSheet({
  lineId,
  open,
  onClose,
}: {
  lineId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { db, routeLine } = useSetlup();
  const line = lineId ? db.lines.find((l) => l.id === lineId) : undefined;
  const [cat, setCat] = useState("");
  const [sub, setSub] = useState("");

  useEffect(() => {
    if (!line) return;
    const node = line.categoryId ? db.categories.find((c) => c.id === line.categoryId) : undefined;
    if (node?.parentId) {
      setCat(node.parentId);
      setSub(node.id);
    } else {
      setCat(node?.id ?? "");
      setSub("");
    }
  }, [lineId]);

  return (
    <Sheet open={open} onClose={onClose} title="Route to category">
      {line && (
        <>
          <div className="rounded-[12px] bg-app px-3.5 py-3">
            <div className="text-[14.5px] font-bold text-ink">{line.name}</div>
            {line.detail && <div className="mt-0.5 text-[12.5px] text-mute">{line.detail}</div>}
          </div>
          <CategoryRouter
            section={line.section}
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
                await routeLine(line.id, cat, sub || undefined);
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
