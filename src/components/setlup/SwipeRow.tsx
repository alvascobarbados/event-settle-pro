import { useRef, useState, type ReactNode } from "react";

/**
 * Swipe left to reveal a red Delete button; long-press does the same for accessibility.
 * The confirm is asked once, in-row, before anything is removed.
 */
export function SwipeRow({
  children,
  confirmTitle = "Delete this?",
  confirmBody,
  onDelete,
  disabled,
}: {
  children: ReactNode;
  confirmTitle?: string;
  confirmBody?: string;
  onDelete: () => void | Promise<void>;
  disabled?: boolean;
}) {
  const [dx, setDx] = useState(0);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const startX = useRef<number | null>(null);
  const startY = useRef(0);
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (disabled) return <>{children}</>;

  const reveal = () => {
    setOpen(true);
    setDx(0);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0]?.clientX ?? null;
    startY.current = e.touches[0]?.clientY ?? 0;
    press.current = setTimeout(reveal, 550);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (press.current) clearTimeout(press.current);
    if (startX.current === null) return;
    const x = (e.touches[0]?.clientX ?? 0) - startX.current;
    const y = Math.abs((e.touches[0]?.clientY ?? 0) - startY.current);
    if (y > 18) return;
    setDx(x < 0 ? Math.max(x, -96) : 0);
  };
  const onTouchEnd = () => {
    if (press.current) clearTimeout(press.current);
    if (dx < -48) reveal();
    else setDx(0);
    startX.current = null;
  };

  return (
    <div className="relative overflow-hidden">
      <div
        className="absolute inset-y-0 right-0 flex items-center"
        style={{ opacity: open || dx < -8 ? 1 : 0 }}
        aria-hidden={!open}
      >
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="h-full px-5 text-[12px] font-extrabold uppercase tracking-[0.07em] text-white"
          style={{ backgroundColor: "var(--red)" }}
        >
          Delete
        </button>
      </div>
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onContextMenu={(e) => {
          e.preventDefault();
          reveal();
        }}
        className="relative bg-card transition-transform duration-150 ease-out"
        style={{ transform: `translateX(${open ? -96 : dx}px)` }}
      >
        {children}
      </div>
      {confirming && (
        <div className="border-t px-4 py-3" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--app, #fff)" }}>
          <div className="text-[13.5px] font-bold text-ink">{confirmTitle}</div>
          {confirmBody && <div className="mt-0.5 text-[12.5px] text-mute">{confirmBody}</div>}
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={async () => {
                setConfirming(false);
                setOpen(false);
                await onDelete();
              }}
              className="h-9 rounded-full px-4 text-[12px] font-extrabold uppercase tracking-[0.07em] text-white"
              style={{ backgroundColor: "var(--red)" }}
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setOpen(false);
              }}
              className="h-9 rounded-full bg-card px-4 text-[12px] font-extrabold uppercase tracking-[0.07em] text-ink"
              style={{ border: "1.5px solid var(--hairline)" }}
            >
              Keep
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Pull down at the top of a page to re-fetch. */
export function PullToRefresh({ onRefresh, children }: { onRefresh: () => Promise<void>; children: ReactNode }) {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const startY = useRef<number | null>(null);

  const wrap = useRef<HTMLDivElement>(null);

  /** True when the nearest scrolling ancestor is already at the top. */
  const atTop = () => {
    let el: HTMLElement | null = wrap.current;
    while (el) {
      const style = getComputedStyle(el);
      if (/(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight) return el.scrollTop <= 0;
      el = el.parentElement;
    }
    return (document.scrollingElement ?? document.documentElement).scrollTop <= 0;
  };

  return (
    <div
      ref={wrap}
      onTouchStart={(e) => {
        startY.current = atTop() ? (e.touches[0]?.clientY ?? null) : null;
      }}
      onTouchMove={(e) => {
        if (startY.current === null || busy) return;
        const dy = (e.touches[0]?.clientY ?? 0) - startY.current;
        setPull(dy > 0 ? Math.min(dy, 90) : 0);
      }}
      onTouchEnd={async () => {
        const should = pull > 60 && !busy;
        startY.current = null;
        setPull(0);
        if (!should) return;
        setBusy(true);
        try {
          await onRefresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {(pull > 0 || busy) && (
        <div className="grid place-items-center overflow-hidden" style={{ height: busy ? 34 : Math.min(pull, 40) }}>
          <span
            className={`block h-4 w-4 rounded-full border-2 border-transparent ${busy ? "animate-spin" : ""}`}
            style={{ borderTopColor: "var(--accent-c)", borderRightColor: "var(--accent-c)" }}
          />
        </div>
      )}
      {children}
    </div>
  );
}
