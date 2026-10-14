import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { addDays, localDate } from '../model';
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

  it("repeats the user's previous entry onto today's date", async () => {
    const onSave = vi.fn();
    const yesterday = { ...planning, date: addDays(localDate(), -1) };
    render(
      <EntryForm
        clients={clients}
        entries={[
          yesterday,
          { ...planning, id: 'other', employee: 'Sofia Keller' },
        ]}
        onSave={onSave}
        onClose={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^Repeat / }));
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: /Save entry/ }));
    const saved = onSave.mock.calls[0][0] as Entry;
    expect(saved).toMatchObject({
      date: localDate(),
      minutes: 45,
      clientId: 'internal',
      billable: false,
      description: 'Weekly team planning',
      employee: 'Alex Morgan',
    });
    expect(saved.id).not.toBe(planning.id);
  });

  it('does not offer repeat when editing an existing entry', () => {
    render(
      <EntryForm
        entry={planning}
        clients={clients}
        entries={[{ ...planning, id: 'older', date: '2026-09-01' }]}
        onSave={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.queryByRole('button', { name: /^Repeat / })).toBeNull();
  });

  it('saves an unchanged entry with its original description', async () => {
    const onSave = vi.fn();
    const imported = {
      ...planning,
      description: 'Weekly team planning ',
      reviewed: true,
    };
    render(
      <EntryForm
        entry={imported}
        clients={clients}
        onSave={onSave}
        onClose={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Save changes/ }));
    expect(onSave.mock.calls[0][0]).toMatchObject({
      description: 'Weekly team planning ',
      billable: false,
      minutes: 45,
    });
  });
});
