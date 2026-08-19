import { useEffect, useState, type ReactNode } from "react";
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

export function ActionSheet({
  eventId,
  open,
  onClose,
}: {
  eventId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { db, addBill, addMoneyIn, addBudgetLine, addFile, showToast } = useSetlup();
  const [mode, setMode] = useState<Mode>("menu");

  const [counterparty, setCounterparty] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(todayIso());
  const [lineId, setLineId] = useState("");
  const [vatExempt, setVatExempt] = useState(false);
  const [section, setSection] = useState<Section>("expenses");
  const [name, setName] = useState("");
  const [fileType, setFileType] = useState<"PDF" | "IMG">("PDF");

  const reset = () => {
    setCounterparty("");
    setDescription("");
    setAmount("");
    setDueDate(todayIso());
    setLineId("");
    setVatExempt(false);
    setName("");
  };

  const close = () => {
    onClose();
    window.setTimeout(() => {
      setMode("menu");
      reset();
    }, 220);
  };

  const eventLines = db.lines.filter((l) => l.eventId === eventId);
  const lineOptions = (secs: Section[]) =>
    eventLines
      .filter((l) => secs.includes(l.section))
      .map((l) => (
        <option key={l.id} value={l.id}>
          {l.name}
        </option>
      ));

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
              ["file", "Attach file", "Invoice, receipt or agreement"],
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
          <Field label="P&L line">
            <SelectInput value={lineId} onChange={(e) => setLineId(e.target.value)}>
              <option value="">Unassigned</option>
              {lineOptions(mode === "bill" ? ["cos", "expenses"] : ["revenue"])}
            </SelectInput>
          </Field>
          <Toggle label="VAT exempt" checked={vatExempt} onChange={setVatExempt} />
          <div className="mt-5">
            <PrimaryButton
              onClick={() => {
                const v = Number(amount) || 0;
                if (!counterparty.trim() || v <= 0) return;
                const payload = {
                  eventId,
                  counterparty: counterparty.trim(),
                  description: description.trim() || "—",
                  amount: v,
                  dueDate,
                  lineId: lineId || undefined,
                  vatExempt,
                };
                if (mode === "bill") addBill(payload);
                else addMoneyIn(payload);
                showToast(mode === "bill" ? "Bill added" : "Money in added");
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
              <option value="cos">Cost of sales</option>
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
          <Field label="Link to line">
            <SelectInput value={lineId} onChange={(e) => setLineId(e.target.value)}>
              <option value="">Unlinked</option>
              {lineOptions(["revenue", "cos", "expenses"])}
            </SelectInput>
          </Field>
          <div className="mt-5">
            <PrimaryButton
              onClick={() => {
                if (!name.trim()) return;
                addFile({
                  eventId,
                  name: name.trim(),
                  type: fileType,
                  date: todayIso(),
                  lineId: lineId || undefined,
                  amount: Number(amount) || undefined,
                });
                showToast("File attached");
                close();
              }}
            >
              Attach
            </PrimaryButton>
          </div>
        </>
      )}
    </Sheet>
  );
}
