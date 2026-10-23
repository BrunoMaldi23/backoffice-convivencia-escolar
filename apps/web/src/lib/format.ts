const TIME_ZONE = 'America/Santiago';

const dateParts = new Intl.DateTimeFormat('es-CL', { timeZone: TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric' });
const timeParts = new Intl.DateTimeFormat('es-CL', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const longDate = new Intl.DateTimeFormat('es-CL', { timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long' });

const toDate = (value: string | Date): Date => (value instanceof Date ? value : new Date(value));

/** Fecha visible en formato dd-mm-aaaa, en hora de Chile continental. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '—';
  const parts = Object.fromEntries(dateParts.formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.day}-${parts.month}-${parts.year}`;
}

/** Fecha y hora de 24 h: dd-mm-aaaa HH:mm. */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${formatDate(date)} ${timeParts.format(date)}`;
}

export function formatTime(value: string | Date): string {
  return timeParts.format(toDate(value));
}

export function formatLongDate(value: string | Date): string {
  const text = longDate.format(toDate(value));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-CL').format(value);
}

/** Iniciales para avatares; no expone más información que el nombre ya visible. */
export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
}

/**
 * Convierte la fecha elegida en un `DatePicker` a ISO-8601 para la API. Sin hora (`withTime` falso) se usa el mediodía local
 * para que la fecha no cambie de día al mostrarse en otra zona horaria.
 */
export function dateToIso(date: Date, withTime = false): string {
  const copy = new Date(date);
  if (!withTime) copy.setHours(12, 0, 0, 0);
  return copy.toISOString();
}

/** Fecha ISO de la API a `Date` para un `DatePicker`; `null` si no hay valor. */
export function isoToDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Plazo vencido: la fecha ya pasó (compara contra `now`). */
export const isOverdue = (value: string | null | undefined, now = new Date()) => Boolean(value) && new Date(value as string).getTime() < now.getTime();

/** Nombre completo de una persona del directorio. */
export const fullName = (person: { firstNames: string; lastNames: string }) => `${person.firstNames} ${person.lastNames}`.trim();

/**
 * Fechas de calendario sin hora (por ejemplo, el nacimiento): la API las entrega a medianoche UTC, por lo que se leen en UTC
 * para que no retrocedan un día al mostrarse en hora de Chile.
 */
const calendarParts = new Intl.DateTimeFormat('es-CL', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' });
export function formatCalendarDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const parts = Object.fromEntries(calendarParts.formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.day}-${parts.month}-${parts.year}`;
}
/** `aaaa-mm-dd` (o ISO de la API) a `Date` local para un `DatePicker`. */
export function calendarToDate(value: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12) : null;
}
/** `Date` local elegido en un `DatePicker` a `aaaa-mm-dd`. */
export function dateToCalendar(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
