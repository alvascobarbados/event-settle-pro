import type { ReactNode } from "react";
import { money } from "@/lib/setlup/format";

const GRID = "grid grid-cols-[minmax(0,1fr)_auto_56px] items-baseline gap-2";

export function LedgerHead({ vatLabel = "VAT" }: { vatLabel?: string }) {
  return (
    <div className={`${GRID} px-4 pb-1.5`}>
      <span />
      <span className="text-[9px] font-extrabold uppercase text-mute" style={{ letterSpacing: "0.1em" }}>
        Amount
      </span>
      <span className="text-right text-[9px] font-extrabold uppercase text-vat" style={{ letterSpacing: "0.1em" }}>
        {vatLabel}
      </span>
    </div>
  );
}

export function SectionHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-2"
      style={{ backgroundColor: "var(--accent-tint-c)" }}
    >
      <span
        className="text-[10.5px] font-extrabold uppercase"
        style={{ letterSpacing: "0.12em", color: "var(--accent-deep-c)" }}
      >
        {title}
      </span>
      {right}
    </div>
  );
}

export function LedgerRow({
  label,
  detail,
  sub,
  amount,
  vat,
  child,
  expandable,
  open,
  onToggle,
  hasFile,
  onSelect,
}: {
  label: string;
  detail?: string;
  sub?: string;
  amount: number;
  vat?: number;
  child?: boolean;
  expandable?: boolean;
  open?: boolean;
  onToggle?: () => void;
  hasFile?: boolean;
  onSelect?: () => void;
}) {
  const inner = (
    <div
      className={`grid grid-cols-[minmax(0,1fr)_auto_56px] gap-2 px-4 ${child ? "items-start" : "items-baseline"}`}
      style={{ minHeight: child ? 40 : 46 }}
    >
      <span className={`flex min-w-0 gap-1.5 ${child ? "items-start py-2" : "items-baseline py-2.5"}`}>
        {expandable && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            className="mt-[3px] shrink-0 transition-transform duration-150"
            style={{ color: "var(--mute)", transform: open ? "rotate(90deg)" : "none" }}
          >
            <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        )}
        {child ? (
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold leading-snug text-ink">{label}</span>
            {detail && (
              <span className="mt-0.5 block text-[11px] leading-snug text-mute">{detail}</span>
            )}
          </span>
        ) : (
          <span className="min-w-0 text-[14.5px] font-semibold leading-snug text-ink">{label}</span>
        )}
      </span>
      <span
        className={`num text-right ${child ? "py-2 text-[13px] font-semibold text-ink" : "py-2.5 text-[14.5px] font-bold text-ink"}`}
      >
        {money(amount)}
      </span>
      <span
        className={`num flex items-baseline justify-end gap-1 text-right text-[11px] text-vat ${child ? "py-2" : "py-2.5"}`}
      >
        <span>{vat === undefined ? "" : vat === 0 ? "—" : money(vat)}</span>
        {hasFile && (
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            className="shrink-0 self-center"
            style={{ color: "var(--accent-c)" }}
          >
            <path
              d="M20.5 11.5l-8 8a5 5 0 01-7-7l8.5-8.5a3.2 3.2 0 014.5 4.5l-8.5 8.5a1.5 1.5 0 01-2-2l7.5-7.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </span>
    </div>
  );

  if (sub) {
    return (
      <div className="dashed-row">
        {inner}
        <div className="px-4 pb-2 text-[11.5px] text-mute">{sub}</div>
      </div>
    );
  }
  if (expandable) {
    return (
      <button type="button" onClick={onToggle} className="dashed-row block w-full text-left active:bg-app">
        {inner}
      </button>
    );
  }
  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} className="dashed-row block w-full text-left active:bg-app">
        {inner}
      </button>
    );
  }
  return <div className="dashed-row">{inner}</div>;
}

export function SectionTotal({ label, amount, vat, sub }: { label: string; amount: number; vat?: number; sub?: string }) {
  return (
    <div style={{ borderTop: "1.5px solid var(--ink)" }}>
      <div className={`${GRID} px-4 pt-2`}>
        <span className="text-[11px] font-extrabold uppercase text-ink" style={{ letterSpacing: "0.09em" }}>
          {label}
        </span>
        <span className="num text-right text-[16px] font-extrabold text-ink">{money(amount)}</span>
        <span className="num text-right text-[11px] text-vat">{vat === undefined ? "" : money(vat)}</span>
      </div>
      {sub && <div className="px-4 pb-2 pt-0.5 text-[11.5px] text-mute">{sub}</div>}
      {!sub && <div className="pb-2" />}
    </div>
  );
}

export function Milestone({
  label,
  amount,
  sub,
  hero,
}: {
  label: string;
  amount: number;
  sub?: string;
  hero?: boolean;
}) {
  const negative = amount < 0;
  return (
    <div
      className="px-4 pt-2.5 pb-3"
      style={{
        borderTop: hero ? "3px solid var(--accent-c)" : "2px solid var(--ink)",
        backgroundColor: hero ? "var(--accent-tint-c)" : undefined,
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span
          className="text-[11px] font-extrabold uppercase"
          style={{ letterSpacing: "0.1em", color: hero ? "var(--accent-deep-c)" : "var(--ink)" }}
        >
          {label}
        </span>
        <span
          className={`num ${hero ? "text-[27px]" : "text-[21px]"} font-black leading-none`}
          style={{ color: negative ? "var(--red)" : hero ? "var(--accent-deep-c)" : "var(--ink)" }}
        >
          {money(amount)}
        </span>
      </div>
      {sub && <div className="mt-1.5 text-right text-[11.5px] text-mute">{sub}</div>}
    </div>
  );
}

export function StatLine({
  label,
  amount,
  sub,
  tone,
  strong,
}: {
  label: string;
  amount: number;
  sub?: string;
  tone?: "positive" | "negative" | "neutral";
  strong?: boolean;
}) {
  const color =
    tone === "negative" ? "var(--red)" : tone === "positive" ? "var(--green-fg)" : "var(--ink)";
  return (
    <div className="dashed-row flex items-baseline justify-between gap-3 px-4 py-3">
      <span className="min-w-0">
        <span className={`block truncate ${strong ? "text-[14.5px] font-bold" : "text-[13.5px] font-semibold"} text-ink`}>
          {label}
        </span>
        {sub && <span className="block text-[11.5px] text-mute">{sub}</span>}
      </span>
      <span className={`num shrink-0 ${strong ? "text-[16px] font-extrabold" : "text-[14.5px] font-bold"}`} style={{ color }}>
        {money(amount)}
      </span>
    </div>
  );
}
