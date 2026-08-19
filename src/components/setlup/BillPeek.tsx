import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/setlup/format";
import { useSetlup } from "@/lib/setlup/store";
import type { FileRecord } from "@/lib/setlup/types";

export interface PeekTarget {
  label: string;
  detail?: string;
  amount: number;
  vat?: number;
  file: FileRecord;
}

export function BillPeek({ target, onClose }: { target: PeekTarget | null; onClose: () => void }) {
  const { showToast } = useSetlup();
  const [url, setUrl] = useState<string | null>(null);
  const open = !!target;
  const path = target?.file.storagePath;
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    setUrl(null);
    if (!path) return;
    let active = true;
    void supabase.storage
      .from("setlup-files")
      .createSignedUrl(path, 60 * 10)
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) {
          showToast("Could not open file");
          return;
        }
        setUrl(data.signedUrl);
      });
    return () => {
      active = false;
    };
  }, [path, showToast]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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
      <div
        role="dialog"
        aria-label="Bill"
        aria-hidden={!open}
        onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          const start = touchX.current;
          const end = e.changedTouches[0]?.clientX ?? null;
          touchX.current = null;
          if (start !== null && end !== null && end - start > 60) onClose();
        }}
        className="absolute bottom-0 right-0 z-[70] flex w-[86%] flex-col overflow-hidden rounded-l-[20px] bg-card shadow-[-14px_0_40px_rgba(34,26,32,0.22)] transition-transform duration-200 ease-out"
        style={{ top: 56, transform: open ? "translateX(0)" : "translateX(103%)" }}
      >
        <div className="flex items-start justify-between gap-2 px-4 pb-3 pt-4">
          <div className="min-w-0">
            <div className="text-[14.5px] font-extrabold leading-snug text-ink">{target?.label}</div>
            {target?.detail && <div className="mt-0.5 text-[11.5px] text-mute">{target.detail}</div>}
            <div className="num mt-2 text-[13px] font-bold text-ink">
              {target ? money(target.amount) : ""}
              {target?.vat !== undefined && (
                <span className="ml-2 text-[11.5px] font-semibold text-vat">
                  VAT {target.vat === 0 ? "—" : money(target.vat)}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center text-mute"
          >
            <svg width="15" height="15" viewBox="0 0 18 18" aria-hidden>
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-app px-3 pb-4 pt-3">
          {!target?.file.storagePath ? (
            <div className="px-1 text-[12.5px] text-mute">No PDF attached</div>
          ) : !url ? (
            <div className="px-1 text-[12.5px] text-mute">Loading document…</div>
          ) : target.file.type === "IMG" ? (
            <img src={url} alt={target.file.name} className="w-full rounded-[12px]" />
          ) : (
            <>
              <iframe
                src={url}
                title={target.file.name}
                className="h-[62vh] w-full rounded-[12px] bg-card"
              />
              <a
                href={url}
                target="_blank"
                rel="noopener"
                className="mt-3 block rounded-full py-3 text-center text-[12.5px] font-extrabold uppercase tracking-[0.07em] text-white"
                style={{ backgroundColor: "var(--accent-c)" }}
              >
                Open full
              </a>
            </>
          )}
        </div>
      </div>
    </>
  );
}
