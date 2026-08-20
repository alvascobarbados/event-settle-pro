/**
 * Last-loaded snapshot cache (promoter + full data batch), keyed by user id.
 * Boot renders from this immediately, then revalidates silently in the background.
 * Cleared on sign-out; never returned for a different user id.
 */
import type { Db } from "./types";
import type { Promoter } from "./cloud";

const KEY = "setlup.snapshot.v1";

interface Snapshot {
  userId: string;
  promoter: Promoter;
  db: Db;
  at: number;
}

export function readSnapshot(userId: string): { promoter: Promoter; db: Db } | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw) as Snapshot;
    if (!snap || snap.userId !== userId || !snap.promoter?.id || !snap.db) return null;
    return { promoter: snap.promoter, db: snap.db };
  } catch {
    return null;
  }
}

export function writeSnapshot(userId: string, promoter: Promoter, db: Db) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ userId, promoter, db, at: Date.now() } satisfies Snapshot));
  } catch {
    /* quota or private mode — cache is best-effort */
  }
}

export function clearSnapshot() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
