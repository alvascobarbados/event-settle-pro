// SETL seed data — all figures come from these arrays; the sheet is a computed view.
// Legend:
//   Bill:  [vendor, date|null, inv|null, kind, status, lines, extra?]
//   Line:  [category, sub, descriptor|null, amount, vat|null]
//   Revenue: [category, label, amount, vatable, status]

export type RevenueCategory = "ticket_sales" | "bar_sales" | "sponsorship" | "tables_other";
export type CosCategory = "drinks" | "food";
export type EventCostCategory =
  | "core_production"
  | "decor_merch_supplies"
  | "event_day_ops"
  | "talent"
  | "marketing_media"
  | "admin_fees";

export type BillKind = "invoice" | "credit";
export type BillStatus = "paid" | "unpaid";

export interface BillLine {
  category: string; // top-level bucket: "cos" | "core_production" | ... (event-cost) or "admin_fees"
  sub: string | null;
  descriptor: string | null;
  amount: number;
  vat: number | null; // null = line carries no VAT
}
export interface Bill {
  id: string;
  vendor: string;
  date: string | null;
  invoice: string | null; // may be "cash" | "receipt" | "stmts" | actual number | null
  kind: BillKind;
  status: BillStatus;
  lines: BillLine[];
  parent?: string; // invoice # of parent invoice (for credits)
}
export interface RevenueEntry {
  id: string;
  category: RevenueCategory;
  label: string;
  amount: number;
  vatable: boolean;
  status: "received" | "pending";
}

export interface VatReturn {
  output_declared: number | null;
  input_claimed: number | null;
  deposits: number | null;
  net_payable: number;
  status: "due" | "settled";
  note?: string;
}
export interface SettlementItem {
  label: string;
  amount: number; // negative = outflow
  status: "due" | "paid" | "settled";
}

export interface EventRecord {
  id: string;
  name: string;
  date: string;
  venue: string;
  headcount: number;
  comps: number;
  state: "mid-settlement" | "settled";
  revenue: RevenueEntry[];
  bills: Bill[];
  vat_return: VatReturn;
  settlement_items: SettlementItem[];
}

export interface VendorDefault {
  name: string;
  category: string | null;
  sub: string | null;
  vat: "vat" | "no_vat";
  flags: string[];
}

// ---------------- Categories ----------------
export const CATEGORIES = {
  revenue: ["ticket_sales", "bar_sales", "sponsorship", "tables_other"] as const,
  cos: { drinks: [], food: [] },
  event_costs: {
    core_production: ["venue", "staging_tents_truss", "sound_light_power", "site_services", "furniture_shade"],
    decor_merch_supplies: ["giveaways_supplies", "fabrication_signage", "decor_florals", "build_labour"],
    event_day_ops: ["bar_door_mgmt", "security", "cleaning", "promo_staff", "ops_supplies"],
    talent: ["foreign", "local", "artist_logistics"],
    marketing_media: [],
    admin_fees: ["compliance", "licenses"],
  },
};

export const REVENUE_LABELS: Record<RevenueCategory, string> = {
  ticket_sales: "Ticket sales",
  bar_sales: "Bar sales",
  sponsorship: "Sponsorship",
  tables_other: "Tables & other",
};

export const COST_LABELS: Record<string, string> = {
  drinks: "Drinks",
  food: "Food",
  core_production: "Core production",
  decor_merch_supplies: "Décor, merch & supplies",
  event_day_ops: "Event-day operations",
  talent: "Talent",
  marketing_media: "Marketing & media",
  admin_fees: "Admin, fees & compliance",
};

export const SUB_LABELS: Record<string, string> = {
  venue: "Venue",
  staging_tents_truss: "Staging, tents & truss",
  sound_light_power: "Sound, light & power",
  site_services: "Site services",
  furniture_shade: "Furniture & shade",
  giveaways_supplies: "Giveaways & supplies",
  fabrication_signage: "Fabrication & signage",
  decor_florals: "Décor & florals",
  build_labour: "Build labour",
  bar_door_mgmt: "Bar & door management",
  security: "Security",
  cleaning: "Cleaning",
  promo_staff: "Promo staff",
  ops_supplies: "Ops supplies",
  foreign: "Foreign talent",
  local: "Local talent",
  artist_logistics: "Artist logistics",
  compliance: "Compliance",
  licenses: "Licenses",
};

