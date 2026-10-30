---
name: HangarShopApp Design System (v6 Ops Navy)
stack: React 19, TypeScript, Next.js 15, Tailwind CSS 3, @untitledui/icons (stroke icons only)
references:
  - MaintainX (split execution shell, work-order-ready navigation)
  - Asset Panda (high-density registers, scan overlay, slim offline bar)
  - InvenTree (hierarchical storage locations and lot rollups)
  - Refactoring UI & ConardLi/garden-skills web-design-engineer (anti-slop guardrails)
tokens:
  font_sans: "\"Public Sans\", system-ui, -apple-system, \"Segoe UI\", sans-serif"   # next/font/google, SIL OFL 1.1
  font_mono: "\"Roboto Mono\", ui-monospace, SFMono-Regular, Menlo, monospace"        # next/font/google, SIL OFL 1.1, identifiers only
  numeric_variant: "tabular-nums on numeric cells only (.num), never on body"
  colors:
    slate_50:  "#F6F7F9"   # app canvas
    slate_100: "#EDEFF2"   # group/day header bars, disabled fills
    slate_200: "#DFE2E7"   # 1px dividers and table hairlines
    slate_300: "#C6CBD3"   # secondary button borders, subtle rules
    slate_400: "#9AA1AC"   # icons on dark rail, disabled icons (never text on white)
    slate_500: "#6E7682"   # placeholder text, FORM-CONTROL BORDERS
    slate_600: "#545B66"   # muted/secondary text
    slate_700: "#3E444D"   # body secondary text
    slate_800: "#2A2F36"   # secondary button text
    slate_900: "#1B1F24"   # primary ink
    slate_950: "#111418"   # navigation rail
    accent:       "#1F4E8C"  # Ops Navy: primary buttons, links, active indicators
    accent_hover: "#173D6E"
    accent_tint:  "#E8EEF6"  # selected row, active segment
    accent_ring:  "#5B82BF"  # 2px focus ring
    success_text: "#1E6B43"   # on success_tint "#E7F2EB", dot "#2E9E62"
    warning_text: "#8A5300"   # on warning_tint "#FBF0DB", dot "#D98E04"
    error_text:   "#A8261B"   # on error_tint   "#FBEAE8", dot "#D93D2E"
  radius:
    xs: "2px"   # checkboxes, inline code/ID chips, status dot pills inner
    sm: "4px"   # buttons, inputs, selects, segmented controls, status pills, nav items
    md: "5px"   # menus, popovers, banners, toasts, Tweaks panel
    lg: "8px"   # modals and sheets only
  shadows:
    overlay: "0 4px 12px rgba(17, 20, 24, 0.12)"   # menus, popovers, modals only; panes and rows never cast shadows
---

# HangarShopApp Design System

HangarShopApp is an operational application for aviation maintenance technicians, inspectors and shop managers. It is used in bright hangar bays and at the tool crib on shared tablets and phones, often with gloves. It is a working tool for people who already know the domain, not a marketing surface.

Visual anchors, chosen by the product owner from real product screenshots:

> "I really like the asset panda + maintainX look, esp since we will prob expand into Work Orders down the road"

1. **MaintainX**: dark navigation rail, list → detail/execution split, mobile cycle-count flow with large steppers and a single bottom CTA, and 4-up tactile status selectors.
2. **Asset Panda**: high-density registers with two-line cells, one status pill per row, tabbed record details, a barcode/QR scan overlay and a slim offline bar.
3. **InvenTree**: the hierarchical storage tree `Hangar › Tool crib › Cabinet › Drawer`, with rollup counts and a barcode/print action cluster.

Every UI pull request, prototype and review must follow this document.

---

## 1. Standing rules (mandatory)

1. **Proportional sans for all UI text.**
   - Public Sans is used for headings, navigation, buttons, tabs, labels, table text and status pills.
   - Text is always Sentence case. Never all-caps, and never tracked-out eyebrow labels.
   - Emphasis uses `font-medium` (500) and titles use `font-semibold` (600). Never use bold (700+) in the UI.
