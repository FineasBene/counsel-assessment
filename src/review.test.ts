import { describe, expect, it } from 'vitest';
import pilot from './fixtures/pilot-workspace.json';
import { decodeData } from './model';
import type { Data } from './model';
import {
  billingWarnings,
  weeklySummary,
  saveEntry,
  undoEntries,
  undoRecord,
  updateEntries,
} from './review';

const workspace = (): Data => decodeData(JSON.stringify(pilot));
const find = (data: Data, id: string) => data.entries.find((e) => e.id === id)!;

describe('saving an entry', () => {
  it('keeps review when an unchanged entry is saved', () => {
    const data = workspace();
    const reviewed = find(data, 'entry-001');
    expect(reviewed.reviewed).toBe(true);
    const next = saveEntry(data, { ...reviewed }, undefined, reviewed);
    expect(find(next, 'entry-001').reviewed).toBe(true);
  });
});

describe('bulk corrections require review again', () => {
  it('reopens a reviewed entry moved to another client', () => {
    const data = workspace();
    const next = updateEntries(data, ['entry-001'], {
      clientId: 'foundation',
    });
    expect(find(next, 'entry-001')).toMatchObject({
      clientId: 'foundation',
      reviewed: false,
    });
  });
  it('reopens a reviewed entry whose billability changes', () => {
    const data = workspace();
    const next = updateEntries(data, ['entry-001'], { billable: false });
    expect(find(next, 'entry-001').reviewed).toBe(false);
  });
  it('keeps review when a bulk action changes nothing', () => {
    const data = workspace();
    const next = updateEntries(data, ['entry-001'], { clientId: 'meridian' });
    expect(find(next, 'entry-001').reviewed).toBe(true);
  });
});

describe('undo is scoped to the last review action', () => {
  it('does not revert independent edits to other entries', () => {
    const data = workspace();
    const afterAction = updateEntries(data, ['entry-001'], {
      clientId: 'foundation',
    });
    const operation = undoRecord(data, afterAction, ['entry-001']);
    const planning = find(afterAction, 'entry-002');
    const afterEdit = saveEntry(
      afterAction,
      { ...planning, description: 'Edited later' },
      undefined,
      planning,
    );
    const undone = undoEntries(afterEdit, operation);
    expect(find(undone, 'entry-001')).toEqual(find(data, 'entry-001'));
    expect(find(undone, 'entry-002').description).toBe('Edited later');
  });
  it('declines when an affected entry changed after the action', () => {
    const data = workspace();
    const afterAction = updateEntries(data, ['entry-001'], { billable: false });
    const operation = undoRecord(data, afterAction, ['entry-001']);
    const entry = find(afterAction, 'entry-001');
    const afterEdit = saveEntry(
      afterAction,
      { ...entry, minutes: 120 },
      undefined,
      entry,
    );
    expect(() => undoEntries(afterEdit, operation)).toThrow(
      'Undo was not applied, so no work was lost: “Shareholder agreement review” changed',
    );
    // Declining leaves the newer edit in place.
    expect(find(afterEdit, 'entry-001').minutes).toBe(120);
  });
});

describe('pre-billing checks', () => {
  const base = workspace();
  const e = (over: Partial<Data['entries'][number]>) => ({
    ...find(base, 'entry-001'),
    ...over,
  });
  it('flags billable internal time, missing descriptions, duplicates and long days', () => {
    const entries = [
      e({ id: 'a', clientId: 'internal', billable: true }),
      e({ id: 'b', description: '  ' }),
      e({ id: 'c', date: '2026-10-01' }),
      e({
        id: 'd',
        date: '2026-10-01',
        description: 'shareholder agreement review ',
      }),
      e({ id: 'x', date: '2026-10-02', minutes: 700 }),
      e({ id: 'y', date: '2026-10-02', minutes: 30, description: 'Other' }),
      e({ id: 'ok', date: '2026-10-03' }),
    ];
    const w = billingWarnings(entries, base.clients);
    expect(w.get('a')).toEqual(['Billable time on an internal client']);
    expect(w.get('b')).toEqual(['No description for the bill']);
    expect(w.get('c')).toEqual(['Possible duplicate']);
    expect(w.get('d')).toEqual(['Possible duplicate']);
    expect(w.get('x')).toEqual(['Over 12h logged by this person on this day']);
    expect(w.get('y')).toEqual(['Over 12h logged by this person on this day']);
    expect(w.has('ok')).toBe(false);
  });
  it('does not flag non-billable internal work', () => {
    const w = billingWarnings(
      [e({ id: 'p', clientId: 'internal', billable: false })],
      base.clients,
    );
    expect(w.size).toBe(0);
  });
});

describe('weekly summary', () => {
  it('summarises exactly the rows given', () => {
    const data = workspace();
    const week = data.entries.filter(
      (e) => e.date >= '2026-09-28' && e.date <= '2026-10-04',
    );
    const sofia = week.filter((e) => e.employee === 'Sofia Keller');
    const text = weeklySummary(sofia, week, data.clients, '2026-09-28', [
      'Sofia Keller',
    ]);
    expect(text).toContain('2026-09-28 to 2026-10-04');
    expect(text).toContain('View: Sofia Keller');
    expect(text).toContain(`Entries: ${sofia.length}`);
    expect(text).toContain(
      `Reviewed: ${sofia.filter((e) => e.reviewed).length} of ${sofia.length}`,
    );
    expect(text).toContain('- Sofia Keller:');
    expect(text).not.toContain('Alex Morgan');
  });
});
