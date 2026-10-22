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
10. **Anti-Vibe-Coding UI Guardrails:** Every UI PR, prototype, and code review must strictly enforce `DESIGN.md` — utilitarian aviation aesthetic, high-density operational tables on desktop/tablet, `48px+` gloved thumb-zone targets on phone, mandatory monospace/`tabular-nums` for all technical IDs/P/Ns/S/Ns/dates/quantities, icon+text semantic status badges, `1px` borders, `4px–6px` radii, and zero SaaS gradients, glassmorphism, decorative emoji clutter, or bloated card grids.
11. **Grilling & Wayfinder Interview Rule:** At the start of every new wayfinder or grilling interview, ask Canaan up front whether he wants his input involved on individual questions (or in one lump list) or whether he trusts the agent's input to resolve them autonomously. When he says he trusts your input, resolve the questions using `CONTEXT.md` and domain best judgment, write the decision notes, and present a crisp summary for his review.

## Process
Follow wayfinder: map, then decisions, then (when an item is `ready-for-agent`) `to-spec`, then `to-tickets`. The skills live in `.claude/skills` (see `.claude/skills/README.md`). Issue tracker, labels, and domain-doc setup are in `docs/agents/`. Domain glossary terms live in `CONTEXT.md`, architectural decisions in `docs/adr/`, and UI/design rules in `DESIGN.md`. Human-readable notes go in the Obsidian vault; see `CLAUDE.md`.
