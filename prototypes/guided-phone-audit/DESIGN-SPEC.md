# HangarShopApp — Design System & #22 Guided Phone Audit Prototype Spec

**Repository:** `caw1517/HangarShopApp`  
**Target Deliverable:** Issue [#22 — Prototype the guided phone audit flow](https://github.com/caw1517/HangarShopApp/issues/22) (unblocked by [comment #6353184187](https://github.com/caw1517/HangarShopApp/issues/22#issuecomment-6353184187))  
**Source Issues & Decisions Incorporated:**
- [#1 — Release 1 Wayfinder Map](https://github.com/caw1517/HangarShopApp/issues/1) (baseline scope, roles, helper-not-official-record posture)
- [#5 — Durable QR Label Printing Research](https://github.com/caw1517/HangarShopApp/issues/5) & [#20 — End-to-End QR Labels](https://github.com/caw1517/HangarShopApp/issues/20) (opaque URL `/q/<code_id>`, 13–17 mm QR, TZe/laser PDF print, code-for-life)
- [#6 — Phone QR Scanning & Offline Research](https://github.com/caw1517/HangarShopApp/issues/6) & [#18 — Hangar Offline Behavior](https://github.com/caw1517/HangarShopApp/issues/18) (online start + read-only spot cache, IndexedDB outbox, findings-only sync, offline sign-off pending sync, iOS PWA reminder)
- [#10 — Roles, Permissions & Auth](https://github.com/caw1517/HangarShopApp/issues/10) (Admin, Inspector, Mechanic + `cal designee` and `designated auditor` per-user flags)
- [#11 — Tool & Consumable Usage Logging](https://github.com/caw1517/HangarShopApp/issues/11) (live lot quantities, non-overwriting audit variance adjustment entries, mandatory borrowed/leased WO logging)
- [#12 — Location Model & Structure](https://github.com/caw1517/HangarShopApp/issues/12) (multi-depth tree, 7 node types, personal toolboxes, mobile flag, split lots, built-in `Unassigned`, any-role moves)
- [#13 — Calibrated Tool Lifecycle States & Due-Date Rules](https://github.com/caw1517/HangarShopApp/issues/13) (9 statuses, `Due soon` badge, `Calibrated` vs. `Reference-only` class, end-of-month expiry)
- [#14 — Consumable Item, Lot & Expiry Rules](https://github.com/caw1517/HangarShopApp/issues/14) (5 lot statuses, shelf-life toggle, opened-container split lines, decimal stock units, FIFO)
- [#17 — Guided Phone Audit Scope & Findings](https://github.com/caw1517/HangarShopApp/issues/17) & [#23 — Apex Charter MX 10+ Seat Manual Procedures](https://github.com/caw1517/HangarShopApp/issues/23) (4 audit modes, immediate safety flags, variance adjustments, sign-off rules, `N/A` no-blank rule, permanent PDF retention)

---

## Part 1: Utilitarian Aviation / Industrial Design System Tokens

Designed for aircraft maintenance environments: high ambient glare on the ramp or hangar bay door, dim shadow inside belly bays and cabinets, and operation with bare hands or thin nitrile gloves.

### 1.1 Color Palette (Slate / Zinc Industrial Base + High-Contrast Light & Dark Hangar Modes)

All semantic colors meet **WCAG AAA (7:1+)** for primary identifiers and **AA (4.5:1+)** for secondary labels. Status is **never** communicated by color alone—every badge pairs a distinct border, fill, text label, and geometric icon.

#### Structural & Surface Tokens

| Token | Light Mode (Sunlit Apron / Office) | Dark Mode (Night Shift / Inside Cabinet) | Usage |
| :--- | :--- | :--- | :--- |
| `--bg-canvas` | `#F8FAFC` (Slate 50) | `#090D16` (Slate 950+) | App background |
| `--bg-surface` | `#FFFFFF` (White) | `#111827` (Gray 900) | Cards, checklist rows, modals |
| `--bg-elevated` | `#F1F5F9` (Slate 100) | `#1E293B` (Slate 800) | Sticky headers, group headers, keypad keys |
| `--bg-glass-dock` | `rgba(255, 255, 255, 0.94)` | `rgba(17, 24, 39, 0.94)` | Sticky bottom scan/action dock (`backdrop-filter: blur(8px)`) |
| `--text-primary` | `#0F172A` (Slate 900) | `#F8FAFC` (Slate 50) | Item names, primary P/N, Tool ID, counts |
| `--text-secondary` | `#334155` (Slate 700) | `#CBD5E1` (Slate 300) | S/N, lot batch, location path, secondary metadata |
| `--text-muted` | `#64748B` (Slate 500) | `#94A3B8` (Slate 400) | Captions, `captured_at` / `synced_at` timestamps |
| `--border-crisp` | `#CBD5E1` (Slate 300) | `#334155` (Slate 700) | Default `1px solid` card, table, and input dividers |
| `--border-strong` | `#64748B` (Slate 500) | `#64748B` (Slate 500) | Emphasized input borders, active card outline |
| `--accent-primary` | `#0284C7` (Sky 600) | `#38BDF8` (Sky 400) | Primary interactive CTA, active filter pill, focus ring |
| `--accent-primary-fg`| `#FFFFFF` | `#082F49` | Text/icon on `--accent-primary` |

#### Semantic Status Tokens (Tools, Lots, & Audit Findings)

| Semantic Tier | Light (`bg` / `border` / `text`) | Dark (`bg` / `border` / `text`) | Icon Shape | Mapped Domain States (#13, #14, #17, #18) |
| :--- | :--- | :--- | :--- | :--- |
| **OK / Serviceable** | `#ECFDF5` / `#059669` / `#065F46` | `#064E3B` / `#10B981` / `#A7F3D0` | Solid Check Circle `●✓` | Tool `Serviceable`; Lot `Serviceable`; Audit `Present / SAT`, `Counted` (0 variance), `Synced` |
| **Warning / Attention** | `#FFFBEB` / `#D97706` / `#92400E` | `#451A03` / `#F59E0B` / `#FDE68A` | Warning Triangle `▲!` | Badge `Due soon` (≤90d); Tool `Pending verification`, `Needs cal`, `Out for cal`; Audit `Wrong location`, `Variance`, `Pending sync` |
| **Danger / Stop Use** | `#FEF2F2` / `#DC2626` / `#991B1B` | `#450A0A` / `#EF4444` / `#FECACA` | Octagon Stop / Slash `⯃✕` | Tool `Overdue`, `Unserviceable`, `Missing`; Lot `Expired`, `Quarantined`; Audit `Damaged / UNSAT`, `Can't find` |
| **Info / Special Class** | `#EFF6FF` / `#2563EB` / `#1E40AF` | `#172554` / `#3B82F6` / `#BFDBFE` | Diamond / Tag `◆` | Tool class `REFERENCE ONLY`; Location `Mobile` (fly-away kit/truck); Opened-container split lot (`OPENED`) |
| **Neutral / Inactive** | `#F1F5F9` / `#64748B` / `#334155` | `#1E293B` / `#64748B` / `#CBD5E1` | Square Dash `■—` | Tool `Retired`, `Returned` (borrowed/leased); Lot `Depleted`, `Disposed`; Facility checkpoint `N/A` |

---

### 1.2 Semantic Status Badge Specification

Every status badge uses:
- **Height:** `24px` (inline row) or `28px` (header/detail card)
- **Padding:** `0 8px`, `gap: 5px`
- **Border:** `1px solid var(--status-border)` (or `1.5px dashed` for `Pending verification` / `Pending sync`)
- **Radius:** `4px`
- **Typography:** `11px` (`0.6875rem`), `font-weight: 700`, `letter-spacing: 0.04em`, uppercase.

| Badge Label | Tier & Icon | Domain Rule & UI Behavior |
| :--- | :--- | :--- |
| `✓ SERVICEABLE` | OK (`●✓`) | Only status permitted for tool/lot usage logging (#11). |
| `▲ DUE SOON · 14D` | Warning (`▲!`) | Sub-badge rendered alongside `SERVICEABLE` when within the shop's 90-day window (#1, #13, #14). |
| `▲ PENDING VERIFICATION` | Warning (`▲!` dashed) | Mechanic-uploaded or borrowed/leased cert awaiting `cal designee` verification (#10, #13). Usage blocked. |
| `▲ NEEDS CAL` | Warning (`▲!`) | Newly added tool without attached OEM cal doc, or reinstated tool (#13). Usage blocked. |
| `▲ OUT FOR CAL` | Warning (`▲↗`) | At vendor; keeps its home location (#12). Escalates to `OVERDUE RETURN` if past expected return date (#13). |
| `✕ OVERDUE — DO NOT USE` | Danger (`⯃✕`) | Automatic when past end-of-month cal due date (#13). Blocks usage; triggers immediate segregation prompt in audit. |
| `✕ UNSERVICEABLE` | Danger (`⯃✕`) | Manual damage/malfunction flag or failed cal (#13). Shows reason (`Damaged`, `Failed cal`). Only Inspector/Admin clears. |
| `✕ QUARANTINED` | Danger (`⯃✕`) | Lot flagged suspect/damaged or received without cert (#14). Segregate physically; only Inspector/Admin clears. |
| `✕ EXPIRED — SEGREGATE` | Danger (`⯃✕`) | Automatic when past effective expiry (`min(lot_expiry, opened_date + opened_life_days)`). Usage blocked. |
| `✕ MISSING` | Danger (`⯃?`) | Set when audit records `Can't find` (#13, #17). Escalates at 30 days to "Needs attention: retire as lost?". |
| `◆ REFERENCE ONLY` | Info (`◆`) | Persistent class badge (#13). No cal due date; excluded from cal-record audit; included in location/facility audits. |
| `■ RETIRED` / `■ RETURNED` | Neutral (`■—`) | Inactive history-preserving states for tools (#13) and `DEPLETED` / `DISPOSED` for lots (#14). |

---

### 1.3 Typography Scale & Zero-Ambiguity Aviation Monospace Rules

In aviation maintenance, misreading `0` (zero) vs. `O` (Oscar), `1` (one) vs. `I` (India) vs. `l` (Lima), or `5` vs. `S` causes traceability errors.

- **UI Sans Font (`--font-sans`):** `Inter`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, sans-serif — used for navigation, prose, instructions, location names, and button labels.
- **Technical Monospace Font (`--font-mono`):** `'JetBrains Mono'`, `'IBM Plex Mono'`, `'SF Mono'`, `'Roboto Mono'`, monospace with mandatory CSS:
  ```css
  .font-aviation-mono {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums slashed-zero;
    font-feature-settings: "zero" 1, "ss01" 1, "tnum" 1;
    letter-spacing: 0.02em;
  }
  ```
- **Mandatory Monospace Scope:** Every **Tool ID** (`T-0104`), **Part Number (P/N)** (`MS20995C32`, `PR-1422-B2`), **Serial Number (S/N)** (`SN-8I0O14`), **Lot / Batch Number** (`LOT-2026-08O1`), **Opaque QR Code** (`/q/K7M2QX`), **Quantity + Stock Unit** (`14.5 oz`, `3 tube`), **Dates & Timestamps** (`2026-10-31`, `16:19 UTC-7`), and **Certificate Number** (`A&P 3948102` or `N/A`) **must** use `.font-aviation-mono`.

#### Type Scale

| Token | Size / Line Height | Weight | Font Family | Primary Use |
| :--- | :--- | :--- | :--- | :--- |
| `display-count` | `28px / 32px` (`1.75rem`) | `700` | `--font-mono` | Active numeric quantity input display, scanner counter |
| `title-screen` | `20px / 26px` (`1.25rem`) | `700` | `--font-sans` | Screen header, location title, modal alert header |
| `title-group` | `15px / 20px` (`0.9375rem`) | `700` | `--font-sans` | Child spot sticky subheader (`Cabinet B > Drawer 3`) |
| `item-title` | `16px / 22px` (`1.0rem`) | `600` | `--font-sans` | Tool nomenclature / Consumable catalog name |
| `item-id-primary`| `14px / 20px` (`0.875rem`) | `700` | `--font-mono` | Tool ID (`T-0042`), Lot # (`LOT-904B`), P/N |
| `body-default` | `14px / 20px` (`0.875rem`) | `400` | `--font-sans` | Notes, discrepancy reasons, helper disclaimers |
| `meta-mono` | `12px / 16px` (`0.75rem`) | `500` | `--font-mono` | S/N, cal due date, expiry date, `captured_at` / `synced_at` |
| `badge-caps` | `11px / 14px` (`0.6875rem`) | `700` | `--font-sans` | Status chips, role tags, filter pills |

---

### 1.4 Geometry, Borders & Touch Targets (Bare Hands & Nitrile Gloves)

- **Border Radii:**
  - `--radius-sm`: `4px` (badges, tags, inline code pills, table cells)
  - `--radius-md`: `6px` (checklist cards, inputs, buttons, modals, segmented controls)
  - No pill-shaped (`9999px`) action buttons or large soft (`16px+`) consumer card corners—keep geometry crisp and industrial.
- **Borders:**
  - `1px solid var(--border-crisp)` on all cards, inputs, and list rows.
  - `2px solid` left accent bar on checklist rows to indicate audit check state at a glance (`#10B981` verified/SAT, `#F59E0B` variance/wrong-location, `#EF4444` missing/damaged/quarantined, `transparent` unchecked).
- **Touch Targets (Glove-Safe):**
  - **Minimum interactive target:** `44px × 44px` (`48px` preferred height for all row action buttons, filter pills, and form inputs).
  - **Primary bottom-bar CTA / Scan trigger / Keypad buttons:** `52px–56px` height with at least `8px` spacing between adjacent destructive/affirmative controls to prevent fat-finger taps in tight hangar spaces.
  - **Zero hover-only interactions:** Every action is visible and reachable by direct tap.

---

### 1.5 Responsive Breakpoints & Multi-Device Ergonomics

Per `AGENTS.md` Rule 8, every screen scales across Phone, Tablet, and Desktop Monitor:

| Breakpoint | Target Device & Context | Layout & Navigation Architecture |
| :--- | :--- | :--- |
| **Phone** (`< 768px`, baseline `375×812`) | **Walking physical audit** inside tool cribs, cabinets, aircraft, and ramp | Single-column viewport. Sticky top bar (location path, offline outbox pill, progress bar + filter pills). Scrollable spot-grouped item list. Sticky bottom thumb-zone bar (`Scan QR` primary button + `+ Unrecorded Item` + `Review & Sign`). Camera scanner opens as a top half-sheet (`40vh`) or full overlay with instant manual-ID toggle. |
| **Tablet** (`768px – 1199px`) | **Rolling tool cart / bench inspection** (`iPad` / rugged Android tablet) | **2-Pane Master-Detail Split View (`380px` left / `1fr` right):** Left pane holds the collapsible Location Tree, filter pills, and grouped checklist rows. Right pane stays pinned with the active item's inspection card, large numeric count pad, condition selector, camera viewfinder, or sign-off block. |
| **Desktop** (`>= 1200px`) | **Maintenance Manager / Inspector / Cal Designee workstation** | **3-Zone Workspace / High-Density Review:** Left sidebar navigation + location tree; center multi-column data table (`tabular-nums`) for Monthly Cal-Record Audit, Monthly Expired-Materials Check, variance approval batching, and unrecorded-item matching; right inspector drawer (`440px`) + full **Audit PDF print preview** and batch QR label PDF generator. |

---

## Part 2: How the 13 Settled Decisions Map to the #22 Prototype

All open questions from the initial research brief were resolved in issues #10–#14, #17, #18, #20, and #23:

1. **Audit Types & Combined Scope (#17):** Physical location audits walk **Tools and Consumable Lots together** by default, grouped by child spot, with `All`, `Tools`, and `Consumables` filter pills. The audit launcher also exposes the 3 manual-mandated modes: **Monthly Calibration-Record Audit**, **Monthly Expired-Materials Check**, and **Facility / Area Audit (`SAT`/`UNSAT`/`N/A`)**.
2. **Location Hierarchy & QR Jump (#12, #20):** Locations form a per-shop tree of any depth (`area`, `room`, `cabinet`, `drawer`, `shelf`, `toolbox`, `kit`, plus `Mobile` flag and built-in `Unassigned`). Starting at any node audits that node and all child spots below it. Scanning a location QR (`/q/<code_id>`) jumps straight to that spot.
3. **Presence Check vs. Quantity Count (#14, #17):** Tools (both `Calibrated` and `Reference-only`) use presence + condition (`Present / SAT`, `Can't find`, `Damaged / UNSAT`, `Wrong location`). Consumable lots (including split lots across locations and opened-container lines) require a **numeric quantity count** in the catalog item's stock unit (`each`, `oz`, `tube`, `can`, `qt`, `ft`, supporting decimals) plus condition/expiry check (`Counted`, `Can't find / 0`, `Damaged / Suspect`).
4. **Findings-First Architecture (#17, #18):** Audit counts and checks record as **audit findings** first and **never silently overwrite** live tracking records, even if synced later from offline storage.
5. **Immediate Safety Flags on Sync (#10, #13, #14, #17):** Because any role is permitted to raise safety flags, syncing an audit immediately sets:
   - Tool marked `Damaged / UNSAT` $\rightarrow$ **`Unserviceable`** (with reason)
   - Tool marked `Can't find` $\rightarrow$ **`Missing`** (moves to `Unassigned` / flags 30-day clock)
   - Lot marked `Damaged / Suspect` $\rightarrow$ **`Quarantined`** (with reason)
   Only an `Inspector` or `Admin` can clear those flags.
6. **Scanning an Already-Overdue/Unserviceable Tool or Expired/Quarantined Lot (#13, #14, #17, #23):** Under the 10+ seat manual (#23), unserviceable tools and expired/quarantined lots must be physically segregated and tagged. When an auditor scans or taps an `OVERDUE`, `UNSERVICEABLE`, or `PENDING VERIFICATION` tool or an `EXPIRED` or `QUARANTINED` lot in the crib, the UI triggers an **immediate high-contrast Segregation / Quarantine Warning Banner** prompting the auditor to confirm physical removal/segregation to the quarantine area.
7. **Wrong Location Handling (`expected -> found`) (#12, #17):** When an item is scanned or found in a spot different from its recorded location, the finding records `expected_location -> found_location`. Because any signed-in role can move items (#12), the auditor gets a one-tap **"Move to this location now"** action (logged as an audit-linked move) alongside **"Leave as finding for review"**.
8. **Consumable Quantity Variances (#11, #14, #17):** When `counted_qty != expected_qty`, applying the finding creates a non-overwriting **variance adjustment entry** (#11) referencing the Audit ID as the reason. Variances are applied when an `Inspector`, `Admin`, or `cal designee` signs or approves the audit.
9. **Unrecorded / Unlabelled Items (#17, #20):** At any spot, the auditor can tap **`+ Add unrecorded item`** to capture an optional photo, description, P/N or S/N, item class, and spot found. An `Inspector` or `Admin` later resolves it by matching to an existing record + printing/claiming a QR label (#20) or creating a new tool (`Needs cal`) or lot (`Quarantined`).
10. **Offline Strategy — Online Start + IndexedDB Outbox (#6, #18):** Audits start online (downloading a read-only snapshot of the location subtree's items). Every check is written immediately to an IndexedDB outbox with a client UUID and `captured_at` timestamp, syncing idempotently on reconnect.
11. **iOS Home Screen PWA Reminder (#6, #18):** PWA install is encouraged, not forced—except whenever `unsynced_entries > 0` on iOS Safari, a prominent banner reminds the user to install to the Home Screen (`Share > Add to Home Screen`) to protect against Safari's 7-day storage eviction.
12. **Pause / Resume / Handoff & Role-Gated Official Sign-Off (#10, #17, #23):** Any role (`Mechanic`, `Inspector`, `Admin`) can start, pause, resume, and count an audit. If a Mechanic completes the physical count, they can save/submit the count for handoff; **official sign-off** is gated to users holding the required role/flag (`Inspector`, `Admin`, `cal designee`, or `designated auditor` with independence attestation for facility audits).
13. **Sign-Off Format, Non-Blank `N/A` Rule & Permanent Audit PDF (#17, #18, #23):** Sign-off captures **Typed Full Name + Authenticated Login + Certificate Type & Number (or explicit `N/A`, never blank) + Optional Drawn Signature + Timestamp + Compliance Helper Disclaimer**. Audits can be signed offline (`"Signed offline — pending sync"`), and the immutable official Audit Record + PDF generate upon sync and are retained permanently.

---

## Part 3: Screen-by-Screen Flow & Interaction Spec (#22 Prototype)

### Screen Overview & State Flow

```
[1. Audit Hub & Location Tree Picker]  <-- (or Scan Location QR /q/K7M2QX)
        │  (Online start: downloads & caches location subtree snapshot)
        ▼
[2. Active Spot Checklist (Grouped by Child Spot + All/Tools/Consumables Pills)]
   ├──► [3. In-App Camera QR Scanner (Torch + Manual ID Fallback)]
   │       ├──► (If Overdue/Unserviceable/Expired) ──► [4. Immediate Segregation / Quarantine Alert]
   │       ├──► (If belongs to another spot)       ──► [6A. Wrong Location: Move Now vs. Log Finding]
   │       └──► (If unknown QR or unlabelled)      ──► [6B. Add Unrecorded Item Modal]
   ├──► [5A. Tool Check Card: Present/SAT | Can't Find (->Missing) | Damaged (->Unserviceable) | Wrong Loc]
   ├──► [5B. Consumable Lot Count Card: Numeric Keypad in Stock Unit | Can't Find/0 | Damaged (->Quarantined)]
   └──► [7. Offline Outbox Drawer & Pause / Handoff State]
        │
        ▼
[8. Discrepancy Review & Role-Gated Official Sign-Off Block]
        │  (If offline: "Signed offline — pending sync" -> syncs when online)
        ▼
[9. Completed Audit Record, Variance Application & Official Audit PDF View]
```

---

### Screen 1: Audit Hub, Mode Selector & Location Tree Picker

**Purpose:** Let the user pick the audit type, select a root location node (or scan a location QR label), download the spot's item list while online, or resume a paused/handed-off audit.

#### Key UI Components
1. **Top Mode Switcher (Segmented Control or Mode Cards):**
   - **Physical Location Audit** *(Default phone flow — walks Tools + Consumables per spot)*
   - **Monthly Cal-Record Audit** *(Badge: `DUE IN 9D · OCT 2026` — `cal designee` sign-off)*
   - **Monthly Expired-Materials Check** *(Badge: `DUE IN 9D · OCT 2026` — `Inspector` / `Admin` / `cal designee`)*
   - **Facility / Area Audit (`SAT`/`UNSAT`/`N/A`)** *(Annual/24-mo cadence — `designated auditor` sign-off + independence check)*
2. **Quick Scan Location Entry (`52px` primary bar):**
   - Button: **`[ 📷 Scan Location QR to Start ]`** — scans a `/q/<code_id>` label on a cabinet, crib door, toolbox, or fly-away kit (#20) and jumps directly to that node's audit preview.
3. **In-Progress / Handoff Banner (if applicable):**
   - Shows paused audits on this device (`Hangar 1 > Tool Crib · 18/26 checked · 3 unsynced entries · Resume`) and audits awaiting official sign-off (`Started by M. Vance (Mechanic) · Ready for Inspector Sign-off`).
4. **Collapsible Location Tree (#12):**
   - Displays node icon + type badge (`AREA`, `ROOM`, `CABINET`, `DRAWER`, `SHELF`, `TOOLBOX · Owner: J. Miller`, `KIT · ◆ MOBILE`) + rollup item count (`14 Tools · 8 Lots across 4 child spots`).
   - Built-in **`Unassigned`** node pinned at bottom (`3 items awaiting placement`).
5. **Pre-Flight Download Sheet (on node selection):**
   - Shows scope summary: *"Auditing **Cabinet B (and 3 child drawers)** — 19 Tools, 7 Consumable Lots."*
   - Primary CTA (`56px`): **`Download List & Start Audit`** (caches read-only snapshot in IndexedDB so the auditor can walk into dead zones per #18).

---

### Screen 2: Active Spot Checklist (Walking Audit View)

**Purpose:** Primary walking screen on the phone (left pane on tablet). Groups items by child spot so the mechanic or inspector checks one drawer or shelf at a time.

#### Sticky Header Zone
- **Row 1 — Breadcrumb & Sync Status Pill:**
  - Left: `← Hangar 1 / Tool Crib / Cabinet B`
  - Right (Sync Pill):
    - Online & synced: `● Online · Synced` (Emerald)
    - Offline / queued: `▲ Offline · 4 pending sync` (Amber dashed button; tapping opens Screen 7 Outbox Drawer)
- **Row 2 — Progress & Pause:**
  - Progress bar + `14 / 26 Checked (54%)` + `2 Findings` badge + `Pause / Save` button.
- **Row 3 — Scope Filter Pills (`44px` height):**
  - `[ All (26) ]` (active) · `[ Tools (19) ]` · `[ Consumables (7) ]`
  - Secondary toggle chip: `[ Unchecked Only (12) ]`
- **Conditional iOS PWA Banner (shown on iOS browser when `pending_sync > 0`, #18):**
  - Compact high-contrast amber strip: `▲ 4 audit entries saved on phone. Install to Home Screen (Share → Add to Home Screen) so iOS Safari never clears unsynced data.`

#### Grouped Child Spot Sections
Each child spot renders a sticky section header (`title-group`, `--bg-elevated`):
- Example: **`Drawer 1 — Torque & Precision`** · `6/6 Checked ✓` (collapsible once complete)
- Example: **`Drawer 2 — Sealants, Tapes & Gauges`** · `2/8 Checked` + `[ + Add Unrecorded Item Here ]`

#### Item Row Anatomy (Tool vs. Consumable Lot)
- **Tool Row (`Calibrated` or `Reference-only`):**
  - Left `2px` status bar + Monospace **Tool ID** (`T-0104`) + Status Badge (`✓ SERVICEABLE`, `▲ DUE SOON · 19D`, `◆ REFERENCE ONLY`, or `✕ OVERDUE`).
  - Title: **Nomenclature** (`Torque Wrench, 3/8" Drive 50–250 in-lb`)
  - Mono Meta: `P/N: QD2R250 · S/N: 0918402 · Cal Due: 2026-11-30` (or `Owner: R. Gomez (Personal)`)
  - Right Quick Action (`48×48px`): One-tap `✓ Present` button or `⋯ Check / Flag` (opens Screen 5A).
- **Consumable Lot Row (including Split Lots & Opened Containers):**
  - Left `2px` status bar + Monospace **Lot #** (`LOT-2026-04A`) + Badge (`✓ SERVICEABLE`, `◆ OPENED · 3D LEFT`, or `✕ EXPIRED`).
  - Title: **Nomenclature** (`Fuel Tank Sealant, Class B-2`)
  - Mono Meta: `P/N: PR-1422-B2 · Expected Here: 6.0 tube (Split lot: 18.0 total) · Exp: 2026-12-15`
  - Right Quick Action (`48px` height): **`[ Count: __ tube ]`** button (opens Screen 5B numeric keypad).

#### Sticky Bottom Action Dock (`--bg-glass-dock`)
- Left (`48px`): **`[ + Unrecorded ]`**
- Center (`56px`, prominent Sky/Blue button): **`[ 📷 Scan QR / Barcode ]`**
- Right (`48px`): **`[ Review & Sign (14/26) → ]`**

---

### Screen 3: In-App QR Scanner & Manual ID Fallback

**Purpose:** Fast one-handed scanning inside dark cabinets without triggering an iOS Safari context switch (#6).

#### Interaction Spec
- Uses `navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })` + self-hosted `barcode-detector` WASM polyfill.
- **Viewfinder Overlay (`38vh` top sheet on Phone, pinned right panel on Tablet):**
  - Target reticle sized for **`13–17 mm` square QR labels** (4-module quiet zone) at `15–30 cm` (hand's length).
  - **Torch Toggle Button (`48×48px`):** `🔦 Torch ON/OFF` via `MediaStreamTrack.applyConstraints({ advanced: [{ torch: true }] })` for dark shelves and belly bays.
  - **Continuous Scan Mode Toggle:** stays open after each scan, showing a `1.5s` toast card at the bottom of the viewfinder (`✓ T-0104 Marked Present — captured 16:21`) for tools, or sliding up the numeric count pad for consumable lots.
- **Always-Visible Manual ID / Search Fallback Bar (below viewfinder):**
  - Input (`48px`, `.font-aviation-mono`): `Type Tool ID, P/N, S/N, or Lot #...`
  - Handles small tools (feeler gauges, pin gauges) where the label is worn by Skydrol/MEK or only the laser-etched serial is readable (#5), plus a **`[ Flag Damaged / Missing QR Label ]`** checkbox so an Inspector/Admin can reprint the same opaque code (`/q/K7M2QX`, #20).

---

### Screen 4: Immediate Safety & Segregation Warning (Overdue / Unserviceable / Expired)

**Purpose:** Enforce the 10+ seat maintenance manual rule (#23) that overdue/unserviceable tools and expired/quarantined consumables cannot remain in serviceable storage.

#### Trigger Conditions
1. Auditor scans or taps a tool whose live status is **`OVERDUE`**, **`UNSERVICEABLE`**, or **`PENDING VERIFICATION`**.
2. Auditor scans or taps a consumable lot whose status is **`EXPIRED`** or **`QUARANTINED`**, or enters a container expiry date that has already passed.

#### Modal / Blocking Banner UI (`--status-danger` border `2px solid #EF4444`)
- **Header:** `⯃ STOP — DO NOT LEAVE IN SERVICEABLE STORAGE`
- **Item Callout (`.font-aviation-mono`):**
  - Example Tool: `T-0089 · Digital Caliper 6" (S/N: 4401920)` — Status: **`✕ OVERDUE (Due: 2026-09-30)`**
  - Example Lot: `LOT-2025-11C · PR-1422-B2 Sealant` — Status: **`✕ EXPIRED (Effective Exp: 2026-10-15)`**
- **Required Action Prompt:**
  - *"Per shop manual procedures, overdue/unserviceable tools and expired/suspect lots must be physically tagged and segregated from serviceable stock."*
- **Action Buttons (`52px` height):**
  1. **`✓ Physically Segregated / Moved to Quarantine`** (records presence + logs physical segregation action in the audit finding).
  2. **`✕ Still in Crib — Flag for Immediate Removal`** (records high-priority discrepancy finding on the audit).
  3. **`? Can't Find Item Here`** (marks `Missing` / `0 qty`).

---

### Screen 5A: Tool Presence & Condition Check Card

**Purpose:** Inspect and record a single calibrated or reference-only tool (via tap or scan).

#### Card Content & 4 Condition Outcomes (#17)
- **Header:** `T-0104` (`.font-aviation-mono`) · `Torque Wrench 3/8" Drive` · Badge `✓ SERVICEABLE` (or `◆ REFERENCE ONLY`)
- **Sub-metadata:** `P/N: QD2R250 · S/N: 0918402 · Expected Spot: Cabinet B > Drawer 1`
- **4 Large Selection Buttons (`48px–52px` height, full width or 2×2 grid):**
  1. **`●✓ Present / SAT`** — Tool is in this spot, label is legible, no visible damage.
  2. **`⯃✕ Damaged / UNSAT`** — Expands a required **Damage / Unserviceable Reason** field (quick chips: `Dropped / Out of cal suspected`, `Broken mechanism`, `Illegible scale`, `Missing cal sticker` + free text).
     - *UI Consequence Callout:* `▲ On sync, this tool will immediately become UNSERVICEABLE. Only an Inspector or Admin can return it to service.`
  3. **`⯃? Can't Find`** — Marks finding as `Can't find`.
     - *UI Consequence Callout:* `▲ On sync, this tool will immediately be flagged MISSING. Only an Inspector or Admin can clear it.`
  4. **`▲⇄ Wrong Location`** — Opens Screen 6A to record where it was found or move it now.
- **Optional Checkboxes / Notes:**
  - `[ ] QR label damaged or missing — queue reprint (/q/K7M2QX)`
  - `Add audit note...`

---

### Screen 5B: Consumable Lot Quantity Count & Condition Card

**Purpose:** Count live quantity in the item's stock unit (#14) and verify container expiry/condition without silently overwriting live records (#17, #18).

#### Card Content & Ergonomic Keypad
- **Header:** `LOT-2026-04A` (`.font-aviation-mono`) · `PR-1422-B2 Fuel Tank Sealant`
- **Split-Lot & Expiry Context Bar (`.font-aviation-mono`):**
  - `Spot: Cabinet B > Shelf 2`
  - `Expected Qty at this Spot: 6.0 tube` *(Total across shop: `18.0 tube` across 2 locations)*
  - `Container Expiry: 2026-12-15` *(If opened split line: `Opened 2026-10-10 · Effective Exp: 2026-10-25`)*
- **Count Display & Quick-Match Bar (`56px`):**
  - Large `.font-aviation-mono` readout: **`[ 6.0 ] tube`**
  - One-tap shortcut: **`[ Match Expected (6.0 tube) ]`** + **`[ −1 ]`** + **`[ +1 ]`**
- **Glove-Friendly Numeric Keypad (`48px` keys):**
  - Digits `0–9`, decimal `.` (for `oz`, `qt`, `ft` partial quantities per #14), and `⌫`.
- **Live Variance Indicator:**
  - If user enters `4.5 tube`: renders `▲ Variance: −1.5 tube (Expected 6.0 → Counted 4.5). Creates adjustment entry linked to Audit #AUD-2026-1022 on sign-off.`
- **Condition Outcome Buttons (`48px`):**
  1. **`●✓ Confirm Count & Serviceable`** (saves `counted_qty` finding).
  2. **`⯃? Can't Find / Count = 0`** (sets `counted_qty = 0`, variance `−6.0 tube`).
  3. **`⯃✕ Damaged / Suspect / Untraceable — Quarantine`** (requires reason chip: `Leaking / Punctured`, `Missing / illegible expiry label`, `Improperly stored`, `Suspect contamination`).
     - *UI Consequence Callout:* `▲ On sync, this lot moves immediately to QUARANTINED. Usage draws will be blocked until an Inspector or Admin clears it.`
  4. **`Split / Mark 1 Container Opened`** (optional helper link to #14 opened-container split flow if auditor discovers an unrecorded opened container).

---

### Screen 6A: Wrong Location Resolution (`expected_location -> found_location`)

**Purpose:** Handle items scanned or discovered in a spot different from their recorded location (#12, #17).

#### Trigger
While auditing `Cabinet B > Drawer 2`, the auditor scans `T-0211` (whose recorded home location is `Hangar 1 > Sheet Metal Rack`).

#### Resolution Card UI
- **Banner:** `▲ ITEM ASSIGNED TO ANOTHER LOCATION`
- **Comparison Block (`.font-aviation-mono`):**
  - `Item:` `T-0211 · Rivet Gun 3X (S/N: 77410)` — Status: `✓ SERVICEABLE`
  - `Expected Location:` `Hangar 1 > Sheet Metal Rack`
  - `Found Location (Current Audit Spot):` `Hangar 1 > Tool Crib > Cabinet B > Drawer 2`
- **Two Resolution Paths (#17):**
  1. **Primary Button (`52px`): `[ ⇄ Move to Drawer 2 Now & Mark Present ]`**
     - *Why allowed:* Per #12 Decision 9, any signed-in role (including Mechanics) can move a tool or lot without approval. Logs an audit-linked move (`who`, `when`, `from -> to`, `audit_id`) and checks the item off at the current spot.
  2. **Secondary Button (`48px`): `[ Leave Assigned to Sheet Metal Rack & Log Finding ]`**
     - Records `expected_location -> found_location` as a discrepancy finding for the Manager/Inspector without changing the item's assigned home location (e.g., when a tool only needs to be carried back to its home rack).

---

### Screen 6B: Add Unrecorded / Unlabelled Item Flow

**Purpose:** Capture mystery tools or unlabelled consumable containers found sitting in a drawer or shelf (#17).

#### Modal / Sheet Fields
1. **Current Spot (pre-filled, editable):** `Hangar 1 > Tool Crib > Cabinet B > Drawer 2`
2. **Item Class Selector (Segmented `48px`):** `[ Tool ]` · `[ Consumable / Material ]`
3. **Photo Capture (`52px`):** `[ 📷 Take Photo of Item / Data Plate ]` (stored in IndexedDB outbox blob if offline).
4. **Description / Nomenclature (Required):** e.g., `Digital Protractor, Mitutoyo`
5. **Identifiers (`.font-aviation-mono`, optional but prompted):**
   - `P/N or Model:` `PRO-360`
   - `S/N or Lot/Batch #:` `SN-550192`
   - `Marked Expiry / Cal Sticker Date (if visible):` `2027-03-31`
6. **Submit Action (`52px`):** **`Save Unrecorded Item Finding`**
   - *Downstream Inspector/Admin Resolution Queue (Desktop/Tablet):* Inspector or Admin clicks `Resolve` $\rightarrow$ either **(a) Match to existing record** (e.g., a `Missing` tool or `Unassigned` import row) + print/claim QR label (#20), or **(b) Create new record** (new tool starts in **`Needs cal`** per #13; new lot without verified cert starts in **`Quarantined`** per #14).

---

### Screen 7: Offline IndexedDB Outbox, Sync Status & Pause / Handoff

**Purpose:** Give complete transparency into what is stored on the phone vs. synced to Supabase (#6, #18) and support pausing or handing off an audit.

#### Outbox Drawer UI (Opened by tapping the Header Sync Pill)
- **Connection & Cache Summary Card:**
  - `Network State:` `Offline (Dead Zone — No Hangar Wi-Fi)`
  - `Spot Snapshot Downloaded:` `2026-10-22 15:48 PDT (Read-only master list: 26 items)`
  - `Outbox Queue:` `6 findings pending sync (IndexedDB persistent storage)`
- **Action Bar:**
  - **`[ ↻ Sync Now ]`** (triggers immediate replay when online; automatic replay runs on `window.online`, app open, and Android Background Sync).
- **Per-Finding Queue List (`.font-aviation-mono` timestamps):**
  - Each row shows its client UUID prefix, item ID, finding summary, **`captured_at` (device clock)**, and **`synced_at` (server clock or `Pending`)**:
    - `T-0104 · Present / SAT` — `Captured 15:51:04 PDT · ✓ Synced 15:51:05 PDT`
    - `T-0089 · Damaged -> Unserviceable` — `Captured 15:54:19 PDT · ▲ Pending sync`
    - `LOT-2026-04A · Count: 4.5 tube (−1.5 var)` — `Captured 15:56:02 PDT · ▲ Pending sync`
- **Conflict & Immutability Guarantee Callout (#6, #18):**
  - *"Audit entries sync as append-only findings using idempotent client IDs and never silently overwrite live records. If another device recorded a count for the same item, both findings are preserved for review."*
- **Pause / Handoff Sheet:**
  - **`Pause & Save Progress`:** Keeps session active; syncs all queued findings so the same user (or another user on another device once synced) can resume.
  - **`Complete Count & Hand Off for Official Sign-Off`:** For a `Mechanic` who has finished counting all 26 items but does not hold an `Inspector`, `Admin`, `cal designee`, or `designated auditor` flag (#10, #17). Marks the count phase complete with the Mechanic recorded as **`Counted by: M. Vance (Mechanic)`** and routes the audit to the Sign-Off Queue.

---

### Screen 8: Discrepancy Summary & Role-Gated Official Sign-Off Block

**Purpose:** Summarize all findings, enforce role/flag permissions and auditor independence, and capture the manual-compliant sign-off block (#10, #17, #18, #23).

#### Section A: Audit Summary Metrics Grid (`tabular-nums`)
| Metric | Count | Action on Sync / Sign-Off |
| :--- | :--- | :--- |
| **Total Expected Items** | `26` (`19 Tools · 7 Lots`) | `26 / 26 Checked (100%)` |
| **Verified (`Present / SAT` / Exact Count)** | `20` | Recorded in permanent audit log |
| **Immediate Safety Flags Raised** | `2` (`1 Missing · 1 Quarantined`) | Applied **immediately on sync** (`T-0112 -> Missing`, `LOT-2026-02B -> Quarantined`) |
| **Location Moves (`Wrong location`)** | `2` (`1 Moved now · 1 Open finding`) | `T-0211` moved to `Drawer 2`; `T-0044` flagged for review |
| **Consumable Quantity Variances** | `1` (`LOT-2026-04A: 6.0 → 4.5 tube`) | `[✓] Apply variance adjustment entry (−1.5 tube, Reason: Audit #AUD-2026-1022)` *(Inspector/Admin/Designee toggle)* |
| **Unrecorded Items Found** | `1` (`Digital Protractor`) | Queued for Inspector/Admin record match or creation |

*(Note: If any expected items remain unchecked, a prominent warning asks whether to go back and check them or explicitly mark the remaining items `Can't find` / `N/A`—no blank cells are permitted in the final record per #23.)*

#### Section B: Role Gate & Independence Check (#10, #17, #23)
- **Counter Attribution (Always shown, read-only):**
  - `Physical Count Performed By:` `Canaan W. (Admin)` or `M. Vance (Mechanic) · 2026-10-22 15:48–16:12 PDT`
- **Role Gate Evaluation:**
  - *Routine Location / Crib / Kit Audit:* Requires `Inspector`, `Admin`, or `designated auditor`.
  - *Monthly Calibration-Record Audit:* Requires `cal designee` flag.
  - *Monthly Expired-Materials Check:* Requires `Inspector`, `Admin`, or `cal designee`.
  - *Facility / Area Audit:* Requires `designated auditor` flag **plus** automatic **Auditor Independence Check** (blocks sign-off if the current user owns the personal toolbox being audited or logged the underlying work being audited, and requires checking: `[✓] I attest that I am independent of the area and work covered by this facility audit`).
  - *If current user is a Mechanic without the required sign-off flag:* The Official Sign-Off fields below are locked with a clear state: **`[ Submit Count for Inspector / Designee Sign-Off ]`**.

#### Section C: Official Sign-Off Form (No Blank Fields Allowed — #17, #23)
1. **Authenticated Account (Read-Only Verified Badge):**
   - `Signed in as: Canaan W. (canaan@apexmx.example.com) · Role: Admin · Flags: Cal Designee, Designated Auditor`
2. **Typed Full Name (Required input, `48px`):**
   - Pre-filled or typed to match legal printed name: `[ Canaan W. ]`
3. **Certificate Type & Number (Required — never blank, `.font-aviation-mono`):**
   - Pre-filled from user profile with segmented override:
   - `[ A&P ]` · `[ IA ]` · `[ Repairman ]` · **`[ N/A (Not Applicable) ]`**
   - Number input (`.font-aviation-mono`): `[ A&P 3948102 ]` *(When `N/A` is selected, field locks to explicit string **`N/A`** so the database and PDF never contain a blank cell).*
4. **Drawn Signature (Optional, `signature_pad` canvas, `140px` height):**
   - High-contrast stroke canvas with `[ Clear ]` button. Redraws from vector point data (`toData()`) on screen rotation/resize (#6). Stored in IndexedDB outbox when offline.
5. **Mandatory Compliance Helper Disclaimer Box (`--bg-elevated`, `1px solid`):**
   - *"INTERNAL COMPLIANCE HELPER NOTICE: This record and its generated PDF serve as an internal compliance helper and audit log under the shop's procedures. It is not an FAA-approved 14 CFR Part 11 electronic signature system."*
6. **Primary Sign-Off CTA (`56px`):**
   - **When Online:** **`[ ✓ Sign & Generate Official Audit PDF ]`**
   - **When Offline (#18 Decision 5):** **`[ ▲ Sign Offline (Pending Sync) ]`**
     - Renders locked post-sign banner: **`▲ SIGNED OFFLINE — NOT YET SYNCED`** (*"Signed by Canaan W. at 16:18 PDT on device. Official audit record and PDF will be generated automatically as soon as this device reconnects and syncs."*).

---

### Screen 9: Official Audit PDF Layout & Desktop Review Spec

**Purpose:** Render the permanent, print-ready Audit PDF (`letter` / `A4`, black-on-white high-contrast industrial typography with `.font-aviation-mono` tabular columns) generated upon sync (#17, #18, #23).

#### Page 1: Header, Sign-Off Block & Summary Metrics
```
================================================================================
APEX CHARTER MX MAINTENANCE — INTERNAL COMPLIANCE AUDIT RECORD
Audit ID: AUD-2026-1022-04                 Audit Mode: Physical Location Audit
Root Scope: Hangar 1 > Tool Crib > Cabinet B (including 3 child spots)
Started:   2026-10-22 15:48 PDT (UTC-7)    Completed: 2026-10-22 16:18 PDT (UTC-7)
Synced:    2026-10-22 16:24 PDT (UTC-7)    Record Status: OFFICIAL — LOCKED
--------------------------------------------------------------------------------
COUNTED BY                                 OFFICIAL SIGN-OFF
Name:  M. Vance (Mechanic)                 Printed Name: Canaan W.
Login: mvance@apexmx.example.com                  Login / Role: canaan@apexmx.example.com (Admin / Cal Designee)
Date:  2026-10-22 16:12 PDT                Cert Type & #: A&P 3948102   [Drawn Sig SVG / N/A]
                                           Signed Date:  2026-10-22 16:18 PDT
                                           Independence Attestation: N/A (Location Audit)
--------------------------------------------------------------------------------
SUMMARY METRICS
Expected Items: 26 (19 Tools, 7 Lots)      Verified (SAT / Match): 20
Missing Tools:  1  (Flagged MISSING)       Damaged / Quarantined:  2
Wrong Location: 2  (1 Moved, 1 Finding)    Qty Variances Applied:  1 (Adj #VAR-0091)
Unrecorded Found: 1 (Pending Resolution)
================================================================================
```

#### Section 2: Itemized Table Grouped by Spot (Every Field Populated — `N/A` Instead of Blanks)

| Spot | Class | ID / Lot # | P/N & S/N | Nomenclature | Cal Due / Exp | Expected | Counted / Result | Resulting Status | Notes / Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Cabinet B > Drawer 1` | `CAL TOOL` | `T-0104` | `QD2R250` / `SN:0918402` | Torque Wrench 3/8" | `2026-11-30` | `Present` | `Present / SAT` | `SERVICEABLE` | `N/A` |
| `Cabinet B > Drawer 1` | `REF TOOL` | `T-0119` | `MIT-150` / `SN:N/A` | Steel Rule 6" | `N/A (REF)` | `Present` | `Present / SAT` | `REFERENCE ONLY` | `N/A` |
| `Cabinet B > Drawer 1` | `CAL TOOL` | `T-0112` | `FLU-87V` / `SN:4410922` | Digital Multimeter | `2027-01-31` | `Present` | `CAN'T FIND` | `MISSING` | Auto-flagged `Missing` on sync |
| `Cabinet B > Drawer 2` | `LOT` | `LOT-2026-04A` | `PR-1422-B2` / `B:8841` | Fuel Tank Sealant B-2 | `2026-12-15` | `6.0 tube` | `4.5 tube` (`-1.5`) | `SERVICEABLE` | Variance Adj `#VAR-0091` applied |
| `Cabinet B > Drawer 2` | `LOT (OPEN)`| `LOT-2026-02B` | `LPS-3-11OZ` / `B:1104` | Corrosion Inhibitor | `2026-10-25` | `2.0 can` | `DAMAGED / SUSPECT` | `QUARANTINED` | Nozzle broken; segregated |

#### Section 3: Discrepancies, Unrecorded Items & Corrective Action Log
- Lists every `Missing`, `Damaged / Unserviceable`, `Quarantined`, `Wrong location`, `Variance`, `Unrecorded item`, and (for Facility Audits) every `UNSAT` checkpoint with its required **Corrective Action** and **Head of Maintenance (Admin) Closure Verification Sign-Off Block** (`Printed Name`, `Cert Type & # or N/A`, `Closure Date`, `Status: OPEN / CLOSED`).

#### Footer (Repeated on Every Page)
- `INTERNAL COMPLIANCE HELPER — Helper record generated by HangarShopApp. Not an FAA-approved electronic signature system. Retained permanently. Page X of Y.`

---

## Part 4: Prototype Interactive Checklist for Review with Canaan (#22)

To make the throwaway prototype session on Canaan's phone maximally productive, include a compact floating **`[ ⚙️ Prototype Scenario Switcher ]`** pill in the corner so Canaan can test all critical edge cases in 3 minutes:
1. **Role Switcher:** `Admin (Cal Designee + Designated Auditor)` vs. `Inspector` vs. `Mechanic (Count & Handoff only)`.
2. **Network Toggle:** `Online (Live Sync)` vs. `Offline Dead Zone (IndexedDB Outbox + iOS Home Screen Banner + Offline Sign-Off)`.
3. **Simulate QR Scans:**
   - Scan `T-0104` (Normal `Serviceable` tool $\rightarrow$ instant `Present / SAT` toast)
   - Scan `T-0089` (`OVERDUE` tool $\rightarrow$ triggers **Immediate Segregation Warning Modal**)
   - Scan `T-0211` (Belongs to `Sheet Metal Rack` $\rightarrow$ triggers **Wrong Location: Move Now vs. Log Finding**)
   - Scan `LOT-2026-04A` (Split consumable lot $\rightarrow$ opens **Decimal Unit Keypad** with variance preview)
   - Tap `+ Add Unrecorded Item` (Mystery tool found in drawer)
