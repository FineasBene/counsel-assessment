import { cleanup, render, screen } from '@testing-library/react';
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

afterEach(cleanup);

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
});
