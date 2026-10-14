import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Database,
  FileText,
  HelpCircle,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import {
  addDays,
  csv,
  decodeData,
  download,
  duration,
  localDate,
  sampleData,
  shortDate,
  STORAGE_KEY,
  totals,
  weekStart,
} from './model';
import type { Client, Data, Entry } from './model';
import { useStore } from './useStore';
import { Modal } from './components/Modal';
import { EntryForm } from './components/EntryForm';

import { Sidebar } from './components/Sidebar';
import type { Page } from './components/Sidebar';
import { ClientForm } from './components/ClientForm';
import { Stat } from './components/Stat';
import { ReviewPage } from './components/ReviewPage';
import { saveEntry } from './review';
import pilotWorkspace from './fixtures/pilot-workspace.json';
import { EntryTable } from './components/EntryTable';
type Toast = { text: string; undo?: () => void };
export default function App() {
  const { data, save, error: storageError } = useStore();
  const [page, setPage] = useState<Page>('entries');
  const [week, setWeek] = useState(weekStart(localDate()));
  const [range, setRange] = useState('week');
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [billing, setBilling] = useState('all');
  const [entryModal, setEntryModal] = useState<Entry | 'new' | null>(null);
  const [clientModal, setClientModal] = useState<Client | 'new' | null>(null);
  const [utilityModal, setUtilityModal] = useState<'help' | 'backup' | null>(
    null,
  );
  const [deleting, setDeleting] = useState<Entry | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [pendingRestore, setPendingRestore] = useState<Data | null>(null);
  const [utilityError, setUtilityError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.undo ? 12000 : 5000);
    return () => clearTimeout(t);
  }, [toast]);
  const end = addDays(week, 6);
  const filtered = data.entries
    .filter(
      (e) =>
        (range === 'all' || (e.date >= week && e.date <= end)) &&
        (clientFilter === 'all' || e.clientId === clientFilter) &&
        (billing === 'all' || e.billable === (billing === 'billable')) &&
        `${e.description} ${data.clients.find((c) => c.id === e.clientId)?.name ?? ''} ${e.employee}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const summary = totals(filtered);
  const dayTotals = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(week, i);
    return { date, ...totals(filtered.filter((e) => e.date === date)) };
  });
  const maxDay = Math.max(480, ...dayTotals.map((d) => d.total));
  const activeClients = new Set(filtered.map((e) => e.clientId)).size;
  const weekLabel = `${shortDate(week)} – ${shortDate(end, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  function exportCsv() {
    download(
      csv(filtered, data.clients),
      `counsel-time-${range === 'all' ? 'all' : week}.csv`,
      'text/csv;charset=utf-8',
    );
    setToast({
      text: `Exported ${filtered.length} ${filtered.length === 1 ? 'entry' : 'entries'}.`,
    });
  }
  function loadSample() {
    try {
      save(sampleData());
      setWeek(weekStart(localDate()));
      setToast({ text: 'Sample workspace loaded. All records are fictional.' });
    } catch (e) {
      setToast({ text: (e as Error).message });
    }
  }
  function backup() {
    download(
      JSON.stringify(data, null, 2),
      `counsel-backup-${localDate()}.json`,
      'application/json',
    );
    setToast({ text: 'Backup downloaded.' });
  }
  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        setPage={setPage}
        onBackup={() => {
          setUtilityError('');
          setUtilityModal('backup');
        }}
        onHelp={() => setUtilityModal('help')}
      />
      <div className="main-shell">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Workspace</span>
            <ChevronRight size={13} />
            <span>
              {page === 'entries'
                ? 'Time entries'
                : page === 'reports'
                  ? 'Reports'
                  : page === 'review'
                    ? 'Weekly review'
                    : 'Clients'}
            </span>
          </div>
          <div className="topbar-tools">
            <button
              className="icon-button"
              aria-label="Manage data"
              title="Manage data"
              onClick={() => {
                setUtilityError('');
                setUtilityModal('backup');
              }}
            >
              <Database size={16} />
            </button>
            <button
              className="icon-button"
              aria-label="Help"
              title="Help"
              onClick={() => setUtilityModal('help')}
            >
              <HelpCircle size={16} />
            </button>
            <span className={`save-status ${storageError ? 'warning' : ''}`}>
              <span />
              {storageError ? 'Storage needs attention' : 'Local workspace'}
            </span>
          </div>
        </header>
        <main>
          {storageError && (
            <div className="storage-error" role="alert">
              {storageError}
              <button
                className="text-button"
                onClick={() => setUtilityModal('backup')}
              >
                Manage data <ArrowRight size={15} />
              </button>
            </div>
          )}
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {page === 'entries'
                  ? 'A LITTLE CLARITY FOR YOUR WORKDAY'
                  : page === 'reports'
                    ? 'THE BIGGER PICTURE'
                    : page === 'review'
                      ? 'A CONFIDENT CLOSE TO THE WEEK'
                      : 'GOOD WORK STARTS WITH GOOD RELATIONSHIPS'}
              </div>
              <h1>
                {page === 'entries'
                  ? 'Time, well accounted for.'
                  : page === 'reports'
                    ? 'Every hour tells a story.'
                    : page === 'review'
                      ? 'Good work. Ready for review.'
                      : 'Your clients.'}
              </h1>
              <p>
                {page === 'entries'
                  ? 'Less time tracking. More time on what matters.'
                  : page === 'reports'
                    ? 'A clear view of where your time goes.'
                    : page === 'review'
                      ? 'Bring the team’s time into focus before billing.'
                      : 'One place for the people and businesses you work with.'}
              </p>
            </div>
            <button
              className="button primary"
              onClick={() =>
                page === 'clients'
                  ? setClientModal('new')
                  : setEntryModal('new')
              }
              disabled={!!storageError}
            >
              <Plus size={18} />
              {page === 'clients' ? 'Add client' : 'Log time'}
            </button>
          </div>
          {page === 'review' ? (
            <ReviewPage
              data={data}
              save={save}
              onEdit={setEntryModal}
              readOnly={!!storageError}
            />
          ) : page !== 'clients' ? (
            <>
              <div className="period-toolbar">
                <div className="period-left">
                  <div className="segmented">
                    <button
                      className={range === 'week' ? 'selected' : ''}
                      onClick={() => setRange('week')}
                    >
                      Week
                    </button>
                    <button
                      className={range === 'all' ? 'selected' : ''}
                      onClick={() => setRange('all')}
                    >
                      All time
                    </button>
                  </div>
                  {range === 'week' && (
                    <div className="week-selector">
                      <button
                        className="icon-button"
                        aria-label="Previous week"
                        onClick={() => setWeek(addDays(week, -7))}
                      >
                        <ChevronLeft size={17} />
                      </button>
                      <span>
                        <CalendarDays size={15} />
                        {weekLabel}
                      </span>
                      <button
                        className="icon-button"
                        aria-label="Next week"
                        onClick={() => setWeek(addDays(week, 7))}
                      >
                        <ChevronRight size={17} />
                      </button>
                    </div>
                  )}
                  {range === 'week' && week !== weekStart(localDate()) && (
                    <button
                      className="text-button"
                      onClick={() => setWeek(weekStart(localDate()))}
                    >
                      This week
                    </button>
                  )}
                </div>
                <button
                  className="button secondary small"
                  onClick={exportCsv}
                  disabled={!filtered.length}
                >
                  <ArrowDownToLine size={16} />
                  Export CSV
                </button>
              </div>
              <section className="stats" aria-label="Time summary">
                <Stat
                  label="Total time"
                  value={duration(summary.total)}
                  detail={`${filtered.length} ${filtered.length === 1 ? 'entry' : 'entries'} recorded`}
                  icon={<Clock3 size={17} />}
                />
                <Stat
                  label="Billable time"
                  value={duration(summary.billable)}
                  detail="Time that works for you"
                  icon={<BriefcaseBusiness size={17} />}
                  tone="green"
                />
                <Stat
                  label="Non-billable time"
                  value={duration(summary.nonBillable)}
                  detail="The work behind the work"
                  icon={<FileText size={17} />}
                />
                <Stat
                  label="Billable ratio"
                  value={`${summary.utilization}%`}
                  detail={
                    summary.total
                      ? 'Of your tracked time'
                      : 'Log time to see your ratio'
                  }
                  icon={<ChartNoAxesColumnIncreasing size={17} />}
                  progress={summary.utilization}
                />
              </section>
              {range === 'week' && (
                <section className="weekly-card" aria-label="Weekly activity">
                  <div className="weekly-intro">
                    <div className="section-eyebrow">YOUR WEEK AT A GLANCE</div>
                    <h2>A steady rhythm.</h2>
                    <p>
                      {summary.total
                        ? `${duration(summary.total)} across ${activeClients} ${activeClients === 1 ? 'client' : 'clients'}.`
                        : 'Make room for meaningful work.'}
                      <br />
                      {summary.total
                        ? 'Every bit of progress adds up.'
                        : 'Your time will take shape here.'}
                    </p>
                    <div className="chart-legend">
                      <span>
                        <i className="billable-dot" />
                        Billable
                      </span>
                      <span>
                        <i />
                        Non-billable
                      </span>
                    </div>
                  </div>
                  <div className="week-chart">
                    {dayTotals.map((d) => (
                      <div
                        className={`chart-day ${d.date === localDate() ? 'today' : ''}`}
                        key={d.date}
                        aria-label={`${shortDate(d.date, { weekday: 'long', month: 'short', day: 'numeric' })}: ${duration(d.billable)} billable, ${duration(d.nonBillable)} non-billable`}
                      >
                        <span className="bar-total">
                          {d.total ? duration(d.total) : '—'}
                        </span>
                        <div className="bar-track">
                          <div
                            className="bar-stack"
                            style={{ height: `${(d.total / maxDay) * 100}%` }}
                          >
                            <div
                              className="bar-nonbillable"
                              style={{ flex: d.nonBillable }}
                            />
                            <div
                              className="bar-billable"
                              style={{ flex: d.billable }}
                            />
                          </div>
                        </div>
                        <span className="day-name">
                          {shortDate(d.date, { weekday: 'short' })}
                          <b>{shortDate(d.date, { day: 'numeric' })}</b>
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              <section className="entries-panel">
                <div className="panel-title">
                  <div>
                    <h2>
                      {page === 'reports' ? 'Time by client' : 'Time entries'}
                      <span className="count">
                        {page === 'reports' ? activeClients : filtered.length}
                      </span>
                    </h2>
                    <p>
                      {page === 'reports'
                        ? 'Understand the work behind your numbers.'
                        : 'All the details, in good order.'}
                    </p>
                  </div>
                  {page === 'entries' && (
                    <span className="subtle-label">Hours & minutes</span>
                  )}
                </div>
                <div className="filters">
                  <label className="search-field">
                    <Search size={17} />
                    <input
                      aria-label="Search entries"
                      placeholder="Search clients or descriptions…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                      <button
                        className="icon-button"
                        aria-label="Clear search"
                        onClick={() => setSearch('')}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </label>
                  <select
                    aria-label="Filter by client"
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                  >
                    <option value="all">All clients</option>
                    {data.clients.map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Filter by billability"
                    value={billing}
                    onChange={(e) => setBilling(e.target.value)}
                  >
                    <option value="all">All billability</option>
                    <option value="billable">Billable</option>
                    <option value="non-billable">Non-billable</option>
                  </select>
                </div>
                {!filtered.length ? (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <Clock3 size={26} />
                      <span>
                        <Plus size={12} />
                      </span>
                    </div>
                    <h3>
                      {data.entries.length
                        ? 'A little breathing room.'
                        : 'Great work deserves a record.'}
                    </h3>
                    <p>
                      {data.entries.length
                        ? 'No entries match this view. Try another week or adjust your filters.'
                        : 'Log your first time entry and bring your workday into focus.'}
                    </p>
                    <button
                      className="button primary"
                      disabled={!!storageError}
                      onClick={() => setEntryModal('new')}
                    >
                      <Plus size={16} />
                      {data.entries.length
                        ? 'Log time'
                        : 'Log your first time entry'}
                    </button>
                    {!data.entries.length && !data.clients.length && (
                      <button
                        className="text-button sample-button"
                        disabled={!!storageError}
                        onClick={loadSample}
                      >
                        Just exploring? Load a sample workspace{' '}
                        <ArrowRight size={14} />
                      </button>
                    )}
                    {!!data.entries.length && (
                      <button
                        className="text-button sample-button"
                        onClick={() => {
                          setRange('all');
                          setSearch('');
                          setClientFilter('all');
                          setBilling('all');
                        }}
                      >
                        Show all entries <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                ) : page === 'reports' ? (
                  <div className="report-list">
                    {data.clients
                      .map((client) => ({
                        client,
                        ...totals(
                          filtered.filter((e) => e.clientId === client.id),
                        ),
                      }))
                      .filter((c) => c.total)
                      .sort((a, b) => b.total - a.total)
                      .map((c) => (
                        <div className="report-row" key={c.client.id}>
                          <div className="report-client">
                            <span
                              className="client-monogram"
                              style={{
                                color: c.client.color,
                                background: `${c.client.color}15`,
                              }}
                            >
                              {c.client.name.slice(0, 1)}
                            </span>
                            <div>
                              <strong>{c.client.name}</strong>
                              <span>{c.utilization}% billable</span>
                            </div>
                          </div>
                          <div className="report-meter">
                            <div
                              style={{
                                width: `${(c.total / summary.total) * 100}%`,
                              }}
                            />
                          </div>
                          <div className="report-hours">
                            <strong>{duration(c.total)}</strong>
                            <span>{duration(c.billable)} billable</span>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <EntryTable
                    entries={filtered}
                    clients={data.clients}
                    readOnly={!!storageError}
                    onEdit={setEntryModal}
                    onDelete={setDeleting}
                  />
                )}
                {!!filtered.length && (
                  <div className="table-footer">
                    <span>
                      {filtered.length}{' '}
                      {filtered.length === 1 ? 'entry' : 'entries'} ·{' '}
                      {range === 'all' ? 'All time' : weekLabel}
                    </span>
                    <span>
                      Total <strong>{duration(summary.total)}</strong>
                    </span>
                  </div>
                )}
              </section>
            </>
          ) : (
            <>
              <div className="clients-summary">
                <BriefcaseBusiness size={18} />
                <strong>{data.clients.length}</strong>{' '}
                {data.clients.length === 1 ? 'client' : 'clients'} in your
                workspace<span>All-time totals</span>
              </div>
              {!data.clients.length ? (
                <div className="entries-panel empty-state">
                  <div className="empty-icon">
                    <BriefcaseBusiness size={26} />
                  </div>
                  <h3>Your next chapter starts here.</h3>
                  <p>
                    Add your first client. You can also create clients while
                    logging time.
                  </p>
                  <button
                    className="button primary"
                    onClick={() => setClientModal('new')}
                    disabled={!!storageError}
                  >
                    <Plus size={16} />
                    Add a client
                  </button>
                </div>
              ) : (
                <div className="client-grid">
                  {data.clients.map((client) => {
                    const t = totals(
                      data.entries.filter((e) => e.clientId === client.id),
                    );
                    return (
                      <article className="client-card" key={client.id}>
                        <div className="client-card-top">
                          <span
                            className="client-monogram"
                            style={{
                              color: client.color,
                              background: `${client.color}18`,
                            }}
                          >
                            {client.name.slice(0, 1)}
                          </span>
                          <button
                            className="icon-button"
                            aria-label={`Edit client ${client.name}`}
                            onClick={() => setClientModal(client)}
                            disabled={!!storageError}
                          >
                            <MoreHorizontal size={20} />
                          </button>
                        </div>
                        <h2>{client.name}</h2>
                        <p>
                          {
                            data.entries.filter((e) => e.clientId === client.id)
                              .length
                          }{' '}
                          time entries
                        </p>
                        <div className="client-stats">
                          <div>
                            <span>Total time</span>
                            <strong>{duration(t.total)}</strong>
                          </div>
                          <div>
                            <span>Billable</span>
                            <strong>{duration(t.billable)}</strong>
                          </div>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => {
                            setClientFilter(client.id);
                            setRange('all');
                            setBilling('all');
                            setSearch('');
                            setPage('entries');
                          }}
                        >
                          View entries <ArrowRight size={15} />
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>
              <span className="mini-brand">c.</span> A considered approach to
              time.
            </span>
            <span>Made for the work that matters.</span>
          </footer>
        </main>
      </div>
      {entryModal && (
        <EntryForm
          entry={entryModal === 'new' ? undefined : entryModal}
          clients={data.clients}
          onClose={() => setEntryModal(null)}
          onSave={(entry, client) => {
            save(
              saveEntry(
                data,
                entry,
                client,
                entryModal === 'new' ? undefined : entryModal,
              ),
            );
            setEntryModal(null);
            setWeek(weekStart(entry.date));
            setRange('week');
            setClientFilter('all');
            setBilling('all');
            setSearch('');
            setToast({
              text:
                entryModal === 'new'
                  ? 'Time entry saved.'
                  : 'Time entry updated.',
            });
          }}
        />
      )}
      {clientModal && (
        <ClientForm
          client={clientModal === 'new' ? undefined : clientModal}
          clients={data.clients}
          onClose={() => setClientModal(null)}
          onSave={(client) => {
            save({
              ...data,
              clients:
                clientModal === 'new'
                  ? [...data.clients, client]
                  : data.clients.map((c) => (c.id === client.id ? client : c)),
            });
            setClientModal(null);
            setToast({
              text: clientModal === 'new' ? 'Client added.' : 'Client updated.',
            });
          }}
        />
      )}
      {deleting && (
        <Modal
          title="Delete this entry?"
          subtitle={`${duration(deleting.minutes)} · ${shortDate(deleting.date)} · ${data.clients.find((c) => c.id === deleting.clientId)?.name}`}
          onClose={() => setDeleting(null)}
        >
          <p className="modal-copy">
            This entry will be removed from your time records. You can undo this
            immediately after deleting.
          </p>
          <div className="modal-footer">
            <button
              className="button secondary"
              onClick={() => setDeleting(null)}
            >
              Keep entry
            </button>
            <button
              className="button danger"
              onClick={() => {
                try {
                  const removed = deleting;
                  save({
                    ...data,
                    entries: data.entries.filter((e) => e.id !== removed.id),
                  });
                  setDeleting(null);
                  setToast({
                    text: 'Time entry deleted.',
                    undo: () => {
                      try {
                        const current = decodeData(
                          localStorage.getItem(STORAGE_KEY) ??
                            JSON.stringify(data),
                        );
                        if (
                          !current.clients.some(
                            (c) => c.id === removed.clientId,
                          )
                        )
                          throw new Error(
                            'The original client no longer exists.',
                          );
                        if (!current.entries.some((e) => e.id === removed.id))
                          save({
                            ...current,
                            entries: [...current.entries, removed],
                          });
                        setToast({ text: 'Entry restored.' });
                      } catch (e) {
                        setToast({ text: (e as Error).message });
                      }
                    },
                  });
                } catch (e) {
                  setToast({ text: (e as Error).message });
                }
              }}
            >
              Delete entry
            </button>
          </div>
        </Modal>
      )}
      {utilityModal === 'help' && (
        <Modal
          title="A little guidance."
          subtitle="A calm place to keep track of your work."
          onClose={() => setUtilityModal(null)}
        >
          <div className="help-content">
            <h3>1. Capture your time</h3>
            <p>
              Choose a date and client, enter hours and minutes, and mark the
              entry billable or non-billable. Descriptions are optional.
            </p>
            <h3>2. Find your focus</h3>
            <p>
              Browse by week or all time. Search and filters update the entries,
              chart, totals, and CSV export together. Reports shows time grouped
              by client.
            </p>
            <h3>3. Keep a copy</h3>
            <p>
              Your records stay in this browser on this device. Use Manage your
              data to download a backup and restore it later. Clearing browser
              data removes these records.
            </p>
            <div className="help-note">
              <ShieldCheck size={20} />
              <p>
                This is a local assessment workspace with a mock profile. There
                is no login, cloud sync, or server. Use fictional data when
                evaluating.
              </p>
            </div>
          </div>
        </Modal>
      )}
      {utilityModal === 'backup' && (
        <Modal
          title="Your data, in your hands."
          subtitle="Back up your workspace or move it to another browser."
          onClose={() => {
            setUtilityModal(null);
            setPendingRestore(null);
          }}
        >
          <div className="backup-content">
            <button
              className="backup-option"
              onClick={() => {
                setPendingRestore(decodeData(JSON.stringify(pilotWorkspace)));
                setUtilityError('');
              }}
            >
              <BriefcaseBusiness size={21} />
              <div>
                <strong>Open pilot workspace</strong>
                <span>
                  Load the fictional Morgan & Partners review workspace
                </span>
              </div>
              <ArrowRight size={17} />
            </button>
            <div className="backup-summary">
              <Database size={22} />
              <div>
                <strong>
                  {data.entries.length} entries · {data.clients.length} clients
                </strong>
                <span>Stored locally in this browser</span>
              </div>
            </div>
            <button
              className="backup-option"
              onClick={backup}
              disabled={!!storageError}
            >
              <ArrowDownToLine size={21} />
              <div>
                <strong>Download a backup</strong>
                <span>All entries and clients, in a restorable JSON file</span>
              </div>
              <ArrowRight size={17} />
            </button>
            {storageError && (
              <button
                className="backup-option"
                onClick={() => {
                  try {
                    download(
                      localStorage.getItem(STORAGE_KEY) ?? '',
                      'counsel-original-data.txt',
                      'text/plain',
                    );
                  } catch {
                    setUtilityError('Browser storage is unavailable.');
                  }
                }}
              >
                <ArrowDownToLine size={21} />
                <div>
                  <strong>Download original data</strong>
                  <span>Preserve the unreadable data before restoring</span>
                </div>
              </button>
            )}
            <button
              className="backup-option"
              onClick={() => fileInput.current?.click()}
            >
              <Upload size={21} />
              <div>
                <strong>Restore a backup</strong>
                <span>Choose a Counsel JSON backup file</span>
              </div>
              <ArrowRight size={17} />
            </button>
            <input
              ref={fileInput}
              type="file"
              className="sr-only"
              aria-label="Backup file"
              accept=".json,application/json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                try {
                  if (file.size > 10_000_000)
                    throw new Error('Choose a backup smaller than 10 MB.');
                  setPendingRestore(decodeData(await file.text()));
                  setUtilityError('');
                } catch (err) {
                  setUtilityError((err as Error).message);
                  setPendingRestore(null);
                }
              }}
            />
            {utilityError && (
              <p className="form-error" role="alert">
                {utilityError}
              </p>
            )}
            {pendingRestore && (
              <div className="restore-confirm">
                <h3>Replace this workspace?</h3>
                <p>
                  This backup contains {pendingRestore.entries.length} entries
                  and {pendingRestore.clients.length} clients. Restoring
                  replaces all current records. Download a backup first if you
                  want to keep them.
                </p>
                <div>
                  <button
                    className="button secondary small"
                    onClick={() => setPendingRestore(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="button primary small"
                    onClick={() => {
                      try {
                        save(pendingRestore, true);
                        setPendingRestore(null);
                        setUtilityModal(null);
                        setPage('entries');
                        setWeek(
                          weekStart(
                            pendingRestore.entries
                              .map((e) => e.date)
                              .sort()
                              .at(-1) ?? localDate(),
                          ),
                        );
                        setClientFilter('all');
                        setToast({ text: 'Workspace restored from backup.' });
                      } catch (e) {
                        setUtilityError((e as Error).message);
                      }
                    }}
                  >
                    Replace and restore
                  </button>
                </div>
              </div>
            )}
            <p className="privacy-note">
              <ShieldCheck size={15} />
              No data is sent to a server. Keep backups somewhere safe.
            </p>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <span className="toast-icon">
            <Check size={16} />
          </span>
          <span>{toast.text}</span>
          {toast.undo && <button onClick={toast.undo}>Undo</button>}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
