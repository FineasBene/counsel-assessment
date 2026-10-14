# Release handover

## Changed

One commit per problem. Each fix has a test that fails on the original code.

- **Billability lost on edit**: the form always started Billable. It now uses the stored value.
- **Totals/export ignored filters**: both now use exactly the visible rows; selection never changes export.
- **Corrections stayed Reviewed**: bulk client/billability changes now reopen review, using the same `needsReReview` rule as the form. Unchanged saves keep review, including descriptions with stray whitespace. A toast says when an edit reopens review.
- **Undo reverted other work**: undo restored a whole-workspace snapshot. It now restores only the entries the action touched, and declines, naming the entry, if one changed since.
- **Friday workflow, selection scope**: changing week/filters clears the selection and says so. Actions reach only visible rows. Selected rows are highlighted, the toolbar reads "N of M in view selected · time", and active filters are listed with Clear.
- **Optional requests**: "Show N needing review", reviewed billable time ("ready for billing"), repeat previous entry, and a dark theme (tokenised colours, light theme unchanged).
- **Extras**: the review keeps its week and filters across pages for the session (validated, cleared on restore), a Latest week link, a Reviewed mark on Time entries, and duration presets.

## Verified

- `npm run check`: 41 unit/component tests and the build pass.
- `npm run test:e2e`: 18 tests pass, desktop and mobile Chromium. New: `review.spec.ts` (pilot week export, selection, re-review via bulk and form, Reviewed mark in both themes) and `theme.spec.ts` (axe WCAG A/AA in dark mode on four screens).
- Manual pass on 28 Sep–4 Oct. This found an unclear undo message and dark-theme field/notice colours, all fixed.

Not tested: Safari/Firefox, concurrent tabs during review, large workspaces, dark mode on Reports/Clients beyond manual viewing.

## Remaining

- Undo covers only the last review action and lasts only while the page stays open.
- Dark tokens were generated, then hand-adjusted. They need a design pass.

## Release recommendation

Release to the pilot. Every report is reproduced and covered by regression tests. Limitation: single-step undo.

## AI use

Claude Code wrote the code and tests; I tested each change in the browser. Every new test was run against the original source (`git stash`) and had to fail. That caught an agent test that exercised `saveEntry` and passed on the buggy code; it was replaced with an `EntryForm` component test.
