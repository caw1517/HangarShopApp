# HangarShopApp

Read and follow `AGENTS.md` (ground rules), `CONTEXT.md` (domain glossary), `DESIGN.md` (Asset Panda + MaintainX design system with InvenTree location/lot hierarchy & the 6 anti-vibe-coding guardrails), and `docs/adr/` before any work. Skills are in `.claude/skills`.

This file is the Claude Code playbook for Canaan's coding sessions: how a ticket goes from issue to PR to merge. `AGENTS.md` ground rules still apply; where this file is more specific about the ticket, PR and review flow, follow this file.

## The project

Canaan's own personal tool (never employer-owned) for an aviation maintenance shop: tools and calibration, shelf-life consumables, guided audits, fleet hours/cycles and cost-maintenance program reporting. Next.js + React + TypeScript + Tailwind, Supabase (Postgres + RLS), Vitest with PGlite for database tests. Repo: `caw1517/HangarShopApp`.

**Who does what:** Canaan writes all code with you (Claude Code) on his PC and opens the PRs. **Hangar Tester** is the only bot reviewer; it posts real GitHub reviews as the separate account `RealCawBot`. **Hangar Dev** only fixes Tester's review comments with an automatic Claude Code run, and never reviews. **Hangar PM** writes tickets, specs and notes. Only Canaan adds `canaan-approved` and merges.

## Planning a ticket

Canaan picks an issue labeled `ready-for-agent` and hands it to you (for example "plan issue #N", or his local `/plan-ticket` skill).

1. **Read the issue in full, including every comment:**
   `gh issue view N -R caw1517/HangarShopApp --comments`
   The comments matter: a **[PM] Ready-to-build addendum** fills in sections the body lacks (files, steps, How to verify, out of scope, PR rules, prompt). Also read linked issues (epic, blockers) and the docs and ADRs it references.
2. **Check the blockers are merged.** If one isn't, tell Canaan before planning.
3. **Plan first. No code yet.** Post the plan as a comment on the issue, starting with `**[Claude Code]**`, and summarize it in chat: files to create or change, steps, how you'll verify (commands, then App/UI checks), and a size estimate. Ask instead of guessing.
4. **Wait for Canaan's OK.** Re-confirm if the plan changes materially.
5. **Too big?** One issue = one PR, one concern, about one evening of work (no hard line limit). If the plan is bigger or mixes concerns, stop and propose a split into sub-issues or stacked PRs. Create sub-issues with `gh issue create --template ticket.md` **only after Canaan agrees**. If the work grows mid-way, pause and tell him.
6. On "implement": branch, build in small commits, verify, and open the PR (below).

## Design and the v5.1 prototype

- Every UI slice ports the approved **v5.1 prototype 1:1**: the same shell, `index.css` tokens and Untitled UI components, following `DESIGN.md` and its guardrails. Never invent generic placeholder chrome.
- The prototype source lives at `/workspace/hangar-shadcn-seed/src/` on Hangar's box, not on Canaan's PC. If a copy exists in this repo, use that; otherwise stop and ask Canaan for it.
- All UI is responsive: phone, tablet and desktop.

## Branch, commit and PR conventions

- **Branch** from an up-to-date `main`:
  `git switch main && git pull && git switch -c <type>/<issue#>-<short-slug>`
  Types: `feat`, `fix`, `chore`, `docs`, `test`, `spike`. Example: `feat/29-locations-tree`. If the issue names a branch, use that.
- **Commits:** small and often, Conventional Commits, e.g. `feat(tools): add end-of-month due-date rule`, `fix: ...`, `test: ...`, `docs: ...`.
- **PR title:** `<type>: <summary>`, **no issue or PR number** (GitHub appends `(#PR)` on squash), e.g. `feat: hierarchical locations tree`.
- **PR body:** from `.github/pull_request_template.md`, with `Closes #N`. In a stacked split, every PR except the last says `Part of #N` and the last says `Closes #N`, so the issue closes only when the whole stack is merged. A setup PR with no issue says `No issue: repo setup`.
- **Draft until verified:** open the PR as a draft while any How to verify step is still pending. Taking it out of draft ("ready for review", `gh pr ready N`) is what starts Hangar Tester's review; drafts are ignored.
- Never commit build output, `node_modules/`, `.env*` files, personal paths or secrets.

## Before opening the PR

1. `npm install` (or `npm ci`).
2. `npm test` (Vitest, including the PGlite Postgres tests), `npx tsc --noEmit`, `npm run build`, plus any lint script that exists. Fix failures first.
3. Run the issue's How to verify steps that can run on this PC.
4. Write the PR's **How to verify** section: setup (env vars by name only), the commands above with their results, then numbered **App / UI checks** (`npm run dev`, which page, what to do), each with an **Expected** result and a **Result: pass / fail / pending**, and anything not testable yet.
5. Remove leftover debug code, `console.log`s and test flags.

## Opening the PR

Open the PR yourself as soon as the work is done. Don't wait to be asked.