// ---------------- Vendor defaults ----------------
export const VENDOR_DEFAULTS: VendorDefault[] = [
  ["Acado","cos","drinks","vat",["two_way"]],
  ["Bryden Stokes","cos","drinks","vat",["two_way"]],
  ["Hanschell Inniss","cos","drinks","vat",["two_way"]],
  ["Stansfeld Scott","cos","drinks","vat",["two_way"]],
  ["Newton Wholesale","cos","drinks","vat",[]],
  ["Tims","cos","food","no_vat",[]],
  ["Karibu","cos","food","no_vat",[]],
  ["Makin' Moves","core_production","staging_tents_truss","no_vat",[]],
  ["Dream Solutions","core_production","sound_light_power","no_vat",[]],
  ["Just Cool It","core_production","site_services","no_vat",[]],
  ["RC Supplies & Distri","core_production","furniture_shade","vat",[]],
  ["Infra Rentals","core_production","site_services","vat",[]],
  ["C&A Tools","core_production","site_services","vat",[]],
  ["Williams Equipment","core_production","sound_light_power","vat",[]],
  ["Nova","core_production","site_services","no_vat",[]],
  ["Botanical Garden","core_production","venue","vat",[]],
  ["Alvasco (Barbados) Ltd.","decor_merch_supplies","giveaways_supplies","vat",["related_party"]],
  ["Abeds","decor_merch_supplies","fabrication_signage","vat",[]],
  ["Print On Demand","decor_merch_supplies","fabrication_signage","no_vat",[]],
  ["Petals Paradise","decor_merch_supplies","decor_florals","no_vat",[]],
  ["Priv4lege Entertainment","event_day_ops","bar_door_mgmt","no_vat",[]],
  ["Envision Event & Bar Ser.","event_day_ops","bar_door_mgmt","no_vat",[]],
  ["Premium Kennels & Security","event_day_ops","security","no_vat",[]],
  ["Eco Steam Detailing","event_day_ops","cleaning","no_vat",[]],
  ["Amandas Cleaning Services","event_day_ops","cleaning","no_vat",[]],
  ["Haus of Ella","event_day_ops","promo_staff","no_vat",[]],
  ["Pyramid Entertainment & Management","talent","local","no_vat",[]],
  ["IZAVYBE! Entertainment","talent","local","no_vat",[]],
  ["Trident Transportation","talent","artist_logistics","no_vat",[]],
  ["Accra Beach Hotel","talent","artist_logistics","no_vat",[]],
  ["Caribbean Airlines","talent","artist_logistics","no_vat",[]],
  ["Barbados Revenue Authority","admin_fees","compliance","no_vat",[]],
  ["Coscap","admin_fees","compliance","vat",[]],
  ["Hits 106.7","marketing_media",null,"no_vat",[]],
  ["Nocturnal","marketing_media",null,"no_vat",[]],
  ["Wardraw Studio","marketing_media",null,"no_vat",[]],
  ["Bajantube","marketing_media",null,"no_vat",[]],
  ["Focus Photography","marketing_media",null,"no_vat",[]],
].map(([name, category, sub, vat, flags]) => ({
  name: name as string,
  category: category as string | null,
  sub: sub as string | null,
  vat: vat as "vat" | "no_vat",
  flags: flags as string[],
}));

// helper to build bills
type RawLine = [string, string | null, string | null, number, number | null];
type RawBill = [string, string | null, string | null, BillKind, BillStatus, RawLine[], { parent?: string }?];

function bills(list: RawBill[]): Bill[] {
  return list.map((b, i) => ({
    id: `b${i}`,
    vendor: b[0],
    date: b[1],
    invoice: b[2],
    kind: b[3],
    status: b[4],
    lines: b[5].map(([category, sub, descriptor, amount, vat]) => ({
      category, sub, descriptor, amount, vat,
    })),
    parent: b[6]?.parent,
  }));
}

type RawRev = [RevenueCategory, string, number, boolean, "received" | "pending"];
function revenue(list: RawRev[]): RevenueEntry[] {
  return list.map(([category, label, amount, vatable, status], i) => ({
    id: `r${i}`, category, label, amount, vatable, status,
  }));
}