2. **Monospace only for raw identifiers.**
   - Roboto Mono at 12–13px is for tool IDs (`TL-0142`), part and serial numbers, lot numbers (`LOT-2026-089`), certificate numbers (`A&P 4102938`), tail numbers (`N123AB`), work order numbers, audit entry IDs and QR short codes.
   - Dates, times and quantities use Public Sans with `tabular-nums`, not mono. No fake terminal chrome: no `[F1]` keys, syslog tickers or ASCII stamp headers.
3. **No decoration that carries no meaning.**
   - No emoji, gradients, glows, glassmorphism, colored box-shadows or noise textures.
   - No colored left/top accent stripes on cards or rows.
   - No KPI stat-card grids above tables, and no icon-in-a-rounded-square feature cards.
4. **Flush panes, 1px dividers.**
   - Panes sit edge to edge, separated by 1px `slate-200` lines.
   - Panes, rows and tables never float as shadowed cards. Shadows are reserved for overlays (menus, popovers, modals).
5. **At most one status pill per row.** Secondary state goes in the row's muted subtext.
6. **No spec-speak in the UI.**
   - No ticket numbers, slice names, issue references or implementation terms (RLS, tenant, org_id) in user-facing copy.
   - Name things the way a shop would ("Who can view and change each area", not "Per-Shop isolation").
7. **Demo controls live only in the Tweaks pill.**
   - The pill sits bottom-right, is collapsed by default, and uses `slate-900/85`, white 12px text and the `sm` radius.
   - Nothing else in the app reveals that it is a demo.
8. **Touch and responsiveness.**
   - Every interactive target is at least 44×44px on touch layouts.
   - Every screen works from 390px to 1440px+ with no horizontal scroll (see §8).
9. **Copy.**
   - Use plain verbs, active voice, and the same name for an action throughout a flow ("Invite member" → toast "Invited").
   - Prefer a period or comma over an em dash in UI copy.
   - Errors say what happened and how to fix it.

---

## 2. Typography

**Families** are loaded with `next/font/google` in `src/app/layout.tsx` (self-hosted at build time, no runtime CDN). Both are SIL Open Font License 1.1.
- **Public Sans** (400, 500, 600): all UI text. Source: https://fonts.google.com/specimen/Public+Sans
- **Roboto Mono** (400, 500): identifiers only. Source: https://fonts.google.com/specimen/Roboto+Mono

**Numerals.** Public Sans has proportional default figures with a `tnum` feature.
- Apply `font-variant-numeric: tabular-nums` (Tailwind `tabular-nums`, or the `.num` utility) only to numeric table cells, quantities, steppers, counters, dates, times and hours/cycles.
- **Never set it on `body`**, because it widens hyphens and punctuation in prose.

**Scale:**

| Role | Size / line | Weight | Color |
|---|---|---|---|
| Page title (top bar) | 18 / 24px, −0.01em | 600 | slate-900 |
| Pane / drawer title | 15 / 20px | 600 | slate-900 |
| Section label | 13 / 18px | 500 | slate-900 |
| Body and table primary | 13–14 / 20px | 400 (name or nomenclature 500) | slate-900 |
| Secondary / subtext | 12 / 16px | 400 | slate-600 or slate-700 |
| Column header | 12 / 16px | 500 | slate-600 |
| Identifier (mono) | 12–13px | 400–500 | slate-900 / slate-700 |
| Mobile inputs | 16px minimum | 500 | slate-900 |
| Stepper quantity | 20–24px | 600 | slate-900 |

---

## 3. Color

About 85% of any screen is neutral slate. The navy accent is used for primary actions, links, focus, the active nav indicator and selected rows. Semantic hues appear only in status text/tints, 6px dots and blocking banners.

### Neutral ramp (cool slate)
| Token | Hex | Use |
|---|---|---|
| slate-50 | `#F6F7F9` | App canvas, filter bars |
| slate-100 | `#EDEFF2` | Day/group header rows, disabled button fill, row hover |
| slate-200 | `#DFE2E7` | 1px pane dividers and table hairlines |
| slate-300 | `#C6CBD3` | Secondary button border, subtle rules |
| slate-400 | `#9AA1AC` | Rail secondary text and icons, disabled icons. **Not for text on white.** |
| slate-500 | `#6E7682` | Placeholder text, **form-control borders** |
| slate-600 | `#545B66` | Muted text, column headers |
| slate-700 | `#3E444D` | Secondary body text |
| slate-800 | `#2A2F36` | Secondary button text |
| slate-900 | `#1B1F24` | Primary ink |
| slate-950 | `#111418` | Navigation rail |

