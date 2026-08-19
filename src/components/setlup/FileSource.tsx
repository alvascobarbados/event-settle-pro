import { type ReactNode } from "react";

/**
 * The three ways a document gets into SETLUP.
 *
 * Both file inputs are real, mounted inputs wrapped in a <label>, so the tap
 * is the browser's own gesture on the input — no programmatic .click(), which
 * iOS Safari silently ignores outside a trusted gesture.
 */

function SourceRow({
  label,
  sub,
  children,
  onClick,
  disabled,
}: {
  label: string;
  sub: string;
  children?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const inner = (
    <>
      <span>
        <span className="block text-[14.5px] font-bold text-ink">{label}</span>
        <span className="block text-[12px] text-mute">{sub}</span>
      </span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden style={{ color: "var(--mute)" }}>
        <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </>
  );
  const cls =
    "flex w-full cursor-pointer items-center justify-between rounded-[12px] bg-app px-4 py-3.5 text-left active:opacity-70";
  if (children) {
    return (
      <label className={cls}>
        {inner}
        {children}
      </label>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${cls} disabled:opacity-60`}>
      {inner}
    </button>
  );
}

const hiddenInput = "absolute h-0 w-0 opacity-0";

export function FileSource({
  onFiles,
  multiple = true,
  note,
}: {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  note?: string;
}) {

  const take = (list: FileList | null, el: HTMLInputElement) => {
    const files = list ? Array.from(list) : [];
    el.value = "";
    if (files.length) onFiles(files);
  };

  return (
    <div className="space-y-2">
      <SourceRow label="Take photo" sub="Camera opens straight away">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className={hiddenInput}
          onChange={(e) => take(e.target.files, e.target)}
        />
      </SourceRow>

      <SourceRow label="Choose file" sub="Photos, or Files — including Google Drive">
        <input
          type="file"
          accept="application/pdf,image/*"
          multiple={multiple}
          className={hiddenInput}
          onChange={(e) => take(e.target.files, e.target)}
        />
      </SourceRow>

      {note && <p className="pt-1 text-[12px] text-mute">{note}</p>}
    </div>
  );
}
