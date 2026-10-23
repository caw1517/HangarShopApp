# HangarShopApp Design System & Anti-Vibe-Coding Specification

HangarShopApp is a precision operational instrument for aviation maintenance technicians, inspectors, and managers. Its visual architecture is anchored to three explicit references chosen by the product owner:

- **Primary Visual Anchor — Swiss-AS AMOS (`AMOSmobile/STORES` https://www.swiss-as.com/amosmobilestores & `AMOSmobile/EXEC` https://www.swiss-as.com/amosmobileexec):** Bordered aviation MRO inspection ledger and work-card form layout, shared-border metadata header block, line-item checkoff table, and industrial stores/tooling floor terminal feel.
- **Secondary Structural & Typographic Anchors — Oxide Computer (https://oxide.computer/) + IBM Carbon Design System (https://www.carbondesignsystem.com/components/data-table/usage/):** `0px` sharp industrial corners (`2px` max on standalone hardware-key buttons), shared `1px solid` grid borders with zero gaps between containers, monospace schematic precision (`tabular-nums slashed-zero`), and ultra-clean hairline rows.

Every UI pull request, prototype, and code review must enforce this specification.

---

## 1. The 6 Anti-Vibe-Coding Rules (Mandatory Contract)

1. **Aviation Form / Ledger Framing (Swiss-AS AMOS pattern):**
   Screens open with a bordered engineering form header block (`1px solid` shared-border cells, `0px` radius, `0px` gap) displaying document/screen code, location scope, mode, sync/outbox state, and operator/role — never floating consumer SaaS hero headers or stacked pastel callout banners.
2. **Edge-to-Edge `0px` Shared-Border Hairline Grids (IBM Carbon + Oxide pattern):**
   Never wrap list rows or table records in padded, rounded cards (`border-radius: 6px+`, `gap: 12px`). All lists and tables use continuous `1px solid` shared borders (`0px` outer margin, `0px` border-radius) with flush `26px–28px` section divider bars for child spots/drawers.
3. **Zero Unicode Emojis Anywhere in the UI:**
   Never use `🚨`, `⚠️`, `📷`, `🔦`, `✅`, or any Unicode emoji in badges, buttons, headers, or empty states. Use `12px–14px` `1.5px`-stroke geometric SVG vectors (octagon, triangle, diamond, crosshair, square) paired with 3-letter aviation status codes (`SVC`, `DUE`, `OVD`, `UNS`, `QRN`, `EXP`, `MSN`, `REF`, `RET`).
4. **Quiet-When-Nominal Status Discipline:**
   Nominal items (`SVC` / `SERVICEABLE`) render as quiet monochrome text + a subtle `6px` geometric mark with **no colored pill background**, so off-nominal states (`OVD` / `UNS` / `QRN` / `EXP` in high-contrast red; `DUE` / `PND` / `CAL` in industrial amber) command 100% of visual attention.
5. **No Multi-Box KPI Summary Tile Grids:**
   Never render 2x2 or 4-up rounded "stat cards" with oversized numbers above a table. Summarize counts inline inside a single flush `32px` shared-border toolbar/filter strip (`ALL [26] · D1 [6/6] · D2 [2/8] | TOOLS [19] · LOTS [7] · UNCHECKED [12]`).
6. **Sharp Industrial Geometry (`0px`–`2px` max) & Monospace Technical Data:**
   Tables, panels, headers, inputs, and status tags use `0px` corners (at most `2px` on standalone hardware-key action buttons). Every Tool ID, P/N, S/N, batch/lot, tail, work order, quantity+unit, date, and cert number uses `--font-mono` with `tabular-nums slashed-zero`.

### Additional Hard Prohibitions
- **No decorative gradients, glowing blobs, or mesh backgrounds.** Surfaces are solid, flat, high-contrast neutral tokens.
- **No glassmorphism (`backdrop-blur`) or heavy drop shadows (`shadow-lg`, `shadow-xl`).** Structure is communicated strictly via `1px solid` shared grid hairlines and surface contrast.
- **No colour-only status indicators.** Every status tag combines a geometric vector mark + explicit 3-letter aviation code (with full status label on wide viewports).
- **No fake marketing copy, conversational AI filler, or celebratory fluff.** Labels are terse, literal aviation maintenance terms from `CONTEXT.md`.

---

## 2. Typography & Schematic Monospace Discipline

- **UI Sans (`--font-sans`):** `Inter` or `IBM Plex Sans` (`-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`) for prose descriptions, notes, and column/form labels.
- **Technical Monospace (`--font-mono`):** `JetBrains Mono` or `IBM Plex Mono` (`ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`) with `font-variant-numeric: tabular-nums slashed-zero` enforced across all technical cells.
- **Mandatory `--font-mono` (`tabular-nums slashed-zero`) Fields:**
  - Document / screen codes (`FORM MX-AUD-01`, `REG-TL-01`, `MAT-LOT-01`)
  - `tool_id` (`TL-014`, `TRQ-04`)
  - Part numbers (`P/N`), model numbers, and serial numbers (`S/N`)
  - Lot / batch numbers (`LOT-2026-089`, `LOT-IMPORT-012`)
  - Aircraft tail numbers (`N123AB`), major component S/Ns, and contract numbers
  - Work order numbers (`WO-2026-1042`)
  - All dates and timestamps (`2026-10-31`, `2026-10-22 17:10 UTC-7`)
  - Quantities with units (`14.5 oz`, `2 each`), calibration intervals (`12 MO`, `180 D`), and airframe/engine hours, landings, and cycles (`4,182.4 HRS / 2,910 CYC`)
  - Certificate numbers, inline toolbar counters (`[19]`, `[2/8]`), and QR short codes (`/q/K7M2QX`)
- **Type Scale & Hierarchy:**
  - Form header title / screen ID: `14px–16px`, `font-weight: 600`, uppercase/monospace metadata cells
  - Section divider / table column header / metadata key: `11px` (`0.6875rem`), `font-weight: 600`, uppercase, `letter-spacing: 0.06em`, muted slate
  - Table cell & ledger row body: `13px` (`0.8125rem`), line-height `1.3` on desktop; `15px–16px` on phone inputs to prevent iOS auto-zoom

---

## 3. Color System & Quiet-When-Nominal Status Tokens

Designed for bright sunlit hangar bays (High-Contrast Daylight Ledger, default) and dim cockpit/night shift environments (Industrial Dark Terminal):

### Structural Surfaces (Daylight Ledger Default)
- **App Canvas:** `#E2E8F0` (`slate-200`)
- **Primary Ledger / Table Surface:** `#FFFFFF`
- **Form Header / Section Bar / Toolbar Surface:** `#F1F5F9` (`slate-100`)
- **Sub-Spot / Drawer Divider Bar (`26px–28px`):** `#E2E8F0` (`slate-200`) with `#0F172A` monospace title
- **Shared Grid Hairline Border (`1px solid`):** `#94A3B8` (`slate-400`) on outer form frames and section dividers; `#CBD5E1` (`slate-300`) on internal row hairlines
- **Primary Ink:** `#0F172A` (`slate-900`)
- **Secondary / Metadata Key Ink:** `#475569` (`slate-600`)
- **Hardware Action Key Accent:** `#0F172A` (`slate-900`) primary; `#1D4ED8` (`blue-700`) focused/active operational action

### 3-Letter Aviation Status Codes & Quiet-When-Nominal Contract

Every status uses the locked `<StatusBadge />` primitive (`0px` corner radius, `12px–14px` `1.5px`-stroke SVG vector + 3-letter code in `--font-mono`):

| 3-Letter Code | Full Domain Status | Visual Treatment (Quiet-When-Nominal Rule) | Vector Mark (`1.5px` stroke) |
| :--- | :--- | :--- | :--- |
| `SVC` / `SAT` | `Serviceable` / `SAT` | **Quiet monochrome:** transparent fill, no border pill, `#334155` mono text + `#0F172A` `6px` solid square/check mark | `6px` solid square or crisp check |
| `REF` | `Reference-only` | **Quiet monochrome:** `#F8FAFC` fill, `1px dashed #64748B`, `#334155` mono text (`REF · REFERENCE ONLY`) | Crosshair / info square |
| `DUE` | `Due soon` (badge) | **Industrial Amber:** `#FEF3C7` fill, `#92400E` text, `1px solid #D97706` | Diamond (`◇`) |
| `PND` | `Pending verification` | **Industrial Amber:** `#FEF3C7` fill, `#92400E` text, `1px solid #D97706` | Triangle (`△`) |
| `CAL` | `Needs cal` / `Out for cal` | **Industrial Amber / Transit Blue:** `#EFF6FF` fill, `#1E40AF` text, `1px solid #2563EB` | External arrow / diamond |
| `OVD` | `Overdue` | **High-Contrast Alert Red:** `#FEE2E2` fill, `#991B1B` bold mono text, `1px solid #DC2626` | Octagon (`⯃`) |
| `UNS` / `UNSAT` | `Unserviceable` / `UNSAT` | **High-Contrast Alert Red:** `#FEE2E2` fill, `#991B1B` bold mono text, `1px solid #DC2626` | Octagon with slash |
| `EXP` | `Expired` | **High-Contrast Alert Red:** `#FEE2E2` fill, `#991B1B` bold mono text, `1px solid #DC2626` | Octagon (`⯃`) |
| `QRN` | `Quarantined` | **High-Contrast Alert Red:** `#FFE4E6` fill, `#9F1239` bold mono text, `1px solid #E11D48` | Triangle-lock |
| `MSN` | `Missing` | **High-Contrast Alert Red:** `#FFE4E6` fill, `#9F1239` bold mono text, `1px solid #E11D48` | Crosshair-off / octagon |
| `RET` / `RTN` / `DEP` / `DSP` / `N/A` | `Retired` / `Returned` / `Depleted` / `Disposed` / `N/A` | **Muted Historical:** transparent fill, `#64748B` mono text, `1px solid #CBD5E1` | Minus-square (`⊟`) |

---

## 4. Screen Anatomy & Responsive Architecture

### A. Swiss-AS AMOS Shared-Border Form Header Block (All Viewports)
Every screen opens with a flush, shared-border engineering metadata grid (`0px` radius, `1px solid #94A3B8` outer frame, `1px solid #CBD5E1` cell dividers):
- **Cell 1 (Form / Screen Code & Title):** e.g., `MX-AUD-LOC // GUIDED LOCATION AUDIT` or `MX-REG-TL // CALIBRATED TOOL REGISTER`
- **Cell 2 (Scope / Location Path):** e.g., `LOC: H1 › CRIB › CAB-B`
- **Cell 3 (Sync / Outbox Telemetry):** e.g., `SYNC: ONLINE [0 QUEUED]` or `SYNC: OFFLINE [4 FINDINGS IN OUTBOX]`
- **Cell 4 (Operator & Authority Flags):** e.g., `OPR: J. MILLER [MECH]` or `OPR: C. WILLIAMS [ADM · CAL-DES · AUD]`

Immediately below the header block sits a single **Flush `32px` Shared-Border Filter & Inline Counter Strip**:
- Example: `ALL [26] · D1 [6/6] · D2 [2/8] · D3 [0/12]  |  TYPE: ALL · TOOLS [19] · LOTS [7]  |  REMAINING [12]`
- Zero multi-box KPI stat cards above the table.

### B. Desktop Monitor (`>= 1200px`) — MRO Workstation
- **Left Terminal Rail (`200px–220px` fixed, `0px` radius, `1px solid` right border):** Shop Switcher cell at top, compact navigation rows with monospace section codes, and active operator/flag block in the footer.
- **Edge-to-Edge Shared-Border Data Table (`34px–38px` row height):** Continuous `1px solid` horizontal and vertical cell hairlines (`IBM Carbon` / `Oxide` style), sticky header bar, flush `26px–28px` location/group divider rows, keyboard arrow navigation, and a right-hand shared-border inspection pane (`480px–540px`) that docks flush against the table without floating drop-shadow modals.

### C. Tablet / Cart Mode (`768px–1199px`) — Crib & Bench Terminal
- Compact `56px` rail or top shared-border command bar + split-pane ledger table and inspection drawer.

### D. Phone / Hangar Floor (`< 768px`) — `AMOSmobile` Gloved Execution
- **Edge-to-Edge Hairline Checkoff Rows (`0px` outer margin, `0px` radius, `48px–56px` tall):**
  - Each row is a flush shared-border cell divided into:
    1. **Left Monospace ID + Status Cell:** `TL-014` / `LOT-089` + `SVC` / `OVD` / `DUE` tag
    2. **Center Nomenclature & Spec Cell:** Item name, `P/N`, `S/N` or `DOE`, expected qty/unit
    3. **Right Gloved Checkoff / Action Cell (`48px+` touch target):** Hardware-key buttons (`[SAT]` / `[CNT]` / `[FLAG]`, `0px–2px` max radius, `1px solid` border)
  - Grouped by flush `26px–28px` child-spot divider bars (`DRAWER 1 — TORQUE WRENCHES [6/6]`, `DRAWER 2 — SEALANTS & ADHESIVES [2/8]`).
- **Bottom Hardware Command Dock (`0px` radius, `1px solid` top border):**
  - Full-width docked hardware keys for `[SCAN QR]`, `[MANUAL ID]`, `[+ UNRECORDED]`, and `[SIGN & CLOSE AUDIT]`.
- **Flush Lot Count & Discrepancy Drawer:**
  - Tapping a Consumable Lot or `[FLAG]` opens a sharp-bordered bottom ledger panel (`0px` radius) with large `tabular-nums slashed-zero` quantity display in the lot's stock unit, hardware-key `[-]` / `[+]` steppers, `[MATCHES EXP]`, and immediate safety-flag selectors (`[CAN'T FIND -> MSN]`, `[DAMAGED -> UNS/QRN]`, `[WRONG LOC]`).

---

## 5. Locked Shared Component Primitives

Before building individual feature screens, developers must implement and reuse these eight canonical primitives:

1. **`<AmosFormHeader />`**: Shared-border engineering metadata header block (`0px` radius, `1px solid` cell grid) displaying screen code, scope/path, sync/outbox telemetry, and operator/role flags.
2. **`<InlineCounterStrip />`**: Flush `32px` shared-border toolbar combining spot/drawer progress counters and filter toggles (`ALL [26] · D1 [6/6] | TOOLS [19] · LOTS [7]`)—replacing all multi-box KPI cards.
3. **`<StatusBadge code={...} />`**: Enforces the Quiet-When-Nominal rule, `0px` corners, `12px–14px` `1.5px`-stroke geometric SVG vector, and 3-letter aviation status code (`SVC`, `DUE`, `OVD`, `UNS`, `QRN`, `EXP`, `MSN`, `REF`, `RET`).
4. **`<MonoId value={...} copyable />`**: Renders technical IDs, P/Ns, S/Ns, lot numbers, tails, work orders, dates, and quantities in `--font-mono` with `tabular-nums slashed-zero`.
5. **`<HairlineLedgerTable />`**: Continuous `1px solid` shared-border table/list (`0px` outer margin, `0px` radius) with flush `26px–28px` section divider bars and docked detail pane support.
6. **`<ScanCommandDock />`**: Bottom hardware-key bar + camera viewfinder (`getUserMedia` + `BarcodeDetector` WASM with SVG crosshair reticle, SVG torch toggle, and manual ID search input).
7. **`<ComplianceSignoffBlock />`**: Shared-border sign-off ledger block capturing typed full name, authenticated login, certificate type & number (or explicit `N/A`, never blank), optional drawn signature canvas, auditor independence attestation, and timestamp.
8. **`<HelperDisclaimerBanner />`**: Flush `1px solid` footer/header compliance strip on sign-off screens and printed Audit PDFs stating: `INTERNAL COMPLIANCE HELPER RECORD — NOT AN FAA-AUTHORIZED ELECTRONIC RECORDKEEPING OR ELECTRONIC SIGNATURE SYSTEM.`
