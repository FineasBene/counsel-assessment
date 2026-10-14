# Release handover

## Changed

One commit per problem; each fix has a test that fails on the original code.

- **Billability lost on edit**: the form always started Billable. It now uses the stored value.
- **Totals/export ignored filters**: both now use exactly the visible rows. Selection never changes export.
- **Corrections stayed Reviewed**: bulk client/billability changes reopen review (shared `needsReReview` rule). Unchanged saves keep review, and a toast says when an edit reopens it.
- **Undo reverted other work**: undo restored a workspace snapshot. It now restores only the touched entries, and declines, naming the entry, if one changed since.
- **Friday workflow, selection scope**: changing week/filters clears the selection and says so. Actions reach only visible rows. Selected rows are highlighted, the toolbar shows "N of M in view selected · time", and active filters are listed with Clear.
- **Pre-billing checks**: review rows flag billable internal time, missing descriptions, possible duplicates and >12h days, with a "Show N flagged" filter. Advisory only.
- **Optional/extras**: needing-review shortcut, "ready for billing" time, repeat previous entry, dark theme, the review view kept across pages, a Reviewed mark on Time entries, duration presets, per-person review progress, time by team member in Reports, a copyable Friday summary, Duplicate on Time entries, and CSS motion (off under prefers-reduced-motion).

## Verified

- `npm run check`: 47 unit/component tests and the build pass.
- `npm run test:e2e`: 26 tests pass on desktop and mobile Chromium, including the new `review.spec.ts` (pilot week flows) and `theme.spec.ts` (axe WCAG A/AA in dark mode).
- Manual pass on 28 Sep–4 Oct, which found and fixed an unclear undo message and dark-theme colours.

Not tested: Safari/Firefox, concurrent tabs during review, large workspaces.

## Remaining

- Undo is single-step and lasts only while the page stays open.
- Internal clients are detected by "internal" in the name; a real client type field would be better.
- Dark tokens were generated, then hand-adjusted. They need a design pass.

## Release recommendation

Release to the pilot. Every report is reproduced and covered by regression tests. Limitation: single-step undo.

## AI use

Claude Code wrote the code and tests; I tested each change in the browser. Every new test had to fail against the original source (`git stash`). That caught an agent test on `saveEntry` that passed on the buggy code; it was replaced with an `EntryForm` component test.
