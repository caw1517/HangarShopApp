---
name: Ticket
about: A ready-to-build slice for Canaan's Claude Code session (one issue = one PR)
title: ""
labels: needs-triage
---

**Epic / milestone:** Part of #{epic} · Milestone: {milestone}
**Size:** small and focused: one concern, about one evening of work. {if bigger, say why it can't be split, or split it into sub-issues first}

## Context
{Why this exists and what the user gets. Link the spec, ADRs (`docs/adr/`), glossary (`CONTEXT.md`), and decisions. The issue plus its linked docs must be enough to build it; nothing else needed.}

## Files to create or change
- `supabase/migrations/NNNN_{slug}.sql`: {tables, RLS, triggers} — new migration file; never edit an applied one
- `src/lib/domain/{module}.ts`: {domain logic}
- `src/components/views/{View}.tsx`: {UI, ported from the v5.1 prototype}
- `src/__tests__/{slug}.test.ts`: {tests}
- {anything else, or "none"}

## Steps
1. {step}
2. {step}
3. {step}

## Acceptance criteria
- [ ] {observable, testable outcome}
- [ ] {observable, testable outcome}
- [ ] `npm test`, `npx tsc --noEmit` and `npm run build` pass.
- [ ] UI matches the v5.1 prototype and `DESIGN.md` 1:1.
- [ ] No spec-speak or ticket/issue numbers in UI copy; demo controls only in the `Tweaks` pill; flush split panes; one status pill per row.
- [ ] RLS on new tables; no edits to applied migrations.

## How to verify
**Commands** (each with an Expected result)
1. `npm install` → Expected: installs with no errors.
2. `npm test` → Expected: all tests pass, including {new test file}.
3. `npx tsc --noEmit` → Expected: no type errors.
4. `npm run build` → Expected: build succeeds.
5. `npm run lint` → Expected: no errors (skip if no lint script).

**App / UI checks** (`npm run dev`, then open http://localhost:3000)
1. {go to screen X, do Y} → Expected: {what you should see}.
2. {go to screen X, do Z} → Expected: {what you should see}.
3. {edge case or permission check} → Expected: {clear error / blocked state}.

**Not testable yet:** {what and why, or "none"}

## Out of scope
- {thing this ticket deliberately does not do, and where it lives instead}

## Order and dependencies
- **Blocked by:** #{n} {or "none"}
- **Blocks:** #{n} {or "none"}

## References
- Spec: #{spec issue}; ADRs: `docs/adr/0001-…`, `0002-…`, `0003-…`; glossary: `CONTEXT.md`.
- **v5.1 prototype** at `/workspace/hangar-shadcn-seed/src/` (on the box) and `DESIGN.md`: **port 1:1** (same shell, `index.css` tokens, Untitled UI components). No generic placeholder chrome. If the box path isn't reachable, use the copy in the repo if one exists; otherwise ask Canaan.
- `CLAUDE.md`, `AGENTS.md`.

## PR rules
- **Branch:** `<type>/<issue#>-<slug>` from an up-to-date `main` (types: `feat`, `fix`, `chore`, `docs`, `test`, `spike`).
- **Commits:** small, Conventional Commits (`feat(tools): …`, `fix: …`). No secrets, tokens, personal paths, or build output. Generic shop names only.
- **Title:** `<type>: <summary>`, **no issue or PR number** (GitHub adds `(#PR)` on squash).
- **Body:** `Closes #N`, a summary, the acceptance criteria as a checklist, and a **How to verify** section (setup, commands with results, numbered App/UI steps each with Expected, not-testable-yet).
- **Draft** until the How to verify steps pass; then mark "ready for review" (that starts Hangar Tester's review).
- **Review fixes in new commits only:** no amend, rebase or force-push. Reply on each thread with the change and SHA.
- Live database migrations only after Canaan's OK; PGlite is fine for tests. Ask Canaan before adding any dependency.
- No agent adds `canaan-approved` or merges.

## Claude Code prompt (paste into Claude Code)
```text
Work on GitHub issue #<N> in caw1517/HangarShopApp.

1. Read the issue and every comment: `gh issue view <N> -R caw1517/HangarShopApp --comments`. Read CLAUDE.md, AGENTS.md, DESIGN.md, CONTEXT.md and the ADRs it references.
2. Port the v5.1 prototype 1:1 (same shell, index.css tokens, Untitled UI components). It lives at /workspace/hangar-shadcn-seed/src/ on the box only. If a copy exists in this repo, use that; otherwise stop and ask me for it. Don't invent placeholder UI.
3. Post a plan first as a comment on the issue, tagged [Claude Code]: files to create or change, steps, how you'll verify, and a size estimate. No code yet. Wait for my OK. If it's too big for one evening, propose a split instead.
4. After I OK it: branch `<type>/<N>-<slug>` from an up-to-date main, implement with small Conventional Commits, and add tests. Don't apply any migration to a live Supabase project; use PGlite for DB tests. Ask before adding dependencies.
5. Run `npm test`, `npx tsc --noEmit` and `npm run build` and fix anything that fails.
6. Write the PR body: `Closes #<N>`, summary, acceptance criteria checklist, and a How to verify section (setup, commands with expected results, numbered App/UI steps each with Expected, anything not testable yet).
7. Open the PR as a draft with title `<type>: <summary>` (no number). Run the verify steps you can; tell me when it's ready for me to mark "ready for review".
Review fixes later go in new commits only (no amend/rebase/force-push). Never add labels or merge.
```
