import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Entry } from '../model';
import { EntryForm } from './EntryForm';

const clients = [{ id: 'internal', name: 'Firm · Internal', color: '#52735a' }];
const planning: Entry = {
  id: 'entry-002',
  date: '2026-09-28',
  minutes: 45,
  clientId: 'internal',
  billable: false,
  description: 'Weekly team planning',
  employee: 'Alex Morgan',
  reviewed: false,
};

// jsdom does not implement <dialog> modality.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
  };
});

afterEach(cleanup);

describe('EntryForm editing', () => {
  it('keeps a non-billable entry non-billable when only the description changes', async () => {
    const onSave = vi.fn();
    render(
      <EntryForm
        entry={planning}
        clients={clients}
        onSave={onSave}
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    const description = screen.getByLabelText(/Description/);
    await userEvent.clear(description);
    await userEvent.type(description, 'Weekly team planning and priorities');
    await userEvent.click(screen.getByRole('button', { name: /Save changes/ }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'entry-002',
        billable: false,
        minutes: 45,
        clientId: 'internal',
        date: '2026-09-28',
        description: 'Weekly team planning and priorities',
      }),
      undefined,
    );
  });
});