// ---------------- UV 2025 ----------------
const UV_2025_REV: RawRev[] = [
  ["ticket_sales","Online — tiers, packages & MTP",199730.36,true,"received"],
  ["ticket_sales","Physical stock — 813 tickets",133675.00,true,"received"],
  ["ticket_sales","Main door — 16 × 175",2800.00,true,"received"],
  ["ticket_sales","Door money short",-50.00,true,"received"],
  ["bar_sales","Main Bar — Front Entrance (1)",41837.00,true,"received"],
  ["bar_sales","Main Bar — Front Entrance (2)",13300.00,true,"received"],
  ["bar_sales","Champagne Bar",12700.00,true,"received"],
  ["bar_sales","Main Bar — Hill (1)",12232.00,true,"received"],
  ["bar_sales","Main Bar — Food Court",11621.00,true,"received"],
  ["bar_sales","Johnnie Walker Bar (1)",8896.00,true,"received"],
  ["bar_sales","Hennessy Bar",7661.00,true,"received"],
  ["bar_sales","Johnnie Walker Bar (2)",5550.00,true,"received"],
  ["bar_sales","Main Bar — Hill (2)",5000.00,true,"received"],
  ["bar_sales","Rum Bar (1)",4944.00,true,"received"],
  ["bar_sales","Corona Bar",4822.00,true,"received"],
  ["bar_sales","Mocktail Bar",3410.00,true,"received"],
  ["bar_sales","Rum Bar (2)",1000.00,true,"received"],
  ["sponsorship","FCIB — cash (bar)",10000.00,false,"received"],
  ["sponsorship","Acado — cash (bar)",10000.00,false,"pending"],
  ["sponsorship","Bryden Stokes — cash (bar)",6500.00,false,"received"],
  ["sponsorship","Banks Holdings — cash (bar)",5875.00,false,"received"],
  ["sponsorship","Confectionery & Snacks — Day-Oh",5000.00,false,"received"],
  ["sponsorship","Stansfeld Scott — cash (bar)",2700.00,false,"received"],
  ["sponsorship","Bryden — 50% decking & tent",2572.00,false,"pending"],
  ["sponsorship","Acado — 50% decking & cabana",1288.00,false,"pending"],
  ["sponsorship","Massy — 50% decking & tent",433.00,false,"pending"],
  ["sponsorship","Wibisco — 50% decking & tent",391.28,false,"pending"],
  ["tables_other","Premium tables — 17 × 1,850",31450.00,true,"received"],
  ["tables_other","Classic tables — 7 × 650",4550.00,true,"received"],
  ["tables_other","Tables sold at event",3555.00,true,"received"],
  ["tables_other","Table alone — 3 × 150",450.00,true,"received"],
  ["tables_other","Comp table — Romain Marshall",0.00,false,"received"],
];

