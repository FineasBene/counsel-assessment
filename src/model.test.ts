import { describe, expect, it } from 'vitest';
import {
  addDays,
  csv,
  decodeData,
  duration,
  emptyData,
  localDate,
  sampleData,
  totals,
  validDate,
  validateEntry,
  weekStart,
} from './model';
import type { Entry } from './model';
const clients = [{ id: 'c', name: 'Acme, Inc.', color: '#987abc' }];
const entry: Entry = {
  id: 'e',
  date: '2026-09-30',
  minutes: 90,
  clientId: 'c',
  billable: true,
  description: 'Review "agreement"',
  employee: 'Alex Morgan',
};
describe('calendar dates', () => {
  it('uses Monday weeks across month/year boundaries', () => {
    expect(weekStart('2026-01-01')).toBe('2025-12-29');
    expect(weekStart('2026-10-04')).toBe('2026-09-28');
    expect(weekStart('2026-09-28')).toBe('2026-09-28');
  });
  it('adds calendar days across DST and leap days', () => {
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('rejects normalized impossible dates', () => {
    expect(validDate('2026-02-30')).toBe(false);
    expect(validDate('2024-02-29')).toBe(true);
    expect(validDate('2026-13-01')).toBe(false);
    expect(validDate('')).toBe(false);
  });
  it('formats dates without converting to UTC', () => {
    expect(localDate(new Date(2026, 8, 30, 0, 5))).toBe('2026-09-30');
  });
});
describe('accounting', () => {
  it('adds integer minutes and calculates billable ratio', () => {
    expect(
      totals([entry, { ...entry, id: 'f', minutes: 30, billable: false }]),
    ).toEqual({ total: 120, billable: 90, nonBillable: 30, utilization: 75 });
    expect(totals([]).utilization).toBe(0);
    expect(duration(135)).toBe('2h 15m');
    expect(duration(60)).toBe('1h');
  });
  it.each([0, -1, 1441, 1.5, NaN, Infinity])(
    'rejects invalid duration %s',
    (minutes) => {
      expect(() => validateEntry({ ...entry, minutes }, clients)).toThrow();
    },
  );
  it('allows the minute and day boundaries', () => {
    expect(() =>
      validateEntry({ ...entry, minutes: 1 }, clients),
    ).not.toThrow();
    expect(() =>
      validateEntry({ ...entry, minutes: 1440 }, clients),
    ).not.toThrow();
  });
  it('rejects missing clients', () => {
    expect(() => validateEntry(entry, [])).toThrow('client');
  });
});
describe('durable data', () => {
  it('roundtrips a workspace including empty ones', () => {
    const sample = sampleData();
    expect(decodeData(JSON.stringify(sample))).toEqual(sample);
    expect(decodeData(JSON.stringify(emptyData()))).toEqual(emptyData());
  });
  it('rejects malformed, unsupported, and orphaned records', () => {
    for (const data of [
      'bad',
      JSON.stringify({ version: 2, clients: [], entries: [] }),
      JSON.stringify({ version: 1, clients: [], entries: [entry] }),
      JSON.stringify({
        version: 1,
        clients,
        entries: [{ ...entry, billable: 'yes' }],
      }),
    ])
      expect(() => decodeData(data)).toThrow();
  });
  it('rejects duplicate identifiers', () => {
    expect(() =>
      decodeData(
        JSON.stringify({ version: 1, clients, entries: [entry, entry] }),
      ),
    ).toThrow('Duplicate');
  });
  it('rejects invalid style values and duplicate client names', () => {
    expect(() =>
      decodeData(
        JSON.stringify({
          version: 1,
          clients: [{ ...clients[0], color: 'url(bad)' }],
          entries: [],
        }),
      ),
    ).toThrow();
    expect(() =>
      decodeData(
        JSON.stringify({
          version: 1,
          clients: [...clients, { ...clients[0], id: 'd' }],
          entries: [],
        }),
      ),
    ).toThrow('Duplicate');
  });
});
describe('CSV export', () => {
  it('escapes commas, quotes and line breaks', () => {
    const result = csv(
      [{ ...entry, description: 'Review "agreement"\nFollow-up' }],
      clients,
    );
    expect(result).toContain('"Acme, Inc."');
    expect(result).toContain('"Review ""agreement""\nFollow-up"');
    expect(result).toContain('"90","Yes"');
  });
  it('neutralizes formula injection in user-authored cells', () => {
    expect(csv([{ ...entry, description: '=SUM(A1:A2)' }], clients)).toContain(
      '"\'=SUM(A1:A2)"',
    );
    expect(csv([{ ...entry, description: '  @SUM(1)' }], clients)).toContain(
      '"\'  @SUM(1)"',
    );
  });
});