### Accent: Ops Navy
| Token | Hex | Use |
|---|---|---|
| accent | `#1F4E8C` | Primary button fill, links, active nav indicator (2px inset bar), checked controls |
| accent-hover | `#173D6E` | Primary hover/pressed |
| accent-tint | `#E8EEF6` | Selected row, active segment fill |
| accent-ring | `#5B82BF` | 2px focus ring with 2px offset |

### Status
| State | Text | Tint (pill fill) | Dot (6px) | Used for |
|---|---|---|---|---|
| Success | `#1E6B43` | `#E7F2EB` | `#2E9E62` | Active, Serviceable, Present, Synced |
| Warning | `#8A5300` | `#FBF0DB` | `#D98E04` | Due soon, Pending verification, Not on file |
| Error | `#A8261B` | `#FBEAE8` | `#D93D2E` | Overdue, Unserviceable, Quarantined, Expired, Missing; destructive text buttons |
| Info | `#1F4E8C` | `#E8EEF6` | `#1F4E8C` | Invited, Out for cal |
| Neutral | `#545B66` | `#EDEFF2` | `#9AA1AC` | Deactivated, Retired, Depleted, Reference only |

Status pills always carry a text label. The dot is redundant reinforcement, so dot contrast is not relied on to convey state.

### Domain status pills (one per row)
| Domain status | Label | Tone | Subtext carries |
|---|---|---|---|
| Serviceable | Serviceable | Success | Cal due date or expiry |
| Reference-only | Reference only | Neutral | "Excluded from cal due lists" |
| Due soon | Due soon | Warning | `Due in 14 d (Nov 12)` |
| Pending verification | Pending verification | Warning | Awaiting cal designee |
| Out for cal | Out for cal | Info | Vendor and expected return |
| Overdue | Overdue | Error | Blocks usage logging |
| Unserviceable / Damaged | Unserviceable | Error | Reason |
| Quarantined | Quarantined | Error | Blocks material draw |
| Expired | Expired | Error | Lot or opened-life expiry |
| Missing | Missing | Error | Routed to Needs attention |
| Retired / Depleted / Disposed | Retired, Depleted | Neutral | Read-only history |
| Member: Active / Invited / Deactivated | Active, Invited, Deactivated | Success / Info / Neutral | Last active, invite date, leave date |

### WCAG 2.x contrast (computed with `contrast.py` from these exact values)
| Pair | Ratio | AA |
|---|---|---|
| slate-900 on white | 16.56:1 | Pass |
| slate-700 on white | 9.82:1 | Pass |
| slate-600 on white | 6.85:1 | Pass |
| slate-600 on slate-50 canvas | 6.39:1 | Pass |
| slate-600 on slate-100 (disabled button text) | 5.95:1 | Pass |
| slate-500 placeholder on white | 4.59:1 | Pass |
| slate-400 on white | 2.60:1 | **Fail as text**, so it is never used for text on white |
| White on accent `#1F4E8C` | 8.31:1 | Pass |
| White on accent-hover `#173D6E` | 10.89:1 | Pass |
| Accent text/link on white | 8.31:1 | Pass |
| Accent on slate-50 | 7.75:1 | Pass |
| Accent on accent-tint | 7.12:1 | Pass |
| slate-200 rail text on slate-950 | 14.22:1 | Pass |
| slate-400 rail muted on slate-950 | 7.10:1 | Pass |
| Success text on tint | 5.65:1 | Pass |
| Warning text on tint | 5.60:1 | Pass |
| Error text on tint | 6.10:1 | Pass |
| Error text on white (destructive button) | 7.10:1 | Pass |
| **Form-control border: slate-500 vs white** | 4.59:1 | **Pass 3:1 (WCAG 1.4.11)** |
| Form-control border: slate-400 vs white | 2.60:1 | Fail 3:1, so not used for input borders |
| Focus ring `#5B82BF` vs white | 3.90:1 | Pass 3:1 |
| Hairline slate-200 vs white | 1.30:1 | Decorative divider; not a control boundary |

**Input-border decision:**
- Text inputs, selects, textareas, checkboxes and segmented controls use a **slate-500 `#6E7682`** 1px border, because it is the lightest ramp step that clears 3:1.
- Secondary buttons may use slate-300, because their label text identifies them.