const UV_2025_BILLS: RawBill[] = [
  ["Bryden Stokes","2025-07-25","INV0181643","invoice","paid",[["cos","drinks",null,71212.38,10606.10]]],
  ["Bryden Stokes","2025-07-29","CNV0015669","credit","paid",[["cos","drinks",null,-49156.37,-7321.16]],{parent:"INV0181643"}],
  ["Acado",null,"Acado-INV-01","invoice","paid",[["cos","drinks",null,146732.55,21853.78]]],
  ["Acado",null,"Acado-CN-01","credit","paid",[["cos","drinks",null,-114732.25,-17087.78]],{parent:"Acado-INV-01"}],
  ["Stansfeld Scott","2025-07-28","1814679","invoice","paid",[["cos","drinks",null,8814.68,1312.82]]],
  ["Newton Wholesale","2025-07-26","364126","invoice","paid",[["cos","drinks",null,11901.00,1772.49]]],
  ["Newton Wholesale","2025-07-28","364250","credit","paid",[["cos","drinks",null,-7158.99,-1066.23]],{parent:"364126"}],
  ["Tims",null,"49","invoice","paid",[["cos","food","Lead caterer",40000.00,null]]],
  ["Karibu",null,"2","invoice","paid",[["cos","food",null,20300.00,null]]],
  ["Flash Zone",null,"cash","invoice","paid",[["cos","food",null,10000.00,null]]],
  ["Italia Coffee",null,"cash","invoice","paid",[["cos","food",null,6500.01,968.09]]],
  ["Bowl'd",null,"cash","invoice","paid",[["cos","food",null,6000.00,null]]],
  ["Trini Doubles",null,"cash","invoice","paid",[["cos","food",null,5000.00,null]]],
  ["Green Monkey Chocolatier",null,"cash","invoice","paid",[["cos","food",null,5000.00,null]]],
  ["The Gourmet Connoisseurs",null,"I250808273","invoice","paid",[["cos","food",null,5000.00,null]]],
  ["Bearded Hogs",null,"cash","invoice","paid",[["cos","food",null,5000.00,null]]],
  ["Street Pasta",null,"52","invoice","paid",[["cos","food",null,4000.00,null]]],
  ["The Healthy Spot",null,"#010","invoice","paid",[["cos","food","Fruit cups",3500.00,null]]],
  ["The Mini Bar",null,"#7","invoice","paid",[["cos","food",null,1500.00,null]]],
  ["Makin' Moves","2025-08-11","1980","invoice","paid",[["core_production","staging_tents_truss","Staging, tents & truss",74303.00,null]]],
  ["Dream Solutions","2025-08-06","1822","invoice","paid",[["core_production","sound_light_power","Sound",14500.00,null]]],
  ["Botanical Garden",null,"cash","invoice","paid",[["core_production","venue","Venue & cleaning",7000.00,1042.55]]],
  ["Just Cool It","2025-07-25","INV0003","invoice","paid",[["core_production","site_services","Fans & misters",6760.00,null]]],
  ["RC Supplies & Distri","2025-07-20","540987","invoice","paid",[["core_production","furniture_shade","Cabanas & umbrellas",6568.75,978.32]]],
  ["Rodney Maintenance & Service","2025-07-29","281","invoice","paid",[["core_production","sound_light_power","Power distribution",6490.00,null]]],
  ["Nova","2025-07-31","394","invoice","paid",[["core_production","site_services","Fencing",5825.00,null]]],
  ["Williams Equipment",null,"1659939","invoice","paid",[["core_production","sound_light_power","Generators",1938.75,288.75]]],
  ["Williams Equipment",null,"1659331","invoice","paid",[["core_production","sound_light_power","Lift",1938.75,288.75]]],
  ["C&A Tools",null,"59788","invoice","paid",[["core_production","site_services","Powder room & bathrooms",3528.50,525.52]]],
  ["Infra Rentals",null,"98954-2","invoice","paid",[["core_production","site_services","Bathrooms",2984.50,444.50]]],
  ["Axe Solutions Inc.","2025-08-15","2198","invoice","paid",[["core_production","sound_light_power","LED DJ counter",2350.00,350.00]]],
  ["Dream Freighting & Equipment","2025-08-06","2413","invoice","paid",[["core_production","sound_light_power","Generators",1770.00,null]]],
  ["Neal Water BWA",null,"cash","invoice","paid",[["core_production","site_services","Water supply",1500.00,null]]],
  ["Infra Rentals",null,"q104879-2","invoice","paid",[["core_production","sound_light_power","Light towers",1480.50,220.50]]],
  ["Mr. Benny Rowe","2025-07-25","70","invoice","paid",[["core_production","site_services","Barricades",1100.00,null]]],
  ["Quaison Bess","2025-07-26","56","invoice","paid",[["core_production","staging_tents_truss","Decking over muddy area",700.00,null]]],
  ["St. Mark Trucking & Well Digging","2025-08-07","5178","invoice","paid",[["core_production","site_services","Skip rental",420.00,null]]],
  ["Alvasco (Barbados) Ltd.",null,"Alvasco-2025-01","invoice","unpaid",[
    ["decor_merch_supplies","giveaways_supplies","Giveaways, fans & fabric (SPLIT 1/2)",48000.00,7148.95],
    ["event_day_ops","ops_supplies","Wristbands & ops supplies (SPLIT 2/2)",6833.75,1017.78],
  ]],
  ["Abeds",null,"SWT-A0000889921","invoice","paid",[
    ["decor_merch_supplies","fabrication_signage","Fabric",6837.87,1018.41],
    ["decor_merch_supplies","fabrication_signage","Fabric",502.45,74.83],
  ]],
  ["Petals Paradise",null,"cash","invoice","paid",[["decor_merch_supplies","decor_florals","Backwall décor",5500.00,null]]],
  ["Print On Demand",null,"2135","invoice","paid",[["decor_merch_supplies","fabrication_signage","Event signage",2141.00,null]]],
  ["Nathaniel Leon",null,"cash","invoice","paid",[["decor_merch_supplies","build_labour","Build services",1500.00,null]]],
  ["Crown D Productions",null,"1066","invoice","paid",[["decor_merch_supplies","decor_florals","Decoration",800.00,null]]],
  ["Labour Avi",null,"cash","invoice","paid",[["decor_merch_supplies","build_labour","Stage & site crew",11900.00,null]]],
  ["Mario Turton",null,"cash","invoice","paid",[["decor_merch_supplies","build_labour","Labour",750.00,null]]],
  ["Aundre Wharton",null,"cash","invoice","paid",[["decor_merch_supplies","build_labour","Stage management",200.00,null]]],
  ["Priv4lege Entertainment","2025-08-10","2025155","invoice","unpaid",[["event_day_ops","bar_door_mgmt","Bar management",17178.57,null]]],
  ["Premium Kennels & Security","2025-07-28","3","invoice","paid",[["event_day_ops","security","Overnight security",8430.00,null]]],
  ["Premium Kennels & Security","2025-07-28","2","invoice","paid",[["event_day_ops","security","Event security",5800.00,null]]],
  ["Envision Event & Bar Ser.","2025-07-31","193","invoice","paid",[["event_day_ops","bar_door_mgmt","Cash management",3800.00,null]]],
  ["Eco Steam Detailing",null,"4443","invoice","paid",[["event_day_ops","cleaning","Cleaning",1600.00,null]]],
  ["Haus of Ella",null,"6","invoice","paid",[["event_day_ops","promo_staff","Promotion girls",870.00,null]]],
  ["Amandas Cleaning Services",null,"#78","invoice","paid",[["event_day_ops","cleaning","Bathroom cleanup",250.00,null]]],
  ["Farmer Nappy",null,"cash","invoice","paid",[["talent","foreign","Booking + per diem",21982.34,null]]],
  ["Viking Ding Dong",null,"cash","invoice","paid",[["talent","foreign","Booking + per diem",10741.17,null]]],
  ["Caribbean Airlines",null,"cash","invoice","paid",[["talent","artist_logistics","Artist flights",6229.16,null]]],
  ["Accra Beach Hotel",null,"cash","invoice","paid",[["talent","artist_logistics","Artist accommodation",3528.72,null]]],
  ["Lead Pipe & Saddis",null,"cash","invoice","paid",[["talent","local",null,3000.00,null]]],
  ["Jordan English",null,"cash","invoice","paid",[["talent","local",null,3000.00,null]]],
  ["Pyramid Entertainment & Management",null,"2025060","invoice","paid",[["talent","local","Lil Rick",2937.50,null]]],
  ["Patrick Hypeman",null,"cash","invoice","paid",[["talent","foreign","Booking + per diem",2801.88,null]]],
  ["Barbados Revenue Authority",null,"receipt","invoice","paid",[["talent","foreign","Artist withholding tax",2333.33,null]]],
  ["Riggo Suave",null,"cash","invoice","paid",[["talent","foreign","Booking + per diem",2231.62,null]]],
  ["GratefulCo",null,"cash","invoice","paid",[["talent","local",null,2000.00,null]]],
  ["Shaquille",null,"cash","invoice","paid",[["talent","local",null,1500.00,null]]],
  ["IZAVYBE! Entertainment",null,"239","invoice","paid",[["talent","local","Rhythm section",1500.00,null]]],
  ["Trident Transportation",null,"cash","invoice","paid",[["talent","artist_logistics","Artist transport",1475.00,null]]],
  ["DJ Jesse T",null,"1412260","invoice","paid",[["talent","local",null,1100.00,null]]],
  ["Nicholas Roach",null,"258746","invoice","paid",[["talent","local",null,600.00,null]]],
  ["DJ Menace",null,"9","invoice","paid",[["talent","local",null,600.00,null]]],
  ["Legacy Team (Niqco Vybz & Gunner)",null,"cash","invoice","paid",[["talent","local",null,600.00,null]]],
  ["DJ Assasin",null,"363","invoice","paid",[["talent","local",null,400.00,null]]],
  ["DJ Taz",null,"01","invoice","paid",[["talent","local",null,250.00,null]]],
  ["Michael Trotman",null,"cash","invoice","paid",[["talent","local","Stilt walker",250.00,null]]],
  ["Hits 106.7",null,"1715","invoice","paid",[["marketing_media",null,"Radio promotion",2500.00,null]]],
  ["Nocturnal",null,"1212","invoice","paid",[["marketing_media",null,"Drone & video",2350.00,null]]],
  ["Wardraw Studio",null,"1716","invoice","paid",[["marketing_media",null,"Design",2030.00,null]]],
  ["Facebook/Instagram",null,"stmts","invoice","paid",[["marketing_media",null,"Sponsored ads",1034.12,null]]],
  ["Crop Over Hub c/o Reeko Lynch",null,"cash","invoice","paid",[["marketing_media",null,null,1000.00,null]]],
  ["Bajantube",null,"1718","invoice","paid",[["marketing_media",null,"Photography",800.00,null]]],
  ["Focus Photography",null,"1758","invoice","paid",[["marketing_media",null,"Photography",800.00,null]]],
  ["Coscap",null,"Coscap-2025","invoice","unpaid",[["admin_fees","compliance","Royalties 2025",7134.51,1062.59]]],
  ["Liquor License",null,"receipt","invoice","paid",[["admin_fees","licenses",null,50.00,null]]],
];

