# Agent ground rules (HangarShopApp)

Every agent working on this repo follows these rules: Claude Code, Codex, reviewers, and the team lead.

1. Nothing merges to `main` without Canaan's approval. Agents work only on branches and open PRs; Canaan merges.
2. PRs are small: one ticket per PR, linked to its issue, saying what changed and how it was tested.
3. A second agent reviews every PR, and tests must pass, before Canaan is asked to look.
4. Canaan approves each wayfinder stage (map, key decisions, spec, ticket list) before build starts.
5. Design prototypes need Canaan's approval before they become tickets.
6. Always ask Canaan first about new dependencies or paid services, data-model changes, anything touching security/auth, and deleting anything.
7. Ask Canaan whenever an approval or a wayfinder/general question comes up; don't hold questions for standups.
8. All UI must be fully responsive: phone, tablet, and desktop monitor.
9. PRs are squash-merged; the PR title becomes the commit on `main`, so write it as a conventional commit (`feat: ...`, `fix: ...`, `chore: ...`) and reference the issue in the body (`Closes #N`).
10. **Anti-Vibe-Coding UI Guardrails (`DESIGN.md` — Asset Panda + MaintainX, with InvenTree location/lot hierarchy):** Every prototype, UI PR, and code review must strictly enforce `DESIGN.md` and its 6 mandatory guardrails:
    - **Rule 1 (100% Proportional Sans-Serif in Normal Sentence/Title Case):** Use `Inter` / system sans in normal Sentence/Title Case across all headers, buttons, tabs, descriptions, and pills. Never set UI chrome in all-caps monospace (`JetBrains Mono` / `Courier`). Use `font-variant-numeric: tabular-nums` on `Inter` for aligned numbers/dates, and reserve monospace or medium tabular sans strictly for raw IDs (`TL-0142`, `LOT-2024-88A`, `/q/K7M2QX`).
    - **Rule 2 (No Fake Terminal Chrome):** No `[F1]/[F2]/[F3]` function-key labels on touch tabs, no `MSG 16:20` syslog tickers, and no 6-box ASCII-style stamp headers eating mobile screen height.
    - **Rule 3 (No Marketing Card Slop or Emoji Soup):** Zero Unicode emojis anywhere in the UI (use crisp Lucide/geometric SVG icons), no decorative gradient hero cards, and no multi-row KPI stat-card grids above tables.
    - **Rule 4 (Clean, Utilitarian Enterprise Geometry):** `6px–8px` subtle border radius on cards, buttons, and inputs; `1px solid #E2E8F0` (`#1E293B` in dark mode) table hairlines; `#FFFFFF` primary surfaces over `#F8FAFC` light-slate canvas; `#0F172A` / `#1E293B` dark-slate left navigation sidebar; MaintainX Blue (`#2563EB`) primary interactive accent and Asset Panda Teal (`#0D9488` / `#10B981`) verified/complete accent.
    - **Rule 5 (One Semantic Status Pill Per Row):** Render a single soft-fill, high-contrast status pill with a leading dot per row (`Serviceable` green/slate, `Due Soon` amber, `Overdue` red, `Quarantined` red, `Expired` red)—never 3 competing badges on the same row. Combined with Asset Panda two-line stacked table cells and MaintainX 4-up tactile status buttons + `Save & Count Next` mobile cycle-count flow.
    - **Rule 6 (Work Orders Expansion Readiness):** Keep the dark-slate left navigation rail and MaintainX 3-pane split-view architecture (`List -> Detail / Execution Pane`) structured so `Work Orders` slots directly into the same shell in a future release.
11. **Grilling & Wayfinder Interview Rule:** At the start of every new wayfinder or grilling interview, ask Canaan up front whether he wants his input involved on individual questions (or in one lump list) or whether he trusts the agent's input to resolve them autonomously. When he says he trusts your input, resolve the questions using `CONTEXT.md` and domain best judgment, write the decision notes, and present a crisp summary for his review.

## Process
Follow wayfinder: map, then decisions, then (when an item is `ready-for-agent`) `to-spec`, then `to-tickets`. The skills live in `.claude/skills` (see `.claude/skills/README.md`). Issue tracker, labels, and domain-doc setup are in `docs/agents/`. Domain glossary terms live in `CONTEXT.md`, architectural decisions in `docs/adr/`, and UI/design rules in `DESIGN.md`. Human-readable notes go in the Obsidian vault; see `CLAUDE.md`.
