import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  createEventRow,
  ensurePromoter,
  fileToRow,
  ledgerToRow,
  loadDb,
  migrateStoragePaths,
  seedForPromoter,
  storagePrefix,
  type Promoter,
} from "./cloud";
import { importUv2024Bills, type ImportResult } from "./import-bills";
import {
  BRAND_ACCENT,
  type Db,
  type EventRecord,
  type FileRecord,
  type Line,
  type Section,
  type Settings,
} from "./types";
import { todayIso } from "./format";

let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

const EMPTY_DB: Db = {
  settings: { currency: "BBD", vatRate: 17.5, business: "" },
  events: [],
  lines: [],
  moneyIn: [],
  bills: [],
  files: [],
};

interface NewRecordInput {
  eventId: string;
  counterparty: string;
  description: string;
  amount: number;
  dueDate: string;
  lineId?: string;
  vatExempt?: boolean;
}

interface StoreValue {
  db: Db;
  toast: string | null;
  showToast: (msg: string) => void;
  getEvent: (id: string) => EventRecord | undefined;
  addPayment: (kind: "in" | "out", recordId: string, amount: number, date: string) => void;
  addMoneyIn: (input: NewRecordInput) => void;
  addBill: (input: NewRecordInput) => void;
  addBudgetLine: (eventId: string, section: Section, name: string, amount: number, vatExempt: boolean) => void;
  addFile: (file: Omit<FileRecord, "id">) => void;
  setStage: (eventId: string, stage: EventRecord["stage"]) => void;
  markVatExported: (eventId: string) => void;
  closeEvent: (eventId: string) => void;
  reopenEvent: (eventId: string) => void;
  addEvent: (input: { name: string; date: string; venue: string; capacity?: number }) => string;
  updateSettings: (patch: Partial<Settings>) => void;
  /* auth surface — additive, existing consumers unaffected */
  userId: string | null;
  userEmail: string | null;
  authReady: boolean;
  loading: boolean;
  promoterId: string | null;
  promoterName: string | null;
  promoterCode: string | null;
  promoterUsername: string | null;
  setUsername: (username: string) => Promise<boolean>;
  resetToSeed: () => Promise<void>;

