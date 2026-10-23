---
name: HangarShopApp Design System (v5 Untitled UI + Refactoring UI Edition)
stack: React 19, TypeScript, Tailwind CSS, shadcn/ui, @untitledui/icons, lucide-react
references:
  - MaintainX (3-pane split execution shell & work orders architecture)
  - Asset Panda (2-line stacked register cells & QR scan overlay)
  - InvenTree (hierarchical storage location tree & lot rollups)
  - Untitled UI React v8 (Badge type="modern", InputNumber group, TableCard, --shadow-xs-skeuomorphic)
  - Refactoring UI & ConardLi/garden-skills web-design-engineer (Anti-Slop guardrails)
tokens:
  font_sans: "\"Inter\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif"
  font_mono: "\"JetBrains Mono\", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
  numeric_variant: "tabular-nums"
  colors:
    canvas_bg: "#f9fafb"        # gray-50
    surface_primary: "#ffffff"  # pure white
    surface_active_row: "rgba(242, 244, 247, 0.9)" # gray-100/90
    sidebar_bg: "#0c111d"       # gray-950
    sidebar_active: "#1f242f"   # gray-900
    ink_primary: "#101828"      # gray-900
    ink_secondary: "#344054"    # gray-700
    ink_muted: "#667085"        # gray-500
    border_hairline: "#e4e7ec"  # gray-200 (1px)
    border_input: "#d0d5dd"     # gray-300 (ring-1 ring-inset)
    brand_primary: "#155eef"    # blue-600
    brand_hover: "#004eeb"      # blue-700
    dot_success: "#17b26a"      # green-500 (6px dot)
    dot_warning: "#f79009"      # amber-500 (6px dot)
    dot_danger: "#f04438"       # red-500 (6px dot)
  shadows:
    shadow_2xs: "0px 1px 2px rgba(10, 13, 18, 0.04)"
    shadow_xs: "0px 1px 2px rgba(10, 13, 18, 0.05)"
    shadow_skeuomorphic: "0px 0px 0px 1px rgba(10, 13, 18, 0.18) inset, 0px -2px 0px 0px rgba(10, 13, 18, 0.05) inset"
    shadow_xs_skeuomorphic: "var(--shadow-skeuomorphic), var(--shadow-xs)"
---

# HangarShopApp Design System & Anti-Vibe-Coding Specification

HangarShopApp is a modern, high-density operational application for aviation maintenance technicians, inspectors, and managers. Its visual architecture is anchored to **Asset Panda + MaintainX** (with **InvenTree** location and lot hierarchy patterns), chosen by the product owner after reviewing real product screenshots:

> "I really like the asset panda + maintainX look, esp since we will prob expand into Work Orders down the road"

### Primary Visual Anchors

1. **MaintainX (`https://www.getmaintainx.com/`) — Execution Shell, 3-Pane Split View & Mobile Cycle-Count Flow:**
   - **Desktop/Tablet 3-Pane Split View:** Dark-slate left navigation rail (`#0F172A` / `#1E293B`) + filterable middle item list + right execution/inspection detail pane.
   - **Mobile Cycle-Count Flow:** Clean top header with `Checked items: X of Y` progress bar, large tactile `- / +` quantity steppers, and a prominent `Save & Count Next` blue primary CTA (`#2563EB`).
   - **4-Up Tactile Square Status Selector Buttons:** Large gloved-hand-friendly square status cards with crisp icons (`Present / Serviceable`, `Wrong Location`, `Can't Find`, `Damaged / Unserviceable` in Release 1 audits—and later `Open`, `On Hold`, `In Progress`, `Done` when expanding into Work Orders in Release 2+).
