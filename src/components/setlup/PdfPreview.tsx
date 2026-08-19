import { useEffect, useRef, useState } from "react";

/* Cached loaded documents, keyed by signed-url path, so re-opening the peek
   panel for the same file does not refetch or re-parse the PDF. */
const docCache = new Map<string, unknown>();

interface PdfDocLike {
  numPages: number;
  getPage: (n: number) => Promise<PdfPageLike>;
}
interface PdfPageLike {
  getViewport: (o: { scale: number }) => { width: number; height: number };
  render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> };
}

async function loadPdfjs() {
  const [lib, worker] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  lib.GlobalWorkerOptions.workerSrc = worker.default;
  return lib;
}

function PdfPage({
  doc,
  pageNumber,
  width,
  eager,
}: {
  doc: PdfDocLike;
  pageNumber: number;
  width: number;
  eager: boolean;
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(eager);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (eager || visible) return;
    const el = holderRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [eager, visible]);

  useEffect(() => {
    if (!visible || done || !width) return;
    let active = true;
    void (async () => {
      const page = await doc.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const scale = width / base.width;
      const viewport = page.getViewport({ scale: scale * dpr });
      const canvas = canvasRef.current;
      if (!active || !canvas) return;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      await page.render({ canvasContext: ctx, viewport }).promise;
      if (active) setDone(true);
    })();
    return () => {
      active = false;
    };
  }, [visible, done, width, doc, pageNumber]);

  return (
    <div ref={holderRef} className="mb-3 overflow-hidden rounded-[12px] bg-card">
      <canvas ref={canvasRef} className="block w-full" style={{ minHeight: done ? undefined : 220 }} />
    </div>
  );
}

export function PdfPreview({ url, cacheKey }: { url: string; cacheKey: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [doc, setDoc] = useState<PdfDocLike | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const set = () => setWidth(el.clientWidth);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let active = true;
    setDoc(null);
    setFailed(false);
    void (async () => {
      try {
        const cached = docCache.get(cacheKey) as PdfDocLike | undefined;
        if (cached) {
          if (active) setDoc(cached);
          return;
        }
        const lib = await loadPdfjs();
        const res = await fetch(url);
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.arrayBuffer();
        const loaded = (await lib.getDocument({ data }).promise) as unknown as PdfDocLike;
        docCache.set(cacheKey, loaded);
        if (active) setDoc(loaded);
      } catch {
        if (active) setFailed(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [url, cacheKey]);

  if (failed) {
    return (
      <div className="px-1 pb-1 text-[12.5px] text-mute">
        This document can’t be previewed here. Use “Open full” below.
      </div>
    );
  }

  return (
    <div ref={wrapRef}>
      {!doc ? (
        <div className="animate-pulse space-y-2">
          <div className="h-[46vh] w-full rounded-[12px] bg-card" />
          <div className="h-3 w-1/3 rounded-full bg-card" />
        </div>
      ) : (
        <>
          {doc.numPages > 1 && (
            <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-mute">
              1 / {doc.numPages}
            </div>
          )}
          {Array.from({ length: doc.numPages }, (_, i) => (
            <PdfPage key={i} doc={doc} pageNumber={i + 1} width={width} eager={i === 0} />
          ))}
        </>
      )}
    </div>
  );
}
