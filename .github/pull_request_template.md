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

<!-- Checkout, `npm install`, env vars by name only (never values). -->

### Build / typecheck / tests

<!-- Exact commands run and their result. -->

- `npm test` (Vitest, incl. PGlite):
- `npx tsc --noEmit`:
- `npm run build`:

### App / UI checks

<!-- `npm run dev`, then one numbered step per check: page or screen, what to do.
Each step needs an Expected result and a Result: pass / fail / pending.
If anything is pending, keep the PR as a draft. -->

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
- [ ] No secrets, tokens or personal paths; env vars by name only
- [ ] Generic shop names only
- [ ] No new dependencies or paid services (or Canaan approved them)
- [ ] No migration applied to a live Supabase project without Canaan's OK
- [ ] No leftover debug (`console.log`, debug flags, test data)
- [ ] Review fixes are in new commits (no amend, rebase or force-push)

## Review flow

1. Mark the PR "ready for review" once the verify steps pass (drafts are ignored).
2. Hangar Tester (`RealCawBot`) reviews; Request changes starts the fix loop (Hangar Dev's automatic **[Claude Code]** run, max 3 rounds, then "address review" by hand).
3. Tester verifies each fix, resolves its threads, re-approves, and adds `tester-approved` once every thread is resolved.
4. Canaan adds `canaan-approved` and squash-merges.

Claude Code never adds or removes labels, approves, resolves threads, or merges. Only Canaan adds `canaan-approved` and squash-merges.
<!-- markdownlint-disable-file MD041 -->
