# HangarShopApp Design System & Anti-Vibe-Coding Specification

HangarShopApp is a precision operational tool for aviation maintenance technicians, inspectors, and managers. It must look and feel like an industrial instrument—taking cues from **McMaster-Carr** (information density, scannable tabular specifications, zero fluff), **Linear** (crisp `1px` borders, tight keyboard/table ergonomics, restrained hierarchy), and **aviation EFB / MRO instrumentation** (unambiguous status signaling under harsh hangar lighting)—and **never** like a generic AI-generated ("vibe-coded") SaaS template.

Every UI pull request, prototype, and code review must enforce this specification.

---

## 1. The Anti-Vibe-Coding Ban List (Hard Prohibitions)

The following hallmarks of generic AI-generated web apps are **strictly banned** across all screens, emails, and PDFs:

1. **No decorative gradients, glowing blobs, or mesh backgrounds.** Surfaces are solid, flat, high-contrast neutral tokens.
2. **No glassmorphism (`backdrop-blur`) on cards, tables, or panels.** Hangar glare demands opaque, crisp-bordered surfaces.
3. **No decorative emojis in UI chrome, navigation, status badges, empty states, or buttons.** (e.g., never render `🔧 Tools`, `⚠️ Overdue`, `✅ Serviceable`, or `🎉 All clear!`). Use geometric SVG icons from a single consistent icon set (`lucide-react` at `1.75px` stroke) paired with clear text.
4. **No bloated 3-column rounded card grids for operational inventories.** Tools, Consumable Lots, Fleet, Program Enrollments, and Audit logs render in **dense, scannable data tables** on desktop/tablet and **compact structured rows** on mobile.
5. **No oversized border radii (`rounded-2xl`, `rounded-3xl`) or heavy drop shadows (`shadow-xl`, `shadow-2xl`).** Use `4px` (`rounded-sm`) for badges/inputs and `6px` (`rounded-md`) for panels/modals, separated by `1px solid` structural borders.
6. **No proportional-width fonts on technical identifiers or numbers.** Every ID, part number, serial number, lot number, date, quantity, and hours/cycles reading must render in monospace or `tabular-nums`.
7. **No colour-only status indicators.** A coloured dot by itself is banned; every status badge must pair a distinct icon shape + explicit uppercase/small-caps text label + high-contrast semantic border/fill.
8. **No fake marketing copy, conversational AI filler, or celebratory fluff.** Labels are terse, literal aviation maintenance terms from `CONTEXT.md`.

---

## 2. Typography & Tabular Discipline