2. **Asset Panda (`https://www.assetpanda.com/`) — High-Density Asset & Inventory Registers:**
   - **Two-Line Stacked Table Cells:** Each row packs two clean lines per column without horizontal clutter: (a) ID + item-type chip (`Tool` / `Lot`), (b) bold nomenclature + `P/N · S/N` (or `Lot · Expiry`) subtext, (c) on-hand/counted quantity + expected/variance subtext, (d) map-pin storage location path, and (e) a **single soft-fill semantic status pill with a leading dot**.
   - **Dual-Rail Navigation (`Collections / Saved Views`):** Quick-filter views (`All Items`, `Due Soon`, `Overdue & Unserviceable`, `Quarantined`, `Needs Verification`) and saved location/category collections.
   - **Tabbed Record Detail Pages:** Clean horizontal tabs (`Record details`, `Calibration / Lots`, `Usage & Activity`, `Audits`, `Attachments`) inside the detail pane or full record view.
   - **Mobile Barcode Scan Overlay & Slim Offline Bar:** Native camera scan sheet with a clean reticle and a slim bottom offline status bar (`Working offline · N queued`).
3. **InvenTree (`https://inventree.org/`) — Location & Lot Hierarchy Touches:**
   - **Hierarchical Storage Location Breadcrumb & Tree:** `Hangar > Tool Crib > Cabinet > Drawer/Shelf` tree navigation with rollup item/lot counts and a top-right barcode/QR/print action cluster.

Every UI pull request, prototype, and code review must enforce this specification.

---

## 1. The 6 Anti-Vibe-Coding Guardrails (Mandatory Contract)

**No SaaS Landing-Page Slop AND No Fake Terminal Cosplay:**

1. **100% Proportional Sans-Serif (`Inter` / System Sans) in Normal Sentence/Title Case:**
   Never set headers, buttons, tabs, descriptions, or status badges in all-caps monospace (`JetBrains Mono` / `Courier`). Use `font-variant-numeric: tabular-nums` on `Inter` for aligned numbers, quantities, and dates, and use monospace or medium tabular sans strictly for raw technical identifiers (`TL-0142`, `LOT-2024-88A`, `/q/K7M2QX`).
2. **No Fake Terminal Chrome:**
   No `[F1]/[F2]/[F3]` function-key labels on touch tabs, no `MSG 16:20` syslog tickers, and no 6-box ASCII-style stamp headers eating mobile screen height.
3. **No Marketing Card Slop or Emoji Soup:**
   Zero Unicode emojis anywhere in the UI (use crisp Lucide / geometric SVG icons), no decorative gradient hero cards, no glassmorphism/glowing blobs, and no multi-row KPI stat-card grids pushing tables below the fold.
4. **Clean, Utilitarian Enterprise Geometry:**
   `6px–8px` subtle border radius on cards, buttons, and inputs; `1px solid #E2E8F0` (`#1E293B` in dark mode) table hairlines; `#FFFFFF` primary surfaces over `#F8FAFC` light-slate canvas; `#0F172A` / `#1E293B` dark-slate left navigation sidebar; MaintainX Blue (`#2563EB`) primary interactive accent and Asset Panda Teal (`#0D9488` / `#10B981`) verified/complete accent.
5. **One Semantic Status Pill Per Row:**
   Render a single soft-fill, high-contrast status pill with a leading dot per row (`Serviceable` green/slate, `Due Soon` amber, `Overdue` red, `Quarantined` red, `Expired` red)—never 3 competing badges on the same row. Secondary metadata (such as `Due in 14d` or `Pending cert`) belongs in the stacked cell subtext.
6. **Work Orders Expansion Readiness:**
   The dark-slate left navigation rail and 3-pane split-view architecture (`List -> Detail / Execution Pane`) are structured so `Work Orders` (linking tools, consumable lot draws, discrepancies, and aircraft tail numbers) slots directly into the same MaintainX-style shell in a future release without redesigning the application frame.

---

## 2. Typography & Tabular Numerics

- **Primary UI Font (`--font-sans`):** `Inter`, `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` across all headings, navigation items, table cells, form labels, buttons, tabs, and status pills in normal **Sentence case** or **Title Case**.
- **Numeric Alignment:** Apply `font-variant-numeric: tabular-nums` globally to table columns, quantities, steppers, counters, dates, and airframe/component hours and cycles so vertical columns align cleanly without switching the UI to a terminal font.
- **Technical Identifier Token (`--font-id`):** Use `Inter` medium (`font-weight: 500`, `tabular-nums`) or subtle inline code styling (`JetBrains Mono` / `ui-monospace` at `12px–13px`, normal case) **strictly** for raw identifiers:
  - Tool IDs (`TL-0142`, `TRQ-004`)
  - Part numbers (`P/N`) and serial numbers (`S/N`)
  - Batch / lot numbers (`LOT-2026-089`)
  - Aircraft tail numbers (`N123AB`), work order numbers (`WO-2026-1042`), and opaque QR short codes (`/q/K7M2QX`)
