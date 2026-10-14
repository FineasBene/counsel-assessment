import type { Client, Data, Entry } from './model';
import {
  addDays,
  localDate,
  validDate,
  validateEntry,
  weekStart,
} from './model';

export type ReviewFilters = {
  week: string;
  clientId: string;
  employee: string;
  status: string;
  search: string;
};
export type EntryPatch = Partial<
  Pick<Entry, 'clientId' | 'billable' | 'reviewed'>
>;
// Snapshots of only the entries an action touched, so undo can restore them
// without discarding unrelated work saved after the action.
export type UndoRecord = { before: Entry[]; after: Entry[] };

export function selectWeek(entries: Entry[], week: string) {
  return entries.filter(
    (entry) => entry.date >= week && entry.date <= addDays(week, 6),
  );
}
export function selectReview(
  entries: Entry[],
  clients: Client[],
  filters: ReviewFilters,
) {
  return selectWeek(entries, filters.week)
    .filter(
      (entry) =>
        (filters.clientId === 'all' || entry.clientId === filters.clientId) &&
        (filters.employee === 'all' || entry.employee === filters.employee) &&
        (filters.status === 'all' ||
          !!entry.reviewed === (filters.status === 'reviewed')) &&
        `${entry.description} ${clients.find((c) => c.id === entry.clientId)?.name ?? ''} ${entry.employee}`
          .toLowerCase()
          .includes(filters.search.toLowerCase()),
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.employee.localeCompare(b.employee) ||
        a.id.localeCompare(b.id),
    );
}
// A change to any of these fields invalidates a previous review.
export function needsReReview(previous: Entry, next: Entry) {
  return (
    previous.date !== next.date ||
    previous.minutes !== next.minutes ||
    previous.clientId !== next.clientId ||
    previous.billable !== next.billable ||
    previous.description !== next.description ||
    previous.employee !== next.employee
  );
}
export function applyEntryUpdate(previous: Entry, next: Entry): Entry {
  return {
    ...next,
    reviewed: needsReReview(previous, next) ? false : previous.reviewed,
  };
}
export function saveEntry(
  data: Data,
  entry: Entry,
  client?: Client,
  original?: Entry,
): Data {
  const previous = data.entries.find((e) => e.id === entry.id);
  if (
    original &&
    (!previous || JSON.stringify(previous) !== JSON.stringify(original))
  )
    throw new Error(
      'This entry changed while you were editing. Close and reopen it to use the latest version.',
    );
  const clients = client ? [...data.clients, client] : data.clients;
  validateEntry(entry, clients);
  return {
    ...data,
    clients,
    entries: [
      ...data.entries.filter((e) => e.id !== entry.id),
      previous
        ? applyEntryUpdate(previous, entry)
        : { ...entry, reviewed: false },
    ],
  };
}
export function updateEntries(
  data: Data,
  ids: string[],
  patch: EntryPatch,
): Data {
  const selected = new Set(ids);
  if (ids.some((id) => !data.entries.some((e) => e.id === id)))
    throw new Error('An entry no longer exists. Refresh your selection.');
  return {
    ...data,
    entries: data.entries.map((entry) => {
      if (!selected.has(entry.id)) return entry;
      const merged = { ...entry, ...patch };
      validateEntry(merged, data.clients);
      // Bulk corrections (client, billability) reopen reviewed entries, like
      // edits in the entry form. An explicit review/reopen patch wins.
      if (patch.reviewed === undefined && needsReReview(entry, merged))
        merged.reviewed = false;
      return merged;
    }),
  };
}
export function undoRecord(before: Data, after: Data, ids: string[]) {
  const pick = (data: Data) =>
    ids.map((id) => data.entries.find((e) => e.id === id)!);
  return { before: pick(before), after: pick(after) };
}
export function undoEntries(data: Data, operation: UndoRecord): Data {
  const restore = new Map(operation.before.map((e) => [e.id, e]));
  const conflicts = operation.after.filter((expected) => {
    const current = data.entries.find((e) => e.id === expected.id);
    return !current || JSON.stringify(current) !== JSON.stringify(expected);
  });
  if (conflicts.length) {
    const names = conflicts
      .map((e) => `“${e.description || 'Untitled entry'}”`)
      .join(', ');
    throw new Error(
      `Undo was not applied, so no work was lost: ${names} changed after this action. Correct ${conflicts.length === 1 ? 'it' : 'them'} directly instead.`,
    );
  }
  return {
    ...data,
    entries: data.entries.map((e) => restore.get(e.id) ?? e),
  };
}