---

## 4. Shape and elevation

| Radius | px | Applies to |
|---|---|---|
| xs | 2 | Checkboxes, inline ID chips, tiny tags |
| sm | 4 | Buttons, inputs, selects, segmented controls, status pills, nav items, Tweaks pill |
| md | 5 | Menus, popovers, banners, toasts, expanded Tweaks panel |
| lg | 8 | Modals and sheets only |

- Status dots and avatars are the only fully round shapes. Nothing else uses `rounded-full`, `rounded-xl` or larger.
- Panes and table rows are square-edged and flush.
- Elevation exists only for overlays (`0 4px 12px rgba(17,20,24,.12)`).
- Buttons and inputs are flat: a 1px border, no skeuomorphic inset shadow.

---

## 5. Brand

- **Rail header:** a text wordmark showing the shop name ("Apex Charter MX") in 14px/600 white, with the location line in 12px slate-400.
  - **Never** use initials in a colored square as a stand-in logo.
  - When a real shop or product mark is supplied, it sits left of the name at 20–24px, monochrome on the rail.
- **Signed-out and sign-in screens:** the product name as text (or the supplied mark), on a slate-50 canvas with one white panel. No colored initials tile.
- **Avatars:** a neutral slate-100 circle with slate-700 initials. Never accent-filled.

---

## 6. Screen shapes

Each screen takes the shape its content needs. **Do not clone one list-pane + breadcrumb + fact-strip + form + footer template across screens.**

### Shell
- Dark slate-950 rail (224px desktop) and a white content area.
- The top bar (56px) holds the page title, a short plain subtitle, search, and at most one primary action on the right.
- An optional slate-50 filter bar holds segmented filters with real counts.
- The keyboard hint (J/K to move, Enter to open) is shown **once per screen**, in the filter bar or as a tooltip, and never repeated in a footer.

### Team
- **Sortable roster table**, full width. Columns:
  - Name (500) with the email as subtext
  - Role
  - Certificate (mono, or "Not on file" in warning text)
  - Designations ("Cal designee", "Auditor", or muted "None")
  - Last active (tabular sans)
  - Status (one pill)
- Selecting a row opens a **flush right detail pane** (360–400px, 1px divider). The pane contains:
  - The name and "Role since <date>"
  - A definition list (certificate, email, last active)
  - **Role as a 3-way segmented control** (Admin · Inspector · Mechanic)
  - Designations as two checkbox rows, each with a one-line meaning
  - A required "Reason for change" field
  - A short "Recent" list of the member's last 2–3 audit entries
  - A text-style destructive "Deactivate" action and a primary "Save changes"
- One warning banner may appear when a change is blocked (e.g. the last active admin).
- "Invite member" opens the same pane in invite mode.

### Audit log
- An **append-only ledger table** grouped by local calendar day in the shop's timezone, newest first.
  - Day header rows read "Today · Thu, Oct 29", "Yesterday · Wed, Oct 28", then "Mon, Oct 26".
- Columns: Time (`h:mm AM`, tabular), Changed by (a person or "System" in muted text), Change, Area.
- **Change is one line:** subject (500) + what changed, written as `old → new` ("Idle sign-out 30 → 15 min"). The reason appears as a muted quoted second line when one exists.
- No per-row checkboxes and no per-row Added/Updated pills.
- **Detail pane:**
  - A title ("Idle sign-out changed"), plus actor and full timestamp
  - A **Before/After table**
  - The reason
  - Area, entry ID (mono) and source device
  - The append-only note, shown once ("Entries can't be edited or deleted, including by admins.")
- Export CSV is a secondary action.

### Shop settings
- A **single scrolling form page**, not a list-detail register. Sections:
  - Compliance thresholds
  - Weekly digest & idle sign-out
  - New shop provisioning (owner only)
  - Who can view and change each area
- Each section has a heading, a one-line plain explanation, its fields, a "Reason for change" field, and an **inline Save** that shows "Saved · 7:42 AM" after success.
- No status pills on sections ("Configured" and "Enforced" are not states a user acts on).
- The access matrix is a plain table.

