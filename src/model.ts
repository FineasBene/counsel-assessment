export type Client = { id: string; name: string; color: string };
export type Entry = {
  id: string;
  date: string;
  minutes: number;
  clientId: string;
  billable: boolean;
  description: string;
  employee: string;
  reviewed?: boolean;
};
export type Data = { version: 1; clients: Client[]; entries: Entry[] };
export const STORAGE_KEY = 'counsel.time.v1';
export const EMPLOYEE = 'Alex Morgan';
export const COLORS = [
  '#7460a8',
  '#416e83',
  '#896238',
  '#52735a',
  '#975566',
  '#596a91',
];
export const emptyData = (): Data => ({ version: 1, clients: [], entries: [] });
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function parseDate(date: string) {
  return new Date(`${date}T12:00:00`);
}
export function addDays(date: string, days: number) {
  const d = parseDate(date);
  d.setDate(d.getDate() + days);
  return localDate(d);
}
export function weekStart(date: string) {
  const d = parseDate(date);
  return addDays(date, -((d.getDay() + 6) % 7));
}
export function validDate(date: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(parseDate(date).getTime()) &&
    localDate(parseDate(date)) === date
  );
}
export function duration(minutes: number) {
  const h = Math.floor(minutes / 60),
    m = minutes % 60;
  return `${h}h${m ? ` ${String(m).padStart(2, '0')}m` : ''}`;
}
export function shortDate(
  date: string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' },
) {
  return parseDate(date).toLocaleDateString('en-GB', options);
}
export function validateEntry(entry: Entry, clients: Client[]) {
  if (!validDate(entry.date)) throw new Error('Choose a valid date.');
  if (
    !Number.isInteger(entry.minutes) ||
    entry.minutes < 1 ||
    entry.minutes > 1440
  )
    throw new Error('Duration must be between 1 minute and 24 hours.');
  if (!clients.some((c) => c.id === entry.clientId))
    throw new Error('Choose a client.');
  if (entry.description.length > 500)
    throw new Error('Keep the description under 500 characters.');
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
export function decodeData(raw: string): Data {
  const value: unknown = JSON.parse(raw);
  if (
    !record(value) ||
    value.version !== 1 ||
    !Array.isArray(value.clients) ||
    !Array.isArray(value.entries)
  )
    throw new Error('This is not a supported Counsel backup.');
  const clients: Client[] = value.clients.map((c) => {
    if (
      !record(c) ||
      typeof c.id !== 'string' ||
      !c.id ||
      typeof c.name !== 'string' ||
      !c.name.trim() ||
      c.name.length > 80 ||
      typeof c.color !== 'string' ||
      !/^#[0-9a-f]{6}$/i.test(c.color)
    )
      throw new Error('Invalid client data.');
    return { id: c.id, name: c.name.trim(), color: c.color };
  });
  const entries: Entry[] = value.entries.map((e) => {
    if (
      !record(e) ||
      typeof e.id !== 'string' ||
      !e.id ||
      typeof e.date !== 'string' ||
      typeof e.minutes !== 'number' ||
      typeof e.clientId !== 'string' ||
      typeof e.billable !== 'boolean' ||
      typeof e.description !== 'string' ||
      typeof e.employee !== 'string' ||
      !e.employee.trim() ||
      e.employee.length > 80 ||
      (e.reviewed !== undefined && typeof e.reviewed !== 'boolean')
    )
      throw new Error('Invalid time entry data.');
    const entry: Entry = {
      id: e.id,
      date: e.date,
      minutes: e.minutes,
      clientId: e.clientId,
      billable: e.billable,
      description: e.description,
      employee: e.employee,
      ...(typeof e.reviewed === 'boolean' ? { reviewed: e.reviewed } : {}),
    };
    validateEntry(entry, clients);
    return entry;
  });
  if (
    new Set(clients.map((c) => c.id)).size !== clients.length ||
    new Set(entries.map((e) => e.id)).size !== entries.length ||
    new Set(clients.map((c) => c.name.toLowerCase())).size !== clients.length
  )
    throw new Error('Duplicate records in backup.');
  return { version: 1, clients, entries };
}
export function totals(entries: Entry[]) {
  const total = entries.reduce((n, e) => n + e.minutes, 0);
  const billable = entries
    .filter((e) => e.billable)
    .reduce((n, e) => n + e.minutes, 0);
  return {
    total,
    billable,
    nonBillable: total - billable,
    utilization: total ? Math.round((billable / total) * 100) : 0,
  };
}
export function csv(entries: Entry[], clients: Client[]) {
  const cell = (v: string | number) => {
    let text = String(v);
    if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return (
    '\uFEFF' +
    [
      [
        'Date',
        'Employee',
        'Client',
        'Description',
        'Duration (minutes)',
        'Billable',
      ],
      ...entries.map((e) => [
        e.date,
        e.employee,
        clients.find((c) => c.id === e.clientId)?.name ?? '',
        e.description,
        e.minutes,
        e.billable ? 'Yes' : 'No',
      ]),
    ]
      .map((row) => row.map(cell).join(','))
      .join('\r\n')
  );
}
export function download(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function sampleData(): Data {
  const clients = [
    'Meridian Holdings',
    'Northstar Ventures',
    'Oak & Stone',
    'Firm · Internal',
  ].map((name, i) => ({ id: `sample-client-${i}`, name, color: COLORS[i] }));
  const start = weekStart(localDate());
  const rows: [number, number, number, boolean, string][] = [
    [0, 150, 0, true, 'Review and annotate shareholder agreement'],
    [0, 90, 1, true, 'Due diligence · Initial document review'],
    [0, 45, 3, false, 'Weekly team planning'],
    [1, 180, 2, true, 'Prepare commercial lease amendments'],
    [1, 120, 0, true, 'Client meeting and follow-up notes'],
    [1, 30, 3, false, 'Knowledge sharing · Case law update'],
    [2, 135, 1, true, 'Draft investment term sheet'],
    [2, 60, 0, true, 'Counsel call · Transaction next steps'],
    [2, 45, 3, false, 'Practice development'],
  ];
  return {
    version: 1,
    clients,
    entries: rows.map(([day, minutes, client, billable, description], i) => ({
      id: `sample-entry-${i}`,
      date: addDays(start, day),
      minutes,
      clientId: clients[client].id,
      billable,
      description,
      employee: EMPLOYEE,
    })),
  };
}