- **Type Scale & Hierarchy:**
  - Page / Pane Title: `18px–20px` (`font-weight: 600`, `-0.01em` tracking, `#0F172A`)
  - Section Title / Drawer Header: `14px–15px` (`font-weight: 600`, Sentence/Title Case)
  - Table Primary Line (Nomenclature / Item Title): `14px` (`font-weight: 600`, `#0F172A`)
  - Table Secondary Subtext (`P/N · S/N`, `Expected qty`, `Cal due date`): `12px` (`font-weight: 400`, `#64748B`, `tabular-nums`)
  - Table Column Header: `12px` (`font-weight: 600`, `#475569`, Sentence case)
  - Mobile Inputs & Steppers: `16px+` (`font-weight: 500` on inputs, `20px–24px` `font-weight: 600` on cycle-count quantity steppers) to prevent iOS auto-zoom and support gloved operation.

---

## 3. Color System & Single Semantic Status Pills

Designed for bright hangar bays (Clean Daylight Slate default) with an optional Dark Slate mode for night shifts and cockpit work:

### Structural Surfaces & Accents
- **Left Navigation Rail (MaintainX / Asset Panda Dark Slate):** `#0F172A` (`slate-900`) background, `#1E293B` (`slate-800`) active item fill, `#F8FAFC` active text, `#94A3B8` inactive text, `#3B82F6` active left indicator bar.
- **App Canvas Background:** `#F8FAFC` (`slate-50` in light mode) / `#0B0F19` (in dark mode)
- **Primary Card / Table / Pane Surface:** `#FFFFFF` (light mode) / `#111827` (dark mode)
- **Subtle Header / Group Bar Surface:** `#F1F5F9` (`slate-100` in light mode) / `#1E293B` (dark mode)
- **Table & Card Hairlines (`1px solid`):** `#E2E8F0` (`slate-200` in light mode) / `#1E293B` (`slate-800` in dark mode)
- **Primary Interactive Accent (MaintainX Blue):** `#2563EB` (`blue-600`), hover `#1D4ED8` (`blue-700`), soft selection tint `#EFF6FF` (`blue-50`)
- **Verified / Complete Accent (Asset Panda Teal / Emerald):** `#0D9488` (`teal-600`) / `#10B981` (`emerald-500`)
- **Primary Ink:** `#0F172A` (`slate-900`)
- **Secondary Subtext Ink:** `#475569` (`slate-600`) and `#64748B` (`slate-500`)

### Semantic Status Pills (`<StatusPill />` — One Pill Per Row)

Every row displays **at most one** semantic status pill (`border-radius: 9999px` or `6px`, `padding: 2px 10px`, `12px` `Inter` `font-weight: 500`, soft background fill, `1px solid` subtle semantic border, and a `6px` leading status dot):

