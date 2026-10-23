# HangarShopApp — Design System & #22 Guided Phone Audit Prototype Spec (v3)

**Repository:** `caw1517/HangarShopApp`  
**Target Deliverable:** Issue [#22 — Prototype the guided phone audit flow](https://github.com/caw1517/HangarShopApp/issues/22) (unblocked by [comment #6353184187](https://github.com/caw1517/HangarShopApp/issues/22#issuecomment-6353184187))  
**Chosen Visual Direction (v3 — Selected by Canaan from `/workspace/refs/`):**
- **Primary Product Benchmark:** **Asset Panda + MaintainX** (with **InvenTree** location/lot hierarchy touches).
- **Why Chosen:** Feels like real, modern, field-proven industrial maintenance and asset-management software—clean, tactile, high-contrast, and immediately legible in a hangar—and scales naturally as HangarShopApp expands into Work Orders, Fleet Maintenance, and Cost Programs.
- **Anti-Cosplay Rule:** Zero retro terminal cosplay—no `[F1]`/`[F2]` function-key prefixes, no all-caps monospace form headers, no `MSG` syslog tickers, no cryptic 3-letter `SVC`/`OVD`/`WRL` codes, and no Unicode emojis. Everything uses 100% proportional `Inter` sans-serif in natural Sentence/Title Case with `tabular-nums`, crisp SVG icons, `6px–8px` radii, and `1px solid #E2E8F0` hairlines.

**Source Issues & Settled Decisions Incorporated:**
- [#1 — Release 1 Wayfinder Map](https://github.com/caw1517/HangarShopApp/issues/1) · [#5 — Durable QR Labels](https://github.com/caw1517/HangarShopApp/issues/5) · [#6 — Phone QR & Offline Research](https://github.com/caw1517/HangarShopApp/issues/6) · [#10 — Roles, Permissions & Auth](https://github.com/caw1517/HangarShopApp/issues/10) · [#11 — Usage Logging](https://github.com/caw1517/HangarShopApp/issues/11) · [#12 — Location Model](https://github.com/caw1517/HangarShopApp/issues/12) · [#13 — Tool Lifecycle States](https://github.com/caw1517/HangarShopApp/issues/13) · [#14 — Consumable Lots & Expiry](https://github.com/caw1517/HangarShopApp/issues/14) · [#17 — Guided Phone Audit Scope & Findings](https://github.com/caw1517/HangarShopApp/issues/17) · [#18 — Hangar Offline Behavior](https://github.com/caw1517/HangarShopApp/issues/18) · [#20 — End-to-End QR Labels](https://github.com/caw1517/HangarShopApp/issues/20) · [#23 — Apex Charter MX 10+ Seat Manual Procedures](https://github.com/caw1517/HangarShopApp/issues/23)

---

## Part 1: Reference Screenshot Architecture (`/workspace/refs/`)

Every screen and component in v3 is anchored directly to the real product patterns reviewed by Canaan in `/workspace/refs/`:

| Reference File | Product | Specific Pattern Adopted in HangarShopApp v3 |
| :--- | :--- | :--- |
| `assetpanda-inventory-table.png` | Asset Panda | **2-line stacked table cells:** Column 1 checkbox/verification square; Column 2 bold ID (`TL-0142`) + small uppercase category chip (`CAL TOOL`, `LOT`); Column 3 bold item name (`Torque Wrench, 3/8" Drive`) + specs (`P/N QD3R100A • S/N 884021`); Column 4 stock/cal level (**4 on hand** / `Expected: 4 cartridges`); Column 5 single soft-fill status pill with leading dot; Column 6 Last Counted (**Today** / `4:18 PM`); Column 7 map-pin icon + bold primary location (**Cabinet C-04**) + gray child spot (`Drawer D1`). |
| `assetpanda-asset-register.png` | Asset Panda | **Activity log cell & status pills:** Colored status dot + action phrase (`• Checked SAT`, `• Counted 2.5 qt`, `• Segregated QB-1`) above timestamp and user attribution (`By J. Miller`). |
| `assetpanda-audit-workflow.png` | Asset Panda | **Mobile Open/Closed Audit Cards & Desktop Verification Squares:** Mobile hub cards with `%` completion pill badges (`63%` in teal/blue pill) and breadcrumb paths (`Hangar 1 / Tool Crib A / Cabinet C-04`). Desktop/list audit rows lead with a **28px–32px rounded-square verification indicator**: **Teal checkmark square** (`#0D9488`) for verified/SAT, **Red square** (`#DC2626`) for flagged/quarantine/missing, and **Blue/Slate square** (`#3B82F6` / `#CBD5E1`) for unchecked/remaining. |
| `assetpanda-mobile-barcode-scan.png` | Asset Panda | **Mobile Camera Scanner + Floating Recognition Card + Offline Bar:** Live rear-camera viewfinder with top translucent icon bar (Scan, Manual Text, Torch Flash, Camera Flip), a **floating white card with a Teal header (`#0D9488`)** showing `Item: Torque Wrench 3/8"` / `Location: Cabinet C-04 / Drawer D1` / `Item #: TL-0188`, a centered **`Record Found`** confirmation toast with teal circular checkmark, and a dark-slate bottom bar (`Lost connection, working offline · 3 queued`) with a cloud-slash SVG icon. |
| `assetpanda-asset-detail.png` | Asset Panda | **Dual Left Sidebar + Horizontal Detail Tabs:** Narrow dark-slate icon rail (`56px`, `#0F172A`) + secondary white `Collections & Location Tree` sidebar (`240px`) with soft teal active row highlight + clean horizontal detail tabs (`Checklist & Audit`, `Discrepancies & Variances`, `Official Audit PDF`, `Visual Tokens`) underlined in Teal/Blue. |
| `maintainx-work-orders.png` | MaintainX | **3-Pane Split Workspace + 4 Tactile Square Status Buttons:** Left dark nav rail + middle filterable item list (`Remaining` / `Checked` / `All` tabs + left `3px` blue selection bar `#2563EB`) + right detail pane featuring **4 large square tactile status selector buttons (`6px–8px` radius)** for tool checks (`Present / SAT`, `Can't Find`, `Damaged / UNSAT`, `Wrong Location`), where the active choice fills solid MaintainX Blue (`#2563EB`) or semantic Red/Teal. |
| `maintainx-cycle-counts.png` | MaintainX | **Mobile Cycle Count Progress Card + Circular `-`/`+` Steppers:** White progress header card (`Checked items: 5 of 8` + horizontal `#2563EB` progress bar + `Scan` and `Sign-Off` quick buttons) above the part counter card featuring a **large Red circular `−` button (`48px–52px`)**, a **central blue-bordered numeric display box**, a **large Green circular `+` button (`48px–52px`)**, and a full-width bright blue **`Save and Count Next Item`** (`#2563EB`, `52px–56px`) primary CTA. |
| `maintainx-parts-inventory.png` | MaintainX | **Mobile Inventory Row Hierarchy:** Clean white cards/rows with item thumbnail/icon on the left, bold Title Case name on line 1, `At Drawer D2 • P/N PR-1422B2` in muted slate on line 2, and right-aligned unit quantity (`4 Cartridges`, highlighted in soft red/coral when expired or in variance). |
| `inventree-stock-location.png` & `inventree-part-stock.png` | InvenTree | **Location Subtree & Lot/Batch Hierarchy:** Explicit hierarchical path strings (`Hangar 1 / Tool Crib A / Cabinet C-04 / Drawer D1`), location type badges (`Cabinet`, `Drawer`, `Shelf`, `Toolbox`, `Mobile Kit`), and batch/expiry columns for split consumable lots. |

---

## Part 2: Modern Industrial SaaS Visual Tokens (Asset Panda + MaintainX)

### 2.1 Color Palette (Light Slate Canvas, Pure White Surfaces, MaintainX Blue & Asset Panda Teal)

Designed for high legibility in sunlit hangars (**Light Mode**, default) and dim aircraft/cabinet interiors (**Dark Mode**).

| Token | Light Mode (Default Industrial SaaS) | Dark Mode (Night Shift / Wheel-Well) | Usage |
| :--- | :--- | :--- | :--- |
| `--bg-canvas` | `#F8FAFC` (Slate 50) | `#0B0F19` (Slate 950) | App background behind cards and panes |
| `--bg-surface` | `#FFFFFF` (Pure White) | `#111827` (Slate 900) | Cards, table rows, detail panes, modals |
| `--bg-subtle` | `#F1F5F9` (Slate 100) | `#1E293B` (Slate 800) | Table header row, spot group bars, input backgrounds |
| `--bg-nav-rail` | `#0F172A` (Slate 900) | `#090D16` (Slate 950) | Far-left vertical icon navigation rail (`56px` wide) |
| `--bg-offline-bar` | `#1E293B` (Slate 800) | `#1E293B` (Slate 800) | Bottom `Lost connection, working offline` status bar |
| `--text-primary` | `#0F172A` (Slate 900) | `#F8FAFC` (Slate 50) | Item names, primary numbers, headers |
| `--text-secondary` | `#475569` (Slate 600) | `#CBD5E1` (Slate 300) | Specs (`P/N`, `S/N`), location subtext, timestamps |
| `--text-muted` | `#64748B` (Slate 500) | `#94A3B8` (Slate 400) | Column headers, helper labels, captions |
| `--border-hairline` | `#E2E8F0` (Slate 200) | `#1E293B` (Slate 800) | `1px solid` row dividers, card borders, pane splits |
| `--border-input` | `#CBD5E1` (Slate 300) | `#334155` (Slate 700) | Form inputs, unselected tactile status buttons |
| `--mx-blue` | `#2563EB` (Blue 600) | `#3B82F6` (Blue 500) | **MaintainX Primary Action Blue:** Primary CTAs (`Save and Count Next Item`), active tactile status button, progress bar fill, active row left bar |
| `--mx-blue-soft` | `#EFF6FF` (Blue 50) | `#172554` (Blue 950) | Selected list row background, active filter chip fill |
| `--ap-teal` | `#0D9488` (Teal 600) | `#14B8A6` (Teal 500) | **Asset Panda Teal:** Verified check square, scanner recognition card header, completion `%` badge, active collection tree dot |
| `--ap-teal-soft` | `#F0FDFA` (Teal 50) | `#042F2E` (Teal 950) | Active sidebar tree item background, verified banner |
| `--step-minus-red` | `#EF4444` (Red 500) | `#EF4444` (Red 500) | MaintainX circular `-` quantity stepper button |
| `--step-plus-green` | `#10B981` (Emerald 500) | `#10B981` (Emerald 500) | MaintainX circular `+` quantity stepper button |

---

### 2.2 Semantic Status Pills & Left Verification Squares

#### A. Left-Column Audit Verification Squares (`assetpanda-audit-workflow.png`)
Every row in the audit checklist/table starts with a `28px × 28px` (`6px` radius) verification status square:
- **Verified / SAT / Counted:** Solid Teal `#0D9488` (or soft `#CCFBF1` with `#0D9488` border) + white checkmark SVG.
- **Flagged / Discrepancy (`Overdue`, `Expired`, `Damaged / UNSAT`, `Quarantined`, `Missing`):** Solid Red `#DC2626` (or soft `#FEE2E2` with `#DC2626` border) + white exclamation/octagon SVG.
- **Wrong Location / Variance:** Solid Amber `#D97706` + white swap/delta SVG.
- **Unchecked / Remaining:** Soft Blue/Slate `#EFF6FF` with `1.5px solid #93C5FD` (`#CBD5E1` in neutral view) empty rounded square.

#### B. Soft-Fill Status Pills (`assetpanda-inventory-table.png` & `assetpanda-asset-register.png`)
- **Shape:** `height: 24px`, `padding: 0 10px`, `border-radius: 9999px` (soft pill) or `6px`, `font-size: 12px`, `font-weight: 600`, Sentence/Title Case, with a `6px` leading colored circle dot (or crisp SVG icon for stop-use states):

| Status Pill Text | Light (`bg` / `text` / `dot`) | Dark (`bg` / `text` / `dot`) | Domain Rule (#13, #14, #17, #18) |
| :--- | :--- | :--- | :--- |
| `• Serviceable` | `#ECFDF5` / `#065F46` / `#10B981` | `#064E3B` / `#A7F3D0` / `#10B981` | Nominal serviceable tool or lot (#13, #14). |
| `• Due Soon · 14d` | `#FFFBEB` / `#92400E` / `#F59E0B` | `#451A03` / `#FDE68A` / `#F59E0B` | Within the shop's 90-day due-soon window (#1, #13, #14). |
| `• Pending Verification` | `#FFF7ED` / `#9A3412` / `#F97316` | `#431407` / `#FED7AA` / `#FB923C` | Mechanic/borrowed cert awaiting `Cal Designee` (#10, #13). |
| `• Needs Cal` | `#FEF3C7` / `#92400E` / `#D97706` | `#451A03` / `#FDE68A` / `#F59E0B` | New tool without OEM cert or reinstated tool (#13). |
| `• Out for Cal` | `#EFF6FF` / `#1E40AF` / `#3B82F6` | `#172554` / `#BFDBFE` / `#60A5FA` | At cal vendor; keeps its home location (#12, #13). |
| `• Overdue — Do Not Use` | `#FEF2F2` / `#991B1B` / `#DC2626` | `#450A0A` / `#FECACA` / `#EF4444` | Past end-of-month cal due date (#13). Triggers Stop & Segregate modal. |
| `• Unserviceable` | `#FEF2F2` / `#991B1B` / `#DC2626` | `#450A0A` / `#FECACA` / `#EF4444` | Damaged/malfunctioning or failed cal (#13). Inspector/Admin clears. |
| `• Expired — Segregate` | `#FEF2F2` / `#991B1B` / `#DC2626` | `#450A0A` / `#FECACA` / `#EF4444` | Past effective expiry (#14). Triggers Stop & Segregate modal. |
| `• Quarantined` | `#FEF2F2` / `#991B1B` / `#DC2626` | `#450A0A` / `#FECACA` / `#EF4444` | Suspect/damaged lot or missing cert (#14). Inspector/Admin clears. |
| `• Missing` | `#FFF1F2` / `#9F1239` / `#E11D48` | `#4C0519` / `#FECDD3` / `#F43F5E` | Flagged `Can't Find` (#13, #17). 30-day review clock. |
| `• Reference Only` | `#F1F5F9` / `#334155` / `#64748B` | `#1E293B` / `#CBD5E1` / `#94A3B8` | Uncalibrated reference tool (#13); excluded from cal-record audit. |
| `• Retired` / `• Depleted` | `#F1F5F9` / `#64748B` / `#94A3B8` | `#1E293B` / `#94A3B8` / `#64748B` | Inactive historical records (#13, #14). |

#### C. Category Micro-Chips (`assetpanda-inventory-table.png`)
- Rendered directly beneath the SKU / Tool ID in stacked cells:
  - `CAL TOOL` (`#EEF2FF` bg, `#4338CA` indigo text, `10px` bold, `4px` radius)
  - `REF TOOL` (`#F1F5F9` bg, `#475569` slate text, `10px` bold, `4px` radius)
  - `LOT · SEALANT` / `LOT · ADHESIVE` / `LOT · AEROSOL` (`#F0FDFA` bg, `#0F766E` teal text, `10px` bold, `4px` radius)

---

### 2.3 Typography Scale (`Inter` Proportional Sans + `tabular-nums`)

- **Primary Font Family (`--font-sans`):** `'Inter'`, `-apple-system`, `BlinkMacSystemFont`, `'Segoe UI'`, sans-serif with `font-variant-numeric: tabular-nums` enabled globally so all counts, dates, percentages, and quantities align vertically in tables and cards.
- **Technical Identifier Styling (`--font-id`):** Raw aviation identifiers (`TL-0142`, `LOT-2024-88A`, `QD3R100A`, `SN-884021`, `/q/K7M2QX`, `IA 3849201`) use medium/semibold `Inter` with `tabular-nums` or subtle `'JetBrains Mono'` (`font-feature-settings: "zero" 1, "tnum" 1`) at `12px–13px` so `0`/`O` and `1`/`I` are unmistakable without turning the UI into a retro terminal.
- **Casing Discipline:**
  - **Title Case** for screen headers, card titles, button labels (`Save and Count Next Item`, `Confirm Segregation`), and status pills (`Serviceable`, `Overdue — Do Not Use`).
  - **Sentence case** for descriptions, helper notices, audit notes, and instructions (`Scan the QR code or tap an item to record presence or count`).
  - **Small uppercase (`11px`, `letter-spacing: 0.04em`)** reserved strictly for table column headers (`ITEM / SPECS`, `STOCK / EXPECTED`, `STATUS`, `LAST COUNTED`, `STORAGE LOCATION`) and micro category chips (`CAL TOOL`, `LOT`).

| Token | Size / Line Height | Weight | Usage |
| :--- | :--- | :--- | :--- |
| `h1-page` | `20px / 28px` | `700` | Page title (`Cabinet C-04 Audit`, `Vehicle & Tool Audits`) |
| `h2-card` | `16px / 24px` | `600` | Detail pane item title, modal header, cycle-count progress (`Checked items: 5 of 8`) |
| `cell-primary` | `14px / 20px` | `600` | Primary line in stacked table cell (Item name, bold SKU/ID, bold location name, **4 on hand**) |
| `cell-secondary` | `12.5px / 18px` | `400` | Secondary line in stacked table cell (`P/N QD3R100A • S/N 884021`, `Drawer D1`, `9:42 AM`) |
| `table-th` | `11px / 16px` | `600` | Table column headers (`#64748B`, uppercase) |
| `stepper-value` | `24px / 32px` | `700` | Central quantity box between circular `-` and `+` steppers (`tabular-nums`) |
| `btn-label` | `14px / 20px` | `600` | Primary & secondary action buttons |

---

### 2.4 Geometry, Borders, Shadows & Responsive Breakpoints

- **Corner Radius:**
  - `--radius-card`: `8px` (cards, modals, scanner recognition card, table wrapper, tactile status buttons)
  - `--radius-control`: `6px` (buttons, inputs, dropdowns, verification check squares, quantity display box)
  - `--radius-pill`: `9999px` (status pills, `%` completion badges, circular `-`/`+` stepper buttons)
- **Borders & Shadows:**
  - `1px solid #E2E8F0` (`--border-hairline`) between all table rows, card edges, and split panes.
  - Subtle elevation shadow `0 1px 3px rgba(15, 23, 42, 0.06)` on cards and `0 10px 25px rgba(15, 23, 42, 0.14)` on floating modals and the camera recognition overlay card.
- **Glove-Friendly Touch Targets:**
  - Minimum `44px–48px` height for all list rows, filter tabs, and buttons.
  - `48px–52px` diameter for MaintainX circular `-` and `+` stepper buttons.
  - `52px–56px` height for primary bottom CTA buttons (`Save and Count Next Item`, `Scan QR Code`, `Sign Audit Record`) and the 4 square tactile status selector buttons (`72px–84px` tall in a 2×2 or 4-up grid).
- **Responsive Breakpoints:**
  - **Phone (`390px × 844px`):** MaintainX Cycle Count & Asset Panda Mobile Audit layout. Top app bar + `Checked items: 5 of 8` progress card + `Remaining (3)` / `Checked (5)` / `All (8)` tabs + spot/category filter chips + stacked 2-line item cards with left verification squares + sticky bottom bar (`+ Unrecorded`, `Scan QR`, `Sign-Off`) and bottom `Lost connection, working offline` status bar when offline.
  - **Tablet (`820px × 1180px`):** MaintainX 3-Pane / 2-Pane Split View. Left dark icon rail (`56px`) + middle scrollable item list (`340px`, with blue left selection bar) + right pinned item detail & cycle count pane (`424px`, showing the 4 square tactile status buttons for tools or the red `-` / green `+` circular stepper for consumable lots, or the live camera scanner).
  - **Desktop (`1280px+`):** Asset Panda Dual-Sidebar + Full 8-Column Stacked-Cell Verification Table (`assetpanda-inventory-table.png` & `assetpanda-audit-workflow.png` + `assetpanda-asset-detail.png`). Far-left dark nav rail (`56px`) + collapsible `Collections & Location Tree` sidebar (`240px`) + main workspace with horizontal tabs (`Audit Checklist`, `Discrepancies & Variances`, `Official Audit PDF`, `Visual Tokens`) + slide-over/right inspection drawer.

---

## Part 3: Screen-by-Screen Flow & Interaction Spec (All 13 Settled Decisions)

### Screen 1: Audit Hub, Collections Sidebar & Location Tree (`assetpanda-audit-workflow.png` + `assetpanda-asset-detail.png` + `inventree-stock-location.png`)

1. **Open / In-Progress Audit Cards (Mobile & Tablet Hub):**
   - Segmented pill toggle at top: **`Open (4)`** (active `#0D9488` teal fill) | **`Closed (12)`**.
   - **4 Audit Mode Cards (#17)** styled after `assetpanda-audit-workflow.png`:
     - **Cabinet C-04 Physical Location Audit** *(In Progress)* — **63%** completion pill (`#0D9488` teal), status pill `In Progress • 5 of 8 checked`, breadcrumb path `Hangar 1 / Tool Crib A / Cabinet C-04`, snapshot badge `Snapshot cached 4:10 PM`.
     - **Monthly Calibration-Record Audit** *(Open)* — Badge `Due in 7d • Oct 2026`, scope `Calibrated Tools (excl. Reference Only) • Pending Verification, Overdue, Out for Cal, Missing ≥30d`, signer requirement `Cal Designee`.
     - **Monthly Expired-Materials Check** *(Open)* — Badge `Satisfactory • Last 09-24-2026`, scope `Shelf-life lots • Expired, Due Soon (≤90d), Quarantined`, signer requirement `Inspector / Admin / Cal Designee`.
     - **Annual Facility / Area Audit** *(Open)* — Badge `Next Due 02-15-2027`, scope `SAT / UNSAT / N/A checkpoints • Enforces Auditor Independence`, signer requirement `Designated Auditor + Admin Closure`.
2. **Location Tree & QR Jump (#12, #20):**
   - Prominent button: **`Scan Location QR (/q/LOC-C04)`** (jumps straight to `Cabinet C-04` and expands its child spots `Drawer D1`, `Drawer D2`, `Drawer D3`, `Shelf S1`).
   - Collapsible hierarchical tree (`Hangar 1 > Tool Crib A > Cabinet C-04 > D1, D2, D3, S1`, `Line Box 2`) with InvenTree-style location type tags (`Cabinet`, `Drawer`, `Shelf`) and item count badges (`8 items`).

---

### Screen 2: Active Audit Checklist & Progress Header (`maintainx-cycle-counts.png` + `maintainx-work-orders.png` + `assetpanda-inventory-table.png`)

1. **Cycle Count Progress Header Card (`maintainx-cycle-counts.png`):**
   - Clean white card at top of checklist:
     - Left: **`Checked items: 5 of 8`** (`63%` teal pill) + `2 Discrepancies` badge + horizontal `#2563EB` blue progress bar.
     - Right quick action buttons: **`Scan QR`** (blue QR icon), **`Pause / Hand Off`**, and **`Sign-Off`**.
2. **Status Tabs & Child-Spot Filter Chips (`maintainx-work-orders.png`):**
   - **Primary Tabs:** `Remaining (3)` · `Checked (5)` · `All Items (8)`
   - **Spot & Category Filter Pills:** `All Spots` · `Drawer D1 (2/4)` · `Drawer D2 (2/3)` · `Shelf S1 (1/1)` · `Drawer D3 (0)` | `Tools (5)` · `Consumables (3)` · `Findings (2)`
3. **Checklist Rows (Mobile 2-Line Cards vs. Desktop 8-Column Stacked-Cell Table):**
   - **Left Verification Square (`28px`):** Teal `✓` (`#0D9488`) if verified/counted; Red `!` (`#DC2626`) if overdue/expired/flagged; Blue/Gray empty square if remaining.
   - **Stacked Cell Content:**
     - **ID + Category Chip:** `TL-0142` + `CAL TOOL` chip (or `LOT-2024-88A` + `LOT · SEALANT` chip).
     - **Item & Specs:** Bold **Torque Wrench, 3/8" Dr, 20–100 ft-lb** with `P/N QD3R100A • S/N SN-884021 • Cal Due 2026-10-08` below.
     - **Stock / Expected:** **1 expected** (tool) or **2.5 of 3 QT counted** (`Δ -0.5 QT` variance note).
     - **Status Pill:** Soft-fill pill with leading dot (`• Serviceable`, `• Due Soon · 14d`, `• Overdue — Do Not Use`, `• Expired — Segregate`).
     - **Last Counted / Sync:** **Today, 4:18 PM** + `Pending sync` (amber dot) or `Synced` (teal/green dot).
     - **Storage Location:** Map-pin SVG + **Cabinet C-04** / `Drawer D1`.

---

### Screen 3: Mobile Barcode/QR Scanner & Recognition Overlay (`assetpanda-mobile-barcode-scan.png`)

1. **Camera Viewfinder & Top Control Bar:**
   - Top bar: `Cancel` (blue link) | **Scan Code** (bold title) | `Review (5/8)` (blue link).
   - Translucent dark control buttons inside top of viewfinder: **Scan Mode**, **Manual Text Search**, **Torch Flash (`ON`/`OFF`)**, **Simulate Scans**.
2. **Floating Item Recognition Card (`assetpanda-mobile-barcode-scan.png`):**
   - Superimposed over the viewfinder when a code is scanned:
     - **Teal Header (`#0D9488`, white text):**
       - `Item: Torque Wrench, 1/4" Dr, 30–200 in-lb`
       - `Location: Cabinet C-04 / Drawer D1`
       - `Item #: TL-0188 • QR: /q/Z2V6KD`
     - **White Body:** Shows QR/barcode preview + current status pill (`• Serviceable`) + instant action buttons.
3. **`Record Found` Confirmation Toast (`assetpanda-mobile-barcode-scan.png`):**
   - Centered rounded white toast card with a **teal circular checkmark badge**, bold **`Record Found`**, and item ID `TL-0188` below.
4. **Manual ID / P/N / S/N / Lot Search & Damaged Label Reprint (#5, #20):**
   - Search input (`Search Tool ID, P/N, S/N, or Lot #...`) for tiny or solvent-worn labels + **`Flag Damaged Label for Reprint (12mm TZe)`** button.

---

### Screen 4: Immediate Stop & Segregate Alert Modal (`#13`, `#14`, `#23`)

Triggered automatically when scanning or tapping an **`Overdue — Do Not Use`** tool (`TL-0142`) or **`Expired — Segregate`** consumable lot (`LOT-2024-88A`):
- High-contrast red header banner (`#DC2626`) with octagon stop icon: **`Stop — Do Not Leave in Serviceable Storage`**.
- White structured card body showing item details (`TL-0142 • Torque Wrench 3/8" Dr • Cal Due 2026-10-08 (14 days overdue)` or `LOT-2024-88A • PR-1422 B-2 Sealant • Expired 2026-09-30`).
- Numbered physical segregation steps (`1. Attach red UNSERVICEABLE / EXPIRED tag`, `2. Place in Quarantine Bin QB-1 / QB-2`, `3. Do not issue or return to cabinet`).
- Required acknowledgement checkbox (`I have physically red-tagged and segregated this item to QB-1 / QB-2`) + **`Confirm Segregation`** primary button + **`Can't Segregate Now — Escalate to Inspector`** secondary button.

---

### Screen 5A: Tool Check Detail Pane — 4 Tactile Square Status Buttons (`maintainx-work-orders.png`)

When a tool (`Calibrated` or `Reference Only`) is selected, the detail pane displays item metadata (4-column grid: `Tool ID`, `P/N & S/N`, `Cal Due Date`, `Assigned Spot`) followed by **MaintainX's 4 large square tactile status selector buttons (`6px–8px` radius)**:
1. **`Present / SAT`** (Checkmark icon — fills Teal `#0D9488` or MaintainX Blue `#2563EB` when active)
2. **`Can't Find`** (Search/Question icon — flags **`Missing`** immediately on sync; reveals required search note input)
3. **`Damaged / UNSAT`** (Alert triangle icon — flags **`Unserviceable`** immediately on sync; reveals required damage reason input)
4. **`Wrong Location`** (Swap arrows icon — opens Wrong Location resolution modal)
- Bottom full-width MaintainX Blue CTA (`52px`): **`Save and Check Next Item`**.

---

### Screen 5B: Consumable Lot Cycle Count Card — Circular Red `-` / Green `+` Steppers (`maintainx-cycle-counts.png`)

When a consumable lot (`LOT-2026-0412A` or `LOT-2026-0718C`) is selected, the detail pane follows `maintainx-cycle-counts.png`:
1. **Item Header:** Category icon/thumbnail + bold **`Hysol EA 9394 Epoxy Paste Adhesive`** + gray subtitle `LOT-2026-0412A • P/N EA9394-QT • Expires 2027-04-12` + map-pin `Cabinet C-04 / Drawer D2`.
2. **Quantity Stepper Zone (`maintainx-cycle-counts.png`):**
   - Left: **Large Red Circular `−` Button (`52px × 52px`, `#EF4444`)**
   - Center: **Large White Numeric Box with `#2563EB` Blue Border (`2.5 QT`)** + `Expected: 3 QT` sublabel
   - Right: **Large Green Circular `+` Button (`52px × 52px`, `#10B981`)**
   - Quick-entry decimal keypad chips (`Match Expected (3)`, `0`, `+0.5`, `-0.5`, or direct decimal input for `QT`, `OZ`, `FT`, `EA`, `CARTRIDGE`).
3. **Condition Selector & Live Variance Adjustment Preview (#11, #14, #17):**
   - 3 tactile condition buttons: **`Counted (Serviceable)`** · **`Can't Find / 0`** · **`Damaged / Suspect (Quarantine)`**.
   - **Non-Overwriting Variance Callout Card:** When `counted != expected` (e.g., `2.5 QT` vs. `3 QT`), displays:
     `Variance Adjustment Entry Preview: VA-2026-1022-01 • Δ −0.5 QT. Live snapshot quantity (3 QT) is never overwritten; a separate adjustment entry linked to this audit posts upon Inspector sign-off.`
4. **Primary CTA (`52px–56px`, `#2563EB`):** **`Save and Count Next Part`**.

---

### Screen 6A & 6B: Wrong Location Modal & `+ Add Unrecorded Item` Modal (`#12`, `#17`, `#20`)

- **Wrong Location Modal (`TL-0219 Rivet Gun`):**
  - Side-by-side comparison cards: `Expected Location: Hangar 1 / Line Box 2` vs. `Found Here: Cabinet C-04 / Drawer D1`.
  - Primary CTA (`#2563EB`): **`Move to This Location Now`** (logs an audit-linked move, permitted for any role per `#12`).
  - Secondary CTA: **`Record as Wrong-Location Finding`** (leaves home location unchanged for Inspector review).
- **`+ Add Unrecorded Item` Modal:**
  - Photo capture box (`Capture Photo of Item & Data Plate`), Description (`Required`), `P/N`, `S/N or Lot #`, `Child Spot Found` dropdown, and `Initial Status` selector (`Pending Verification`, `Needs Cal`, `Quarantined`), queued for Inspector/Admin record match or creation.

---

### Screen 7: Offline Status Bar, IndexedDB Outbox Drawer & Pause / Handoff (`assetpanda-mobile-barcode-scan.png` + `#18`)

- **Bottom Offline Bar (`assetpanda-mobile-barcode-scan.png`):**
  - When offline, a clean dark-slate bar (`#1E293B`, `36px–40px`) sits at the bottom of the screen with a cloud-slash SVG icon:
    `Lost connection, working offline • 3 entries queued in IndexedDB outbox` + **`View Outbox`** link.
- **IndexedDB Outbox Drawer:**
  - Shows network state, snapshot timestamp (`Cached Today, 4:10 PM • 8 items read-only`), per-entry table with **`Captured`** (`captured_at`) vs. **`Synced`** (`synced_at` or `Pending Sync` pill), and a **`Sync Now`** button.
  - **iOS Home Screen PWA Notice (inside Outbox drawer / card when `pending > 0`):** Explains `Share → Add to Home Screen` so iOS Safari's 7-day storage policy never evicts unsynced audit entries (`#18`).

---

### Screen 8 & 9: Role-Gated Official Sign-Off & Permanent Audit PDF (`#10`, `#17`, `#18`, `#23`)

1. **Readiness & Discrepancy Summary Card:**
   - Shows `Checked: 5/8`, `Segregated: 0/2`, `Findings: 2`, `Variance Adjustments: 1`, and lists any open sign-off blockers (unsegregated red items or unchecked rows) with one-tap `Open` links.
2. **Role Gate (`Mechanic` Counter vs. `Inspector / Cal Designee / Designated Auditor` Signer):**
   - **Mechanic (`J. Miller`):** Counter-only card with **`Pause & Hand Off for Sign-Off`** button (selects `R. Alvarez — IA 3849201`, `K. Osei — Cal Designee`, or `D. Park — Designated Auditor`).
   - **Authorized Signer (`R. Alvarez`):**
     - Verified account badge (`Authenticated Login • ralvarez@apexmx.example.com`)
     - `Typed Full Name` (required)
     - `Certificate Type & Number` (`IA`, `A&P`, `A&P / IA`, `Cal Designee`, or explicit **`N/A`** button — never blank per `#23`)
     - `Drawn Signature` (`signature_pad` canvas, optional, with `Clear` button)
     - **`Sign Audit Record`** primary `#2563EB` CTA (records `Signed • Synced` when online, or `Signed Offline — Pending Sync` when in a dead zone)
     - **Compliance Helper Disclaimer:** *"Internal compliance helper record, not an FAA-approved electronic signature system."*
3. **Desktop Review & Official Audit PDF (`dtReview` & `dtPdf`):**
   - **Desktop Review Tab:** Full 8-column Asset Panda inventory/audit verification table + Variance Adjustment Approval cards (`Approve` / `Reject`) + Discrepancy Corrective Action selector + Unrecorded Item Match queue.
   - **Official Audit PDF Tab:** Clean print-ready `816px` document (`APEX CHARTER MX — HANGAR 1 • Official Audit Record • HCA-AUD-2026-1022`) with summary metrics, itemized table by child spot (`N/A` in place of any blank), discrepancy corrective actions, variance adjustment entries, dual Counter + Official Signer signature blocks, and permanent retention footer.
