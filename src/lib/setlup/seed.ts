import { BRAND_ACCENT, type Db, type Line } from "./types";

const UV = "#7A24DB";

function L(
  eventId: string,
  section: Line["section"],
  id: string,
  name: string,
  sortOrder: number,
  budgetAmount: number,
  actualAmount: number,
  opts: { vatExempt?: boolean; parentId?: string } = {},
): Line {
  return { id, eventId, section, name, sortOrder, budgetAmount, actualAmount, ...opts };
}

export function seedDb(): Db {
  const lines: Line[] = [
    // ---------- UV 2026 (planning) ----------
    L("e26", "revenue", "e26-r1", "Ticket sales", 1, 480000, 0),
    L("e26", "revenue", "e26-r2", "Bar sales", 2, 165000, 0),
    L("e26", "revenue", "e26-r3", "Sponsorship", 3, 50000, 0, { vatExempt: true }),
    L("e26", "revenue", "e26-r4", "Tables & other", 4, 25000, 0),
    L("e26", "cos", "e26-c1", "Artists & talent", 1, 110000, 0, { vatExempt: true }),
    L("e26", "cos", "e26-c2", "Production & staging", 2, 90000, 0),
    L("e26", "cos", "e26-c3", "Bar stock", 3, 52000, 0),
    L("e26", "cos", "e26-c4", "Venue", 4, 34000, 0),
    L("e26", "expenses", "e26-x1", "Marketing & promo", 1, 42000, 0),
    L("e26", "expenses", "e26-x2", "Staff & bar labour", 2, 33000, 0, { vatExempt: true }),
    L("e26", "expenses", "e26-x3", "Security & medical", 3, 29000, 0),
    L("e26", "expenses", "e26-x4", "Insurance & permits", 4, 13000, 0, { vatExempt: true }),
    L("e26", "expenses", "e26-x5", "Misc & contingency", 5, 17000, 0),

    // ---------- UV 2025 (reconciling) ----------
    L("e25", "revenue", "e25-r1", "Ticket sales", 1, 0, 428650),
    L("e25", "revenue", "e25-r1a", "Early bird", 1, 0, 68400, { parentId: "e25-r1" }),
    L("e25", "revenue", "e25-r1b", "General admission", 2, 0, 268750, { parentId: "e25-r1" }),
    L("e25", "revenue", "e25-r1c", "VIP", 3, 0, 91500, { parentId: "e25-r1" }),
    L("e25", "revenue", "e25-r2", "Bar sales", 2, 0, 152940),
    L("e25", "revenue", "e25-r2a", "Beer & RTD", 1, 0, 89410, { parentId: "e25-r2" }),
    L("e25", "revenue", "e25-r2b", "Spirits & cocktails", 2, 0, 63530, { parentId: "e25-r2" }),
    L("e25", "revenue", "e25-r3", "Sponsorship", 3, 0, 45000, { vatExempt: true }),
    L("e25", "revenue", "e25-r4", "Tables & other", 4, 0, 24600),
    L("e25", "cos", "e25-c1", "Artists & talent", 1, 0, 96000, { vatExempt: true }),
    L("e25", "cos", "e25-c2", "Production & staging", 2, 0, 84500),
    L("e25", "cos", "e25-c2a", "Stage & sound", 1, 0, 61300, { parentId: "e25-c2" }),
    L("e25", "cos", "e25-c2b", "Lighting & LED", 2, 0, 23200, { parentId: "e25-c2" }),
    L("e25", "cos", "e25-c3", "Bar stock", 3, 0, 48730),
    L("e25", "cos", "e25-c4", "Venue", 4, 0, 32000),
    L("e25", "expenses", "e25-x1", "Marketing & promo", 1, 0, 38450),
    L("e25", "expenses", "e25-x1a", "Digital & radio", 1, 0, 26950, { parentId: "e25-x1" }),
    L("e25", "expenses", "e25-x1b", "Print & flyers", 2, 0, 11500, { parentId: "e25-x1" }),
    L("e25", "expenses", "e25-x2", "Staff & bar labour", 2, 0, 31200, { vatExempt: true }),
    L("e25", "expenses", "e25-x3", "Security & medical", 3, 0, 27800),
    L("e25", "expenses", "e25-x4", "Insurance & permits", 4, 0, 12400, { vatExempt: true }),
    L("e25", "expenses", "e25-x5", "Misc & contingency", 5, 0, 8915),

    // ---------- UV 2024 (closed) ----------
    L("e24", "revenue", "e24-r1", "Ticket sales", 1, 0, 339720),
    L("e24", "revenue", "e24-r2", "Bar sales", 2, 0, 126308),
    L("e24", "revenue", "e24-r3", "Sponsorship", 3, 0, 32628.23, { vatExempt: true }),
    L("e24", "revenue", "e24-r4", "Tables & other", 4, 0, 18140),
    L("e24", "cos", "e24-c1", "Artists & talent", 1, 0, 78000, { vatExempt: true }),
    L("e24", "cos", "e24-c2", "Production & staging", 2, 0, 68400),
    L("e24", "cos", "e24-c3", "Bar stock", 3, 0, 41230),
    L("e24", "cos", "e24-c4", "Venue", 4, 0, 30000),
    L("e24", "expenses", "e24-x1", "Marketing & promo", 1, 0, 34120),
    L("e24", "expenses", "e24-x2", "Staff & bar labour", 2, 0, 26400, { vatExempt: true }),
    L("e24", "expenses", "e24-x3", "Security & medical", 3, 0, 23800),
    L("e24", "expenses", "e24-x4", "Insurance & permits", 4, 0, 11200, { vatExempt: true }),
    L("e24", "expenses", "e24-x5", "Misc & contingency", 5, 0, 7336.23),
  ];

  return {
    settings: { currency: "BBD", vatRate: 17.5, business: "UV Vibe" },
    events: [
      {
        id: "e26",
        name: "UV 2026",
        date: "2026-07-25",
        venue: "Botanical Gardens",
        capacity: 3500,
        stage: "planning",
        accent: { accent: UV, accentDeep: "#5E17B0", tint: "#F0E9FB", onBar: "#FFFFFF" },
        asOf: "2026-08-19",
        planningRows: [
          { name: "Budget drafted", meta: "Full budget in place", state: "done" },
          { name: "Vendors committed", meta: "2 of 6 booked", state: "progress" },
          { name: "Sponsorship confirmed", meta: "0.00 of 50,000.00", state: "open" },
        ],
      },
      {
        id: "e25",
        name: "UV 2025",
        date: "2025-07-26",
        venue: "Botanical Gardens",
        headcount: 3120,
        comps: 198,
        stage: "reconciling",
        accent: BRAND_ACCENT,
        asOf: "2025-08-20",
        budgetBaseline: { revenue: 640000, cos: 255000, expenses: 115000 },
        cashBaseline: { collected: 152940, paid: 304205 },
      },
      {
        id: "e24",
        name: "UV 2024",
        date: "2024-07-28",
        venue: "Botanical Gardens",
        headcount: 2555,
        comps: 231,
        stage: "closed",
        accent: BRAND_ACCENT,
        asOf: "2024-09-30",
        lockedAt: "2025-09-30",
        vatExported: true,
        vatFiledDate: "2024-09-15",
      },
    ],
    lines,
    moneyIn: [
      {
        id: "mi-25-1", eventId: "e25", counterparty: "FLOW Barbados",
        description: "Sponsorship balance", amount: 15000, dueDate: "2025-08-30",
        lineId: "e25-r3", vatExempt: true, payments: [], countInActual: false,
      },
      {
        id: "mi-25-2", eventId: "e25", counterparty: "Private client",
        description: "VIP tables", amount: 4800, dueDate: "2025-08-14",
        lineId: "e25-r4", payments: [], countInActual: false,
      },
      {
        id: "mi-25-3", eventId: "e25", counterparty: "FLOW Barbados",
        description: "Sponsorship deposit", amount: 30000, dueDate: "2025-07-30",
        lineId: "e25-r3", vatExempt: true, countInActual: false,
        payments: [{ id: "p-25-a", amount: 30000, date: "2025-07-30" }],
      },
      {
        id: "mi-25-4", eventId: "e25", counterparty: "Ticket platform payout",
        description: "Ticketing settlement", amount: 428650, dueDate: "2025-07-29",
        lineId: "e25-r1", countInActual: false,
        payments: [{ id: "p-25-b", amount: 428650, date: "2025-07-29" }],
      },
      {
        id: "mi-25-5", eventId: "e25", counterparty: "Tables & other",
        description: "Table sales settled", amount: 19800, dueDate: "2025-08-02",
        lineId: "e25-r4", countInActual: false,
        payments: [{ id: "p-25-c", amount: 19800, date: "2025-08-02" }],
      },
      {
        id: "mi-24-1", eventId: "e24", counterparty: "FLOW Barbados",
        description: "Sponsorship", amount: 32628.23, dueDate: "2024-08-12",
        lineId: "e24-r3", vatExempt: true, countInActual: false,
        payments: [{ id: "p-24-a", amount: 32628.23, date: "2024-08-12" }],
      },
    ],
    bills: [
      {
        id: "b-25-1", eventId: "e25", counterparty: "Production Co",
        description: "Final invoice", amount: 22500, dueDate: "2025-08-22",
        lineId: "e25-c2", payments: [], countInActual: false,
      },
      {
        id: "b-25-2", eventId: "e25", counterparty: "Island Bar Supply",
        description: "Inv 4471", amount: 14340, dueDate: "2025-08-18",
        lineId: "e25-c3", countInActual: false,
        payments: [{ id: "p-25-d", amount: 5000, date: "2025-08-05" }],
      },
      {
        id: "b-25-3", eventId: "e25", counterparty: "SafeGuard Security",
        description: "Event night", amount: 6950, dueDate: "2025-08-25",
        lineId: "e25-x3", payments: [], countInActual: false,
      },
      {
        id: "b-25-4", eventId: "e25", counterparty: "Botanical Gardens",
        description: "Venue balance", amount: 32000, dueDate: "2025-08-12",
        lineId: "e25-c4", countInActual: false,
        payments: [{ id: "p-25-e", amount: 32000, date: "2025-08-12" }],
      },
      {
        id: "b-26-1", eventId: "e26", counterparty: "Production Co",
        description: "Staging commitment", amount: 90000, dueDate: "2026-07-01",
        lineId: "e26-c2", payments: [], countInActual: false,
      },
      {
        id: "b-26-2", eventId: "e26", counterparty: "Botanical Gardens",
        description: "Venue hold", amount: 34000, dueDate: "2026-07-01",
        lineId: "e26-c4", payments: [], countInActual: false,
      },
      {
        id: "b-24-1", eventId: "e24", counterparty: "Production Co",
        description: "Final invoice", amount: 68400, dueDate: "2024-08-20",
        lineId: "e24-c2", countInActual: false,
        payments: [{ id: "p-24-b", amount: 68400, date: "2024-08-20" }],
      },
      {
        id: "b-24-2", eventId: "e24", counterparty: "Island Bar Supply",
        description: "Bar stock", amount: 41230, dueDate: "2024-08-08",
        lineId: "e24-c3", countInActual: false,
        payments: [{ id: "p-24-c", amount: 41230, date: "2024-08-08" }],
      },
      {
        id: "b-24-3", eventId: "e24", counterparty: "Botanical Gardens",
        description: "Venue", amount: 30000, dueDate: "2024-07-30",
        lineId: "e24-c4", countInActual: false,
        payments: [{ id: "p-24-d", amount: 30000, date: "2024-07-30" }],
      },
    ],
    files: [
      { id: "f-26-1", eventId: "e26", name: "Production Co quote", type: "PDF", date: "2026-08-02", lineId: "e26-c2", amount: 90000 },
      { id: "f-26-2", eventId: "e26", name: "Venue hold letter", type: "PDF", date: "2026-07-15", lineId: "e26-c4" },
      { id: "f-26-3", eventId: "e26", name: "Sponsor deck", type: "IMG", date: "2026-08-09", lineId: "e26-r3" },
      { id: "f-25-1", eventId: "e25", name: "Production Co final invoice", type: "PDF", date: "2025-08-04", lineId: "e25-c2", amount: 22500 },
      { id: "f-25-2", eventId: "e25", name: "Island Bar Supply inv 4471", type: "PDF", date: "2025-07-27", lineId: "e25-c3", amount: 14340 },
      { id: "f-25-3", eventId: "e25", name: "FLOW sponsorship agreement", type: "IMG", date: "2025-06-02", lineId: "e25-r3", amount: 45000 },
      { id: "f-25-4", eventId: "e25", name: "Venue permit", type: "PDF", date: "2025-05-14" },
      { id: "f-24-1", eventId: "e24", name: "Production Co final invoice", type: "PDF", date: "2024-08-02", lineId: "e24-c2", amount: 68400 },
      { id: "f-24-2", eventId: "e24", name: "VAT return as filed", type: "PDF", date: "2024-09-15", amount: 41595.16 },
      { id: "f-24-3", eventId: "e24", name: "FLOW sponsorship agreement", type: "IMG", date: "2024-05-20", lineId: "e24-r3", amount: 32628.23 },
    ],
  };
}
