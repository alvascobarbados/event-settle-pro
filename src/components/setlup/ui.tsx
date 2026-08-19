import type { ReactNode } from "react";
import type { RecordStatus, Stage } from "@/lib/setlup/types";

/* ---------------- badges & chips ---------------- */

const STAGE_STYLE: Record<Stage, { label: string; fg: string; bg: string }> = {
  planning: { label: "Planning", fg: "var(--amber-fg)", bg: "var(--amber-bg)" },
  reconciling: { label: "Reconciling", fg: "var(--partial-fg)", bg: "var(--partial-bg)" },
  closed: { label: "Closed", fg: "var(--closed-fg)", bg: "var(--closed-bg)" },
};

export function StageBadge({ stage }: { stage: Stage }) {
  const s = STAGE_STYLE[stage];
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase"
      style={{ color: s.fg, backgroundColor: s.bg, letterSpacing: "0.1em" }}
    >
      <span aria-hidden className="h-[5px] w-[5px] rounded-full" style={{ backgroundColor: s.fg }} />
      {s.label}
    </span>
  );
}

export type ChipTone = "amber" | "green" | "red" | "partial" | "neutral";

const CHIP_STYLE: Record<ChipTone, { fg: string; bg: string }> = {
  amber: { fg: "var(--amber-fg)", bg: "var(--amber-bg)" },
  green: { fg: "var(--green-fg)", bg: "var(--green-bg)" },
  red: { fg: "#ffffff", bg: "var(--red)" },
  partial: { fg: "var(--partial-fg)", bg: "var(--partial-bg)" },
  neutral: { fg: "var(--closed-fg)", bg: "var(--closed-bg)" },
};

export function Chip({ tone = "neutral", children }: { tone?: ChipTone; children: ReactNode }) {
  const s = CHIP_STYLE[tone];
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2 py-[3px] text-[9.5px] font-bold uppercase"
      style={{ color: s.fg, backgroundColor: s.bg, letterSpacing: "0.08em" }}
    >
      {children}
    </span>
  );
}

const STATUS_TONE: Record<RecordStatus, ChipTone> = {
  outstanding: "amber",
  overdue: "red",
  partial: "partial",
  paid: "green",
};

export function StatusChip({ status }: { status: RecordStatus }) {
  return <Chip tone={STATUS_TONE[status]}>{status}</Chip>;
}

/* ---------------- pills ---------------- */

export function PillGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="inline-flex flex-wrap items-center gap-1 rounded-full p-1"
      style={{ border: "1.5px solid var(--hairline)" }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="rounded-full text-[11px] font-bold uppercase transition-colors duration-150"
            style={{
              letterSpacing: "0.09em",
              padding: "8px 14px",
              backgroundColor: active ? "var(--accent-c)" : "transparent",
              color: active ? "#fff" : "var(--mute)",
            }}
            aria-pressed={active}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- misc blocks ---------------- */

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      className="text-[11px] font-extrabold uppercase text-mute"
      style={{ letterSpacing: "0.1em" }}
    >
      {children}
    </div>
  );
}

export function LockedBanner({ lockedAt }: { lockedAt?: string }) {
  return (
    <div
      className="rounded-[12px] px-3.5 py-2.5 text-[12px] font-medium"
      style={{ backgroundColor: "var(--closed-bg)", color: "var(--closed-fg)" }}
    >
      Closed · locked {lockedAt ?? "—"} · read-only. Reopen from actions.
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-[300px] py-16 text-center">
      <div className="text-[17px] font-extrabold text-ink">{title}</div>
      <p className="mt-2 text-[13.5px] leading-relaxed text-mute">{body}</p>
    </div>
  );
}

export function FinePrint({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-[12px] leading-relaxed text-mute">{children}</p>;
}

export function PrimaryButton({
  children,
  onClick,
  full = true,
}: {
  children: ReactNode;
  onClick?: () => void;
  full?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${full ? "w-full" : ""} rounded-[12px] px-4 py-3.5 text-[13px] font-extrabold uppercase text-white transition-opacity duration-150 active:opacity-80`}
      style={{ backgroundColor: "var(--accent-c)", letterSpacing: "0.08em" }}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[16px] bg-card ${className}`}
      style={{ border: "1.5px solid var(--hairline)" }}
    >
      {children}
    </div>
  );
}
