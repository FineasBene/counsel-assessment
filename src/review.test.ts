import { describe, expect, it } from 'vitest';
import pilot from './fixtures/pilot-workspace.json';
import { decodeData } from './model';
import type { Data } from './model';
import { saveEntry, undoEntries, undoRecord, updateEntries } from './review';

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
      'Undo is unavailable',
    );
  });
});
