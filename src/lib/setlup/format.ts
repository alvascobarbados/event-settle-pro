export function money(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "0.00";
  let v = Math.round(n * 100) / 100;
  if (Object.is(v, -0)) v = 0;
  const s = Math.abs(v).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return v < 0 ? `\u2212${s}` : s;
}

export function signedMoney(n: number): string {
  const v = Math.round(n * 100) / 100;
  const s = money(Math.abs(v));
  if (v > 0) return `+${s}`;
  if (v < 0) return `\u2212${s}`;
  return s;
}

export function pct(part: number, whole: number): string {
  if (!whole) return "0.0%";
  return `${((part / whole) * 100).toFixed(1)}%`;
}

export function perHead(value: number, headcount?: number): string {
  if (!headcount) return "";
  return `${money(value / headcount)}/head`;
}

export function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(`${fromIso}T00:00:00`).getTime();
  const b = new Date(`${toIso}T00:00:00`).getTime();
  return Math.round((b - a) / 86400000);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 100001 → "10 00 01" — display only; storage stays a plain number. */
export function fmtEventNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "";
  const s = String(n);
  return (s.length % 2 === 1 ? "0" + s : s).replace(/(\d\d)(?=\d)/g, "$1 ");
}