| Domain Status | Pill Label (Normal Case) | Surface & Border (Light Mode) | Text & Leading Dot | Subtext / Secondary Context |
| :--- | :--- | :--- | :--- | :--- |
| `Serviceable` / `Present / Serviceable` | `Serviceable` | `#ECFDF5` fill, `1px solid #A7F3D0` | `#065F46` text, `#10B981` dot | Cal due date or expiry in stacked subtext |
| `Reference-only` | `Reference Only` | `#F1F5F9` fill, `1px solid #CBD5E1` | `#334155` text, `#64748B` dot | Excluded from cal due lists |
| `Due soon` (within shop window) | `Due Soon` | `#FFFBEB` fill, `1px solid #FDE68A` | `#92400E` text, `#F59E0B` dot | Shows `Due in Xd (YYYY-MM-DD)` in subtext |
| `Pending verification` | `Pending Verification` | `#FFFBEB` fill, `1px solid #FDE68A` | `#92400E` text, `#F59E0B` dot | Awaiting Cal Designee review |
| `Needs cal` / `Out for cal` | `Out for Cal` | `#EFF6FF` fill, `1px solid #BFDBFE` | `#1E40AF` text, `#3B82F6` dot | Vendor & expected return date in subtext |
| `Overdue` | `Overdue` | `#FEF2F2` fill, `1px solid #FECACA` | `#991B1B` text, `#EF4444` dot | Blocks usage logging; red warning banner in detail |
| `Unserviceable` / `Damaged` | `Unserviceable` | `#FEF2F2` fill, `1px solid #FECACA` | `#991B1B` text, `#EF4444` dot | Blocks usage logging; reason shown in subtext |
| `Quarantined` | `Quarantined` | `#FEF2F2` fill, `1px solid #FECACA` | `#991B1B` text, `#EF4444` dot | Segregated lot; blocks material draw |
| `Expired` | `Expired` | `#FEF2F2` fill, `1px solid #FECACA` | `#991B1B` text, `#EF4444` dot | Past effective expiry (`lot` or `opened_life_days`) |
| `Missing` | `Missing` | `#FFF1F2` fill, `1px solid #FECDD3` | `#9F1239` text, `#F43F5E` dot | Routed to `Unassigned` / `Needs attention` |
| `Retired` / `Returned` / `Depleted` / `Disposed` | `Retired` / `Depleted` | `#F8FAFC` fill, `1px solid #E2E8F0` | `#64748B` text, `#94A3B8` dot | Historical read-only record |

---

## 4. Screen Anatomy & Responsive Architecture

### A. Desktop & Tablet Landscape (`>= 1024px`) — MaintainX 3-Pane Split View + Asset Panda High-Density Register
1. **Left Navigation Rail (`240px` desktop / `64px` collapsed tablet, `#0F172A` dark slate):**
   - **Shop Switcher Header:** Active Shop name, role badge (`Admin`, `Inspector`, `Mechanic`), and online/sync indicator.
   - **Primary Navigation Items (Lucide SVG icons + normal-case labels):**
     - `Dashboard`
     - `Tools & Calibration`
     - `Consumables & Lots`
     - `Locations` (InvenTree hierarchical tree)
     - `Audits & Cycle Counts`
     - `Fleet & Programs`
     - `Work Orders` *(Release 2+ slot — architecture ready)*
     - `Import & Settings`
   - **Optional Secondary Rail (`Collections / Saved Views`, Asset Panda pattern):** Quick filters for location subtrees (`Hangar 1 > Tool Crib > Cabinet B`) or saved compliance views.
2. **Primary Workspace — Two High-Productivity Modes:**
   - **Mode 1: Asset Panda High-Density Register Table (Full-Width or With Docked Detail Drawer):**
     - Top breadcrumb (`Hangar 1 › Tool Crib › Cabinet B`), search bar, compact filter pills (`All (26)`, `Tools (19)`, `Consumables (7)`, `Due Soon (3)`, `Overdue (1)`), and InvenTree-style top-right action cluster (`Scan QR`, `Print Labels`, `Export CSV`, `+ New Tool / Lot`).
     - **Two-Line Stacked Table Cells (`52px–60px` row height, `1px solid #E2E8F0` hairlines):**
       1. **ID & Type Column:** `TL-0142` (`--font-id`) + subtle `Tool` or `Lot` chip.
       2. **Item & Spec Column:** Bold nomenclature (`Snap-on Digital Torque Wrench 1/2"`) on line 1; `P/N ATECH3FR250B · S/N 09218472` on line 2.
       3. **Quantity / Calibration Column:** `1 each` or `14.5 oz` on line 1; `Expected: 16.0 oz (-1.5 oz)` or `Cal Due: Oct 31, 2026` on line 2.
       4. **Location Column:** Map-pin SVG icon + `Crib › Cab B › Drawer 1`.
       5. **Status Column:** Single `<StatusPill />` (`Serviceable`, `Due Soon`, `Overdue`, `Quarantined`, `Expired`).
   - **Mode 2: MaintainX 3-Pane Split View (`List Pane 380px–420px` + `Execution / Detail Pane 1fr`):**
     - Used for **Guided Location Audits**, **Monthly Reviews**, **Calibration Verification**, and future **Work Orders**.
     - Left/middle list pane shows scannable two-line item rows grouped by child location (`Drawer 1 — Torque Wrenches (6/6)`) with a `Checked items: 14 of 26` progress bar.
     - Right detail/execution pane shows the selected item's inspection controls, tabbed record details (`Record details`, `Calibration / Lots`, `Usage & Activity`, `Audits`, `Attachments`), or the official audit sign-off & PDF preview.