// The review view (week and filters) survives moving between pages for the
// rest of the browser session. It is kept apart from workspace data, so
// backups are unaffected, and is validated against the current workspace.
export const REVIEW_VIEW_KEY = 'counsel.review-view.v1';
export function latestWeek(entries: Entry[]) {
  return weekStart(
    entries
      .map((e) => e.date)
      .sort()
      .at(-1) ?? localDate(),
  );
}
export function loadReviewView(data: Data): ReviewFilters {
  const fallback: ReviewFilters = {
    week: latestWeek(data.entries),
    clientId: 'all',
    employee: 'all',
    status: 'all',
    search: '',
  };
  try {
    const saved: unknown = JSON.parse(
      sessionStorage.getItem(REVIEW_VIEW_KEY) ?? 'null',
    );
    if (typeof saved !== 'object' || saved === null) return fallback;
    const v = saved as Record<string, unknown>;
    return {
      week:
        typeof v.week === 'string' &&
        validDate(v.week) &&
        weekStart(v.week) === v.week
          ? v.week
          : fallback.week,
      clientId: data.clients.some((c) => c.id === v.clientId)
        ? (v.clientId as string)
        : 'all',
      employee: data.entries.some((e) => e.employee === v.employee)
        ? (v.employee as string)
        : 'all',
      status:
        v.status === 'pending' || v.status === 'reviewed' ? v.status : 'all',
      search: typeof v.search === 'string' ? v.search.slice(0, 200) : '',
    };
  } catch {
    return fallback;
  }
}
export function saveReviewView(filters: ReviewFilters | null) {
  try {
    if (filters)
      sessionStorage.setItem(REVIEW_VIEW_KEY, JSON.stringify(filters));
    else sessionStorage.removeItem(REVIEW_VIEW_KEY);
  } catch {
    // Storage unavailable: the view simply resets next time.
  }
}

// Pre-billing checks: likely mistakes worth a second look before billing.
// Advisory only; they never block an action or change data.
export const DAY_LIMIT_MINUTES = 12 * 60;
export function billingWarnings(
  entries: Entry[],
  clients: Client[],
): Map<string, string[]> {
  const warnings = new Map<string, string[]>();
  const add = (id: string, text: string) =>
    warnings.set(id, [...(warnings.get(id) ?? []), text]);
  const internal = new Set(
    clients.filter((c) => /internal/i.test(c.name)).map((c) => c.id),
  );
  const seen = new Map<string, string>();
  const dayTotals = new Map<string, number>();
  for (const e of entries) {
    const day = `${e.employee}|${e.date}`;
    dayTotals.set(day, (dayTotals.get(day) ?? 0) + e.minutes);
  }
  for (const e of entries) {
    if (e.billable && internal.has(e.clientId))
      add(e.id, 'Billable time on an internal client');
    if (!e.description.trim()) add(e.id, 'No description for the bill');
    const key = [
      e.employee,
      e.date,
      e.clientId,
      e.minutes,
      e.description.trim().toLowerCase(),
    ].join('|');
    const first = seen.get(key);
    if (first) {
      add(e.id, 'Possible duplicate');
      if (!warnings.get(first)?.includes('Possible duplicate'))
        add(first, 'Possible duplicate');
    } else seen.set(key, e.id);
    if ((dayTotals.get(`${e.employee}|${e.date}`) ?? 0) > DAY_LIMIT_MINUTES)
      add(e.id, 'Over 12h logged by this person on this day');
  }
  return warnings;
}
