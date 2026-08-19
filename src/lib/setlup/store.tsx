import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { seedDb } from "./seed";
import { BRAND_ACCENT, type Db, type EventRecord, type FileRecord, type Line, type Section, type Settings } from "./types";
import { todayIso } from "./format";

let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

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
}

const StoreContext = createContext<StoreValue | null>(null);

export function SetlupProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Db>(() => seedDb());
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2200);
  }, []);

  const value = useMemo<StoreValue>(() => {
    const patchEvent = (eventId: string, patch: Partial<EventRecord>) =>
      setDb((d) => ({
        ...d,
        events: d.events.map((e) => (e.id === eventId ? { ...e, ...patch } : e)),
      }));

    return {
      db,
      toast,
      showToast,
      getEvent: (id) => db.events.find((e) => e.id === id),
      addPayment: (kind, recordId, amount, date) =>
        setDb((d) => {
          const key = kind === "in" ? "moneyIn" : "bills";
          return {
            ...d,
            [key]: d[key].map((r) =>
              r.id === recordId
                ? { ...r, payments: [...r.payments, { id: uid("p"), amount, date }] }
                : r,
            ),
          } as Db;
        }),
      addMoneyIn: (input) =>
        setDb((d) => ({
          ...d,
          moneyIn: [...d.moneyIn, { ...input, id: uid("mi"), payments: [], countInActual: true }],
        })),
      addBill: (input) =>
        setDb((d) => ({
          ...d,
          bills: [...d.bills, { ...input, id: uid("b"), payments: [], countInActual: true }],
        })),
      addBudgetLine: (eventId, section, name, amount, vatExempt) =>
        setDb((d) => {
          const siblings = d.lines.filter((l) => l.eventId === eventId && l.section === section && !l.parentId);
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
          return { ...d, lines: [...d.lines, line] };
        }),
      addFile: (file) => setDb((d) => ({ ...d, files: [...d.files, { ...file, id: uid("f") }] })),
      setStage: (eventId, stage) => patchEvent(eventId, { stage }),
      markVatExported: (eventId) => patchEvent(eventId, { vatExported: true }),
      closeEvent: (eventId) => patchEvent(eventId, { stage: "closed", lockedAt: todayIso() }),
      reopenEvent: (eventId) => patchEvent(eventId, { stage: "reconciling", lockedAt: undefined }),
      addEvent: (input) => {
        const id = uid("e");
        setDb((d) => ({
          ...d,
          events: [
            {
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
            },
            ...d.events,
          ],
        }));
        return id;
      },
      updateSettings: (patch) => setDb((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
    };
  }, [db, toast, showToast]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useSetlup(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useSetlup must be used inside SetlupProvider");
  return ctx;
}
