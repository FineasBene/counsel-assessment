# Friday close at Morgan & Partners

You are taking over the next release of Counsel, a time-tracking tool used in a fictional law-firm pilot. The interface is in place, and the team has begun preparing weekly billing reviews. They do not yet trust every part of the workflow.

Your job is to investigate the reports below, improve the experience of reviewing a week's work, and hand over a release you can describe honestly.

## Your repository

Create an empty public GitHub repository on your own profile and enter its URL in the Attack portal before starting. Keep it public so reviewers can access your submitted commit. The portal supplies the existing app as a starter ZIP; you are improving Counsel, not creating a new tracker.

## Your time

**90 minutes of independent work.** Environment prerequisites are provided before the start. The Attack portal releases this starter when you click Start and records your 90-minute deadline using server time.

Use any AI tools you like. You are responsible for the behavior you submit, including code produced by an agent. You are not expected to fix everything. Prioritize, make useful progress, and explain remaining risks. We value a well-verified change over an unsupported claim of completeness.

Commit and push as you work. Push the final version and submit its full 40-character SHA and handover in the Attack portal at least 30 seconds before the independent-work deadline. The portal records your declared SHA and handover using server time. Reviewers verify and archive that pushed revision; local commit dates are not used to establish elapsed time. Contact the interviewer immediately for setup or network problems. Any extension must be agreed and recorded.

## Getting situated

Follow the README to load the pilot workspace. Work with the fixed week **28 September–4 October 2026**. It includes Alex Morgan, Sofia Keller, and Noah Weber, five clients, a mix of billing statuses, and work in the previous week.

Read the reports as customer observations, not technical diagnoses. They may share causes or describe different paths through the product.

### Customer report: an ordinary correction

**Alex, associate:**

> I cleaned up the wording on “Weekly team planning.” It was internal, non-billable work. After saving, it appeared billable. I only meant to change the description.

### Customer report: numbers I cannot reconcile

**Sofia, office manager:**

> In Weekly review I narrowed the list to Meridian Holdings. The hours above the list didn't look like the sum of those rows. Then I filtered to my reviewed entries and exported them. The file included work I wasn't looking at.

### Customer report: corrections after review

**Sofia, office manager:**

> I had already checked the shareholder-agreement entry. We corrected its client using the review actions, but it still looked checked. Later I used Undo after making another correction, and something else seemed to go back too. I don't know whether those are related.

## The workflow we want to improve

**Sofia:**

> Every Friday I need to check the team's time, correct mistakes, and know what is ready for billing. I lose track when I move between clients and filters. When I select rows, I'm not always sure which records the next action will touch.

Choose a focused improvement to this workflow. We are interested in your reasoning and the before/after experience, not in a prescribed redesign. A clear small change is enough.

## Product expectations

Use these to resolve ambiguity; ask the interviewer if a decision materially changes the scope.

- Editing one field should preserve other entry values unless the user explicitly changes them.
- In Weekly review, the time totals and **Export view** should correspond to the active week and filters. Selection controls actions; it does not silently change export scope.
- Reviewed means the current date, employee, client, duration, billability, and description have been checked. A meaningful correction requires review again, whichever supported path makes it. Saving an unchanged entry should not require another review.
- Undo should reverse the last review action while keeping independent work. It must not silently erase newer work on affected entries. Safely declining a conflicting undo with an explanation is acceptable.
- Selection and action scope should be understandable when filters change. You can choose whether to clear selection or explicitly preserve and explain it; hidden effects are not acceptable.
- Preserve existing entries, clients, and backup compatibility. Internal non-billable work remains part of the review. No invoices or external billing actions are required.

## Other requests in the queue

These are optional and compete for your time; choose deliberately.

- The partner would like a dark theme.
- Alex would like a way to repeat yesterday's entry.
- Sofia wants a quicker way to see what still needs checking.

## Deliverables

1. A runnable repository with your committed changes, pushed before the deadline.
2. Relevant verification: tests, reproducible manual checks, or both.
3. A completed `HANDOVER.md`, roughly 300 words or less. Describe what you changed, the evidence, what you deferred, and your release recommendation.

You may refactor or redesign as needed. Keep installation simple. Do not replace the app with a disconnected mockup, remove working functionality to hide a report, or discard the supplied records. There is no requirement to finish the optional requests.

## How we assess your work

We assess your submitted code, verification, and handover. Explain your changes, what your checks establish, and any remaining risks.

We assess correctness and verification (35%), product/UX judgment (25%), technical understanding (25%), and responsible AI collaboration (15%). We do not score lines of code, number of prompts, agent counts, or presentation polish. Tell us what is true, including what you have not established.
