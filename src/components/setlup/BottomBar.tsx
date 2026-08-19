import { Link, useRouterState } from "@tanstack/react-router";

type Tab = "home" | "finance" | "files" | "reports";

const ICONS: Record<Tab, string> = {
  home: "M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5",
  finance: "M4 19V5m0 14h16M8 15V9m4 6V7m4 8v-4",
  files: "M5 4h8l4 4v12H5zM13 4v4h4",
  reports: "M4 20h16M7 20V10m5 10V5m5 15v-7",
};

const LABELS: Record<Tab, string> = { home: "Home", finance: "Finance", files: "Files", reports: "Reports" };

export function BottomBar({ eventId, onPlus }: { eventId: string; onPlus: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const base = `/event/${eventId}`;
  const current: Tab = pathname.endsWith("/finance")
    ? "finance"
    : pathname.endsWith("/files")
      ? "files"
      : pathname.endsWith("/reports")
        ? "reports"
        : "home";

  return (
    <nav
      className="relative z-30 shrink-0 backdrop-blur"
      style={{ backgroundColor: "rgba(255,255,255,0.96)", borderTop: "1.5px solid var(--hairline)" }}
    >
      <div className="grid grid-cols-5 items-end px-1 pb-1.5 pt-2">
        <TabItem tab="home" to={base} active={current === "home"} />
        <TabItem tab="finance" to={`${base}/finance`} active={current === "finance"} />
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onPlus}
            aria-label="Event actions"
            className="grid h-[52px] w-[52px] -translate-y-3 place-items-center rounded-full text-white shadow-[0_8px_20px_rgba(34,26,32,0.28)] transition-transform duration-150 active:scale-95"
            style={{ backgroundColor: "var(--accent-c)" }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <TabItem tab="files" to={`${base}/files`} active={current === "files"} />
        <TabItem tab="reports" to={`${base}/reports`} active={current === "reports"} />
      </div>
    </nav>
  );
}

function TabItem({ tab, to, active }: { tab: Tab; to: string; active: boolean }) {
  return (
    <Link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to={to as any}
      className="flex flex-col items-center gap-1 py-1"
      style={{ color: active ? "var(--accent-deep-c)" : "var(--mute)" }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d={ICONS[tab]} stroke="currentColor" strokeWidth={active ? 2.1 : 1.7} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-[9px] font-bold uppercase" style={{ letterSpacing: "0.08em" }}>
        {LABELS[tab]}
      </span>
    </Link>
  );
}