// ---------------- UV 2024 ----------------
const UV_2024_REV: RawRev[] = [
  ["ticket_sales","Early Bird $130 — online (442)",57460.00,true,"received"],
  ["ticket_sales","Early Bird $130 — stock (97)",12610.00,true,"received"],
  ["ticket_sales","Regular $150 — online (740)",111000.00,true,"received"],
  ["ticket_sales","Regular $150 — stock (975)",146250.00,true,"received"],
  ["ticket_sales","Regular $175 — online (51)",8925.00,true,"received"],
  ["ticket_sales","Door cash — 25 × 175",4375.00,true,"received"],
  ["ticket_sales","Returned online tickets (−6)",-900.00,true,"received"],
  ["ticket_sales","Comps — 231 × 0",0.00,false,"received"],
  ["bar_sales","Main Bar 1",72201.00,true,"received"],
  ["bar_sales","Main Bar 2",19235.00,true,"received"],
  ["bar_sales","Johnny Walker Cocktail Bar",11000.00,true,"received"],
  ["bar_sales","Hennessy Cocktail Bar",10365.00,true,"received"],
  ["bar_sales","Plantation Cocktail Bar",7280.00,true,"received"],
  ["bar_sales","Mocktail Bar",3405.00,true,"received"],
  ["bar_sales","Campari Cocktail Bar",2822.00,true,"received"],
  ["sponsorship","Hanschell Inniss — mixologist",15500.00,false,"received"],
  ["sponsorship","Bryden Stokes",8000.00,false,"received"],
  ["sponsorship","Hanschell — product supplied to Tims",4396.43,false,"received"],
  ["sponsorship","Stansfeld Scott",2000.00,false,"received"],
  ["sponsorship","Pina Cups — bottles",1731.80,false,"received"],
  ["sponsorship","Kentucky Fried Chicken",1000.00,false,"received"],
  ["tables_other","Regular cocktail tables — 16 × 500",8000.00,true,"received"],
  ["tables_other","Premium cocktail tables — 11 × 640",7040.00,true,"received"],
  ["tables_other","Cocktail tables at event — 6 × 500",3000.00,true,"received"],
  ["tables_other","Cocktail table at event — 1 × 100",100.00,true,"received"],
];

