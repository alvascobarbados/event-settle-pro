import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { EVENTS } from "@/lib/setl-data";
import { netProfit } from "@/lib/setl-compute";
import { fmt } from "@/lib/setl-format";

const BAR_FG = "#221A20"; // ink, used for everything on the magenta bar
const BAR_BG = "#CE1663"; // magenta
const DRAWER_FG = "#FAF8F9";


export function AppShell({
  children,
  rightSlot,
}: {
  children: ReactNode;
  rightSlot?: ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // body scroll lock while drawer open
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  // Esc to close
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  return (
    <>
      <AppBar
        onOpen={() => setDrawerOpen(true)}
        scrolled={scrolled}
        rightSlot={rightSlot}
      />
      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div style={{ paddingTop: "calc(52px + env(safe-area-inset-top, 0px))" }}>
        {children}
      </div>

    </>
  );
}

function AppBar({
  onOpen,
  scrolled,
  rightSlot,
}: {
  onOpen: () => void;
  scrolled: boolean;
  rightSlot?: ReactNode;
}) {
  return (
    <header
      className="fixed inset-x-0 top-0 z-40"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
        backgroundColor: BAR_BG,
        boxShadow: scrolled ? "0 1px 8px rgba(206,22,99,0.35)" : "none",
        transition: "box-shadow 150ms ease-out",
      }}
    >
      <div className="flex h-[52px] items-center gap-1 pr-3">
        <button
          type="button"
          onClick={onOpen}
          aria-label="Open menu"
          className="grid h-11 w-11 shrink-0 place-items-center"
          style={{ color: BAR_FG }}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
              d="M3 5.5h14M3 10h14M3 14.5h14"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <span
          className="setl-wordmark text-[16px] leading-none"
          style={{ color: BAR_FG }}
        >
          SETL
        </span>
        <div
          className="ml-auto min-w-0 flex items-center justify-end transition-opacity duration-150 ease-out"
          style={{ opacity: rightSlot ? 1 : 0 }}
          aria-hidden={!rightSlot}
        >
          {rightSlot}
        </div>
      </div>
    </header>
  );
}


/* Right-side slot preset used by the event page. */
export function EventBarSlot({
  name,
  netProfitAmount,
}: {
  name: string;
  netProfitAmount: number;
}) {
  return (
    <div className="flex items-baseline gap-2 min-w-0">
      <span
        className="truncate text-[13px] leading-none"
        style={{ color: BAR_FG, fontWeight: 600 }}
      >
        {name}
      </span>
      <span
        className="num shrink-0 text-[13px] leading-none tabular-nums"
        style={{ color: BAR_FG, fontWeight: 800 }}
      >
        {fmt(netProfitAmount)}
      </span>
    </div>

  );
}

function NavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // swipe left to close
  useEffect(() => {
    if (!open) return;
    let startX: number | null = null;
    let currentX: number | null = null;
    const onStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      currentX = startX;
    };
    const onMove = (e: TouchEvent) => {
      currentX = e.touches[0].clientX;
    };
    const onEnd = () => {
      if (startX !== null && currentX !== null && startX - currentX > 60) {
        onClose();
      }
      startX = null;
      currentX = null;
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [open, onClose]);

  const isEvents = pathname === "/";
  const isVendors = pathname.startsWith("/vendors");
  const activeEventId = pathname.startsWith("/event/") ? pathname.split("/")[2] : null;

  return (
    <>
      {/* scrim */}
      <div
        onClick={onClose}
        aria-hidden={!open}
        className="fixed inset-0 z-50 transition-opacity duration-200 ease-out"
        style={{
          backgroundColor: "rgba(34,26,32,0.5)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
      />
      {/* drawer */}
      <aside
        role="dialog"
        aria-label="Navigation"
        aria-hidden={!open}
        className="fixed inset-y-0 left-0 z-[60] flex w-[280px] flex-col transition-transform duration-200 ease-out"
        style={{
          backgroundColor: "var(--ink)",
          color: DRAWER_FG,
          transform: open ? "translateX(0)" : "translateX(-100%)",
          paddingTop: "env(safe-area-inset-top)",
          paddingLeft: "env(safe-area-inset-left)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-6">
          <span className="setl-wordmark text-[22px]" style={{ color: DRAWER_FG }}>
            SETL
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid h-11 w-11 place-items-center -mr-2"
            style={{ color: DRAWER_FG }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
              <path
                d="M4 4l10 10M14 4L4 14"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <Link
          to="/"
          onClick={onClose}
          className="relative flex items-center px-4 text-[16px]"
          style={{
            minHeight: 48,
            color: isEvents ? "var(--magenta)" : DRAWER_FG,
            fontWeight: isEvents ? 600 : 500,
          }}
        >
          {isEvents && <ActiveBar />}
          Events
        </Link>
        <Link
          to="/vendors"
          onClick={onClose}
          className="relative flex items-center px-4 text-[16px]"
          style={{
            minHeight: 48,
            color: isVendors ? "var(--magenta)" : DRAWER_FG,
            fontWeight: isVendors ? 600 : 500,
          }}
        >
          {isVendors && <ActiveBar />}
          Vendors
        </Link>

        <div
          className="mt-6 px-4 pb-1 text-[10px] font-semibold uppercase"
          style={{
            color: "rgba(250,248,249,0.5)",
            letterSpacing: "0.12em",
          }}
        >
          Events
        </div>
        <div className="flex-1 overflow-y-auto pb-4">
          {EVENTS.map((e) => {
            const np = netProfit(e).amount;
            const active = activeEventId === e.id;
            return (
              <Link
                key={e.id}
                to="/event/$id"
                params={{ id: e.id }}
                onClick={onClose}
                className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 text-[14px]"
                style={{
                  minHeight: 48,
                  color: active ? "var(--magenta)" : DRAWER_FG,
                  fontWeight: active ? 600 : 500,
                }}
              >
                {active && <ActiveBar />}
                <span className="truncate">{e.name}</span>
                <span
                  className="num text-[13px] tabular-nums"
                  style={{
                    color: active ? "var(--magenta)" : "rgba(250,248,249,0.7)",
                  }}
                >
                  {fmt(np)}
                </span>
              </Link>
            );
          })}
        </div>
      </aside>
    </>
  );
}

function ActiveBar() {
  return (
    <span
      aria-hidden
      className="absolute left-0 top-0 bottom-0 w-[3px]"
      style={{ backgroundColor: "var(--magenta)" }}
    />
  );
}