- **UI Sans (`--font-sans`):** `Inter` or system UI sans (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`) for navigation, prose descriptions, notes, and form labels.
- **Technical Monospace (`--font-mono`):** `JetBrains Mono` (with fallback to `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`) with `font-variant-numeric: tabular-nums` enforced.
- **Mandatory Monospace / `tabular-nums` Fields:**
  - `tool_id` (e.g., `EA-T-014`, `TRQ-04`)
  - Part numbers (`P/N`), model numbers, and serial numbers (`S/N`)
  - Lot / batch numbers (`LOT-2026-089`, `LOT-IMPORT-012`)
  - Aircraft tail numbers (`N123AB`) and contract numbers
  - All dates and timestamps (`2026-10-31`, `2026-10-22 15:42 UTC-7`)
  - Quantities with units (`14.5 oz`, `2 each`), calibration intervals (`12 MO`, `180 D`), and airframe/engine hours, landings, and cycles (`4,182.4 HRS / 2,910 CYC`)
  - Certificate numbers and QR short codes (`/q/K7M2QX`)
- **Type Scale & Density:**
  - Page title: `18px` (`1.125rem`), `font-weight: 600`, tight tracking (`-0.01em`)
  - Section / table header: `12px` (`0.75rem`), `font-weight: 600`, uppercase, `letter-spacing: 0.04em`, muted slate
  - Table cell & body: `13px–14px` (`0.8125rem–0.875rem`), line-height `1.35` on desktop; `15px–16px` on phone inputs to prevent iOS auto-zoom

---

## 3. Color System & Semantic Status Tokens

Designed for both bright sunlit hangar bays (High-Contrast Light Mode, default) and dim cockpit/night shift environments (Industrial Dark Mode):

### Structural Surfaces (Light Mode Default)
- **App Canvas:** `#F1F5F9` (`slate-100`)
- **Primary Work Surface / Table Background:** `#FFFFFF`
- **Elevated / Sticky Header Surface:** `#F8FAFC` (`slate-50`)
- **Structural Hairline Border:** `#CBD5E1` (`slate-300`) — visible `1px` grid lines, never washed-out `#F3F4F6`
- **Primary Ink:** `#0F172A` (`slate-900`)
- **Secondary Ink:** `#475569` (`slate-600`)
- **Primary Action Accent:** `#0F172A` (`slate-900`) or `#1D4ED8` (`blue-700`, industrial blueprint blue)

### Semantic Status Badges (Icon + Uppercase Label + `1px` Border)

Every status uses the locked `<StatusBadge />` primitive:

| Domain Status | Semantic Category | Light Fill / Text / Border | Required Icon Shape |
| :--- | :--- | :--- | :--- |
| `Serviceable` / `SAT` | Safe / Legal | `#ECFDF5` / `#065F46` / `#6EE7B7` | Check-circle (solid/crisp) |
| `Due soon` (badge) | Warning / Horizon | `#FFFBEB` / `#92400E` / `#FCD34D` | Clock / horizon icon |
| `Pending verification` / `Needs cal` | Hold / Action Req | `#FEF3C7` / `#92400E` / `#F59E0B` | Shield-alert / hourglass |
| `Out for cal` / `At Overhaul/Repair` | External / Transit | `#EFF6FF` / `#1E40AF` / `#93C5FD` | External-arrow / truck |
| `Overdue` / `Unserviceable` / `Expired` / `UNSAT` | Illegal / Danger | `#FEF2F2` / `#991B1B` / `#FCA5A5` | Octagon-stop / slash-circle |
| `Quarantined` / `Missing` | Segregated / Alert | `#FFF1F2` / `#9F1239` / `#FDA4AF` | Lock-triangle / help-octagon |
| `Reference-only` | Non-Calibrated Class | `#F1F5F9` / `#334155` / `#64748B` (dashed `1px`) | Info-square (`REFERENCE ONLY`) |
| `Retired` / `Returned` / `Depleted` / `Disposed` / `N/A` | Inactive / Historical | `#F1F5F9` / `#475569` / `#CBD5E1` | Archive-box / minus-square |

---

## 4. Responsive Architecture & Layout Density

All screens must be fully responsive across three distinct operational postures:

### A. Desktop Monitor (`>= 1200px`) — Manager & Compliance Workstation
- **Left Rail Navigation (`220px` fixed):** Compact vertical rail with Shop Switcher at top, direct links (`Dashboard`, `Tools`, `Consumables`, `Fleet & Programs`, `Audits`, `Locations`, `Import`, `Audit Log`, `Settings`), and active user role/designee badges in the footer.
- **High-Density Data Tables:** Compact row height (`36px–40px`), sticky column headers, instant filter bar (status chips, location subtree selector, class/ownership filter, text/mono search), sortable columns, and right-hand slide-over detail drawer (`480px–560px`) so inspecting a tool's cert PDF or lot history never loses table scroll position.

### B. Tablet / Cart Mode (`768px–1199px`) — Crib & Bench View
- Collapsible icon+label rail (`64px` collapsed / drawer expanded) and split-pane master-detail view for walking a tool crib or reviewing an import preview table.

### C. Phone / Hangar Floor (`< 768px`) — Gloved One-Handed Execution
- **Gloved Touch Targets:** Primary interactive rows and buttons in Guided Location Audits and Usage Logging must be **`48px–56px` tall** with `8px` vertical spacing and zero reliance on hover states or swipe-only gestures.
- **Thumb-Zone Scan & Count Bar:** Persistent bottom action bar housing the full-width **`Scan QR`** trigger, manual ID search toggle, and spot progress counter (`14 / 19 verified`).
- **Numeric Count Sheet for Lots:** Tapping a Consumable Lot opens a bottom sheet with the lot's stock unit (`oz`, `tube`, `each`) displayed in large `tabular-nums`, big `+/-` steppers, quick-"Matches Expected" confirm button, and `Can't find / 0` or `Damaged / Suspect` flag buttons.
- **Offline & Outbox Banner:** Sticky top status bar showing live connectivity and outbox queue state (`Online · All entries synced`, `Offline · 4 findings saved on phone`, or `Signed offline — pending sync`), plus non-intrusive iOS Home Screen install guidance when unsynced entries exist.

---

## 5. Locked Shared Component Primitives

Before building individual feature pages, developers must implement and reuse these eight canonical primitives:

1. **`<StatusBadge status={...} />`**: Enforces the icon + uppercase label + border contract for all Tool, Lot, Component, and Audit states.
2. **`<MonoId value={...} copyable />`**: Renders technical IDs, P/Ns, S/Ns, lot numbers, and tail numbers in `--font-mono` with `tabular-nums` and optional one-click copy.
3. **`<DenseDataTable />`**: Standard operational table with sticky header, keyboard row navigation, column sorting, bulk selection, and empty/filtered states.
4. **`<LocationBreadcrumb path={...} />`**: Compact hierarchical path (`Hangar 1 › Tool Crib › Cab B › Drawer 3`) with optional QR badge.
5. **`<ScanActionBar />`**: Camera viewfinder (`getUserMedia` + `BarcodeDetector` WASM with torch toggle, frame guide, and manual ID search fallback).
6. **`<OutboxSyncBanner />`**: Real-time IndexedDB outbox queue indicator with manual `"Sync now"` trigger and unsynced-data navigation guard.
7. **`<ComplianceSignoffBlock />`**: Captures typed full name, authenticated user identity, certificate type & number (or explicit `N/A`, never blank), optional drawn signature pad, auditor independence attestation (for facility audits), and timestamp.
8. **`<HelperDisclaimerBanner />`**: Subtle, permanent compliance notice displayed on sign-off screens and printed Audit PDFs stating: *"Internal compliance helper record — not an FAA-authorized electronic recordkeeping or electronic signature system."*