const UV_2024_BILLS: RawBill[] = [
  ["Hanschell Inniss","2024-07-25","90792914","invoice","paid",[["cos","drinks",null,2771.68,412.80]]],
  ["Hanschell Inniss","2024-07-26","90792691","invoice","paid",[["cos","drinks",null,78938.85,11756.85]]],
  ["Hanschell Inniss","2024-07-29","90794627","credit","paid",[["cos","drinks",null,-35510.76,-5288.84]],{parent:"90792691"}],
  ["Mario Turton",null,"MT-BB-01","credit","paid",[["cos","drinks","Stock buy-back",-3915.36,null]]],
  ["Bryden Stokes",null,"SO0024012","invoice","paid",[["cos","drinks",null,32191.15,4794.43]]],
  ["Bryden Stokes",null,"SO0024012-CN","credit","paid",[["cos","drinks",null,-8896.00,-1324.94]],{parent:"SO0024012"}],
  ["Stansfeld Scott",null,"1659497","invoice","paid",[["cos","drinks",null,8827.78,1314.78]]],
  ["Newton Wholesale","2024-07-27","326169","invoice","paid",[["cos","drinks",null,6941.30,1033.81]]],
  ["Newton Wholesale","2024-07-27","326223","credit","paid",[["cos","drinks",null,-2957.38,-440.46]],{parent:"326169"}],
  ["Fowlies",null,"cash","invoice","paid",[["cos","drinks","Monster Energy",504.00,null]]],
  ["Tims",null,"01","invoice","paid",[["cos","food","Lead caterer",52716.00,null]]],
  ["Chef Craig",null,"cash","invoice","paid",[["cos","food",null,6500.00,null]]],
  ["Trini Doubles",null,"13","invoice","paid",[["cos","food",null,4500.00,null]]],
  ["Street Pasta",null,"cash","invoice","paid",[["cos","food",null,4000.00,null]]],
  ["Bearded Hogs",null,"cash","invoice","paid",[["cos","food",null,3800.00,null]]],
  ["Purity Bakery",null,"cash","invoice","paid",[["cos","food",null,2584.96,384.99]]],
  ["Makin' Moves","2024-08-13","1645","invoice","paid",[["core_production","staging_tents_truss","Tents, truss & stage",39254.00,null]]],
  ["Ultra Bright","2024-08-10","2024105","invoice","paid",[["core_production","sound_light_power","Power, screens & lighting",5690.00,null]]],
  ["Dream Solutions","2024-08-07","1724","invoice","paid",[["core_production","sound_light_power","Sound system",5800.00,null]]],
  ["Just Cool It","2024-07-03","1025","invoice","paid",[["core_production","site_services","Evaporative cooling fans",5400.00,null]]],
  ["Nova","2024-07-27","276","invoice","paid",[["core_production","site_services","Temporary fencing",4950.00,null]]],
  ["RC Supplies & Distri","2024-07-30","489561","invoice","paid",[["core_production","furniture_shade","Overhang umbrellas",3137.50,467.29]]],
  ["C&A Tools","2024-07-27","58220","invoice","paid",[["core_production","site_services","Portable toilets",2702.50,402.50]]],
  ["Simzz","2024-07-28","138","invoice","paid",[["core_production","furniture_shade","Cocktail tables",2475.00,null]]],
  ["Infra Rentals","2024-07-28","81205-2","invoice","paid",[["core_production","site_services","Portable toilets",1962.25,292.25]]],
  ["Innotech","2024-08-06","39272","invoice","paid",[["core_production","sound_light_power","Shared bill w/ Rum Punch",1575.00,234.57]]],
  ["Williams Equipment","2024-07-27","8474579","invoice","paid",[["core_production","sound_light_power","Generators",1533.38,228.38]]],
  ["21 Degrees","2024-06-26","16931","invoice","paid",[["core_production","site_services","Misting fans for truss",1375.00,null]]],
  ["Innotech","2024-08-06","39269","invoice","paid",[["core_production","sound_light_power","Light towers (discounted)",350.00,52.13]]],
  ["Designz with Palletts","2024-07-25","0648","invoice","paid",[["core_production","furniture_shade","Bench rentals",350.00,null]]],
  ["Alvasco (Barbados) Ltd.","2024-08-29","0824-4350","invoice","paid",[["decor_merch_supplies","giveaways_supplies","Fans, wristbands, fabric",9069.62,1350.79]]],
  ["Crafted by Wood",null,"cash","invoice","paid",[["decor_merch_supplies","fabrication_signage","Photo-op fabrication (50:50)",5400.00,null]]],
  ["By AlanaM","2024-07-31","202237","invoice","paid",[["decor_merch_supplies","fabrication_signage","Fabric work — tents & stage",3000.00,null]]],
  ["Crown D Productions",null,"cash","invoice","paid",[["decor_merch_supplies","decor_florals","Event decoration",2800.00,null]]],
  ["Expressionism",null,"cash","invoice","paid",[["decor_merch_supplies","fabrication_signage","Photo-op signage",2197.26,327.25]]],
  ["Petals Perfection","2024-08-07","443","invoice","paid",[["decor_merch_supplies","decor_florals","Photo-op décor",2150.00,null]]],
  ["Print On Demand","2024-07-28","1685","invoice","paid",[["decor_merch_supplies","fabrication_signage","Event signage",952.20,null]]],
  ["Alvasco (Barbados) Ltd.",null,"cash","invoice","paid",[["decor_merch_supplies","build_labour","Assorted labour",790.00,null]]],
  ["Avinash Vaswani",null,"cash","invoice","paid",[["decor_merch_supplies","build_labour","Truss-sleeve dry cleaning",300.00,null]]],
  ["Excuse Me Miss",null,"cash","invoice","paid",[["decor_merch_supplies","giveaways_supplies","Promotion dresses",180.00,null]]],
  ["Roger Labourer",null,"cash","invoice","paid",[["decor_merch_supplies","build_labour",null,150.00,null]]],
  ["GA Print",null,"cash","invoice","paid",[["decor_merch_supplies","giveaways_supplies","Dress prints (6)",40.00,null]]],
  ["Priv4lege Entertainment","2024-08-07","202462","invoice","paid",[["event_day_ops","bar_door_mgmt","Bar management, cups & ice",11146.40,null]]],
  ["Premium Kennels & Security","2024-07-28","2","invoice","paid",[["event_day_ops","security","Security",5800.00,null]]],
  ["Envision Event & Bar Ser.","2024-08-01","119","invoice","paid",[["event_day_ops","bar_door_mgmt","Door staff & cashiers",3800.00,null]]],
  ["Eco Steam Detailing","2024-07-29","3873","invoice","paid",[["event_day_ops","cleaning","Cleanup & other",1290.00,null]]],
  ["Janelle Bruce","2024-08-07","3","invoice","paid",[["event_day_ops","promo_staff","Promo girls (4)",850.00,null]]],
  ["Amandas Cleaning Services","2024-08-07","64","invoice","paid",[["event_day_ops","cleaning","Bathroom cleaning",250.00,null]]],
  ["Mical Teja",null,"cash","invoice","paid",[["talent","foreign","Booking + per diem",15797.64,null]]],
  ["Patrick Hypeman",null,"cash","invoice","paid",[["talent","foreign","Booking + per diem",3263.88,null]]],
  ["Caribbean Airlines",null,"cash","invoice","paid",[["talent","artist_logistics","Artist flights",2303.18,null]]],
  ["Accra Beach Hotel",null,"474432","invoice","paid",[["talent","artist_logistics","Artist accommodation",1692.66,null]]],
  ["Barbados Revenue Authority",null,"receipt","invoice","paid",[["talent","foreign","Artist withholding tax",1500.00,null]]],
  ["Trident Transportation","2024-08-05","TT773-001236","invoice","paid",[["talent","artist_logistics","Artist transport",1025.00,null]]],
  ["Lead Pipe & Saddis","2024-07-29","1788","invoice","paid",[["talent","local",null,3500.00,null]]],
  ["Fadda Fox & Nikita",null,"1047","invoice","paid",[["talent","local","Split booking",3000.00,null]]],
  ["Pyramid Entertainment & Management","2024-08-06","2024077","invoice","paid",[["talent","local","Lil Rick",2937.50,null]]],
  ["GratefulCo",null,"cash","invoice","paid",[["talent","local",null,2000.00,null]]],
  ["IZAVYBE! Entertainment","2024-07-28","204","invoice","paid",[["talent","local","Rhythm section",1600.00,null]]],
  ["Salt","2024-07-29","240729-001","invoice","paid",[["talent","local",null,1500.00,null]]],
  ["Vibenation","2024-07-28","473","invoice","paid",[["talent","local","Deejay",800.00,null]]],
  ["Jesse T","2024-08-08","20239253","invoice","paid",[["talent","local","Deejay",750.00,null]]],
  ["Tionne",null,"cash","invoice","paid",[["talent","local",null,750.00,null]]],
  ["Ramon Green",null,"cash","invoice","paid",[["talent","local","Deejay",700.00,null]]],
  ["Hutchy & Sizz","2024-08-02","21","invoice","paid",[["talent","local","Deejay",600.00,null]]],
  ["Legacy Team (Niqco Vybz & Gunner)","2024-07-29","729","invoice","paid",[["talent","local","Deejay",600.00,null]]],
  ["Hits 106.7","2024-08-15","944","invoice","paid",[["marketing_media",null,"Radio promotion",3250.00,null]]],
  ["Nocturnal","2024-07-31","1177","invoice","paid",[["marketing_media",null,"Drone & video",1850.00,null]]],
  ["Wardraw Studio","2024-08-02","1695","invoice","paid",[["marketing_media",null,"Graphic design",1520.00,null]]],
  ["Facebook/Instagram",null,"stmts","invoice","paid",[["marketing_media",null,"Sponsored ads",1240.94,null]]],
  ["Reeko Lynch",null,"cash","invoice","paid",[["marketing_media",null,"Crop Over Hub",1000.00,null]]],
  ["Influencer Girl",null,"cash","invoice","paid",[["marketing_media",null,null,900.00,null]]],
  ["Bajantube",null,"cash","invoice","paid",[["marketing_media",null,"Photography",800.00,null]]],
  ["Andrew Browne Photography","2024-07-29","850","invoice","paid",[["marketing_media",null,"Photography",600.00,null]]],
  ["Malik Mings",null,"cash","invoice","paid",[["marketing_media",null,null,500.00,null]]],
  ["Focus Photography",null,"1696","invoice","paid",[["marketing_media",null,"Photography",500.00,null]]],
  ["Coscap",null,"Coscap-2024","invoice","paid",[["admin_fees","compliance","Royalties 2024",12000.00,1787.23]]],
  ["Liquor License",null,"receipt","invoice","paid",[["admin_fees","licenses",null,50.00,null]]],
];

