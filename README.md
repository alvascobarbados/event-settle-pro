# SETLUP

Event Set 



An app for promoters to budget, manage and reconcile their events quickly, easily and accurately while on the go.



# SETL — Lovable Build Prompt (v1)

Build exactly what is specified below. Do not add pages, dashboards, charts, AI features, or settings beyond this spec. Visual restraint is the product.

## 1. What SETL is

SETL is an event-settlement app for a Caribbean event promoter. The entire product is **one page per event**: a P&L-style "Performance sheet" where every category expands to its underlying vendor bills, payment status is shown by colour on the sheet itself, and VAT reconciles inside the sheet. Bills are the atom; the sheet is a computed view of bills and revenue entries. Nothing on the sheet is hand-written prose — every label and number must be renderable from fields.

## 2. Stack

- React + TypeScript + Tailwind (Lovable defaults).

- Supabase for data + file storage (bill attachments: pdf/jpg/png).

- On first run, load the seed data in §10 (SQL seed or a one-time import script — your choice, but the app must boot showing both seeded events).

- Currency: BBD, 2 decimals, comma thousands, negatives in parentheses e.g. (5,919.87). Use tabular numerals everywhere.

## 3. Pages (v1 — only these)

1. **Events index** `/` — minimal list: event name, date, headcount, net profit. Click → event sheet.

2. **Event sheet** `/event/:id` — the Performance sheet (§5). This is the app.

3. **Bill drawer** — add/edit bill, opened from the event sheet (§6). Not a separate route.

4. **Vendors** `/vendors` — simple list (name, default category/sub, VAT default, flags) with a detail view showing that vendor's bills across events with attachments. No analytics.

## 4. Design system

Tokens:

- bg `#FAF8F9` · ink `#221A20` · magenta `#CE1663` · muted `#8D7A85` · hairline `#ECE2E7`

- amber (outstanding) text `#B96A00` on `#FBEFDD` · expanded-panel bg `#FBF4F8`

- Fonts: **Unbounded 700** for the "SETL" wordmark only; **Archivo** (400–800) for everything else. `font-variant-numeric: tabular-nums`.

Layout: single centered column, max-width 680px, generous whitespace, phone-first.

Row grammar (strict):

- **Category rows**: name (+ small muted computed sub-line) | optional amber badge | AMOUNT | VAT. Chevron `›` on expandable rows, rotates 90° when open.

- **Detail tables** (inside an expanded category, on the `#FBF4F8` panel): a true four-column grid with a tiny uppercase header row — `VENDOR | INV # | AMOUNT | VAT` (revenue drill-downs use `ITEM | AMOUNT | VAT`; sponsorship uses `SPONSOR | INV # | AMOUNT | VAT`). Fixed column widths; INV # is its own left-aligned muted column (never inline after the name). A short muted descriptor may sit as a second small line under the vendor name inside its cell. Rows separated by dashed hairlines.

- **Section totals** (e.g. TOTAL COST OF SALES): 1.5px top rule, small-caps bold.

- **Milestones** (TOTAL REVENUE, GROSS PROFIT, EVENT PROFIT, NET PROFIT): 2px ink top rule, bold, larger amount; NET PROFIT uses a 2.5px **magenta** rule.

- **Amber system**: settled money is silent (no marker). Outstanding money = 7px amber dot before the name + name and amount in amber bold. Collapsed categories containing outstanding items show a small amber badge: `2 DUE` (payables) / `5 PENDING` (receivables). When everything settles, the page goes quiet.

