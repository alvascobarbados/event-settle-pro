import { supabase } from "@/integrations/supabase/client";
import type { Db, FileRecord } from "./types";

export interface ManifestRow {
  file: string;
  vendor: string;
  inv: string;
  amount: number;
  line_id: string;
  status: "matched" | "extra";
  note: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  updated: number;
}

const MANIFEST_URL = "/seed-bills/manifest.json";

/** Per-user id suffix used by cloud.ts seeding. */
export const nsSuffix = (userId: string) => userId.slice(0, 8);

export const uv2024EventId = (userId: string) => `e24-${nsSuffix(userId)}`;

export async function loadManifest(): Promise<ManifestRow[] | null> {
  try {
    const res = await fetch(MANIFEST_URL, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as ManifestRow[];
    return Array.isArray(json) ? json : null;
  } catch {
    return null;
  }
}

function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

function typeFor(name: string): FileRecord["type"] {
  return extOf(name) === "pdf" ? "PDF" : "IMG";
}

function contentTypeFor(name: string): string {
  switch (extOf(name)) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    default:
      return "image/jpeg";
  }
}

/* Static hosting cannot serve "&", "+" or "," in a path, so the shipped
   documents use sanitised filenames; records keep the vendor's filename. */
export function safeName(file: string): string {
  return file
    .replace(/&/g, "and")
    .replace(/\+/g, "plus")
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const stripExt = (name: string) => name.replace(/\.[^.]+$/, "");

let seq = 0;
const newId = () => `imp-${Date.now().toString(36)}-${(seq++).toString(36)}`;

/** The three seeded UV 2024 file rows that carry no document yet. */
const SEEDED_ROWS: { vendor: string; inv: string; nameKey: string }[] = [
  { vendor: "Makin", inv: "1645", nameKey: "Makin" },
  { vendor: "Priv4lege", inv: "202462", nameKey: "Priv4lege" },
  { vendor: "Hanschell", inv: "90792691", nameKey: "Hanschell" },
];

/**
 * One-time import of the UV 2024 bill documents shipped in public/seed-bills.
 * Uploads each document to the private bucket and attaches it to the matching
 * P&L line. Never writes amounts on lines and never touches P&L figures.
 */
export async function importUv2024Bills(
  promoterId: string,
  userId: string,
  db: Db,
  onProgress?: (done: number, total: number) => void,
): Promise<ImportResult> {
  const manifest = await loadManifest();
  if (!manifest) return { imported: 0, skipped: 0, updated: 0 };

  const suffix = nsSuffix(userId);
  const eventId = uv2024EventId(userId);
  const existing = db.files.filter((f) => f.eventId === eventId);
  const takenPaths = new Set(existing.map((f) => f.storagePath).filter(Boolean) as string[]);
  const lineIds = new Set(db.lines.map((l) => l.id));

  let imported = 0;
  let skipped = 0;
  let updated = 0;

  for (let i = 0; i < manifest.length; i++) {
    const row = manifest[i]!;
    const diskFile = safeName(row.file);
    const storagePath = `${promoterId}/${eventId}/${diskFile}`;
    if (takenPaths.has(storagePath)) {
      skipped++;
      onProgress?.(i + 1, manifest.length);
      continue;
    }

    let res = await fetch(`/seed-bills/${encodeURIComponent(diskFile)}`, { cache: "no-store" });
    if (!res.ok && diskFile !== row.file) {
      res = await fetch(`/seed-bills/${encodeURIComponent(row.file)}`, { cache: "no-store" });
    }
    if (!res.ok) {
      skipped++;
      onProgress?.(i + 1, manifest.length);
      continue;
    }
    const blob = await res.blob();
    const up = await supabase.storage
      .from("setlup-files")
      .upload(storagePath, blob, { contentType: contentTypeFor(row.file), upsert: true });
    if (up.error) {
      skipped++;
      onProgress?.(i + 1, manifest.length);
      continue;
    }

    /* Only the three seeded placeholder rows may absorb a document; matched by
       vendor keyword AND invoice number so no other bill can claim them. */
    const seeded = SEEDED_ROWS.find(
      (s) => s.inv === row.inv.trim() && row.vendor.toLowerCase().startsWith(s.vendor.toLowerCase()),
    );
    const match = seeded
      ? existing.find((f) => !f.storagePath && f.name.includes(seeded.inv) && f.name.includes(seeded.nameKey))
      : undefined;

    if (match) {
      const { error } = await supabase
        .from("files")
        .update({ storage_path: storagePath, type: typeFor(row.file) } as never)
        .eq("id", match.id);
      if (error) {
        skipped++;
      } else {
        match.storagePath = storagePath;
        takenPaths.add(storagePath);
        updated++;
      }
      onProgress?.(i + 1, manifest.length);
      continue;
    }

    const nsLine = row.line_id ? `${row.line_id}-${suffix}` : "";
    const { error } = await supabase.from("files").insert({
      id: newId(),
      event_id: eventId,
      name: stripExt(row.file),
      type: typeFor(row.file),
      date: db.events.find((e) => e.id === eventId)?.date ?? "2024-08-11",
      line_id: nsLine && lineIds.has(nsLine) ? nsLine : null,
      amount: row.amount,
      storage_path: storagePath,
    } as never);
    if (error) skipped++;
    else {
      imported++;
      takenPaths.add(storagePath);
    }
    onProgress?.(i + 1, manifest.length);
  }

  return { imported, skipped, updated };
}
