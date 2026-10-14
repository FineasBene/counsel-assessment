import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardCopy,
  Pencil,
  Search,
  Undo2,
} from 'lucide-react';
import type { Data, Entry } from '../model';
import {
  addDays,
  csv,
  download,
  duration,
  shortDate,
  totals,
  weekStart,
} from '../model';
import {
  billingWarnings,
  latestWeek,
  loadReviewView,
  saveReviewView,
  selectReview,
  selectWeek,
  undoEntries,
  undoRecord,
  updateEntries,
  weeklySummary,
} from '../review';
import type { EntryPatch, UndoRecord } from '../review';

export function ReviewPage({
  data,
  save,
  onEdit,
  readOnly,
}: {
  data: Data;
  save: (data: Data) => void;
  onEdit: (entry: Entry) => void;
  readOnly: boolean;
}) {
  const [initialView] = useState(() => loadReviewView(data));
  const [week, setWeek] = useState(initialView.week);
  const [clientId, setClientId] = useState(initialView.clientId);
  const [employee, setEmployee] = useState(initialView.employee);
  const [status, setStatus] = useState(initialView.status);
  const [search, setSearch] = useState(initialView.search);
  useEffect(() => {
    saveReviewView({ week, clientId, employee, status, search });
  }, [week, clientId, employee, status, search]);
  const newestWeek = latestWeek(data.entries);
  const [selected, setSelected] = useState<string[]>([]);
  const [action, setAction] = useState('review');
  const [targetClient, setTargetClient] = useState(data.clients[0]?.id ?? '');
  const [operation, setOperation] = useState<UndoRecord | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  // Checks run on the whole week so duplicates and day totals are complete.
  const warnings = billingWarnings(
    selectWeek(data.entries, week),
    data.clients,
  );
  const visible = selectReview(data.entries, data.clients, {
    week,
    clientId,
    employee,
    status,
    search,
  }).filter((e) => !flaggedOnly || warnings.has(e.id));
  // Totals and export follow exactly the rows on screen (week + filters).
  const summary = totals(visible);
  const exportEntries = visible;
  // Actions only ever touch selected rows that are currently visible.
  const selectedIds = selected.filter((id) => visible.some((e) => e.id === id));
  const selectedMinutes = totals(
    visible.filter((e) => selectedIds.includes(e.id)),
  ).total;
  const pendingInView = visible.filter((e) => !e.reviewed).length;
  // Per-person progress for the week, client and search in view (ignores
  // the team member and status filters so everyone stays comparable).
  const teamRows = selectReview(data.entries, data.clients, {
    week,
    clientId,
    employee: 'all',
    status: 'all',
    search,
  });
  const team = [...new Set(teamRows.map((e) => e.employee))]
    .sort()
    .map((name) => {
      const rows = teamRows.filter((e) => e.employee === name);
      return {
        name,
        total: rows.length,
        reviewed: rows.filter((e) => e.reviewed).length,
      };
    });
  const readyForBilling = totals(visible.filter((e) => e.reviewed)).billable;
  const activeFilters = [
    clientId !== 'all' && data.clients.find((c) => c.id === clientId)?.name,
    employee !== 'all' && employee,
    status !== 'all' && (status === 'pending' ? 'Needs review' : 'Reviewed'),
    search && `“${search}”`,
    flaggedOnly && 'Flagged by pre-billing checks',
  ].filter(Boolean);
  const flaggedInView = selectReview(data.entries, data.clients, {
    week,
    clientId,
    employee,
    status,
    search,
  }).filter((e) => warnings.has(e.id)).length;
  const employees = [...new Set(data.entries.map((e) => e.employee))].sort();
  function changeView(update: () => void) {
    update();
    // Changing week or filters starts a fresh selection so the next action
    // can never reach rows that are no longer on screen.
    if (selected.length) {
      setSelected([]);
      setMessage('Selection cleared because the view changed.');
    }
  }
  function apply(
    ids: string[],
    patch: EntryPatch,
    description: string,
    clearSelection = true,
  ) {
    setError('');
    try {
      const next = updateEntries(data, ids, patch);
      save(next);
      setOperation(undoRecord(data, next, ids));
      if (clearSelection) setSelected([]);
      setMessage(
        `${description}: ${ids.length} ${ids.length === 1 ? 'entry' : 'entries'}.`,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const targetClientName =
    data.clients.find((c) => c.id === targetClient)?.name ?? '';
  const actionLabel =
    action === 'client'
      ? `Moved to ${targetClientName}`
      : action === 'review'
        ? 'Marked reviewed'
        : action === 'reopen'
          ? 'Returned to review'
          : action === 'billable'
            ? 'Marked billable'
            : 'Marked non-billable';
  return (
    <section className="review-page" aria-label="Weekly review">
      <div className="period-toolbar">
        <div className="week-selector">
          <button
            className="icon-button"
            aria-label="Previous review week"
            onClick={() => changeView(() => setWeek(addDays(week, -7)))}
          >
            <ChevronLeft size={18} />
          </button>
          <label className="review-date">
            Week of
            <input
              aria-label="Review week"
              type="date"
              value={week}
              onChange={(e) =>
                e.target.value &&
                changeView(() => setWeek(weekStart(e.target.value)))
              }
            />
          </label>
          <button
            className="icon-button"
            aria-label="Next review week"
            onClick={() => changeView(() => setWeek(addDays(week, 7)))}
          >
            <ChevronRight size={18} />
          </button>
          {week !== newestWeek && (
            <button
              className="text-button"
              onClick={() => changeView(() => setWeek(newestWeek))}
            >
              Latest week
            </button>
          )}
        </div>
        <div className="toolbar-actions">
          <button
            className="button secondary small"
            disabled={!visible.length}
            onClick={async () => {
              const text = weeklySummary(
                visible,
                selectWeek(data.entries, week),
                data.clients,
                week,
                activeFilters as string[],
              );
              try {
                await navigator.clipboard.writeText(text);
                setMessage('Weekly summary copied. Paste it into an email.');
              } catch {
                download(text, `counsel-summary-${week}.txt`, 'text/plain');
                setMessage(
                  'Clipboard unavailable; summary downloaded instead.',
                );
              }
            }}
          >
            <ClipboardCopy size={16} />
            Copy summary
          </button>
          <button
            className="button secondary small"
            disabled={!visible.length}
            onClick={() => {
              download(
                csv(exportEntries, data.clients),
                `counsel-review-${week}.csv`,
                'text/csv;charset=utf-8',
              );
              setMessage(
                `Exported ${exportEntries.length} ${exportEntries.length === 1 ? 'entry' : 'entries'} in this view.`,
              );
            }}
          >
            <ArrowDownToLine size={16} />
            Export view
          </button>
        </div>
      </div>
      <div className="review-progress">
        <span className="review-emblem">
          <ClipboardCheck size={24} />
        </span>
        <div>
          <h2>Weekly review</h2>
          <p>Check time entries and prepare this week's records.</p>
        </div>
      </div>
      <div className="review-summary" aria-label="Review summary">
        <div>
          <span>Entries in view</span>
          <strong>{visible.length}</strong>
          {(flaggedInView > 0 || flaggedOnly) && (
            <button
              className="text-button flag-toggle"
              aria-pressed={flaggedOnly}
              onClick={() => changeView(() => setFlaggedOnly(!flaggedOnly))}
            >
              <AlertTriangle size={13} aria-hidden="true" />
              {flaggedOnly
                ? 'Show all entries'
                : `Show ${flaggedInView} flagged`}
            </button>
          )}
        </div>
        <div>
          <span>Time in view</span>
          <strong data-testid="review-total">{duration(summary.total)}</strong>
        </div>
        <div>
          <span>Billable in view</span>
          <strong>{duration(summary.billable)}</strong>
          <small className="review-detail">
            {duration(readyForBilling)} reviewed and ready for billing
          </small>
        </div>
        <div>
          <span>Reviewed in view</span>
          <strong>
            {visible.length - pendingInView} / {visible.length}
          </strong>
          {pendingInView > 0 && status !== 'pending' && (
            <button
              className="text-button"
              onClick={() => changeView(() => setStatus('pending'))}
            >
              Show {pendingInView} needing review
            </button>
          )}
        </div>
      </div>
      {team.length > 1 && (
        <div
          className="team-progress"
          role="group"
          aria-label="Review progress by team member"
        >
          {team.map((member) => (
            <button
              key={member.name}
              aria-pressed={employee === member.name}
              onClick={() =>
                changeView(() =>
                  setEmployee(employee === member.name ? 'all' : member.name),
                )
              }
            >
              <strong>{member.name}</strong>
              <span>
                {member.reviewed}/{member.total} reviewed
              </span>
              {member.reviewed === member.total && (
                <Check size={13} aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}
      <div className="entries-panel">
        <div className="panel-title">
          <div>
            <h2>Check the details.</h2>
            <p>Select entries and update the week’s records.</p>
          </div>
        </div>
        <div className="filters review-filters">
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label="Search review"
              placeholder="Find an entry…"
              value={search}
              onChange={(e) => changeView(() => setSearch(e.target.value))}
            />
          </label>
          <select
            aria-label="Review client"
            value={clientId}
            onChange={(e) => changeView(() => setClientId(e.target.value))}
          >
            <option value="all">All clients</option>
            {data.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Review employee"
            value={employee}
            onChange={(e) => changeView(() => setEmployee(e.target.value))}
          >
            <option value="all">All team members</option>
            {employees.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <select
            aria-label="Review status"
            value={status}
            onChange={(e) => changeView(() => setStatus(e.target.value))}
          >
            <option value="all">All review states</option>
            <option value="pending">Needs review</option>
            <option value="reviewed">Reviewed</option>
          </select>
        </div>
        {activeFilters.length > 0 && (
          <div className="filter-context" aria-live="polite">
            <span>Showing only: {activeFilters.join(' · ')}</span>
            <button
              className="text-button"
              onClick={() =>
                changeView(() => {
                  setClientId('all');
                  setEmployee('all');
                  setStatus('all');
                  setSearch('');
                  setFlaggedOnly(false);
                })
              }
            >
              Clear filters
            </button>
          </div>
        )}
        <div className="bulk-toolbar">
          <label className="select-visible">
            <input
              type="checkbox"
              aria-label="Select visible entries"
              ref={(el) => {
                // Partly selected views show a mixed state, not "unchecked".
                if (el)
                  el.indeterminate =
                    selectedIds.length > 0 &&
                    selectedIds.length < visible.length;
              }}
              checked={
                visible.length > 0 &&
                visible.every((e) => selected.includes(e.id))
              }
              disabled={!visible.length || readOnly}
              onChange={(e) =>
                setSelected(e.target.checked ? visible.map((e) => e.id) : [])
              }
            />
            Select visible
          </label>
          <span className="selection-count" aria-live="polite">
            {selectedIds.length
              ? `${selectedIds.length} of ${visible.length} in view selected · ${duration(selectedMinutes)}`
              : 'None selected'}
          </span>
          <select
            aria-label="Bulk action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            <option value="review">Mark reviewed</option>
            <option value="reopen">Return to review</option>
            <option value="billable">Mark billable</option>
            <option value="nonbillable">Mark non-billable</option>
            <option value="client">Move to client</option>
          </select>
          {action === 'client' && (
            <select
              aria-label="Destination client"
              value={targetClient}
              onChange={(e) => setTargetClient(e.target.value)}
            >
              {data.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <button
            className="button primary small"
            disabled={!selectedIds.length || readOnly}
            onClick={() =>
              apply(
                selectedIds,
                action === 'client'
                  ? { clientId: targetClient }
                  : action === 'review' || action === 'reopen'
                    ? { reviewed: action === 'review' }
                    : { billable: action === 'billable' },
                actionLabel,
              )
            }
          >
            Apply to {selectedIds.length} selected
            {selectedIds.length === 1 ? ' entry' : ' entries'}
          </button>
        </div>
        {error && (
          <p className="form-error review-feedback" role="alert">
            {error}
          </p>
        )}
        <div className="review-notice" aria-live="polite">
          {message && <span>{message}</span>}
          {operation && (
            <button
              className="text-button"
              disabled={readOnly}
              onClick={() => {
                try {
                  save(undoEntries(data, operation));
                  setOperation(null);
                  setError('');
                  setMessage('Last review action undone.');
                } catch (e) {
                  setOperation(null);
                  setError((e as Error).message);
                }
              }}
            >
              <Undo2 size={14} />
              Undo last action
            </button>
          )}
        </div>
        {!visible.length ? (
          <div className="empty-state">
            <ClipboardCheck size={28} />
            <h3>Nothing in this view.</h3>
            <p>Choose another week or adjust your filters.</p>
          </div>
        ) : (
          <div className="review-rows">
            {visible.map((entry) => {
              const client = data.clients.find((c) => c.id === entry.clientId)!;
              return (
                <article
                  className={`review-row ${selectedIds.includes(entry.id) ? 'is-selected' : ''}`}
                  data-entry-id={entry.id}
                  key={entry.id}
                >
                  <label className="review-checkbox">
                    <input
                      type="checkbox"
                      aria-label={`Select ${entry.description || client.name}`}
                      checked={selectedIds.includes(entry.id)}
                      disabled={readOnly}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selectedIds, entry.id]
                            : selectedIds.filter((id) => id !== entry.id),
                        )
                      }
                    />
                  </label>
                  <div className="review-entry">
                    <div className="review-entry-meta">
                      <span style={{ background: client.color }} />
                      <strong>{client.name}</strong>
                      <span>{shortDate(entry.date)}</span>
                    </div>
                    <p>{entry.description || 'No description'}</p>
                    {warnings.has(entry.id) && (
                      <ul
                        className="review-warnings"
                        aria-label="Pre-billing checks"
                      >
                        {warnings.get(entry.id)!.map((text) => (
                          <li key={text}>
                            <AlertTriangle size={12} aria-hidden="true" />
                            {text}
                          </li>
                        ))}
                      </ul>
                    )}
                    <span className="review-employee">{entry.employee}</span>
                  </div>
                  <div className="review-duration">
                    <strong>{duration(entry.minutes)}</strong>
                    <span
                      className={`status-tag ${entry.billable ? 'billable' : ''}`}
                    >
                      {entry.billable ? 'Billable' : 'Non-billable'}
                    </span>
                  </div>
                  <button
                    className={`review-state ${entry.reviewed ? 'is-reviewed' : ''}`}
                    disabled={readOnly}
                    aria-label={`${entry.reviewed ? 'Reopen' : 'Review'} ${entry.description || client.name}`}
                    onClick={() =>
                      apply(
                        [entry.id],
                        { reviewed: !entry.reviewed },
                        entry.reviewed
                          ? 'Returned to review'
                          : 'Marked reviewed',
                        false,
                      )
                    }
                  >
                    {entry.reviewed && <Check size={13} />}{' '}
                    {entry.reviewed ? 'Reviewed' : 'Needs review'}
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Edit review entry: ${entry.description || client.name}`}
                    disabled={readOnly}
                    onClick={() => onEdit(entry)}
                  >
                    <Pencil size={15} />
                  </button>
                </article>
              );
            })}
          </div>
        )}
        <div className="table-footer">
          <span>
            {visible.length} entries · {shortDate(week)} –{' '}
            {shortDate(addDays(week, 6))}
          </span>
          <span>
            Totals and export use the {visible.length} entries shown, not the
            selection.
          </span>
        </div>
      </div>
    </section>
  );
}
