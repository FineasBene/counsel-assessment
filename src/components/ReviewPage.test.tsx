import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import pilot from '../fixtures/pilot-workspace.json';
import { decodeData, duration } from '../model';
import type { Data } from '../model';
import { ReviewPage } from './ReviewPage';

const downloads = vi.hoisted(() => [] as string[]);
vi.mock('../model', async (original) => ({
  ...(await original<typeof import('../model')>()),
  download: (content: string) => downloads.push(content),
}));

function Harness() {
  const [data, setData] = useState<Data>(() =>
    decodeData(JSON.stringify(pilot)),
  );
  return (
    <ReviewPage data={data} save={setData} onEdit={() => {}} readOnly={false} />
  );
}
const rows = () => document.querySelectorAll<HTMLElement>('.review-row');
const rowMinutes = () =>
  [...rows()].reduce((sum, row) => {
    const text = row.querySelector('.review-duration strong')!.textContent!;
    const [, h, m] = text.match(/(\d+)h(?: (\d+)m)?/)!;
    return sum + Number(h) * 60 + Number(m ?? 0);
  }, 0);

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

describe('Weekly review scope', () => {
  it('totals and exports exactly the filtered rows, not the whole week', async () => {
    render(<Harness />);
    expect(screen.getByLabelText('Review week')).toHaveValue('2026-09-28');
    await userEvent.selectOptions(
      screen.getByLabelText('Review client'),
      'meridian',
    );
    expect(rows().length).toBeGreaterThan(0);
    expect(screen.getByTestId('review-total')).toHaveTextContent(
      duration(rowMinutes()),
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Review employee'),
      'Sofia Keller',
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Review status'),
      'reviewed',
    );
    const shown = rows().length;
    downloads.length = 0;
    await userEvent.click(screen.getByRole('button', { name: /Export view/ }));
    const lines = downloads[0].trim().split('\r\n').slice(1);
    expect(lines).toHaveLength(shown);
    for (const line of lines) {
      expect(line).toContain('"Sofia Keller"');
      expect(line).toContain('"Meridian Holdings"');
    }
  });

  it('clears the selection when the view changes so hidden rows are never affected', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByLabelText('Select visible entries'));
    expect(screen.getByText(/in view selected/)).toBeInTheDocument();
    await userEvent.selectOptions(
      screen.getByLabelText('Review client'),
      'meridian',
    );
    expect(screen.getByText('None selected')).toBeInTheDocument();
    expect(
      screen.getByText('Selection cleared because the view changed.'),
    ).toBeInTheDocument();
    expect(
      within(document.querySelector('.bulk-toolbar')!).getByRole('button', {
        name: /Apply to 0 selected/,
      }),
    ).toBeDisabled();
  });

  it('shows reviewed billable time and lets you clear active filters', async () => {
    render(<Harness />);
    const data = decodeData(JSON.stringify(pilot));
    const ready = data.entries
      .filter(
        (e) =>
          e.date >= '2026-09-28' &&
          e.date <= '2026-10-04' &&
          e.reviewed &&
          e.billable,
      )
      .reduce((sum, e) => sum + e.minutes, 0);
    expect(
      screen.getByText(`${duration(ready)} reviewed and ready for billing`),
    ).toBeInTheDocument();
    await userEvent.selectOptions(
      screen.getByLabelText('Review client'),
      'meridian',
    );
    expect(
      screen.getByText('Showing only: Meridian Holdings'),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Clear filters' }),
    );
    expect(screen.getByLabelText('Review client')).toHaveValue('all');
    expect(screen.queryByText(/Showing only/)).not.toBeInTheDocument();
  });

  it('marks selected rows and shows a partial selection as mixed', async () => {
    render(<Harness />);
    const all = screen.getByLabelText<HTMLInputElement>(
      'Select visible entries',
    );
    await userEvent.click(
      screen.getByLabelText('Select Shareholder agreement review'),
    );
    expect(all.indeterminate).toBe(true);
    expect(all).not.toBeChecked();
    expect(document.querySelectorAll('.review-row.is-selected')).toHaveLength(
      1,
    );
    await userEvent.click(all);
    expect(all.indeterminate).toBe(false);
    expect(all).toBeChecked();
  });

  it('keeps the week and filters when the review is reopened', async () => {
    const first = render(<Harness />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Previous review week' }),
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Review client'),
      'meridian',
    );
    first.unmount();
    render(<Harness />);
    expect(screen.getByLabelText('Review week')).toHaveValue('2026-09-21');
    expect(screen.getByLabelText('Review client')).toHaveValue('meridian');
    await userEvent.click(screen.getByRole('button', { name: 'Latest week' }));
    expect(screen.getByLabelText('Review week')).toHaveValue('2026-09-28');
  });

  it('ignores a saved view that no longer fits the workspace', () => {
    sessionStorage.setItem(
      'counsel.review-view.v1',
      JSON.stringify({ week: '2026-09-30', clientId: 'gone', status: 'x' }),
    );
    render(<Harness />);
    expect(screen.getByLabelText('Review week')).toHaveValue('2026-09-28');
    expect(screen.getByLabelText('Review client')).toHaveValue('all');
    expect(screen.getByLabelText('Review status')).toHaveValue('all');
  });

  it('shows review progress per team member and filters by member', async () => {
    render(<Harness />);
    const data = decodeData(JSON.stringify(pilot));
    const week = data.entries.filter(
      (e) => e.date >= '2026-09-28' && e.date <= '2026-10-04',
    );
    const sofia = week.filter((e) => e.employee === 'Sofia Keller');
    const button = screen.getByRole('button', { name: /^Sofia Keller/ });
    expect(button).toHaveTextContent(
      `${sofia.filter((e) => e.reviewed).length}/${sofia.length} reviewed`,
    );
    await userEvent.click(button);
    expect(screen.getByLabelText('Review employee')).toHaveValue(
      'Sofia Keller',
    );
    expect(rows()).toHaveLength(sofia.length);
    await userEvent.click(button);
    expect(screen.getByLabelText('Review employee')).toHaveValue('all');
  });

  it('flags billable internal work and can show only flagged entries', async () => {
    render(<Harness />);
    expect(screen.queryByText(/flagged/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Select Weekly team planning'));
    await userEvent.selectOptions(
      screen.getByLabelText('Bulk action'),
      'billable',
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Apply to 1 selected entry/ }),
    );
    expect(
      screen.getByText('Billable time on an internal client'),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Show 1 flagged' }),
    );
    expect(rows()).toHaveLength(1);
    expect(
      screen.getByText(/Showing only: Flagged by pre-billing checks/),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Show all entries' }),
    );
    expect(rows().length).toBeGreaterThan(1);
  });
});
