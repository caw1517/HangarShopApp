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

## Process
Follow wayfinder: map, then decisions, then (when an item is `ready-for-agent`) `to-spec`, then `to-tickets`. The skills live in `.claude/skills` (see `.claude/skills/README.md`). Issue tracker, labels, and domain-doc setup are in `docs/agents/`. Human-readable notes go in the Obsidian vault; see `CLAUDE.md`.
