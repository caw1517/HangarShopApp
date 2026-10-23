# HangarShopApp

Read and follow `AGENTS.md` (ground rules), `CONTEXT.md` (domain glossary), `DESIGN.md` (Asset Panda + MaintainX design system with InvenTree location/lot hierarchy & the 6 anti-vibe-coding guardrails), and `docs/adr/` before any work. Skills are in `.claude/skills`.

## Notes

Human-readable notes (hub, research, decisions, specs, ticket plans, session logs) live in the Obsidian vault at `E:\Projects\Obsidian\10 Projects\HangarShopApp`. Follow the vault conventions in `E:\Projects\Obsidian\CLAUDE.md` when reading or writing there. Agent-facing docs (`CONTEXT.md`, `DESIGN.md`, `docs/adr/`, `docs/agents/`) stay in this repo.

## Agent skills

### Issue tracker

GitHub issues on `caw1517/HangarShopApp`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain & design docs

Single-context: `CONTEXT.md` (domain glossary), `DESIGN.md` (Asset Panda + MaintainX UI & anti-vibe-coding contract), and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