1. `git push -u origin HEAD`
2. Copy `.github/pull_request_template.md` to a temp file **outside the repo** and fill in every section. How to verify is required.
3. `gh pr create --draft --title "<type>: <summary>" --body-file <file>` (drop `--draft` only if every verify step already passed).
4. Post the PR URL in chat and tell Canaan what's left before he marks it ready for review.

## Merge gate

Nothing merges until **both** approvals are in and the review is fully clear:

- **Hangar Tester** (as `RealCawBot`) reviews code, the app, and every How to verify step. Blocking findings are inline threads; suggestions are in the review body. It resolves its own threads once each fix is verified, re-approves, and adds `tester-approved` only after **every** thread is resolved.
- **Canaan** reviews last, adds `canaan-approved`, and **squash-merges**. Only Canaan adds that label.
- The `approval-gate` check must pass (both labels present on the current commit; the upgraded gate also checks who added each label, treats labels older than the latest push as stale, and fails on any unresolved thread). Any new push means approvals must be given again.

**Claude Code never:** adds or removes labels, approves a PR, resolves review threads, merges (including `gh pr merge --admin`), pushes or force-pushes to `main`, or amends, rebases or force-pushes a PR branch.

## Review feedback loop ("address review")

When Canaan says **"address review"**:

1. Read every comment:
   - `gh pr view <PR> -R caw1517/HangarShopApp --comments` (review bodies and general comments)
   - `gh api repos/caw1517/HangarShopApp/pulls/<PR>/comments` (inline threads)
2. Fix each one in **new commits**. No amend, rebase or force-push.
3. Reply to **each** inline comment with what changed and the commit SHA, starting with `**[Claude Code]**`:
   `gh api repos/caw1517/HangarShopApp/pulls/<PR>/comments/<id>/replies -f body="**[Claude Code]** Fixed in <sha>: ..."`
   For general comments: `gh pr comment <PR> --body "**[Claude Code]** ..."`. If a comment needs a decision, ask Canaan on the thread instead of guessing.
4. Re-run the checks, update the PR body (including How to verify) if anything changed, and push. Don't resolve threads; Tester does. Repeat until approved.

**Automatic fixes:** when Tester submits a **Request changes** review on a non-draft PR, Hangar Dev runs the same loop automatically (`claude --model opus` in its own worktree on the box), with the same rules: new commits only, a `**[Claude Code]**` reply with the SHA on each thread, never resolving threads, touching labels, approving or merging. Max **3 automatic rounds** per PR; after that, or if a round fails, Canaan runs "address review" by hand. PRs that touch `.github/workflows/` are never auto-fixed, and the automatic run never edits workflow files.

## Role tags

Every bot comment on GitHub starts with its role tag:

- **[Tester]**: Hangar Tester (posts as `RealCawBot`)
- **[Claude Code]**: you, and Hangar Dev's automatic fix runs (post as `caw1517`)
- **[PM]**: Hangar PM (posts as `caw1517`)

An untagged comment from `caw1517` is Canaan's. Always tag yours.

## Ask Canaan first

- Data-model changes beyond what the ticket specifies.
- Anything touching security, auth or RLS beyond the ticket.
- New dependencies or paid services (for example a PDF, spreadsheet or email library).
- **Live migrations:** never apply a migration to a live Supabase project without Canaan's explicit OK. PGlite is approved for tests.
- Deleting anything.

## Workflow-file PRs

Any PR touching `.github/workflows/` gets an extra security review from Hangar Tester (trigger type, no PR code under `pull_request_target`, least-privilege permissions, actions pinned by SHA, no reused required-check names, fails closed, actionlint clean) and Canaan's own line-by-line look. These PRs are never auto-fixed; expect them to move slower.

## Hard rules

- **No secrets.** No tokens, keys, passwords or personal paths in commits, PRs or comments. Env vars by name only.
- **Generic shop names only.** Never use a real employer's name in code, seed data, tests, issues, PRs or comments; use generic names such as "Demo Hangar" or "Shop A".
- **Append-only records.** Follow the ADRs: forced RLS per Shop (`ADR-0001`), immutable corrections and the append-only audit log (`ADR-0002`), the offline outbox (`ADR-0003`).
- When in doubt, stop and ask Canaan.

## Notes

Human-readable notes (hub, research, decisions, specs, ticket plans, session logs) live in the Obsidian vault at `E:\Projects\Obsidian\10 Projects\HangarShopApp`. Follow the vault conventions in `E:\Projects\Obsidian\CLAUDE.md` when reading or writing there. Agent-facing docs (`CONTEXT.md`, `DESIGN.md`, `docs/adr/`, `docs/agents/`) stay in this repo.

## Agent skills

### Issue tracker

GitHub issues on `caw1517/HangarShopApp`, via the `gh` CLI. See `docs/agents/issue-tracker.md`. New tickets use `.github/ISSUE_TEMPLATE/ticket.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`. The approval labels `tester-approved` and `canaan-approved` are never yours to add or remove.

### Domain & design docs

Single-context: `CONTEXT.md` (domain glossary), `DESIGN.md` (Asset Panda + MaintainX UI & anti-vibe-coding contract), and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
