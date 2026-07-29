// BBD money formatting: 2dp, comma thousands, negatives in parentheses.
export function fmt(n: number | null | undefined, opts: { blank?: boolean; dash?: boolean } = {}): string {
  if (n === null || n === undefined) return opts.dash ? "—" : opts.blank ? "" : "";
  if (Object.is(n, -0)) n = 0;
  const rounded = Math.round(n * 100) / 100;
  const abs = Math.abs(rounded);
  const s = abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return rounded < 0 ? `(${s})` : s;
}

export function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function fmtHead(value: number, headcount: number): string {
  if (!headcount) return "";
  return `${fmt(value / headcount)}/head`;
}

export function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