  importUv2024: (onProgress?: (done: number, total: number) => void) => Promise<ImportResult>;
  setFileStoragePath: (fileId: string, storagePath: string, type?: FileRecord["type"]) => void;
  signOut: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function SetlupProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Db>(EMPTY_DB);
  const [toast, setToast] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [promoter, setPromoter] = useState<Promoter | null>(null);
  const [authReady, setAuthReady] = useState(false);
  /* true until we know there is no session, or until the signed-in user's data has loaded */
  const [loading, setLoading] = useState(true);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2200);
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUserId(data.session?.user.id ?? null);
      setUserEmail(data.session?.user.email ?? null);
      setLoading(!!data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setUserId(session?.user.id ?? null);
      setUserEmail(session?.user.email ?? null);
      setLoading(!!session);
      setAuthReady(true);
      if (!session) {
        setDb(EMPTY_DB);
        setPromoter(null);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const p = await ensurePromoter();
        if (active) setPromoter(p);
        const next = await loadDb(p);
        /* one-time relocation of legacy per-user upload paths */
        const moved = await migrateStoragePaths(p, userId, next);
        if (active) setDb(moved ? await loadDb(p) : next);

      } catch (e) {
        console.error(e);
        showToast("Could not load your data");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId, showToast]);

  const value = useMemo<StoreValue>(() => {
    const fail = (e: unknown) => {
      console.error(e);
      showToast("Save failed — check your connection");
    };
    const uidOrThrow = () => {
      if (!userId) throw new Error("No signed-in user");
      return userId;
    };
    const promoterOrThrow = (): Promoter => {
      if (!promoter) throw new Error("No promoter for this account");
      return promoter;
    };

    const patchEvent = (eventId: string, patch: Partial<EventRecord>, row: Record<string, unknown>) => {
      setDb((d) => ({
        ...d,
        events: d.events.map((e) => (e.id === eventId ? { ...e, ...patch } : e)),
      }));
      void supabase
        .from("events")
        .update(row as never)
        .eq("id", eventId)
        .then(({ error }) => error && fail(error));
    };

    return {
      db,
      toast,
      showToast,
      userId,
      userEmail,
      authReady,
      loading,
      promoterId: promoter?.id ?? null,
      promoterName: promoter?.name ?? null,
      promoterCode: promoter?.code ?? null,
      promoterUsername: promoter?.username ?? null,
      setUsername: async (username) => {
        const p = promoterOrThrow();
        const value = username.trim().replace(/^@/, "").toLowerCase();
        const { error } = await supabase
          .from("promoters")
          .update({ username: value || null } as never)
          .eq("id", p.id);
        if (error) {
          showToast(/duplicate|unique/i.test(error.message) ? "That username is taken" : "Could not save username");
          return false;
        }
        setPromoter({ ...p, username: value || undefined });
        showToast("Username saved");
        return true;
      },

      setFileStoragePath: (fileId, storagePath, type) => {
        setDb((d) => ({
          ...d,
          files: d.files.map((f) =>
            f.id === fileId ? { ...f, storagePath, type: type ?? f.type } : f,
          ),
        }));
        void supabase
          .from("files")
          .update({ storage_path: storagePath, ...(type ? { type } : {}) } as never)
          .eq("id", fileId)
          .then(({ error }) => error && fail(error));
      },
      resetToSeed: async () => {
        const uid2 = uidOrThrow();
        const p = promoterOrThrow();
        setLoading(true);
        try {
          for (const root of [p.id, uid2]) {
            const list = await supabase.storage.from("setlup-files").list(root, { limit: 1000 });
            const paths: string[] = [];
            for (const entry of list.data ?? []) {
              if (entry.id) {
                paths.push(`${root}/${entry.name}`);
                continue;
              }
              const sub = await supabase.storage
                .from("setlup-files")
                .list(`${root}/${entry.name}`, { limit: 1000 });
              for (const f of sub.data ?? []) paths.push(`${root}/${entry.name}/${f.name}`);
            }
            if (paths.length > 0) await supabase.storage.from("setlup-files").remove(paths);
          }

          const eventIds = db.events.map((e) => e.id);
          if (eventIds.length > 0) {
            for (const table of ["payments", "money_in", "bills", "files", "lines"] as const) {
              const { error } = await supabase.from(table).delete().in("event_id", eventIds);
              if (error) throw error;
            }
            const { error } = await supabase.from("events").delete().in("id", eventIds);
            if (error) throw error;
          }
          const next = await seedForPromoter(p, uid2);
          setDb(next);
          showToast("Data reset to seed");
        } catch (e) {
          console.error(e);
          showToast("Reset failed");
        } finally {
          setLoading(false);
        }
      },
      importUv2024: async (onProgress) => {
        const uid2 = uidOrThrow();
        const p = promoterOrThrow();
        const result = await importUv2024Bills(p.id, uid2, db, onProgress);
        const next = await loadDb(p);
        setDb(next);
        return result;
      },
      signOut: async () => {
        await supabase.auth.signOut();
        setDb(EMPTY_DB);
        setPromoter(null);
      },
      getEvent: (id) => db.events.find((e) => e.id === id),
      addPayment: (kind, recordId, amount, date) => {
        const id = uid("p");
        const key = kind === "in" ? "moneyIn" : "bills";
        setDb((d) => ({
          ...d,
          [key]: d[key].map((r) =>
            r.id === recordId ? { ...r, payments: [...r.payments, { id, amount, date }] } : r,
          ),
        }) as Db);
        void supabase
          .from("payments")
          .insert({
            id,
            event_id:
              (kind === "in" ? db.moneyIn : db.bills).find((r) => r.id === recordId)?.eventId ?? null,
            parent_kind: kind,
            parent_id: recordId,
            amount,
            date,
          } as never)
          .then(({ error }) => error && fail(error));
      },
      addMoneyIn: (input) => {
        const rec = { ...input, id: uid("mi"), payments: [], countInActual: true };
        setDb((d) => ({ ...d, moneyIn: [...d.moneyIn, rec] }));
        void supabase
          .from("money_in")
          .insert(ledgerToRow(rec) as never)
          .then(({ error }) => error && fail(error));
      },
      addBill: (input) => {
        const rec = { ...input, id: uid("b"), payments: [], countInActual: true };
        setDb((d) => ({ ...d, bills: [...d.bills, rec] }));
        void supabase
          .from("bills")
          .insert(ledgerToRow(rec) as never)
          .then(({ error }) => error && fail(error));
      },
      addBudgetLine: (eventId, section, name, amount, vatExempt) => {
        const siblings = db.lines.filter((l) => l.eventId === eventId && l.section === section && !l.parentId);
        const line: Line = {
          id: uid("l"),
          eventId,
          section,
          name,
          sortOrder: siblings.length + 1,
          budgetAmount: amount,
          actualAmount: 0,
          vatExempt,
        };
        setDb((d) => ({ ...d, lines: [...d.lines, line] }));
        void supabase
          .from("lines")
          .insert({
            id: line.id,
            event_id: eventId,
            section,
            name,
            sort_order: line.sortOrder,
            budget_amount: amount,
            actual_amount: 0,
            vat_exempt: vatExempt,
          } as never)
          .then(({ error }) => error && fail(error));
      },
      addFile: (file) => {
        const rec: FileRecord = { ...file, id: uid("f") };
        setDb((d) => ({ ...d, files: [...d.files, rec] }));
        void supabase
          .from("files")
          .insert(fileToRow(rec) as never)
          .then(({ error }) => error && fail(error));
      },
      setStage: (eventId, stage) => patchEvent(eventId, { stage }, { stage }),
      markVatExported: (eventId) => patchEvent(eventId, { vatExported: true }, { vat_exported: true }),
      closeEvent: (eventId) => {
        const lockedAt = todayIso();
        patchEvent(eventId, { stage: "closed", lockedAt }, { stage: "closed", locked_at: lockedAt });
      },
      reopenEvent: (eventId) =>
        patchEvent(eventId, { stage: "reconciling", lockedAt: undefined }, { stage: "reconciling", locked_at: null }),
      addEvent: (input) => {
        const id = uid("e");
        const event: EventRecord = {
          id,
          name: input.name,
          date: input.date,
          venue: input.venue,
          capacity: input.capacity,
          stage: "planning",
          accent: BRAND_ACCENT,
          asOf: todayIso(),
          planningRows: [
            { name: "Budget drafted", meta: "Not started", state: "open" },
            { name: "Vendors committed", meta: "0 booked", state: "open" },
            { name: "Sponsorship confirmed", meta: "0.00", state: "open" },
          ],
        };
        setDb((d) => ({ ...d, events: [event, ...d.events] }));
        void createEventRow(promoterOrThrow().id, event)
          .then((eventNumber) => {
            if (eventNumber === undefined) return;
            setDb((d) => ({
              ...d,
              events: d.events.map((e) => (e.id === id ? { ...e, eventNumber } : e)),
            }));
          })
          .catch(fail);
        return id;
      },
      updateSettings: (patch) => {
        const next = { ...db.settings, ...patch };
        setDb((d) => ({ ...d, settings: next }));
        const p = promoterOrThrow();
        setPromoter({ ...p, name: next.business, currency: next.currency, vatRate: next.vatRate });
        void supabase
          .from("promoters")
          .update({
            name: next.business,
            currency: next.currency,
            vat_rate: next.vatRate,
          } as never)
          .eq("id", p.id)
          .then(({ error }) => error && fail(error));
      },
    };
  }, [db, toast, showToast, userId, userEmail, authReady, loading, promoter]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useSetlup(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useSetlup must be used inside SetlupProvider");
  return ctx;
}
