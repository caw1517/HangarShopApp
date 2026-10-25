Closes #
<!-- Stacked PR that isn't the last in the stack? Use: Part of #N
Repo setup / process PR with no issue? Replace the line above with:
No issue: repo setup -->

## Summary

<!-- What changed and why. PR title: <type>: <summary> (no number) -->

## Size check

- Changed lines (FYI, no limit):
- [ ] Small and focused: one concern, about one evening of work
- If not, why it couldn't be split:

## How to verify (required)

### Setup

<!-- Checkout and install, env vars by name only (never values).
Each line needs an Expected result and its actual result.
When a check can't apply, give the expected result as "N/A: <reason>" (e.g. "N/A: no package.json on main yet"). -->

- `gh pr checkout {number}` (replace `{number}` with this PR's number) → Expected: branch checked out · Result:
- `npm install` → Expected: installs with no errors · Result:

### Build / typecheck / tests

<!-- Exact commands run, each with an Expected result and its actual result.
Use "N/A: <reason>" as the expected result when a command doesn't apply. -->

- `npm test` (Vitest, incl. PGlite) → Expected: all tests pass, incl. PGlite · Result: pass/fail
- `npx tsc --noEmit` → Expected: no type errors · Result: pass/fail
- `npm run build` → Expected: build succeeds · Result: pass/fail
- `npm run lint` → Expected: no errors (skip if no lint script) · Result: pass/fail

### App / UI checks

<!-- `npm run dev`, then one numbered step per check: page or screen, what to do.
Each step needs an Expected result and a Result: pass / fail / pending.
A pending numbered step keeps the PR as a draft.
Checks that can only run after merge, or aren't testable yet, do NOT go here as pending steps —
list them under "Not testable yet" instead, and those items do not keep the PR in draft. -->

1. Step:
   - Expected:
   - Result: pending

### Not testable yet

<!-- What can't be checked yet (e.g. needs the live Supabase project) and why. -->

## Acceptance criteria

<!-- Copy from the issue as a checklist. -->

- [ ]

## Screenshots / logs

<!-- Attach or paste, or say what's still to come. -->

## Checklist

- [ ] UI ports the v5.1 prototype 1:1 and follows `DESIGN.md` (or no UI change)
- [ ] No spec-speak or ticket/issue numbers in UI copy; demo controls only in the `Tweaks` pill (collapsed by default)
- [ ] Flush split panes (no floating gaps or cards between panes); one status pill per row
- [ ] RLS on new tables; no edits to applied migrations
- [ ] No secrets, tokens or personal paths; env vars by name only
- [ ] Generic shop names only
- [ ] No new dependencies or paid services (or Canaan approved them)
- [ ] No migration applied to a live Supabase project without Canaan's OK
- [ ] No leftover debug (`console.log`, debug flags, test data)
- [ ] Review fixes are in new commits (no amend, rebase or force-push)

## Review flow

1. Mark the PR "ready for review" once the verify steps pass (drafts are ignored).
2. Hangar Tester (`RealCawBot`) reviews; Request changes starts the fix loop (Hangar Dev's automatic **[Claude Code]** run, max 3 rounds, then "address review" by hand).
3. Tester verifies each fix, resolves its threads, re-approves the current head, and adds `tester-approved` only when there are zero open findings (blocking threads **and** review-body suggestions/nits). Any push strips both labels (#39), so both re-approve.
4. Canaan adds `canaan-approved` and squash-merges.

Claude Code never adds or removes labels, approves, resolves threads, or merges. Only Canaan adds `canaan-approved` and squash-merges.
<!-- markdownlint-disable-file MD041 -->
