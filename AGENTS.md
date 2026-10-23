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
10. **Anti-Vibe-Coding UI Guardrails (`DESIGN.md` — Swiss-AS AMOS + Oxide Computer + IBM Carbon):** Every prototype, UI PR, and code review must strictly enforce `DESIGN.md` and its 6 mandatory rules:
    - **Rule 1 (Aviation Form / Ledger Framing):** Open screens with a `1px solid` shared-border engineering form header block (`0px` radius, `0px` gap) showing screen code, location scope, mode, sync/outbox state, and operator/role — never floating SaaS hero headers or stacked pastel banners.
    - **Rule 2 (Edge-to-Edge `0px` Shared-Border Hairline Grids):** Never wrap list rows or table records in padded, rounded cards (`border-radius: 6px+`, `gap: 12px`). Use continuous `1px solid` shared borders (`0px` outer margin, `0px` radius) with flush `26px–28px` section divider bars.
    - **Rule 3 (Zero Unicode Emojis Anywhere):** Never use `🚨`, `⚠️`, `📷`, `🔦`, `✅`, or any Unicode emoji in the UI. Use `12px–14px` `1.5px`-stroke geometric SVG vectors paired with 3-letter aviation status codes (`SVC`, `DUE`, `OVD`, `UNS`, `QRN`, `EXP`, `MSN`, `REF`, `RET`).
    - **Rule 4 (Quiet-When-Nominal Status Discipline):** Nominal items (`SVC` / `SERVICEABLE`) render as quiet monochrome text + a subtle `6px` geometric mark with no colored pill background, reserving high-contrast red (`OVD`, `UNS`, `QRN`, `EXP`, `MSN`) and industrial amber (`DUE`, `PND`, `CAL`) strictly for off-nominal states.
    - **Rule 5 (No Multi-Box KPI Summary Tile Grids):** Never render 2x2 or 4-up rounded stat cards above a table. Summarize counts inline inside a single flush `32px` shared-border toolbar/filter strip.
    - **Rule 6 (Sharp Industrial Geometry & Monospace Technical Data):** Use `0px` corners on all tables, panels, headers, inputs, and status tags (`2px` max on standalone hardware-key buttons), and enforce `--font-mono` with `tabular-nums slashed-zero` on every Tool ID, P/N, S/N, batch/lot, tail, work order, quantity+unit, date, and cert number.
11. **Grilling & Wayfinder Interview Rule:** At the start of every new wayfinder or grilling interview, ask Canaan up front whether he wants his input involved on individual questions (or in one lump list) or whether he trusts the agent's input to resolve them autonomously. When he says he trusts your input, resolve the questions using `CONTEXT.md` and domain best judgment, write the decision notes, and present a crisp summary for his review.

## Process
Follow wayfinder: map, then decisions, then (when an item is `ready-for-agent`) `to-spec`, then `to-tickets`. The skills live in `.claude/skills` (see `.claude/skills/README.md`). Issue tracker, labels, and domain-doc setup are in `docs/agents/`. Domain glossary terms live in `CONTEXT.md`, architectural decisions in `docs/adr/`, and UI/design rules in `DESIGN.md`. Human-readable notes go in the Obsidian vault; see `CLAUDE.md`.