### B. Phone & Tablet Portrait (`< 1024px`) — MaintainX Mobile Cycle-Count & Asset Panda Scanner
1. **Compact Mobile Header (No Multi-Box ASCII Stamp):**
   - Clean 2-row header (`56px–72px` total): Back arrow + Location title (`Cabinet B — Torque & Sealants`) + `Scan QR` icon button on row 1; `Checked items: 14 of 26` linear progress bar (`#2563EB` fill, `#10B981` when complete) + filter pills (`All`, `Remaining (12)`, `Tools`, `Lots`) on row 2.
2. **MaintainX Mobile Execution Card / Drawer:**
   - **For Tools (4-Up Tactile Square Status Selector Grid):**
     - Four large (`>= 64px` tall, `8px` radius) tactile square selector buttons in a 2x2 or 4-up grid with crisp SVG icons:
       1. `Present / Serviceable` (Teal/Emerald active border & fill `#ECFDF5`)
       2. `Wrong Location` (Amber/Blue prompt with one-tap `Move to this location now`)
       3. `Can't Find` (Red/Rose flag -> routes to `Missing` / `Unassigned`)
       4. `Damaged / Unserviceable` (Red flag -> immediate `Unserviceable` with reason note)
   - **For Consumable Lots (Tactile Quantity Stepper Card):**
     - Displays expected quantity and stock unit (`Expected: 12 tubes`), large `-` and `+` stepper buttons (`48px x 48px`, `8px` radius), direct numeric input (`tabular-nums`), quick `Matches Expected` chip, and condition selector (`Serviceable`, `Damaged / Suspect -> Quarantined`, `Can't Find / 0`).
   - **Primary Bottom CTA:** Full-width `48px` MaintainX Blue button (`Save & Count Next`).
3. **Asset Panda Barcode/QR Scan Overlay & Slim Bottom Offline Bar:**
   - Camera viewfinder sheet (`getUserMedia` + `BarcodeDetector` WASM) with rounded reticle frame, torch toggle, and manual ID search box.
   - When offline or syncing, a **slim `32px` bottom status bar** docks cleanly at the bottom edge: `Working offline · 4 findings queued in outbox` (amber dot) or `All changes synced` (teal dot).

---

## 5. Locked Shared Component Primitives

Before building individual feature screens, developers must implement and reuse these eight canonical primitives:

1. **`<AppShellNav />`**: Dark-slate MaintainX/Asset Panda left navigation rail (`#0F172A`) with Shop Switcher, role badge, primary navigation links (including the future `Work Orders` slot), and optional secondary `Collections / Saved Views` rail.
2. **`<SplitViewWorkspace />`**: MaintainX 3-pane responsive layout container combining the filterable item/audit list pane (with `Checked items: X of Y` progress header) and the right-hand execution/detail pane with tabbed sections (`Record details`, `Calibration / Lots`, `Usage & Activity`, `Audits`, `Attachments`).
3. **`<StackedRegisterTable />`**: Asset Panda high-density data table (`1px solid #E2E8F0` hairlines, `6px–8px` outer card radius) enforcing two-line stacked cells (`ID + type chip`, `Nomenclature + P/N · S/N`, `Qty/Cal + Expected/Variance`, `Map-pin Location`, and a single `<StatusPill />`).
4. **`<StatusPill status={...} />`**: Single soft-fill semantic status pill per row with a `6px` leading dot in normal Sentence/Title Case (`Serviceable`, `Reference Only`, `Due Soon`, `Pending Verification`, `Out for Cal`, `Overdue`, `Unserviceable`, `Quarantined`, `Expired`, `Missing`).
5. **`<TactileStatusGrid />`**: MaintainX 4-up tactile square status selector buttons (`6px–8px` radius, SVG icon + normal-case label) for tool audit checks (`Present / Serviceable`, `Wrong Location`, `Can't Find`, `Damaged / Unserviceable`) and future Work Order status transitions (`Open`, `On Hold`, `In Progress`, `Done`).
6. **`<CycleCountStepperCard />`**: Mobile/tablet lot counting card with large `- / +` tactile steppers, stock-unit badge, live variance delta (`tabular-nums`), and `Save & Count Next` primary blue CTA (`#2563EB`).
7. **`<BarcodeScannerSheet />` & `<OfflineOutboxBar />`**: Asset Panda camera barcode/QR scanner overlay + slim bottom offline sync bar (`Working offline · N queued`).
8. **`<ComplianceSignoffBlock />` & `<HelperDisclaimerBanner />`**: Structured sign-off card capturing typed full name, authenticated login, certificate type & number (or explicit `N/A`, never blank), optional drawn signature canvas, auditor independence attestation, and the explicit compliance helper disclaimer (`Internal compliance helper record — not an FAA-authorized electronic recordkeeping or electronic signature system`).

---

## 6. Untitled UI React v8 + Refactoring UI + `web-design-engineer` Anti-Slop Contract (v5 Canonical Upgrade)

To eliminate AI prototype slop ("rainbow badge soup", custom cartoon SVG silhouettes, heavy colored left borders, and toy circular steppers), every screen in HangarShopApp enforces the **Untitled UI React (`theme.css`) + Refactoring UI + `ConardLi/garden-skills` (`web-design-engineer`)** contract:

### A. Untitled UI Token & Elevation Foundations (`index.css`)
- **85%+ Calm Neutral Gray + 1 Brand Primary (`#155eef`):** The viewport is anchored by `#f9fafb` (`gray-50`) canvas, `#ffffff` primary surfaces, `#0c111d` (`gray-950`) navigation rail, `#101828` (`gray-900`) primary ink, `#667085` (`gray-500`) muted ink, and `1px` `#e4e7ec` (`gray-200`) hairlines.
- **Skeuomorphic Button & Input Depth (`--shadow-xs-skeuomorphic`):**
  - Primary action buttons (`.uui-btn-primary`): `background-color: #155eef; color: #ffffff; box-shadow: var(--shadow-xs-skeuomorphic);`
  - Secondary action buttons (`.uui-btn-secondary`): `background-color: #ffffff; color: #344054; border: 1px solid #d0d5dd; box-shadow: var(--shadow-xs-skeuomorphic);`
- **Typography & Monospace Discipline:** `Inter` (`font-variant-numeric: tabular-nums`) for all UI prose and aligned quantities; `JetBrains Mono` (`--font-mono`) strictly for raw identifiers (`TL-0157`, `LOT-2026-0412A`, `P/N`, `S/N`).

### B. Untitled UI Component Contracts
1. **`Badge type="modern"` (`<StatusPill />`):**
   - Render status pills on a crisp white surface (`bg-white`), `1px` inset gray ring (`ring-1 ring-inset ring-gray-200`), `shadow-2xs`, dark neutral text (`text-gray-700` / `#344054`), `rounded-md`, and a **`6px` (`h-1.5 w-1.5`) semantic leading dot** (`#17b26a` green, `#f79009` amber, `#f04438` red, `#155eef` blue, `#6938ef` purple, `#98a2b3` gray).
   - Never paint every table row with competing pastel rainbow pill backgrounds.
