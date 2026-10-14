import { Pencil, Trash2 } from 'lucide-react';
import { duration, localDate, shortDate, totals } from '../model';
import type { Client, Entry } from '../model';
export function EntryTable({
  entries,
  clients,
  readOnly,
  onEdit,
  onDelete,
}: {
  entries: Entry[];
  clients: Client[];
  readOnly: boolean;
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
}) {
  const dates = [...new Set(entries.map((e) => e.date))];
  return (
    <div className="entry-groups">
      {dates.map((date) => (
        <section className="day-group" key={date}>
          <div className="day-heading">
            <div>
              {shortDate(date, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
              {date === localDate() && <span>Today</span>}
            </div>
            <strong>
              {duration(totals(entries.filter((e) => e.date === date)).total)}
            </strong>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Client / description</th>
                  <th>Team member</th>
                  <th>Status</th>
                  <th className="duration-cell">Duration</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries
                  .filter((e) => e.date === date)
                  .map((entry) => {
                    const client = clients.find(
                      (c) => c.id === entry.clientId,
                    )!;
                    return (
                      <tr key={entry.id}>
                        <td>
                          <div className="entry-client">
                            <span
                              className="client-mark"
                              style={{ background: client.color }}
                            />
                            <div>
                              <strong>{client.name}</strong>
                              <span>
                                {entry.description || 'No description added'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="member-cell">
                            <span className="tiny-avatar">
                              {entry.employee
                                .split(' ')
                                .map((s) => s[0])
                                .slice(0, 2)
                                .join('')}
                            </span>
                            {entry.employee}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`status-tag ${entry.billable ? 'billable' : ''}`}
                          >
                            <i />
                            {entry.billable ? 'Billable' : 'Non-billable'}
                          </span>
                        </td>
                        <td className="duration-cell">
                          <strong>{duration(entry.minutes)}</strong>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="icon-button"
                              aria-label={`Edit ${client.name}: ${entry.description || 'time entry'}`}
                              onClick={() => onEdit(entry)}
                              disabled={readOnly}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className="icon-button delete-button"
                              aria-label={`Delete ${client.name}: ${entry.description || 'time entry'}`}
                              onClick={() => onDelete(entry)}
                              disabled={readOnly}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
