# Release handover

## Changed

One commit per problem, each with a test that fails on the previous code.

- **Billability lost on edit** (Alex): the entry form always started with Billable on. It now starts from the stored value. `EntryForm.tsx`
- **Totals and export ignored filters** (Sofia): the summary and Export view used the whole week. Both now use exactly the visible rows; selection does not affect export.
- **Corrections stayed "Reviewed"**: bulk client and billability changes now reset review when a value actually changes. This uses the same `needsReReview` rule as the form; unchanged saves keep review.
- **Undo reverted other work**: undo restored a whole-workspace snapshot. It now restores only the entries the action touched. If one of them was edited or deleted since, undo is declined and the message names the entry.
- **Friday workflow (selection scope)**: changing the week or a filter clears the selection and says so, and actions only reach visible rows. The toolbar shows "N of M in view selected · time" and the button names its count. Active filters are listed with a Clear button.
- **Smaller additions**: a "Show N needing review" shortcut, reviewed billable time ("ready for billing"), and "Repeat previous entry" for Alex.

## Verified

- `npm run check`: 36 unit and component tests pass, and the build passes.
- `npm run test:e2e`: 12 tests pass on desktop and mobile Chromium. A new `tests/review.spec.ts` restores the pilot, checks the filtered CSV export, selection clearing and re-review after a client move, and runs axe.
- Manual pass on the pilot week 28 Sep–4 Oct. This found that the declined-undo message was unclear, which is now fixed.

Not tested: Safari/Firefox, multiple tabs during review, very large workspaces.

## Remaining

- The form trims descriptions, so an imported entry with trailing spaces loses review on an unchanged save.
- Undo is held in memory per page visit, with no history.
- Dark theme is deferred: about 226 hard-coded colours would need tokenising and contrast re-checks.

## Release recommendation

I would release this to the pilot: every reported issue is reproduced and covered by a regression test. One limitation: undo covers only the last review action.

## AI use

Claude Code (Opus) read the code, implemented the fixes and wrote the tests. I tested each change by hand in the browser against the pilot week. One example of a correction: the agent's first billability test exercised `saveEntry` and passed on the old code. I required each new test to fail against the original source (`git stash`), which led to a component test of `EntryForm` instead.