export const EVENTS: EventRecord[] = [
  {
    id: "uv-2025",
    name: "UV 2025",
    date: "2025-07-27",
    venue: "Botanical Gardens",
    headcount: 2375,
    comps: 299,
    state: "mid-settlement",
    revenue: revenue(UV_2025_REV),
    bills: bills(UV_2025_BILLS),
    vat_return: { output_declared: 51471.52, input_claimed: 24531.48, deposits: 7918.00, net_payable: 19022.04, status: "due" },
    settlement_items: [
      { label: "Prior-year VAT repayment — 2024 balance repaid at settlement", amount: -10566.72, status: "due" },
    ],
  },
  {
    id: "uv-2024",
    name: "UV 2024",
    date: "2024-07-28",
    venue: "Botanical Gardens",
    headcount: 2555,
    comps: 231,
    state: "settled",
    revenue: revenue(UV_2024_REV),
    bills: bills(UV_2024_BILLS),
    vat_return: {
      output_declared: null, input_claimed: null, deposits: null,
      net_payable: 25566.72, status: "settled",
      note: "Return components not tracked in the 2024 workbook. 15,000.00 paid in-year; the remaining 10,566.72 was settled at the 2025 settlement.",
    },
    settlement_items: [
      { label: "COSCAP 2023 carried bill", amount: -4876.67, status: "paid" },
    ],
  },
];

export function getEvent(id: string) {
  return EVENTS.find((e) => e.id === id);
}
