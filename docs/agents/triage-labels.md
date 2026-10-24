# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the "Label in our tracker" column to match whatever vocabulary you actually use.

## Approval labels

Two additional labels drive the PR dual-approval gate (see `AGENTS.md` rule 1): `tester-approved` and `canaan-approved`. The `approval-gate` workflow requires both labels to be present before a PR can merge; it does not enforce the order they were added (by process Hangar Tester reviews first and Canaan reviews last).

- Only Hangar Tester adds `tester-approved`, after its written review.
- Only Canaan adds `canaan-approved`. Agents never add, remove, or re-add it, even though all agents share the `caw1517` account.
- The workflow strips both labels when new commits are pushed and when the PR is reopened, so approvals always apply to the current commit.
- Failed label strip: If the workflow can't remove the approval labels (e.g. a fork PR, where `GITHUB_TOKEN` is read-only, or an API error), it warns and still fails the check; Hangar Tester removes `tester-approved` and Canaan removes `canaan-approved` by hand, and both re-review the current commit.
- No agent ever uses `gh pr merge --admin` or otherwise bypasses or overrides the `approval-gate` check.