- **Credits** render as children under their invoice: parent row = vendor + computed **net** (no inv #), then indented sub-rows `Invoice` / `Credit` with their own inv #, amount, VAT. Credit amounts in magenta parentheses.

- **Split bills**: each portion shows a tiny outlined tag `SPLIT 1/2`, `SPLIT 2/2` inside the descriptor line; both portions carry the same invoice #.

- VAT column semantics: figure = VAT within that line · `—` = line carries no VAT · blank = not applicable (result rows).

- INV # column values: the number, or `cash` / `receipt` / `stmts` when no invoice exists.

## 5. The Performance sheet (the app)

Header: breadcrumb `Events / {name}` + SETL wordmark · H1 event name · meta line `{date} · {venue} · headcount {n} ({comps} comps)`. **Headcount is a required event field** — it powers every `/ head` figure.

Status strip (3 cards): **To collect** (sum of unsettled revenue lines) · **To pay** (sum of unpaid bills + due tax + due settlement items) · **Net to settle** (collect − pay).

View control: `Summary | Full` pills (magenta active). Full expands every drill-down; Summary collapses all. Independently, **every category row toggles open/closed on tap** in either mode.

The ladder (strict order; every section closes with a total; every milestone is the child of two visible numbers; per-head small text on every total/milestone):

```

REVENUE — VAT-INCLUSIVE                       AMOUNT · VAT

  Ticket sales            ›  (drill: channels)

  Bar sales               ›  (drill: stations)

  Sponsorship             ›  (drill: sponsors, statuses)

  Tables & other          ›

TOTAL REVENUE                                  sum · vat-within sum · /head

COST OF SALES                                  AMOUNT · VAT

  Drinks   (sub: % of bar, computed)        ›  (drill: invoices & credits as parent/child)

  Food     (sub: $/head · n vendors)        ›

TOTAL COST OF SALES                            · /head

GROSS PROFIT                                   margin % · /head

EVENT COSTS                                    AMOUNT · VAT

  Core production (Venue + everything rented)›

  Décor, merch & supplies (bought + build labour) ›

  Event-day operations                       ›

  Talent (sub: foreign x · local y)          ›

  Marketing & media                          ›

  Admin, fees & compliance                   ›

TOTAL EVENT COSTS                              · /head

EVENT PROFIT                                   margin % · /head

VAT — BARBADOS REVENUE AUTHORITY

  Output VAT on revenue   ›  [GAP badge if any]

  Input VAT on purchases  ›  [GAP badge if any]

  Deposits & prepayments

  Net VAT payable — BRA        (amber while due)

NET PROFIT                                     margin % · /head   ← magenta-rule hero

SETTLEMENT — CASH ITEMS OUTSIDE THIS EVENT'S P&L

  (prior-year repayments etc., amber while due)

  Cash result after settlement items

```

VAT reconciliation drill-downs:

- **Output** expands to: VAT-within per revenue category (computed `amount × 0.175 / 1.175` on VATable lines) → `VAT sitting within all revenue` (bold) → `Declared output per the return` (from the event's VAT return record) → amber `Difference — declared scope & rate basis` when they differ. Badge on the collapsed row: `GAP {amount}`.

- **Input** expands to: VAT per cost category (summed from the VAT field on bill lines) → `VAT sitting on all bills` → `Claimed in the VAT return` → amber `Unclaimed — {vendor} inv {no}` naming the difference where identifiable. Badge: `GAP {amount}`.

- If a VAT return has no output/input components recorded (2024 seed), show the single `Net VAT payable` line with a muted note `return components not recorded`.

## 6. Bill entry (drawer)

Fields, in order: **Vendor** (searchable dropdown of the vendor book; picking one auto-applies its default category + sub + VAT treatment, shown as an editable chip row) · **Date** · **Invoice #** (free text; may be empty → pick `cash / receipt / stmts / none`) · **Amount** (VAT-inclusive) · **VAT** (auto = amount × 0.175/1.175, with `No VAT` toggle and manual override) · **Status** UNPAID/PAID segmented control · **📎 Attach the bill** (pdf/jpg/png → Supabase storage; show a file chip; files are viewable from the sheet row and the vendor page) · **Split this bill** (adds allocation lines, each with its own category/sub/amount/VAT; lines must sum to the bill total before save; a live "remaining to allocate" counter enforces this) · **Credit note** toggle (amount negative; select the parent invoice from the same vendor; renders as a child row; net computed).

Rules: one bill = one payable = one status; marking a bill paid clears every split portion everywhere at once; a split's portions all show the same invoice #; VAT on a split divides in proportion to the portions unless overridden.

## 7. Business rules (computation)

- Category amount = Σ bill lines (or revenue entries) in it; category VAT = Σ their VAT.

- Net vendor row = invoice + linked credits; VAT nets the same way.

- vat_within(x) = x × 0.175 / 1.175 for VATable revenue lines; bills carry explicit VAT from entry.

- Per head = value ÷ event.headcount (2 dp).

- To pay = Σ unpaid bills (at bill level, so splits count once) + due `Net VAT payable` + due settlement items. To collect = Σ pending revenue entries.

- Badges count documents, not lines: a split bill unpaid = +1 DUE in each category it touches, but the strip counts the money once.

- The P&L carries **only this event's own VAT**. Prior-year VAT or carried bills are settlement items below NET PROFIT, never expense lines.

- Everything on screen must be derivable from data — no free-written analysis text.

## 8. Out of scope for v1 (do not build)

Partner splits / per-partner figures · budgeting & forecasts · multi-currency · dashboards & charts · AI anything · notifications. Event profit is shown amalgamated only.

## 9. Acceptance — the seeded numbers must land here (±0.02 rounding)

UV 2025 (mid-settlement): Total Revenue **553,892.64** (233.22/head) · Total COS **179,413.01** · Gross Profit **374,479.63** (67.6%) · Total Event Costs **350,810.74** · Event Profit **23,668.89** · Net VAT payable **19,022.04** · **NET PROFIT 4,646.85** (1.96/head) · settlement item (10,566.72) → cash result **(5,919.87)** · strip: To collect **14,684.28** · To pay **108,735.59**.

UV 2024 (settled, all quiet): Total Revenue **516,796.23** (202.27/head) · Total COS **152,996.22** · Gross Profit **363,800.01** (70.4%) · Total Event Costs **195,250.91** · Event Profit **168,549.10** (32.6%) · Net VAT payable **25,566.72** · **NET PROFIT 142,982.38** (55.96/head) · settlement item (4,876.67) → cash result **138,105.71**. (The old workbook's "148,672.43 profit" reconciles: 168,549.10 − 15,000 VAT paid − 4,876.67 carried COSCAP, both of which this app correctly moves out of expenses.)

## 10. Seed data (load on first run)

Legend — bills: `[vendor, date|null, inv|"cash"|"receipt"|"stmts"|null, kind, status, lines]`, line: `[category, sub, descriptor|null, amount, vat|null]`. `credit` bills carry `parent: <inv of parent invoice>` where linked. Revenue entries: `[category, label, amount, vatable, status]`. Dates ISO. Statuses: `paid|unpaid|received|pending|due|settled`.

### Categories

```json

{"revenue":["ticket_sales","bar_sales","sponsorship","tables_other"],

 "cos":{"drinks":[],"food":[]},

 "event_costs":{

  "core_production":["venue","staging_tents_truss","sound_light_power","site_services","furniture_shade"],

  "decor_merch_supplies":["giveaways_supplies","fabrication_signage","decor_florals","build_labour"],

  "event_day_ops":["bar_door_mgmt","security","cleaning","promo_staff","ops_supplies"],

  "talent":["foreign","local","artist_logistics"],

  "marketing_media":[],

  "admin_fees":["compliance","licenses"]}}

```

### Vendor defaults (auto-create every vendor named in bills; these get explicit defaults/flags)

```json

[["Acado","drinks",null,"vat",["two_way"]],["Bryden Stokes","drinks",null,"vat",["two_way"]],

["Hanschell Inniss","drinks",null,"vat",["two_way"]],["Stansfeld Scott","drinks",null,"vat",["two_way"]],

["Newton Wholesale","drinks",null,"vat",[]],["Tims","food",null,"no_vat",[]],["Karibu","food",null,"no_vat",[]],

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

["Hits 106.7","marketing_media",null,"no_vat",[]],["Nocturnal","marketing_media",null,"no_vat",[]],

["Wardraw Studio","marketing_media",null,"no_vat",[]],["Bajantube","marketing_media",null,"no_vat",[]],

["Focus Photography","marketing_media",null,"no_vat",[]]]

```

### Events

```json

[{"id":"uv-2025","name":"UV 2025","date":"2025-07-27","venue":"Botanical Gardens","headcount":2375,"comps":299,"state":"mid-settlement"},

 {"id":"uv-2024","name":"UV 2024","date":"2024-07-28","venue":"Botanical Gardens","headcount":2555,"comps":231,"state":"settled"}]

```

### UV 2025 — revenue entries

```json

[["ticket_sales","Online — tiers, packages & MTP",199730.36,true,"received"],

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

["tables_other","Comp table — Romain Marshall",0.00,false,"received"]]

```

### UV 2025 — bills (real invoice numbers & dates from the workbook; VAT explicit)

```json

[["Bryden Stokes","2025-07-25","INV0181643","invoice","paid",[["cos","drinks",null,71212.38,10606.10]]],

["Bryden Stokes","2025-07-29","CNV0015669","credit","paid",[["cos","drinks",null,-49156.37,-7321.16]],{"parent":"INV0181643"}],

["Acado",null,null,"invoice","paid",[["cos","drinks",null,146732.55,21853.78]]],

["Acado",null,null,"credit","paid",[["cos","drinks",null,-114732.25,-17087.78]],{"parent":"Acado invoice"}],

["Stansfeld Scott","2025-07-28","1814679","invoice","paid",[["cos","drinks",null,8814.68,1312.82]]],

["Newton Wholesale","2025-07-26","364126","invoice","paid",[["cos","drinks",null,11901.00,1772.49]]],

["Newton Wholesale","2025-07-28","364250","credit","paid",[["cos","drinks",null,-7158.99,-1066.23]],{"parent":"364126"}],

["Tims",null,"49","invoice","paid",[["cos","food","Lead caterer",40000.00,null]]],

["Karibu",null,"2","invoice","paid",[["cos","food",null,20300.00,null]]],

["Flash Zone",null,null,"invoice","paid",[["cos","food",null,10000.00,null]]],

["Italia Coffee",null,null,"invoice","paid",[["cos","food",null,6500.01,968.09]]],

["Bowl'd",null,null,"invoice","paid",[["cos","food",null,6000.00,null]]],

["Trini Doubles",null,null,"invoice","paid",[["cos","food",null,5000.00,null]]],

["Green Monkey Chocolatier",null,null,"invoice","paid",[["cos","food",null,5000.00,null]]],

["The Gourmet Connoisseurs",null,"I250808273","invoice","paid",[["cos","food",null,5000.00,null]]],

["Bearded Hogs",null,null,"invoice","paid",[["cos","food",null,5000.00,null]]],

["Street Pasta",null,"52","invoice","paid",[["cos","food",null,4000.00,null]]],

["The Healthy Spot",null,"#010","invoice","paid",[["cos","food","Fruit cups",3500.00,null]]],

["The Mini Bar",null,"#7","invoice","paid",[["cos","food",null,1500.00,null]]],

["Makin' Moves","2025-08-11","1980","invoice","paid",[["core_production","staging_tents_truss","Staging, tents & truss",74303.00,null]]],

["Dream Solutions","2025-08-06","1822","invoice","paid",[["core_production","sound_light_power","Sound",14500.00,null]]],

["Botanical Garden",null,null,"invoice","paid",[["core_production","venue","Venue & cleaning",7000.00,1042.55]]],

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

["Neal Water BWA",null,null,"invoice","paid",[["core_production","site_services","Water supply",1500.00,null]]],

["Infra Rentals",null,"q104879-2","invoice","paid",[["core_production","sound_light_power","Light towers",1480.50,220.50]]],

["Mr. Benny Rowe","2025-07-25","70","invoice","paid",[["core_production","site_services","Barricades",1100.00,null]]],

["Quaison Bess","2025-07-26","56","invoice","paid",[["core_production","staging_tents_truss","Decking over muddy area",700.00,null]]],

["St. Mark Trucking & Well Digging","2025-08-07","5178","invoice","paid",[["core_production","site_services","Skip rental",420.00,null]]],

["Alvasco (Barbados) Ltd.",null,null,"invoice","unpaid",[["decor_merch_supplies","giveaways_supplies","Giveaways, fans & fabric (SPLIT 1/2 — allocation assumed)",48000.00,7148.95],["event_day_ops","ops_supplies","Wristbands & ops supplies (SPLIT 2/2)",6833.75,1017.78]]],

["Abeds",null,"SWT-A0000889921","invoice","paid",[["decor_merch_supplies","fabrication_signage","Fabric",6837.87,1018.41],["decor_merch_supplies","fabrication_signage","Fabric",502.45,74.83]]],

["Petals Paradise",null,null,"invoice","paid",[["decor_merch_supplies","decor_florals","Backwall décor",5500.00,null]]],

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

["Farmer Nappy",null,null,"invoice","paid",[["talent","foreign","Booking + per diem",21982.34,null]]],

["Viking Ding Dong",null,null,"invoice","paid",[["talent","foreign","Booking + per diem",10741.17,null]]],

["Caribbean Airlines",null,null,"invoice","paid",[["talent","artist_logistics","Artist flights",6229.16,null]]],

["Accra Beach Hotel",null,null,"invoice","paid",[["talent","artist_logistics","Artist accommodation",3528.72,null]]],

["Lead Pipe & Saddis",null,null,"invoice","paid",[["talent","local",null,3000.00,null]]],

["Jordan English",null,"cash","invoice","paid",[["talent","local",null,3000.00,null]]],

["Pyramid Entertainment & Management",null,"2025060","invoice","paid",[["talent","local","Lil Rick",2937.50,null]]],

["Patrick Hypeman",null,null,"invoice","paid",[["talent","foreign","Booking + per diem",2801.88,null]]],

["Barbados Revenue Authority",null,"receipt","invoice","paid",[["talent","foreign","Artist withholding tax",2333.33,null]]],

["Riggo Suave",null,null,"invoice","paid",[["talent","foreign","Booking + per diem",2231.62,null]]],

["GratefulCo",null,"cash","invoice","paid",[["talent","local",null,2000.00,null]]],

["Shaquille",null,"cash","invoice","paid",[["talent","local",null,1500.00,null]]],

["IZAVYBE! Entertainment",null,"239","invoice","paid",[["talent","local","Rhythm section",1500.00,null]]],

["Trident Transportation",null,null,"invoice","paid",[["talent","artist_logistics","Artist transport",1475.00,null]]],

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

["Crop Over Hub c/o Reeko Lynch",null,null,"invoice","paid",[["marketing_media",null,null,1000.00,null]]],

["Bajantube",null,"1718","invoice","paid",[["marketing_media",null,"Photography",800.00,null]]],

["Focus Photography",null,"1758","invoice","paid",[["marketing_media",null,"Photography",800.00,null]]],

["Coscap",null,null,"invoice","unpaid",[["admin_fees","compliance","Royalties 2025",7134.51,1062.59]]],

["Liquor License",null,"receipt","invoice","paid",[["admin_fees","licenses",null,50.00,null]]]]

```

### UV 2025 — VAT return & settlement items

```json

{"vat_return":{"output_declared":51471.52,"input_claimed":24531.48,"deposits":7918.00,"net_payable":19022.04,"status":"due"},

 "settlement_items":[["Prior-year VAT repayment — 2024 balance repaid at settlement",-10566.72,"due"]]}

```

### UV 2024 — revenue entries

```json

[["ticket_sales","Early Bird $130 — online (442)",57460.00,true,"received"],

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

["tables_other","Cocktail table at event — 1 × 100",100.00,true,"received"]]

```

### UV 2024 — bills (all paid; real invoice numbers & dates)

```json

[["Hanschell Inniss","2024-07-25","90792914","invoice","paid",[["cos","drinks",null,2771.68,412.80]]],

["Hanschell Inniss","2024-07-26","90792691","invoice","paid",[["cos","drinks",null,78938.85,11756.85]]],

["Hanschell Inniss","2024-07-29","90794627","credit","paid",[["cos","drinks",null,-35510.76,-5288.84]],{"parent":"90792691"}],

["Mario Turton",null,null,"credit","paid",[["cos","drinks","Stock buy-back",-3915.36,null]]],

["Bryden Stokes",null,"SO0024012","invoice","paid",[["cos","drinks",null,32191.15,4794.43]]],

["Bryden Stokes",null,"SO0024012","credit","paid",[["cos","drinks",null,-8896.00,-1324.94]],{"parent":"SO0024012"}],

["Stansfeld Scott",null,"1659497","invoice","paid",[["cos","drinks",null,8827.78,1314.78]]],

["Newton Wholesale","2024-07-27","326169","invoice","paid",[["cos","drinks",null,6941.30,1033.81]]],

["Newton Wholesale","2024-07-27","326223","credit","paid",[["cos","drinks",null,-2957.38,-440.46]],{"parent":"326169"}],

["Fowlies",null,null,"invoice","paid",[["cos","drinks","Monster Energy",504.00,null]]],

["Tims",null,"01","invoice","paid",[["cos","food","Lead caterer",52716.00,null]]],

["Chef Craig",null,null,"invoice","paid",[["cos","food",null,6500.00,null]]],

["Trini Doubles",null,"13","invoice","paid",[["cos","food",null,4500.00,null]]],

["Street Pasta",null,null,"invoice","paid",[["cos","food",null,4000.00,null]]],

["Bearded Hogs",null,null,"invoice","paid",[["cos","food",null,3800.00,null]]],

["Purity Bakery",null,null,"invoice","paid",[["cos","food",null,2584.96,384.99]]],

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

["Crafted by Wood",null,null,"invoice","paid",[["decor_merch_supplies","fabrication_signage","Photo-op fabrication (50:50)",5400.00,null]]],

["By AlanaM","2024-07-31","202237","invoice","paid",[["decor_merch_supplies","fabrication_signage","Fabric work — tents & stage",3000.00,null]]],

["Crown D Productions",null,null,"invoice","paid",[["decor_merch_supplies","decor_florals","Event decoration",2800.00,null]]],

["Expressionism",null,null,"invoice","paid",[["decor_merch_supplies","fabrication_signage","Photo-op signage",2197.26,327.25]]],

["Petals Perfection","2024-08-07","443","invoice","paid",[["decor_merch_supplies","decor_florals","Photo-op décor",2150.00,null]]],

["Print On Demand","2024-07-28","1685","invoice","paid",[["decor_merch_supplies","fabrication_signage","Event signage",952.20,null]]],

["Alvasco (Barbados) Ltd.",null,"cash","invoice","paid",[["decor_merch_supplies","build_labour","Assorted labour",790.00,null]]],

["Avinash Vaswani",null,"cash","invoice","paid",[["decor_merch_supplies","build_labour","Truss-sleeve dry cleaning",300.00,null]]],

["Excuse Me Miss",null,null,"invoice","paid",[["decor_merch_supplies","giveaways_supplies","Promotion dresses",180.00,null]]],

["Roger Labourer",null,"cash","invoice","paid",[["decor_merch_supplies","build_labour",null,150.00,null]]],

["GA Print",null,null,"invoice","paid",[["decor_merch_supplies","giveaways_supplies","Dress prints (6)",40.00,null]]],

["Priv4lege Entertainment","2024-08-07","202462","invoice","paid",[["event_day_ops","bar_door_mgmt","Bar management, cups & ice",11146.40,null]]],

["Premium Kennels & Security","2024-07-28","2","invoice","paid",[["event_day_ops","security","Security",5800.00,null]]],

["Envision Event & Bar Ser.","2024-08-01","119","invoice","paid",[["event_day_ops","bar_door_mgmt","Door staff & cashiers",3800.00,null]]],

["Eco Steam Detailing","2024-07-29","3873","invoice","paid",[["event_day_ops","cleaning","Cleanup & other",1290.00,null]]],

["Janelle Bruce","2024-08-07","3","invoice","paid",[["event_day_ops","promo_staff","Promo girls (4)",850.00,null]]],

["Amandas Cleaning Services","2024-08-07","64","invoice","paid",[["event_day_ops","cleaning","Bathroom cleaning",250.00,null]]],

["Mical Teja",null,null,"invoice","paid",[["talent","foreign","Booking + per diem",15797.64,null]]],

["Patrick Hypeman",null,null,"invoice","paid",[["talent","foreign","Booking + per diem",3263.88,null]]],

["Caribbean Airlines",null,null,"invoice","paid",[["talent","artist_logistics","Artist flights",2303.18,null]]],

["Accra Beach Hotel",null,"474432","invoice","paid",[["talent","artist_logistics","Artist accommodation",1692.66,null]]],

["Barbados Revenue Authority",null,"receipt","invoice","paid",[["talent","foreign","Artist withholding tax",1500.00,null]]],

["Trident Transportation","2024-08-05","TT773-001236","invoice","paid",[["talent","artist_logistics","Artist transport",1025.00,null]]],

["Lead Pipe & Saddis","2024-07-29","1788","invoice","paid",[["talent","local",null,3500.00,null]]],

["Fadda Fox & Nikita",null,"1047","invoice","paid",[["talent","local","Split booking",3000.00,null]]],

["Pyramid Entertainment & Management","2024-08-06","2024077","invoice","paid",[["talent","local","Lil Rick",2937.50,null]]],

["GratefulCo",null,null,"invoice","paid",[["talent","local",null,2000.00,null]]],

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

["Reeko Lynch",null,null,"invoice","paid",[["marketing_media",null,"Crop Over Hub",1000.00,null]]],

["Influencer Girl",null,null,"invoice","paid",[["marketing_media",null,null,900.00,null]]],

["Bajantube",null,null,"invoice","paid",[["marketing_media",null,"Photography",800.00,null]]],

["Andrew Browne Photography","2024-07-29","850","invoice","paid",[["marketing_media",null,"Photography",600.00,null]]],

["Malik Mings",null,null,"invoice","paid",[["marketing_media",null,null,500.00,null]]],

["Focus Photography",null,"1696","invoice","paid",[["marketing_media",null,"Photography",500.00,null]]],

["Coscap",null,null,"invoice","paid",[["admin_fees","compliance","Royalties 2024",12000.00,1787.23]]],

["Liquor License",null,"receipt","invoice","paid",[["admin_fees","licenses",null,50.00,null]]]]

```

### UV 2024 — VAT return & settlement items

```json

{"vat_return":{"output_declared":null,"input_claimed":null,"deposits":null,"net_payable":25566.72,"status":"settled",

  "note":"Return components not tracked in the 2024 workbook. 15,000.00 paid in-year; the remaining 10,566.72 was settled at the 2025 settlement."},

 "settlement_items":[["COSCAP 2023 carried bill",-4876.67,"paid"]]}

```

---

Build the sheet first, seed both events, and check every number against §9 before touching anything else. If the visual output drifts from §4, I will paste a reference HTML mockup in a follow-up message — match it exactly.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://event-settle-pro.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5b36a756-aa55-42f4-a8b5-9248f8006ce3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
