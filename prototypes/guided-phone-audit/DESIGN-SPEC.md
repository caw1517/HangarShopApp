# HangarShopApp — Design System & #22 Guided Phone Audit Prototype Spec (v2)

**Repository:** `caw1517/HangarShopApp`  
**Target Deliverable:** Issue [#22 — Prototype the guided phone audit flow](https://github.com/caw1517/HangarShopApp/issues/22) (unblocked by [comment #6353184187](https://github.com/caw1517/HangarShopApp/issues/22#issuecomment-6353184187))  
**Visual Benchmark (v2 Direction from Canaan):**
- **Primary Reference:** **Swiss-AS AMOS** (`AMOSmobile/STORES` https://www.swiss-as.com/amosmobilestores & `AMOSmobile/EXEC` https://www.swiss-as.com/amosmobileexec) — Canaan's single favorite reference — paired with **Oxide Computer** (https://oxide.computer/) and **IBM Carbon** (`0px` sharp monospace hardware grid).
- **Core Aesthetic:** Bordered aviation MRO inspection work-card / stores ledger terminal. Zero consumer-app "vibe-code" card stacks, zero rounded pills, zero stacked pastel alert banners, and zero Unicode emojis.

**Source Issues & Settled Decisions Incorporated:**
- [#1 — Release 1 Wayfinder Map](https://github.com/caw1517/HangarShopApp/issues/1) · [#5 — Durable QR Labels](https://github.com/caw1517/HangarShopApp/issues/5) · [#6 — Phone QR & Offline Research](https://github.com/caw1517/HangarShopApp/issues/6) · [#10 — Roles, Permissions & Auth](https://github.com/caw1517/HangarShopApp/issues/10) · [#11 — Usage Logging](https://github.com/caw1517/HangarShopApp/issues/11) · [#12 — Location Model](https://github.com/caw1517/HangarShopApp/issues/12) · [#13 — Tool Lifecycle States](https://github.com/caw1517/HangarShopApp/issues/13) · [#14 — Consumable Lots & Expiry](https://github.com/caw1517/HangarShopApp/issues/14) · [#17 — Guided Phone Audit Scope & Findings](https://github.com/caw1517/HangarShopApp/issues/17) · [#18 — Hangar Offline Behavior](https://github.com/caw1517/HangarShopApp/issues/18) · [#20 — End-to-End QR Labels](https://github.com/caw1517/HangarShopApp/issues/20) · [#23 — Apex Charter MX 10+ Seat Manual Procedures](https://github.com/caw1517/HangarShopApp/issues/23)

---

## Part 1: Six Mandatory Structural & Anti-Vibe-Code Rules (v2)

1. **Aviation Inspection Ledger / Work-Card Framing (Swiss-AS AMOS Style):**
   - The screen is structured as a bordered aviation MRO inspection form / stores terminal, **not** a consumer web app.
   - The top of the screen is a shared-border engineering form header block (`1px solid` grid cells abutting with `0px` gap and `0px` `border-radius`):
     ```
     DOC: HCA-AUD-2026-1022 | SCOPE: HGR-1 / CRIB-A / CAB-C04 | MODE: LOCATION AUDIT | SYNC: OFFLINE (3 QUEUED) | USER: J. MILLER (MECH)
     ```
   - **Zero stacked pastel banners:** Offline/outbox state lives inside its dedicated `SYNC` cell in the form header grid (with a compact `3px` amber or red left cell rule and clickable outbox trigger). Any iOS Home Screen PWA install notice lives **inside the Outbox drawer only**, never stacked on the main viewport.

2. **Edge-to-Edge `0px` Hairline Table / Ledger Rows (IBM Carbon + Oxide Style):**
   - **No card-per-item lists:** `border-radius: 0px` everywhere (`--radius: 0px`), zero `gap: 16px` floating card stacks.
   - Every item is a dense, edge-to-edge hairline row sharing `1px solid` horizontal and vertical cell dividers, grouped under flush `26px`-tall full-width section divider bars:
     `DRAWER D1 — TORQUE & PRECISION · LOC-C04-D1 [2/4 CHECKED]`
   - **Phone (`390px`):** Each row is a tight 2-line tabular ledger row with a dedicated right-hand action cell (`44–48px` tall flush hardware button sharing the row's `1px` vertical border).
   - **Tablet (`820px`) & Desktop (`1280px`):** True multi-column shared-border data grid (`LINE | ID / LOT | NOMENCLATURE | P/N · S/N | DUE / EXP | EXP QTY | RESULT | STATUS`).

3. **Zero Unicode Emojis Anywhere in the DOM:**
   - Strictly zero emojis or dingbats (camera, flashlight, siren, warning, checkmark, or dingbat glyphs).
   - Use crisp `12px` `1.5px`-stroke geometric SVG symbols (square, octagon, triangle, crosshair, bracket reticle) and strict 3-letter aviation status codes (`SVC`, `DUE`, `OVD`, `UNS`, `QRN`, `EXP`, `MSN`, `REF`, `PND`, `CAL`, `OFC`, `RET`).

4. **Quiet-When-Nominal Status Discipline:**
   - **Do NOT put bright green pill badges on nominal `SERVICEABLE` items.**
   - Nominal rows render plain monochrome `SVC` (with a tiny `6px × 6px` crisp neutral/slate square SVG or CSS indicator) so the technician's eye goes immediately to off-nominal exceptions (`[OVD · DO NOT USE]` in high-contrast red and `[DUE · 14D]` in industrial amber).

5. **No 2×2 / 8-Up KPI Summary Tile Grids:**
   - Delete all 2×2 child-spot card grids and 8-box KPI metric tile grids.
   - Use a single flush `32px` (`44px` touch-target height on phone/tablet) segmented toolbar strip with shared `1px` borders:
     ```
     SPOT: [ALL 8] [D1 2/4] [D2 2/3] [S1 1/1] [D3 0/0]  |  FILTER: [ALL 8] [TOOLS 5] [LOTS 3] [UNCHECKED 3] [FINDINGS 2]
     ```
   - On Desktop Review and Sign-Off screens, summary counts render as a single flush shared-border horizontal ledger strip (`EXPECTED: 8 | CHECKED: 5 | SAT/CNT: 5 | FINDINGS: 2 | VARIANCES: 1 | OUTBOX: 3`), never a multi-row card grid.

6. **Hide the Prototype Switcher Chrome:**
   - Keep viewport, theme, network, and role prototype controls in a single compact, dark `28px` technical debug strip pinned at the very bottom of the browser window:
     ```
     DEV HARNESS: [390] [820] [1280] | [LIGHT] [DARK] | [ONLINE] [OFFLINE] | [MECH] [INSP]
     ```
   - The top of the screen looks 100% like a production Swiss-AS AMOS / Oxide MRO terminal.

---

## Part 2: Utilitarian Aviation / Industrial Visual Tokens (v2)

### 2.1 Color Palette (Slate / Zinc Hardware Grid — Light & Dark Modes)

All semantic colors meet **WCAG AAA (7:1+)** for primary identifiers and **AA (4.5:1+)** for secondary labels.

| Token | Sunlit Hangar (Light Mode) | Wheel-Well / Night Shift (Dark Mode) | Usage |
| :--- | :--- | :--- | :--- |
| `--stage` | `#D8DEE6` | `#06080A` | Outer browser surround around device frame |
| `--canvas` | `#EDF1F5` | `#0B0E12` | Terminal background / section band fill |
| `--surface` | `#FFFFFF` | `#11161D` | Ledger row surface, form cells, inspector pane |
| `--surface2` | `#E6ECF2` | `#171E27` | Table header bars, section dividers (`26px`), read-only cells |
| `--hover` | `#DCE4EC` | `#1E2733` | Row/cell active/hover state |
| `--border` | `#B8C4D0` | `#263040` | Primary `1px solid` shared cell and row hairline |
| `--border2` | `#7C8B9B` | `#3B495E` | Outer work-card frame border, active input border |
| `--text` | `#0B121B` | `#E8EEF5` | Primary nomenclature, IDs, counts |
| `--text2` | `#2C3A4B` | `#B4C0CE` | Secondary metadata (`P/N`, `S/N`, location codes) |
| `--text3` | `#526275` | `#7A899B` | Field labels (`DOC`, `SCOPE`, column headers, nominal `SVC`) |
| `--accent` | `#00529B` (AMOS Blue) | `#4DA3FF` | Active tab rule, primary hardware action fill, focus outline |
| `--accent-ink`| `#FFFFFF` | `#06101E` | Foreground on `--accent` |
| `--accent-soft`| `#E3EFFB` | `#10243A` | Selected ledger row tint |
| `--r-fg` / `--r-bg` / `--r-bd` | `#9E1B16` / `#FCE8E6` / `#D96B66` | `#FF8A84` / `#2D1112` / `#8C3232` | Off-nominal Danger (`OVD`, `UNS`, `QRN`, `EXP`, `MSN`) |
| `--a-fg` / `--a-bg` / `--a-bd` | `#7C3A05` / `#FEF3C7` / `#D99B26` | `#F7B955` / `#291C07` / `#785516` | Off-nominal Caution (`DUE`, `PND`, `CAL`, `OFC`, `WRG`, `VAR`) |
| `--g-fg` / `--g-bg` / `--g-bd` | `#14532D` / `#E6F4EA` / `#68B884` | `#6EE7B7` / `#0C2418` / `#246342` | Verified audit completion / synced confirmation only |

---

### 2.2 3-Letter Aviation Status Codes & Quiet-When-Nominal Badge Rules

All status indicators use `border-radius: 0px`, `height: 20px`, `padding: 0 5px`, `11px` `--font-mono` (`font-weight: 700`, `letter-spacing: 0.04em`), and a `12px × 12px` `1.5px`-stroke geometric SVG symbol:

| 3-Letter Code | Full Display Tag | Visual Treatment | Domain Rule (#13, #14, #17, #18) |
| :--- | :--- | :--- | :--- |
| `SVC` | `SVC` | **Quiet / Monochrome** (`color: var(--text2)`, `border: 1px solid var(--border)`, `6px` square SVG) | Nominal `Serviceable` tool or lot. **Never** uses a bright green pill. |
| `REF` | `REF · NO CAL` | **Quiet / Monochrome** (`border: 1px solid var(--border)`, diamond SVG) | `Reference-only` tool (#13). Included in location/facility audits; excluded from cal-record audit. |
| `DUE` | `[DUE · 14D]` | **Amber Caution Box** (`--a-fg` / `--a-bg` / `--a-bd`, triangle SVG) | Serviceable item within the shop's 90-day due-soon window (#1, #13, #14). |
| `PND` | `[PND · VERIFY]`| **Amber Dashed Box** (`1px dashed var(--a-bd)`, triangle SVG) | Mechanic-uploaded or borrowed/leased cert awaiting `cal designee` verification (#10, #13). |
| `CAL` | `[CAL · REQ]` | **Amber Caution Box** (triangle SVG) | New or reinstated tool in `Needs cal` (#13). |
| `OFC` | `[OFC · VENDOR]`| **Amber Caution Box** (arrow-northeast SVG) | `Out for cal` at vendor; retains home location (#12, #13). |
| `OVD` | `[OVD · DO NOT USE]`| **Red Danger Box** (`--r-fg` / `--r-bg` / `--r-bd`, octagon SVG) | Automatic when past end-of-month cal due date (#13). Triggers STOP segregation intercept. |
| `UNS` | `[UNS · DAMAGED]`| **Red Danger Box** (octagon-cross SVG) | Manual `Unserviceable` flag or failed cal (#13). Only Inspector/Admin clears. |
| `QRN` | `[QRN · HOLD]` | **Red Danger Box** (octagon-cross SVG) | `Quarantined` lot (suspect/damaged or missing cert, #14). Only Inspector/Admin clears. |
| `EXP` | `[EXP · SEGREGATE]`| **Red Danger Box** (octagon SVG) | Automatic when past effective expiry (#14). Triggers STOP segregation intercept. |
| `MSN` | `[MSN · MISSING]`| **Red Danger Box** (octagon-slash SVG) | Tool/lot marked `Can't find` (#13, #17). Moves to `Unassigned`; 30-day review clock. |
| `RET` / `DEP` | `RET` / `DEP` | **Muted Monochrome** (`color: var(--text3)`) | `Retired` / `Returned` tool (#13) or `Depleted` / `Disposed` lot (#14). |

---

### 2.3 Typography & Zero-Ambiguity Monospace Specification

- **UI Sans (`--font-sans`):** `'Inter'`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, sans-serif — used for nomenclature and prose notes.
- **Technical Monospace (`--font-mono`):** `'JetBrains Mono'`, `'IBM Plex Mono'`, `ui-monospace`, monospace with mandatory slashed zero and tabular numerals:
  ```css
  .mono {
    font-family: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace;
    font-variant-numeric: tabular-nums slashed-zero;
    font-feature-settings: "zero" 1, "tnum" 1, "ss01" 1;
  }
  ```
- **Monospace Enforcement:** Applied to all form header cells (`DOC`, `SCOPE`, `MODE`, `SYNC`, `USER`), line numbers (`01`–`08`), Tool IDs (`TL-0142`), Lot/Batch IDs (`LOT-2024-88A`), P/Ns (`QD3R100A`), S/Ns (`SN-884021`), opaque QR codes (`/q/K7M2QX`), quantities and units (`04.0 CARTRIDGE`, `02.5 QT`), dates (`2026-10-22`), timestamps (`16:18 UTC-7`), variance IDs (`VA-2026-1022-01`), and certificate numbers (`IA 3849201` or `N/A`).

---

### 2.4 Geometry, Borders, Touch Targets & Responsive Grid

- **Corner Radius:** `0px` globally (`border-radius: 0px` on all cells, buttons, inputs, modals, badges, and tables).
- **Shared-Border Ledger Construction:** Adjacent cells use `border-right: 1px solid var(--border)` and `border-bottom: 1px solid var(--border)` with `0px` margin/gap so horizontal and vertical rules form a continuous engineering drawing block.
- **Glove-Ready Touch Targets:**
  - Row height and inline action cell on Phone/Tablet: `min-height: 48px` (`44px` minimum for toolbar segment buttons).
  - Primary bottom dock buttons (`SCAN QR`, `SAVE CHECK`, `SIGN RECORD`) and numeric keypad keys: `48px–52px` flush hardware cells.
- **Responsive Breakpoints:**
  - **Phone (`390px × 844px`):** Compact 2-row AMOS header block + `32px`/`44px` scrollable `SPOT` & `FILTER` strip + 2-line tabular ledger rows (`LINE | ID + NOMENCLATURE + P/N·S/N·DUE | STATUS + RESULT | 48px ACTION CELL`) + sticky 3-cell bottom hardware bar (`[+ UNREC] [SCAN QR] [SIGN-OFF]`).
  - **Tablet (`820px × 1180px`):** Full 5-cell AMOS header block + 2-pane split view (`430px` left ledger table / `390px` right pinned Scanner + Item Inspection + Keypad work-card).
  - **Desktop (`1280px+`):** Full-width MRO review terminal with 8-column shared-border ledger table (`LINE | ID / LOT | NOMENCLATURE | P/N · S/N | DUE / EXP | EXP QTY | RESULT | STATUS`), Variance Adjustment Approval table, Discrepancy & Corrective Action table, Outbox log, and print-ready **Official Audit PDF** sheet.

---

## Part 3: Screen-by-Screen Specification (v2 AMOS / Oxide Ledger Architecture)

### 3.1 Top Shared-Border Engineering Form Header Block (All Screens)

```
+------------------------+-------------------------------+----------------------+------------------------+-----------------------+
| DOC                    | SCOPE                         | MODE                 | SYNC [OPEN OUTBOX]     | USER                  |
| HCA-AUD-2026-1022-C04  | HGR-1 / CRIB-A / CAB-C04      | LOCATION AUDIT       | OFFLINE (3 QUEUED)     | J. MILLER (MECH)      |
+------------------------+-------------------------------+----------------------+------------------------+-----------------------+
| [01 SCOPE & HUB]                  | [02 LEDGER CHECKLIST (5/8)]               | [03 SIGN-OFF (3 OPEN)]                         |
+-----------------------------------+-------------------------------------------+------------------------------------------------+
```
- Clicking the **`SYNC`** cell opens the **Outbox & Offline Sync Drawer** (which displays `captured_at` vs. `synced_at` for every entry, a `SYNC NOW` trigger, and—when on iOS with `pending > 0`—the **iOS Home Screen PWA Install notice** inside the drawer).
- If the audit is paused, a compact inline cell indicator shows `STATE: PAUSED 16:20 UTC-7 [RESUME]`.

---

### 3.2 Screen 01: Scope & Hub (`scrHub`)

1. **Audit Mode Table (4 Shared-Border Rows, #17):**
   - `01 · PHYSICAL LOCATION AUDIT` — Walk a root location; verify tools & consumable lots per child spot (`ACTIVE · 5/8`)
   - `02 · MONTHLY CAL-RECORD AUDIT` — Reconcile cal certs, `PND`, `OVD`, `OFC` past return, `MSN >= 30D` (`[DUE · 7D]`, `cal designee` sign-off)
   - `03 · MONTHLY EXPIRED-MATERIALS CHECK` — Documented check of `EXP`, due-soon, and `QRN` lots (`SVC · SAT`, `Inspector`/`Admin`/`cal designee`)
   - `04 · ANNUAL FACILITY AUDIT (SAT/UNSAT/N/A)` — Annual/24-mo area audit; enforces auditor independence (`NEXT 2027-02-15`, `designated auditor`)
2. **Root Location Tree Ledger (#12, #20):**
   - Header bar with flush **`[SCAN LOCATION QR (/q/LOC-C04)]`** button and snapshot status (`SNAPSHOT: 16:10 UTC-7 · 8 ITEMS CACHED READ-ONLY`).
   - Expandable hierarchical rows (`Hangar 1 > Tool Crib A > Cabinet C-04 > D1, D2, D3, S1`, `Line Box 2`) with monospace location codes and item counts.
3. **Session Work-Card Table & Actions:**
   - 2-column bordered key-value ledger (`AUDIT NO`, `TYPE`, `ROOT`, `STARTED`, `PROGRESS`, `COUNTER`, `SIGNER`, `OUTBOX`) + flush bottom action cells (`[OPEN LEDGER CHECKLIST]`, `[PAUSE / RESUME]`, `[HAND OFF TO SIGNER]`).

---

### 3.3 Screen 02: Ledger Checklist, Scanner & Item Work-Card (`scrWork`)

#### A. Flush Segmented Spot & Filter Toolbar Strip (Rule 5)
A single shared-border strip below the header replaces all summary tile grids:
- **Row 1 (`SPOT`):** `SPOT: [ALL 8] [D1 2/4] [D2 2/3] [S1 1/1] [D3 0/0]`
- **Row 2 (`FILTER`):** `FILTER: [ALL 8] [TOOLS 5] [LOTS 3] [UNCHECKED 3] [FINDINGS 2]`

#### B. Section Divider Bars & Edge-to-Edge Hairline Rows (Rules 2, 3, 4)
- **Section Bar (`26px` height, `--surface2`):**
  `DRAWER D1 — TORQUE & PRECISION · LOC-C04-D1` (left) | `2/4 CHECKED` (right)
- **Ledger Row Columns:**
  - `LINE`: `01`, `02`, … (`28px` mono column)
  - `ID / LOT & NOMENCLATURE`: `TL-0142` (`tool`) or `LOT-2024-88A` (`lot`), item nomenclature, `P/N · S/N · QR`, and `CAL DUE` / `EXP` date.
  - `STATUS & RESULT`:
    - Nominal serviceable item: quiet monochrome `SVC` + result (`SAT`, `CNT 14 EA`, or `UNCHECKED`).
    - Due soon item (`TL-0157`): amber `[DUE · 14D]` + `SAT`.
    - Overdue tool (`TL-0142`): red `[OVD · DO NOT USE]` + `SEGREGATE REQ` (or `SEG -> QB-1`).
    - Expired lot (`LOT-2024-88A`): red `[EXP · SEGREGATE]` + `SEGREGATE REQ` (or `SEG -> QB-2`).
  - `ACTION CELL` (`48px` width/height flush right cell): `[CHECK]` / `[EDIT]`.

#### C. In-App Camera QR Scanner & Manual ID Fallback (#5, #6, #20)
- `0px` industrial viewfinder with corner bracket reticles sized for `13–17 mm` QR labels, crosshair line, **`[TORCH: OFF/ON]`** hardware toggle, and 4 simulation triggers (`[SCAN SVC TL-0188]`, `[SCAN OVD TL-0142]`, `[SCAN EXP LOT-2024-88A]`, `[SCAN WRG TL-0219]`).
- Manual search input (`TL-0142 · MS20470AD4-4 · SN-884021 · LOT-...`) + **`[QUEUE DAMAGED LABEL REPRINT]`** (`12 mm TZe`).

#### D. Immediate Safety & Segregation Intercept Modal (`ic.show`, #13, #14, #23)
- Triggered automatically when scanning or selecting `TL-0142` (`[OVD · DO NOT USE]`) or `LOT-2024-88A` (`[EXP · SEGREGATE]`).
- High-contrast red/white `0px` bordered MRO directive block (`STOP — QUARANTINE INTERCEPT` / `STOP — SEGREGATE MATERIAL`) with octagon SVG, item metadata table, mandatory physical steps (`QB-1 Red-Tag Cage` or `QB-2 Expired Materials`), required acknowledgement checkbox, **`[CONFIRM SEGREGATION]`**, and **`[ESCALATE TO INSPECTOR]`**.

#### E. Tool Check & Consumable Lot Count Work-Card (`hasSel`, #11, #13, #14, #17)
- **Tool Check (`selTool`):** 4 shared-border condition rows:
  1. `SAT — PRESENT / SERVICEABLE`
  2. `MSN — CAN'T FIND` (flags `MISSING` on sync; requires search note)
  3. `UNS — DAMAGED / UNSAT` (flags `UNSERVICEABLE` on sync; requires reason)
  4. `WRG — WRONG LOCATION` (opens Wrong-Location modal: one-tap **`[MOVE TO THIS LOCATION NOW]`** audit-linked move vs. **`[RECORD WRONG-LOCATION FINDING]`**)
- **Consumable Lot Count (`selLot`):**
  - 3-cell shared-border comparison strip: `EXPECTED: 3 QT | COUNTED: 2.5 QT | DELTA: -0.5`
  - Flush stepper (`[-] [ 2.5 ] [QT] [+]`) + 12-key `0px` shared-border decimal keypad (`7 8 9 / 4 5 6 / 1 2 3 / . 0 DEL`).
  - Condition selector (`COUNTED`, `ZERO / CAN'T FIND`, `SUSPECT / QUARANTINE`) + live **Variance Adjustment Entry Preview** (`VA-2026-1022-01 · LOT-2026-0412A · DELTA -0.5 QT — non-overwriting adjustment entry posts on sign-off`).

---

### 3.4 Screen 03: Readiness, Variances & Role-Gated Official Sign-Off (`scrSign`)

1. **Readiness Ledger Strip & Blocker Table:**
   - Single 4-cell shared-border strip (`CHECKED: 5/8 | SEGREGATED: 0/2 | FINDINGS: 2 | PENDING SYNC: 3`).
   - Lists any unresolved blockers (e.g., `TL-0142 Not segregated`, `TL-0188 Not yet checked`) with direct `[OPEN]` jump buttons.
2. **Variance Adjustment Entries Preview Table (#11, #17):**
   - Shows `VA-2026-1022-01 | LOT-2026-0412A | 3 QT -> 2.5 QT | DELTA -0.5 QT` with note that snapshot quantities are never overwritten.
3. **Role-Gated Official Sign-Off Block (#10, #17, #18, #23):**
   - **If `Mechanic` (`J. Miller`):** Locked counter-only work-card with **`[PAUSE & HAND OFF FOR SIGN-OFF]`**.
   - **If `Inspector / Cal Designee / Designated Auditor` (`R. Alvarez`):**
     - Verified login line (`AUTH: ralvarez@apexmx.example.com · SSO 16:05 UTC-7`)
     - `TYPED FULL NAME (REQUIRED)` input
     - `CERT TYPE & NUMBER (NEVER BLANK)`: segmented `[IA] [A&P] [REPAIRMAN] [N/A]` + number input (`3849201` or locked explicit `N/A`)
     - `DRAWN SIGNATURE (OPTIONAL)`: `0px` bordered `signature_pad` canvas + `[CLEAR]`
     - **`[SIGN AUDIT RECORD]`** button (records `SIGNED · SYNCED` when online, or `SIGNED OFFLINE — PENDING SYNC` when offline)
     - Mandatory compliance helper disclaimer: *"Internal compliance helper record, not an FAA-approved electronic signature system."*

---

### 3.5 Desktop Workspace & Official Audit PDF (`isDesk`, `1280px`)

1. **Review & Approve Tab (`dtReview`):**
   - Single-line 8-cell shared-border summary strip (`EXPECTED | CHECKED | SAT/CNT | FINDINGS | VARIANCES | PENDING SYNC | UNRECORDED | REPRINTS`).
   - **Variance Adjustment Approval Table:** Inspector/Admin `[APPROVE]` / `[REJECT]` controls per variance entry.
   - **Discrepancies & Corrective Actions Table:** Assigns corrective actions per finding.
   - **Full Multi-Column Ledger Table Grouped by Child Spot:** `LINE | ID / LOT | NOMENCLATURE | P/N · S/N | DUE / EXP | EXP QTY | RESULT | STATUS | SYNC`.
   - Right-hand column: Audit Record KV table, Unrecorded Item Queue (`[MATCH -> CREATE RECORD]`), and Outbox & Sync Log.
2. **Official Audit PDF Tab (`dtPdf`):**
   - Print-ready `816px` monochrome/red-accented MRO engineering form (`APEX CHARTER MX — HANGAR 1 · OFFICIAL AUDIT RECORD · AUD-2026-1022-C04`), watermarked `DRAFT — REFERENCE ONLY` until signed and `PENDING SYNC` if signed offline, with full itemized spot table, discrepancy table, variance table, dual Counter + Official Signer blocks (`N/A` in place of any blank), and permanent retention footer.
3. **Bottom `28px` Dark Technical Debug Harness (Rule 6):**
   - Fixed at the bottom of the viewport:
     `DEV HARNESS: VIEWPORT [390 PHONE] [820 TABLET] [1280 DESKTOP] | THEME [LIGHT] [DARK] | NET [ONLINE] [OFFLINE (3)] | ROLE [MECH] [INSP]`
