export type Stage = "planning" | "reconciling" | "closed";
export type Section = "revenue" | "expenses";

export interface Accent {
  accent: string;
  accentDeep: string;
  tint: string;
  onBar: string;
}

export const BRAND_ACCENT: Accent = {
  accent: "#CE1663",
  accentDeep: "#A81050",
  tint: "#F7E9EF",
  onBar: "#221A20",
};

export interface EventRecord {
  id: string;
  name: string;
  date: string; // ISO
  venue: string;
  capacity?: number;
  headcount?: number;
  comps?: number;
  stage: Stage;
  accent: Accent;
  lockedAt?: string;
  /** Reference "today" used for due-date maths on seeded events. */
  asOf: string;
  budgetBaseline?: { revenue: number; expenses: number };
  /** Historical cash not itemised in the activity feed. */
  cashBaseline?: { collected: number; paid: number };
  vatExported?: boolean;
  vatFiledDate?: string;
  /** Real input VAT from bill-level source data; overrides computed line VAT until bills are itemised. */
  inputVatOverride?: number;
  planningRows?: { name: string; meta: string; state: "done" | "progress" | "open" }[];
}

export interface Line {
  id: string;
  eventId: string;
  section: Section;
  name: string;
  sortOrder: number;
  budgetAmount: number;
  /** Invoiced actual booked directly against the line (seeded history). */
  actualAmount: number;
  vatExempt?: boolean;
  /** Real VAT from the source bill, displayed and summed verbatim; overrides the 17.5% formula. */
  vatOverride?: number;
  /** Secondary line under the name: what the bill was for. */
  detail?: string;
  /** Invoice / reference number from the source document. */
  ref?: string;
  parentId?: string;
}

export interface Payment {
  id: string;
  amount: number;
  date: string;
}

export interface Ledgerable {
  id: string;
  eventId: string;
  counterparty: string;
  description: string;
  amount: number;
  dueDate: string;
  lineId?: string;
  vatExempt?: boolean;
  payments: Payment[];
  /** false when the line already carries this amount in its seeded actual. */
  countInActual?: boolean;
}

export interface MoneyIn extends Ledgerable {}
export interface Bill extends Ledgerable {}

export interface FileRecord {
  id: string;
  eventId: string;
  name: string;
  type: "PDF" | "IMG";
  date: string;
  lineId?: string;
  amount?: number;
  /** Path in the private storage bucket. */
  storagePath?: string;
}

export interface Settings {
  currency: string;
  vatRate: number;
  business: string;
}

export interface Db {
  settings: Settings;
  events: EventRecord[];
  lines: Line[];
  moneyIn: MoneyIn[];
  bills: Bill[];
  files: FileRecord[];
}

export type RecordStatus = "outstanding" | "overdue" | "partial" | "paid";
