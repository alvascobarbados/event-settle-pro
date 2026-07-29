# SETL — Design Analysis

The current build already honors the spec's core discipline: single accent (magenta), Unbounded/Archivo pairing, tabular numerals, dashed hairlines, one-page-per-event. It reads like a ledger, which is the point. The notes below are refinements within that envelope — not new features, no new pages.

## What's working
- Restraint. No charts, no chrome, no dashboard. Numbers lead.
- Right-aligned tabular figures with a clear amount/VAT column rhythm on the Performance sheet.
- Semantic tokens (`ink`, `hairline`, `magenta`, `panel`, `amber-*`) already in `styles.css` — refinements can stay token-only.
- The three KPI tiles (To collect / To pay / Net to settle) give the sheet a decisive top.

## Where it drifts or under-delivers

**1. Events index feels empty and generic.**
On mobile the list is two rows floating on a huge white field. The header (`SETL` + `Vendors ›`) reads like a nav bar rather than a wordmark. No visual signal separates "mid-settlement" from "settled" — they're both grey text.

**2. Vertical rhythm is soft.**
Section gaps (`mt-8`, `mt-10`) are Tailwind defaults, not tuned to Archivo's x-height. Hairlines are consistent but the space between the KPI tiles and the SUMMARY/FULL toggle, and between category groups, feels arbitrary. A ledger benefits from a fixed baseline grid.

**3. KPI tiles are the loudest thing on the page but the least specific.**
They use bordered cards while everything else uses hairlines. That inconsistency makes them feel like a bootstrap component dropped in. The magenta on "Net to settle" is doing a lot of work but the amber on "To collect/To pay" competes for the same attention.

**4. Amber "5 PENDING" pill is heavier than the number next to it.**
Pill radius + filled background reads like a shadcn Badge. In a ledger, status should be a mark, not a chip.

**5. Numeric hierarchy inside a row is flat.**
`Ticket sales 336,155.36 · VAT 50,065.69` — the VAT column and amount column are the same size and weight, so the eye can't skim. VAT should recede more.

**6. Wordmark inconsistency.**
It's large on the index (`text-2xl`) and small on the event page (`text-lg`), swapping sides. On a single-brand app the wordmark should sit in the same place at the same size on every route.

**7. Vendors page has a category+sub+VAT line that wraps awkwardly on 375px screens** and the `›` chevron column is under-weighted. It reads as a form, not a book.

**8. Empty-state / footer copy** ("Tap an event to open its Performance sheet.") sits at ledger weight but is really instructional. Belongs in a lighter, italic caption tier.

**9. No focus/hover distinction on mobile-first taps** — everything hovers to `bg-panel` (which mobile users never see) but there's no pressed state.

## Proposed adjustments (visual only)

### Typography scale
Introduce four sizes tied to purpose, not utility numbers:
- `display` (32/1.05, Unbounded 700) — event name, page H1
- `figure-lg` (28/1.0, Archivo 700, tabular) — total revenue, gross profit, net profit numbers
- `figure` (17/1.2, Archivo 600, tabular) — row amounts
- `caption` (11/1.3, Archivo 500, letter-spacing 0.06em, uppercase) — column headers, "NET PROFIT"

VAT column drops to 12px, muted, no weight. Sub-caption under a row (e.g. "50.8% of bar, computed") shrinks to 11px italic.

### Baseline grid
Vertical spacing snaps to 4px, with section breaks at 32/48/64. Replace ad-hoc `mt-8/mt-10` with three spacers: `s-section`, `s-group`, `s-row`.

### KPI tiles → KPI strip
Drop the bordered cards. Render as a three-column strip separated by a single vertical hairline, no background, no radius. Amber for "to collect"/"to pay" becomes a small dot before the number, not a full text color. Magenta stays on "Net to settle" number only. This makes the tiles feel like the ledger, not a widget.

### Status marks
Replace amber pill "5 PENDING" with a leading amber dot + small-caps "5 pending" in muted ink. Same treatment for "mid-settlement" on the index — a magenta dot rather than trailing text.

### Events index density
- Fixed wordmark position (top-left, `text-lg`) on every route; drop it from the event page's top-right.
- Add a subtle event-state dot to each row.
- Add a two-line meta: date · venue on line one, headcount · state on line two — so the row has real content on mobile.
- Consider a thin magenta rule under the currently-live event only.

### Row hierarchy
Two-column right rail: amount (600 weight, ink) and VAT (500 weight, muted, 12px). On rows with no VAT, render an em-dash at muted-40 — not a dash-in-body-color.

### Micro-motion
No animation library needed. Add:
- Pressed state: `active:bg-panel active:translate-y-[0.5px]` on all row buttons.
- Summary/Full toggle: 120ms opacity crossfade on the panels behind (Tailwind transition-opacity).

### Color audit
- Magenta is used in three places today (Net to settle, active toggle, ring). Keep those three, remove any incidental use.
- Amber earns only two uses: unpaid flag, pending flag. Remove amber from KPI numbers.
- Hairline dashed vs solid: solid for totals, dashed inside a group — already right, tighten so nothing else uses borders.

### Vendors page
- Wordmark to top-left; breadcrumb below it.
- Two-line vendor row: name (14/600), then `category · sub` on one line, `VAT · flags` on the next in 11px muted. Kills the wrap.
- Chevron becomes a right-aligned 12px caret in muted-40.

## Out of scope (would need user go-ahead)
- Any layout change to the Performance sheet math columns or the SUMMARY/FULL model.
- Adding icons, illustrations, or an empty state.
- Dark mode.
- New routes or persistence.

## Implementation notes (for later, technical)
- All work lands in `src/styles.css` (new spacing/size vars + two utilities) and the three route files + `Wordmark.tsx`.
- No new deps. No shadcn additions. No component-library refactor.
- Estimated diff: ~120 lines across 5 files.

If you want, pick any subset — I'd start with (1) KPI strip, (2) numeric hierarchy, (3) status marks, since those change the perceived quality most for the least churn.
