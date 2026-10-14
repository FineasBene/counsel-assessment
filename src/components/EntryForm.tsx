import { useState } from 'react';
import { Check, Plus, Repeat2 } from 'lucide-react';
import {
  COLORS,
  duration,
  EMPLOYEE,
  localDate,
  shortDate,
  validateEntry,
} from '../model';
import type { Client, Entry } from '../model';
import { Modal } from './Modal';
export function EntryForm({
  entry,
  template,
  clients,
  entries = [],
  onSave,
  onClose,
}: {
  entry?: Entry;
  /** Values to start a new entry from (duplicate); the date stays today. */
  template?: Entry;
  clients: Client[];
  entries?: Entry[];
  onSave: (entry: Entry, client?: Client) => void;
  onClose: () => void;
}) {
  const [date, setDate] = useState(entry?.date ?? localDate());
  const start = entry ?? template;
  const [hours, setHours] = useState(
    start ? String(Math.floor(start.minutes / 60)) : '',
  );
  const [minutes, setMinutes] = useState(
    start ? String(start.minutes % 60) : '',
  );
  const [clientId, setClientId] = useState(
    start?.clientId ?? clients[0]?.id ?? '__new',
  );
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState(start?.description ?? '');
  const [billable, setBillable] = useState(start?.billable ?? true);
  const [error, setError] = useState('');
  // New entries can repeat the user's most recent entry before the chosen
  // date (usually yesterday's work). Every field stays editable.
  const previous =
    entry || template
      ? undefined
      : entries
          .filter((e) => e.employee === EMPLOYEE && e.date < date)
          .sort(
            (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
          )[0];
  const previousClient = clients.find((c) => c.id === previous?.clientId);
  return (
    <Modal
      title={entry ? 'Edit time entry' : 'Make your time count.'}
      subtitle={
        entry
          ? 'Keep your record accurate and up to date.'
          : 'Capture the work. We’ll take care of the totals.'
      }
      onClose={onClose}
    >
      {previous && previousClient && (
        <button
          type="button"
          className="repeat-entry"
          onClick={() => {
            setClientId(previous.clientId);
            setHours(String(Math.floor(previous.minutes / 60)));
            setMinutes(String(previous.minutes % 60));
            setDescription(previous.description);
            setBillable(previous.billable);
          }}
        >
          <Repeat2 size={16} />
          <span>
            Repeat{' '}
            {shortDate(previous.date, {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}
            : {previous.description || previousClient.name} ·{' '}
            {duration(previous.minutes)}
          </span>
        </button>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError('');
          try {
            let client: Client | undefined;
            if (clientId === '__new') {
              const name = clientName.trim();
              if (!name) throw new Error('Enter a client name.');
              if (
                clients.some((c) => c.name.toLowerCase() === name.toLowerCase())
              )
                throw new Error(
                  'That client already exists. Select it from the list.',
                );
              client = {
                id: crypto.randomUUID(),
                name,
                color: COLORS[clients.length % COLORS.length],
              };
            }
            const next: Entry = {
              id: entry?.id ?? crypto.randomUUID(),
              date,
              minutes: Number(hours) * 60 + Number(minutes),
              clientId: client?.id ?? clientId,
              billable,
              // Keep the stored text when only surrounding whitespace differs,
              // so an unchanged save does not count as a correction.
              description:
                entry && entry.description.trim() === description.trim()
                  ? entry.description
                  : description.trim(),
              employee: entry?.employee ?? EMPLOYEE,
            };
            validateEntry(next, client ? [...clients, client] : clients);
            onSave(next, client);
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        <label className="field">
          Client
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="__new">+ Create a new client</option>
          </select>
        </label>
        {clientId === '__new' && (
          <label className="field">
            New client name
            <input
              autoFocus
              required
              maxLength={80}
              placeholder="e.g. Meridian Holdings"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </label>
        )}
        <div className="form-row">
          <label className="field">
            Date
            <input
              type="date"
              min="1900-01-01"
              max="9999-12-31"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <fieldset className="duration-field">
            <legend>Duration</legend>
            <div>
              <label>
                <input
                  aria-label="Hours"
                  type="number"
                  min="0"
                  max="24"
                  step="1"
                  placeholder="0"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
                <span>h</span>
              </label>
              <label>
                <input
                  aria-label="Minutes"
                  type="number"
                  min="0"
                  max="59"
                  step="1"
                  placeholder="00"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                />
                <span>m</span>
              </label>
            </div>
          </fieldset>
        </div>
        <div
          className="duration-presets"
          role="group"
          aria-label="Quick durations"
        >
          <span>Quick duration</span>
          {[15, 30, 45, 60, 120].map((preset) => (
            <button
              type="button"
              key={preset}
              aria-label={`Set duration to ${duration(preset)}`}
              aria-pressed={Number(hours) * 60 + Number(minutes) === preset}
              onClick={() => {
                setHours(String(Math.floor(preset / 60)));
                setMinutes(String(preset % 60));
              }}
            >
              {preset < 60 ? `${preset}m` : `${preset / 60}h`}
            </button>
          ))}
        </div>
        <label className="field">
          Description <span className="optional">optional</span>
          <textarea
            rows={3}
            maxLength={500}
            placeholder="What did you work on?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="billable-control">
          <div>
            <strong>Billable time</strong>
            <span>Include this work in billable hours.</span>
          </div>
          <input
            type="checkbox"
            checked={billable}
            onChange={(e) => setBillable(e.target.checked)}
          />
          <span className="switch" aria-hidden="true">
            <Check size={12} />
          </span>
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-footer">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" type="submit">
            {entry ? <Check size={17} /> : <Plus size={17} />}{' '}
            {entry ? 'Save changes' : 'Save entry'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