### Prohibited patterns on every screen
- Decorative checkbox or verification squares on rows that are not checklists.
- Progress bars that are not progress toward completing a task (a roster is not a progress bar).
- Hard-coded or fake nav counts. Counts appear only when computed from live data.
- A gray multi-box "fact strip" repeating values already visible elsewhere on the screen.
- Breadcrumbs on single-level screens.

### Demo-data realism (seed and mocks)
1. **Several actors.** Audit entries come from at least 3 distinct people plus System, and **no single human actor makes more than 60% of entries**.
2. **Realistic times.** **Fewer than 20%** of seeded timestamps fall on the hour. Use real-looking minutes, plus some night-shift and weekend times.
3. **Imperfect people.** At least one member has a certificate shown as **"Not on file"**. Include a long or hyphenated name, a nickname, and a personal (non-company) email.
4. **Lifecycle coverage.** Include an invited member, a deactivated member, and System entries (invite accepted, invite expired).
5. **Real reasons.** Reasons are written in a mechanic's or manager's voice. Some entries have no reason.
6. **Formatted timestamps.** **Never render a raw ISO-8601 timestamp.** All times go through the shared formatter in the shop's timezone.
7. **Reserved domains.** Seed emails use reserved `.example` domains.
8. **Separate shops.** Each shop has its own distinct dataset. Never copy one shop's data into another.

---

## 7. Roadmap page

- The navigation shows **only shipped modules** (today: Team, Audit log, Shop settings) plus **one "Roadmap" entry**.
- Unbuilt modules get no nav items and no per-module placeholder pages.
- The Roadmap page is one quiet, honest page in two plain tables:
  - **Available now:** each shipped area with a one-line description and a link ("Open settings").
  - **Being built:** each unbuilt module, with its name, one plain shop-language line ("Walk a cabinet, count what is there, sign off the result."), and a rough status in muted text: **Next**, **Planned** or **Later**.
- A single footnote may say order can change and which settings carry over.
- **Not allowed:** "Coming soon" pills, "What this module will track" cards, empty two-card shells, repeated "on the way" copy, or dates and percentages that imply commitments.

---

## 8. Responsive and phone

| Width | Navigation | Content |
|---|---|---|
| ≥ 1024px | Full 224px rail | Table + flush detail pane side by side |
| 640–1023px | 56px icon rail with tooltips | Table full width; detail opens as a right sheet |
| < 640px | Top bar (shop name, menu button, search) + menu sheet | List of two-line rows (primary line + one pill). Tapping opens a **full-screen detail with a Back control**; browser Back returns to the list with scroll kept |

- No horizontal scroll at 390px on any screen.
- Inputs are at least 16px (no iOS zoom), and tap targets are at least 44px.
- The Tweaks pill stays bottom-right above any bottom bar.
- On phone, the cycle-count flow uses the MaintainX pattern:
  - A 2-row header: back, location title and Scan; then "Checked items: X of Y" with a progress bar (the one legitimate progress bar).
  - Large steppers and a full-width 48px "Save & count next" primary button.
  - A slim 32px offline bar ("Working offline · 4 findings queued").

---

## 9. Shared primitives

