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
  billToRow,
  createEventRow,
  ensurePromoter,
  fileToRow,
  ledgerToRow,
  lineToRow,
  loadDb,
  migrateStoragePaths,
  seedForPromoter,
  storagePrefix,
  type Promoter,
} from "./cloud";
import { importUv2024Bills, type ImportResult } from "./import-bills";
import {
  BRAND_ACCENT,
  type Bill,
  type Category,
  type Db,
  type EventRecord,
  type FileRecord,
  type Line,
  type Section,
  type Settings,
  type Vendor,
} from "./types";
import { todayIso } from "./format";

let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

const EMPTY_DB: Db = {
  settings: { currency: "BBD", vatRate: 17.5, business: "" },
  categories: [],
  vendors: [],
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

export interface RoutedBillInput {
  eventId: string;
  counterparty: string;
  description: string;
  ref?: string;
  amount: number;
  dueDate: string;
  vatExempt?: boolean;
  categoryId: string;
  subcategoryId?: string;
  /** Real VAT from the scanned document; stored verbatim on the line. */
  vatAmount?: number;
}

interface StoreValue {
  db: Db;
  toast: string | null;
  showToast: (msg: string) => void;
  getEvent: (id: string) => EventRecord | undefined;
  addPayment: (kind: "in" | "out", recordId: string, amount: number, date: string) => void;
  addMoneyIn: (input: NewRecordInput) => void;
  addBill: (input: NewRecordInput) => void;
  /* taxonomy */
  addCategory: (section: Section, name: string, parentId?: string) => Promise<void>;
  renameCategory: (id: string, name: string) => Promise<void>;
  setCategoryArchived: (id: string, archived: boolean) => Promise<void>;
  reorderCategories: (ids: string[]) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  /* routing */
  addRoutedBill: (input: RoutedBillInput) => Promise<{ billId: string; lineId: string } | null>;
  routeLine: (lineId: string, categoryId: string, subcategoryId?: string) => Promise<void>;
  /* vendor master */
  addVendor: (input: {
    name: string;
    categoryId?: string;
    subcategoryId?: string;
    vatRegistered?: boolean;
  }) => Promise<Vendor | null>;
  updateVendor: (
    id: string,
    patch: { categoryId?: string; subcategoryId?: string; vatRegistered?: boolean; alias?: string },
  ) => Promise<void>;
  linkFileToLine: (fileId: string, lineId: string, amount?: number) => Promise<void>;
  ensureRoutedLine: (eventId: string, categoryId: string, subcategoryId?: string, childName?: string) => Promise<string | null>;
  deleteBill: (billId: string) => Promise<void>;
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
  setLineVatExcluded: (lineId: string, excluded: boolean) => void;
  routeFile: (fileId: string, categoryId: string, subcategoryId?: string) => Promise<void>;
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


    const insertLine = async (input: {
      eventId: string;
      section: Section;
      name: string;
      parentId?: string;
      categoryId?: string;
      budgetAmount: number;
      detail?: string;
      ref?: string;
      vatExempt?: boolean;
      vatOverride?: number;
    }): Promise<Line | null> => {
      const siblings = db.lines.filter(
        (l) =>
          l.eventId === input.eventId &&
          l.section === input.section &&
          (l.parentId ?? null) === (input.parentId ?? null),
      );
      const line: Line = {
        id: uid("l"),
        eventId: input.eventId,
        section: input.section,
        name: input.name,
        sortOrder: siblings.length + 1,
        budgetAmount: input.budgetAmount,
        actualAmount: 0,
        parentId: input.parentId,
        categoryId: input.categoryId,
        detail: input.detail,
        ref: input.ref,
        vatExempt: input.vatExempt,
        vatOverride: input.vatOverride,
      };
      setDb((d) => ({ ...d, lines: [...d.lines, line] }));
      const { error } = await supabase.from("lines").insert(lineToRow(line) as never);
      if (error) {
        fail(error);
        return null;
      }
      return line;
    };

    /** find-or-create the event's parent P&L line for a category */
    const ensureParentLine = async (eventId: string, categoryId: string): Promise<Line | null> => {
      const cat = db.categories.find((c) => c.id === categoryId);
      if (!cat) return null;
      const root = cat.parentId ? db.categories.find((c) => c.id === cat.parentId) ?? cat : cat;
      const existing = db.lines.find(
        (l) =>
          l.eventId === eventId &&
          l.section === root.section &&
          !l.parentId &&
          (l.categoryId === root.id || l.name === root.name),
      );
      if (existing) return existing;
      return insertLine({
        eventId,
        section: root.section,
        name: root.name,
        categoryId: root.id,
        budgetAmount: 0,
      });
    };

    const ensureRoutedLineFn = async (
      eventId: string,
      categoryId: string,
      subcategoryId?: string,
      childName?: string,
    ): Promise<string | null> => {
        const parent = await ensureParentLine(eventId, categoryId);
        if (!parent) return null;
        if (!childName) return parent.id;
        const nodeId = subcategoryId ?? categoryId;
        const existing = db.lines.find(
          (l) => l.parentId === parent.id && l.name === childName && l.categoryId === nodeId,
        );
        if (existing) return existing.id;
        const child = await insertLine({
          eventId,
          section: parent.section,
          name: childName,
          parentId: parent.id,
          categoryId: nodeId,
          budgetAmount: 0,
        });
        return child?.id ?? null;
    };

    const routeLineFn = async (lineId: string, categoryId: string, subcategoryId?: string): Promise<void> => {
        const line = db.lines.find((l) => l.id === lineId);
        const cat = db.categories.find((c) => c.id === categoryId);
        if (!line || !cat) return;
        const nodeId = subcategoryId ?? cat.id;
        if (!line.parentId) {
          setDb((d) => ({ ...d, lines: d.lines.map((l) => (l.id === lineId ? { ...l, categoryId: nodeId } : l)) }));
          const { error } = await supabase.from("lines").update({ category_id: nodeId } as never).eq("id", lineId);
          if (error) fail(error);
          return;
        }
        const parent = await ensureParentLine(line.eventId, cat.id);
        if (!parent) return;
        setDb((d) => ({
          ...d,
          lines: d.lines.map((l) => (l.id === lineId ? { ...l, parentId: parent.id, categoryId: nodeId } : l)),
          bills: d.bills.map((b) => (b.lineId === lineId ? { ...b, categoryId: nodeId } : b)),
        }));
        const { error } = await supabase
          .from("lines")
          .update({ parent_id: parent.id, category_id: nodeId } as never)
          .eq("id", lineId);
        if (error) fail(error);
        const billIds = db.bills.filter((b) => b.lineId === lineId).map((b) => b.id);
        if (billIds.length > 0) {
          const r = await supabase.from("bills").update({ category_id: nodeId } as never).in("id", billIds);
          if (r.error) fail(r.error);
        }
        showToast("Re-routed");
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

      setLineVatExcluded: (lineId, excluded) => {
        setDb((d) => ({
          ...d,
          lines: d.lines.map((l) => (l.id === lineId ? { ...l, vatExcluded: excluded } : l)),
        }));
        void supabase
          .from("lines")
          .update({ vat_excluded: excluded } as never)
          .eq("id", lineId)
          .then(({ error }) => error && fail(error));
      },

      routeFile: async (fileId, categoryId, subcategoryId) => {
        const file = db.files.find((f) => f.id === fileId);
        if (!file) return;
        const linked = file.lineId ? db.lines.find((l) => l.id === file.lineId) : undefined;
        if (linked?.parentId) {
          await routeLineFn(linked.id, categoryId, subcategoryId);
          return;
        }
        const lineId = await ensureRoutedLineFn(
          file.eventId,
          categoryId,
          subcategoryId,
          subcategoryId ? file.name : undefined,
        );
        if (!lineId) return;
        setDb((d) => ({ ...d, files: d.files.map((f) => (f.id === fileId ? { ...f, lineId } : f)) }));
        const { error } = await supabase.from("files").update({ line_id: lineId } as never).eq("id", fileId);
        if (error) return fail(error);
        showToast("Re-routed");
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
      /* ---------------- taxonomy ---------------- */
      addCategory: async (section, name, parentId) => {
        const p = promoterOrThrow();
        const value = name.trim();
        if (!value) return;
        const siblings = db.categories.filter(
          (c) => c.section === section && (c.parentId ?? null) === (parentId ?? null),
        );
        const row = {
          promoter_id: p.id,
          parent_id: parentId ?? null,
          section,
          name: value,
          sort_order: siblings.length + 1,
          archived: false,
        };
        const { data, error } = await supabase.from("categories").insert(row as never).select("*").single();
        if (error || !data) return fail(error);
        const rec = data as Record<string, unknown>;
        const cat: Category = {
          id: String(rec["id"]),
          promoterId: p.id,
          parentId: parentId,
          section,
          name: value,
          sortOrder: siblings.length + 1,
          archived: false,
        };
        setDb((d) => ({ ...d, categories: [...d.categories, cat] }));
      },
      renameCategory: async (id, name) => {
        const value = name.trim();
        if (!value) return;
        setDb((d) => ({
          ...d,
          categories: d.categories.map((c) => (c.id === id ? { ...c, name: value } : c)),
          /* parent P&L lines carrying this category keep their label in step */
          lines: d.lines.map((l) => (!l.parentId && l.categoryId === id ? { ...l, name: value } : l)),
        }));
        const renamedLines = db.lines.filter((l) => !l.parentId && l.categoryId === id).map((l) => l.id);
        const { error } = await supabase.from("categories").update({ name: value } as never).eq("id", id);
        if (error) return fail(error);
        if (renamedLines.length > 0) {
          const r = await supabase.from("lines").update({ name: value } as never).in("id", renamedLines);
          if (r.error) fail(r.error);
        }
      },
      setCategoryArchived: async (id, archived) => {
        setDb((d) => ({
          ...d,
          categories: d.categories.map((c) => (c.id === id ? { ...c, archived } : c)),
        }));
        const { error } = await supabase.from("categories").update({ archived } as never).eq("id", id);
        if (error) fail(error);
      },
      reorderCategories: async (ids) => {
        setDb((d) => ({
          ...d,
          categories: d.categories.map((c) => {
            const i = ids.indexOf(c.id);
            return i === -1 ? c : { ...c, sortOrder: i + 1 };
          }),
        }));
        for (const [i, id] of ids.entries()) {
          const { error } = await supabase.from("categories").update({ sort_order: i + 1 } as never).eq("id", id);
          if (error) {
            fail(error);
            return;
          }
        }
      },
      deleteCategory: async (id) => {
        const used =
          db.categories.some((c) => c.parentId === id) ||
          db.lines.some((l) => l.categoryId === id) ||
          db.bills.some((b) => b.categoryId === id);
        if (used) {
          showToast("In use — archive it instead");
          return;
        }
        setDb((d) => ({ ...d, categories: d.categories.filter((c) => c.id !== id) }));
        const { error } = await supabase.from("categories").delete().eq("id", id);
        if (error) fail(error);
      },

      /* ---------------- routing ---------------- */
      ensureRoutedLine: ensureRoutedLineFn,
      addRoutedBill: async (input) => {
        const cat = db.categories.find((c) => c.id === input.categoryId);
        if (!cat) return null;
        const parent = await ensureParentLine(input.eventId, cat.id);
        if (!parent) return null;
        const child = await insertLine({
          eventId: input.eventId,
          section: cat.section,
          name: input.counterparty,
          parentId: parent.id,
          categoryId: input.subcategoryId ?? cat.id,
          budgetAmount: input.amount,
          detail: input.description || undefined,
          ref: input.ref || undefined,
          vatExempt: input.vatExempt || undefined,
          vatOverride: input.vatAmount,
        });
        if (!child) return null;
        const bill: Bill = {
          id: uid("b"),
          eventId: input.eventId,
          counterparty: input.counterparty,
          description: input.description || "\u2014",
          amount: input.amount,
          dueDate: input.dueDate,
          lineId: child.id,
          vatExempt: input.vatExempt,
          categoryId: input.subcategoryId ?? cat.id,
          countInActual: true,
          payments: [],
        };
        setDb((d) => ({ ...d, bills: [...d.bills, bill] }));
        const { error } = await supabase.from("bills").insert(billToRow(bill) as never);
        if (error) fail(error);
        return { billId: bill.id, lineId: child.id };
      },
      addVendor: async ({ name, categoryId, subcategoryId, vatRegistered }) => {
        const p = promoterOrThrow();
        const value = name.trim();
        if (!value) return null;
        const existing = db.vendors.find((v) => v.name.toLowerCase() === value.toLowerCase());
        if (existing) return existing;
        const row = {
          promoter_id: p.id,
          name: value,
          aliases: [],
          default_category_id: categoryId ?? null,
          default_subcategory_id: subcategoryId ?? null,
          vat_registered: vatRegistered ?? false,
        };
        const { data, error } = await supabase.from("vendors").insert(row as never).select("*").single();
        if (error || !data) {
          fail(error);
          return null;
        }
        const vendor: Vendor = {
          id: String((data as Record<string, unknown>)["id"]),
          promoterId: p.id,
          name: value,
          aliases: [],
          defaultCategoryId: categoryId,
          defaultSubcategoryId: subcategoryId,
          vatRegistered: vatRegistered ?? false,
        };
        setDb((d) => ({ ...d, vendors: [...d.vendors, vendor] }));
        return vendor;
      },
      updateVendor: async (id, patch) => {
        const vendor = db.vendors.find((v) => v.id === id);
        if (!vendor) return;
        const aliases =
          patch.alias && patch.alias.trim() && patch.alias.trim().toLowerCase() !== vendor.name.toLowerCase()
            ? Array.from(new Set([...vendor.aliases, patch.alias.trim()]))
            : vendor.aliases;
        const next: Vendor = {
          ...vendor,
          aliases,
          defaultCategoryId: patch.categoryId ?? vendor.defaultCategoryId,
          defaultSubcategoryId:
            patch.categoryId !== undefined ? patch.subcategoryId : (patch.subcategoryId ?? vendor.defaultSubcategoryId),
          vatRegistered: patch.vatRegistered ?? vendor.vatRegistered,
        };
        setDb((d) => ({ ...d, vendors: d.vendors.map((v) => (v.id === id ? next : v)) }));
        const { error } = await supabase
          .from("vendors")
          .update({
            aliases: next.aliases,
            default_category_id: next.defaultCategoryId ?? null,
            default_subcategory_id: next.defaultSubcategoryId ?? null,
            vat_registered: next.vatRegistered,
          } as never)
          .eq("id", id);
        if (error) fail(error);
      },
      linkFileToLine: async (fileId, lineId, amount) => {
        setDb((d) => ({
          ...d,
          files: d.files.map((f) =>
            f.id === fileId ? { ...f, lineId, amount: amount ?? f.amount } : f,
          ),
        }));
        const { error } = await supabase
          .from("files")
          .update({ line_id: lineId, ...(amount !== undefined ? { amount } : {}) } as never)
          .eq("id", fileId);
        if (error) fail(error);
      },
      routeLine: routeLineFn,
      deleteBill: async (billId) => {
        const bill = db.bills.find((b) => b.id === billId);
        if (!bill) return;
        const lineId = bill.lineId;
        const child = lineId ? db.lines.find((l) => l.id === lineId) : undefined;
        /* the child line only exists to carry this bill — drop it when nothing else uses it */
        const dropChild =
          !!child &&
          !!child.parentId &&
          child.actualAmount === 0 &&
          db.bills.filter((b) => b.lineId === child.id).length === 1 &&
          !db.moneyIn.some((r) => r.lineId === child.id) &&
          !db.files.some((f) => f.lineId === child.id);
        const parent = dropChild ? db.lines.find((l) => l.id === child!.parentId) : undefined;
        const dropParent =
          !!parent &&
          parent.budgetAmount === 0 &&
          parent.actualAmount === 0 &&
          db.lines.filter((l) => l.parentId === parent.id).length === 1 &&
          !db.bills.some((b) => b.lineId === parent.id) &&
          !db.moneyIn.some((r) => r.lineId === parent.id) &&
          !db.files.some((f) => f.lineId === parent.id);

        const dropIds = [...(dropChild ? [child!.id] : []), ...(dropParent ? [parent!.id] : [])];
        setDb((d) => ({
          ...d,
          bills: d.bills.filter((b) => b.id !== billId),
          lines: d.lines.filter((l) => !dropIds.includes(l.id)),
        }));
        await supabase.from("payments").delete().eq("parent_kind", "out").eq("parent_id", billId);
        const { error } = await supabase.from("bills").delete().eq("id", billId);
        if (error) return fail(error);
        if (dropIds.length > 0) {
          const r = await supabase.from("lines").delete().in("id", dropIds);
          if (r.error) fail(r.error);
        }
        showToast("Bill deleted");
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
