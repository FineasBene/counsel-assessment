import { useState } from 'react';
import { Check } from 'lucide-react';
import { COLORS } from '../model';
import type { Client } from '../model';
import { Modal } from './Modal';
export function ClientForm({
  client,
  clients,
  onSave,
  onClose,
}: {
  client?: Client;
  clients: Client[];
  onSave: (client: Client) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(client?.name ?? '');
  const [color, setColor] = useState(
    client?.color ?? COLORS[clients.length % COLORS.length],
  );
  const [error, setError] = useState('');
  return (
    <Modal
      title={client ? 'Edit client' : 'A new working relationship.'}
      subtitle="Give your client a name and a little color."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            if (!name.trim()) throw new Error('Enter a client name.');
            if (
              clients.some(
                (c) =>
                  c.id !== client?.id &&
                  c.name.toLowerCase() === name.trim().toLowerCase(),
              )
            )
              throw new Error('A client with this name already exists.');
            onSave({
              id: client?.id ?? crypto.randomUUID(),
              name: name.trim(),
              color,
            });
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <label className="field">
          Client name
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            required
            placeholder="e.g. Meridian Holdings"
          />
        </label>
        <fieldset className="color-picker">
          <legend>Client color</legend>
          {COLORS.map((c) => (
            <label key={c} style={{ background: c }}>
              <input
                type="radio"
                name="color"
                aria-label={`Color ${c}`}
                value={c}
                checked={color === c}
                onChange={() => setColor(c)}
              />
              {color === c && <Check size={18} />}
            </label>
          ))}
        </fieldset>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-footer">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary">
            {client ? 'Save changes' : 'Add client'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