1. **`AppShellNav`**: the rail, with the wordmark/shop switcher, shipped modules, Roadmap, and a signed-in footer (name + role). It collapses per §8.
2. **`DataTable`**: a sortable table with 1px hairlines, two-line cells, one `StatusPill` column, a keyboard-navigable selected row (accent-tint) and optional day-group rows.
3. **`DetailPane`**: a flush right pane on desktop, a sheet on tablet and full-screen on phone, with a title block, definition list, actions and a sticky action row.
4. **`StatusPill`**: tone-based (success, warning, error, info, neutral), with a tint fill, tone text, 6px dot, `sm` radius and 12px/500 text. One per row.
5. **`SegmentedControl`**: a 3–4 option single-select. Its border is slate-500, the active option is accent-tint with accent text, and touch height is at least 44px.
6. **`TactileStatusGrid`**: the 4-up tool-condition selector (Present / serviceable, Wrong location, Can't find, Damaged / unserviceable). Inactive is white with a slate-500 border; active has a 2px accent ring and a tone dot.
7. **`CycleCountStepper`**: a unified horizontal input group (− | qty | +) with a unit label and a "Match expected" secondary button.
8. **`BarcodeScannerSheet` + `OfflineOutboxBar`**: the camera scan sheet and the slim offline bar.
9. **`ComplianceSignoffBlock` + `HelperDisclaimerBanner`**: a typed name, authenticated login, certificate type and number (or explicit "N/A"), optional drawn signature, independence attestation, and the disclaimer "Internal compliance helper record. Not an FAA-authorized electronic recordkeeping or electronic signature system."

---

## 10. Tokens (paste-ready)

### `src/app/globals.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --font-sans: var(--font-public-sans), system-ui, -apple-system, "Segoe UI", sans-serif;
    --font-mono: var(--font-roboto-mono), ui-monospace, SFMono-Regular, Menlo, monospace;

    --slate-50: #F6F7F9;  --slate-100: #EDEFF2; --slate-200: #DFE2E7; --slate-300: #C6CBD3;
    --slate-400: #9AA1AC; --slate-500: #6E7682; --slate-600: #545B66; --slate-700: #3E444D;
    --slate-800: #2A2F36; --slate-900: #1B1F24; --slate-950: #111418;

    --accent: #1F4E8C; --accent-hover: #173D6E; --accent-tint: #E8EEF6; --accent-ring: #5B82BF;

    --success: #1E6B43; --success-tint: #E7F2EB; --success-dot: #2E9E62;
    --warning: #8A5300; --warning-tint: #FBF0DB; --warning-dot: #D98E04;
    --error:   #A8261B; --error-tint:   #FBEAE8; --error-dot:   #D93D2E;
    --info:    #1F4E8C; --info-tint:    #E8EEF6; --info-dot:    #1F4E8C;

    --radius-xs: 2px; --radius-sm: 4px; --radius-md: 5px; --radius-lg: 8px;
    --shadow-overlay: 0 4px 12px rgba(17, 20, 24, 0.12);
  }

  body {
    font-family: var(--font-sans);
    color: var(--slate-900);
    background: var(--slate-50);
    /* no font-variant-numeric here; use .num on numeric cells */
  }
  h1, h2, h3 { font-weight: 600; }
  :focus-visible { outline: 2px solid var(--accent-ring); outline-offset: 2px; }
}

@layer utilities {
  .num { font-variant-numeric: tabular-nums; }
  .font-id { font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-size: 12px; }
}
```

### `src/app/layout.tsx`
```tsx
import { Public_Sans, Roboto_Mono } from "next/font/google";
const publicSans = Public_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-public-sans", display: "swap" });
const robotoMono = Roboto_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-roboto-mono", display: "swap" });
// <html lang="en" className={`${publicSans.variable} ${robotoMono.variable}`}>
```

### `tailwind.config.ts` (theme.extend)
```ts
fontFamily: {
  sans: ["var(--font-sans)"],
  mono: ["var(--font-mono)"],
},
colors: {
  slate: {
    50: "var(--slate-50)", 100: "var(--slate-100)", 200: "var(--slate-200)", 300: "var(--slate-300)",
    400: "var(--slate-400)", 500: "var(--slate-500)", 600: "var(--slate-600)", 700: "var(--slate-700)",
    800: "var(--slate-800)", 900: "var(--slate-900)", 950: "var(--slate-950)",
  },
  accent: { DEFAULT: "var(--accent)", hover: "var(--accent-hover)", tint: "var(--accent-tint)", ring: "var(--accent-ring)" },
  success: { DEFAULT: "var(--success)", tint: "var(--success-tint)", dot: "var(--success-dot)" },
  warning: { DEFAULT: "var(--warning)", tint: "var(--warning-tint)", dot: "var(--warning-dot)" },
  error:   { DEFAULT: "var(--error)",   tint: "var(--error-tint)",   dot: "var(--error-dot)" },
  info:    { DEFAULT: "var(--info)",    tint: "var(--info-tint)",    dot: "var(--info-dot)" },
},
borderRadius: {
  none: "0", xs: "var(--radius-xs)", sm: "var(--radius-sm)", DEFAULT: "var(--radius-sm)",
  md: "var(--radius-md)", lg: "var(--radius-lg)", full: "9999px",
},
boxShadow: { overlay: "var(--shadow-overlay)", none: "none" },
```

Rules for using the tokens:
- Hex literals in components are not allowed. Use tokens.
- `rounded-xl`, `rounded-2xl` and `rounded-full` are not allowed except on dots and avatars.
