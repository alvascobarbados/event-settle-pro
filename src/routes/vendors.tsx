import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { EVENTS, VENDOR_DEFAULTS, COST_LABELS, SUB_LABELS } from "@/lib/setl-data";
import { fmt, fmtDate } from "@/lib/setl-format";
import { AppShell } from "@/components/setl/AppShell";


export const Route = createFileRoute("/vendors")({
  head: () => ({
    meta: [
      { title: "Vendors — SETLUP" },
      { name: "description", content: "Vendor book: defaults, flags, and bills across events." },
      { property: "og:title", content: "Vendors — SETLUP" },
      { property: "og:description", content: "Every vendor with its defaults and bill history." },
    ],
  }),
  component: VendorsPage,
});

function VendorsPage() {
  // Union: vendors from defaults + any vendor referenced in a bill.
  const vendors = useMemo(() => {
    const map = new Map<string, { name: string; category: string | null; sub: string | null; vat: "vat" | "no_vat"; flags: string[] }>();
    for (const v of VENDOR_DEFAULTS) map.set(v.name, v);
    for (const e of EVENTS) for (const b of e.bills) {
      if (!map.has(b.vendor)) {
        const line = b.lines[0];
        map.set(b.vendor, {
          name: b.vendor,
          category: line?.category ?? null,
          sub: line?.sub ?? null,
          vat: (line?.vat ?? null) !== null ? "vat" : "no_vat",
          flags: [],
        });
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const [selected, setSelected] = useState<string | null>(null);

  const bills = useMemo(() => {
    if (!selected) return [];
    const out: { event: string; billVendor: string; date: string | null; invoice: string | null; total: number; vat: number; status: string; kind: string }[] = [];
    for (const e of EVENTS) {
      for (const b of e.bills) {
        if (b.vendor !== selected) continue;
        const total = b.lines.reduce((s, l) => s + l.amount, 0);
        const vat = b.lines.reduce((s, l) => s + (l.vat ?? 0), 0);
        out.push({ event: e.name, billVendor: b.vendor, date: b.date, invoice: b.invoice, total, vat, status: b.status, kind: b.kind });
      }
    }
    return out.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  }, [selected]);

  return (
    <AppShell>
      <div className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-[680px] px-5 pt-6 pb-24">
          <h1 className="text-[28px] font-bold tracking-tight text-ink">Vendors</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Vendor book — defaults auto-apply on bill entry.
        </p>

        {!selected ? (
          <ul className="mt-6 border-y border-hairline">
            {vendors.map((v) => (
              <li key={v.name}>
                <button
                  onClick={() => setSelected(v.name)}
                  className="grid w-full grid-cols-[1fr_auto] items-baseline gap-4 border-b border-dashed border-hairline py-3 text-left hover:bg-panel"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-medium text-ink">{v.name}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {v.category ? COST_LABELS[v.category] ?? v.category : "—"}
                      {v.sub ? ` · ${SUB_LABELS[v.sub] ?? v.sub}` : ""}
                      {" · "}{v.vat === "vat" ? "VAT" : "No VAT"}
                      {v.flags.length ? ` · ${v.flags.join(", ")}` : ""}
                    </div>
                  </div>
                  <div className="text-[12px] text-muted-foreground">›</div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6">
            <button onClick={() => setSelected(null)}
              className="text-[12px] font-medium text-muted-foreground hover:text-ink">‹ All vendors</button>
            <h2 className="mt-3 text-[22px] font-bold tracking-tight text-ink">{selected}</h2>
            <p className="mt-1 text-[12px] text-muted-foreground">{bills.length} bill{bills.length === 1 ? "" : "s"} across events</p>
            <div className="mt-4 border-y border-hairline">
              {bills.map((b, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_auto] items-baseline gap-3 border-b border-dashed border-hairline py-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-ink">{b.event}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {b.date ? fmtDate(b.date) : "—"} · inv {b.invoice ?? "none"} · {b.kind}
                      {b.status === "unpaid" ? <span style={{ color: "var(--amber-fg)" }}> · unpaid</span> : ""}
                    </div>
                  </div>
                  <div className="num text-right text-[13px] font-semibold text-ink">{fmt(b.total)}</div>
                  <div className="num min-w-[64px] text-right text-[12px] text-muted-foreground">
                    {b.vat === 0 ? "—" : fmt(b.vat)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </AppShell>
  );
}

