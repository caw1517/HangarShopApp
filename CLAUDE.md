# HangarShopApp

Read and follow `AGENTS.md` (ground rules) before any work. Skills are in `.claude/skills`.

## Notes

Human-readable notes (hub, research, decisions, ticket plans, session logs) live in the Obsidian vault at `E:\Projects\Obsidian\10 Projects\HangarShopApp`. Follow the vault conventions in `E:\Projects\Obsidian\CLAUDE.md` when reading or writing there. Agent-facing docs (`CONTEXT.md`, `docs/adr/`, `docs/agents/`) stay in this repo.

## Agent skills

### Issue tracker

GitHub issues on `caw1517/HangarShopApp`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
