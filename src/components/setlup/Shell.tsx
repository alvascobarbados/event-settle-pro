import { Link, useRouterState } from "@tanstack/react-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useSetlup } from "@/lib/setlup/store";
import { BRAND_ACCENT, type Accent } from "@/lib/setlup/types";

/* ---------------- accent ---------------- */

export function accentVars(accent: Accent): React.CSSProperties {
  return {
    ["--accent-c" as string]: accent.accent,
    ["--accent-deep-c" as string]: accent.accentDeep,
    ["--accent-tint-c" as string]: accent.tint,
    ["--accent-on-bar" as string]: accent.onBar,
  } as React.CSSProperties;
}

/* ---------------- chrome context ---------------- */

const ChromeContext = createContext<{ openDrawer: () => void }>({ openDrawer: () => {} });
export const useChrome = () => useContext(ChromeContext);

export function AppFrame({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { toast } = useSetlup();
  const openDrawer = useCallback(() => setDrawerOpen(true), []);

  return (
    <ChromeContext.Provider value={{ openDrawer }}>
      <div className="flex min-h-screen justify-center bg-frame sm:py-6">
        <div
          className="relative flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-app sm:h-[calc(100dvh-48px)] sm:rounded-[24px] sm:shadow-[0_18px_50px_rgba(34,26,32,0.18)]"
          style={accentVars(BRAND_ACCENT)}
        >
          {children}
          <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
          {toast && (
            <div className="pointer-events-none absolute inset-x-0 bottom-24 z-[80] flex justify-center px-6">
              <div className="rounded-full bg-ink px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-lg">
                {toast}
              </div>
            </div>
          )}
        </div>
      </div>
    </ChromeContext.Provider>
  );
}

/* ---------------- app bar ---------------- */

export function AppBar({ eventName }: { eventName?: string }) {
  const { openDrawer } = useChrome();
  return (
    <header
      className="z-30 shrink-0"
      style={{ backgroundColor: eventName ? "var(--accent-c)" : "var(--brand)" }}
    >
      <div className="flex items-center gap-1.5 px-1.5" style={{ height: 56 }}>
        <button
          type="button"
          onClick={openDrawer}
          aria-label="Open menu"
          className="grid h-11 w-11 shrink-0 place-items-center"
          style={{ color: eventName ? "var(--accent-on-bar)" : "var(--ink)" }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        {eventName ? (
          <div className="min-w-0" style={{ color: "var(--accent-on-bar)" }}>
            <div
              className="text-[9px] font-extrabold uppercase"
              style={{ letterSpacing: "0.22em", opacity: 0.6 }}
            >
              SETLUP
            </div>
            <div className="wide-116 truncate text-[17px] font-black uppercase leading-tight">
              {eventName}
            </div>
          </div>
        ) : (
          <span
            className="wordmark text-[21px] font-black uppercase leading-none"
            style={{ color: "var(--ink)" }}
          >
            SETLUP
          </span>
        )}
      </div>
    </header>
  );
}

/* ---------------- scrollable page area ---------------- */

export function PageScroll({ children }: { children: ReactNode }) {
  return (
    <main data-scroll className="flex-1 overflow-y-auto overscroll-contain">
      {children}
    </main>
  );
}

export function ScrollTop() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    const el = document.querySelector("[data-scroll]");
    if (el) el.scrollTop = 0;
  }, [pathname]);
  return null;
}

/* ---------------- drawer ---------------- */

const DOT: Record<string, string> = {
  planning: "var(--amber-fg)",
  reconciling: "var(--partial-fg)",
  closed: "var(--closed-fg)",
};

function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { db } = useSetlup();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const activeEventId = pathname.startsWith("/event/") ? pathname.split("/")[2] : null;

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
      <aside
        role="dialog"
        aria-label="Navigation"
        aria-hidden={!open}
        className="absolute inset-y-0 left-0 z-[70] flex w-[290px] flex-col bg-card transition-transform duration-200 ease-out"
        style={{ transform: open ? "translateX(0)" : "translateX(-100%)" }}
      >
        <div className="flex items-center justify-between px-4 pb-5 pt-5">
          <span
            className="wordmark text-[21px] font-black uppercase leading-none"
            style={{ color: "var(--brand)" }}
          >
            SETLUP
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid h-10 w-10 place-items-center text-mute"
          >
            <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-4 pb-1.5 text-[11px] font-extrabold uppercase text-mute" style={{ letterSpacing: "0.1em" }}>
          Events
        </div>
        <div className="max-h-[45%] overflow-y-auto">
          {db.events.map((e) => {
            const active = activeEventId === e.id;
            return (
              <DrawerItem key={e.id} to="/event/$id" params={{ id: e.id }} active={active} onClose={onClose}>
                <span aria-hidden className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ backgroundColor: DOT[e.stage] }} />
                <span className="truncate">{e.name}</span>
              </DrawerItem>
            );
          })}
          <DrawerItem to="/" active={pathname === "/"} onClose={onClose}>
            <span className="text-mute">All events</span>
          </DrawerItem>
        </div>

        <div className="mx-4 my-3" style={{ borderTop: "1.5px solid var(--hairline)" }} />

        <DrawerItem to="/vendors" active={pathname.startsWith("/vendors")} onClose={onClose}>
          Vendors
        </DrawerItem>
        <DrawerItem to="/settings" active={pathname.startsWith("/settings")} onClose={onClose}>
          Settings
        </DrawerItem>

        <div className="mt-auto px-4 pb-5 pt-4 text-[11px] text-mute">SETLUP v1.0 · BBD</div>
      </aside>
    </>
  );
}

function DrawerItem({
  to,
  params,
  active,
  onClose,
  children,
}: {
  to: string;
  params?: Record<string, string>;
  active: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to={to as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      params={params as any}
      onClick={onClose}
      className="relative flex items-center gap-2.5 px-4 text-[15px] font-semibold"
      style={{
        minHeight: 48,
        color: active ? "var(--brand)" : "var(--ink)",
        backgroundColor: active ? "var(--brand-tint)" : "transparent",
      }}
    >
      {active && (
        <span aria-hidden className="absolute inset-y-0 left-0 w-[4px]" style={{ backgroundColor: "var(--brand)" }} />
      )}
      {children}
    </Link>
  );
}
