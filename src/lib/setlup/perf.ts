/**
 * Load-phase instrumentation. Four phases are timed on every load:
 * auth session → ensure_promoter → data batch (loadDb) → first meaningful render.
 * Results are console.table'd in dev and kept (last five) in localStorage so the
 * Settings diagnostics line can show a trend.
 */

export type Phase = "auth" | "promoter" | "data" | "render";

export interface LoadSample {
  at: number;
  auth: number;
  promoter: number;
  data: number;
  render: number;
  total: number;
  kind: "cold" | "warm";
}

const KEY = "setlup.perf.loads";
const MAX = 5;
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

let origin = now();
const marks: Partial<Record<Phase, number>> = {};
let done = false;

/** A reload, or any second load inside the same tab, is warm. */
function kindOf(): "cold" | "warm" {
  if (typeof performance === "undefined") return "cold";
  try {
    if (sessionStorage.getItem("setlup.perf.seen")) return "warm";
    sessionStorage.setItem("setlup.perf.seen", "1");
  } catch {
    /* private mode — fall through */
  }
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return nav?.type === "reload" ? "warm" : "cold";
}

export function perfReset() {
  origin = now();
  done = false;
  for (const k of Object.keys(marks) as Phase[]) delete marks[k];
}

/** Records the elapsed duration of a phase. */
export function perfMark(phase: Phase, ms: number) {
  if (done) return;
  marks[phase] = Math.round(ms);
  if (typeof performance !== "undefined") {
    try {
      performance.mark(`setlup:${phase}`);
    } catch {
      /* ignore */
    }
  }
}

/** Times an async phase and returns its result. */
export async function perfPhase<T>(phase: Phase, fn: () => Promise<T>): Promise<T> {
  const t = now();
  try {
    return await fn();
  } finally {
    perfMark(phase, now() - t);
  }
}

export function loadSamples(): LoadSample[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as LoadSample[]) : [];
    return Array.isArray(list) ? list.slice(-MAX) : [];
  } catch {
    return [];
  }
}

/** Called once the first data-backed screen has painted. */
export function perfCommit() {
  if (done) return;
  done = true;
  const total = Math.round(now() - origin);
  const sample: LoadSample = {
    at: Date.now(),
    auth: marks.auth ?? 0,
    promoter: marks.promoter ?? 0,
    data: marks.data ?? 0,
    render: marks.render ?? Math.max(0, total - (marks.auth ?? 0) - (marks.promoter ?? 0) - (marks.data ?? 0)),
    total,
    kind: kindOf(),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify([...loadSamples(), sample].slice(-MAX)));
  } catch {
    /* ignore */
  }
  if (import.meta.env.DEV && typeof console.table === "function") {
    console.table([
      { phase: "auth session", ms: sample.auth },
      { phase: "ensure_promoter", ms: sample.promoter },
      { phase: "data batch", ms: sample.data },
      { phase: "first render", ms: sample.render },
      { phase: `total (${sample.kind})`, ms: sample.total },
    ]);
  }
  return sample;
}

/** Marks first meaningful render on the next frame, then commits the sample. */
export function perfCommitOnPaint() {
  if (done || typeof requestAnimationFrame === "undefined") {
    perfCommit();
    return;
  }
  const t = now();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      perfMark("render", now() - t);
      perfCommit();
    });
  });
}

export function formatSample(s: LoadSample): string {
  return `Load: auth ${s.auth}ms · promoter ${s.promoter}ms · data ${s.data}ms · render ${s.render}ms · total ${s.total}ms (${s.kind})`;
}