2. **Unified Horizontal `<InputNumber />` Cycle-Count Stepper:**
   - Replace giant coral-red `-` / neon-mint `+` circular buttons and thick `2px` blue boxes with Untitled UI's unified horizontal input group: `rounded-lg bg-white ring-1 ring-inset ring-gray-300 shadow-xs flex items-center overflow-hidden`.
   - Left `-` and right `+` buttons use `text-gray-600 hover:bg-gray-50 border-r / border-l border-gray-200 px-3.5 h-10`, with a centered `font-mono tabular-nums` quantity input and unit label (`qt`, `cartridge`, `ea`), paired with a `Match Expected` secondary button.
3. **4-Button Tool Condition Selector (Radio Button Group):**
   - Replace saturated rainbow borders/fills with Untitled UI radio-group cards: inactive `bg-white ring-1 ring-inset ring-gray-300 shadow-xs text-gray-700 hover:bg-gray-50`; active `ring-2 ring-inset ring-blue-600 bg-blue-50/30 text-gray-900 shadow-xs` with a `6px` semantic dot.
4. **`TableCard` Inventory Register:**
   - Wrap the register table in an Untitled UI `TableCard` (`rounded-xl bg-white ring-1 ring-inset ring-[#e4e7ec] shadow-xs overflow-hidden`), with a `bg-gray-50/70` header row (`text-xs font-medium text-gray-500`), `1px` `#e4e7ec` row hairlines, a monochrome `@untitledui/icons` category icon in a `w-8 h-8 rounded-md bg-gray-50 ring-1 ring-inset ring-gray-200 text-gray-500` container inside the `Item` column, and `Badge type="modern"` status pills.

### C. `web-design-engineer` + Refactoring UI Anti-Slop Ban List & 5-Point Critique Check
- **Ban custom SVG clipart cartoons (`ItemThumbnail` silhouettes):** Never draw multi-path colored vector illustrations of wrenches, calipers, or sealant bottles. Use 4 monochrome `@untitledui/icons` stroke icons (`Tool02`, `Ruler`, `Beaker01`, `Package`) in a neutral `32×32` (`w-8 h-8`) gray container in register/detail headers, and **omit `<ItemThumbnail />` completely in middle checklist rows** so each row has a single clean left indicator (`<VerificationSquare />`).
- **Ban `border-l-[3px]` colored left borders on rows and cards:** Remove `border-l-[3px] border-l-[#246cff]` (`web-design-engineer` banned cliché). Indicate active list rows with a clean Untitled UI surface fill (`bg-gray-100/90` / `bg-slate-100/90`) and subtle weight contrast (`font-semibold text-gray-900`).
- **Ban solid colored checkboxes on normal rows:** Verified rows use a quiet neutral check square (`bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-300`); reserve red fills strictly for active overdue/expired blockers.
- **Keep `Tweaks` collapsed by default (`demoPillExpanded = false`):** When collapsed, render only a tiny unobtrusive pill (`fixed bottom-3 right-3 bg-gray-900/80 text-white text-[11px] font-medium px-2.5 py-1 rounded-full shadow-sm`) so screenshots and user testing sessions look 100% like a shipped production app.
- **Mandatory 5-Point Refactoring UI / `critique-guide.md` Verification Check:**
  1. **Visual Hierarchy via Weight & Contrast:** Primary item titles use `font-medium`/`font-semibold` `#101828`; secondary metadata (`P/N`, `S/N`, drawer spot) uses `12px` `#667085` `tabular-nums`.
  2. **Color Restraint (85%+ Neutral Gray):** Semantic hues appear only as `6px` dots inside `Badge type="modern"` pills and on critical quarantine/overdue alert banners.
  3. **Single Left Row Indicator:** Middle checklist rows never stack `<VerificationSquare />` + `<ItemThumbnail />` and never use `border-l-[3px]` stripes.
  4. **Crisp 1px Geometry & Skeuomorphic Controls:** All cards, tables, steppers, and buttons use `1px` `#e4e7ec`/`#d0d5dd` borders (`ring-1 ring-inset`) and `--shadow-xs-skeuomorphic`.
  5. **Zero Prototype Chrome or Clipart Slop:** No custom SVG tool cartoons, no floating multi-button demo bars open by default, and zero truncated button labels at `1440×900`.
